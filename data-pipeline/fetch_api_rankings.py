import http.client
import json
from datetime import datetime, date
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration
RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_rankings(ranking_type='atp'):
    """
    Fetch player rankings from API
    
    Args:
        ranking_type: 'atp' or 'wta'
    
    Returns:
        Raw JSON data from API
    """
    conn = http.client.HTTPSConnection("tennisapi1.p.rapidapi.com")
    
    headers = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': "tennisapi1.p.rapidapi.com"
    }
    
    endpoint = f"/api/tennis/rankings/{ranking_type}"
    
    print(f"Requesting: {endpoint}")
    
    try:
        conn.request("GET", endpoint, headers=headers)
        res = conn.getresponse()
        data = res.read()
        
        if res.status != 200:
            print(f"✗ Error: HTTP {res.status}")
            print(f"Response: {data.decode('utf-8')[:500]}")
            return None
        
        if not data:
            print("✗ Empty response")
            return None
        
        rankings_data = json.loads(data.decode("utf-8"))
        return rankings_data
        
    except Exception as e:
        print(f"✗ Error fetching {ranking_type.upper()} rankings: {e}")
        return None
    finally:
        conn.close()

def upsert_player(player_data):
    """
    Insert or update player in players table
    
    Args:
        player_data: Player data from rankings API
    
    Returns:
        Player ID
    """
    try:
        player_record = {
            'player_id': player_data.get('id'),
            'name': player_data.get('name'),
            'slug': player_data.get('slug'),
            'short_name': player_data.get('shortName'),
            'name_code': player_data.get('nameCode'),
            'country': player_data.get('country', {}).get('name'),
            'country_code': player_data.get('country', {}).get('alpha2'),
            'gender': player_data.get('gender'),
            'sport_id': player_data.get('sport', {}).get('id'),
            'user_count': player_data.get('userCount'),
            'disabled': player_data.get('disabled', False),
            'national': player_data.get('national', False),
            'type': player_data.get('type'),
            'team_colors': json.dumps(player_data.get('teamColors', {}))
        }
        
        # Upsert player
        response = supabase.table('players').upsert(
            player_record,
            on_conflict='player_id'
        ).execute()
        
        return player_data.get('id')
        
    except Exception as e:
        print(f"✗ Failed to upsert player {player_data.get('name')}: {e}")
        return None

def insert_ranking(ranking_entry, ranking_type, ranking_date):
    """
    Insert ranking record for a player
    
    Args:
        ranking_entry: Single ranking entry from API
        ranking_type: 'atp' or 'wta'
        ranking_date: Date of the ranking (YYYY-MM-DD)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # First, upsert the player
        player_data = ranking_entry.get('team') or ranking_entry.get('player')
        if not player_data:
            print(f"✗ No player data found in ranking entry")
            return False
        
        player_id = upsert_player(player_data)
        if not player_id:
            return False
        
        # Then insert the ranking
        ranking_record = {
            'player_id': player_id,
            'ranking_date': ranking_date,
            'ranking_type': ranking_type,
            'rank': ranking_entry.get('ranking'),
            'points': ranking_entry.get('points'),
            'ranking_movement': ranking_entry.get('rankingMovement'),
            'tournaments_played': ranking_entry.get('tournamentsPlayed'),
            'raw_data': json.dumps(ranking_entry)
        }
        
        # Upsert ranking (update if exists for same player/date/type)
        response = supabase.table('player_rankings').upsert(
            ranking_record,
            on_conflict='player_id,ranking_date,ranking_type'
        ).execute()
        
        return True
        
    except Exception as e:
        print(f"✗ Failed to insert ranking: {e}")
        return False

def process_rankings(rankings_data, ranking_type, ranking_date=None):
    """
    Process and store rankings data
    
    Args:
        rankings_data: Raw JSON from API
        ranking_type: 'atp' or 'wta'
        ranking_date: Date string (YYYY-MM-DD), defaults to today
    
    Returns:
        Number of rankings processed
    """
    if not rankings_data:
        print("No rankings data to process")
        return 0
    
    # Use provided date or today
    if ranking_date is None:
        ranking_date = date.today().isoformat()
    
    # Extract rankings array
    rankings = rankings_data.get('rankings', [])
    
    if not rankings:
        print("No rankings found in data")
        return 0
    
    print(f"\nProcessing {len(rankings)} {ranking_type.upper()} rankings for {ranking_date}...")
    
    success_count = 0
    failed_count = 0
    
    for ranking_entry in rankings:
        if insert_ranking(ranking_entry, ranking_type, ranking_date):
            player_name = ranking_entry.get('team', {}).get('name') or ranking_entry.get('player', {}).get('name', 'Unknown')
            rank = ranking_entry.get('ranking')
            points = ranking_entry.get('points')
            print(f"✓ Rank {rank}: {player_name} ({points} pts)")
            success_count += 1
        else:
            failed_count += 1
    
    print(f"\n✓ Successfully processed: {success_count}")
    print(f"✗ Failed to process: {failed_count}")
    
    return success_count

def fetch_and_store_rankings(ranking_types=['atp', 'wta'], ranking_date=None):
    """
    Fetch and store rankings for ATP and/or WTA
    
    Args:
        ranking_types: List of ranking types to fetch ['atp', 'wta']
        ranking_date: Date string (YYYY-MM-DD), defaults to today
    """
    if ranking_date is None:
        ranking_date = date.today().isoformat()
    
    print("="*60)
    print(f"TENNIS RANKINGS FETCHER - {ranking_date}")
    print("="*60)
    
    total_processed = 0
    
    for ranking_type in ranking_types:
        print(f"\n{'='*60}")
        print(f"Fetching {ranking_type.upper()} Rankings")
        print(f"{'='*60}\n")
        
        # Fetch rankings from API
        rankings_data = get_rankings(ranking_type)
        
        if not rankings_data:
            print(f"Failed to fetch {ranking_type.upper()} rankings")
            continue
        
        # Process and store rankings
        count = process_rankings(rankings_data, ranking_type, ranking_date)
        total_processed += count
    
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Total rankings processed: {total_processed}")
    print(f"Date: {ranking_date}")
    print("="*60)
    
    return total_processed

# Main execution
if __name__ == "__main__":
    # Check if a date argument was provided
    if len(sys.argv) > 1:
        # Manual mode with specific date
        target_date = sys.argv[1]
        
        # Validate date format
        try:
            datetime.strptime(target_date, '%Y-%m-%d')
        except ValueError:
            print("❌ Invalid date format. Please use YYYY-MM-DD (e.g., '2026-01-20')")
            sys.exit(1)
        
        print(f"\n📅 Manual mode: Fetching rankings for {target_date}\n")
        fetch_and_store_rankings(ranking_types=['atp', 'wta'], ranking_date=target_date)
        
    else:
        # Scheduled mode: Use today's date
        print(f"\n📅 Scheduled mode: Fetching today's rankings\n")
        fetch_and_store_rankings(ranking_types=['atp', 'wta'])
    
    print("\n✅ COMPLETE!\n")