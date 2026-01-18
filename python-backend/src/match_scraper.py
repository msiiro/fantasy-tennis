"""
Scrape match results from tennis websites
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import time
from match_results import insert_match_result, calculate_points

def scrape_atp_matches(days_back=7):
    """
    Scrape recent ATP match results
    
    Args:
        days_back: Number of days to look back for results
    
    Returns:
        list: Match result dictionaries
    """
    print(f"🎾 Scraping ATP match results (last {days_back} days)...")
    
    matches = []
    
    # ATP Tour scores page
    url = "https://www.atptour.com/en/scores/results-archive"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find tournament results
        tournament_blocks = soup.find_all('div', class_='tournament-block')
        
        for block in tournament_blocks[:5]:  # Process recent tournaments
            try:
                # Get tournament info
                tournament_name = block.find('span', class_='tourney-title')
                tournament_name = tournament_name.text.strip() if tournament_name else 'Unknown'
                
                # Determine tournament level
                tournament_level = determine_tournament_level(tournament_name)
                
                # Get tournament dates
                date_elem = block.find('span', class_='tourney-dates')
                match_date = parse_date(date_elem.text if date_elem else '')
                
                # Get surface
                surface_elem = block.find('span', class_='item-surface')
                surface = surface_elem.text.strip() if surface_elem else 'Hard'
                
                # Find match results
                match_cards = block.find_all('div', class_='day-item')
                
                for card in match_cards[:10]:  # Limit per tournament
                    try:
                        match = parse_atp_match_card(
                            card, 
                            tournament_name, 
                            tournament_level, 
                            match_date, 
                            surface
                        )
                        if match:
                            matches.append(match)
                    except Exception as e:
                        print(f"Debug: Error parsing match card: {e}")
                        continue
                        
            except Exception as e:
                print(f"Debug: Error parsing tournament block: {e}")
                continue
        
        print(f"✅ Scraped {len(matches)} ATP match results")
        return matches
        
    except Exception as e:
        print(f"❌ Error scraping ATP matches: {e}")
        return []

def parse_atp_match_card(card, tournament_name, tournament_level, match_date, surface):
    """
    Parse individual match card from ATP website
    
    Returns:
        dict: Match data or None
    """
    # Get round info
    round_elem = card.find('span', class_='round-title')
    round_name = round_elem.text.strip() if round_elem else 'Unknown'
    round_name = normalize_round_name(round_name)
    
    # Get players
    players = card.find_all('a', class_='player-name')
    if len(players) < 2:
        return None
    
    player1_name = players[0].text.strip()
    player2_name = players[1].text.strip()
    
    # Get score
    score_elem = card.find('div', class_='match-score')
    score = score_elem.text.strip() if score_elem else ''
    
    # Determine winner (player 1 is typically the winner on ATP site)
    # You might need to parse the score to determine actual winner
    
    return {
        'tournament_name': tournament_name,
        'tournament_level': tournament_level,
        'match_date': match_date,
        'round': round_name,
        'player1_name': player1_name,
        'player2_name': player2_name,
        'score': score,
        'surface': surface,
        'tour': 'ATP',
        'status': 'completed'
    }

def scrape_wta_matches(days_back=7):
    """
    Scrape recent WTA match results
    """
    print(f"🎾 Scraping WTA match results (last {days_back} days)...")
    
    matches = []
    
    url = "https://www.wtatennis.com/scores"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # WTA has different structure - adjust as needed
        match_cards = soup.find_all('div', class_='match-card')
        
        for card in match_cards[:20]:
            try:
                # Extract match info (adjust selectors based on actual HTML)
                tournament = card.find('div', class_='tournament-name')
                tournament_name = tournament.text.strip() if tournament else 'Unknown'
                
                tournament_level = determine_tournament_level(tournament_name, tour='WTA')
                
                # Get players and score
                players = card.find_all('div', class_='player-name')
                if len(players) >= 2:
                    player1_name = players[0].text.strip()
                    player2_name = players[1].text.strip()
                    
                    # Get round
                    round_elem = card.find('div', class_='round')
                    round_name = normalize_round_name(round_elem.text if round_elem else 'Final')
                    
                    # Get score
                    score_elem = card.find('div', class_='score')
                    score = score_elem.text.strip() if score_elem else ''
                    
                    matches.append({
                        'tournament_name': tournament_name,
                        'tournament_level': tournament_level,
                        'match_date': datetime.now().strftime('%Y-%m-%d'),
                        'round': round_name,
                        'player1_name': player1_name,
                        'player2_name': player2_name,
                        'score': score,
                        'surface': 'Hard',
                        'tour': 'WTA',
                        'status': 'completed'
                    })
            except Exception as e:
                print(f"Debug: Error parsing WTA match: {e}")
                continue
        
        print(f"✅ Scraped {len(matches)} WTA match results")
        return matches
        
    except Exception as e:
        print(f"❌ Error scraping WTA matches: {e}")
        return []

def determine_tournament_level(tournament_name, tour='ATP'):
    """
    Determine tournament level from name
    
    Returns:
        str: Tournament level
    """
    tournament_name_lower = tournament_name.lower()
    
    # Grand Slams
    if any(slam in tournament_name_lower for slam in ['australian open', 'french open', 'roland garros', 'wimbledon', 'us open']):
        return 'Grand Slam'
    
    # Masters 1000
    if tour == 'ATP' and any(masters in tournament_name_lower for masters in [
        'indian wells', 'miami', 'monte carlo', 'madrid', 'rome', 
        'canada', 'cincinnati', 'shanghai', 'paris', 'masters 1000'
    ]):
        return 'Masters 1000'
    
    # WTA 1000
    if tour == 'WTA' and any(wta1000 in tournament_name_lower for wta1000 in [
        'doha', 'dubai', 'indian wells', 'miami', 'madrid', 'rome',
        'canada', 'cincinnati', 'wuhan', 'beijing', 'wta 1000'
    ]):
        return 'WTA 1000'
    
    # ATP 500
    if tour == 'ATP' and ('500' in tournament_name or any(atp500 in tournament_name_lower for atp500 in [
        'rotterdam', 'dubai', 'barcelona', 'queens', 'halle', 'washington', 'beijing', 'tokyo', 'basel', 'vienna'
    ])):
        return 'ATP 500'
    
    # WTA 500
    if tour == 'WTA' and ('500' in tournament_name or any(wta500 in tournament_name_lower for wta500 in [
        'adelaide', 'dubai', 'charleston', 'stuttgart', 'berlin', 'eastbourne', 'san diego', 'tokyo', 'zhengzhou'
    ])):
        return 'WTA 500'
    
    # Default to 250
    return f'{tour} 250'

def normalize_round_name(round_text):
    """
    Normalize round names to standard format
    
    Returns:
        str: Normalized round name
    """
    round_text = round_text.lower().strip()
    
    round_map = {
        'final': 'Final',
        'finals': 'Final',
        'f': 'Final',
        'semi-final': 'Semi-Final',
        'semifinal': 'Semi-Final',
        'semi final': 'Semi-Final',
        'sf': 'Semi-Final',
        'semis': 'Semi-Final',
        'quarter-final': 'Quarter-Final',
        'quarterfinal': 'Quarter-Final',
        'quarter final': 'Quarter-Final',
        'qf': 'Quarter-Final',
        'quarters': 'Quarter-Final',
        'round of 16': 'Round of 16',
        'r16': 'Round of 16',
        '4th round': 'Round of 16',
        'round of 32': 'Round of 32',
        'r32': 'Round of 32',
        '3rd round': 'Round of 32',
        'round of 64': 'Round of 64',
        'r64': 'Round of 64',
        '2nd round': 'Round of 64',
        'round of 128': 'Round of 128',
        'r128': 'Round of 128',
        '1st round': 'Round of 128'
    }
    
    return round_map.get(round_text, 'Final')

def parse_date(date_text):
    """
    Parse date from various formats
    
    Returns:
        str: Date in YYYY-MM-DD format
    """
    if not date_text:
        return datetime.now().strftime('%Y-%m-%d')
    
    try:
        # Try common formats
        for fmt in ['%Y.%m.%d', '%m/%d/%Y', '%d.%m.%Y', '%B %d, %Y']:
            try:
                return datetime.strptime(date_text.strip(), fmt).strftime('%Y-%m-%d')
            except:
                continue
        
        # Default to today
        return datetime.now().strftime('%Y-%m-%d')
    except:
        return datetime.now().strftime('%Y-%m-%d')

def match_player_names_to_ids(matches):
    """
    Match player names from scraped data to player IDs in database
    
    Args:
        matches: List of match dicts with player names
    
    Returns:
        list: Matches with player_id fields added
    """
    from supabase_client import get_supabase_client
    
    supabase = get_supabase_client()
    
    # Get all players from database
    players_result = supabase.table('players').select('id, name, tour').execute()
    players_db = players_result.data
    
    # Create name lookup (normalize names for matching)
    name_lookup = {}
    for player in players_db:
        normalized_name = normalize_player_name(player['name'])
        key = (normalized_name, player['tour'])
        name_lookup[key] = player['id']
    
    # Match players
    for match in matches:
        # Try to match player 1
        norm_p1 = normalize_player_name(match['player1_name'])
        key1 = (norm_p1, match['tour'])
        if key1 in name_lookup:
            match['player1_id'] = name_lookup[key1]
        
        # Try to match player 2
        norm_p2 = normalize_player_name(match['player2_name'])
        key2 = (norm_p2, match['tour'])
        if key2 in name_lookup:
            match['player2_id'] = name_lookup[key2]
    
    matched_count = sum(1 for m in matches if 'player1_id' in m and 'player2_id' in m)
    print(f"✅ Matched {matched_count}/{len(matches)} matches to player IDs")
    
    return matches

def normalize_player_name(name):
    """
    Normalize player name for matching
    Removes accents, extra spaces, etc.
    
    Returns:
        str: Normalized name
    """
    import unicodedata
    
    # Remove accents
    name = ''.join(
        c for c in unicodedata.normalize('NFD', name)
        if unicodedata.category(c) != 'Mn'
    )
    
    # Convert to lowercase, remove extra spaces
    name = ' '.join(name.lower().split())
    
    # Remove common suffixes
    name = name.replace(' jr.', '').replace(' jr', '').replace(' sr.', '').replace(' sr', '')
    
    return name

def scrape_and_store_match_results(days_back=7):
    """
    Main function to scrape match results and store in database
    
    Args:
        days_back: Number of days to look back
    
    Returns:
        int: Number of matches inserted
    """
    print("\n" + "="*60)
    print("🎾 Starting match results scraping...")
    print("="*60 + "\n")
    
    # Scrape matches
    atp_matches = scrape_atp_matches(days_back)
    time.sleep(3)
    
    wta_matches = scrape_wta_matches(days_back)
    time.sleep(3)
    
    all_matches = atp_matches + wta_matches
    
    if not all_matches:
        print("⚠️ No matches found")
        return 0
    
    # Match player names to IDs
    all_matches = match_player_names_to_ids(all_matches)
    
    # Insert matches
    inserted_count = 0
    for match in all_matches:
        # Only insert if we have player IDs (so we can track fantasy points)
        if 'player1_id' in match and 'player2_id' in match:
            result = insert_match_result(match)
            if result:
                inserted_count += 1
        else:
            print(f"⚠️ Skipping match {match['player1_name']} vs {match['player2_name']} - players not in database")
    
    print("\n" + "="*60)
    print(f"✅ Match scraping complete!")
    print(f"   Total matches found: {len(all_matches)}")
    print(f"   Matches inserted: {inserted_count}")
    print("="*60 + "\n")
    
    return inserted_count