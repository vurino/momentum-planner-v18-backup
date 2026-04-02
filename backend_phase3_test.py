#!/usr/bin/env python3
"""
Backend API Testing for Momentum Planner - Phase 3 Features
Tests the new weekly-summary endpoint and notes field functionality
"""

import requests
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Any

# Configuration
BACKEND_URL = "https://progress-tracker-426.preview.emergentagent.com/api"
TEST_DATE = "2026-04-02"  # Wednesday for weekly summary test

def print_test_result(test_name: str, success: bool, details: str = ""):
    """Print formatted test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_weekly_summary():
    """Test GET /api/weekly-summary/{date} - New Phase 3 endpoint"""
    print(f"Testing Weekly Summary for {TEST_DATE}...")
    try:
        response = requests.get(f"{BACKEND_URL}/weekly-summary/{TEST_DATE}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check main structure
            required_fields = ['days', 'average_percentage', 'total_completed', 'total_tasks']
            if not all(field in data for field in required_fields):
                print_test_result("Weekly Summary Structure", False, f"Missing required fields: {data}")
                return False
            
            # Check days array
            days = data['days']
            if not isinstance(days, list) or len(days) != 7:
                print_test_result("Weekly Summary Days Count", False, f"Expected 7 days, got {len(days) if isinstance(days, list) else 'non-list'}")
                return False
            
            # Check each day structure
            day_required_fields = ['date', 'day_abbr', 'total', 'completed', 'percentage']
            for i, day in enumerate(days):
                if not all(field in day for field in day_required_fields):
                    print_test_result("Weekly Summary Day Structure", False, f"Day {i} missing fields: {day}")
                    return False
            
            # Verify date range (7 days ending on TEST_DATE)
            end_date = datetime.strptime(TEST_DATE, "%Y-%m-%d")
            expected_dates = []
            for i in range(6, -1, -1):
                day_date = end_date - timedelta(days=i)
                expected_dates.append(day_date.strftime("%Y-%m-%d"))
            
            actual_dates = [day['date'] for day in days]
            if actual_dates != expected_dates:
                print_test_result("Weekly Summary Date Range", False, f"Expected dates: {expected_dates}, Got: {actual_dates}")
                return False
            
            # Verify day abbreviations
            expected_day_abbrs = []
            for i in range(6, -1, -1):
                day_date = end_date - timedelta(days=i)
                expected_day_abbrs.append(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day_date.weekday()])
            
            actual_day_abbrs = [day['day_abbr'] for day in days]
            if actual_day_abbrs != expected_day_abbrs:
                print_test_result("Weekly Summary Day Abbreviations", False, f"Expected: {expected_day_abbrs}, Got: {actual_day_abbrs}")
                return False
            
            # Verify summary calculations
            total_completed = sum(day['completed'] for day in days)
            total_tasks = sum(day['total'] for day in days)
            
            if data['total_completed'] != total_completed:
                print_test_result("Weekly Summary Total Completed", False, f"Expected: {total_completed}, Got: {data['total_completed']}")
                return False
            
            if data['total_tasks'] != total_tasks:
                print_test_result("Weekly Summary Total Tasks", False, f"Expected: {total_tasks}, Got: {data['total_tasks']}")
                return False
            
            print_test_result("Weekly Summary", True, 
                f"7 days from {days[0]['date']} to {days[6]['date']}, "
                f"Average: {data['average_percentage']}%, "
                f"Total: {data['total_completed']}/{data['total_tasks']}")
            return True
            
        else:
            print_test_result("Weekly Summary", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Weekly Summary", False, f"Error: {str(e)}")
        return False

def test_schedule_slot_notes():
    """Test notes field in schedule slots"""
    print("Testing Schedule Slot Notes Field...")
    try:
        # First, create a schedule slot with notes
        test_slot = {
            "label": "Test Activity with Notes",
            "icon": "clock", 
            "start_time": "10:00",
            "end_time": "11:00",
            "group": "test",
            "order_index": 15,
            "notes": "This is a test note for the schedule slot"
        }
        
        # Create the slot
        response = requests.post(
            f"{BACKEND_URL}/schedule-slots", 
            json=test_slot,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code != 200:
            print_test_result("Create Schedule Slot with Notes", False, f"Status: {response.status_code}")
            return False
        
        created_slot = response.json()
        slot_id = created_slot.get('id')
        
        if created_slot.get('notes') != test_slot['notes']:
            print_test_result("Create Schedule Slot with Notes", False, f"Notes not saved correctly: {created_slot.get('notes')}")
            return False
        
        print_test_result("Create Schedule Slot with Notes", True, f"Created slot with notes: '{created_slot['notes']}'")
        
        # Test updating notes
        update_data = {
            "notes": "Updated note for the schedule slot"
        }
        
        response = requests.put(
            f"{BACKEND_URL}/schedule-slots/{slot_id}",
            json=update_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code != 200:
            print_test_result("Update Schedule Slot Notes", False, f"Status: {response.status_code}")
            return False
        
        updated_slot = response.json()
        if updated_slot.get('notes') != update_data['notes']:
            print_test_result("Update Schedule Slot Notes", False, f"Notes not updated correctly: {updated_slot.get('notes')}")
            return False
        
        print_test_result("Update Schedule Slot Notes", True, f"Updated notes: '{updated_slot['notes']}'")
        
        # Clean up - delete the test slot
        requests.delete(f"{BACKEND_URL}/schedule-slots/{slot_id}", timeout=10)
        
        return True
        
    except Exception as e:
        print_test_result("Schedule Slot Notes", False, f"Error: {str(e)}")
        return False

def test_daily_task_notes():
    """Test notes field in daily tasks"""
    print("Testing Daily Task Notes Field...")
    try:
        # Get daily tasks for test date
        response = requests.get(f"{BACKEND_URL}/daily-tasks/{TEST_DATE}", timeout=10)
        
        if response.status_code != 200:
            print_test_result("Get Daily Tasks for Notes Test", False, f"Status: {response.status_code}")
            return False
        
        tasks = response.json()
        if not tasks:
            print_test_result("Get Daily Tasks for Notes Test", False, "No tasks found")
            return False
        
        # Use the first task for testing
        task = tasks[0]
        task_id = task.get('id')
        
        # Test updating task with notes
        update_data = {
            "notes": "This is a test note for the daily task"
        }
        
        response = requests.put(
            f"{BACKEND_URL}/daily-tasks/{task_id}",
            json=update_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code != 200:
            print_test_result("Update Daily Task Notes", False, f"Status: {response.status_code}")
            return False
        
        updated_task = response.json()
        if updated_task.get('notes') != update_data['notes']:
            print_test_result("Update Daily Task Notes", False, f"Notes not updated correctly: {updated_task.get('notes')}")
            return False
        
        print_test_result("Update Daily Task Notes", True, f"Updated task notes: '{updated_task['notes']}'")
        
        # Test updating both completion and notes together
        combined_update = {
            "completed": True,
            "notes": "Task completed with additional notes"
        }
        
        response = requests.put(
            f"{BACKEND_URL}/daily-tasks/{task_id}",
            json=combined_update,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code != 200:
            print_test_result("Update Daily Task Completion and Notes", False, f"Status: {response.status_code}")
            return False
        
        updated_task = response.json()
        if (updated_task.get('completed') != True or 
            updated_task.get('notes') != combined_update['notes']):
            print_test_result("Update Daily Task Completion and Notes", False, 
                f"Update failed - Completed: {updated_task.get('completed')}, Notes: {updated_task.get('notes')}")
            return False
        
        print_test_result("Update Daily Task Completion and Notes", True, 
            f"Updated both completion ({updated_task['completed']}) and notes ('{updated_task['notes']}')")
        
        return True
        
    except Exception as e:
        print_test_result("Daily Task Notes", False, f"Error: {str(e)}")
        return False

def test_notes_field_in_existing_data():
    """Test that existing schedule slots and daily tasks have notes field"""
    print("Testing Notes Field in Existing Data...")
    try:
        # Check schedule slots
        response = requests.get(f"{BACKEND_URL}/schedule-slots", timeout=10)
        if response.status_code != 200:
            print_test_result("Check Schedule Slots Notes Field", False, f"Status: {response.status_code}")
            return False
        
        slots = response.json()
        for slot in slots:
            if 'notes' not in slot:
                print_test_result("Check Schedule Slots Notes Field", False, f"Slot missing notes field: {slot.get('label', 'Unknown')}")
                return False
        
        print_test_result("Check Schedule Slots Notes Field", True, f"All {len(slots)} slots have notes field")
        
        # Check daily tasks
        response = requests.get(f"{BACKEND_URL}/daily-tasks/{TEST_DATE}", timeout=10)
        if response.status_code != 200:
            print_test_result("Check Daily Tasks Notes Field", False, f"Status: {response.status_code}")
            return False
        
        tasks = response.json()
        for task in tasks:
            if 'notes' not in task:
                print_test_result("Check Daily Tasks Notes Field", False, f"Task missing notes field: {task.get('id', 'Unknown')}")
                return False
        
        print_test_result("Check Daily Tasks Notes Field", True, f"All {len(tasks)} tasks have notes field")
        
        return True
        
    except Exception as e:
        print_test_result("Notes Field in Existing Data", False, f"Error: {str(e)}")
        return False

def main():
    """Run all Phase 3 API endpoint tests"""
    print("=" * 60)
    print("MOMENTUM PLANNER PHASE 3 BACKEND API TEST SUITE")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Date: {TEST_DATE}")
    print("=" * 60)
    
    test_results = {}
    
    # 1. Test weekly summary endpoint
    test_results["weekly_summary"] = test_weekly_summary()
    
    # 2. Test notes field in existing data
    test_results["notes_field_existing"] = test_notes_field_in_existing_data()
    
    # 3. Test schedule slot notes functionality
    test_results["schedule_slot_notes"] = test_schedule_slot_notes()
    
    # 4. Test daily task notes functionality
    test_results["daily_task_notes"] = test_daily_task_notes()
    
    # Summary
    print("=" * 60)
    print("PHASE 3 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name.replace('_', ' ').title()}")
    
    print("=" * 60)
    print(f"TOTAL: {passed}/{total} Phase 3 tests passed")
    
    if passed == total:
        print("🎉 ALL PHASE 3 TESTS PASSED!")
        return True
    else:
        print(f"⚠️  {total - passed} Phase 3 tests failed")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)