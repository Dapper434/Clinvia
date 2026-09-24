"""Sign-in tokens, passwords, and who-may-do-what.

Every request re-reads the signed-in user from the database, so a role change, a
deactivation or a move to another hospital applies immediately — the token only says
who the user is, never what they may do.

Tenancy: staff are scoped to their own hospital. A network admin has no hospital; they
choose one with the `X-Hospital` header (a hospital slug), or see all hospitals without it.
"""
import time
from functools import wraps

import bcrypt
import jwt
from flask import current_app, g, jsonify, request

from .extensions import db

STAFF_ROLES = {"admin", "executive", "doctor", "clinician", "nurse", "receptionist"}
ALL_STAFF = STAFF_ROLES | {"network_admin"}

# Capability -> roles allowed. The frontend mirrors this to hide what a role can't use,
# but these checks are the ones that count.
PERMISSIONS = {
    "dashboard.view": ALL_STAFF,
    "patients.view": ALL_STAFF - {"executive"},
    "patients.clinical": {"network_admin", "admin", "doctor", "clinician", "nurse"},
    "patients.register": {"admin", "doctor", "clinician", "nurse", "receptionist"},
    "patients.edit": {"admin", "doctor", "clinician", "nurse", "receptionist"},
    "patients.care": {"admin", "doctor", "clinician"},
    "tb.manage": {"doctor", "clinician"},
    "labs.write": {"doctor", "clinician"},
    "meds.write": {"doctor", "clinician"},
    "files.upload": {"admin", "doctor", "clinician", "nurse"},
    "contacts.write": {"doctor", "clinician", "nurse"},
    "appointments.view": ALL_STAFF - {"executive"},
    "appointments.book": {"admin", "doctor", "clinician", "receptionist"},
    "queue.view": ALL_STAFF - {"executive"},
    "queue.add": {"admin", "doctor", "clinician", "nurse", "receptionist"},
    "queue.call": {"admin", "doctor", "clinician", "nurse"},
    "admissions.view": ALL_STAFF - {"executive"},
    "admissions.admit": {"admin", "doctor", "clinician"},
    "admissions.discharge": {"admin", "doctor", "clinician", "nurse"},
    "beds.ready": {"admin", "doctor", "clinician", "nurse"},
    "wards.manage": {"admin"},
    "doses.view": {"network_admin", "admin", "doctor", "clinician", "nurse"},
    "doses.log": {"doctor", "clinician", "nurse"},
    "map.view": ALL_STAFF - {"receptionist"},
    "reports.view": {"network_admin", "admin", "executive", "doctor", "clinician"},
    "reports.export": {"network_admin", "admin", "clinician"},
    "staff.view": ALL_STAFF,
    "staff.manage": {"network_admin", "admin"},
    "hospital.settings": {"network_admin", "admin"},
    "network.view": {"network_admin"},
}


def can(role, capability):
    return role in PERMISSIONS.get(capability, set())


def permissions_for(role):
    return sorted(cap for cap, roles in PERMISSIONS.items() if role in roles)


# ---------------------------------------------------------------- tokens & passwords
def _expiry_seconds(expr):
    """Parse '7d' / '1h' / '30m' / '45s' / a raw integer into seconds."""
    default = 7 * 24 * 3600
    if not expr:
        return default
    expr = str(expr).strip()
    try:
        return int(expr)
    except ValueError:
        pass
    unit, digits = expr[-1], expr[:-1]
    try:
        n = int(digits)
    except ValueError:
        return default
    return {"d": n * 86400, "h": n * 3600, "m": n * 60, "s": n}.get(unit, default)


def generate_token(payload):
    now = int(time.time())
    to_encode = {
        **payload,
        "iat": now,
        "exp": now + _expiry_seconds(current_app.config["JWT_EXPIRES_IN"]),
    }
    return jwt.encode(to_encode, current_app.config["JWT_SECRET"], algorithm="HS256")


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(10)).decode("utf-8")


def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def password_problem(password):
    """Returns a sentence describing what's wrong with a new password, or None."""
    if not password or len(password) < 8:
        return "Use at least 8 characters for the password."
    if password.isalpha() or password.isdigit():
        return "Mix letters with numbers or symbols in the password."
    return None


def _extract_token():
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header.split(" ", 1)[1]
    return None


def _error(message, status):
    return jsonify({"error": message}), status


# ---------------------------------------------------------------- request guards
def authenticate_token(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        from .models import User

        token = _extract_token()
        if not token:
            return _error("Sign in to continue.", 401)
        try:
            claims = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
        except jwt.PyJWTError:
            return _error("Your session has expired. Sign in again.", 401)
        user = db.session.get(User, claims.get("id"))
        if not user or not user.is_active:
            return _error("This account is no longer active.", 401)
        if user.facility and not user.facility.active:
            return _error("This hospital's account is suspended.", 403)
        g.current_user = user
        # Kept for older handlers that read the token claims.
        g.user = {"id": user.id, "email": user.email, "role": user.role, "fullName": user.full_name}
        return f(*args, **kwargs)

    return wrapper


def require(capability):
    """Allow the request only if the signed-in user's role has `capability`."""

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user:
                return _error("Sign in to continue.", 401)
            if not can(user.role, capability):
                return _error("Your role doesn't have access to this.", 403)
            return f(*args, **kwargs)

        return wrapper

    return decorator


def require_staff(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = getattr(g, "current_user", None)
        if not user or user.role not in ALL_STAFF:
            return _error("Hospital staff access required.", 403)
        return f(*args, **kwargs)

    return wrapper


def require_patient(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = getattr(g, "current_user", None)
        if not user or user.role != "patient":
            return _error("Patient access required.", 403)
        return f(*args, **kwargs)

    return wrapper


# Kept so existing imports keep working.
require_hospital = require_staff


def require_admin(f):
    return require("staff.manage")(f)


# ---------------------------------------------------------------- tenancy
class ScopeError(Exception):
    pass


def scope_ids():
    """Hospital ids the current request may see.

    Staff: their own hospital only. Network admin: the hospital named in X-Hospital,
    or every hospital when the header is absent or 'all'.
    """
    from .models import Facility

    user = g.current_user
    if user.role != "network_admin":
        return [user.facility_id] if user.facility_id else []
    slug = (request.headers.get("X-Hospital") or request.args.get("hospital") or "").strip()
    if slug and slug != "all":
        f = Facility.query.filter_by(slug=slug).first()
        if not f:
            raise ScopeError(f"There is no hospital called {slug}.")
        return [f.id]
    return [f.id for f in Facility.query.with_entities(Facility.id).all()]


def single_scope():
    """The one hospital a write goes to. Network admins must pick one first."""
    ids = scope_ids()
    if len(ids) != 1:
        raise ScopeError("Choose a hospital first.")
    return ids[0]


def is_network_view():
    user = g.current_user
    return user.role == "network_admin" and not (
        (request.headers.get("X-Hospital") or request.args.get("hospital") or "all") != "all"
    )


def optional_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if token:
            try:
                g.user = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
            except jwt.PyJWTError:
                pass
        return f(*args, **kwargs)

    return wrapper
