#!/usr/bin/env python3
"""
Fetch tennis match data from RapidAPI
"""

import http.client
import json
import os
from datetime import datetime, timedelta

def fetch_matches_for_date(date_str, api_key=None, api_host=None):
    """
    Fetch matches for a specific date
    """
    if not api_key:
        api_key = os.getenv('RAPIDAPI_KEY', '3a0418da1bmsh13fb9dd67aa52c0p16b691jsn8f1da227144c')
    
    if not api_host:
        api_host = os.getenv('RAPIDAPI_HOST', 'livescore67.p.rapidapi.com')
    
    conn = http.client.HTTPSConnection(api_host)
    
    headers = {
        'x-rapidapi-key': api_key,
        'x-rapidapi-host': api_host
    }
    
    endpoint = f"/api/livescore/v1/match/list?sport_id=tennis&date={date_str}"
    
    try:
        print(f"Fetching matches for {date_str}...")
        conn.request("GET", endpoint, headers=headers)
        res = conn.getresponse()
        data = res.read()
        
        if res.status == 200:
            print(f"✓ Successfully fetched data for {date_str}")
            return json.loads(data.decode("utf-8"))
        else:
            print(f"✗ Error: HTTP {res.status}")
            print(data.decode("utf-8"))
            return None
            
    except Exception as e:
        print(f"✗ Exception: {e}")
        return None
    finally:
        conn.close()


def fetch_yesterday_and_today():
    """
    Fetch matches for yesterday and today
    """
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    
    today_str = today.strftime('%Y-%m-%d')
    yesterday_str = yesterday.strftime('%Y-%m-%d')
    
    print("=" * 80)
    print("FETCHING TENNIS MATCH DATA")
    print("=" * 80)
    print(f"Yesterday: {yesterday_str}")
    print(f"Today: {today_str}\n")
    
    # Fetch both days
    yesterday_data = fetch_matches_for_date(yesterday_str)
    today_data = fetch_matches_for_date(today_str)
    
    # Combine results
    combined_data = []
    
    if yesterday_data:
        combined_data.extend(yesterday_data)
    
    if today_data:
        combined_data.extend(today_data)
    
    return {
        'fetch_date': datetime.now().isoformat(),
        'dates_included': [yesterday_str, today_str],
        'total_tournaments': len(combined_data),
        'data': combined_data
    }


def save_to_file(data, filename='tennis_matches.json'):
    """Save fetched data to JSON file"""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\n✓ Saved data to {filename}")


if __name__ == "__main__":
    data = fetch_yesterday_and_today()
    save_to_file(data)
    print(f"\nTotal tournaments: {data['total_tournaments']}")