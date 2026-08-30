"""Shared analytics for the History "Trends" tab.

Architecture (per the "Recommendations & Diagnostics" spec): each of the
three graphs — Follow-Through, Lost Time by Activity, Time of Day
Performance — runs its own independent diagnostic engine and returns
exactly one diagnostic from a small, fixed, enumerated set. A separate,
final combination engine takes those three diagnostics and produces the
single "what to try next" recommendation. No graph prescribes anything
outside its own domain: Follow-Through never names an activity, Lost Time
by Activity never talks about time of day, and Time of Day never
recommends duration/frequency/workload/removal changes — those all live
only in the final combined recommendation.

Callers must pass raw daily_tasks documents — never run them through the
schedule-slot re-join used by the Today/History task-list endpoints first.
That re-join overwrites name/start_time/end_time/duration with whatever the
slot looks like *today*, which would silently rewrite history for these
trends. Every daily_task already snapshots its own fields at creation, so
reading the raw collection is both simpler and correct.

The one deliberate exception is Time of Day Performance, which is allowed a
narrow look at the *current* schedule_slots definition — not to rewrite any
historical record, but to answer "what time is this activity scheduled at
right now" so it can compare current-vs-alternative performance.
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
    started = _parse_iso(t.get("started_at"))
    if started is None:
        return None
    local_started = started - timedelta(minutes=tz_offset_minutes)
    scheduled_minute = _hm_to_min(t.get("start_time"))
    actual_minute = local_started.hour * 60 + local_started.minute
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
    """The one shared roll-up used for every window, bucket, activity, and
    time period. Callers pass a list of *normalized* tasks."""
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
    missed_lost_minutes = sum(t["lost_minutes"] or 0 for t in missed)
    skipped_lost_minutes = sum(t["lost_minutes"] or 0 for t in skipped)
    incomplete_lost_minutes = sum(t["lost_minutes"] or 0 for t in incomplete)

    durations = [
        t["actual_minutes"] for t in eligible
        if t["status"] in ("completed", "incomplete") and t["actual_minutes"] is not None
    ]
    delays = [d for d in (start_delay_minutes(t, tz_offset_minutes) for t in started) if d is not None]
    distinct_dates = len({t["date"] for t in eligible})

    def pct(n: int, d: int) -> Optional[int]:
        return round((n / d) * 100) if d else None

    follow_through_rate = round((followed_minutes / scheduled_minutes) * 100) if scheduled_minutes > 0 else None

    return {
        "scheduled_count": len(eligible),
        "completed_count": len(completed),
        "incomplete_count": len(incomplete),
        "skipped_count": len(skipped),
        "missed_count": len(missed),
        "started_count": len(started),
        "tracked_eligible_count": len(tracked_eligible),
        "distinct_dates": distinct_dates,
        "scheduled_minutes": round(scheduled_minutes),
        "followed_minutes": round(followed_minutes),
        "lost_minutes": round(lost_minutes),
        "missed_lost_minutes": round(missed_lost_minutes),
        "skipped_lost_minutes": round(skipped_lost_minutes),
        "incomplete_lost_minutes": round(incomplete_lost_minutes),
        "follow_through_rate": follow_through_rate,
        "completion_rate": pct(len(completed), len(eligible)),
        "start_rate": pct(len(started), len(tracked_eligible)),
        "completion_after_start": pct(len(completed_started), len(started)),
        "miss_rate": pct(len(missed), len(eligible)),
        "skip_rate": pct(len(skipped), len(eligible)),
        "incomplete_rate": pct(len(incomplete), len(started)),
        "avg_scheduled_duration": round(statistics.mean([t.get("duration") or 0 for t in eligible])) if eligible else None,
        "median_actual_duration": round(statistics.median(durations)) if durations else None,
        "avg_start_delay": round(statistics.mean(delays)) if delays else None,
    }


def _diag(key: str, text: str, **metrics) -> dict:
    return {"key": key, "text": text, "metrics": metrics}


def _distinct_week_count(dates: list) -> int:
    weeks = set()
    for d in dates:
        iso = date_cls.fromisoformat(d).isocalendar()
        weeks.add((iso[0], iso[1]))
    return len(weeks)


def _recent_improvement(member: list) -> bool:
    ordered = sorted(member, key=lambda t: t["date"])
    if len(ordered) < 6:
        return False
    mid = len(ordered) // 2
    first_rate = compute_metrics(ordered[:mid])["completion_rate"] or 0
    second_rate = compute_metrics(ordered[mid:])["completion_rate"] or 0
    return second_rate - first_rate >= 15


# ---------------------------------------------------------------------------
# Chart display buckets — purely visual, independent of diagnostic windows
# ---------------------------------------------------------------------------

def build_display_buckets(tasks: list, range_days: int, client_today: str) -> list:
    """7 days -> 7 daily bars. 30 days -> 30 daily bars. 90 days -> 13
    weekly bars labeled by ISO week number. Chart aggregation only — the
    diagnostics below use their own separate windowing, never these
    buckets, for anything but the (explicitly bucket-based) 'improving'
    check."""
    end = date_cls.fromisoformat(client_today)
    range_start = end - timedelta(days=range_days - 1)
    span_days = 7 if range_days == 90 else 1

    buckets = []
    cursor = range_start
    while cursor <= end:
        b_end = min(end, cursor + timedelta(days=span_days - 1))
        d_str, e_str = cursor.isoformat(), b_end.isoformat()
        member = [t for t in tasks if d_str <= t["date"] <= e_str]
        if span_days == 1:
            label = cursor.strftime("%a %d")
        else:
            label = f"W{cursor.isocalendar()[1]}"
        buckets.append({"label": label, "start_date": d_str, "end_date": e_str, "tasks": member})
        cursor = b_end + timedelta(days=1)
    return buckets


def compute_heavy_day_pattern(tasks: list) -> Optional[dict]:
    """Always compares actual calendar days, independent of chart bucket
    granularity. Returns None when there isn't enough day-level evidence."""
    by_date: dict = {}
    for t in tasks:
        if not t["eligible"]:
            continue
        by_date.setdefault(t["date"], []).append(t)

    days = []
    for d, day_tasks in by_date.items():
        m = compute_metrics(day_tasks)
        if m["scheduled_count"] == 0:
            continue
        days.append({"date": d, **m})

    if len(days) < 6:
        return None

    days_sorted = sorted(days, key=lambda d: d["scheduled_minutes"])
    third = len(days_sorted) // 3
    if third < 2:
        return None
    light, heavy = days_sorted[:third], days_sorted[-third:]

    light_median = statistics.median([d["scheduled_minutes"] for d in light])
    heavy_median = statistics.median([d["scheduled_minutes"] for d in heavy])
    if light_median <= 0 or heavy_median < light_median * 1.3:
        return None

    light_rates = [d["follow_through_rate"] for d in light if d["follow_through_rate"] is not None]
    heavy_rates = [d["follow_through_rate"] for d in heavy if d["follow_through_rate"] is not None]
    if not light_rates or not heavy_rates:
        return None
    light_avg, heavy_avg = statistics.mean(light_rates), statistics.mean(heavy_rates)
    if light_avg - heavy_avg < 15:
        return None

    total_lost = sum(d["lost_minutes"] for d in days) or 1
    heavy_lost_share = sum(d["lost_minutes"] for d in heavy) / total_lost * 100
    if heavy_lost_share < 35:
        return None

    return {
        "heavy_rate": round(heavy_avg),
        "light_rate": round(light_avg),
        "heavy_lost_share": round(heavy_lost_share),
        "heavy_dates": {d["date"] for d in heavy},
        "light_dates": {d["date"] for d in light},
    }


# ---------------------------------------------------------------------------
# 1. Follow-Through diagnostics
# ---------------------------------------------------------------------------

def _diagnostic_windows(tasks: list, range_days: int, client_today: str):
    """Earlier-vs-later comparison windows for the 'declining' check only —
    deliberately separate from the display buckets. Returns
    (earlier_tasks, later_tasks, earlier_label, later_label) or
    (None, None, None, None) if the range can't support a clean split."""
    end = date_cls.fromisoformat(client_today)
    range_start = end - timedelta(days=range_days - 1)

    if range_days == 7:
        active_dates = sorted({t["date"] for t in tasks if t["eligible"]})
        if len(active_dates) < 7:
            return None, None, None, None
        earlier_dates, later_dates = set(active_dates[:3]), set(active_dates[-4:])
        earlier = [t for t in tasks if t["date"] in earlier_dates]
        later = [t for t in tasks if t["date"] in later_dates]
        return earlier, later, "first 3 active days", "last 4 active days"

    if range_days == 30:
        mid = range_start + timedelta(days=14)
        earlier = [t for t in tasks if range_start.isoformat() <= t["date"] <= mid.isoformat()]
        later_start = mid + timedelta(days=1)
        later = [t for t in tasks if later_start.isoformat() <= t["date"] <= end.isoformat()]
        return earlier, later, "first 15 days", "last 15 days"

    # 90 days: 6 complete weeks (earlier) vs 7 complete weeks (later), walking
    # backward from today in 7-day chunks so every chunk is a full week.
    chunk_ends = []
    cursor = end
    while cursor - timedelta(days=6) >= range_start:
        chunk_ends.append(cursor)
        cursor -= timedelta(days=7)
    chunk_ends.reverse()  # oldest complete week first
    if len(chunk_ends) < 13:
        return None, None, None, None
    earlier_chunks, later_chunks = chunk_ends[:6], chunk_ends[-7:]

    def chunk_tasks(chunk_end):
        chunk_start = chunk_end - timedelta(days=6)
        return [t for t in tasks if chunk_start.isoformat() <= t["date"] <= chunk_end.isoformat()]

    earlier = [t for ce in earlier_chunks for t in chunk_tasks(ce)]
    later = [t for ce in later_chunks for t in chunk_tasks(ce)]
    return earlier, later, "earliest 6 complete weeks", "latest 7 complete weeks"


def _window_evidence_ok(m: dict) -> bool:
    return m["scheduled_count"] >= 3 and m["distinct_dates"] >= 2


def follow_through_diagnosis(tasks: list, range_days: int, client_today: str,
                              display_buckets: list, heavy_pattern: Optional[dict]) -> dict:
    summary = compute_metrics(tasks)
    range_label = f"the last {range_days} days"

    if summary["scheduled_count"] < 5 or summary["distinct_dates"] < 3 or summary["scheduled_minutes"] == 0:
        return _diag("more_history", "Complete a few more scheduled activities to reveal a reliable follow-through pattern.",
                     sample=summary["scheduled_count"])

    # 2. Declining consistency — new earlier/later windowed comparison,
    # pooled (sum-based) rate, not an average of daily/weekly percentages.
    earlier, later, _, _ = _diagnostic_windows(tasks, range_days, client_today)
    if earlier is not None:
        earlier_m, later_m = compute_metrics(earlier), compute_metrics(later)
        if _window_evidence_ok(earlier_m) and _window_evidence_ok(later_m):
            er, lr = earlier_m["follow_through_rate"], later_m["follow_through_rate"]
            if er is not None and lr is not None and er - lr >= 15:
                text = f"Your Follow-Through Rate fell from {er}% to {lr}% over {range_label}."
                return _diag("declining", text, earlier_rate=er, later_rate=lr, range_days=range_days)

    # 3. Heavy-day overload — always individual calendar days.
    if heavy_pattern:
        return _diag("heavy_day_overload", "Your follow-through is lower on days with more scheduled time.",
                     heavy_rate=heavy_pattern["heavy_rate"], light_rate=heavy_pattern["light_rate"])

    start_rate, comp_after_start = summary["start_rate"], summary["completion_after_start"]
    never_started_share = (summary["missed_lost_minutes"] / summary["lost_minutes"] * 100) if summary["lost_minutes"] else 0
    incomplete_share = (summary["incomplete_lost_minutes"] / summary["lost_minutes"] * 100) if summary["lost_minutes"] else 0

    # 4. Difficulty getting started
    if (start_rate is not None and start_rate < 60 and comp_after_start is not None
            and comp_after_start >= 70 and never_started_share >= 50):
        return _diag("difficulty_starting", "Many activities are not started, but the activities you begin are usually completed.",
                     start_rate=start_rate, completion_after_start=comp_after_start)

    # 5. Difficulty finishing
    if (start_rate is not None and start_rate >= 60 and comp_after_start is not None
            and comp_after_start < 60 and incomplete_share >= 40):
        return _diag("difficulty_finishing", "You start most scheduled activities, but many sessions end before completion.",
                     start_rate=start_rate, completion_after_start=comp_after_start)

    # 6. Improving consistency — deliberately still uses the *display*
    # chart buckets and the old last-3-periods check (per spec), unlike
    # 'declining' above which uses the new windowed comparison.
    populated = [b for b in display_buckets if b["metrics"]["scheduled_count"] > 0]
    if len(populated) >= 3:
        last3 = populated[-3:]
        rates = [b["metrics"]["follow_through_rate"] or 0 for b in last3]
        r1, r2, r3 = rates
        if r2 - r1 >= 5 and r3 - r2 >= 5 and r3 - r1 >= 15:
            return _diag("improving", "Your follow-through has improved across the last three periods.",
                         earlier_rate=r1, later_rate=r3)

    # 7. Strong follow-through
    ft = summary["follow_through_rate"] or 0
    if ft >= 80 and (summary["miss_rate"] or 0) < 15 and (summary["skip_rate"] or 0) < 20:
        return _diag("strong", "You are following through consistently, and no overall schedule problem stands out.",
                     follow_through_rate=ft)

    # 8. No clear overall pattern
    return _diag("no_clear_pattern", "No single overall pattern clearly explains your unfinished scheduled time.",
                 follow_through_rate=ft)


# ---------------------------------------------------------------------------
# 2. Lost Time by Activity diagnostics
# ---------------------------------------------------------------------------

def lost_time_diagnosis(tasks: list, tz_offset_minutes: int = 0) -> dict:
    by_slot: dict = {}
    for t in tasks:
        slot_id = t.get("slot_id")
        if not slot_id:
            continue
        by_slot.setdefault(slot_id, []).append(t)

    activities = []
    total_lost_all = 0.0
    for slot_id, member in by_slot.items():
        m = compute_metrics(member, tz_offset_minutes)
        if m["scheduled_count"] == 0:
            continue
        latest = max(member, key=lambda t: t["date"])
        activities.append({
            "slot_id": slot_id, "name": latest.get("name") or "Untitled activity",
            "dates": sorted({t["date"] for t in member}), **m,
        })
        total_lost_all += m["lost_minutes"]
    for a in activities:
        a["lost_share"] = round((a["lost_minutes"] / total_lost_all) * 100) if total_lost_all else 0
    activities.sort(key=lambda a: a["lost_minutes"], reverse=True)

    candidates = [a for a in activities if a["scheduled_count"] >= 3]

    if not candidates:
        diag = _diag("more_activity_history", "Repeat your activities a few more times before comparing their lost time.")
        return {"diagnostic": diag, "activities": activities, "selected": None}

    overall_ft = compute_metrics(tasks, tz_offset_minutes)["follow_through_rate"] or 0
    if total_lost_all == 0 or (overall_ft >= 90 and total_lost_all < 30):
        diag = _diag("no_meaningful_lost_time", "Your activities are creating very little unfinished scheduled time.")
        return {"diagnostic": diag, "activities": activities, "selected": None}

    top = candidates[0]
    second = candidates[1] if len(candidates) > 1 else None
    dominant = (
        top["lost_minutes"] >= 30 and top["lost_share"] >= 35
        and (second is None or top["lost_minutes"] >= second["lost_minutes"] * 1.25)
    )

    if not dominant:
        lost_activities = [a for a in candidates if a["lost_minutes"] > 0]
        if len(candidates) >= 3 and len(lost_activities) >= 2:
            diag = _diag("no_single_activity_dominates",
                          "Your unfinished time is distributed across several activities rather than one clear problem area.")
            return {"diagnostic": diag, "activities": activities, "selected": None}
        # Only one (or two, tied) analyzable activities — still name the top
        # one and diagnose it below rather than claiming a "spread" pattern
        # with nothing to point to.

    a = top
    member = by_slot[a["slot_id"]]
    lost = a["lost_minutes"] or 1
    missed_share = (a["missed_lost_minutes"] / lost) * 100
    skipped_share = (a["skipped_lost_minutes"] / lost) * 100
    incomplete_share = (a["incomplete_lost_minutes"] / lost) * 100
    start_rate, comp_after_start = a["start_rate"], a["completion_after_start"]

    def act_diag(key, text, **kw):
        return _diag(key, text, activity=a["name"], slot_id=a["slot_id"],
                     lost_minutes=a["lost_minutes"], lost_share=a["lost_share"], **kw)

    # 4. Frequently skipped — checked before "difficult to start" so an
    # intentional skip isn't described as a failure to start.
    if a["scheduled_count"] >= 4 and (a["skip_rate"] or 0) >= 40 and skipped_share >= 50:
        diag = act_diag("frequently_skipped", f"{a['name']} creates the largest gap because it is frequently skipped.",
                        skip_rate=a["skip_rate"])
        return {"diagnostic": diag, "activities": activities, "selected": a}

    # 5. Difficult to start
    if start_rate is not None and start_rate < 50 and comp_after_start is not None and comp_after_start >= 70 and missed_share >= 50:
        diag = act_diag("difficult_to_start",
                        f"{a['name']} creates the largest gap because many sessions are never started, "
                        f"although sessions are usually completed once begun.",
                        start_rate=start_rate, completion_after_start=comp_after_start)
        return {"diagnostic": diag, "activities": activities, "selected": a}

    scheduled_dur = a.get("avg_scheduled_duration") or 0
    median_actual = a.get("median_actual_duration")
    completed_portion = (median_actual / scheduled_dur) if (median_actual and scheduled_dur) else None
    finishing_pattern = (start_rate is not None and start_rate >= 60 and comp_after_start is not None
                         and comp_after_start < 60 and incomplete_share >= 40)

    # 6. Should be split
    if (finishing_pattern and scheduled_dur >= 90 and completed_portion is not None
            and 0.35 <= completed_portion <= 0.70):
        diag = act_diag("split", f"{a['name']} is usually started, but the scheduled block appears too long to finish consistently.",
                        scheduled_duration=scheduled_dur, median_actual_duration=median_actual)
        return {"diagnostic": diag, "activities": activities, "selected": a}

    # 7. Should be shortened
    if (finishing_pattern and scheduled_dur < 90 and median_actual is not None
            and (scheduled_dur - median_actual) >= 20):
        diag = act_diag("shorten", f"{a['name']} is usually started, but its sessions often finish earlier than scheduled.",
                        scheduled_duration=scheduled_dur, median_actual_duration=median_actual)
        return {"diagnostic": diag, "activities": activities, "selected": a}

    # 8. May not fit the routine
    if (a["scheduled_count"] >= 6 and _distinct_week_count(a["dates"]) >= 3
            and (a["completion_rate"] or 0) < 25
            and ((start_rate is not None and start_rate < 40) or (a["skip_rate"] or 0) >= 50)
            and a["lost_share"] >= 35 and not _recent_improvement(member)):
        diag = act_diag("may_not_fit_routine", f"{a['name']} repeatedly receives scheduled time but is rarely followed through on.")
        return {"diagnostic": diag, "activities": activities, "selected": a}

    # 10. Working well (checked before the mixed catch-all)
    if a["scheduled_count"] >= 5 and (a["follow_through_rate"] or 0) >= 80 and a["lost_share"] < 25 and a["lost_minutes"] < 30:
        diag = act_diag("activity_working_well", f"{a['name']} is being followed through on consistently and does not need adjustment.")
        return {"diagnostic": diag, "activities": activities, "selected": a}

    # 9. Mixed
    diag = act_diag("mixed_activity_problem",
                    f"{a['name']} accounts for the most lost time, but the gap is divided between missed, skipped and incomplete sessions.")
    return {"diagnostic": diag, "activities": activities, "selected": a}


# ---------------------------------------------------------------------------
# 3. Time of Day Performance diagnostics — timing only, nothing else
# ---------------------------------------------------------------------------

def _period_breakdown(tasks: list, slot_id: str, tz_offset_minutes: int) -> dict:
    buckets = {key: [] for key, *_ in TIME_PERIODS}
    for t in tasks:
        if t.get("slot_id") == slot_id and t["eligible"]:
            buckets[period_for_start_time(t.get("start_time"))].append(t)
    return {key: compute_metrics(buckets[key], tz_offset_minutes) for key, *_ in TIME_PERIODS}


def _resolve_current_period(per_period: dict, current_slot_start_time: Optional[str]) -> tuple:
    if current_slot_start_time:
        return period_for_start_time(current_slot_start_time), "live_slot"
    best_key, best_count = None, -1
    for key, *_ in TIME_PERIODS:
        c = per_period[key]["scheduled_count"]
        if c > best_count:
            best_key, best_count = key, c
    return best_key, "historical_frequency"


def time_of_day_diagnosis(tasks: list, selected_activity: Optional[dict],
                           current_slot_start_time: Optional[str], tz_offset_minutes: int = 0) -> dict:
    label_by_key = {key: label for key, label, *_ in TIME_PERIODS}

    if not selected_activity:
        diag = _diag("no_activity_available", "There is no single activity available for a focused time-of-day comparison.")
        overall_buckets = {key: [] for key, *_ in TIME_PERIODS}
        for t in tasks:
            if t["eligible"]:
                overall_buckets[period_for_start_time(t.get("start_time"))].append(t)
        overall_periods = [
            {"key": k, "label": label_by_key[k], **compute_metrics(overall_buckets[k], tz_offset_minutes)}
            for k, *_ in TIME_PERIODS
        ]
        return {"diagnostic": diag, "periods": overall_periods, "current_period": None}

    name = selected_activity["name"]
    per_period = _period_breakdown(tasks, selected_activity["slot_id"], tz_offset_minutes)
    current_key, method = _resolve_current_period(per_period, current_slot_start_time)
    periods_payload = [{"key": k, "label": label_by_key[k], **per_period[k]} for k, *_ in TIME_PERIODS]
    current = per_period[current_key]
    alternatives = [(k, per_period[k]) for k, *_ in TIME_PERIODS if k != current_key]
    qualifying_alts = [(k, m) for k, m in alternatives if m["scheduled_count"] >= 3]

    def result(key, text, **kw):
        return {"diagnostic": _diag(key, text, activity=name, **kw), "periods": periods_payload,
                "current_period": current_key, "current_period_method": method}

    # 2. More time data needed — but first check the single-period fallback
    # (6. Another time may be worth testing) when this activity has *never*
    # been scheduled in any other period at all.
    if current["scheduled_count"] < 3 or not qualifying_alts:
        no_alt_history_at_all = all(m["scheduled_count"] == 0 for _, m in alternatives)
        if current["scheduled_count"] >= 5 and no_alt_history_at_all:
            fallback = time_of_day_overall_fallback(tasks, selected_activity, current_key, tz_offset_minutes)
            if fallback:
                return {"diagnostic": fallback, "periods": periods_payload,
                        "current_period": current_key, "current_period_method": method}
        text = f"Complete {name} a few more times at different times before changing its schedule."
        return result("more_time_data_needed", text, sample=current["scheduled_count"])

    def sort_key(item):
        k, m = item
        return (m["follow_through_rate"] or -1, m["completion_rate"] or -1, m["start_rate"] or -1, m["scheduled_count"])
    best_key, best_m = max(qualifying_alts, key=sort_key)
    cur_rate, best_rate = current["follow_through_rate"] or 0, best_m["follow_through_rate"] or 0
    diff = best_rate - cur_rate
    date_guard = current["distinct_dates"] >= 2 and best_m["distinct_dates"] >= 2
    start_guard = (best_m["start_rate"] or 0) >= (current["start_rate"] or 0) - 10

    # 3. Better at another time
    if diff >= 15 and date_guard and start_guard:
        text = f"{name} performs better in the {label_by_key[best_key]} than in the {label_by_key[current_key]}."
        return result("better_at_another_time", text, current_rate=cur_rate, better_rate=best_rate,
                      current_time=label_by_key[current_key], better_time=label_by_key[best_key])

    # 4. Current time performs best
    top_periods = sorted(qualifying_alts + [(current_key, current)], key=sort_key, reverse=True)
    top_key, top_m = top_periods[0]
    is_current_best = (top_key == current_key) or ((top_m["follow_through_rate"] or 0) - cur_rate <= 5 and current["scheduled_count"] > top_m["scheduled_count"])
    if is_current_best and diff < 10:
        text = f"{name} currently performs best at its scheduled time."
        return result("current_time_best", text, current_rate=cur_rate, current_time=label_by_key[current_key])

    # 5. No meaningful time difference
    if diff < 10:
        text = f"Time of day does not appear to meaningfully affect {name}."
        return result("no_meaningful_time_difference", text, current_rate=cur_rate, best_rate=best_rate)

    # Meaningful-looking gap that didn't clear the strict "better at another
    # time" guards (date spread / start-rate) — treated as insufficient
    # rather than overclaiming.
    text = f"Complete {name} a few more times at different times before changing its schedule."
    return result("more_time_data_needed", text, sample=current["scheduled_count"])


def time_of_day_overall_fallback(tasks: list, selected_activity: dict,
                                  current_key: str, tz_offset_minutes: int = 0) -> Optional[dict]:
    """6. Another time may be worth testing — only reachable when the
    activity has no direct alternative-period history at all."""
    label_by_key = {key: label for key, label, *_ in TIME_PERIODS}
    other_overall = [
        (k, compute_metrics([t for t in tasks if t["eligible"] and period_for_start_time(t.get("start_time")) == k], tz_offset_minutes))
        for k, *_ in TIME_PERIODS if k != current_key
    ]
    overall_current = compute_metrics(
        [t for t in tasks if t["eligible"] and period_for_start_time(t.get("start_time")) == current_key], tz_offset_minutes
    )
    cur_rate = overall_current["follow_through_rate"] or 0
    best = None
    for k, m in other_overall:
        if m["scheduled_count"] >= 8 and m["distinct_dates"] >= 3 and (m["follow_through_rate"] or 0) - cur_rate >= 20:
            if best is None or (m["follow_through_rate"] or 0) > (best[1]["follow_through_rate"] or 0):
                best = (k, m)
    if not best:
        return None
    text = (f"The {label_by_key[best[0]]} may be worth testing, although this is not yet an activity-specific result.")
    return _diag("another_time_may_be_worth_testing", text, activity=selected_activity["name"],
                 better_time=label_by_key[best[0]], better_rate=best[1]["follow_through_rate"])


# ---------------------------------------------------------------------------
# 4. Final combined recommendation engine
#
# Takes the three independent diagnostics and answers one question: what is
# the single most useful change to test next? Built as a priority system +
# parameterized templates (per spec), not one hardcoded sentence per
# mathematical combination. Section letters in comments below refer to the
# "Complete combination rules" sections A-H of the source spec.
# ---------------------------------------------------------------------------

def _core_action(lta_key: str, lta_diag: dict, tod_key: str, tod_diag: dict, activity: Optional[str]) -> Optional[dict]:
    """The activity-level action Lost Time by Activity + Time of Day would
    recommend on their own, before Follow-Through's overall context is
    applied. Returns None when there's nothing activity-specific to act on."""
    better_time = tod_diag.get("metrics", {}).get("better_time")
    tod_has_move = tod_key == "better_at_another_time" and better_time
    tod_hint = None
    if tod_key == "better_at_another_time":
        tod_hint = f" Test moving it to the {better_time.lower()} at the same time as this change." if better_time else None

    if lta_key == "frequently_skipped":
        exp = f"Schedule {activity} fewer days per week for the next two weeks."
        return {"rank": 5, "kind": "reduce_frequency", "title": f"Reduce how often {activity} is scheduled",
                "experiment": exp, "success": "A lower Skip Rate without lowering completion when it is scheduled.",
                "action_label": "Change Days"}

    if lta_key == "difficult_to_start":
        if tod_has_move:
            exp = f"Move {activity} to the {better_time.lower()} and prepare one small first step before its scheduled start."
        else:
            exp = f"Keep {activity} at its current time, but make its first step smaller and easier to begin."
        return {"rank": 6, "kind": "fix_starting", "title": f"Make {activity} easier to start",
                "experiment": exp, "success": "A higher Start Rate for this activity.",
                "action_label": "Edit Schedule"}

    if lta_key == "split":
        if tod_has_move:
            exp = f"Split {activity} into smaller sessions first. Keep the current time during the test so only one variable changes."
        else:
            exp = f"Replace the long block with two shorter sessions for {activity}."
        return {"rank": 7, "kind": "split", "title": f"Split {activity} into smaller sessions",
                "experiment": exp, "success": "A higher Completion After Start rate for this activity.",
                "action_label": "Edit Schedule"}

    if lta_key == "shorten":
        median = lta_diag.get("metrics", {}).get("median_actual_duration")
        scheduled = lta_diag.get("metrics", {}).get("scheduled_duration")
        if median and scheduled:
            exp = f"Schedule {activity} for about {median} minutes for the next two weeks."
        else:
            exp = f"Reduce the scheduled duration of {activity} toward its typical completed length."
        return {"rank": 8, "kind": "shorten", "title": f"Shorten {activity}",
                "experiment": exp, "success": "A higher Completion After Start rate without reducing how often it is started.",
                "action_label": "Shorten Activity"}

    if lta_key == "may_not_fit_routine":
        exp = f"Remove or redefine {activity} — or move it somewhere it can realistically fit — for the next two weeks."
        return {"rank": 4, "kind": "review_remove", "title": f"Review whether {activity} still belongs in your routine",
                "experiment": exp, "success": "Either the activity starts being completed, or it's removed and stops costing scheduled time.",
                "action_label": "Review Routine"}

    if lta_key == "mixed_activity_problem":
        if tod_has_move:
            exp = f"Test {activity} at the {better_time.lower()} for two weeks, since no single duration or frequency issue stands out yet."
            return {"rank": 9, "kind": "move_time", "title": f"Test {activity} at the {better_time.lower()}",
                    "experiment": exp, "success": "A higher Follow-Through Rate for this activity.",
                    "action_label": "Move Activity"}
        exp = f"Review {activity}'s duration, frequency and purpose — no single cause dominates its lost time yet."
        return {"rank": 9, "kind": "review_mixed", "title": f"Review {activity}",
                "experiment": exp, "success": "A clearer single pattern in its lost time, or a lower lost-time share overall.",
                "action_label": "Review Routine"}

    if lta_key == "activity_working_well":
        if tod_has_move:
            exp = f"Moving {activity} to the {better_time.lower()} may offer a small additional improvement."
            return {"rank": 9, "kind": "move_time", "title": f"Test moving {activity}",
                    "experiment": exp, "success": "A higher Follow-Through Rate for this activity.",
                    "action_label": "Move Activity"}
        return {"rank": 10, "kind": "keep", "title": "Keep the current setup",
                "experiment": f"Keep {activity} and its current time unchanged.",
                "success": "Continued consistency for this activity.", "action_label": None}

    return None


def combine_diagnostics(ft: dict, lta: dict, tod: dict, range_days: int) -> dict:
    ft_key = ft["key"]
    lta_diag, selected, activities = lta["diagnostic"], lta["selected"], lta["activities"]
    lta_key = lta_diag["key"]
    tod_diag = tod["diagnostic"]
    tod_key = tod_diag["key"]
    activity = selected["name"] if selected else None

    def action_for(kind_label: str) -> Optional[dict]:
        if kind_label is None:
            return None
        if selected:
            return {"type": "edit_schedule", "slot_id": selected["slot_id"], "label": kind_label}
        return {"type": "info", "slot_id": None, "label": "Review Routine"}

    def rec(title, reason, experiment, success, action_label=None):
        return {"title": title, "reason": reason, "experiment": experiment,
                "success_measure": success, "action": action_for(action_label)}

    # --- A. Insufficient data (priority 1) ---
    if ft_key == "more_history":
        return rec("Collect more data",
                    "There isn't enough scheduled-activity history yet to identify a reliable pattern.",
                    "Keep your current schedule for now and complete a few more activities before making changes.",
                    "At least 5 eligible scheduled activities across 3 separate days.")
    if lta_key == "more_activity_history":
        return rec("Keep tracking",
                    "The same activities haven't repeated enough times yet for a fair comparison.",
                    "Continue using the schedule until the same activities have been repeated enough for a fair comparison.",
                    "At least 3 occurrences for your most-scheduled activities.")
    core = _core_action(lta_key, lta_diag, tod_key, tod_diag, activity)

    # --- B. Healthy overall (no override — Follow-Through is strong/improving and nothing is wrong) ---
    if ft_key == "strong" and lta_key == "no_meaningful_lost_time":
        return rec("Keep the current schedule",
                    "Your plan is working well overall, with very little unfinished scheduled time.",
                    "Keep the current schedule. Your plan is working well.",
                    "Follow-Through Rate holding at its current level.")
    if ft_key == "improving" and lta_key == "no_meaningful_lost_time":
        return rec("Continue the current approach",
                    "Your Follow-Through Rate is improving and there's very little unfinished scheduled time.",
                    "Continue the current approach. Your results are improving.",
                    "Follow-Through Rate continuing to rise or hold steady.")
    if ft_key in ("strong", "improving") and lta_key == "no_single_activity_dominates" and not core:
        return rec("Keep the current setup",
                    "Your overall follow-through looks healthy and no single activity stands out as a problem.",
                    "Keep the current setup and continue monitoring.",
                    "Follow-Through Rate staying steady or improving.")
    if ft_key == "strong" and lta_key == "activity_working_well" and not (tod_key == "better_at_another_time"):
        return rec("Keep the current setup",
                    f"{activity} is being followed through on consistently at its current time, and your overall schedule is healthy.",
                    f"Keep the current activity and its current time unchanged.",
                    "Continued consistency for this activity.")

    # --- E. Heavy-day overload (priority 3) — overrides duration/frequency
    # actions (they can be revisited once workload is addressed), but not
    # skip-reduction or review/remove, which just get heavy-day framing. ---
    if ft_key == "heavy_day_overload":
        heavy_rate = ft["metrics"].get("heavy_rate")
        light_rate = ft["metrics"].get("light_rate")
        base_reason = (f"Your average Follow-Through Rate is {heavy_rate}% on your busiest days, "
                        f"compared with {light_rate}% on lighter days." if heavy_rate is not None else
                        "Your follow-through is lower on your busiest scheduled days.")
        if core and core["kind"] in ("reduce_frequency", "review_remove"):
            return rec(core["title"], f"{base_reason} {activity} also has its own execution problem.",
                        core["experiment"] + " Prioritize lighter days for it if possible.",
                        core["success"], core.get("action_label"))
        if core and core["kind"] == "move_time" and tod_diag.get("metrics", {}).get("better_time"):
            return rec(f"Move {activity} to a lighter day",
                        f"{base_reason} {activity} also performs better at a different time.",
                        f"Move {activity} to the {tod_diag['metrics']['better_time'].lower()} on a lighter day.",
                        "A higher Follow-Through Rate on the days this activity now falls on.", "Edit Schedule")
        if activity:
            return rec(f"Move {activity} away from your busiest days",
                        base_reason,
                        f"Move {activity} away from your busiest days before changing its duration or frequency.",
                        "A smaller gap between busy-day and light-day Follow-Through Rate.", "Edit Schedule")
        return rec("Reduce your busiest days' workload",
                    base_reason,
                    "Move or remove one flexible activity from your busiest days.",
                    "A smaller gap between busy-day and light-day Follow-Through Rate.")

    # --- F. Declining consistency (priority 2) ---
    if ft_key == "declining":
        er, lr = ft["metrics"].get("earlier_rate"), ft["metrics"].get("later_rate")
        base_reason = (f"Your Follow-Through Rate fell from {er}% to {lr}% over the selected range."
                        if er is not None else "Your follow-through has declined recently.")
        if core:
            return rec(core["title"], base_reason,
                        core["experiment"] + " Avoid making other schedule changes during the test.",
                        core["success"], core.get("action_label"))
        return rec("Temporarily simplify your schedule",
                    base_reason,
                    "Temporarily simplify the schedule and compare the next two weeks with the declining period.",
                    "Follow-Through Rate recovering toward its earlier level.")

    # --- C/D/G/H: everything else defers to the activity-level diagnosis ---
    if core:
        reason_bits = []
        if lta_key == "difficult_to_start":
            reason_bits.append(f"{activity} accounts for {lta_diag['metrics'].get('lost_share', 0)}% of your lost scheduled time, "
                               f"mostly because sessions are never started.")
        elif lta_key in ("split", "shorten"):
            sched = lta_diag["metrics"].get("scheduled_duration")
            med = lta_diag["metrics"].get("median_actual_duration")
            if sched and med:
                reason_bits.append(f"{activity} accounts for {lta_diag['metrics'].get('lost_share', 0)}% of your lost time, "
                                   f"and its typical completed duration is {med} minutes rather than the scheduled {sched}.")
        elif lta_key == "frequently_skipped":
            reason_bits.append(f"{activity} is skipped often, accounting for {lta_diag['metrics'].get('lost_share', 0)}% of your lost scheduled time.")
        elif lta_key == "may_not_fit_routine":
            reason_bits.append(f"{activity} repeatedly receives scheduled time but is rarely followed through on.")
        if tod_key == "no_meaningful_time_difference":
            reason_bits.append("Time of day does not show a meaningful difference.")
        reason = " ".join(reason_bits) if reason_bits else f"{activity} is the largest source of lost scheduled time."

        if ft_key == "improving":
            return rec(f"Continue overall, and {core['title'].lower()}",
                        f"Overall performance is improving. {reason}",
                        core["experiment"], core["success"], core.get("action_label"))
        if ft_key == "no_clear_pattern":
            return rec(core["title"], reason, core["experiment"], core["success"], core.get("action_label"))
        # strong / other, with a specific activity problem despite a healthy overall picture
        return rec(core["title"],
                    f"Your overall schedule is healthy, but {reason}",
                    core["experiment"], core["success"], core.get("action_label"))

    # No activity-specific action available and none of the above matched —
    # generic fallback.
    if tod_key == "no_activity_available" or lta_key in ("no_single_activity_dominates", "no_meaningful_lost_time"):
        return rec("Keep tracking",
                    "No single change has enough evidence yet.",
                    "Keep tracking. No single change has enough evidence yet.",
                    "A clear pattern emerging in one of the three graphs above.")

    return rec("Keep the current setup",
                "No single higher-priority issue was identified.",
                "Keep the current setup and continue collecting data.",
                "A clear pattern emerging as more data comes in.")
