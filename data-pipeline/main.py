#!/usr/bin/env python3
"""
Main script to fetch and sync tennis data
"""

import os
import sys

# Make sure we can import from current directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Now import
from fetch_matches import fetch_yesterday_and_today, save_to_file
from sync_to_supabase import sync_all

def main():
    print("🎾 TENNIS DATA PIPELINE 🎾\n")
    
    # Step 1: Fetch data from RapidAPI
    print("STEP 1: Fetching data from RapidAPI...")
    data = fetch_yesterday_and_today()
    
    if not data or data['total_tournaments'] == 0:
        print("✗ No data fetched. Exiting.")
        return
    
    # Step 2: Save to file
    save_to_file(data)
    
    # Step 3: Sync to Supabase
    print("\nSTEP 2: Syncing to Supabase...")
    sync_all()
    
    print("\n✅ PIPELINE COMPLETE!")

if __name__ == "__main__":
    main()