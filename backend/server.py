from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date, timedelta
from contextlib import asynccontextmanager
from scheduler import init_scheduler, stop_scheduler, generate_tasks_for_date


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
@asynccontextmanager
async def lifespan(app: FastAPI):
    await generate_tasks_for_date(db, date.today())
    init_scheduler(db)
    yield
    stop_scheduler()
    client.close()

app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class ScheduleSlot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    icon: str = "clock"  # Default icon
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    group: str = "general"
    order_index: int
    days: List[str] = Field(default_factory=lambda: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"])  # Days when this slot is active
    notes: Optional[str] = None  # Optional notes field

class ScheduleSlotCreate(BaseModel):
    label: str
    icon: str = "clock"
    start_time: str
    end_time: str
    group: str = "general"
    order_index: int
    days: List[str] = Field(default_factory=lambda: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
    notes: Optional[str] = None

class ScheduleSlotUpdate(BaseModel):
    label: Optional[str] = None
    icon: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    group: Optional[str] = None
    order_index: Optional[int] = None
    days: Optional[List[str]] = None
    notes: Optional[str] = None

class DailyTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD format
    slot_id: str
    completed: bool = False
    notes: Optional[str] = None  # Per-day notes for this task

class DailyTaskUpdate(BaseModel):
    completed: Optional[bool] = None
    notes: Optional[str] = None

class BulkSlotsUpdate(BaseModel):
    slots: List[ScheduleSlot]

# Default schedule template - weekdays only for work activities
DEFAULT_SCHEDULE = [
    {"label": "Breakfast", "icon": "restaurant", "start_time": "07:00", "end_time": "08:00", "group": "morning", "order_index": 0, "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]},
    {"label": "Morning Focus", "icon": "sunny", "start_time": "08:00", "end_time": "09:00", "group": "morning", "order_index": 1, "days": ["mon", "tue", "wed", "thu", "fri"]},
    {"label": "Job Search", "icon": "briefcase", "start_time": "09:00", "end_time": "10:30", "group": "work", "order_index": 2, "days": ["mon", "tue", "wed", "thu", "fri"]},
    {"label": "Break", "icon": "cafe", "start_time": "10:30", "end_time": "10:45", "group": "break", "order_index": 3, "days": ["mon", "tue", "wed", "thu", "fri"]},
    {"label": "Trading Block 1", "icon": "trending-up", "start_time": "10:45", "end_time": "12:00", "group": "trading", "order_index": 4, "days": ["mon", "tue", "wed", "thu", "fri"]},
    {"label": "Trade Review / Journal", "icon": "book", "start_time": "12:00", "end_time": "13:00", "group": "trading", "order_index": 5, "days": ["mon", "tue", "wed", "thu", "fri"]},
    {"label": "Workout", "icon": "fitness", "start_time": "13:00", "end_time": "14:00", "group": "health", "order_index": 6, "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]},
    {"label": "Quick meal", "icon": "fast-food", "start_time": "14:00", "end_time": "14:30", "group": "break", "order_index": 7, "days": ["mon", "tue", "wed", "thu", "fri"]},
    {"label": "Trading Block 2", "icon": "analytics", "start_time": "14:30", "end_time": "16:00", "group": "trading", "order_index": 8, "days": ["mon", "tue", "wed", "thu", "fri"]},
    {"label": "Break", "icon": "cafe", "start_time": "16:00", "end_time": "16:15", "group": "break", "order_index": 9, "days": ["mon", "tue", "wed", "thu", "fri"]},
    {"label": "Trading Block 3", "icon": "settings", "start_time": "16:15", "end_time": "17:30", "group": "trading", "order_index": 10, "days": ["mon", "tue", "wed", "thu", "fri"]},
    {"label": "Create", "icon": "code", "start_time": "17:30", "end_time": "18:00", "group": "creative", "order_index": 11, "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]},
    {"label": "Dinner + Wind down", "icon": "moon", "start_time": "18:00", "end_time": "21:30", "group": "evening", "order_index": 12, "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]},
    {"label": "Sleep target", "icon": "bed", "start_time": "22:30", "end_time": "23:59", "group": "evening", "order_index": 13, "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]},
]

# Helper to get day of week abbreviation from date string
def get_day_abbr(date_str: str) -> str:
    """Convert date string to day abbreviation (mon, tue, etc)"""
    from datetime import datetime
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    return days[date_obj.weekday()]


# Routes
@api_router.get("/")
async def root():
    return {"message": "Momentum Planner API"}

# Schedule Slots endpoints
@api_router.get("/schedule-slots", response_model=List[ScheduleSlot])
async def get_schedule_slots():
    """Get all schedule slots (template)"""
    slots = await db.schedule_slots.find().sort("order_index", 1).to_list(100)
    
    # If no slots exist, create default schedule
    if not slots:
        for slot_data in DEFAULT_SCHEDULE:
            slot = ScheduleSlot(**slot_data)
            await db.schedule_slots.insert_one(slot.model_dump())
        slots = await db.schedule_slots.find().sort("order_index", 1).to_list(100)
    
    # Ensure all slots have the 'days' field (migration for existing data)
    result = []
    for slot in slots:
        if 'days' not in slot:
            slot['days'] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        if 'notes' not in slot:
            slot['notes'] = None
        result.append(ScheduleSlot(**slot))
    
    return result

@api_router.post("/schedule-slots", response_model=ScheduleSlot)
async def create_schedule_slot(slot_input: ScheduleSlotCreate):
    """Create a new schedule slot"""
    slot = ScheduleSlot(**slot_input.model_dump())
    await db.schedule_slots.insert_one(slot.model_dump())
    return slot

@api_router.put("/schedule-slots/{slot_id}", response_model=ScheduleSlot)
async def update_schedule_slot(slot_id: str, slot_update: ScheduleSlotUpdate):
    """Update a schedule slot"""
    update_data = {k: v for k, v in slot_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.schedule_slots.update_one(
        {"id": slot_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    updated_slot = await db.schedule_slots.find_one({"id": slot_id})
    return ScheduleSlot(**updated_slot)

@api_router.delete("/schedule-slots/{slot_id}")
async def delete_schedule_slot(slot_id: str):
    """Delete a schedule slot"""
    result = await db.schedule_slots.delete_one({"id": slot_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Slot not found")
    return {"message": "Slot deleted successfully"}

@api_router.put("/schedule-slots/bulk/update")
async def bulk_update_slots(data: BulkSlotsUpdate):
    """Bulk update/replace all schedule slots"""
    # Clear existing slots
    await db.schedule_slots.delete_many({})
    
    # Insert new slots
    for slot in data.slots:
        await db.schedule_slots.insert_one(slot.model_dump())
    
    return {"message": "Slots updated successfully", "count": len(data.slots)}

@api_router.post("/schedule-slots/reset")
async def reset_schedule_slots():
    """Reset schedule slots to default"""
    await db.schedule_slots.delete_many({})
    
    for slot_data in DEFAULT_SCHEDULE:
        slot = ScheduleSlot(**slot_data)
        await db.schedule_slots.insert_one(slot.model_dump())
    
    slots = await db.schedule_slots.find().sort("order_index", 1).to_list(100)
    return [ScheduleSlot(**slot) for slot in slots]


# Daily Tasks endpoints
@api_router.get("/daily-tasks/{date_str}", response_model=List[DailyTask])
async def get_daily_tasks(date_str: str):
    """Get daily tasks for a specific date. Creates tasks from template if they don't exist."""
    tasks = await db.daily_tasks.find({"date": date_str}).to_list(100)
    
    # If no tasks exist for this date, create from template
    if not tasks:
        day_abbr = get_day_abbr(date_str)
        slots = await db.schedule_slots.find().sort("order_index", 1).to_list(100)
        
        # If no slots exist, get defaults
        if not slots:
            for slot_data in DEFAULT_SCHEDULE:
                slot = ScheduleSlot(**slot_data)
                await db.schedule_slots.insert_one(slot.model_dump())
            slots = await db.schedule_slots.find().sort("order_index", 1).to_list(100)
        
        for slot in slots:
            # Only create task if slot is active for this day of week
            slot_days = slot.get('days', ["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
            if day_abbr in slot_days:
                task = DailyTask(date=date_str, slot_id=slot["id"], completed=False)
                await db.daily_tasks.insert_one(task.model_dump())
        
        tasks = await db.daily_tasks.find({"date": date_str}).to_list(100)
    
    return [DailyTask(**task) for task in tasks]

@api_router.put("/daily-tasks/{task_id}", response_model=DailyTask)
async def update_daily_task(task_id: str, task_update: DailyTaskUpdate):
    """Update a daily task (toggle completion or update notes)"""
    update_data = {k: v for k, v in task_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.daily_tasks.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task = await db.daily_tasks.find_one({"id": task_id})
    return DailyTask(**updated_task)

@api_router.get("/daily-progress/{date_str}")
async def get_daily_progress(date_str: str):
    """Get progress summary for a specific date"""
    tasks = await db.daily_tasks.find({"date": date_str}).to_list(100)
    
    if not tasks:
        # Get tasks (this will create them if they don't exist)
        await get_daily_tasks(date_str)
        tasks = await db.daily_tasks.find({"date": date_str}).to_list(100)
    
    total = len(tasks)
    completed = sum(1 for t in tasks if t.get("completed", False))
    percentage = round((completed / total * 100) if total > 0 else 0)
    
    return {
        "date": date_str,
        "total": total,
        "completed": completed,
        "percentage": percentage
    }

@api_router.get("/monthly-progress/{year}/{month}")
async def get_monthly_progress(year: int, month: int):
    """Get progress summary for each day in a month"""
    import calendar
    
    num_days = calendar.monthrange(year, month)[1]
    progress_data = []
    
    for day in range(1, num_days + 1):
        date_str = f"{year:04d}-{month:02d}-{day:02d}"
        tasks = await db.daily_tasks.find({"date": date_str}).to_list(100)
        
        if tasks:
            total = len(tasks)
            completed = sum(1 for t in tasks if t.get("completed", False))
            progress_data.append({
                "date": date_str,
                "day": day,
                "total": total,
                "completed": completed,
                "percentage": round((completed / total * 100) if total > 0 else 0)
            })
        else:
            progress_data.append({
                "date": date_str,
                "day": day,
                "total": 0,
                "completed": 0,
                "percentage": 0
            })
    
    return progress_data

@api_router.get("/weekly-summary/{date_str}")
async def get_weekly_summary(date_str: str, week_starts_monday: bool = True):
    """Get weekly summary (7 days ending on the given date or a Mon-Sun/Sun-Sat week)"""
    from datetime import datetime, timedelta
    
    end_date = datetime.strptime(date_str, "%Y-%m-%d")
    
    # Calculate the start of the week based on preference
    if week_starts_monday:
        # Find the Monday of this week
        days_since_monday = end_date.weekday()
        week_start = end_date - timedelta(days=days_since_monday)
        week_end = week_start + timedelta(days=6)
    else:
        # Find the Sunday of this week (week starts on Sunday)
        days_since_sunday = (end_date.weekday() + 1) % 7
        week_start = end_date - timedelta(days=days_since_sunday)
        week_end = week_start + timedelta(days=6)
    
    weekly_data = []
    
    for i in range(7):
        day_date = week_start + timedelta(days=i)
        day_str = day_date.strftime("%Y-%m-%d")
        tasks = await db.daily_tasks.find({"date": day_str}).to_list(100)
        
        if tasks:
            total = len(tasks)
            completed = sum(1 for t in tasks if t.get("completed", False))
            percentage = round((completed / total * 100) if total > 0 else 0)
        else:
            total = 0
            completed = 0
            percentage = 0
        
        weekly_data.append({
            "date": day_str,
            "day_abbr": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day_date.weekday()],
            "total": total,
            "completed": completed,
            "percentage": percentage
        })
    
    # Calculate average
    days_with_data = [d for d in weekly_data if d["total"] > 0]
    avg_percentage = round(sum(d["percentage"] for d in days_with_data) / len(days_with_data)) if days_with_data else 0
    
    return {
        "days": weekly_data,
        "average_percentage": avg_percentage,
        "total_completed": sum(d["completed"] for d in weekly_data),
        "total_tasks": sum(d["total"] for d in weekly_data)
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)



@app.get("/api/history")
async def get_history(days: int = 7):
    records = []
    today = datetime.utcnow().date()

    for i in range(days):
        d = today - timedelta(days=i)
        date_str = d.isoformat()

        tasks = await db.daily_tasks.find({"date": date_str}).to_list(None)
        total = len(tasks)
        done  = sum(1 for t in tasks if t.get("done", False))
        pct   = round((done / total * 100), 1) if total > 0 else 0.0

        records.append({
            "date":  date_str,
            "done":  done,
            "total": total,
            "pct":   pct,
        })

    return records


@app.get("/api/streak")
async def get_streak():
    streak = 0
    today  = datetime.utcnow().date()

    for i in range(365):
        d = today - timedelta(days=i)
        date_str = d.isoformat()

        tasks = await db.daily_tasks.find({"date": date_str}).to_list(None)
        if not tasks:
            continue

        total = len(tasks)
        done  = sum(1 for t in tasks if t.get("done", False))

        if done < total:
            break

        streak += 1

    return {"streak": streak}


@app.delete("/api/reset")
async def reset_all_data():
    result = await db.daily_tasks.delete_many({})
    return {"deleted": result.deleted_count}

