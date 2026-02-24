import json
import sys
from datetime import datetime
from pathlib import Path
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
INPUT_FOLDER = "tennis_data"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def should_include_event(event):
    """
    Check if an event should be included based on filters.
    Includes ATP, WTA, Challenger, WTA 125, and ITF singles events.
    Excludes doubles, junior, and youth events.
    """
    category_name = event.get('tournament', {}).get('category', {}).get('name', '').upper()
    category_slug = event.get('tournament', {}).get('category', {}).get('slug', '').lower()
    
    tournament_name = event.get('tournament', {}).get('name', '').lower()
    season_name = event.get('season', {}).get('name', '').lower()
    
    event_filters = event.get('eventFilters', {})
    match_categories = event_filters.get('category', [])

    is_included_tour = category_name in ['ATP', 'WTA', 'CHALLENGER', 'WTA 125', 'ITF MEN', 'ITF WOMEN', 'ITF'] or \
                       category_slug in ['atp', 'wta', 'challenger', 'wta-125', 'itf-men', 'itf-women', 'itf']
    
    is_singles = 'singles' in match_categories
    
    has_doubles_in_name = 'doubles' in tournament_name or 'doubles' in season_name or 'double' in season_name
    
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
    """Ensure all players in the events exist in the players table."""
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
            supabase.table('players').upsert(batch, on_conflict='player_id').execute()
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
                except Exception as e2:
                    print(f"    ✗ Failed: {player['name']} (ID: {player['player_id']}): {e2}")
    
    print(f"\n✓ Player check complete: Added={added_count}, Errors={error_count}")
    return added_count, error_count

# ITF tier -> prize money (USD) mapping
# Used to populate tennis_points for ITF events that lack the tennisPoints field
ITF_POINTS_MAP = {
    # Women's tiers
    'w15':  15,
    'w25':  25,
    'w35':  35,
    'w60':  60,
    'w50':  50,
    'w75':  75,
    'w100': 100,
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

    # Only applies to ITF events
    if 'ITF' not in category_name:
        return None

    # Try name first, then slug - both usually contain the tier
    sources = [
        tournament.get('name', '').lower(),
        tournament.get('slug', '').lower(),
        tournament.get('uniqueTournament', {}).get('name', '').lower(),
        tournament.get('uniqueTournament', {}).get('slug', '').lower(),
    ]

    import re
    for source in sources:
        # Match patterns like w15, w25, w35, w60, w100, m15, m25
        match = re.search(r'\b([wm]\d{2,3})\b', source)
        if match:
            tier = match.group(1)
            if tier in ITF_POINTS_MAP:
                return ITF_POINTS_MAP[tier]

    return None

def transform_match_data(event):
    """Transform match data from API format to database format"""
    # Prefer the API's tennisPoints value; fall back to ITF tier parsing
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

def process_file(filepath, table_name='tennis_matches'):
    """
    Load a single JSON file and upsert its matches into Supabase.
    
    Args:
        filepath: Path to the JSON file
        table_name: Supabase table name
    
    Returns:
        Tuple of (upserted_count, failed_count)
    """
    print(f"\n{'='*60}")
    print(f"Processing: {filepath}")
    print(f"{'='*60}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    events = data.get('events', []) if isinstance(data, dict) else data
    print(f"Total events in file: {len(events)}")
    
    filtered_events = [e for e in events if should_include_event(e)]
    print(f"Events after filtering: {len(filtered_events)}")
    
    if not filtered_events:
        print("No events to process after filtering")
        return 0, 0
    
    ensure_players_exist(filtered_events)
    
    upserted = 0
    failed = 0
    failed_records = []
    
    for event in filtered_events:
        try:
            transformed = transform_match_data(event)
            supabase.table(table_name).upsert(transformed, on_conflict='match_id').execute()
            upserted += 1
            match_info = f"{event.get('homeTeam', {}).get('shortName')} vs {event.get('awayTeam', {}).get('shortName')}"
            tour_info = f"{transformed.get('category_name')} - {transformed.get('tournament_name')}"
            print(f"✓ {match_info} | {tour_info}")
        except Exception as e:
            failed += 1
            match_info = f"{event.get('homeTeam', {}).get('shortName')} vs {event.get('awayTeam', {}).get('shortName')}"
            print(f"✗ Failed: {match_info} - {e}")
            failed_records.append({'event': event, 'error': str(e)})
    
    if failed_records:
        error_file = f"errors_{Path(filepath).stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(error_file, 'w') as f:
            json.dump(failed_records, f, indent=2)
        print(f"Failed records saved to: {error_file}")
    
    print(f"\n  ✓ Upserted: {upserted} | ✗ Failed: {failed}")
    return upserted, failed

def process_all_files(folder=INPUT_FOLDER, table_name='tennis_matches'):
    """
    Loop through all JSON files in the folder and upsert to Supabase.
    
    Args:
        folder: Path to folder containing JSON files
        table_name: Supabase table name
    """
    json_files = sorted(Path(folder).glob("*.json"))
    
    if not json_files:
        print(f"No JSON files found in {folder}")
        return
    
    print(f"Found {len(json_files)} files to process in '{folder}'")
    
    total_upserted = 0
    total_failed = 0
    
    for filepath in json_files:
        upserted, failed = process_file(filepath, table_name)
        total_upserted += upserted
        total_failed += failed
    
    print(f"\n{'='*60}")
    print(f"ALL FILES COMPLETE")
    print(f"{'='*60}")
    print(f"Files processed: {len(json_files)}")
    print(f"Total upserted:  {total_upserted}")
    print(f"Total failed:    {total_failed}")


if __name__ == "__main__":

    # Optional: pass a specific file or folder as argument
    # Usage:
    #   python process_stored_matches.py                          -> processes all files in tennis_data/
    #   python process_stored_matches.py tennis_data/             -> processes all files in specified folder
    #   python process_stored_matches.py tennis_data/matches_2026-01-15.json  -> processes single file

    target = sys.argv[1] if len(sys.argv) > 1 else INPUT_FOLDER
    target_path = Path(target)

    if target_path.is_file():
        # Single file mode
        print("="*60)
        print("PROCESS STORED MATCHES - SINGLE FILE MODE")
        print("="*60)
        upserted, failed = process_file(target_path)
        
    elif target_path.is_dir():
        # Folder mode
        print("="*60)
        print("PROCESS STORED MATCHES - FOLDER MODE")
        print("="*60)
        print(f"Folder: {target_path}")
        print("Including: ATP, WTA, Challenger, WTA 125, ITF Singles")
        print("Excluding: Doubles, Junior, Youth\n")
        process_all_files(target_path)
        
    else:
        print(f"❌ Path not found: {target}")
        sys.exit(1)

    # Update points after processing
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