import time
from functools import wraps

import bcrypt
import jwt
from flask import current_app, g, jsonify, request

STAFF_ROLES = {"hospital", "nurse", "viewer"}
HOSPITAL_ROLES = STAFF_ROLES | {"admin"}


def is_hospital_role(role):
    return role in HOSPITAL_ROLES


def is_admin_role(role):
    return role == "admin"


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


def _extract_token():
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header.split(" ", 1)[1]
    return None


def authenticate_token(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "Access token required"}), 401
        try:
            g.user = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
        except jwt.PyJWTError:
            return jsonify({"error": "Invalid or expired token"}), 403
        return f(*args, **kwargs)

    return wrapper


def require_hospital(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = getattr(g, "user", None)
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        if not is_hospital_role(user.get("role") or "hospital"):
            return jsonify({"error": "Hospital staff access required"}), 403
        return f(*args, **kwargs)

    return wrapper


def require_admin(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = getattr(g, "user", None)
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        if not is_admin_role(user.get("role")):
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)

    return wrapper


def require_patient(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = getattr(g, "user", None)
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        if user.get("role") != "patient":
            return jsonify({"error": "Patient access required"}), 403
        return f(*args, **kwargs)

    return wrapper


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
