"""Daily dose reminders delivered as web push notifications.

An external scheduler (see .github/workflows/dose-reminders.yml) calls
POST /api/reminders/run every 30 minutes. Each run reminds every active
patient whose dose time has passed today, who hasn't logged today's dose yet,
and who hasn't already been reminded today. Runs are idempotent, so a delayed
or repeated trigger never double-notifies anyone.
"""
import hashlib
import json
from datetime import datetime, time
from zoneinfo import ZoneInfo

from flask import current_app
from pywebpush import WebPushException, webpush

from .extensions import db
from .models import DoseLog, Patient, PushSubscription, TbEpisode

REMINDER_URL = "/my-treatment"

# Kind, not shaming. A few gently restate real guidance (empty stomach, water).
WITTY_MESSAGES = [
    "Your pills called, {name}. They miss you. 💊",
    "{name}, TB bacteria are hoping you forget today. Let's disappoint them.",
    "Plot twist: today's hero takes their {time} dose on time. That's you, {name}.",
    "One dose a day keeps the relapse away. Your {time} dose is ready, {name}.",
    "Glass of water ✓ Pills ✓ Log it in Clinvia ✓. Three ticks, {name}. You've got this.",
    "Quick one before breakfast, {name}: your TB meds work best on an empty stomach.",
    "Streaks aren't just for apps, {name}. Keep yours alive. Take today's dose.",
    "{name}, you've come this far. Today's dose is another step to done.",
    "Knock knock. Who's there? Your {time} dose. Don't leave it waiting, {name}.",
    "Small pill, big win. Take today's dose and tap it done in Clinvia, {name}.",
]

GONE_STATUSES = {404, 410}


def _tz():
    return ZoneInfo(current_app.config["APP_TIMEZONE"])


def default_dose_time():
    hours, minutes = current_app.config["DEFAULT_DOSE_TIME"].split(":")
    return time(int(hours), int(minutes))


def effective_dose_time(patient):
    return patient.dose_time or default_dose_time()


def _friendly_time(t):
    return datetime.combine(datetime.today(), t).strftime("%-I:%M %p")


def build_message(patient, day):
    """Deterministic per patient per day: varies day to day, stable within a day."""
    digest = hashlib.sha256(f"{patient.id}:{day.isoformat()}".encode()).hexdigest()
    template = WITTY_MESSAGES[int(digest, 16) % len(WITTY_MESSAGES)]
    first_name = (patient.name or "there").split(" ")[0]
    return template.format(name=first_name, time=_friendly_time(effective_dose_time(patient)))


def push_enabled():
    cfg = current_app.config
    return bool(cfg["VAPID_PUBLIC_KEY"] and cfg["VAPID_PRIVATE_KEY"])


def send_push(subscription, title, body):
    """Send one notification. Returns 'sent', 'gone' (stale subscription), or 'failed'."""
    cfg = current_app.config
    payload = json.dumps({"title": title, "body": body, "url": REMINDER_URL, "tag": "dose-reminder"})
    try:
        webpush(
            subscription_info=subscription.subscription_info(),
            data=payload,
            vapid_private_key=cfg["VAPID_PRIVATE_KEY"],
            vapid_claims={"sub": cfg["VAPID_CLAIM_EMAIL"]},
            ttl=4 * 3600,  # don't deliver a stale reminder hours later if the phone was off
        )
        return "sent"
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None)
        if status in GONE_STATUSES:
            return "gone"
        current_app.logger.warning("Push failed for subscription %s: %s", subscription.id, exc)
        return "failed"


def _deliver_to_user(user_id, title, body, summary):
    """Send to every device the user subscribed; prune dead ones. Returns True if any delivered."""
    delivered = False
    for sub in PushSubscription.query.filter_by(user_id=user_id).all():
        result = send_push(sub, title, body)
        if result == "sent":
            delivered = True
            summary["sent"] += 1
        elif result == "gone":
            db.session.delete(sub)
            summary["pruned"] += 1
        else:
            summary["failed"] += 1
    return delivered


def send_due_reminders(now=None):
    now = now or datetime.now(_tz())
    today = now.date()
    summary = {
        "checked": 0,
        "not_yet_due": 0,
        "already_logged": 0,
        "already_reminded": 0,
        "no_device": 0,
        "reminded": 0,
        "sent": 0,
        "failed": 0,
        "pruned": 0,
    }

    patients = (
        Patient.query.join(TbEpisode, TbEpisode.patient_id == Patient.id)
        .filter(TbEpisode.status == "active", Patient.user_id.isnot(None))
        .all()
    )
    for patient in patients:
        summary["checked"] += 1
        if now.time() < effective_dose_time(patient):
            summary["not_yet_due"] += 1
            continue
        if patient.last_reminder_sent_on == today:
            summary["already_reminded"] += 1
            continue
        if DoseLog.query.filter_by(patient_id=patient.id, date=today).first():
            summary["already_logged"] += 1
            continue
        if not PushSubscription.query.filter_by(user_id=patient.user_id).first():
            summary["no_device"] += 1
            continue

        if _deliver_to_user(patient.user_id, "Time for your TB medicine", build_message(patient, today), summary):
            patient.last_reminder_sent_on = today
            summary["reminded"] += 1

    db.session.commit()
    return summary


def send_test_reminder(patient):
    summary = {"sent": 0, "failed": 0, "pruned": 0}
    today = datetime.now(_tz()).date()
    _deliver_to_user(patient.user_id, "Test reminder from Clinvia", build_message(patient, today), summary)
    db.session.commit()
    return summary
