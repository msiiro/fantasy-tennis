#!/usr/bin/env python3
"""
Sync all tennis match data files from api_pulls/ to Supabase (Singles matches only, integer IDs)
"""

import json
import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
import glob

# Explicitly load .env from script directory
script_dir = Path(__file__).parent
env_path = script_dir / '.env'

print(f"Looking for .env at: {env_path}")
print(f"File exists: {env_path.exists()}")

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print("✓ .env file loaded")
else:
    load_dotenv()  # Try current directory
    print("⚠ .env not found in script directory, trying current directory")

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    print("Warning: supabase module not installed")
    SUPABASE_AVAILABLE = False

# Get credentials from environment
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

print(f"SUPABASE_URL loaded: {bool(SUPABASE_URL)}")
print(f"SUPABASE_KEY loaded: {bool(SUPABASE_KEY)}")

# Initialize Supabase client (if available)
supabase = None
if SUPABASE_AVAILABLE and SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✓ Supabase client initialized")
else:
    print("✗ Supabase client NOT initialized")
    if not SUPABASE_URL:
        print("  - SUPABASE_URL is missing")
    if not SUPABASE_KEY:
        print("  - SUPABASE_KEY is missing")


def determine_tour(tournament_name, stage_name):
    """
    Determine if tournament is ATP or WTA
    """
    combined = f"{tournament_name} {stage_name}".lower()
    
    # WTA indicators
    if any(keyword in combined for keyword in ['women', 'wta', "women's"]):
        return 'WTA'
    
    # ATP indicators (default for most)
    return 'ATP'


def is_singles_match(match):
    """
    Check if a match is singles (one player per side)
    """
    home_team = match.get('team_home', [])
    away_team = match.get('team_away', [])
    
    return len(home_team) == 1 and len(away_team) == 1


def sync_tournaments(data):
    """
    Add new tournaments to tournaments table
    Returns dict with tournament mappings
    """
    if not supabase:
        print("Supabase not initialized. Skipping tournament sync.")
        return {}
    
    print("\n" + "=" * 80)
    print("SYNCING TOURNAMENTS")
    print("=" * 80)
    
    tournament_map = {}
    new_tournaments = []
    
    for tournament in data['data']:
        tournament_name = tournament['country']['country_name']
        stage_name = tournament['stage']['stage_name']
        tour = determine_tour(tournament_name, stage_name)
        
        try:
            result = supabase.table('tournaments').select('id, name, tour').eq('name', tournament_name).eq('tour', tour).execute()
            
            if result.data:
                tournament_id = result.data[0]['id']
                tournament_map[(tournament_name, tour)] = tournament_id
                print(f"  ✓ Found existing: {tournament_name} ({tour})")
            else:
                new_tournament = {
                    'name': tournament_name,
                    'tour': tour,
                    'stage': stage_name,
                    'created_at': datetime.now().isoformat()
                }
                
                insert_result = supabase.table('tournaments').insert(new_tournament).execute()
                tournament_id = insert_result.data[0]['id']
                tournament_map[(tournament_name, tour)] = tournament_id
                new_tournaments.append(tournament_name)
                print(f"  ✓ Added new: {tournament_name} ({tour})")
                
        except Exception as e:
            print(f"  ✗ Error with {tournament_name}: {e}")
    
    print(f"\n✓ Total tournaments processed: {len(tournament_map)}")
    print(f"✓ New tournaments added: {len(new_tournaments)}")
    
    return tournament_map


def sync_players(data):
    """
    Add new players to players table (singles matches only)
    Uses API player ID as the primary key
    """
    if not supabase:
        print("Supabase not initialized. Skipping player sync.")
        return set()
    
    print("\n" + "=" * 80)
    print("SYNCING PLAYERS (Singles only)")
    print("=" * 80)
    
    synced_players = set()
    new_players = []
    
    # Collect all unique players from singles matches only
    all_players = {}
    
    for tournament in data['data']:
        for match in tournament['matches']:
            # Skip doubles matches
            if not is_singles_match(match):
                continue
            
            # Get home player (singles = only one player)
            home_player = match.get('team_home', [])[0]
            player_id = int(home_player['team_id'])
            if player_id not in all_players:
                all_players[player_id] = {
                    'id': player_id,
                    'name': home_player['team_name'],
                    'abbreviation': home_player.get('team_abbreviation', '')
                }
            
            # Get away player (singles = only one player)
            away_player = match.get('team_away', [])[0]
            player_id = int(away_player['team_id'])
            if player_id not in all_players:
                all_players[player_id] = {
                    'id': player_id,
                    'name': away_player['team_name'],
                    'abbreviation': away_player.get('team_abbreviation', '')
                }
    
    print(f"\nFound {len(all_players)} unique players in singles matches")
    
    for player_id, player_data in all_players.items():
        try:
            result = supabase.table('players').select('id').eq('id', player_id).execute()
            
            if result.data:
                synced_players.add(player_id)
            else:
                new_player = {
                    'id': player_id,
                    'name': player_data['name'],
                    'abbreviation': player_data['abbreviation'],
                    'created_at': datetime.now().isoformat()
                }
                
                supabase.table('players').insert(new_player).execute()
                synced_players.add(player_id)
                new_players.append(player_data['name'])
                print(f"  ✓ Added new player: {player_data['name']} (ID: {player_id})")
                
        except Exception as e:
            print(f"  ✗ Error with player {player_data['name']}: {e}")
    
    print(f"\n✓ Total players processed: {len(synced_players)}")
    print(f"✓ New players added: {len(new_players)}")
    
    return synced_players


def sync_matches(data, tournament_map, synced_players):
    """
    Add new matches to matches table (singles only)
    """
    if not supabase:
        print("Supabase not initialized. Skipping match sync.")
        return
    
    print("\n" + "=" * 80)
    print("SYNCING MATCHES (Singles only)")
    print("=" * 80)
    
    new_matches = []
    updated_matches = []
    skipped_doubles = 0
    skipped_missing_players = 0
    
    for tournament in data['data']:
        tournament_name = tournament['country']['country_name']
        stage_name = tournament['stage']['stage_name']
        tour = determine_tour(tournament_name, stage_name)
        
        tournament_id = tournament_map.get((tournament_name, tour))
        
        if not tournament_id:
            print(f"  ✗ Skipping matches for {tournament_name} - no tournament ID")
            continue
        
        for match in tournament['matches']:
            # Skip doubles matches
            if not is_singles_match(match):
                skipped_doubles += 1
                continue
            
            match_id = int(match['match_id'])
            
            # Get single player IDs
            home_player_id = int(match['team_home'][0]['team_id'])
            away_player_id = int(match['team_away'][0]['team_id'])
            
            # Skip if players don't exist in our database
            if home_player_id not in synced_players or away_player_id not in synced_players:
                skipped_missing_players += 1
                continue
            
            match_data = {
                'id': match_id,
                'tournament_id': tournament_id,
                'match_date': match['match_date'],
                'match_round': match.get('match_round_info'),
                'is_in_progress': match['match_status'].get('is_in_progress', False),
                'home_player_id': home_player_id,
                'away_player_id': away_player_id,
                'scores': match.get('scores', {}),
                'match_winner': match.get('match_winner'),
                'updated_at': datetime.now().isoformat()
            }
            
            try:
                result = supabase.table('matches').select('id').eq('id', match_id).execute()
                
                if result.data:
                    # Update existing match
                    supabase.table('matches').update(match_data).eq('id', match_id).execute()
                    updated_matches.append(match_id)
                else:
                    # Insert new match
                    match_data['created_at'] = datetime.now().isoformat()
                    supabase.table('matches').insert(match_data).execute()
                    new_matches.append(match_id)
                    
            except Exception as e:
                print(f"  ✗ Error with match {match_id}: {e}")
    
    print(f"\n✓ New matches added: {len(new_matches)}")
    print(f"✓ Matches updated: {len(updated_matches)}")
    print(f"ℹ Doubles matches skipped: {skipped_doubles}")
    print(f"ℹ Matches skipped (missing players): {skipped_missing_players}")


def sync_single_file(json_file):
    """
    Sync a single JSON file
    """
    print("\n" + "█" * 80)
    print(f"PROCESSING: {json_file}")
    print("█" * 80)
    
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        print(f"✓ Loaded data from {json_file}")
        print(f"  Tournaments to process: {data.get('total_tournaments', 0)}")
        
        # Sync in order
        tournament_map = sync_tournaments(data)
        synced_players = sync_players(data)
        sync_matches(data, tournament_map, synced_players)
        
        return True
        
    except Exception as e:
        print(f"\n✗ ERROR processing {json_file}: {e}")
        return False


def sync_all_files():
    """
    Main sync function - syncs all JSON files from api_pulls directory
    """
    print("=" * 80)
    print("STARTING BULK SUPABASE SYNC (SINGLES ONLY)")
    print("=" * 80)
    
    if not supabase:
        print("\n✗ ERROR: Supabase client not initialized")
        print("Make sure SUPABASE_URL and SUPABASE_KEY are set in .env")
        return
    
    # Check if api_pulls directory exists
    if not os.path.exists('api_pulls'):
        print("\n✗ ERROR: api_pulls directory not found")
        print("Make sure you have JSON files in the api_pulls/ directory")
        return
    
    # Find all JSON files in api_pulls directory
    json_files = sorted(glob.glob('api_pulls/tennis_matches_*.json'))
    
    if not json_files:
        print("\n✗ No tennis match JSON files found in api_pulls/")
        print("Expected format: api_pulls/tennis_matches_YYYY-MM-DD.json")
        return
    
    print(f"\n✓ Found {len(json_files)} file(s) to process:")
    for f in json_files:
        print(f"  - {f}")
    
    # Process each file
    successful = 0
    failed = 0
    
    for json_file in json_files:
        if sync_single_file(json_file):
            successful += 1
        else:
            failed += 1
    
    # Summary
    print("\n" + "=" * 80)
    print("BULK SYNC COMPLETE")
    print("=" * 80)
    print(f"✓ Successfully processed: {successful} file(s)")
    if failed > 0:
        print(f"✗ Failed: {failed} file(s)")
    print("=" * 80)


if __name__ == "__main__":
    sync_all_files()