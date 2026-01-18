"""
Scheduler to run data updates daily
"""
import schedule
import time
from datetime import datetime
from scraper import get_all_tennis_data
from supabase_client import update_player_rankings, insert_matches, clear_all_matches
from match_scraper import scrape_and_store_match_results
from match_results import update_season_stats

def update_tennis_data():
    """Main job to update all tennis data"""
    print(f"\n{'='*60}")
    print(f"🕐 Starting scheduled update at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    try:
        # 1. Scrape current rankings
        print("📊 Step 1: Updating player rankings...")
        data = get_all_tennis_data()
        
        if data['players']:
            update_player_rankings(data['players'])
        
        # 2. Scrape recent match results
        print("\n🎾 Step 2: Scraping match results...")
        matches_inserted = scrape_and_store_match_results(days_back=7)
        
        # 3. Update season stats based on new match results
        if matches_inserted > 0:
            print("\n📈 Step 3: Updating season statistics...")
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