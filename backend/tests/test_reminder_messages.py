"""Reminder styles: discreet wording, the patient's chosen voice, the agent hook, and streaks.

Everything but the last test runs without a database.
"""
from datetime import date, timedelta

import pytest

from app import reminder_messages as rm
from app.clinical import best_taken_streak, taken_streak

CTX = {"name": "Faith Wanjiru", "time_label": "7:00 AM"}


@pytest.fixture(autouse=True)
def no_agent():
    rm.register_generator(None)
    yield
    rm.register_generator(None)


@pytest.mark.parametrize("style", list(rm.STYLES))
def test_every_template_is_discreet(style):
    for i in range(40):
        body = rm.compose(style, seed=f"p{i}", **CTX)["body"]
        assert rm.is_discreet(body), body
    assert rm.is_discreet(rm.NOTIFICATION_TITLE)


def test_the_guard_catches_health_words():
    assert not rm.is_discreet("Time for your TB medicine")
    assert not rm.is_discreet("Take your pills, Faith")
    assert rm.is_discreet("Your 7:00 AM routine is waiting, Faith.")


def test_style_is_honoured_and_unknown_styles_fall_back():
    assert "Philippians" in "".join(rm.compose("verse_christian", seed=f"s{i}", **CTX)["body"] for i in range(30))
    assert "Qur'an" in rm.compose("verse_muslim", seed="x", **CTX)["body"]
    assert rm.compose("nonsense", seed="x", **CTX)["style"] == rm.DEFAULT_STYLE


def test_same_patient_and_day_get_the_same_message():
    a = rm.compose("comedic", seed="patient-1:2026-09-27", **CTX)
    b = rm.compose("comedic", seed="patient-1:2026-09-27", **CTX)
    assert a == b and "Faith" in a["body"] and "Wanjiru" not in a["body"]


def test_agent_message_is_used_when_discreet():
    rm.register_generator(lambda style, ctx: f"Morning {ctx['name']}, your routine awaits.")
    out = rm.compose("witty", seed="x", **CTX)
    assert out == {"style": "witty", "title": rm.NOTIFICATION_TITLE, "body": "Morning Faith, your routine awaits.", "source": "agent"}


def test_agent_message_that_names_the_illness_is_replaced():
    rm.register_generator(lambda style, ctx: "Time for your TB medicine, Faith!")
    out = rm.compose("witty", seed="x", **CTX)
    assert out["source"] == "template" and rm.is_discreet(out["body"])


def test_agent_failure_never_stops_the_reminder():
    def boom(style, ctx):
        raise RuntimeError("provider down")

    rm.register_generator(boom)
    assert rm.compose("comedic", seed="x", **CTX)["source"] == "template"


def _log(pattern, end=date(2026, 9, 27)):
    """pattern oldest→newest: t taken, m missed, . no log."""
    out = {}
    for i, c in enumerate(reversed(pattern)):
        if c != ".":
            out[end - timedelta(days=i)] = (c == "t", "patient_portal")
    return out


def test_taken_streak_counts_back_from_today_or_yesterday():
    today = date(2026, 9, 27)
    assert taken_streak(_log("mtttt"), today) == 4
    assert taken_streak(_log("tttm"), today) == 0
    assert taken_streak(_log("ttt."), today) == 3  # today not logged yet: counts up to yesterday


def test_best_streak_breaks_on_misses_and_gaps():
    assert best_taken_streak(_log("tttmtttttm")) == 5
    assert best_taken_streak(_log("tt.ttt")) == 3
    assert best_taken_streak({}) == 0


def test_patient_can_choose_a_reminder_style(client, login):
    pat = login("faith.wanjiru.p0001@patient.clinvia.health", "Patient-test-1", kind="patient")
    r = client.patch("/api/patient-portal/reminder-style", json={"style": "verse_muslim"}, headers=pat)
    assert r.status_code == 200 and r.get_json()["style"] == "verse_muslim"
    assert client.patch("/api/patient-portal/reminder-style", json={"style": "shouty"}, headers=pat).status_code == 400
    reminder = client.get("/api/patient-portal/my-treatment", headers=pat).get_json()["reminder"]
    assert reminder["style"] == "verse_muslim" and rm.is_discreet(reminder["preview"]["body"])
