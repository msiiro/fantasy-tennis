"""
Process match results and award ranking points
"""
from supabase_client import get_supabase_client
from datetime import datetime

# ATP Ranking Points by Tournament Level and Round
ATP_POINTS = {
    'Grand Slam': {
        'Winner': 2000,
        'Runner-Up': 1200,
        'Semi-Final': 720,
        'Quarter-Final': 360,
        'Round of 16': 180,
        'Round of 32': 90,
        'Round of 64': 45,
        'Round of 128': 10
    },
    'Masters 1000': {
        'Winner': 1000,
        'Runner-Up': 600,
        'Semi-Final': 360,
        'Quarter-Final': 180,
        'Round of 16': 90,
        'Round of 32': 45,
        'Round of 64': 25,
        'Round of 128': 10
    },
    'ATP 500': {
        'Winner': 500,
        'Runner-Up': 300,
        'Semi-Final': 180,
        'Quarter-Final': 90,
        'Round of 16': 45,
        'Round of 32': 20
    },
    'ATP 250': {
        'Winner': 250,
        'Runner-Up': 150,
        'Semi-Final': 90,
        'Quarter-Final': 45,
        'Round of 16': 20
    }
}

# WTA points are similar (can add if different)
WTA_POINTS = ATP_POINTS.copy()

def calculate_points(tournament_level, round_name, tour='ATP'):
    """
    Calculate ranking points for a match result
    
    Args:
        tournament_level: e.g., "Grand Slam", "Masters 1000"
        round_name: e.g., "Final", "Semi-Final"
        tour: "ATP" or "WTA"
    
    Returns:
        int: Ranking points earned
    """
    points_table = ATP_POINTS if tour == 'ATP' else WTA_POINTS
    
    # Normalize round name
    round_map = {
        'Final': 'Winner',
        'Finals': 'Winner',
        'F': 'Winner',
        'Semi-Final': 'Semi-Final',
        'Semifinal': 'Semi-Final',
        'SF': 'Semi-Final',
        'Quarter-Final': 'Quarter-Final',
        'Quarterfinal': 'Quarter-Final',
        'QF': 'Quarter-Final',
        'Round of 16': 'Round of 16',
        'R16': 'Round of 16',
        'Round of 32': 'Round of 32',
        'R32': 'Round of 32',
        'Round of 64': 'Round of 64',
        'R64': 'Round of 64',
        'Round of 128': 'Round of 128',
        'R128': 'Round of 128'
    }
    
    normalized_round = round_map.get(round_name, round_name)
    
    if tournament_level in points_table and normalized_round in points_table[tournament_level]:
        return points_table[tournament_level][normalized_round]
    
    return 0

def insert_match_result(match_data):
    """
    Insert a completed match with ranking points
    
    Args:
        match_data: dict with match information
            {
                'tournament_name': str,
                'tournament_level': str,
                'match_date': str (YYYY-MM-DD),
                'round': str,
                'player1_name': str,
                'player1_id': UUID (optional),
                'player2_name': str,
                'player2_id': UUID (optional),
                'score': str,
                'surface': str,
                'tour': str,
                'status': 'completed'
            }
    """
    supabase = get_supabase_client()
    
    # Calculate points
    winner_points = calculate_points(
        match_data['tournament_level'],
        match_data['round'],
        match_data['tour']
    )
    
    # Loser gets points for reaching previous round
    loser_round_map = {
        'Winner': 'Runner-Up',
        'Semi-Final': 'Quarter-Final',
        'Quarter-Final': 'Round of 16',
        'Round of 16': 'Round of 32',
        'Round of 32': 'Round of 64'
    }
    
    loser_round = loser_round_map.get(match_data['round'], 'Round of 128')
    loser_points = calculate_points(
        match_data['tournament_level'],
        loser_round,
        match_data['tour']
    )
    
    # Insert match
    try:
        result = supabase.table('matches').insert({
            'tournament_name': match_data['tournament_name'],
            'tournament_level': match_data['tournament_level'],
            'match_date': match_data['match_date'],
            'round': match_data['round'],
            'player1_name': match_data['player1_name'],
            'player1_id': match_data.get('player1_id'),
            'player1_points_earned': winner_points,
            'player2_name': match_data['player2_name'],
            'player2_id': match_data.get('player2_id'),
            'player2_points_earned': loser_points,
            'score': match_data.get('score', ''),
            'surface': match_data.get('surface', ''),
            'tour': match_data['tour'],
            'status': 'completed'
        }).execute()
        
        print(f"✅ Inserted match: {match_data['player1_name']} def. {match_data['player2_name']}")
        print(f"   Points: {match_data['player1_name']} +{winner_points}, {match_data['player2_name']} +{loser_points}")
        
        return result.data
        
    except Exception as e:
        print(f"❌ Error inserting match: {e}")
        return None

def update_season_stats():
    """
    Update season_stats table with points earned from completed matches
    This should run after inserting new match results
    """
    supabase = get_supabase_client()
    
    try:
        # Get current season
        season_result = supabase.table('seasons').select('*').eq('year', 2026).single().execute()
        season_id = season_result.data['id']
        
        # Get all active team rosters
        stats_result = supabase.table('season_stats').select('*').eq('season_id', season_id).is_('release_date', 'null').execute()
        
        for stat in stats_result.data:
            player_id = stat['player_id']
            team_id = stat['team_id']
            acquisition_date = stat['acquisition_date']
            
            # Calculate points earned since acquisition
            matches_result = supabase.table('matches').select('*').or_(
                f'player1_id.eq.{player_id},player2_id.eq.{player_id}'
            ).gte('match_date', acquisition_date).eq('status', 'completed').execute()
            
            total_points = 0
            for match in matches_result.data:
                if match['player1_id'] == player_id:
                    total_points += match['player1_points_earned']
                elif match['player2_id'] == player_id:
                    total_points += match['player2_points_earned']
            
            # Update season_stats
            supabase.table('season_stats').update({
                'points_earned': total_points
            }).eq('id', stat['id']).execute()
        
        print(f"✅ Updated season stats for all teams")
        
    except Exception as e:
        print(f"❌ Error updating season stats: {e}")