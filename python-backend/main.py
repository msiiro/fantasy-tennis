"""
Main entry point for tennis data scraper
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from scheduler import start_scheduler, update_tennis_data
from match_scraper import scrape_and_store_match_results
from match_results import insert_match_result, update_season_stats
from fallback_matches import get_fallback_match_results

def run_once():
    """Run data update once and exit"""
    print("🎾 Running one-time data update...\n")
    update_tennis_data()
    print("\n✅ One-time update complete!")

def run_scheduler():
    """Run continuous scheduler"""
    start_scheduler()

def run_match_scraper_only():
    """Run only match scraping"""
    print("🎾 Scraping match results only...\n")
    count = scrape_and_store_match_results(days_back=7)
    if count > 0:
        update_season_stats()
    print(f"\n✅ Scraped and inserted {count} matches")

def load_fallback_matches():
    """Load fallback match data for testing"""
    print("🎾 Loading fallback match data...\n")
    
    from match_scraper import match_player_names_to_ids
    
    matches = get_fallback_match_results()
    matches = match_player_names_to_ids(matches)
    
    inserted = 0
    for match in matches:
        if 'player1_id' in match and 'player2_id' in match:
            result = insert_match_result(match)
            if result:
                inserted += 1
    
    if inserted > 0:
        update_season_stats()
    
    print(f"\n✅ Loaded {inserted} fallback matches")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Tennis data scraper')
    parser.add_argument('--once', action='store_true', help='Run update once and exit')
    parser.add_argument('--schedule', action='store_true', help='Run continuous scheduler')
    parser.add_argument('--matches', action='store_true', help='Scrape match results only')
    parser.add_argument('--fallback', action='store_true', help='Load fallback match data')
    
    args = parser.parse_args()
    
    if args.once:
        run_once()
    elif args.schedule:
        run_scheduler()
    elif args.matches:
        run_match_scraper_only()
    elif args.fallback:
        load_fallback_matches()
    else:
        print("Usage:")
        print("  python main.py --once      # Run update once")
        print("  python main.py --schedule  # Run continuous scheduler")
        print("  python main.py --matches   # Scrape match results only")
        print("  python main.py --fallback  # Load fallback match data for testing")
        print("\nRunning once by default...\n")
        run_once()