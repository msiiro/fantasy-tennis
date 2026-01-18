"""
Main entry point for tennis data scraper
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from scheduler import start_scheduler, update_tennis_data
from scraper import get_all_tennis_data
from supabase_client import update_player_rankings, insert_matches

def run_once():
    """Run data update once and exit"""
    print("🎾 Running one-time data update...\n")
    update_tennis_data()
    print("\n✅ One-time update complete!")

def run_scheduler():
    """Run continuous scheduler"""
    start_scheduler()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Tennis data scraper')
    parser.add_argument('--once', action='store_true', help='Run once and exit')
    parser.add_argument('--schedule', action='store_true', help='Run continuous scheduler')
    
    args = parser.parse_args()
    
    if args.once:
        run_once()
    elif args.schedule:
        run_scheduler()
    else:
        # Default: run once
        print("Usage:")
        print("  python main.py --once      # Run update once")
        print("  python main.py --schedule  # Run continuous scheduler")
        print("\nRunning once by default...\n")
        run_once()