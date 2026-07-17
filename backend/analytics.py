"""Shared analytics for the History "Trends" tab.

Every metric used by the three trend views (Follow-Through, Lost Time by
Activity, Time of Day Performance) is computed once, here, from raw
daily_tasks records. Callers must pass raw documents straight from the
daily_tasks collection — never run them through the schedule-slot re-join
used by the Today/History task-list endpoints first. That re-join
intentionally overwrites name/start_time/end_time/duration with whatever the
slot looks like *today*, which is correct for a task list but would silently
rewrite history for these trends (a renamed or rescheduled activity would
then look like it always had its new name/time). Every daily_task already
snapshots its own name/start_time/end_time/duration at creation, so reading
the raw collection is both simpler and correct.

client_today / now_minutes / tz_offset_minutes all describe the caller's
local time — the server has no other way to know it. now_minutes is only
used to decide whether *today's* still-open tasks have had their window
close yet ("do not count an unresolved current-day task as missed until its
scheduled slot has ended").
"""
import statistics
from datetime import datetime, timedelta, date as date_cls
from typing import Optional

RESOLVED_STATUSES = ("completed", "incomplete", "skipped", "missed")

# (key, label, start_hour, end_hour). end_hour may exceed 24 to express a
# span that wraps past midnight (Evening: 18:00-05:00 the next day).
TIME_PERIODS = [
    ("early_morning", "Early Morning", 5, 8),
    ("morning", "Morning", 8, 12),
    ("midday", "Midday", 12, 14),
    ("afternoon", "Afternoon", 14, 18),
    ("evening", "Evening", 18, 29),
]


def _hm_to_min(t: Optional[str]) -> int:
    if not t:
        return 0
    try:
        h, m = map(int, t.split(":"))
        return h * 60 + m
    except (ValueError, AttributeError):
        return 0


def _window_end_minutes(t: dict) -> int:
    """End of the task's scheduled window, in minutes from midnight of its
    own date, wrap-safe (end_time <= start_time means it crosses midnight)."""
    start = _hm_to_min(t.get("start_time"))
    end = _hm_to_min(t.get("end_time"))
    if end <= start:
        end += 24 * 60
    return end


def period_for_start_time(start_time: Optional[str]) -> str:
    m = _hm_to_min(start_time) % (24 * 60)
    if 5 * 60 <= m < 8 * 60:
        return "early_morning"
    if 8 * 60 <= m < 12 * 60:
        return "morning"
    if 12 * 60 <= m < 14 * 60:
        return "midday"
    if 14 * 60 <= m < 18 * 60:
        return "afternoon"
    return "evening"


def _parse_iso(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def _minutes_between(a: Optional[str], b: Optional[str]) -> Optional[float]:
    da, db = _parse_iso(a), _parse_iso(b)
    if da is None or db is None:
        return None
    return abs((db - da).total_seconds()) / 60.0


def start_delay_minutes(t: dict, tz_offset_minutes: int) -> Optional[float]:
    """Minutes between the scheduled start and the actual started_at, in the
    caller's local time. tz_offset_minutes follows JS Date.getTimezoneOffset()
    convention: local = UTC - tz_offset_minutes."""
    started = _parse_iso(t.get("started_at"))
    if started is None:
        return None
    local_started = started - timedelta(minutes=tz_offset_minutes)
    scheduled_minute = _hm_to_min(t.get("start_time"))
    actual_minute = local_started.hour * 60 + local_started.minute
    # Same-day wall-clock comparison is good enough for an average metric —
    # a task starting well past midnight relative to its own date is already
    # flagged by other statuses, so we don't try to disambiguate that here.
    return float(actual_minute - scheduled_minute)


def normalize_task(t: dict, client_today: str, now_minutes: Optional[int]) -> dict:
    """Augment a raw daily_task with a normalized status and the derived
    fields every metric below depends on. Never mutates the input."""
    date_str = t["date"]
    completed = bool(t.get("completed"))
    stopped = bool(t.get("stopped"))
    skipped = bool(t.get("skipped"))
    started_at = t.get("started_at")
    scheduled_minutes = t.get("duration") or 0

    if completed:
        status = "completed"
    elif stopped:
        status = "incomplete"
    elif skipped:
        status = "skipped"
    elif date_str < client_today:
        status = "missed"
    elif date_str > client_today:
        status = "scheduled_not_due"
    else:
        window_end = _window_end_minutes(t)
        if now_minutes is not None and now_minutes >= window_end:
            status = "missed"
        else:
            status = "in_progress" if started_at else "scheduled_not_due"

    is_legacy_completed = completed and not started_at

    def _clip(mins: float) -> float:
        mins = max(0.0, mins)
        return min(mins, scheduled_minutes) if scheduled_minutes else mins

    actual_minutes: Optional[float]
    lost_minutes: Optional[float]

    if status == "completed":
        if is_legacy_completed:
            actual_minutes = float(scheduled_minutes)
        else:
            m = _minutes_between(started_at, t.get("completed_at"))
            actual_minutes = _clip(m) if m is not None else float(scheduled_minutes)
        lost_minutes = 0.0
    elif status == "incomplete":
        m = _minutes_between(started_at, t.get("stopped_at"))
        actual_minutes = _clip(m) if m is not None else 0.0
        lost_minutes = max(0.0, scheduled_minutes - actual_minutes)
    elif status == "missed":
        actual_minutes = 0.0
        lost_minutes = float(scheduled_minutes)
    elif status == "skipped":
        actual_minutes = 0.0
        lost_minutes = float(scheduled_minutes)
    else:  # in_progress / scheduled_not_due — excluded from historical totals
        actual_minutes = None
        lost_minutes = None

    eligible = status in RESOLVED_STATUSES

    return {
        **t,
        "status": status,
        "actual_minutes": actual_minutes,
        "lost_minutes": lost_minutes,
        "is_legacy_completed": is_legacy_completed,
        "started": started_at is not None,
        "eligible": eligible,
        "tracked_start_eligible": eligible and not is_legacy_completed,
    }


def compute_metrics(tasks: list, tz_offset_minutes: int = 0) -> dict:
    """The one shared roll-up used for every bucket, every activity, and
    every time period. Callers pass a list of *normalized* tasks."""
    eligible = [t for t in tasks if t["eligible"]]
    completed = [t for t in eligible if t["status"] == "completed"]
    incomplete = [t for t in eligible if t["status"] == "incomplete"]
    skipped = [t for t in eligible if t["status"] == "skipped"]
    missed = [t for t in eligible if t["status"] == "missed"]

    tracked_eligible = [t for t in eligible if t["tracked_start_eligible"]]
    started = [t for t in tracked_eligible if t["started"]]
    completed_started = [t for t in started if t["status"] == "completed"]

    scheduled_minutes = sum(t.get("duration") or 0 for t in eligible)
    followed_minutes = sum(
        t["actual_minutes"] or 0 for t in eligible if t["status"] in ("completed", "incomplete")
    )
    lost_minutes = sum(t["lost_minutes"] or 0 for t in eligible)

    durations = [
        t["actual_minutes"] for t in eligible
        if t["status"] in ("completed", "incomplete") and t["actual_minutes"] is not None
    ]
    delays = [
        d for d in (start_delay_minutes(t, tz_offset_minutes) for t in started) if d is not None
    ]

    def pct(n: int, d: int) -> Optional[int]:
        return round((n / d) * 100) if d else None

    return {
        "scheduled_count": len(eligible),
        "completed_count": len(completed),
        "incomplete_count": len(incomplete),
        "skipped_count": len(skipped),
        "missed_count": len(missed),
        "started_count": len(started),
        "scheduled_minutes": round(scheduled_minutes),
        "followed_minutes": round(followed_minutes),
        "lost_minutes": round(lost_minutes),
        "completion_rate": pct(len(completed), len(eligible)),
        "start_rate": pct(len(started), len(tracked_eligible)),
        "completion_after_start": pct(len(completed_started), len(started)),
        "avg_scheduled_duration": round(statistics.mean([t.get("duration") or 0 for t in eligible])) if eligible else None,
        "median_actual_duration": round(statistics.median(durations)) if durations else None,
        "avg_start_delay": round(statistics.mean(delays)) if delays else None,
    }


def evidence_level(count: int, activity_specific: bool = True, legacy_heavy: bool = False) -> str:
    if count < 3:
        return "insufficient"
    if count < 5:
        return "tentative"
    if legacy_heavy or not activity_specific:
        return "moderate"
    return "strong"


# ---------------------------------------------------------------------------
# Follow-Through
# ---------------------------------------------------------------------------

def build_buckets(tasks: list, range_days: int, client_today: str) -> list:
    """Oldest-to-newest buckets covering the range. Daily for a 7-day range,
    weekly (7-day chunks walking back from today) otherwise. The oldest
    bucket may be shorter than 7 days if range_days isn't a multiple of 7."""
    end = date_cls.fromisoformat(client_today)
    range_start = end - timedelta(days=range_days - 1)

    if range_days <= 7:
        buckets = []
        for i in range(range_days):
            d = range_start + timedelta(days=i)
            d_str = d.isoformat()
            member = [t for t in tasks if t["date"] == d_str]
            buckets.append({
                "label": d.strftime("%a %d"),
                "start_date": d_str,
                "end_date": d_str,
                "tasks": member,
            })
        return buckets

    chunk_ends = []
    cursor = end
    while cursor >= range_start:
        chunk_ends.append(cursor)
        cursor -= timedelta(days=7)
    chunk_ends.reverse()

    buckets = []
    for w_end in chunk_ends:
        w_start = max(range_start, w_end - timedelta(days=6))
        w_start_str, w_end_str = w_start.isoformat(), w_end.isoformat()
        member = [t for t in tasks if w_start_str <= t["date"] <= w_end_str]
        buckets.append({
            "label": f"{w_start.strftime('%b %d')}–{w_end.strftime('%b %d')}",
            "start_date": w_start_str,
            "end_date": w_end_str,
            "tasks": member,
        })
    return buckets


def adherence_insight(buckets_with_metrics: list, summary: dict) -> dict:
    if summary["scheduled_count"] < 5:
        return {"key": "insufficient", "text": "Not enough data yet."}

    rated = [b for b in buckets_with_metrics if b["metrics"]["scheduled_count"] > 0]

    trend = None
    if len(rated) >= 3:
        rates = [b["metrics"]["completion_rate"] or 0 for b in rated[-3:]]
        if rates[0] > rates[1] > rates[2]:
            trend = "declining"
        elif rates[0] < rates[1] < rates[2]:
            trend = "improving"

    start_rate = summary["start_rate"]
    comp_after_start = summary["completion_after_start"]

    if start_rate is not None and start_rate < 60 and (comp_after_start is None or comp_after_start >= 70):
        return {"key": "initiation", "text": "Many activities are not being started."}
    if comp_after_start is not None and comp_after_start < 60 and (start_rate is None or start_rate >= 60):
        return {"key": "persistence", "text": "Many started activities end incomplete."}

    if len(rated) >= 3:
        by_load = sorted(rated, key=lambda b: b["metrics"]["scheduled_minutes"])
        half = len(by_load) // 2
        if half >= 1:
            lighter = [b["metrics"]["completion_rate"] or 0 for b in by_load[:half]]
            heavier = [b["metrics"]["completion_rate"] or 0 for b in by_load[half:]]
            if statistics.mean(lighter) - statistics.mean(heavier) >= 15:
                return {"key": "workload", "text": "Follow-through is lower on heavier schedule days."}

    if trend == "declining":
        return {"key": "declining", "text": "Follow-through is declining."}
    if trend == "improving":
        return {"key": "improving", "text": "Follow-through is improving."}

    return {"key": "stable", "text": "Plan adherence is stable."}


# ---------------------------------------------------------------------------
# Lost Time by Activity
# ---------------------------------------------------------------------------

def classify_activity(m: dict) -> str:
    if m["scheduled_count"] < 3:
        return "mixed"
    if m["lost_minutes"] == 0 and (m["completion_rate"] or 0) >= 80:
        return "stable"

    total = m["scheduled_count"] or 1
    missed_share = m["missed_count"] / total
    skipped_share = m["skipped_count"] / total
    start_rate = m["start_rate"]
    comp_after_start = m["completion_after_start"]

    if start_rate is not None and start_rate < 60 and missed_share >= 0.3:
        return "initiation"
    if comp_after_start is not None and comp_after_start < 60 and m["incomplete_count"] >= 2:
        return "persistence"
    if skipped_share >= 0.4:
        return "skip"
    if missed_share >= 0.4:
        return "missed"
    return "mixed"


def friction_insight(selected: Optional[dict], general_issue: bool, activities: list) -> str:
    if not activities:
        return "Not enough data yet."
    if general_issue:
        return "Lost time is spread across several activities rather than one specific task."
    if not selected:
        return "Your recurring activities are on track — no major execution gap found."

    name, cls = selected["name"], selected["classification"]
    if cls == "initiation":
        return f"{name} creates the largest execution gap because most sessions are never started."
    if cls == "persistence":
        return f"{name} is usually started, but many sessions end incomplete."
    if cls == "skip":
        return f"{name} is often skipped outright rather than attempted."
    if cls == "missed":
        return f"{name} is frequently left unresolved and never started."
    return f"{name} accounts for the most lost scheduled time."


def build_friction(tasks: list, tz_offset_minutes: int = 0) -> dict:
    by_slot: dict = {}
    for t in tasks:
        slot_id = t.get("slot_id")
        if not slot_id:
            continue
        by_slot.setdefault(slot_id, []).append(t)

    activities = []
    for slot_id, member in by_slot.items():
        m = compute_metrics(member, tz_offset_minutes)
        if m["scheduled_count"] == 0:
            continue
        latest = max(member, key=lambda t: t["date"])
        activities.append({
            "slot_id": slot_id,
            "name": latest.get("name") or "Untitled activity",
            **m,
            "classification": classify_activity(m),
        })

    activities.sort(key=lambda a: a["lost_minutes"], reverse=True)

    # Only activities with the minimum per-activity evidence (>=3 occurrences)
    # are eligible to be named as *the* problem — but they still stay in the
    # ranked `activities` list for display either way.
    candidates = [a for a in activities if a["scheduled_count"] >= 3]

    selected = None
    general_issue = False
    if candidates:
        top = candidates[0]
        if top["lost_minutes"] > 0:
            total_lost = sum(a["lost_minutes"] for a in activities) or 1
            share = top["lost_minutes"] / total_lost
            if share >= 0.35 or len(candidates) == 1:
                selected = top
            else:
                general_issue = True

    insight = "Not enough data yet." if not candidates else friction_insight(selected, general_issue, activities)

    return {
        "activities": activities,
        "selected": selected,
        "general_issue": general_issue,
        "insight": insight,
    }


# ---------------------------------------------------------------------------
# Time of Day Performance
# ---------------------------------------------------------------------------

def build_temporal(tasks: list, selected_activity: Optional[dict], general_issue: bool,
                    tz_offset_minutes: int = 0) -> dict:
    def bucket_by_period(items: list) -> dict:
        buckets = {key: [] for key, *_ in TIME_PERIODS}
        for t in items:
            buckets[period_for_start_time(t.get("start_time"))].append(t)
        return buckets

    overall_buckets = bucket_by_period(tasks)
    overall_periods = [
        {"key": key, "label": label, **compute_metrics(overall_buckets[key], tz_offset_minutes)}
        for key, label, *_ in TIME_PERIODS
    ]

    activity_periods = None
    mode = "not_applicable"

    if selected_activity and not general_issue:
        slot_id = selected_activity["slot_id"]
        act_tasks = [t for t in tasks if t.get("slot_id") == slot_id]
        act_buckets = bucket_by_period(act_tasks)
        populated = [
            (key, label) for key, label, *_ in TIME_PERIODS if len(act_buckets[key]) >= 3
        ]
        if len(populated) >= 2:
            activity_periods = [
                {"key": k, "label": l, **compute_metrics(act_buckets[k], tz_offset_minutes)}
                for k, l in populated
            ]
            mode = "activity_specific"
        else:
            mode = "overall_fallback"

    recommendation = _generate_recommendation(
        selected_activity, general_issue, activity_periods, overall_periods, mode
    )
    return {
        "overall_periods": overall_periods,
        "activity_periods": activity_periods,
        "mode": mode,
        "recommendation": recommendation,
    }


def _generate_recommendation(selected_activity, general_issue, activity_periods, overall_periods, mode) -> dict:
    if general_issue:
        return {
            "type": "reduce_schedule_load",
            "text": "Lost time is spread across several activities rather than one. Try moving one flexible activity away from your heaviest days.",
            "evidence": "moderate",
            "action": {"type": "edit_schedule", "slot_id": None, "label": "Review Routine"},
        }

    if not selected_activity:
        return {
            "type": "keep",
            "text": "Plan adherence looks healthy — no meaningful issue to address right now.",
            "evidence": "moderate",
            "action": None,
        }

    name = selected_activity["name"]
    slot_id = selected_activity["slot_id"]
    cls = selected_activity["classification"]

    if selected_activity["scheduled_count"] < 3:
        return {"type": "insufficient", "text": "Not enough data yet.", "evidence": "insufficient", "action": None}

    action = {"type": "edit_schedule", "slot_id": slot_id, "label": "Edit Schedule"}

    if mode == "activity_specific" and activity_periods:
        best = max(activity_periods, key=lambda p: p["completion_rate"] or 0)
        worst = min(activity_periods, key=lambda p: p["completion_rate"] or 0)
        if best["key"] != worst["key"] and (best["completion_rate"] or 0) - (worst["completion_rate"] or 0) >= 20:
            strong = best["scheduled_count"] >= 5 and worst["scheduled_count"] >= 5
            return {
                "type": "move",
                "text": f"{name} was completed more often in the {best['label']} than the {worst['label']}. "
                        f"Try moving it to the {best['label'].lower()} for two weeks.",
                "evidence": "strong" if strong else "moderate",
                "action": {**action, "label": "Move Activity"},
            }

    if cls == "persistence":
        median = selected_activity.get("median_actual_duration")
        scheduled_dur = selected_activity.get("avg_scheduled_duration")
        if median and scheduled_dur and median < scheduled_dur * 0.7:
            if scheduled_dur >= 60:
                return {
                    "type": "split",
                    "text": f"Sessions of {name} are often incomplete. Try splitting this {scheduled_dur}-minute "
                            f"activity into two shorter sessions.",
                    "evidence": "moderate",
                    "action": {**action, "label": "Edit Schedule"},
                }
            return {
                "type": "shorten",
                "text": f"Try reducing {name} from {scheduled_dur} minutes to about {median} minutes.",
                "evidence": "moderate",
                "action": {**action, "label": "Shorten Activity"},
            }

    if cls == "skip":
        return {
            "type": "reduce_frequency",
            "text": f"{name} is often skipped outright. Try scheduling it fewer days per week so each "
                    f"occurrence is easier to commit to.",
            "evidence": "moderate",
            "action": {**action, "label": "Change Days"},
        }

    if mode == "overall_fallback":
        best_overall = max(overall_periods, key=lambda p: p["completion_rate"] or 0)
        return {
            "type": "move",
            "text": f"{name} has only been scheduled in one time period so far. Overall, your "
                    f"{best_overall['label'].lower()} completion rate is stronger, so moving it may be worth testing.",
            "evidence": "tentative",
            "action": {**action, "label": "Move Activity"},
        }

    return {
        "type": "keep",
        "text": f"No single clear fix stands out for {name} yet — worth keeping an eye on.",
        "evidence": "tentative",
        "action": {**action, "label": "Review Routine"},
    }
