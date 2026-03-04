#!/usr/bin/env python3
"""
Backend API Testing for Momentum Planner - Days Field Functionality
Tests the new 'days' field in schedule slots and daily task filtering
"""

import requests
import json
from datetime import datetime, date
from typing import Dict, List, Any

# Configuration
BACKEND_URL = "https://neuro-planner-6.preview.emergentagent.com/api"

def print_test_result(test_name: str, success: bool, details: str = ""):
    """Print formatted test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_get_schedule_slots_days_field():
    """Test GET /api/schedule-slots - Verify all slots now have a 'days' array field"""
    print("Testing Schedule Slots - Days Field Verification...")
    try:
        response = requests.get(f"{BACKEND_URL}/schedule-slots", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check if all slots have 'days' field
                slots_with_days = 0
                slots_without_days = 0
                
                for slot in data:
                    if 'days' in slot and isinstance(slot['days'], list):
                        slots_with_days += 1
                        # Verify days contain valid values
                        valid_days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
                        if not all(day in valid_days for day in slot['days']):
                            print_test_result("Schedule Slots Days Field", False, 
                                f"Slot '{slot.get('label', '')}' has invalid day values: {slot['days']}")
                            return False, []
                    else:
                        slots_without_days += 1
                        print(f"    Slot missing days field: {slot.get('label', 'Unknown')}")
                
                if slots_without_days == 0:
                    print_test_result("Schedule Slots Days Field", True, 
                        f"All {slots_with_days} slots have valid 'days' field")
                    return True, data
                else:
                    print_test_result("Schedule Slots Days Field", False, 
                        f"{slots_without_days} slots missing 'days' field")
                    return False, data
            else:
                print_test_result("Schedule Slots Days Field", False, f"No slots returned")
                return False, []
        else:
            print_test_result("Schedule Slots Days Field", False, f"Status: {response.status_code}")
            return False, []
            
    except Exception as e:
        print_test_result("Schedule Slots Days Field", False, f"Error: {str(e)}")
        return False, []

def test_create_schedule_slot_with_days():
    """Test POST /api/schedule-slots - Create a new slot with specific days"""
    print("Testing Create Schedule Slot with Weekdays...")
    try:
        test_slot = {
            "label": "Test Weekday Activity",
            "icon": "briefcase",
            "start_time": "09:00",
            "end_time": "10:00",
            "group": "test",
            "order_index": 20,
            "days": ["mon", "tue", "wed", "thu", "fri"]
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
                data.get('days') == test_slot['days'] and
                'id' in data):
                print_test_result("Create Schedule Slot with Days", True, 
                    f"Created weekday slot with ID: {data['id']}, Days: {data['days']}")
                return data
            else:
                print_test_result("Create Schedule Slot with Days", False, 
                    f"Days field not correct. Expected: {test_slot['days']}, Got: {data.get('days')}")
                return None
        else:
            print_test_result("Create Schedule Slot with Days", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
            
    except Exception as e:
        print_test_result("Create Schedule Slot with Days", False, f"Error: {str(e)}")
        return None

def test_update_schedule_slot_days(slot_id: str):
    """Test PUT /api/schedule-slots/{id} - Update a slot's days to weekend only"""
    print(f"Testing Update Schedule Slot Days to Weekend (ID: {slot_id})...")
    try:
        update_data = {
            "days": ["sat", "sun"]
        }
        
        response = requests.put(
            f"{BACKEND_URL}/schedule-slots/{slot_id}",
            json=update_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('days') == update_data['days']:
                print_test_result("Update Schedule Slot Days", True, 
                    f"Updated slot days to weekend: {data['days']}")
                return True
            else:
                print_test_result("Update Schedule Slot Days", False, 
                    f"Days not updated correctly. Expected: {update_data['days']}, Got: {data.get('days')}")
                return False
        else:
            print_test_result("Update Schedule Slot Days", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Update Schedule Slot Days", False, f"Error: {str(e)}")
        return False

def test_bulk_update_preserves_days():
    """Test PUT /api/schedule-slots/bulk/update - Verify bulk update preserves days field"""
    print("Testing Bulk Update Preserves Days Field...")
    try:
        # First get current slots
        response = requests.get(f"{BACKEND_URL}/schedule-slots", timeout=10)
        if response.status_code != 200:
            print_test_result("Bulk Update Preserves Days", False, "Could not get current slots")
            return False
            
        original_slots = response.json()
        if not original_slots:
            print_test_result("Bulk Update Preserves Days", False, "No slots to bulk update")
            return False
        
        # Modify just the first slot's label, keep days intact
        test_slots = original_slots.copy()
        test_slots[0]['label'] = f"Bulk Updated - {test_slots[0]['label']}"
        
        bulk_data = {"slots": test_slots}
        
        response = requests.put(
            f"{BACKEND_URL}/schedule-slots/bulk/update",
            json=bulk_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            # Verify by getting slots again
            response = requests.get(f"{BACKEND_URL}/schedule-slots", timeout=10)
            if response.status_code == 200:
                updated_slots = response.json()
                
                # Check if days fields are preserved
                if len(updated_slots) == len(test_slots):
                    days_preserved = True
                    for i, slot in enumerate(updated_slots):
                        if 'days' not in slot or slot['days'] != test_slots[i]['days']:
                            days_preserved = False
                            break
                    
                    if days_preserved:
                        print_test_result("Bulk Update Preserves Days", True, 
                            f"All {len(updated_slots)} slots preserved days field")
                        return True
                    else:
                        print_test_result("Bulk Update Preserves Days", False, 
                            "Some slots lost or modified days field")
                        return False
                else:
                    print_test_result("Bulk Update Preserves Days", False, 
                        f"Slot count mismatch. Expected: {len(test_slots)}, Got: {len(updated_slots)}")
                    return False
            else:
                print_test_result("Bulk Update Preserves Days", False, 
                    "Could not verify updated slots")
                return False
        else:
            print_test_result("Bulk Update Preserves Days", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Bulk Update Preserves Days", False, f"Error: {str(e)}")
        return False

def test_reset_creates_slots_with_days():
    """Test POST /api/schedule-slots/reset - Verify reset creates slots with correct day mappings"""
    print("Testing Reset Creates Slots with Days...")
    try:
        response = requests.post(f"{BACKEND_URL}/schedule-slots/reset", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check if all reset slots have days field
                slots_with_days = 0
                expected_patterns = {
                    # Some should be weekdays only
                    "weekdays": ["mon", "tue", "wed", "thu", "fri"],
                    # Some should be all days
                    "all_days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
                }
                
                weekday_slots = 0
                all_day_slots = 0
                
                for slot in data:
                    if 'days' in slot:
                        slots_with_days += 1
                        if slot['days'] == expected_patterns["weekdays"]:
                            weekday_slots += 1
                        elif slot['days'] == expected_patterns["all_days"]:
                            all_day_slots += 1
                
                if slots_with_days == len(data) and weekday_slots > 0 and all_day_slots > 0:
                    print_test_result("Reset Creates Slots with Days", True, 
                        f"Reset created {len(data)} slots: {weekday_slots} weekday-only, {all_day_slots} all-day")
                    return True
                else:
                    print_test_result("Reset Creates Slots with Days", False, 
                        f"Reset slots not properly configured. Slots with days: {slots_with_days}/{len(data)}")
                    return False
            else:
                print_test_result("Reset Creates Slots with Days", False, f"No slots returned from reset")
                return False
        else:
            print_test_result("Reset Creates Slots with Days", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Reset Creates Slots with Days", False, f"Error: {str(e)}")
        return False

def test_daily_tasks_day_filtering(test_date: str, expected_day: str):
    """Test GET /api/daily-tasks/{date} - Verify only tasks for slots matching the day of week are created"""
    print(f"Testing Daily Tasks Day Filtering for {test_date} ({expected_day})...")
    try:
        # First get all schedule slots to see which should apply to this day
        slots_response = requests.get(f"{BACKEND_URL}/schedule-slots", timeout=10)
        if slots_response.status_code != 200:
            print_test_result(f"Daily Tasks Day Filtering ({expected_day})", False, 
                "Could not get schedule slots")
            return False
            
        all_slots = slots_response.json()
        expected_slots_count = 0
        
        for slot in all_slots:
            if expected_day in slot.get('days', []):
                expected_slots_count += 1
        
        # Now get daily tasks for the test date
        tasks_response = requests.get(f"{BACKEND_URL}/daily-tasks/{test_date}", timeout=10)
        
        if tasks_response.status_code == 200:
            tasks = tasks_response.json()
            
            if isinstance(tasks, list):
                # Check if number of tasks matches expected slots for this day
                if len(tasks) == expected_slots_count:
                    print_test_result(f"Daily Tasks Day Filtering ({expected_day})", True, 
                        f"Created {len(tasks)} tasks matching {expected_day} schedule slots (expected {expected_slots_count})")
                    return True
                else:
                    print_test_result(f"Daily Tasks Day Filtering ({expected_day})", False, 
                        f"Expected {expected_slots_count} tasks, got {len(tasks)} tasks")
                    return False
            else:
                print_test_result(f"Daily Tasks Day Filtering ({expected_day})", False, 
                    f"Expected task list, got {type(tasks)}")
                return False
        else:
            print_test_result(f"Daily Tasks Day Filtering ({expected_day})", False, 
                f"Status: {tasks_response.status_code}, Response: {tasks_response.text}")
            return False
            
    except Exception as e:
        print_test_result(f"Daily Tasks Day Filtering ({expected_day})", False, f"Error: {str(e)}")
        return False

def main():
    """Run all days-field related tests"""
    print("=" * 60)
    print("MOMENTUM PLANNER BACKEND API TEST SUITE")
    print("Days Field Functionality Testing")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    test_results = {}
    
    # 1. Verify all slots have days field
    success, slots = test_get_schedule_slots_days_field()
    test_results["schedule_slots_days_field"] = success
    
    # 2. Create new slot with specific days (weekdays)
    new_slot = test_create_schedule_slot_with_days()
    test_results["create_slot_with_days"] = new_slot is not None
    
    # 3. Update slot's days to weekend only
    if new_slot and 'id' in new_slot:
        test_results["update_slot_days"] = test_update_schedule_slot_days(new_slot['id'])
    else:
        test_results["update_slot_days"] = False
    
    # 4. Test bulk update preserves days field
    test_results["bulk_update_preserves_days"] = test_bulk_update_preserves_days()
    
    # 5. Test reset creates slots with correct day mappings
    test_results["reset_creates_days"] = test_reset_creates_slots_with_days()
    
    # 6. Test daily tasks filtering with different dates
    # Wednesday (weekday) - 2026-03-04 
    test_results["daily_tasks_wednesday"] = test_daily_tasks_day_filtering("2026-03-04", "wed")
    
    # Saturday (weekend) - 2026-03-07
    test_results["daily_tasks_saturday"] = test_daily_tasks_day_filtering("2026-03-07", "sat")
    
    # Clean up - delete test slot if created
    if new_slot and 'id' in new_slot:
        try:
            requests.delete(f"{BACKEND_URL}/schedule-slots/{new_slot['id']}", timeout=10)
            print("    🧹 Cleaned up test slot")
        except:
            pass
    
    # Summary
    print("=" * 60)
    print("DAYS FIELD TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name.replace('_', ' ').title()}")
    
    print("=" * 60)
    print(f"TOTAL: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL DAYS FIELD TESTS PASSED!")
        return True
    else:
        print(f"⚠️  {total - passed} tests failed")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)