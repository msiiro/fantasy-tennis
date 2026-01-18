"""
Scheduler to run data updates daily
"""
import schedule
import time
from datetime import datetime
from scraper import get_all_tennis_data
from supabase_client import update_player_rankings, insert_matches, clear_all_matches

def update_tennis_data():
    """Main job to update all tennis data"""
    print(f"\n{'='*60}")
    print(f"🕐 Starting scheduled update at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    try:
        # Scrape data
        data = get_all_tennis_data()
        
        # Update database
        if data['players']:
            update_player_rankings(data['players'])
        
        if data['matches']:
            clear_all_matches()  # Clear old matches
            insert_matches(data['matches'])
        
        print(f"\n{'='*60}")
        print(f"✅ Update complete at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"❌ Error during update: {e}")

def start_scheduler():
    """Start the scheduler"""
    print("🚀 Starting tennis data scheduler...")
    print(f"⏰ Will run daily at 00:00 UTC")
    print(f"   (Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
    
    # Schedule daily at midnight UTC
    schedule.every().day.at("00:00").do(update_tennis_data)
    
    # Run once immediately on startup
    print("\n📊 Running initial update...")
    update_tennis_data()
    
    # Keep running
    print("\n⏳ Scheduler running. Press Ctrl+C to stop.\n")
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute