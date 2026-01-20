"""
Download and process match data from tennis-data.co.uk
Uses raw data structure without recalculating points
"""
import requests
import pandas as pd
from io import BytesIO
from datetime import datetime, timedelta
import time
from supabase_client import get_supabase_client

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

# URLs for different years and tours
TENNIS_DATA_URLS = {
    'ATP': {
        2024: 'http://www.tennis-data.co.uk/2024/2024.xlsx',
        2025: 'http://www.tennis-data.co.uk/2025/2025.xlsx',
        2026: 'http://www.tennis-data.co.uk/2026/2026.xlsx',
    },
    'WTA': {
        2024: 'http://www.tennis-data.co.uk/2024w/2024.xlsx',
        2025: 'http://www.tennis-data.co.uk/2025w/2025.xlsx',
        2026: 'http://www.tennis-data.co.uk/2026w/2026.xlsx',
    }
}

def download_tennis_data_csv(year=2026, tour='ATP'):
    """
    Download match data from tennis-data.co.uk
    
    Args:
        year: Year to download (2024, 2025, 2026)
        tour: 'ATP' or 'WTA'
    
    Returns:
        pandas.DataFrame or None
    """
    print(f"📥 Downloading {tour} {year} data from tennis-data.co.uk...")
    
    if tour not in TENNIS_DATA_URLS or year not in TENNIS_DATA_URLS[tour]:
        print(f"❌ No URL configured for {tour} {year}")
        return None
    
    url = TENNIS_DATA_URLS[tour][year]
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Read Excel file
        df = pd.read_excel(BytesIO(response.content))
        
        # Clean column names (lowercase, replace spaces with underscores)
        df.columns = df.columns.str.lower().str.replace(' ', '_').str.replace('.', '')
        
        # Add metadata
        df['tour'] = tour
        df['season'] = year
        
        # Rename tour-specific ID column
        if 'atp' in df.columns:
            df = df.rename(columns={'atp': 'tournament_id'})
        elif 'wta' in df.columns:
            df = df.rename(columns={'wta': 'tournament_id', 'tier': 'series'})
        
        # Convert rank and pts columns to numeric
        for col in df.columns:
            if 'rank' in col or 'pts' in col:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Convert date column
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
        
        print(f"✅ Downloaded {len(df)} matches")
        print(f"   Columns: {', '.join(df.columns[:10])}...")
        
        return df
        
    except Exception as e:
        print(f"❌ Error downloading data: {e}")
        import traceback
        traceback.print_exc()
        return None

def normalize_player_name(name):
    """Normalize player name for matching"""
    import unicodedata
    
    if pd.isna(name):
        return ''
    
    # Remove accents
    name = ''.join(
        c for c in unicodedata.normalize('NFD', str(name))
        if unicodedata.category(c) != 'Mn'
    )
    
    # Lowercase and remove extra spaces
    name = ' '.join(name.lower().split())
    
    # Remove suffixes
    name = name.replace(' jr.', '').replace(' jr', '').replace(' sr.', '').replace(' sr', '')
    
    return name

def match_player_name_to_id(player_name, tour):
    """
    Match player name to database ID
    
    Returns:
        UUID or None
    """
    if pd.isna(player_name) or not player_name:
        return None
    
    supabase = get_supabase_client()
    
    # Normalize name
    normalized = normalize_player_name(player_name)
    
    # Get all players from this tour
    result = supabase.table('players').select('id, name').eq('tour', tour).execute()
    
    # Try to match
    for player in result.data:
        if normalize_player_name(player['name']) == normalized:
            return player['id']
    
    return None

def normalize_round_name(round_text):
    """Normalize round names to standard format"""
    if pd.isna(round_text):
        return 'Unknown'
    
    round_text = str(round_text).lower().strip()
    
    round_map = {
        'the final': 'Final',
        'final': 'Final',
        'finals': 'Final',
        'semi-finals': 'Semi-Final',
        'semifinals': 'Semi-Final',
        'semi-final': 'Semi-Final',
        'quarterfinals': 'Quarter-Final',
        'quarter-finals': 'Quarter-Final',
        'quarter-final': 'Quarter-Final',
        'round of 16': 'Round of 16',
        '4th round': 'Round of 16',
        'round of 32': 'Round of 32',
        '3rd round': 'Round of 32',
        'round of 64': 'Round of 64',
        '2nd round': 'Round of 64',
        'round of 128': 'Round of 128',
        '1st round': 'Round of 128'
    }
    
    return round_map.get(round_text, round_text.title())

def add_new_player(player_name, tour, rank=None, points=0):
    """
    Add a new player to the database
    
    Args:
        player_name: Player name
        tour: 'ATP' or 'WTA'
        rank: Current ranking (optional)
        points: Current points (optional)
    
    Returns:
        UUID: Player ID or None if failed
    """
    supabase = get_supabase_client()
    
    try:
        # Insert new player
        result = supabase.table('players').insert({
            'name': player_name,
            'rank': rank if rank else 999,  # Default rank for new players
            'points': points if points else 0,
            'country': '',  # Will be updated later
            'tour': tour
        }).execute()
        
        if result.data:
            player_id = result.data[0]['id']
            print(f"   ✅ Added new player: {player_name} ({tour})")
            return player_id
        
        return None
        
    except Exception as e:
        print(f"   ❌ Error adding player {player_name}: {e}")
        return None

def match_or_create_player(player_name, tour, rank=None, points=0, player_lookup=None):
    """
    Match player name to ID, or create new player if not found
    
    Args:
        player_name: Player name from CSV
        tour: 'ATP' or 'WTA'
        rank: Player's ranking (for creating new player)
        points: Player's points (for creating new player)
        player_lookup: Dict of normalized names to IDs (for caching)
    
    Returns:
        UUID: Player ID
    """
    if pd.isna(player_name) or not player_name:
        return None
    
    # Normalize name
    normalized = normalize_player_name(player_name)
    
    # Check cache first
    if player_lookup and normalized in player_lookup:
        return player_lookup[normalized]
    
    # Not in cache - add to database and cache
    player_id = add_new_player(player_name, tour, rank, points)
    
    if player_id and player_lookup is not None:
        player_lookup[normalized] = player_id
    
    return player_id

def process_matches_dataframe(df, days_back=30):
    """
    Process downloaded matches dataframe
    NOW CREATES NEW PLAYERS IF NOT FOUND
    
    Args:
        df: pandas DataFrame from tennis-data.co.uk
        days_back: Only process matches from last N days
    
    Returns:
        list: Match dictionaries ready for insertion
    """
    if df is None or df.empty:
        return []
    
    print(f"📊 Processing {len(df)} matches from CSV...")
    
    # Filter by date (only recent matches)
    cutoff_date = datetime.now() - timedelta(days=days_back)
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    df = df[df['date'] >= cutoff_date]
    
    print(f"   {len(df)} matches within last {days_back} days")
    
    matches = []
    tour = df['tour'].iloc[0] if 'tour' in df.columns else 'ATP'
    
    # Create player lookup cache
    print(f"🔍 Loading existing players for {tour}...")
    supabase = get_supabase_client()
    players_result = supabase.table('players').select('id, name').eq('tour', tour).execute()
    
    player_lookup = {}
    for player in players_result.data:
        normalized = normalize_player_name(player['name'])
        player_lookup[normalized] = player['id']
    
    print(f"   Found {len(player_lookup)} existing players in database")
    
    # Track new players added
    new_players_added = 0
    
    # Process each match
    matched_count = 0
    skipped_count = 0
    
    for idx, row in df.iterrows():
        try:
            # Extract basic info
            tournament_name = str(row.get('tournament', 'Unknown'))
            tournament_level = str(row.get('series', 'Unknown'))
            
            # Parse date
            match_date = row.get('date')
            if pd.notna(match_date):
                match_date = match_date.strftime('%Y-%m-%d')
            else:
                match_date = datetime.now().strftime('%Y-%m-%d')
            
            # Get players
            winner_name = str(row.get('winner', ''))
            loser_name = str(row.get('loser', ''))
            
            if not winner_name or not loser_name:
                skipped_count += 1
                continue
            
            # Get ranking info
            winner_rank = int(row.get('wrank', 0)) if pd.notna(row.get('wrank')) else None
            loser_rank = int(row.get('lrank', 0)) if pd.notna(row.get('lrank')) else None
            
            # Get points info (for creating new players)
            winner_total_points = int(row.get('wpts', 0)) if pd.notna(row.get('wpts')) else 0
            loser_total_points = int(row.get('lpts', 0)) if pd.notna(row.get('lpts')) else 0
            
            # Match to IDs (or create new players)
            winner_normalized = normalize_player_name(winner_name)
            loser_normalized = normalize_player_name(loser_name)
            
            # Try to match winner
            if winner_normalized in player_lookup:
                winner_id = player_lookup[winner_normalized]
            else:
                # Create new player
                winner_id = match_or_create_player(
                    winner_name, 
                    tour, 
                    rank=winner_rank,
                    points=winner_total_points,
                    player_lookup=player_lookup
                )
                if winner_id:
                    new_players_added += 1
            
            # Try to match loser
            if loser_normalized in player_lookup:
                loser_id = player_lookup[loser_normalized]
            else:
                # Create new player
                loser_id = match_or_create_player(
                    loser_name, 
                    tour, 
                    rank=loser_rank,
                    points=loser_total_points,
                    player_lookup=player_lookup
                )
                if loser_id:
                    new_players_added += 1
            
            if not winner_id or not loser_id:
                skipped_count += 1
                continue
            
            # Get points EARNED in this match
            # Note: In the CSV, these might be total points or points earned
            # You may need to adjust based on actual CSV structure
            winner_points_earned = int(row.get('wpts', 0)) if pd.notna(row.get('wpts')) else 0
            loser_points_earned = int(row.get('lpts', 0)) if pd.notna(row.get('lpts')) else 0
            
            # Build score from set scores
            score_parts = []
            for i in range(1, 6):  # Up to 5 sets
                w_set = row.get(f'w{i}')
                l_set = row.get(f'l{i}')
                if pd.notna(w_set) and pd.notna(l_set):
                    score_parts.append(f"{int(w_set)}-{int(l_set)}")
            score = ', '.join(score_parts) if score_parts else ''
            
            # Other details
            surface = str(row.get('surface', 'Hard'))
            round_name = normalize_round_name(row.get('round', 'Final'))
            
            match_data = {
                'tournament_name': tournament_name,
                'tournament_level': tournament_level,
                'match_date': match_date,
                'round': round_name,
                'player1_id': winner_id,
                'player1_name': winner_name,
                'player1_ranking_before': winner_rank,
                'player1_points_earned': winner_points_earned,
                'player2_id': loser_id,
                'player2_name': loser_name,
                'player2_ranking_before': loser_rank,
                'player2_points_earned': loser_points_earned,
                'score': score,
                'surface': surface,
                'tour': tour,
                'status': 'completed'
            }
            
            matches.append(match_data)
            matched_count += 1
            
        except Exception as e:
            print(f"   ❌ Error processing row {idx}: {e}")
            skipped_count += 1
            continue
    
    print(f"✅ Processed {matched_count} matches, skipped {skipped_count}")
    if new_players_added > 0:
        print(f"🆕 Added {new_players_added} new players to database")
    
    return matches

def insert_match_from_csv(match_data):
    """
    Insert a match from CSV data directly
    Uses the points already calculated in the CSV
    """
    supabase = get_supabase_client()
    
    try:
        # Check if match already exists
        existing = supabase.table('matches').select('id').eq(
            'player1_id', match_data['player1_id']
        ).eq('player2_id', match_data['player2_id']).eq(
            'match_date', match_data['match_date']
        ).execute()
        
        if existing.data:
            return None  # Already exists
        
        # Insert match with raw points from CSV
        result = supabase.table('matches').insert({
            'tournament_name': match_data['tournament_name'],
            'tournament_level': match_data['tournament_level'],
            'match_date': match_data['match_date'],
            'round': match_data['round'],
            'player1_name': match_data['player1_name'],
            'player1_id': match_data['player1_id'],
            'player1_ranking_before': match_data.get('player1_ranking_before'),
            'player1_points_earned': match_data['player1_points_earned'],
            'player2_name': match_data['player2_name'],
            'player2_id': match_data['player2_id'],
            'player2_ranking_before': match_data.get('player2_ranking_before'),
            'player2_points_earned': match_data['player2_points_earned'],
            'score': match_data.get('score', ''),
            'surface': match_data.get('surface', ''),
            'tour': match_data['tour'],
            'status': 'completed'
        }).execute()
        
        return result.data
        
    except Exception as e:
        print(f"❌ Error inserting match: {e}")
        return None

def scrape_and_store_csv_matches(year=2026, days_back=30):
    """
    Main function to download CSV data and store in database
    NOW ALSO CREATES NEW PLAYERS AND UPDATES RANKINGS
    
    Returns:
        int: Number of matches inserted
    """
    print("\n" + "="*60)
    print("📥 Starting CSV match data download...")
    print("="*60 + "\n")
    
    # Download and process ATP
    df_atp = download_tennis_data_csv(year, 'ATP')
    
    # Update player rankings from ATP data
    if df_atp is not None:
        update_player_info_from_csv(df_atp)
    
    atp_matches = process_matches_dataframe(df_atp, days_back) if df_atp is not None else []
    time.sleep(2)
    
    # Download and process WTA
    df_wta = download_tennis_data_csv(year, 'WTA')
    
    # Update player rankings from WTA data
    if df_wta is not None:
        update_player_info_from_csv(df_wta)
    
    wta_matches = process_matches_dataframe(df_wta, days_back) if df_wta is not None else []
    
    all_matches = atp_matches + wta_matches
    
    if not all_matches:
        print("⚠️ No matches to insert")
        return 0
    
    print(f"\n💾 Inserting {len(all_matches)} matches into database...")
    
    # Insert matches
    inserted_count = 0
    for match in all_matches:
        result = insert_match_from_csv(match)
        if result:
            inserted_count += 1
            if inserted_count % 10 == 0:
                print(f"   Inserted {inserted_count} matches...")
    
    print("\n" + "="*60)
    print(f"✅ CSV import complete!")
    print(f"   Total matches processed: {len(all_matches)}")
    print(f"   New matches inserted: {inserted_count}")
    print("="*60 + "\n")
    
    return inserted_count

def get_all_tournaments(year=2026):
    """
    Extract tournament information from CSV files
    Similar to the R code's tournaments summary
    
    Returns:
        pandas.DataFrame: Tournament information
    """
    print(f"📊 Extracting tournament data for {year}...")
    
    # Download both tours
    df_atp = download_tennis_data_csv(year, 'ATP')
    df_wta = download_tennis_data_csv(year, 'WTA')
    
    dfs = []
    if df_atp is not None:
        dfs.append(df_atp)
    if df_wta is not None:
        dfs.append(df_wta)
    
    if not dfs:
        return None
    
    df = pd.concat(dfs, ignore_index=True)
    
    # Group by tournament
    tournaments = df.groupby(['tour', 'season', 'tournament_id', 'tournament']).agg({
        'series': 'first',
        'date': ['min', 'max'],
        'surface': 'first',
        'court': 'first',
        'round': lambda x: ('The Final' in x.values or 'Final' in x.values)
    }).reset_index()
    
    # Flatten column names
    tournaments.columns = ['tour', 'season', 'tournament_id', 'tournament_name', 
                          'series', 'start', 'end', 'surface', 'court', 'complete']
    
    tournaments = tournaments.sort_values(['season', 'tour', 'start'])
    
    print(f"✅ Found {len(tournaments)} tournaments")
    return tournaments

def get_all_players_from_csv(year=2026):
    """
    Extract all unique players from CSV files
    Similar to the R code's players extraction
    
    Returns:
        pandas.DataFrame: Players with tour and name
    """
    print(f"👥 Extracting player data for {year}...")
    
    # Download both tours
    df_atp = download_tennis_data_csv(year, 'ATP')
    df_wta = download_tennis_data_csv(year, 'WTA')
    
    dfs = []
    if df_atp is not None:
        dfs.append(df_atp)
    if df_wta is not None:
        dfs.append(df_wta)
    
    if not dfs:
        return None
    
    df = pd.concat(dfs, ignore_index=True)
    
    # Get winners and losers
    winners = df[['tour', 'winner']].rename(columns={'winner': 'player'})
    losers = df[['tour', 'loser']].rename(columns={'loser': 'player'})
    
    # Combine and get unique
    players = pd.concat([winners, losers], ignore_index=True)
    players = players.drop_duplicates().sort_values(['tour', 'player']).reset_index(drop=True)
    players['id'] = range(1, len(players) + 1)
    
    print(f"✅ Found {len(players)} unique players")
    return players

def update_player_info_from_csv(df):
    """
    Update player rankings and points from CSV data
    Uses the most recent data for each player
    
    Args:
        df: DataFrame with match data
    """
    if df is None or df.empty:
        return
    
    print("📊 Updating player rankings from CSV...")
    
    supabase = get_supabase_client()
    tour = df['tour'].iloc[0] if 'tour' in df.columns else 'ATP'
    
    # Get most recent data for each player (winners)
    winner_data = df[['winner', 'wrank', 'wpts']].rename(
        columns={'winner': 'player', 'wrank': 'rank', 'wpts': 'points'}
    )
    
    # Get most recent data for each player (losers)
    loser_data = df[['loser', 'lrank', 'lpts']].rename(
        columns={'loser': 'player', 'lrank': 'rank', 'lpts': 'points'}
    )
    
    # Combine
    all_player_data = pd.concat([winner_data, loser_data], ignore_index=True)
    all_player_data = all_player_data.dropna(subset=['player'])
    
    # Get most recent (highest rank = lowest number) for each player
    player_rankings = all_player_data.groupby('player').agg({
        'rank': 'min',  # Best (lowest) rank
        'points': 'max'  # Highest points
    }).reset_index()
    
    updated_count = 0
    
    for _, row in player_rankings.iterrows():
        player_name = row['player']
        rank = int(row['rank']) if pd.notna(row['rank']) else None
        points = int(row['points']) if pd.notna(row['points']) else 0
        
        if not rank or rank == 0:
            continue
        
        try:
            # Find player by name
            normalized = normalize_player_name(player_name)
            result = supabase.table('players').select('id, name').eq('tour', tour).execute()
            
            player_id = None
            for player in result.data:
                if normalize_player_name(player['name']) == normalized:
                    player_id = player['id']
                    break
            
            if player_id:
                # Update ranking and points
                supabase.table('players').update({
                    'rank': rank,
                    'points': points
                }).eq('id', player_id).execute()
                updated_count += 1
        
        except Exception as e:
            print(f"   ⚠️ Error updating {player_name}: {e}")
            continue
    
    print(f"✅ Updated rankings for {updated_count} players")