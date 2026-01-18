"""
Web scraper for tennis data - using more reliable sources
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import time
import json

def scrape_atp_rankings():
    """
    Scrape ATP rankings using alternative method
    """
    print("🎾 Scraping ATP rankings...")
    
    # Try using the ATP's data endpoint (they have a JSON API)
    url = "https://www.atptour.com/en/rankings/singles?rankDate=current&rankRange=1-100"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        players = []
        
        # Look for the rankings table with updated selectors
        # ATP uses different class names, let's try multiple approaches
        
        # Method 1: Find all divs with player info
        player_cards = soup.find_all('div', class_='player-cell')
        rank_cells = soup.find_all('td', class_='rank-cell')
        points_cells = soup.find_all('td', class_='points-cell')
        
        print(f"Debug: Found {len(player_cards)} player cards, {len(rank_cells)} ranks, {len(points_cells)} points")
        
        # Method 2: Look for the actual table structure
        tbody = soup.find('tbody')
        if tbody:
            rows = tbody.find_all('tr')
            print(f"Debug: Found {len(rows)} rows in tbody")
            
            for row in rows[:50]:  # Top 50
                try:
                    cells = row.find_all('td')
                    if len(cells) >= 3:
                        # Extract rank
                        rank_text = cells[0].get_text(strip=True)
                        rank = int(''.join(filter(str.isdigit, rank_text)))
                        
                        # Extract name - might be in different cells
                        name_cell = None
                        for cell in cells[1:4]:
                            if cell.find('a'):
                                name_cell = cell
                                break
                        
                        if name_cell:
                            name = name_cell.get_text(strip=True)
                            # Clean up name (remove extra spaces, numbers)
                            name = ' '.join(name.split())
                            
                            # Extract points - usually last cell
                            points_text = cells[-1].get_text(strip=True).replace(',', '').replace('.', '')
                            points = int(''.join(filter(str.isdigit, points_text))) if points_text else 0
                            
                            # Extract country if possible
                            country = ''
                            img = row.find('img', class_='country-flag')
                            if img and img.get('alt'):
                                country = img['alt'][:3]
                            
                            if rank and name and points:
                                players.append({
                                    'name': name,
                                    'rank': rank,
                                    'points': points,
                                    'country': country,
                                    'tour': 'ATP'
                                })
                                
                except Exception as e:
                    print(f"Debug: Error parsing row: {e}")
                    continue
        
        print(f"✅ Scraped {len(players)} ATP players")
        
        # If we got 0 players, print some debug info
        if len(players) == 0:
            print("⚠️ No players found. Printing first 1000 chars of HTML:")
            print(str(soup)[:1000])
        
        return players
        
    except Exception as e:
        print(f"❌ Error scraping ATP rankings: {e}")
        return []

def scrape_wta_rankings():
    """
    Scrape WTA rankings
    """
    print("🎾 Scraping WTA rankings...")
    
    url = "https://www.wtatennis.com/rankings/singles"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        players = []
        
        # WTA also uses tables
        tbody = soup.find('tbody')
        if tbody:
            rows = tbody.find_all('tr')
            print(f"Debug: Found {len(rows)} WTA rows")
            
            for row in rows[:50]:
                try:
                    cells = row.find_all('td')
                    if len(cells) >= 4:
                        rank = int(''.join(filter(str.isdigit, cells[0].get_text(strip=True))))
                        name = cells[2].get_text(strip=True)
                        name = ' '.join(name.split())
                        
                        points_text = cells[3].get_text(strip=True).replace(',', '')
                        points = int(''.join(filter(str.isdigit, points_text))) if points_text else 0
                        
                        country = cells[1].get_text(strip=True)[:3] if len(cells) > 1 else ''
                        
                        if rank and name and points:
                            players.append({
                                'name': name,
                                'rank': rank,
                                'points': points,
                                'country': country,
                                'tour': 'WTA'
                            })
                except Exception as e:
                    print(f"Debug: Error parsing WTA row: {e}")
                    continue
        
        print(f"✅ Scraped {len(players)} WTA players")
        
        if len(players) == 0:
            print("⚠️ No WTA players found. Printing first 1000 chars of HTML:")
            print(str(soup)[:1000])
        
        return players
        
    except Exception as e:
        print(f"❌ Error scraping WTA rankings: {e}")
        return []

def scrape_upcoming_matches():
    """
    Scrape upcoming matches - for now return empty
    We can add this later once rankings work
    """
    print("📅 Scraping upcoming matches...")
    print("⚠️ Match scraping not implemented yet - coming soon!")
    return []

def get_all_tennis_data():
    """
    Main function to scrape all tennis data
    """
    print("\n" + "="*50)
    print("🎾 Starting tennis data scraping...")
    print("="*50 + "\n")
    
    atp_players = scrape_atp_rankings()
    time.sleep(3)  # Be nice to servers
    
    wta_players = scrape_wta_rankings()
    time.sleep(3)
    
    all_players = atp_players + wta_players
    
    matches = scrape_upcoming_matches()
    
    print("\n" + "="*50)
    print(f"✅ Scraping complete!")
    print(f"   Players: {len(all_players)} (ATP: {len(atp_players)}, WTA: {len(wta_players)})")
    print(f"   Matches: {len(matches)}")
    print("="*50 + "\n")
    
    return {
        'players': all_players,
        'matches': matches
    }