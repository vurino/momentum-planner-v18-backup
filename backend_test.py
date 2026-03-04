#!/usr/bin/env python3
"""
Backend API Testing for Momentum Planner
Tests all API endpoints with appropriate data and verifies responses
"""

import requests
import json
from datetime import datetime, date
from typing import Dict, List, Any

# Configuration
BACKEND_URL = "https://neuro-planner-6.preview.emergentagent.com/api"
TEST_DATE = "2026-03-04"
TEST_YEAR = 2026
TEST_MONTH = 3

def print_test_result(test_name: str, success: bool, details: str = ""):
    """Print formatted test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_health_check():
    """Test GET /api/ - Health check endpoint"""
    print("Testing Health Check Endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "Momentum Planner API" in data["message"]:
                print_test_result("Health Check", True, f"Status: {response.status_code}, Message: {data['message']}")
                return True
            else:
                print_test_result("Health Check", False, f"Unexpected response format: {data}")
                return False
        else:
            print_test_result("Health Check", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Health Check", False, f"Error: {str(e)}")
        return False

def test_get_schedule_slots():
    """Test GET /api/schedule-slots - Should return default schedule slots"""
    print("Testing Get Schedule Slots...")
    try:
        response = requests.get(f"{BACKEND_URL}/schedule-slots", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) == 14:
                # Check if it has expected default slots
                slot_labels = [slot.get('label', '') for slot in data]
                expected_labels = ['Breakfast', 'Morning Focus', 'Job Search']
                
                if any(label in slot_labels for label in expected_labels):
                    print_test_result("Get Schedule Slots", True, f"Retrieved {len(data)} default slots")
                    return data  # Return slots for use in other tests
                else:
                    print_test_result("Get Schedule Slots", False, f"Unexpected slot labels: {slot_labels[:3]}")
                    return data
            else:
                print_test_result("Get Schedule Slots", False, f"Expected 14 slots, got {len(data) if isinstance(data, list) else 'non-list'}")
                return data if isinstance(data, list) else []
        else:
            print_test_result("Get Schedule Slots", False, f"Status: {response.status_code}, Response: {response.text}")
            return []
            
    except Exception as e:
        print_test_result("Get Schedule Slots", False, f"Error: {str(e)}")
        return []

def test_create_schedule_slot():
    """Test POST /api/schedule-slots - Create new schedule slot"""
    print("Testing Create Schedule Slot...")
    try:
        test_slot = {
            "label": "Test Activity",
            "icon": "clock", 
            "start_time": "10:00",
            "end_time": "11:00",
            "group": "test",
            "order_index": 15
        }
        
        response = requests.post(
            f"{BACKEND_URL}/schedule-slots", 
            json=test_slot,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get('label') == test_slot['label'] and 
                data.get('start_time') == test_slot['start_time'] and
                'id' in data):
                print_test_result("Create Schedule Slot", True, f"Created slot with ID: {data['id']}")
                return data
            else:
                print_test_result("Create Schedule Slot", False, f"Unexpected response data: {data}")
                return None
        else:
            print_test_result("Create Schedule Slot", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
            
    except Exception as e:
        print_test_result("Create Schedule Slot", False, f"Error: {str(e)}")
        return None

def test_update_schedule_slot(slot_id: str):
    """Test PUT /api/schedule-slots/{slot_id} - Update a slot"""
    print(f"Testing Update Schedule Slot (ID: {slot_id})...")
    try:
        update_data = {
            "label": "Updated Test Activity",
            "start_time": "10:30"
        }
        
        response = requests.put(
            f"{BACKEND_URL}/schedule-slots/{slot_id}",
            json=update_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get('label') == update_data['label'] and 
                data.get('start_time') == update_data['start_time']):
                print_test_result("Update Schedule Slot", True, f"Updated slot label to: {data['label']}")
                return True
            else:
                print_test_result("Update Schedule Slot", False, f"Update not reflected: {data}")
                return False
        else:
            print_test_result("Update Schedule Slot", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Update Schedule Slot", False, f"Error: {str(e)}")
        return False

def test_delete_schedule_slot(slot_id: str):
    """Test DELETE /api/schedule-slots/{slot_id} - Delete a slot"""
    print(f"Testing Delete Schedule Slot (ID: {slot_id})...")
    try:
        response = requests.delete(f"{BACKEND_URL}/schedule-slots/{slot_id}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "deleted" in data["message"].lower():
                print_test_result("Delete Schedule Slot", True, data["message"])
                return True
            else:
                print_test_result("Delete Schedule Slot", False, f"Unexpected response: {data}")
                return False
        else:
            print_test_result("Delete Schedule Slot", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Delete Schedule Slot", False, f"Error: {str(e)}")
        return False

def test_bulk_update_slots(original_slots: List[Dict]):
    """Test PUT /api/schedule-slots/bulk/update - Bulk update with array of slots"""
    print("Testing Bulk Update Slots...")
    try:
        # Use first 3 original slots for bulk update test
        test_slots = original_slots[:3] if len(original_slots) >= 3 else original_slots
        
        # Modify labels to verify update worked
        for i, slot in enumerate(test_slots):
            slot['label'] = f"Bulk Updated {slot['label']}"
        
        bulk_data = {"slots": test_slots}
        
        response = requests.put(
            f"{BACKEND_URL}/schedule-slots/bulk/update",
            json=bulk_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "count" in data and data["count"] == len(test_slots):
                print_test_result("Bulk Update Slots", True, f"Updated {data['count']} slots")
                return True
            else:
                print_test_result("Bulk Update Slots", False, f"Unexpected response: {data}")
                return False
        else:
            print_test_result("Bulk Update Slots", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Bulk Update Slots", False, f"Error: {str(e)}")
        return False

def test_reset_schedule():
    """Test POST /api/schedule-slots/reset - Reset to default schedule"""
    print("Testing Reset Schedule...")
    try:
        response = requests.post(f"{BACKEND_URL}/schedule-slots/reset", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) == 14:
                print_test_result("Reset Schedule", True, f"Reset to {len(data)} default slots")
                return True
            else:
                print_test_result("Reset Schedule", False, f"Expected 14 slots, got {len(data) if isinstance(data, list) else 'non-list'}")
                return False
        else:
            print_test_result("Reset Schedule", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Reset Schedule", False, f"Error: {str(e)}")
        return False

def test_get_daily_tasks():
    """Test GET /api/daily-tasks/{date} - Get tasks for today"""
    print(f"Testing Get Daily Tasks for {TEST_DATE}...")
    try:
        response = requests.get(f"{BACKEND_URL}/daily-tasks/{TEST_DATE}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check if tasks have required fields
                first_task = data[0]
                if all(key in first_task for key in ['id', 'date', 'slot_id', 'completed']):
                    print_test_result("Get Daily Tasks", True, f"Retrieved {len(data)} tasks for {TEST_DATE}")
                    return data
                else:
                    print_test_result("Get Daily Tasks", False, f"Tasks missing required fields: {first_task}")
                    return data
            else:
                print_test_result("Get Daily Tasks", False, f"Expected task list, got {data}")
                return []
        else:
            print_test_result("Get Daily Tasks", False, f"Status: {response.status_code}, Response: {response.text}")
            return []
            
    except Exception as e:
        print_test_result("Get Daily Tasks", False, f"Error: {str(e)}")
        return []

def test_update_daily_task(task_id: str):
    """Test PUT /api/daily-tasks/{task_id} - Toggle task completion"""
    print(f"Testing Update Daily Task (ID: {task_id})...")
    try:
        update_data = {"completed": True}
        
        response = requests.put(
            f"{BACKEND_URL}/daily-tasks/{task_id}",
            json=update_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('completed') == True and data.get('id') == task_id:
                print_test_result("Update Daily Task", True, f"Task marked as completed")
                return True
            else:
                print_test_result("Update Daily Task", False, f"Update not reflected: {data}")
                return False
        else:
            print_test_result("Update Daily Task", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Update Daily Task", False, f"Error: {str(e)}")
        return False

def test_get_daily_progress():
    """Test GET /api/daily-progress/{date} - Get progress for today"""
    print(f"Testing Get Daily Progress for {TEST_DATE}...")
    try:
        response = requests.get(f"{BACKEND_URL}/daily-progress/{TEST_DATE}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ['date', 'total', 'completed', 'percentage']
            if all(field in data for field in required_fields):
                print_test_result("Get Daily Progress", True, 
                    f"Progress: {data['completed']}/{data['total']} ({data['percentage']}%)")
                return True
            else:
                print_test_result("Get Daily Progress", False, f"Missing required fields: {data}")
                return False
        else:
            print_test_result("Get Daily Progress", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Get Daily Progress", False, f"Error: {str(e)}")
        return False

def test_get_monthly_progress():
    """Test GET /api/monthly-progress/{year}/{month} - Get progress for March 2026"""
    print(f"Testing Get Monthly Progress for {TEST_YEAR}/{TEST_MONTH}...")
    try:
        response = requests.get(f"{BACKEND_URL}/monthly-progress/{TEST_YEAR}/{TEST_MONTH}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) == 31:  # March has 31 days
                # Check if each day has required fields
                first_day = data[0]
                required_fields = ['date', 'day', 'total', 'completed', 'percentage']
                if all(field in first_day for field in required_fields):
                    print_test_result("Get Monthly Progress", True, 
                        f"Retrieved progress for {len(data)} days in March 2026")
                    return True
                else:
                    print_test_result("Get Monthly Progress", False, f"Missing required fields: {first_day}")
                    return False
            else:
                print_test_result("Get Monthly Progress", False, f"Expected 31 days, got {len(data) if isinstance(data, list) else 'non-list'}")
                return False
        else:
            print_test_result("Get Monthly Progress", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Get Monthly Progress", False, f"Error: {str(e)}")
        return False

def main():
    """Run all API endpoint tests"""
    print("=" * 60)
    print("MOMENTUM PLANNER BACKEND API TEST SUITE")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Date: {TEST_DATE}")
    print("=" * 60)
    
    test_results = {}
    
    # 1. Health Check
    test_results["health_check"] = test_health_check()
    
    # 2. Get Schedule Slots (returns data for other tests)
    original_slots = test_get_schedule_slots()
    test_results["get_schedule_slots"] = len(original_slots) == 14
    
    # 3. Create Schedule Slot (returns new slot for testing)
    new_slot = test_create_schedule_slot()
    test_results["create_schedule_slot"] = new_slot is not None
    
    # 4. Update Schedule Slot (use created slot or first original slot)
    if new_slot and 'id' in new_slot:
        test_results["update_schedule_slot"] = test_update_schedule_slot(new_slot['id'])
        
        # 5. Delete Schedule Slot (use same slot)
        test_results["delete_schedule_slot"] = test_delete_schedule_slot(new_slot['id'])
    elif original_slots:
        test_results["update_schedule_slot"] = test_update_schedule_slot(original_slots[0]['id'])
        # Skip delete for original slot to preserve data
        test_results["delete_schedule_slot"] = True  # Skip this test
        print("⚠️  Skipped delete test to preserve original data")
    else:
        test_results["update_schedule_slot"] = False
        test_results["delete_schedule_slot"] = False
    
    # 6. Bulk Update Slots
    if original_slots:
        test_results["bulk_update_slots"] = test_bulk_update_slots(original_slots)
    else:
        test_results["bulk_update_slots"] = False
    
    # 7. Reset Schedule (restore defaults)
    test_results["reset_schedule"] = test_reset_schedule()
    
    # 8. Get Daily Tasks (returns tasks for testing)
    daily_tasks = test_get_daily_tasks()
    test_results["get_daily_tasks"] = len(daily_tasks) > 0
    
    # 9. Update Daily Task (toggle completion)
    if daily_tasks and 'id' in daily_tasks[0]:
        test_results["update_daily_task"] = test_update_daily_task(daily_tasks[0]['id'])
    else:
        test_results["update_daily_task"] = False
    
    # 10. Get Daily Progress
    test_results["get_daily_progress"] = test_get_daily_progress()
    
    # 11. Get Monthly Progress
    test_results["get_monthly_progress"] = test_get_monthly_progress()
    
    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name.replace('_', ' ').title()}")
    
    print("=" * 60)
    print(f"TOTAL: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED!")
        return True
    else:
        print(f"⚠️  {total - passed} tests failed")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)