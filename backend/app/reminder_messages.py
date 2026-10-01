"""Reminder messages in the patient's chosen style, worded discreetly.

Lock screens are public, so a reminder never names the illness or the medicine:
it talks about the patient's "daily routine". Patients pick the voice: witty,
comedic, or with a short Bible or Qur'an verse attached.

Messages come from the template library below. The treatment agent can take
over later: `register_generator(fn)` installs a function that writes the text
(for example with the AI provider in assistant.py). Whatever it returns still has
to pass `is_discreet`, and if it fails or returns nothing, the template is used.
"""
import hashlib
import logging
import re

log = logging.getLogger(__name__)

DEFAULT_STYLE = "witty"
STYLES = {
    "witty": "Witty",
    "comedic": "Comedic",
    "verse_christian": "Bible verse",
    "verse_muslim": "Qur'an verse",
}

NOTIFICATION_TITLE = "Time for your daily routine"

# Words that would give the reason away on a lock screen.
HEALTH_WORDS = (
    "tb", "tuberculosis", "medicine", "medication", "meds", "pill", "pills", "dose", "doses",
    "tablet", "tablets", "treatment", "clinic", "hospital", "drug", "drugs", "cough", "sick",
    "dawa", "kifua kikuu",
)
_HEALTH_RE = re.compile(r"\b(" + "|".join(re.escape(w) for w in HEALTH_WORDS) + r")\b", re.IGNORECASE)

WITTY = [
    "Your {time} routine called, {name}. It misses you.",
    "Plot twist: today's hero keeps their {time} routine. That's you, {name}.",
    "Glass of water, daily routine, tap it done. Three ticks, {name}. You've got this.",
    "Small habit, big win. Your {time} routine is ready, {name}.",
    "Future you says thank you, {name}. Your daily routine is up.",
    "Streaks aren't just for apps, {name}. Keep yours alive today.",
    "{name}, you've come this far. Today's routine is one more step to done.",
]

COMEDIC = [
    "Knock knock. Who's there? Your {time} routine. Don't leave it standing outside, {name}.",
    "Breaking news: local legend {name} about to crush today's routine. More at {time}.",
    "{name}, your routine has been waiting since {time}. It's started writing poetry about you.",
    "Even the rooster did its job this morning, {name}. Your turn.",
    "Warning: skipping today's routine may make your streak cry. Think of the streak, {name}.",
    "Your daily routine walked into a bar and ordered water. It's waiting for you, {name}.",
]

# Short verses, quoted with their reference. Bible: King James Version (public domain).
BIBLE = [
    ("I can do all things through Christ which strengtheneth me.", "Philippians 4:13"),
    ("They that wait upon the LORD shall renew their strength.", "Isaiah 40:31"),
    ("This is the day which the LORD hath made; we will rejoice and be glad in it.", "Psalm 118:24"),
    ("Be strong and of a good courage; be not afraid.", "Joshua 1:9"),
    ("Let us not be weary in well doing: for in due season we shall reap, if we faint not.", "Galatians 6:9"),
    ("Cast thy burden upon the LORD, and he shall sustain thee.", "Psalm 55:22"),
]

# Qur'an: widely quoted English renderings (Sahih International).
QURAN = [
    ("Indeed, with hardship will be ease.", "Qur'an 94:6"),
    ("Allah does not burden a soul beyond that it can bear.", "Qur'an 2:286"),
    ("And seek help through patience and prayer.", "Qur'an 2:45"),
    ("Indeed, Allah is with the patient.", "Qur'an 2:153"),
    ("So remember Me; I will remember you.", "Qur'an 2:152"),
    ("And your Lord is going to give you, and you will be satisfied.", "Qur'an 93:5"),
]

VERSE_TAIL = "Your {time} routine is waiting, {name}."

_generator = None


def register_generator(fn):
    """Install the agent that writes reminders: fn(style, context) -> str | None. None removes it."""
    global _generator
    _generator = fn


def normalise_style(style):
    return style if style in STYLES else DEFAULT_STYLE


def is_discreet(text):
    return bool(text) and not _HEALTH_RE.search(text)


def _pick(items, seed):
    digest = hashlib.sha256(seed.encode()).hexdigest()
    return items[int(digest, 16) % len(items)]


def _from_templates(style, ctx, seed):
    fields = {"name": ctx["name"], "time": ctx["time"]}
    if style in ("verse_christian", "verse_muslim"):
        verse, ref = _pick(BIBLE if style == "verse_christian" else QURAN, seed)
        return f"“{verse}” ({ref}) {VERSE_TAIL.format(**fields)}"
    return _pick(COMEDIC if style == "comedic" else WITTY, seed).format(**fields)


def compose(style, *, name, time_label, streak=0, seed=""):
    """The reminder text for one patient on one day. Same inputs, same message."""
    style = normalise_style(style)
    ctx = {"name": (name or "there").split(" ")[0], "time": time_label, "streak": streak}
    if _generator:
        try:
            text = (_generator(style, ctx) or "").strip()
            if is_discreet(text):
                return {"style": style, "title": NOTIFICATION_TITLE, "body": text, "source": "agent"}
            log.warning("reminder generator returned a non-discreet or empty message; using a template")
        except Exception as err:  # the agent must never stop a reminder going out
            log.warning("reminder generator failed: %s", err)
    return {"style": style, "title": NOTIFICATION_TITLE, "body": _from_templates(style, ctx, seed), "source": "template"}
