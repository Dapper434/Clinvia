import hmac

from flask import Blueprint, current_app, jsonify, request

from ..reminders import push_enabled, send_due_reminders

bp = Blueprint("reminders", __name__, url_prefix="/api/reminders")


@bp.post("/run")
def run_reminders():
    """Called by the external scheduler; authenticated with a shared secret header."""
    expected = current_app.config["REMINDER_CRON_SECRET"]
    provided = request.headers.get("X-Cron-Secret", "")
    if not expected or not hmac.compare_digest(provided, expected):
        return jsonify({"error": "Forbidden"}), 403
    if not push_enabled():
        return jsonify({"error": "Push reminders are not configured on this server"}), 503
    return jsonify(send_due_reminders())
