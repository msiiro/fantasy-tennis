import http.client
import json
from multiprocessing import process
import sys
from datetime import datetime, timedelta
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
OUTPUT_FOLDER = "tennis_data"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def should_include_event(event):
    """
    Check if an event should be included based on filters
    Only include ATP/WTA singles events, exclude doubles, ITF, and junior/youth events
    
    Args:
        event: Single event/match from the API response
    
    Returns:
        Boolean: True if event should be included, False otherwise
    """
    # Get category information
    category_name = event.get('tournament', {}).get('category', {}).get('name', '').upper()
    category_slug = event.get('tournament', {}).get('category', {}).get('slug', '').lower()
    
    # Get tournament and season names for additional filtering
    tournament_name = event.get('tournament', {}).get('name', '').lower()
    season_name = event.get('season', {}).get('name', '').lower()
    
    # Get match type from eventFilters
    event_filters = event.get('eventFilters', {})
    match_categories = event_filters.get('category', [])
    
    # Check if it's ATP or WTA
    is_atp_or_wta = category_name in ['ATP', 'WTA', 'Challenger', 'WTA 125'] or category_slug in ['atp', 'wta', 'challenger', 'wta-125']
    
    # Check if it's singles (not doubles)
    is_singles = 'singles' in match_categories
    
    # Additional check: tournament/season name shouldn't contain "doubles"
    has_doubles_in_name = 'doubles' in tournament_name or 'doubles' in season_name or 'double' in season_name
    
    # Exclude ITF, junior, youth, etc.
    excluded_keywords = ['itf', 'junior', 'youth', 'futures', 'u18', 'u21']
    is_excluded = any(keyword in category_name.lower() for keyword in excluded_keywords)
    is_excluded = is_excluded or any(keyword in category_slug for keyword in excluded_keywords)
    is_excluded = is_excluded or any(keyword in tournament_name for keyword in excluded_keywords)
    is_excluded = is_excluded or any(keyword in season_name for keyword in excluded_keywords)
    
    # Include only if it's ATP/WTA, singles, and not excluded
    should_include = is_atp_or_wta and is_singles and not has_doubles_in_name and not is_excluded
    
    if not should_include:
        player1 = event.get('homeTeam', {}).get('shortName', 'Unknown')
        player2 = event.get('awayTeam', {}).get('shortName', 'Unknown')
        reason = []
        if not is_atp_or_wta:
            reason.append(f"Not ATP/WTA ({category_name})")
        if not is_singles:
            reason.append(f"Not singles ({', '.join(match_categories)})")
        if has_doubles_in_name:
            reason.append("Doubles in name")
        if is_excluded:
            reason.append("Excluded category")
        
        print(f"  ⊘ Filtered out: {player1} vs {player2} - {' | '.join(reason)}")
    
    return should_include

def process_and_upsert_matches(matches_data, table_name='tennis_matches'):
    """
    Process match data and upsert into Supabase
    Only includes ATP/WTA singles events
    
    Args:
        matches_data: Raw JSON data from API (should have 'events' key)
        table_name: Supabase table name
    
    Returns:
        List of upserted records
    """
    if not matches_data:
        print("No data to process")
        return []
    
    # Extract events array
    events = matches_data.get('events', [])
    
    if not events:
        print("No events found in data")
        return []
    
    print(f"Total events received: {len(events)}")
    
    # Filter events to only ATP/WTA singles
    filtered_events = [event for event in events if should_include_event(event)]
    
    print(f"Events after filtering (ATP/WTA Singles only): {len(filtered_events)}")
    
    if not filtered_events:
        print("No ATP/WTA singles events to process after filtering")
        return []
    
    upserted_records = []
    failed_records = []
    
    print(f"\nProcessing {len(filtered_events)} ATP/WTA singles matches...")
    
    for event in filtered_events:
        try:
            # Transform the match data
            transformed_match = transform_match_data(event)
            
            # Upsert into Supabase (insert or update)
            response = supabase.table(table_name).upsert(
                transformed_match,
                on_conflict='match_id'
            ).execute()
            
            upserted_records.append(transformed_match)
            match_info = f"{transformed_match.get('player1_short_name')} vs {transformed_match.get('player2_short_name')}"
            tournament_info = f"{transformed_match.get('category_name')} - {transformed_match.get('tournament_name')}"
            print(f"✓ Upserted: {match_info} | {tournament_info}")
            
        except Exception as e:
            print(f"✗ Failed to upsert match: {e}")
            match_info = f"{event.get('homeTeam', {}).get('shortName')} vs {event.get('awayTeam', {}).get('shortName')}"
            print(f"   Match: {match_info}")
            failed_records.append({'event': event, 'error': str(e)})
    
    print(f"\n✓ Successfully upserted: {len(upserted_records)}")
    print(f"✗ Failed to upsert: {len(failed_records)}")
    
    if failed_records:
        # Save failed records for debugging
        error_file = f"errors_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(error_file, 'w') as f:
            json.dump(failed_records, f, indent=2)
        print(f"Failed records saved to: {error_file}")
    
    return upserted_records

def transform_match_data(event):
    """
    Transform match data from API format to database format
    Changes 'homeTeam'/'awayTeam' to 'player1'/'player2'
    
    Args:
        event: Single event/match from the API response
    
    Returns:
        Transformed match dictionary
    """
    transformed = {
        # Match identifiers
        'match_id': event.get('id'),
        'slug': event.get('slug'),
        'custom_id': event.get('customId'),
        
        # Player 1 (formerly homeTeam)
        'player1_id': event.get('homeTeam', {}).get('id'),
        'player1_name': event.get('homeTeam', {}).get('name'),
        'player1_slug': event.get('homeTeam', {}).get('slug'),
        'player1_short_name': event.get('homeTeam', {}).get('shortName'),
        'player1_name_code': event.get('homeTeam', {}).get('nameCode'),
        'player1_country': event.get('homeTeam', {}).get('country', {}).get('name'),
        'player1_country_code': event.get('homeTeam', {}).get('country', {}).get('alpha2'),
        'player1_gender': event.get('homeTeam', {}).get('gender'),
        
        # Player 2 (formerly awayTeam)
        'player2_id': event.get('awayTeam', {}).get('id'),
        'player2_name': event.get('awayTeam', {}).get('name'),
        'player2_slug': event.get('awayTeam', {}).get('slug'),
        'player2_short_name': event.get('awayTeam', {}).get('shortName'),
        'player2_name_code': event.get('awayTeam', {}).get('nameCode'),
        'player2_country': event.get('awayTeam', {}).get('country', {}).get('name'),
        'player2_country_code': event.get('awayTeam', {}).get('country', {}).get('alpha2'),
        'player2_gender': event.get('awayTeam', {}).get('gender'),
        
        # Scores - Player 1 (formerly homeScore)
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
        
        # Scores - Player 2 (formerly awayScore)
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
        
        # Match status and info
        'status_code': event.get('status', {}).get('code'),
        'status_description': event.get('status', {}).get('description'),
        'status_type': event.get('status', {}).get('type'),
        'winner_code': event.get('winnerCode'),
        'first_to_serve': event.get('firstToServe'),
        
        # Tournament info
        'tournament_id': event.get('tournament', {}).get('id'),
        'tournament_name': event.get('tournament', {}).get('name'),
        'tournament_slug': event.get('tournament', {}).get('slug'),
        'unique_tournament_id': event.get('tournament', {}).get('uniqueTournament', {}).get('id'),
        'unique_tournament_name': event.get('tournament', {}).get('uniqueTournament', {}).get('name'),
        'unique_tournament_slug': event.get('tournament', {}).get('uniqueTournament', {}).get('slug'),
        
        # Category (ATP/WTA)
        'category_id': event.get('tournament', {}).get('category', {}).get('id'),
        'category_name': event.get('tournament', {}).get('category', {}).get('name'),
        'category_slug': event.get('tournament', {}).get('category', {}).get('slug'),
        
        # Season and round
        'season_id': event.get('season', {}).get('id'),
        'season_name': event.get('season', {}).get('name'),
        'season_year': event.get('season', {}).get('year'),
        'round_number': event.get('roundInfo', {}).get('round'),
        'round_name': event.get('roundInfo', {}).get('name'),
        'round_type': event.get('roundInfo', {}).get('cupRoundType'),
        
        # Match details
        'ground_type': event.get('groundType'),
        'tennis_points': event.get('tournament', {}).get('uniqueTournament', {}).get('tennisPoints'),
        'start_timestamp': event.get('startTimestamp'),
        'has_highlights': event.get('hasGlobalHighlights', False),
        
        # Event filters
        'gender': event.get('eventFilters', {}).get('gender', [None])[0] if event.get('eventFilters', {}).get('gender') else None,
        'match_type': event.get('eventFilters', {}).get('category', [None])[0] if event.get('eventFilters', {}).get('category') else None,
        'level': event.get('eventFilters', {}).get('level', [None])[0] if event.get('eventFilters', {}).get('level') else None,
        'tournament_type': event.get('eventFilters', {}).get('tournament', [None])[0] if event.get('eventFilters', {}).get('tournament') else None,
        
        # Metadata
        'processed_at': datetime.now().isoformat(),
        'raw_data': json.dumps(event)  # Store complete original data as JSON
    }
    
    # Convert timestamp to datetime if available
    if transformed['start_timestamp']:
        transformed['match_date'] = datetime.fromtimestamp(transformed['start_timestamp']).isoformat()
    
    return transformed

# Example usage:
if __name__ == "__main__":

    # Check if a date argument was provided
    if len(sys.argv) > 1:
        # Manual mode: Run for specific date
        filenm = sys.argv[1]

        with open(filenm, 'r') as f:
            data = json.load(f)
        
        print("="*60)
        print("TENNIS MATCH DATA FETCHER - MANUAL MODE")
        print("="*60)
        print(f"\nProcessing matches from: {filenm}")
        
        # Check if this is an error file (array with 'event' and 'error' keys)
        # or a regular API response (dict with 'events' key)
        if isinstance(data, list) and len(data) > 0 and 'event' in data[0]:
            # Error file format - extract the events
            print(f"✓ Detected error file format with {len(data)} failed records")
            events = [record['event'] for record in data]
            transformed = {'events': events}
        elif isinstance(data, dict) and 'events' in data:
            # Regular API response format
            print(f"✓ Detected API response format with {len(data.get('events', []))} events")
            transformed = data
        else:
            # Unknown format
            print("⚠️ Unknown file format. Expected either:")
            print("  - Error file: [{\"event\": {...}, \"error\": \"...\"}]")
            print("  - API response: {\"events\": [...]}")
            sys.exit(1)
        
        # Process and store matches
        results = process_and_upsert_matches(transformed, 'tennis_matches')
        
        if results:
            print(f"\n✓ Successfully processed {len(results)} matches")
        else:
            print("\n⚠️ No matches found or error occurred")
    else:
        print("Usage: python upload_matches_fixed.py <json_file>")
        print("\nAccepts either:")
        print("  - Error files: errors_YYYYMMDD_HHMMSS.json")
        print("  - API response files: matches_YYYY-MM-DD.json")