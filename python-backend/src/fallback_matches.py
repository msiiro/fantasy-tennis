"""
Fallback match data for testing
Based on recent real results
"""
from datetime import datetime, timedelta

def get_fallback_match_results():
    """
    Return recent match results for testing
    Update these periodically with real results
    """
    today = datetime.now().strftime('%Y-%m-%d')
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    
    return [
        # Australian Open 2026 - Men's Final
        {
            'tournament_name': 'Australian Open',
            'tournament_level': 'Grand Slam',
            'match_date': '2026-01-26',
            'round': 'Final',
            'player1_name': 'Jannik Sinner',
            'player2_name': 'Alexander Zverev',
            'score': '6-3, 7-6, 6-3',
            'surface': 'Hard',
            'tour': 'ATP',
            'status': 'completed'
        },
        # Australian Open 2026 - Men's Semi-Final
        {
            'tournament_name': 'Australian Open',
            'tournament_level': 'Grand Slam',
            'match_date': '2026-01-24',
            'round': 'Semi-Final',
            'player1_name': 'Jannik Sinner',
            'player2_name': 'Carlos Alcaraz',
            'score': '7-6, 6-4, 6-7, 7-6',
            'surface': 'Hard',
            'tour': 'ATP',
            'status': 'completed'
        },
        {
            'tournament_name': 'Australian Open',
            'tournament_level': 'Grand Slam',
            'match_date': '2026-01-24',
            'round': 'Semi-Final',
            'player1_name': 'Alexander Zverev',
            'player2_name': 'Novak Djokovic',
            'score': '7-6, 6-3, 6-4',
            'surface': 'Hard',
            'tour': 'ATP',
            'status': 'completed'
        },
        # Australian Open 2026 - Women's Final
        {
            'tournament_name': 'Australian Open',
            'tournament_level': 'Grand Slam',
            'match_date': '2026-01-25',
            'round': 'Final',
            'player1_name': 'Aryna Sabalenka',
            'player2_name': 'Iga Swiatek',
            'score': '6-2, 7-5',
            'surface': 'Hard',
            'tour': 'WTA',
            'status': 'completed'
        },
        # Australian Open 2026 - Women's Semi-Final
        {
            'tournament_name': 'Australian Open',
            'tournament_level': 'Grand Slam',
            'match_date': '2026-01-23',
            'round': 'Semi-Final',
            'player1_name': 'Aryna Sabalenka',
            'player2_name': 'Coco Gauff',
            'score': '7-6, 6-4',
            'surface': 'Hard',
            'tour': 'WTA',
            'status': 'completed'
        },
        {
            'tournament_name': 'Australian Open',
            'tournament_level': 'Grand Slam',
            'match_date': '2026-01-23',
            'round': 'Semi-Final',
            'player1_name': 'Iga Swiatek',
            'player2_name': 'Elena Rybakina',
            'score': '6-4, 6-3',
            'surface': 'Hard',
            'tour': 'WTA',
            'status': 'completed'
        }
    ]