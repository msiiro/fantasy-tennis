"""
Supabase client for database operations
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file (local development)
load_dotenv()

# Get credentials from environment (works with both .env and GitHub secrets)
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")

def get_supabase_client() -> Client:
    """Create and return Supabase client"""
    try:
        # Updated initialization without proxy parameter
        return create_client(
            supabase_url=SUPABASE_URL,
            supabase_key=SUPABASE_KEY
        )
    except Exception as e:
        print(f"Error creating Supabase client: {e}")
        raise

def update_player_rankings(players_data):
    """
    Update player rankings in Supabase
    
    Args:
        players_data: List of dicts with player info
    """
    if not players_data:
        print("No player data to update")
        return {'updated': 0, 'new': 0}
    
    supabase = get_supabase_client()
    
    updated_count = 0
    new_count = 0
    
    for player in players_data:
        try:
            # Check if player exists
            result = supabase.table('players').select('*').eq('name', player['name']).eq('tour', player['tour']).execute()
            
            if result.data:
                # Update existing player
                supabase.table('players').update({
                    'rank': player['rank'],
                    'points': player['points'],
                    'country': player.get('country', ''),
                }).eq('name', player['name']).eq('tour', player['tour']).execute()
                updated_count += 1
            else:
                # Insert new player
                supabase.table('players').insert({
                    'name': player['name'],
                    'rank': player['rank'],
                    'points': player['points'],
                    'country': player.get('country', ''),
                    'tour': player['tour']
                }).execute()
                new_count += 1
                
        except Exception as e:
            print(f"Error updating player {player['name']}: {e}")
    
    print(f"✅ Updated {updated_count} players, added {new_count} new players")
    return {'updated': updated_count, 'new': new_count}

def get_all_players():
    """Get all players from database"""
    supabase = get_supabase_client()
    result = supabase.table('players').select('*').execute()
    return result.data

def clear_all_matches():
    """Clear all existing matches"""
    try:
        supabase = get_supabase_client()
        # Delete all matches (using a filter that matches all rows)
        result = supabase.table('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        print("🗑️ Cleared existing matches")
    except Exception as e:
        print(f"Note: Could not clear matches (table might be empty): {e}")

def insert_matches(matches_data):
    """
    Insert scheduled matches into database
    """
    if not matches_data:
        print("No match data to insert")
        return 0
    
    supabase = get_supabase_client()
    
    try:
        supabase.table('matches').insert(matches_data).execute()
        print(f"✅ Inserted {len(matches_data)} matches")
        return len(matches_data)
    except Exception as e:
        print(f"❌ Error inserting matches: {e}")
        return 0