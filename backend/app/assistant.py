"""Rafiki, the patient portal companion ("Talk to Rafiki").

Rafiki keeps a person on TB treatment company: small talk, stories, games, encouragement.
It is not a medic and never gives medical advice. It can do two things for real, through
tools the caller provides:

* look up the patient's medication schedule (dose time, next drug pickup, next visit), and
* escalate something the patient said to their doctor.

The model gets only de-identified treatment facts (no name, code, phone, address or
clinic), a strict system prompt, and a short conversation. Danger signs are caught here,
before and regardless of the model, and are always escalated. With no API key, or when
the provider fails or times out, rule-based replies are used instead.

Any OpenAI-compatible chat API with tool calling works. The default is NVIDIA NIM
(https://integrate.api.nvidia.com/v1) with Nemotron 3 Super; set AI_API_KEY (or NVIDIA_API_KEY),
and optionally AI_BASE_URL / AI_MODEL / AI_THINKING.

Nemotron is a reasoning model. Its reasoning is switched off by default (AI_THINKING=off): a
companion's small talk doesn't need it, and it would cost seconds per reply. Any <think> block
that still comes back is stripped before the patient sees the reply.
"""
import json
import logging
import re
import time
import urllib.error
import urllib.request
from datetime import date

from flask import current_app

log = logging.getLogger(__name__)

MAX_TURNS = 10
MAX_CHARS = 800
# All model calls for one question share this budget, so the reply (or the fallback) comes back
# before gunicorn's default 30 s worker timeout.
DEADLINE_S = 25
MAX_REPLY_TOKENS = 350
# Reasoning tokens count against max_tokens, so leave room for them when thinking is on.
MAX_THINKING_TOKENS = 2048
# Model calls per question: one to decide on tools, one to answer with their results, one spare.
MAX_ROUNDS = 3
# NVIDIA's recommended sampling for Nemotron 3.
TEMPERATURE = 1.0
TOP_P = 0.95

DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b"
THINKING_MODES = ("off", "low", "on")
THINK_BLOCK = re.compile(r"<think>.*?(</think>|$)", re.S)

SELF_HARM_WORDS = (
    "suicid", "kill myself", "end my life", "want to die", "better off dead", "hurt myself",
    "kujiua", "nataka kufa",
)
DANGER_WORDS = (
    "blood", "coughing up", "chest pain", "can't breathe", "cannot breathe", "short of breath", "breathless",
    "yellow eyes", "yellow skin", "jaundice", "rash", "confused", "fainted", "seizure",
    "damu", "kifua kinauma", "siwezi kupumua", "manjano",
)
STOPPING_WORDS = (
    "stopped taking", "stop taking", "quit my medicine", "quit the medicine", "not taking my", "run out", "ran out",
    "nimeacha", "sitaki dawa", "dawa imeisha",
)
PICKUP_WORDS = (
    "pick up", "pickup", "pick-up", "collect", "refill", "next supply", "get more", "more medicine", "more pills",
    "dose time", "appointment", "next visit", "chukua dawa",
)
LONELY_WORDS = ("lonely", "alone", "bored", "sad", "scared", "afraid", "stressed", "upweke", "huzuni", "nimechoka")
MEDICAL_WORDS = (
    "side effect", "symptom", "vomit", "nausea", "itch", "pain", "fever", "cough", "dose", "missed a", "missed my", "forgot my",
    "tablet", "pill", "drug", "medicine", "how long", "contagious", "infect",
)

URGENT_REPLY = (
    "What you describe can be serious. Please contact your clinic today, or go to the nearest health facility "
    "or call 999 or 112 now if it is severe. Don't wait for your next appointment."
)
SELF_HARM_REPLY = (
    "I'm really glad you told me, and I'm sorry you're carrying this. You matter. If you might act on these "
    "thoughts, please call 999 or 112 now, or the Kenya Red Cross free line 1199, any time of day. "
    "If you can, stay close to someone you trust right now."
)
NOT_A_DOCTOR = (
    "That's a question for your doctor. I'm your companion, not a medic, so I don't want to guess. "
    "If something is bothering you, tell me and I'll pass it on to them."
)

SYSTEM_PROMPT = """You are Rafiki ("friend" in Swahili), a warm companion inside Clinvia's patient app. The person you're talking with is being treated for tuberculosis (TB) at a clinic in Kenya. Treatment is long and can be lonely. Your job is to keep them company and lift their mood.

What you do:
- Chat like a kind friend. Ask about their day, family, hobbies, music, football, food, faith and plans for after treatment. Offer stories, riddles, jokes, fun facts, simple word games, or a short breathing exercise when they feel stressed.
- Keep replies short (under 100 words), plain and warm. Reply in the language they write in (English, Swahili or Sheng). Ask at most one gentle question at a time.
- Help them think about things other than illness, but never dismiss what they feel. Celebrate their progress (days of treatment, doses taken).

What you are not:
- You are not a doctor or nurse. Never diagnose, explain symptoms, recommend, change, stop or add medicines, or say to skip or double a dose. If they ask a medical question, say kindly that it's one for their doctor, offer to pass a concern on, then go back to keeping them company.

Tools:
- get_medication_schedule: call it whenever they ask when to pick up, collect or refill their medicine, their dose time, or their next clinic appointment. Give dates exactly as returned. If the pickup date is estimated, say to confirm it with their clinic. Never guess a date.
- escalate_to_doctor: call it when they tell you something their doctor should know: new or worse symptoms, side effects, stopping or wanting to stop treatment, running out of medicine, feeling hopeless or very low, or anything that sounds unsafe. Use severity "urgent" for anything that could be an emergency, otherwise "concern". Write the reason as one short, factual sentence for the doctor. Afterwards tell them their doctor has been told, and if it could be urgent, to go to the nearest health facility or call 999 or 112.

What the clinic record says about them (no personal details are shared with you):
{context}"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_medication_schedule",
            "description": "The patient's daily dose time, when they should next pick up their TB medicine at the "
                           "clinic, and their next booked clinic appointment.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "escalate_to_doctor",
            "description": "Tell the patient's doctor about something the patient reported that needs medical "
                           "attention. The doctor sees the patient's own words.",
            "parameters": {
                "type": "object",
                "properties": {
                    "severity": {"type": "string", "enum": ["urgent", "concern"]},
                    "reason": {"type": "string", "description": "One short, factual sentence for the doctor."},
                },
                "required": ["severity", "reason"],
            },
        },
    },
]


def settings():
    cfg = current_app.config
    return {
        "key": cfg.get("AI_API_KEY") or "",
        "base_url": (cfg.get("AI_BASE_URL") or DEFAULT_BASE_URL).rstrip("/"),
        "model": cfg.get("AI_MODEL") or DEFAULT_MODEL,
        "thinking": cfg.get("AI_THINKING") if cfg.get("AI_THINKING") in THINKING_MODES else "off",
    }


def strip_reasoning(text):
    """Drop a reasoning model's <think> block (closed, or cut off by max_tokens), keeping the answer."""
    text = THINK_BLOCK.sub("", text or "")
    if "</think>" in text:  # the opening tag was in the prompt template, so only the close came back
        text = text.split("</think>", 1)[1]
    return text.strip()


def build_context(facts):
    """Turn treatment facts into prompt lines. Only these keys are ever read: nothing identifying."""
    today = facts.get("today")
    lines = [f"- Today is {today.strftime('%A %-d %B %Y')}" if isinstance(today, date) else None]
    if not facts.get("on_treatment"):
        lines.append("- Not currently on a TB treatment course.")
    else:
        lines += [
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


def _mentions(text, words):
    lowered = text.lower()
    return any(word in lowered for word in words)


def has_danger_sign(text):
    return _mentions(text, DANGER_WORDS + SELF_HARM_WORDS)


def _friendly_date(iso):
    return date.fromisoformat(iso).strftime("%A %-d %B")


def schedule_reply(schedule):
    """Plain-language answer from get_medication_schedule(), for when the model isn't available."""
    if not schedule or not schedule.get("on_treatment"):
        return "You aren't on a TB treatment course right now, so there's no medicine to pick up. Your clinic can tell you more."
    parts = [f"Your daily dose time is {schedule['dose_time']}."] if schedule.get("dose_time") else []
    pickup = schedule.get("next_pickup")
    if pickup:
        when = _friendly_date(pickup["due"])
        if pickup["overdue"]:
            parts.append(f"Your medicine pickup was due on {when}. Please go to your clinic as soon as you can.")
        elif pickup["daysLeft"] == 0:
            parts.append("Your next medicine pickup is today.")
        else:
            parts.append(f"Your next medicine pickup is on {when}, in {pickup['daysLeft']} "
                         f"day{'s' if pickup['daysLeft'] != 1 else ''}.")
        if pickup["estimated"]:
            parts.append("That date is an estimate from your treatment plan, so confirm it with your clinic.")
    else:
        parts.append("You have no more pickups on your current treatment plan. Your clinic will confirm.")
    appt = schedule.get("next_appointment")
    if appt:
        parts.append(f"Your next clinic appointment is on {_friendly_date(appt['date'])} at {appt['time']}.")
    return " ".join(parts)


def fallback_reply(question, tools):
    """Rule-based reply when the model can't be used. Returns (reply, escalated)."""
    if _mentions(question, STOPPING_WORDS):
        tools.escalate("concern", "Patient says they have stopped, or run out of, their TB medicine.", question, "rule")
        return ("Thank you for telling me. I've let your doctor know so they can help. Please don't give up on "
                "your treatment. Finishing it is what cures TB, and your clinic wants to help you get there."), True
    if _mentions(question, PICKUP_WORDS):
        return schedule_reply(tools.schedule()), False
    if _mentions(question, LONELY_WORDS):
        return ("I'm sorry you're feeling this way. Treatment can be long, and it's okay to find it hard. I'm here "
                "whenever you want to talk. Would a story, a riddle, or just telling me about your day help?"), False
    if _mentions(question, MEDICAL_WORDS):
        return NOT_A_DOCTOR, False
    return ("I'm Rafiki, and I'm here to keep you company. Tell me about your day, or ask me for a story, a riddle "
            "or a fun fact. I can also tell you when to pick up your medicine."), False


def _payload(cfg, messages):
    thinking = cfg.get("thinking", "off")
    payload = {
        "model": cfg["model"],
        "messages": messages,
        "tools": TOOLS,
        "tool_choice": "auto",
        "temperature": TEMPERATURE,
        "top_p": TOP_P,
        "max_tokens": MAX_REPLY_TOKENS if thinking == "off" else MAX_THINKING_TOKENS,
    }
    # Nemotron's reasoning switch; other providers would reject the unknown field.
    if "nemotron" in cfg["model"].lower():
        kwargs = {"enable_thinking": thinking != "off"}
        if thinking == "low":
            kwargs["low_effort"] = True
        payload["chat_template_kwargs"] = kwargs
    return payload


def _call_model(cfg, messages, timeout=DEADLINE_S):
    """One chat completion with tools. Returns (assistant message dict, usage dict)."""
    payload = json.dumps(_payload(cfg, messages)).encode()
    req = urllib.request.Request(
        f"{cfg['base_url']}/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {cfg['key']}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        data = json.loads(res.read())
    return (data.get("choices") or [{}])[0].get("message") or {}, data.get("usage") or {}


def _run_tool(call, tools, question, state):
    fn = call.get("function") or {}
    name = fn.get("name")
    if name == "get_medication_schedule":
        return tools.schedule()
    if name == "escalate_to_doctor":
        try:
            args = json.loads(fn.get("arguments") or "{}")
        except ValueError:
            args = {}
        severity = args.get("severity") if args.get("severity") in ("urgent", "concern") else "concern"
        reason = str(args.get("reason") or "").strip()[:300] or "The companion flagged a message for review."
        if state["escalated"]:
            return {"notified": True, "note": "Already escalated in this reply."}
        state["escalated"] = True
        return tools.escalate(severity, reason, question, "ai")
    return {"error": f"Unknown tool {name}"}


def answer(facts, raw_messages, tools):
    """Reply to the conversation.

    `tools` provides `schedule()` -> dict and `escalate(severity, reason, message, source)` -> dict.
    Returns {"reply", "source", "escalated"}; source is ai, fallback or safety.
    """
    messages = clean_messages(raw_messages)
    question = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    if not question:
        return {"reply": "Hi, I'm Rafiki. How are you feeling today?", "source": "fallback", "escalated": False}
    if _mentions(question, SELF_HARM_WORDS):
        tools.escalate("urgent", "Patient mentioned thoughts of self-harm or suicide.", question, "rule")
        return {"reply": f"{SELF_HARM_REPLY} I've let your doctor know.", "source": "safety", "escalated": True}
    if _mentions(question, DANGER_WORDS):
        tools.escalate("urgent", "Patient reported a possible danger sign.", question, "rule")
        return {"reply": f"{URGENT_REPLY} I've let your doctor know.", "source": "safety", "escalated": True}

    cfg = settings()
    if not cfg["key"]:
        reply, escalated = fallback_reply(question, tools)
        return {"reply": reply, "source": "fallback", "escalated": escalated}

    prompt = [{"role": "system", "content": SYSTEM_PROMPT.format(context=build_context(facts))}, *messages]
    state = {"escalated": False}
    started = time.monotonic()
    usage, reply = {}, ""
    try:
        for _ in range(MAX_ROUNDS):
            left = DEADLINE_S - (time.monotonic() - started)
            if left < 2:
                raise TimeoutError("out of time for another model call")
            msg, usage = _call_model(cfg, prompt, timeout=left)
            calls = msg.get("tool_calls") or []
            if not calls:
                reply = strip_reasoning(msg.get("content"))
                break
            prompt.append({"role": "assistant", "content": strip_reasoning(msg.get("content")), "tool_calls": calls})
            for call in calls:
                result = _run_tool(call, tools, question, state)
                prompt.append({"role": "tool", "tool_call_id": call.get("id"), "content": json.dumps(result)})
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as err:
        log.warning("assistant provider failed after %.1fs: %s", time.monotonic() - started, err)
    log.info(
        "assistant reply model=%s latency=%.2fs prompt_tokens=%s completion_tokens=%s escalated=%s",
        cfg["model"], time.monotonic() - started, usage.get("prompt_tokens"), usage.get("completion_tokens"),
        state["escalated"],
    )
    if reply:
        return {"reply": reply, "source": "ai", "escalated": state["escalated"]}
    if state["escalated"]:
        return {"reply": "Thank you for telling me. I've let your doctor know. If it feels urgent, go to the "
                         "nearest health facility or call 999 or 112.", "source": "fallback", "escalated": True}
    reply, escalated = fallback_reply(question, tools)
    return {"reply": reply, "source": "fallback", "escalated": escalated}
