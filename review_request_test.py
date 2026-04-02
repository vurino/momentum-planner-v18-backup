#!/usr/bin/env python3
"""
Specific test scenarios for Phase 3 review request
"""

import requests
import json
from datetime import datetime, timedelta

BACKEND_URL = "https://progress-tracker-426.preview.emergentagent.com/api"

def test_specific_scenarios():
    """Test the specific scenarios mentioned in the review request"""
    print("=" * 60)
    print("TESTING SPECIFIC REVIEW REQUEST SCENARIOS")
    print("=" * 60)
    
    # 1. Call GET /api/weekly-summary/2026-04-02 and verify it returns exactly 7 days of data
    print("1. Testing GET /api/weekly-summary/2026-04-02...")
    response = requests.get(f"{BACKEND_URL}/weekly-summary/2026-04-02", timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Status: {response.status_code}")
        print(f"   ✅ Days returned: {len(data['days'])}")
        print(f"   ✅ Date range: {data['days'][0]['date']} to {data['days'][-1]['date']}")
        
        # Verify each day has required fields
        for day in data['days']:
            required_fields = ['date', 'day_abbr', 'total', 'completed', 'percentage']
            if all(field in day for field in required_fields):
                print(f"   ✅ {day['date']} ({day['day_abbr']}): {day['completed']}/{day['total']} ({day['percentage']}%)")
            else:
                print(f"   ❌ {day['date']} missing required fields")
        
        print(f"   ✅ Summary - Average: {data['average_percentage']}%, Total Completed: {data['total_completed']}, Total Tasks: {data['total_tasks']}")
    else:
        print(f"   ❌ Failed with status: {response.status_code}")
    
    print()
    
    # 2. Verify the response structure includes days array and summary statistics
    print("2. Verifying response structure...")
    if response.status_code == 200:
        data = response.json()
        required_top_level = ['days', 'average_percentage', 'total_completed', 'total_tasks']
        if all(field in data for field in required_top_level):
            print("   ✅ All required top-level fields present")
        else:
            print("   ❌ Missing top-level fields")
        
        if isinstance(data['days'], list):
            print("   ✅ 'days' is an array")
        else:
            print("   ❌ 'days' is not an array")
    
    print()
    
    # 3. Test creating/updating a schedule slot with notes
    print("3. Testing schedule slot with notes...")
    
    # Create slot with notes
    test_slot = {
        "label": "Review Meeting",
        "icon": "people",
        "start_time": "14:00",
        "end_time": "15:00",
        "group": "work",
        "order_index": 20,
        "notes": "Weekly team review meeting - prepare status updates"
    }
    
    response = requests.post(f"{BACKEND_URL}/schedule-slots", json=test_slot, timeout=10)
    if response.status_code == 200:
        created_slot = response.json()
        print(f"   ✅ Created slot: {created_slot['label']}")
        print(f"   ✅ Notes: {created_slot['notes']}")
        
        # Update the notes
        slot_id = created_slot['id']
        update_data = {"notes": "Updated: Weekly team review - focus on Q2 goals"}
        
        response = requests.put(f"{BACKEND_URL}/schedule-slots/{slot_id}", json=update_data, timeout=10)
        if response.status_code == 200:
            updated_slot = response.json()
            print(f"   ✅ Updated notes: {updated_slot['notes']}")
        else:
            print(f"   ❌ Failed to update notes: {response.status_code}")
        
        # Clean up
        requests.delete(f"{BACKEND_URL}/schedule-slots/{slot_id}", timeout=10)
    else:
        print(f"   ❌ Failed to create slot: {response.status_code}")
    
    print()
    
    # 4. Test updating a daily task with notes
    print("4. Testing daily task with notes...")
    
    # Get daily tasks for today
    test_date = "2026-04-02"
    response = requests.get(f"{BACKEND_URL}/daily-tasks/{test_date}", timeout=10)
    
    if response.status_code == 200:
        tasks = response.json()
        if tasks:
            task = tasks[0]
            task_id = task['id']
            
            # Update task with notes
            update_data = {
                "notes": "Completed early today - very productive session!"
            }
            
            response = requests.put(f"{BACKEND_URL}/daily-tasks/{task_id}", json=update_data, timeout=10)
            if response.status_code == 200:
                updated_task = response.json()
                print(f"   ✅ Updated task notes: {updated_task['notes']}")
                
                # Test updating both completion and notes
                combined_update = {
                    "completed": True,
                    "notes": "Finished ahead of schedule - excellent focus today"
                }
                
                response = requests.put(f"{BACKEND_URL}/daily-tasks/{task_id}", json=combined_update, timeout=10)
                if response.status_code == 200:
                    final_task = response.json()
                    print(f"   ✅ Updated completion: {final_task['completed']}")
                    print(f"   ✅ Updated notes: {final_task['notes']}")
                else:
                    print(f"   ❌ Failed combined update: {response.status_code}")
            else:
                print(f"   ❌ Failed to update task notes: {response.status_code}")
        else:
            print("   ❌ No tasks found for test date")
    else:
        print(f"   ❌ Failed to get daily tasks: {response.status_code}")
    
    print()
    print("=" * 60)
    print("SPECIFIC SCENARIOS TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_specific_scenarios()