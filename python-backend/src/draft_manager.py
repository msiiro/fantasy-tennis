"""
Draft management for fantasy tennis league
"""
from supabase_client import get_supabase_client
import uuid

def validate_draft_pick(team_id, player_id, season_id):
    """
    Validate if a team can draft a player
    
    Rules:
    - Team must have < 10 players
    - Total draft points must be >= 20,000 after adding player
    - Player not already drafted
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    supabase = get_supabase_client()
    
    # Check roster size
    team_result = supabase.table('teams').select('roster_count').eq('id', team_id).single().execute()
    if team_result.data['roster_count'] >= 10:
        return False, "Team roster is full (max 10 players)"
    
    # Check if player already drafted
    existing = supabase.table('draft_picks').select('*').eq('season_id', season_id).eq('player_id', player_id).execute()
    if existing.data:
        return False, "Player already drafted"
    
    # Check total draft points
    current_total = get_team_draft_total(team_id, season_id)
    player_result = supabase.table('players').select('points').eq('id', player_id).single().execute()
    player_points = player_result.data['points']
    
    # After draft complete, total must be >= 20,000
    new_total = current_total + player_points
    roster_count = team_result.data['roster_count']
    
    # If this would be 10th player, check minimum
    if roster_count == 9 and new_total < 20000:
        return False, f"Total draft points would be {new_total} (minimum 20,000 required)"
    
    return True, ""

def get_team_draft_total(team_id, season_id):
    """Get current total of draft points for a team"""
    supabase = get_supabase_client()
    
    result = supabase.table('draft_picks').select('player_points_at_draft').eq('team_id', team_id).eq('season_id', season_id).execute()
    
    return sum(pick['player_points_at_draft'] for pick in result.data)

def make_draft_pick(team_id, player_id, season_id, pick_number, round_number):
    """
    Execute a draft pick
    
    Returns:
        dict: Draft pick data or None if failed
    """
    supabase = get_supabase_client()
    
    # Validate
    is_valid, error = validate_draft_pick(team_id, player_id, season_id)
    if not is_valid:
        print(f"❌ Invalid draft pick: {error}")
        return None
    
    # Get player points
    player_result = supabase.table('players').select('*').eq('id', player_id).single().execute()
    player = player_result.data
    
    try:
        # Insert draft pick
        draft_result = supabase.table('draft_picks').insert({
            'season_id': season_id,
            'team_id': team_id,
            'player_id': player_id,
            'pick_number': pick_number,
            'round_number': round_number,
            'player_points_at_draft': player['points']
        }).execute()
        
        # Add to team_players
        supabase.table('team_players').insert({
            'team_id': team_id,
            'player_id': player_id
        }).execute()
        
        # Create season_stats entry
        supabase.table('season_stats').insert({
            'season_id': season_id,
            'team_id': team_id,
            'player_id': player_id,
            'points_at_acquisition': player['points'],
            'acquisition_date': 'CURRENT_DATE'
        }).execute()
        
        # Log transaction
        supabase.table('team_transactions').insert({
            'season_id': season_id,
            'team_id': team_id,
            'player_id': player_id,
            'transaction_type': 'draft'
        }).execute()
        
        print(f"✅ Draft pick #{pick_number}: {player['name']} ({player['points']} pts)")
        return draft_result.data
        
    except Exception as e:
        print(f"❌ Error making draft pick: {e}")
        return None