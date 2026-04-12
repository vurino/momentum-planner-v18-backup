import logging
import uuid
from datetime import date
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
 
logger = logging.getLogger(__name__)
 
_scheduler = AsyncIOScheduler()
 
DAY_MAP = {
    0: "mon", 1: "tue", 2: "wed",
    3: "thu", 4: "fri", 5: "sat", 6: "sun",
}
 
 
async def generate_tasks_for_date(mongo_db, target_date: date) -> int:
    weekday_key = DAY_MAP[target_date.weekday()]
    date_str = target_date.isoformat()
 
    slots = await mongo_db.schedule_slots.find().sort("order_index", 1).to_list(100)
    if not slots:
        logger.info(f"[Scheduler] No slots found, skipping {date_str}")
        return 0
 
    created = 0
    for slot in slots:
        slot_days = slot.get("days", ["mon","tue","wed","thu","fri","sat","sun"])
        if weekday_key not in slot_days:
            continue
 
        existing = await mongo_db.daily_tasks.find_one({
            "date": date_str,
            "slot_id": slot["id"],
        })
 
        if not existing:
            task = {
                "id": str(uuid.uuid4()),
                "date": date_str,
                "slot_id": slot["id"],
                "completed": False,
                "notes": None,
            }
            await mongo_db.daily_tasks.insert_one(task)
            created += 1
 
    if created > 0:
        logger.info(f"[Scheduler] Created {created} tasks for {date_str}")
    else:
        logger.info(f"[Scheduler] Tasks already exist for {date_str}")
 
    return created
 
 
def init_scheduler(mongo_db):
    async def midnight_job():
        await generate_tasks_for_date(mongo_db, date.today())
 
    _scheduler.add_job(
        midnight_job,
        CronTrigger(hour=0, minute=1),
        id="midnight_task_generation",
        replace_existing=True,
        misfire_grace_time=600,
    )
    _scheduler.start()
    logger.info("[Scheduler] Started")
 
 
def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped")
 