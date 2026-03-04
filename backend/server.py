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
from datetime import datetime, date


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

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

class ScheduleSlotCreate(BaseModel):
    label: str
    icon: str = "clock"
    start_time: str
    end_time: str
    group: str = "general"
    order_index: int

class ScheduleSlotUpdate(BaseModel):
    label: Optional[str] = None
    icon: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    group: Optional[str] = None
    order_index: Optional[int] = None

class DailyTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD format
    slot_id: str
    completed: bool = False

class DailyTaskUpdate(BaseModel):
    completed: bool

class BulkSlotsUpdate(BaseModel):
    slots: List[ScheduleSlot]

# Default schedule template
DEFAULT_SCHEDULE = [
    {"label": "Breakfast", "icon": "restaurant", "start_time": "07:00", "end_time": "08:00", "group": "morning", "order_index": 0},
    {"label": "Morning Focus", "icon": "sunny", "start_time": "08:00", "end_time": "09:00", "group": "morning", "order_index": 1},
    {"label": "Job Search", "icon": "briefcase", "start_time": "09:00", "end_time": "10:30", "group": "work", "order_index": 2},
    {"label": "Break", "icon": "cafe", "start_time": "10:30", "end_time": "10:45", "group": "break", "order_index": 3},
    {"label": "Trading Block 1", "icon": "trending-up", "start_time": "10:45", "end_time": "12:00", "group": "trading", "order_index": 4},
    {"label": "Trade Review / Journal", "icon": "book", "start_time": "12:00", "end_time": "13:00", "group": "trading", "order_index": 5},
    {"label": "Workout", "icon": "fitness", "start_time": "13:00", "end_time": "14:00", "group": "health", "order_index": 6},
    {"label": "Quick meal", "icon": "fast-food", "start_time": "14:00", "end_time": "14:30", "group": "break", "order_index": 7},
    {"label": "Trading Block 2", "icon": "analytics", "start_time": "14:30", "end_time": "16:00", "group": "trading", "order_index": 8},
    {"label": "Break", "icon": "cafe", "start_time": "16:00", "end_time": "16:15", "group": "break", "order_index": 9},
    {"label": "Trading Block 3", "icon": "settings", "start_time": "16:15", "end_time": "17:30", "group": "trading", "order_index": 10},
    {"label": "Create", "icon": "code", "start_time": "17:30", "end_time": "18:00", "group": "creative", "order_index": 11},
    {"label": "Dinner + Wind down", "icon": "moon", "start_time": "18:00", "end_time": "21:30", "group": "evening", "order_index": 12},
    {"label": "Sleep target", "icon": "bed", "start_time": "22:30", "end_time": "23:59", "group": "evening", "order_index": 13},
]


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
    
    return [ScheduleSlot(**slot) for slot in slots]

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
        slots = await db.schedule_slots.find().sort("order_index", 1).to_list(100)
        
        # If no slots exist, get defaults
        if not slots:
            for slot_data in DEFAULT_SCHEDULE:
                slot = ScheduleSlot(**slot_data)
                await db.schedule_slots.insert_one(slot.model_dump())
            slots = await db.schedule_slots.find().sort("order_index", 1).to_list(100)
        
        for slot in slots:
            task = DailyTask(date=date_str, slot_id=slot["id"], completed=False)
            await db.daily_tasks.insert_one(task.model_dump())
        
        tasks = await db.daily_tasks.find({"date": date_str}).to_list(100)
    
    return [DailyTask(**task) for task in tasks]

@api_router.put("/daily-tasks/{task_id}", response_model=DailyTask)
async def update_daily_task(task_id: str, task_update: DailyTaskUpdate):
    """Update a daily task (toggle completion)"""
    result = await db.daily_tasks.update_one(
        {"id": task_id},
        {"$set": {"completed": task_update.completed}}
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
