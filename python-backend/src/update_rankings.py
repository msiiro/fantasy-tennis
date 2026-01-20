"""
Efficiently update player rankings from match data using SQL
"""
from supabase_client import get_supabase_client

def update_all_player_rankings():
    """
    Update player rankings based on most recent match data
    Uses PostgreSQL function for efficiency
    """
    supabase = get_supabase_client()
    
    print("📊 Updating player rankings from matches table...")
    
    try:
        # Call the PostgreSQL function - rpc takes function name and params dict
        result = supabase.rpc('update_player_rankings_from_matches', {}).execute()
        
        # Check if we got data back
        if result and result.data is not None:
            # The function returns a table with updated_count
            if isinstance(result.data, list) and len(result.data) > 0:
                updated_count = result.data[0].get('updated_count', 'unknown')
                print(f"✅ Updated rankings for {updated_count} players using SQL function")
            else:
                print(f"✅ SQL function executed (result: {result.data})")
            return True
            
    except Exception as e:
        print(f"⚠️ SQL function not available: {e}")
        print("   Falling back to Python approach...")
        return update_rankings_python_way()

def update_rankings_python_way():
    """
    Fallback method: Update rankings using Python queries
    """
    supabase = get_supabase_client()
    
    try:
        # Get all players
        players_result = supabase.table('players').select('id, tour').execute()
        players = players_result.data
        
        print(f"   Processing {len(players)} players...")
        
        updated_count = 0
        
        for player in players:
            player_id = player['id']
            
            # Get most recent match for this player
            matches_result = supabase.table('matches').select(
                'match_date, player1_id, player1_ranking_before, player2_id, player2_ranking_before'
            ).or_(f'player1_id.eq.{player_id},player2_id.eq.{player_id}').order(
                'match_date', desc=True
            ).limit(1).execute()
            
            if matches_result.data:
                match = matches_result.data[0]
                
                # Determine which player they were and get their rank
                if match['player1_id'] == player_id:
                    rank = match['player1_ranking_before']
                else:
                    rank = match['player2_ranking_before']
                
                # Update if we have a valid rank
                if rank and rank > 0:
                    supabase.table('players').update({
                        'rank': rank
                    }).eq('id', player_id).execute()
                    
                    updated_count += 1
                    
                    if updated_count % 50 == 0:
                        print(f"      Updated {updated_count} players...")
        
        print(f"✅ Updated rankings for {updated_count}/{len(players)} players")
        return True
        
    except Exception as e:
        print(f"❌ Error updating rankings: {e}")
        import traceback
        traceback.print_exc()
        return False

def calculate_current_points_for_player(player_id):
    """
    Calculate a player's current total points based on last 365 days
    This matches ATP/WTA ranking system (rolling 52 weeks)
    
    Args:
        player_id: UUID of the player
    
    Returns:
        int: Points earned in last 365 days
    """
    from datetime import datetime, timedelta
    supabase = get_supabase_client()
    
    try:
        # Calculate cutoff date (365 days ago)
        cutoff_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        
        # Get all matches for this player in last 365 days
        matches_result = supabase.table('matches').select(
            'match_date, player1_id, player1_points_earned, player2_id, player2_points_earned'
        ).or_(f'player1_id.eq.{player_id},player2_id.eq.{player_id}').gte(
            'match_date', cutoff_date
        ).execute()
        
        if not matches_result.data:
            return 0
        
        # Sum all points earned in last 365 days
        total_points_365d = 0
        for match in matches_result.data:
            if match['player1_id'] == player_id:
                total_points_365d += match['player1_points_earned'] or 0
            else:
                total_points_365d += match['player2_points_earned'] or 0
        
        return total_points_365d
        
    except Exception as e:
        print(f"Error calculating points for player {player_id}: {e}")
        return 0

def update_all_player_points():
    """
    Update points for all players based on matches
    Uses PostgreSQL function for efficiency
    Points = sum of all points earned in matches
    """
    supabase = get_supabase_client()
    
    print("💯 Updating player points from match history...")
    
    try:
        # Call the PostgreSQL function
        result = supabase.rpc('update_player_points_from_matches', {}).execute()
        
        # Check if we got data back
        if result and result.data is not None:
            if isinstance(result.data, list) and len(result.data) > 0:
                updated_count = result.data[0].get('updated_count', 'unknown')
                print(f"✅ Updated points for {updated_count} players using SQL function")
            else:
                print(f"✅ SQL function executed (result: {result.data})")
            return True
            
    except Exception as e:
        print(f"⚠️ SQL function not available: {e}")
        print("   Falling back to Python approach...")
        return update_points_python_way()

def update_points_python_way():
    """
    Fallback method: Update points using Python queries
    """
    supabase = get_supabase_client()
    
    try:
        players_result = supabase.table('players').select('id, name').execute()
        players = players_result.data
        
        print(f"   Processing {len(players)} players...")
        
        updated_count = 0
        
        for player in players:
            points = calculate_current_points_for_player(player['id'])
            
            # Only update if points > 0
            if points > 0:
                supabase.table('players').update({
                    'points': points
                }).eq('id', player['id']).execute()
                
                updated_count += 1
                
                if updated_count % 50 == 0:
                    print(f"      Updated {updated_count} players...")
        
        print(f"✅ Updated points for {updated_count}/{len(players)} players")
        return True
        
    except Exception as e:
        print(f"❌ Error updating player points: {e}")
        import traceback
        traceback.print_exc()
        return False