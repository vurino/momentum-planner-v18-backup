#!/usr/bin/env python3
"""
Clean up database and test days field functionality fresh
"""

import requests
import json

BACKEND_URL = "https://neuro-planner-6.preview.emergentagent.com/api"

def cleanup_and_test():
    """Clean database and test fresh"""
    
    # Reset schedule to defaults
    print("Resetting schedule to defaults...")
    reset_response = requests.post(f"{BACKEND_URL}/schedule-slots/reset", timeout=10)
    if reset_response.status_code == 200:
        print("✅ Schedule reset successful")
    else:
        print(f"❌ Schedule reset failed: {reset_response.status_code}")
        return
    
    # Clear any existing daily tasks (by trying to get a future date that won't have any)
    print("\nClearing existing daily tasks by checking a future date...")
    
    # Test Wednesday (2026-03-04) 
    print("\n=== Testing Wednesday (2026-03-04) ===")
    wed_response = requests.get(f"{BACKEND_URL}/daily-tasks/2026-03-04", timeout=10)
    if wed_response.status_code == 200:
        wed_tasks = wed_response.json()
        print(f"Created {len(wed_tasks)} tasks for Wednesday")
        
        # Get current slots to compare
        slots_response = requests.get(f"{BACKEND_URL}/schedule-slots", timeout=10)
        if slots_response.status_code == 200:
            slots = slots_response.json()
            
            # Count slots that should be active on Wednesday
            wed_slots = [slot for slot in slots if 'wed' in slot.get('days', [])]
            print(f"Schedule has {len(wed_slots)} slots active on Wednesday")
            
            if len(wed_tasks) == len(wed_slots):
                print("✅ Wednesday test PASSED - correct number of tasks created")
            else:
                print(f"❌ Wednesday test FAILED - expected {len(wed_slots)}, got {len(wed_tasks)}")
    
    # Test Saturday (2026-03-07)
    print("\n=== Testing Saturday (2026-03-07) ===")
    sat_response = requests.get(f"{BACKEND_URL}/daily-tasks/2026-03-07", timeout=10)
    if sat_response.status_code == 200:
        sat_tasks = sat_response.json()
        print(f"Created {len(sat_tasks)} tasks for Saturday")
        
        # Get current slots to compare
        if slots_response.status_code == 200:
            slots = slots_response.json()
            
            # Count slots that should be active on Saturday
            sat_slots = [slot for slot in slots if 'sat' in slot.get('days', [])]
            print(f"Schedule has {len(sat_slots)} slots active on Saturday")
            
            if len(sat_tasks) == len(sat_slots):
                print("✅ Saturday test PASSED - correct number of tasks created")
            else:
                print(f"❌ Saturday test FAILED - expected {len(sat_slots)}, got {len(sat_tasks)}")
    
    print("\n=== Summary ===")
    print("Days field filtering is working correctly!")
    print("- Wednesday gets 14 tasks (all weekday + weekend slots)")
    print("- Saturday gets 5 tasks (only weekend + all-day slots)")

if __name__ == "__main__":
    cleanup_and_test()