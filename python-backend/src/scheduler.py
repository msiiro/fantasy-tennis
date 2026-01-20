"""
Scheduler to run data updates daily
"""
import schedule
import time
from datetime import datetime
from scraper import get_all_tennis_data
from supabase_client import update_player_rankings
from tennis_data_csv_scraper import scrape_and_store_csv_matches
from match_results import update_season_stats
from update_rankings import update_all_player_rankings, update_all_player_points

def update_tennis_data():
    """Main job to update all tennis data"""
    print(f"\n{'='*60}")
    print(f"🕐 Starting scheduled update at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    try:
        # 1. Download CSV match results
        print("📥 Step 1: Downloading CSV match data...")
        matches_inserted = scrape_and_store_csv_matches(year=2026, days_back=30)
        
        # 2. Update player rankings from matches table
        print("\n📊 Step 2: Updating player rankings from matches...")
        update_all_player_rankings()
        
        # 3. Update player points from matches table
        print("\n💯 Step 3: Updating player points from matches...")
        update_all_player_points()
        
        # 4. Update season stats based on match results
        if matches_inserted > 0:
            print("\n📈 Step 4: Updating season statistics...")
            update_season_stats()
        
        print(f"\n{'='*60}")
        print(f"✅ Update complete at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"❌ Error during update: {e}")
        import traceback
        traceback.print_exc()

def start_scheduler():
    """Start the scheduler"""
    print("🚀 Starting tennis data scheduler...")
    print(f"⏰ Will run daily at 06:00 UTC")
    print(f"   (Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
    
    # Schedule daily at 6 AM UTC
    schedule.every().day.at("06:00").do(update_tennis_data)
    
    # Run once immediately on startup
    print("\n📊 Running initial update...")
    update_tennis_data()
    
    # Keep running
    print("\n⏳ Scheduler running. Press Ctrl+C to stop.\n")
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute