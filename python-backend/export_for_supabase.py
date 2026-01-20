"""
Export tennis data to CSV files for fast bulk import into Supabase
This is MUCH faster than API inserts for large datasets
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import pandas as pd
from tennis_data_csv_scraper import download_tennis_data_csv, normalize_player_name
from datetime import datetime
import uuid

def calculate_match_points(tournament_level, round_name, tour='ATP'):
    """
    Calculate ranking points earned for reaching a specific round
    Based on ATP/WTA point systems
    
    Args:
        tournament_level: e.g., "Grand Slam", "Masters 1000", "ATP 500"
        round_name: e.g., "The Final", "Semi-Finals", "Quarter-Finals"
        tour: "ATP" or "WTA"
    
    Returns:
        tuple: (winner_points, loser_points)
    """
    # Normalize round name
    round_lower = str(round_name).lower().strip()
    
    # Standard point tables
    ATP_POINTS = {
        'Grand Slam': {
            'final': (2000, 1200),
            'semi': (720, 360),
            'quarter': (360, 180),
            'r16': (180, 90),
            'r32': (90, 45),
            'r64': (45, 10),
            'r128': (10, 0)
        },
        'Masters 1000': {
            'final': (1000, 600),
            'semi': (360, 180),
            'quarter': (180, 90),
            'r16': (90, 45),
            'r32': (45, 25),
            'r64': (25, 10),
        },
        'ATP 500': {
            'final': (500, 300),
            'semi': (180, 90),
            'quarter': (90, 45),
            'r16': (45, 20),
        },
        'ATP 250': {
            'final': (250, 150),
            'semi': (90, 45),
            'quarter': (45, 20),
            'r16': (20, 0),
        }
    }
    
    # WTA is similar to ATP
    WTA_POINTS = {
        'Grand Slam': ATP_POINTS['Grand Slam'],
        'WTA 1000': ATP_POINTS['Masters 1000'],
        'WTA 500': ATP_POINTS['ATP 500'],
        'WTA 250': ATP_POINTS['ATP 250'],
    }
    
    # Map tournament levels
    level_map = {
        'grand slam': 'Grand Slam',
        'gs': 'Grand Slam',
        'masters 1000': 'Masters 1000',
        'masters': 'Masters 1000',
        'wta 1000': 'WTA 1000',
        'premier mandatory': 'WTA 1000',
        'atp 500': 'ATP 500',
        '500': 'ATP 500' if tour == 'ATP' else 'WTA 500',
        'wta 500': 'WTA 500',
        'premier 5': 'WTA 500',
        'atp 250': 'ATP 250',
        '250': 'ATP 250' if tour == 'ATP' else 'WTA 250',
        'wta 250': 'WTA 250',
        'international': 'WTA 250',
    }
    
    # Normalize tournament level
    level_key = level_map.get(str(tournament_level).lower().strip(), 
                              'ATP 250' if tour == 'ATP' else 'WTA 250')
    
    # Map round names to keys
    if 'final' in round_lower or round_lower == 'f':
        round_key = 'final'
    elif 'semi' in round_lower or round_lower == 'sf':
        round_key = 'semi'
    elif 'quarter' in round_lower or round_lower == 'qf':
        round_key = 'quarter'
    elif '16' in round_lower or 'r16' in round_lower or '4th round' in round_lower:
        round_key = 'r16'
    elif '32' in round_lower or 'r32' in round_lower or '3rd round' in round_lower:
        round_key = 'r32'
    elif '64' in round_lower or 'r64' in round_lower or '2nd round' in round_lower:
        round_key = 'r64'
    elif '128' in round_lower or 'r128' in round_lower or '1st round' in round_lower:
        round_key = 'r128'
    else:
        round_key = 'final'  # Default
    
    # Get points
    points_table = ATP_POINTS if tour == 'ATP' else WTA_POINTS
    
    if level_key in points_table and round_key in points_table[level_key]:
        return points_table[level_key][round_key]
    
    # Default fallback
    return (0, 0)


def create_players_csv(years=[2024, 2025], output_dir='output'):
    """
    Extract all unique players from match data
    Creates: players.csv
    """
    print("👥 Extracting players from match data...")
    
    all_players = []
    
    for year in years:
        print(f"\n   Processing {year}...")
        
        # ATP
        df_atp = download_tennis_data_csv(year, 'ATP')
        if df_atp is not None:
            # Winners
            atp_winners = df_atp[['winner', 'wrank']].rename(
                columns={'winner': 'name', 'wrank': 'rank'}
            ).copy()
            atp_winners['tour'] = 'ATP'
            
            # Losers
            atp_losers = df_atp[['loser', 'lrank']].rename(
                columns={'loser': 'name', 'lrank': 'rank'}
            ).copy()
            atp_losers['tour'] = 'ATP'
            
            all_players.extend([atp_winners, atp_losers])
        
        # WTA
        df_wta = download_tennis_data_csv(year, 'WTA')
        if df_wta is not None:
            # Winners
            wta_winners = df_wta[['winner', 'wrank']].rename(
                columns={'winner': 'name', 'wrank': 'rank'}
            ).copy()
            wta_winners['tour'] = 'WTA'
            
            # Losers
            wta_losers = df_wta[['loser', 'lrank']].rename(
                columns={'loser': 'name', 'lrank': 'rank'}
            ).copy()
            wta_losers['tour'] = 'WTA'
            
            all_players.extend([wta_winners, wta_losers])
    
    # Combine all
    df_players = pd.concat(all_players, ignore_index=True)
    
    # Drop nulls and duplicates
    df_players = df_players.dropna(subset=['name'])
    
    # Convert rank to integer (important!)
    df_players['rank'] = pd.to_numeric(df_players['rank'], errors='coerce')
    df_players = df_players.dropna(subset=['rank'])  # Drop rows with no rank
    df_players['rank'] = df_players['rank'].astype(int)  # Convert to int
    
    # Get best rank for each player
    df_players = df_players.groupby(['name', 'tour']).agg({
        'rank': 'min'  # Best (lowest) rank
    }).reset_index()
    
    # Add UUID, points (will be calculated later), country (empty for now)
    df_players['id'] = [str(uuid.uuid4()) for _ in range(len(df_players))]
    df_players['points'] = 0  # Will be updated after loading matches
    df_players['country'] = ''
    df_players['last_updated'] = datetime.now().isoformat()
    df_players['created_at'] = datetime.now().isoformat()
    
    # Ensure rank is int (not float)
    df_players['rank'] = df_players['rank'].astype(int)
    
    # Reorder columns to match database schema
    df_players = df_players[['id', 'name', 'rank', 'points', 'country', 'tour', 'last_updated', 'created_at']]
    
    # Sort
    df_players = df_players.sort_values(['tour', 'rank'])
    
    # Export with explicit int formatting
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'players.csv')
    df_players.to_csv(output_path, index=False)
    
    print(f"\n✅ Exported {len(df_players)} players to {output_path}")
    print(f"   ATP: {len(df_players[df_players['tour'] == 'ATP'])}")
    print(f"   WTA: {len(df_players[df_players['tour'] == 'WTA'])}")
    
    return df_players

def create_matches_csv(years=[2024, 2025], output_dir='output', players_df=None):
    """
    Extract all matches and link to player IDs
    Creates: matches.csv
    """
    print("\n🎾 Extracting matches from match data...")
    
    if players_df is None:
        print("❌ Need players dataframe first!")
        return None
    
    # Create player lookup by normalized name
    player_lookup = {}
    for _, player in players_df.iterrows():
        key = (normalize_player_name(player['name']), player['tour'])
        player_lookup[key] = player['id']
    
    all_matches = []
    
    for year in years:
        print(f"\n   Processing {year}...")
        
        for tour in ['ATP', 'WTA']:
            df = download_tennis_data_csv(year, tour)
            
            if df is None:
                continue
            
            print(f"      {tour}: {len(df)} matches")
            
            for _, row in df.iterrows():
                try:
                    # Parse date
                    match_date = pd.to_datetime(row.get('date'), errors='coerce')
                    if pd.isna(match_date):
                        continue
                    match_date = match_date.strftime('%Y-%m-%d')
                    
                    # Get player names
                    winner_name = str(row.get('winner', ''))
                    loser_name = str(row.get('loser', ''))
                    
                    if not winner_name or not loser_name:
                        continue
                    
                    # Look up player IDs
                    winner_key = (normalize_player_name(winner_name), tour)
                    loser_key = (normalize_player_name(loser_name), tour)
                    
                    winner_id = player_lookup.get(winner_key)
                    loser_id = player_lookup.get(loser_key)
                    
                    if not winner_id or not loser_id:
                        continue
                    
                    # Extract match details
                    tournament_name = str(row.get('tournament', 'Unknown'))
                    tournament_level = str(row.get('series', 'Unknown'))
                    round_name = str(row.get('round', 'Final'))
                    surface = str(row.get('surface', 'Hard'))
                    
                    # Rankings - convert to int or None
                    winner_rank = row.get('wrank')
                    if pd.notna(winner_rank):
                        winner_rank = int(float(winner_rank))
                    else:
                        winner_rank = None
                    
                    loser_rank = row.get('lrank')
                    if pd.notna(loser_rank):
                        loser_rank = int(float(loser_rank))
                    else:
                        loser_rank = None
                    
                    # Points earned - convert to int
                    winner_points, loser_points = calculate_match_points(
                        tournament_level, 
                        round_name, 
                        tour
                    )
                    
                    # Build score
                    score_parts = []
                    for i in range(1, 6):
                        w_set = row.get(f'w{i}')
                        l_set = row.get(f'l{i}')
                        if pd.notna(w_set) and pd.notna(l_set):
                            score_parts.append(f"{int(float(w_set))}-{int(float(l_set))}")
                    score = ', '.join(score_parts) if score_parts else ''
                    
                    match = {
                        'id': str(uuid.uuid4()),
                        'tournament_name': tournament_name,
                        'tournament_level': tournament_level,
                        'match_date': match_date,
                        'round': round_name,
                        'player1_id': winner_id,
                        'player1_name': winner_name,
                        'player1_ranking_before': winner_rank,
                        'player1_points_earned': winner_points,
                        'player2_id': loser_id,
                        'player2_name': loser_name,
                        'player2_ranking_before': loser_rank,
                        'player2_points_earned': loser_points,
                        'score': score,
                        'surface': surface,
                        'tour': tour,
                        'status': 'completed',
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }
                    
                    all_matches.append(match)
                    
                except Exception as e:
                    continue
    
    # Convert to DataFrame
    df_matches = pd.DataFrame(all_matches)
    
    # Ensure integer columns are actually integers
    df_matches['player1_points_earned'] = df_matches['player1_points_earned'].astype(int)
    df_matches['player2_points_earned'] = df_matches['player2_points_earned'].astype(int)
    
    # For nullable integer columns (rankings), keep None as empty strings for CSV
    df_matches['player1_ranking_before'] = df_matches['player1_ranking_before'].apply(
        lambda x: int(x) if pd.notna(x) else ''
    )
    df_matches['player2_ranking_before'] = df_matches['player2_ranking_before'].apply(
        lambda x: int(x) if pd.notna(x) else ''
    )
    
    # Export
    output_path = os.path.join(output_dir, 'matches.csv')
    df_matches.to_csv(output_path, index=False)
    
    print(f"\n✅ Exported {len(df_matches)} matches to {output_path}")
    
    # Show breakdown
    for tour in ['ATP', 'WTA']:
        count = len(df_matches[df_matches['tour'] == tour])
        print(f"   {tour}: {count} matches")
    
    return df_matches

def main():
    """Main export function"""
    print("="*60)
    print("📊 Exporting Tennis Data for Supabase Bulk Import")
    print("="*60)
    
    years = [2024, 2025]
    output_dir = 'output'
    
    # Step 1: Export players
    players_df = create_players_csv(years, output_dir)
    
    # Step 2: Export matches
    matches_df = create_matches_csv(years, output_dir, players_df)
    
    print("\n" + "="*60)
    print("🎉 Export Complete!")
    print("="*60)
    print(f"\nFiles created in '{output_dir}/' directory:")
    print("  - players.csv")
    print("  - matches.csv")
    print("\n📝 Next Steps:")
    print("1. Go to Supabase Dashboard → Table Editor")
    print("2. Click on 'players' table → Import → Upload CSV")
    print("3. Upload players.csv")
    print("4. Click on 'matches' table → Import → Upload CSV")
    print("5. Upload matches.csv")
    print("6. Run: python main.py --update-rankings")
    print("\nThis will be MUCH faster than API inserts!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()