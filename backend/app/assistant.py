"""Patient treatment companion ("Talk to AI") for the patient portal.

The model gets only de-identified treatment facts (no name, code, phone, address
or clinic), a strict system prompt, and a short conversation. Danger signs are
caught here, before and regardless of the model. With no API key, or when the
provider fails or times out, a rule-based reply is returned instead, so the
patient always gets an answer that points them back to their clinic.

Any OpenAI-compatible chat API works (Groq by default; Gemini via its
OpenAI-compatible endpoint): set AI_API_KEY, and optionally AI_BASE_URL / AI_MODEL.
"""
import json
import logging
import time
import urllib.error
import urllib.request

from flask import current_app

log = logging.getLogger(__name__)

MAX_TURNS = 8
MAX_CHARS = 800
TIMEOUT_S = 12
MAX_REPLY_TOKENS = 350

DANGER_WORDS = (
    "blood", "coughing up", "chest pain", "can't breathe", "cannot breathe", "short of breath", "breathless",
    "yellow eyes", "yellow skin", "jaundice", "rash", "confused", "fainted", "seizure", "suicid", "kill myself",
    "damu", "kifua kinauma", "siwezi kupumua", "manjano",
)

URGENT_REPLY = (
    "What you describe can be serious. Please contact your clinic today, or go to the nearest health facility "
    "or call emergency services now if it is severe. Don't wait for your next appointment."
)

SYSTEM_PROMPT = """You are Clinvia's treatment companion. You talk with a person who is being treated for tuberculosis (TB) at a clinic in Kenya.

How to answer:
- Short, warm, plain language (under 120 words). Reply in the language the person writes in (English or Swahili).
- Explain TB treatment in general terms, encourage taking medicine every day, and help them prepare questions for their clinic.
- You are not a doctor. Never diagnose, never change, stop or add medicines, and never tell them to skip or double a dose. For anything about their own medicines or doses, tell them to ask their clinic.
- If they mention danger signs (coughing blood, chest pain, trouble breathing, yellow eyes or skin, a bad rash, confusion, fainting, thoughts of self-harm), tell them to contact their clinic now or go to the nearest health facility.
- If you don't know, say so and suggest asking their clinic.

What the clinic record says about them (no personal details are shared with you):
{context}"""


def settings():
    cfg = current_app.config
    return {
        "key": cfg.get("AI_API_KEY") or "",
        "base_url": (cfg.get("AI_BASE_URL") or "https://api.groq.com/openai/v1").rstrip("/"),
        "model": cfg.get("AI_MODEL") or "llama-3.3-70b-versatile",
    }


def build_context(facts):
    """Turn treatment facts into prompt lines. Only these keys are ever read: nothing identifying."""
    if not facts.get("on_treatment"):
        return "- Not currently on a TB treatment course."
    lines = [
        f"- Regimen: {facts.get('regimen') or 'not recorded'}",
        f"- Day {facts['day_of_treatment']} of treatment" if facts.get("day_of_treatment") else None,
        f"- Adherence over the last 30 days: {facts['adherence']}%" if facts.get("adherence") is not None else None,
        f"- Missed doses in a row right now: {facts.get('missed_streak', 0)}",
        f"- Daily dose time: {facts['dose_time']}" if facts.get("dose_time") else None,
        f"- Today's dose logged: {'yes' if facts.get('logged_today') else 'not yet'}",
    ]
    return "\n".join(line for line in lines if line)


def clean_messages(raw):
    """Keep the last few user/assistant turns, trimmed; drop anything else."""
    if not isinstance(raw, list):
        return []
    out = []
    for m in raw[-MAX_TURNS:]:
        if not isinstance(m, dict) or m.get("role") not in ("user", "assistant"):
            continue
        text = str(m.get("content") or "").strip()[:MAX_CHARS]
        if text:
            out.append({"role": m["role"], "content": text})
    return out


def has_danger_sign(text):
    lowered = text.lower()
    return any(word in lowered for word in DANGER_WORDS)


def fallback_reply(question):
    q = question.lower()
    if has_danger_sign(q):
        return URGENT_REPLY
    if any(w in q for w in ("miss", "forgot", "forget", "sahau")):
        return ("If you missed a dose, tell your clinic today so they can advise you. Don't take two doses at once "
                "unless they tell you to. Then keep going with your daily dose. Every dose counts.")
    if any(w in q for w in ("side effect", "sick", "vomit", "nausea", "tired", "itch", "pain")):
        return ("Some people feel side effects from TB medicine. Tell your clinic what you are feeling; they can help. "
                "Don't stop your medicine on your own. If it is severe, go to the nearest health facility.")
    if any(w in q for w in ("how long", "months", "when will", "finish")):
        return ("TB treatment usually lasts at least six months, even after you feel better. Your clinic will tell you "
                "exactly how long your course is. Finishing it is what cures TB.")
    return ("The assistant can't answer right now. For questions about your treatment, contact your clinic. "
            "Keep taking your medicine every day, and check in here after each dose.")


def _call_model(cfg, messages):
    payload = json.dumps({
        "model": cfg["model"],
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": MAX_REPLY_TOKENS,
    }).encode()
    req = urllib.request.Request(
        f"{cfg['base_url']}/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {cfg['key']}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as res:
        data = json.loads(res.read())
    reply = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
    return reply, data.get("usage") or {}


def answer(facts, raw_messages):
    """Reply to the conversation. Returns {"reply", "source"} where source is ai, fallback or safety."""
    messages = clean_messages(raw_messages)
    question = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    if not question:
        return {"reply": "Ask me anything about your TB treatment.", "source": "fallback"}
    if has_danger_sign(question):
        return {"reply": URGENT_REPLY, "source": "safety"}

    cfg = settings()
    if not cfg["key"]:
        return {"reply": fallback_reply(question), "source": "fallback"}

    prompt = [{"role": "system", "content": SYSTEM_PROMPT.format(context=build_context(facts))}, *messages]
    started = time.monotonic()
    try:
        reply, usage = _call_model(cfg, prompt)
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as err:
        log.warning("assistant provider failed after %.1fs: %s", time.monotonic() - started, err)
        return {"reply": fallback_reply(question), "source": "fallback"}
    log.info(
        "assistant reply model=%s latency=%.2fs prompt_tokens=%s completion_tokens=%s",
        cfg["model"], time.monotonic() - started, usage.get("prompt_tokens"), usage.get("completion_tokens"),
    )
    return {"reply": reply or fallback_reply(question), "source": "ai" if reply else "fallback"}
