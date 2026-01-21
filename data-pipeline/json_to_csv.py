#!/usr/bin/env python3
"""
Convert tennis_matches.json to CSV format
"""

import json
import csv

def is_singles_match(match):
    """Check if match is singles"""
    home_team = match.get('team_home', [])
    away_team = match.get('team_away', [])
    return len(home_team) == 1 and len(away_team) == 1

def determine_tour(tournament_name, stage_name):
    """Determine if tournament is ATP or WTA"""
    combined = f"{tournament_name} {stage_name}".lower()
    if any(keyword in combined for keyword in ['women', 'wta', "women's"]):
        return 'WTA'
    return 'ATP'

def convert_json_to_csv(json_file='tennis_matches.json', csv_file='tennis_matches.csv'):
    """Convert JSON to CSV"""
    
    print("=" * 80)
    print("CONVERTING JSON TO CSV")
    print("=" * 80)
    
    # Load JSON
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    print(f"\nLoaded: {json_file}")
    print(f"Tournaments: {data.get('total_tournaments', len(data.get('data', [])))}")
    
    # Flatten data
    flat_matches = []
    
    for tournament in data.get('data', []):
        tournament_name = tournament['country']['country_name']
        tournament_code = tournament['country']['country_code']
        stage_name = tournament['stage']['stage_name']
        stage_id = tournament['stage']['stage_id']
        tour = determine_tour(tournament_name, stage_name)
        
        for match in tournament['matches']:
            match_type = 'singles' if is_singles_match(match) else 'doubles'
            
            home_team = match.get('team_home', [])
            away_team = match.get('team_away', [])
            
            # Singles
            if match_type == 'singles':
                home_player = home_team[0] if home_team else {}
                away_player = away_team[0] if away_team else {}
                
                home_player_id = home_player.get('team_id', '')
                home_player_name = home_player.get('team_name', '')
                away_player_id = away_player.get('team_id', '')
                away_player_name = away_player.get('team_name', '')
                
                home_partner_id = ''
                home_partner_name = ''
                away_partner_id = ''
                away_partner_name = ''
            else:
                # Doubles
                home_player = home_team[0] if len(home_team) > 0 else {}
                home_partner = home_team[1] if len(home_team) > 1 else {}
                away_player = away_team[0] if len(away_team) > 0 else {}
                away_partner = away_team[1] if len(away_team) > 1 else {}
                
                home_player_id = home_player.get('team_id', '')
                home_player_name = home_player.get('team_name', '')
                home_partner_id = home_partner.get('team_id', '')
                home_partner_name = home_partner.get('team_name', '')
                
                away_player_id = away_player.get('team_id', '')
                away_player_name = away_player.get('team_name', '')
                away_partner_id = away_partner.get('team_id', '')
                away_partner_name = away_partner.get('team_name', '')
            
            scores = match.get('scores', {})
            
            flat_match = {
                'match_id': match['match_id'],
                'match_type': match_type,
                'tournament_name': tournament_name,
                'tournament_code': tournament_code,
                'tour': tour,
                'stage_name': stage_name,
                'stage_id': stage_id,
                'match_date': match['match_date'],
                'match_round': match.get('match_round_info', ''),
                'is_in_progress': match['match_status'].get('is_in_progress', False),
                'live_time': match['match_status'].get('live_time', ''),
                'match_winner': match.get('match_winner', ''),
                'home_player_id': home_player_id,
                'home_player_name': home_player_name,
                'home_partner_id': home_partner_id,
                'home_partner_name': home_partner_name,
                'away_player_id': away_player_id,
                'away_player_name': away_player_name,
                'away_partner_id': away_partner_id,
                'away_partner_name': away_partner_name,
                'home_score': scores.get('home', ''),
                'away_score': scores.get('away', ''),
                'home_set1': scores.get('home_set1', ''),
                'away_set1': scores.get('away_set1', ''),
                'home_set2': scores.get('home_set2', ''),
                'away_set2': scores.get('away_set2', ''),
                'home_set3': scores.get('home_set3', ''),
                'away_set3': scores.get('away_set3', ''),
                'home_set1_tiebreak': scores.get('home_set1_tiebreak', ''),
                'away_set1_tiebreak': scores.get('away_set1_tiebreak', ''),
                'home_set2_tiebreak': scores.get('home_set2_tiebreak', ''),
                'away_set2_tiebreak': scores.get('away_set2_tiebreak', ''),
            }
            
            flat_matches.append(flat_match)
    
    # Write CSV
    fieldnames = [
        'match_id', 'match_type', 'tournament_name', 'tournament_code', 'tour',
        'stage_name', 'stage_id', 'match_date', 'match_round',
        'is_in_progress', 'live_time', 'match_winner',
        'home_player_id', 'home_player_name', 'home_partner_id', 'home_partner_name',
        'away_player_id', 'away_player_name', 'away_partner_id', 'away_partner_name',
        'home_score', 'away_score',
        'home_set1', 'away_set1', 'home_set2', 'away_set2', 'home_set3', 'away_set3',
        'home_set1_tiebreak', 'away_set1_tiebreak', 'home_set2_tiebreak', 'away_set2_tiebreak'
    ]
    
    with open(csv_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(flat_matches)
    
    print(f"\n✓ Saved {len(flat_matches)} matches to {csv_file}")
    
    # Statistics
    singles = sum(1 for m in flat_matches if m['match_type'] == 'singles')
    doubles = sum(1 for m in flat_matches if m['match_type'] == 'doubles')
    
    print(f"\nStatistics:")
    print(f"  Singles: {singles}")
    print(f"  Doubles: {doubles}")
    print(f"  Total:   {len(flat_matches)}")
    print("\n" + "=" * 80)

if __name__ == "__main__":
    convert_json_to_csv()