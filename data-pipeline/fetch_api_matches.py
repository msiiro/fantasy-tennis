import http.client
import requests
import json
import sys
from datetime import datetime, timedelta
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration
RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
OUTPUT_FOLDER = "tennis_data"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def ensure_folder_exists(folder_path):
    """Create folder if it doesn't exist"""
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

def get_tennis_matches(date_str, save_to_file=True, subfolder=None):
    """
    Get tennis fixtures for a specific date
    
    Args:
        date_str: Format 'YYYY-MM-DD' (e.g., '2026-01-23')
        save_to_file: If True, saves the response to a JSON file
        subfolder: Optional subfolder within OUTPUT_FOLDER
    """
    conn = http.client.HTTPSConnection("tennisapi1.p.rapidapi.com")
    
    headers = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': "tennisapi1.p.rapidapi.com"
    }
    
    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    day = date_obj.day
    month = date_obj.month
    year = date_obj.year
    
    endpoint = f"/api/tennis/events/{day}/{month}/{year}"
    
    print(f"Requesting: {endpoint} for date {date_str}")
    
    try:
        conn.request("GET", endpoint, headers=headers)
        res = conn.getresponse()
        data = res.read()
        
        if res.status != 200:
            print(f"✗ Error: HTTP {res.status}")
            return None
        
        if not data:
            print(f"✗ Empty response")
            return None
        
        matches = json.loads(data.decode("utf-8"))
        
        if save_to_file:
            if subfolder:
                save_path = os.path.join(OUTPUT_FOLDER, subfolder)
            else:
                save_path = OUTPUT_FOLDER
            
            ensure_folder_exists(save_path)
            
            filename = f"matches_{date_str}.json"
            filepath = os.path.join(save_path, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(matches, f, indent=2, ensure_ascii=False)
            
            print(f"✓ Saved to: {filepath}")
        
        return matches
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return None
    finally:
        conn.close()

def should_include_event(event):
    """
    Check if an event should be included based on filters.
    Includes ATP, WTA, Challenger, WTA 125, and ITF singles events.
    Excludes doubles, junior, and youth events.
    
    Args:
        event: Single event/match from the API response
    
    Returns:
        Boolean: True if event should be included, False otherwise
    """
    category_name = event.get('tournament', {}).get('category', {}).get('name', '').upper()
    category_slug = event.get('tournament', {}).get('category', {}).get('slug', '').lower()
    
    tournament_name = event.get('tournament', {}).get('name', '').lower()
    season_name = event.get('season', {}).get('name', '').lower()
    
    event_filters = event.get('eventFilters', {})
    match_categories = event_filters.get('category', [])

    # Include ATP, WTA, Challenger, WTA 125, and ITF
    is_included_tour = category_name in ['ATP', 'WTA', 'CHALLENGER', 'WTA 125', 'ITF MEN', 'ITF WOMEN', 'ITF', 'UNITED CUP'] or \
                       category_slug in ['atp', 'wta', 'challenger', 'wta-125', 'itf-men', 'itf-women', 'itf', 'united-cup']
    
    # Singles only
    is_singles = 'singles' in match_categories
    
    # No doubles in name
    has_doubles_in_name = 'doubles' in tournament_name or 'doubles' in season_name or 'double' in season_name
    
    # Exclude only junior/youth (no longer excluding ITF)
    excluded_keywords = ['junior', 'youth', 'u18', 'u21']
    is_excluded = any(keyword in category_name.lower() for keyword in excluded_keywords)
    is_excluded = is_excluded or any(keyword in category_slug for keyword in excluded_keywords)
    is_excluded = is_excluded or any(keyword in tournament_name for keyword in excluded_keywords)
    is_excluded = is_excluded or any(keyword in season_name for keyword in excluded_keywords)
    
    should_include = is_included_tour and is_singles and not has_doubles_in_name and not is_excluded
    
    if not should_include:
        player1 = event.get('homeTeam', {}).get('shortName', 'Unknown')
        player2 = event.get('awayTeam', {}).get('shortName', 'Unknown')
        reason = []
        if not is_included_tour:
            reason.append(f"Not included tour ({category_name})")
        if not is_singles:
            reason.append(f"Not singles ({', '.join(match_categories)})")
        if has_doubles_in_name:
            reason.append("Doubles in name")
        if is_excluded:
            reason.append("Excluded category (junior/youth)")
        
        print(f"  ⊘ Filtered out: {player1} vs {player2} - {' | '.join(reason)}")
    
    return should_include

def ensure_players_exist(events):
    """
    Ensure all players in the events exist in the players table.
    Adds missing players as placeholders.
    """
    print(f"\nChecking for missing players...")
    
    players_to_check = {}
    
    for event in events:
        gender = event.get('eventFilters', {}).get('gender', [None])[0] if event.get('eventFilters', {}).get('gender') else None
        
        player1_id = event.get('homeTeam', {}).get('id')
        if player1_id:
            players_to_check[player1_id] = {
                'player_id': player1_id,
                'name': event.get('homeTeam', {}).get('name', event.get('homeTeam', {}).get('shortName', 'Unknown')),
                'short_name': event.get('homeTeam', {}).get('shortName'),
                'slug': event.get('homeTeam', {}).get('slug'),
                'country': event.get('homeTeam', {}).get('country', {}).get('alpha3') if event.get('homeTeam', {}).get('country') else None,
                'gender': gender
            }
        
        player2_id = event.get('awayTeam', {}).get('id')
        if player2_id:
            players_to_check[player2_id] = {
                'player_id': player2_id,
                'name': event.get('awayTeam', {}).get('name', event.get('awayTeam', {}).get('shortName', 'Unknown')),
                'short_name': event.get('awayTeam', {}).get('shortName'),
                'slug': event.get('awayTeam', {}).get('slug'),
                'country': event.get('awayTeam', {}).get('country', {}).get('alpha3') if event.get('awayTeam', {}).get('country') else None,
                'gender': gender
            }
    
    print(f"Found {len(players_to_check)} unique players in events")
    
    try:
        response = supabase.table('players').select('player_id').execute()
        existing_player_ids = {player['player_id'] for player in response.data}
        print(f"Found {len(existing_player_ids)} existing players in database")
    except Exception as e:
        print(f"✗ Error fetching existing players: {e}")
        return 0, 0
    
    missing_player_ids = set(players_to_check.keys()) - existing_player_ids
    
    if not missing_player_ids:
        print("✓ All players already exist in database")
        return 0, 0
    
    print(f"Found {len(missing_player_ids)} missing players to add")
    
    players_to_insert = [players_to_check[pid] for pid in missing_player_ids]
    
    added_count = 0
    error_count = 0
    
    batch_size = 100
    for i in range(0, len(players_to_insert), batch_size):
        batch = players_to_insert[i:i + batch_size]
        
        try:
            response = supabase.table('players').upsert(batch, on_conflict='player_id').execute()
            added_count += len(batch)
            print(f"  ✓ Upserted batch of {len(batch)} players")
        except Exception as e:
            error_count += len(batch)
            print(f"  ✗ Error upserting batch: {e}")
            
            for player in batch:
                try:
                    supabase.table('players').upsert(player, on_conflict='player_id').execute()
                    added_count += 1
                    error_count -= 1
                    print(f"    ✓ Upserted: {player['name']} (ID: {player['player_id']})")
                except Exception as e2:
                    print(f"    ✗ Failed to upsert {player['name']} (ID: {player['player_id']}): {e2}")
    
    print(f"\n✓ Player check complete: Added={added_count}, Errors={error_count}")
    return added_count, error_count

# ITF tier -> prize money (USD) mapping
# Used to populate tennis_points for ITF events that lack the tennisPoints field
ITF_POINTS_MAP = {
    # Women's tiers
    'w15':  15,
    'w25':  25,
    'w35':  35,
    'w50':  50,
    'w60':  60,
    'w75':  75,
    'w100': 10,
    # Men's tiers
    'm15':  15,
    'm25':  25,
}

def get_itf_tennis_points(event):
    """
    Extract tennis_points for ITF events by parsing the tier from
    tournament name or slug (e.g. 'ITF W15 Manacor Women' -> 15).
    Returns None if the tier cannot be determined.
    """
    tournament = event.get('tournament', {})
    category_name = tournament.get('category', {}).get('name', '').upper()

    if 'ITF' not in category_name:
        return None

    sources = [
        tournament.get('name', '').lower(),
        tournament.get('slug', '').lower(),
        tournament.get('uniqueTournament', {}).get('name', '').lower(),
        tournament.get('uniqueTournament', {}).get('slug', '').lower(),
    ]

    import re
    for source in sources:
        match = re.search(r'\b([wm]\d{2,3})\b', source)
        if match:
            tier = match.group(1)
            if tier in ITF_POINTS_MAP:
                return ITF_POINTS_MAP[tier]

    return None

def transform_match_data(event):
    """Transform match data from API format to database format"""
    api_tennis_points = event.get('tournament', {}).get('uniqueTournament', {}).get('tennisPoints')
    tennis_points = api_tennis_points if api_tennis_points is not None else get_itf_tennis_points(event)

    transformed = {
        'match_id': event.get('id'),
        'player1_id': event.get('homeTeam', {}).get('id'),
        'player2_id': event.get('awayTeam', {}).get('id'),
        'player1_score_current': event.get('homeScore', {}).get('current'),
        'player1_score_display': event.get('homeScore', {}).get('display'),
        'player1_set1_score': event.get('homeScore', {}).get('period1'),
        'player1_set2_score': event.get('homeScore', {}).get('period2'),
        'player1_set3_score': event.get('homeScore', {}).get('period3'),
        'player1_set4_score': event.get('homeScore', {}).get('period4'),
        'player1_set5_score': event.get('homeScore', {}).get('period5'),
        'player1_set1_tiebreak': event.get('homeScore', {}).get('period1TieBreak'),
        'player1_set2_tiebreak': event.get('homeScore', {}).get('period2TieBreak'),
        'player1_set3_tiebreak': event.get('homeScore', {}).get('period3TieBreak'),
        'player1_current_point': event.get('homeScore', {}).get('point'),
        'player2_score_current': event.get('awayScore', {}).get('current'),
        'player2_score_display': event.get('awayScore', {}).get('display'),
        'player2_set1_score': event.get('awayScore', {}).get('period1'),
        'player2_set2_score': event.get('awayScore', {}).get('period2'),
        'player2_set3_score': event.get('awayScore', {}).get('period3'),
        'player2_set4_score': event.get('awayScore', {}).get('period4'),
        'player2_set5_score': event.get('awayScore', {}).get('period5'),
        'player2_set1_tiebreak': event.get('awayScore', {}).get('period1TieBreak'),
        'player2_set2_tiebreak': event.get('awayScore', {}).get('period2TieBreak'),
        'player2_set3_tiebreak': event.get('awayScore', {}).get('period3TieBreak'),
        'player2_current_point': event.get('awayScore', {}).get('point'),
        'status_code': event.get('status', {}).get('code'),
        'status_description': event.get('status', {}).get('description'),
        'status_type': event.get('status', {}).get('type'),
        'winner_code': event.get('winnerCode'),
        'first_to_serve': event.get('firstToServe'),
        'tournament_id': event.get('tournament', {}).get('id'),
        'tournament_name': event.get('tournament', {}).get('name'),
        'tournament_slug': event.get('tournament', {}).get('slug'),
        'unique_tournament_id': event.get('tournament', {}).get('uniqueTournament', {}).get('id'),
        'unique_tournament_name': event.get('tournament', {}).get('uniqueTournament', {}).get('name'),
        'unique_tournament_slug': event.get('tournament', {}).get('uniqueTournament', {}).get('slug'),
        'category_id': event.get('tournament', {}).get('category', {}).get('id'),
        'category_name': event.get('tournament', {}).get('category', {}).get('name'),
        'category_slug': event.get('tournament', {}).get('category', {}).get('slug'),
        'season_id': event.get('season', {}).get('id'),
        'season_name': event.get('season', {}).get('name'),
        'season_year': event.get('season', {}).get('year'),
        'round_number': event.get('roundInfo', {}).get('round'),
        'round_name': event.get('roundInfo', {}).get('name'),
        'round_type': event.get('roundInfo', {}).get('cupRoundType'),
        'ground_type': event.get('groundType'),
        'tennis_points': tennis_points,
        'start_timestamp': event.get('startTimestamp'),
        'gender': event.get('eventFilters', {}).get('gender', [None])[0] if event.get('eventFilters', {}).get('gender') else None,
        'match_type': event.get('eventFilters', {}).get('category', [None])[0] if event.get('eventFilters', {}).get('category') else None,
        'level': event.get('eventFilters', {}).get('level', [None])[0] if event.get('eventFilters', {}).get('level') else None,
        'tournament_type': event.get('eventFilters', {}).get('tournament', [None])[0] if event.get('eventFilters', {}).get('tournament') else None,
        'processed_at': datetime.now().isoformat()
    }
    
    if transformed['start_timestamp']:
        transformed['match_date'] = datetime.fromtimestamp(transformed['start_timestamp']).isoformat()
    
    return transformed

def process_and_upsert_matches(matches_data, table_name='tennis_matches'):
    """
    Process match data and upsert into Supabase.
    Includes ATP, WTA, Challenger, WTA 125, and ITF singles events.
    """
    if not matches_data:
        print("No data to process")
        return []
    
    events = matches_data.get('events', [])
    
    if not events:
        print("No events found in data")
        return []
    
    print(f"Total events received: {len(events)}")
    
    filtered_events = [event for event in events if should_include_event(event)]
    
    print(f"Events after filtering: {len(filtered_events)}")
    
    if not filtered_events:
        print("No events to process after filtering")
        return []
    
    ensure_players_exist(filtered_events)
    
    upserted_records = []
    failed_records = []
    
    print(f"\nProcessing {len(filtered_events)} matches...")
    
    for event in filtered_events:
        try:
            transformed_match = transform_match_data(event)
            
            response = supabase.table(table_name).upsert(
                transformed_match,
                on_conflict='match_id'
            ).execute()
            
            upserted_records.append(transformed_match)
            # match_info = f"{event.get('homeTeam', {}).get('shortName')} vs {event.get('awayTeam', {}).get('shortName')}"
            # tournament_info = f"{transformed_match.get('category_name')} - {transformed_match.get('tournament_name')}"
            # print(f"✓ Upserted: {match_info} | {tournament_info}")
            
        except Exception as e:
            print(f"✗ Failed to upsert match: {e}")
            match_info = f"{event.get('homeTeam', {}).get('shortName')} vs {event.get('awayTeam', {}).get('shortName')}"
            print(f"   Match: {match_info}")
            failed_records.append({'event': event, 'error': str(e)})
    
    print(f"\n✓ Successfully upserted: {len(upserted_records)}")
    print(f"✗ Failed: {len(failed_records)}")
    
    if failed_records:
        error_file = f"errors_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(error_file, 'w') as f:
            json.dump(failed_records, f, indent=2)
        print(f"Failed records saved to: {error_file}")
    
    return upserted_records

def fetch_and_store_matches(date_str, table_name='tennis_matches'):
    """Fetch matches for a date and store in Supabase"""
    print(f"\n{'='*60}")
    print(f"Fetching and storing matches for {date_str}")
    print(f"{'='*60}\n")
    
    matches = get_tennis_matches(date_str, save_to_file=True)
    
    if not matches:
        print("No matches fetched from API")
        return None
    
    results = process_and_upsert_matches(matches, table_name)
    return results

def bulk_fetch_and_store(days_back=1, days_forward=2, table_name='tennis_matches'):
    """Fetch and store matches for multiple days"""
    today = datetime.now()
    all_results = {}
    
    print(f"\nFetching matches for {days_back + 1 + days_forward} days")
    print(f"Including: ATP, WTA, Challenger, WTA 125, ITF Singles")
    print(f"Excluding: Doubles, Junior, Youth\n")
    
    for i in range(days_back, 0, -1):
        date = today - timedelta(days=i)
        date_str = date.strftime('%Y-%m-%d')
        results = fetch_and_store_matches(date_str, table_name)
        if results:
            all_results[date_str] = results
    
    today_str = today.strftime('%Y-%m-%d')
    results = fetch_and_store_matches(today_str, table_name)
    if results:
        all_results[today_str] = results
    
    for i in range(1, days_forward + 1):
        date = today + timedelta(days=i)
        date_str = date.strftime('%Y-%m-%d')
        results = fetch_and_store_matches(date_str, table_name)
        if results:
            all_results[date_str] = results
    
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total dates processed: {len(all_results)}")
    total_matches = sum(len(matches) for matches in all_results.values())
    print(f"Total matches stored: {total_matches}")
    
    category_counts = {}
    for matches in all_results.values():
        for match in matches:
            category = match.get('category_name', 'Unknown')
            category_counts[category] = category_counts.get(category, 0) + 1
    
    print(f"\nBreakdown by category:")
    for category, count in sorted(category_counts.items()):
        print(f"  {category}: {count} matches")
    
    return all_results

def call_supabase_function(function_name):
    """Call Supabase Edge Function via HTTP"""
    supabase_url = os.environ.get('SUPABASE_URL', supabase.supabase_url)
    supabase_key = os.environ.get('SUPABASE_SERVICE_KEY', supabase.supabase_key)
    
    function_url = f"{supabase_url}/functions/v1/{function_name}"
    headers = {
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json'
    }
    
    try:
        print(f"   Calling: {function_url}")
        response = requests.post(function_url, headers=headers, timeout=300)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"   ✓ Success")
            return response.json() if response.text else None
        else:
            print(f"   ✗ Error: {response.text}")
            return None
    except requests.exceptions.Timeout:
        print(f"   ✗ Timeout after 300 seconds")
        return None
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return None


if __name__ == "__main__":

    if len(sys.argv) > 1:
        target_date = sys.argv[1]
        
        try:
            datetime.strptime(target_date, '%Y-%m-%d')
        except ValueError:
            print("❌ Invalid date format. Please use YYYY-MM-DD (e.g., '2026-01-20')")
            sys.exit(1)
        
        print("="*60)
        print("TENNIS MATCH DATA FETCHER - MANUAL MODE (WITH ITF)")
        print("="*60)
        print(f"\nFetching matches for: {target_date}")
        print("\nIncluding: ATP, WTA, Challenger, WTA 125, ITF Singles")
        print("Excluding: Doubles, Junior, Youth\n")
        
        results = fetch_and_store_matches(target_date)

        try:
            print("\n1. Calling 'process_unlogged_matches'...")
            response = supabase.rpc('process_unlogged_matches').execute()
            print(f"   ✓ Success: {response.data}")
        except Exception as e:
            print(f"   ✗ Error: {e}")

        try:
            print("\n2. Calling 'update_all_team_points'...")
            response = supabase.rpc('update_all_team_points').execute()
            print(f"   ✓ Success: {response.data}")
        except Exception as e:
            print(f"   ✗ Error: {e}")
        
        if results:
            print(f"\n✓ Successfully processed {len(results)} matches")
        else:
            print("\n⚠️ No matches found or error occurred")
        
    else:
        print("="*60)
        print("TENNIS MATCH DATA FETCHER (WITH ITF)")
        print("="*60)
        print("\nAutomatically fetching: Yesterday, Today, Tomorrow, Day after tomorrow")
        print("Including: ATP, WTA, Challenger, WTA 125, ITF Singles")
        print("Excluding: Doubles, Junior, Youth\n")
        
        results = bulk_fetch_and_store(
            days_back=1,
            days_forward=2,
            table_name='tennis_matches'
        )

        try:
            print("\n1. Calling 'process_unlogged_matches'...")
            response = supabase.rpc('process_unlogged_matches').execute()
            print(f"   ✓ Success: {response.data}")
        except Exception as e:
            print(f"   ✗ Error: {e}")

        try:
            print("\n2. Calling 'update_all_team_points'...")
            response = supabase.rpc('update_all_team_points').execute()
            print(f"   ✓ Success: {response.data}")
        except Exception as e:
            print(f"   ✗ Error: {e}")
        
        print("\n" + "="*60)
        print("COMPLETE!")
        print("="*60)