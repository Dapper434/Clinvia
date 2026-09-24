from urllib.parse import urlparse

from flask import Blueprint, current_app, g, jsonify, request

from ..auth import authenticate_token, require_patient
from ..extensions import db
from ..models import Patient, PushSubscription
from ..reminders import push_enabled, send_test_reminder

bp = Blueprint("push", __name__, url_prefix="/api/push")

# The server POSTs to whatever endpoint a browser registers, so only accept the
# real browser push services; otherwise the endpoint could be pointed anywhere.
ALLOWED_PUSH_HOST_SUFFIXES = (
    "fcm.googleapis.com",
    "android.googleapis.com",
    "push.services.mozilla.com",
    "web.push.apple.com",
    "notify.windows.com",
)


def _valid_endpoint(endpoint):
    parsed = urlparse(endpoint or "")
    host = parsed.hostname or ""
    return parsed.scheme == "https" and any(
        host == suffix or host.endswith("." + suffix) for suffix in ALLOWED_PUSH_HOST_SUFFIXES
    )


@bp.get("/vapid-public-key")
def vapid_public_key():
    if not push_enabled():
        return jsonify({"error": "Push reminders are not configured on this server"}), 503
    return jsonify({"publicKey": current_app.config["VAPID_PUBLIC_KEY"]})


@bp.post("/subscribe")
@authenticate_token
@require_patient
def subscribe():
    body = request.get_json(silent=True) or {}
    endpoint = body.get("endpoint")
    keys = body.get("keys") or {}
    if not _valid_endpoint(endpoint) or not keys.get("p256dh") or not keys.get("auth"):
        return jsonify({"error": "Invalid push subscription"}), 400

    sub = PushSubscription.query.filter_by(endpoint=endpoint).first()
    if sub:
        sub.user_id = g.user["id"]
        sub.p256dh = keys["p256dh"]
        sub.auth = keys["auth"]
    else:
        db.session.add(
            PushSubscription(user_id=g.user["id"], endpoint=endpoint, p256dh=keys["p256dh"], auth=keys["auth"])
        )
    db.session.commit()
    return jsonify({"subscribed": True}), 201


@bp.delete("/subscribe")
@authenticate_token
@require_patient
def unsubscribe():
    body = request.get_json(silent=True) or {}
    PushSubscription.query.filter_by(endpoint=body.get("endpoint"), user_id=g.user["id"]).delete()
    db.session.commit()
    return jsonify({"subscribed": False})


@bp.post("/test")
@authenticate_token
@require_patient
def test_notification():
    patient = Patient.query.filter_by(user_id=g.user["id"]).first()
    if not patient:
        return jsonify({"error": "No patient record linked to your account"}), 404
    result = send_test_reminder(patient)
    if result["sent"] == 0:
        return jsonify({"error": "No reachable device. Turn reminders on first.", **result}), 409
    return jsonify(result)
