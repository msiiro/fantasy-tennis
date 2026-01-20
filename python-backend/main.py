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
from tennis_data_csv_scraper import scrape_and_store_csv_matches, download_tennis_data_csv, process_matches_dataframe, insert_match_from_csv
from update_rankings import update_all_player_rankings, update_all_player_points

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

def run_csv_scraper():
    """Download and process CSV match data"""
    print("📥 Downloading CSV match data...\n")
    count = scrape_and_store_csv_matches(year=2026, days_back=30)
    if count > 0:
        # Update rankings from matches
        update_all_player_rankings()
        update_all_player_points()
        update_season_stats()
    print(f"\n✅ Inserted {count} matches from CSV")

def update_rankings():
    """Update player rankings and points from matches table"""
    print("📊 Updating rankings from matches...\n")
    update_all_player_rankings()
    update_all_player_points()
    print("\n✅ Rankings updated!")

def load_full_year(year=2025):
    """
    Load entire year of match data (no date filtering)
    Use this for initial data load or backfilling
    """
    import time
    
    print(f"\n{'='*60}")
    print(f"📥 Loading full {year} season data...")
    print(f"{'='*60}\n")
    
    # Download ATP full year
    df_atp = download_tennis_data_csv(year, 'ATP')
    
    # Process ALL matches (days_back=9999 to include everything)
    if df_atp is not None:
        print(f"Processing ALL {len(df_atp)} ATP matches from {year}...")
        atp_matches = process_matches_dataframe(df_atp, days_back=9999)
    else:
        atp_matches = []
        print("⚠️ No ATP data available")
    
    time.sleep(2)
    
    # Download WTA full year
    df_wta = download_tennis_data_csv(year, 'WTA')
    
    if df_wta is not None:
        print(f"Processing ALL {len(df_wta)} WTA matches from {year}...")
        wta_matches = process_matches_dataframe(df_wta, days_back=9999)
    else:
        wta_matches = []
        print("⚠️ No WTA data available")
    
    all_matches = atp_matches + wta_matches
    
    if not all_matches:
        print("\n⚠️ No matches to insert")
        return 0
    
    print(f"\n💾 Inserting {len(all_matches)} matches into database...")
    print("   (This may take a few minutes...)")
    
    # Insert matches
    inserted_count = 0
    for i, match in enumerate(all_matches):
        result = insert_match_from_csv(match)
        if result:
            inserted_count += 1
            if inserted_count % 100 == 0:
                print(f"   Inserted {inserted_count}/{len(all_matches)} matches...")
    
    print(f"\n✅ Inserted {inserted_count} new matches from {year}")
    print(f"   (Skipped {len(all_matches) - inserted_count} duplicates)")
    
    # Update rankings and points
    print("\n" + "="*60)
    print("📊 Updating player rankings and points...")
    print("="*60 + "\n")
    
    update_all_player_rankings()
    update_all_player_points()
    
    print("\n📈 Updating season statistics...")
    update_season_stats()
    
    print(f"\n{'='*60}")
    print(f"🎉 Full {year} season loaded successfully!")
    print(f"{'='*60}\n")
    
    return inserted_count

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
    
    parser = argparse.ArgumentParser(
        description='Tennis data scraper for fantasy tennis league',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --load-year 2025        # Load full 2025 season (one-time)
  python main.py --load-year 2024        # Load full 2024 season (backfill)
  python main.py --csv                   # Load recent matches (last 30 days)
  python main.py --update-rankings       # Update rankings from existing matches
  python main.py --once                  # Full update (matches + rankings)
  python main.py --schedule              # Run continuous daily scheduler
        """
    )
    
    parser.add_argument('--once', action='store_true', 
                       help='Run full update once and exit')
    parser.add_argument('--schedule', action='store_true', 
                       help='Run continuous scheduler (updates daily)')
    parser.add_argument('--matches', action='store_true', 
                       help='Scrape match results only (web scraping)')
    parser.add_argument('--csv', action='store_true', 
                       help='Download recent CSV match data (last 30 days)')
    parser.add_argument('--update-rankings', action='store_true', 
                       help='Update player rankings from matches table')
    parser.add_argument('--load-year', type=int, metavar='YEAR',
                       help='Load entire year of data (e.g., --load-year 2025)')
    parser.add_argument('--fallback', action='store_true', 
                       help='Load fallback match data for testing')
    
    args = parser.parse_args()
    
    # Execute based on arguments
    if args.once:
        run_once()
    elif args.schedule:
        run_scheduler()
    elif args.matches:
        run_match_scraper_only()
    elif args.csv:
        run_csv_scraper()
    elif args.update_rankings:
        update_rankings()
    elif args.load_year:
        load_full_year(args.load_year)
    elif args.fallback:
        load_fallback_matches()
    else:
        # No arguments - show help
        parser.print_help()
        print("\n" + "="*60)
        print("💡 Quick Start:")
        print("="*60)
        print("\n1. First time setup:")
        print("   python main.py --load-year 2024")
        print("   python main.py --load-year 2025")
        print("\n2. Daily updates:")
        print("   python main.py --csv")
        print("\n3. Update rankings:")
        print("   python main.py --update-rankings")
        print("\n4. Run on schedule:")
        print("   python main.py --schedule")
        print("\n" + "="*60 + "\n")