#!/usr/bin/env python3
"""
Debug script for days field filtering issue
"""

import requests
import json

BACKEND_URL = "https://progress-tracker-426.preview.emergentagent.com/api"

def debug_days_filtering():
    """Debug the days filtering issue"""
    
    # Get all schedule slots
    print("=== SCHEDULE SLOTS ===")
    slots_response = requests.get(f"{BACKEND_URL}/schedule-slots", timeout=10)
    if slots_response.status_code == 200:
        slots = slots_response.json()
        print(f"Found {len(slots)} slots:")
        
        wed_slots = []
        sat_slots = []
        
        for slot in slots:
            days = slot.get('days', [])
            print(f"  {slot['label']}: {days}")
            if 'wed' in days:
                wed_slots.append(slot['id'])
            if 'sat' in days:
                sat_slots.append(slot['id'])
        
        print(f"\nSlots active on Wednesday: {len(wed_slots)}")
        print(f"Slots active on Saturday: {len(sat_slots)}")
        
        # Test Wednesday
        print("\n=== WEDNESDAY TASKS (2026-03-04) ===")
        wed_response = requests.get(f"{BACKEND_URL}/daily-tasks/2026-03-04", timeout=10)
        if wed_response.status_code == 200:
            wed_tasks = wed_response.json()
            wed_task_slots = [task['slot_id'] for task in wed_tasks]
            print(f"Found {len(wed_tasks)} tasks:")
            for task in wed_tasks:
                # Find slot label for this task
                slot_label = "Unknown"
                for slot in slots:
                    if slot['id'] == task['slot_id']:
                        slot_label = slot['label']
                        break
                print(f"  Task for slot: {slot_label} ({task['slot_id']})")
            
            print(f"\nExpected slot IDs: {wed_slots}")
            print(f"Actual task slot IDs: {wed_task_slots}")
            print(f"Match? {set(wed_slots) == set(wed_task_slots)}")
            
        # Test Saturday
        print("\n=== SATURDAY TASKS (2026-03-07) ===")
        sat_response = requests.get(f"{BACKEND_URL}/daily-tasks/2026-03-07", timeout=10)
        if sat_response.status_code == 200:
            sat_tasks = sat_response.json()
            sat_task_slots = [task['slot_id'] for task in sat_tasks]
            print(f"Found {len(sat_tasks)} tasks:")
            for task in sat_tasks:
                # Find slot label for this task
                slot_label = "Unknown"
                for slot in slots:
                    if slot['id'] == task['slot_id']:
                        slot_label = slot['label']
                        break
                print(f"  Task for slot: {slot_label} ({task['slot_id']})")
            
            print(f"\nExpected slot IDs: {sat_slots}")
            print(f"Actual task slot IDs: {sat_task_slots}")
            print(f"Match? {set(sat_slots) == set(sat_task_slots)}")

if __name__ == "__main__":
    debug_days_filtering()