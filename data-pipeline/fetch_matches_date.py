#!/usr/bin/env python3
"""
Fetch tennis match data from RapidAPI for a specific date
Usage: python fetch_tennis_date.py YYYY-MM-DD
Example: python fetch_tennis_date.py 2024-01-15
"""

import http.client
import json
import os
import sys
from datetime import datetime


def validate_date(date_string):
    """
    Validate date string format (YYYY-MM-DD)
    Returns datetime object if valid, None otherwise
    """
    try:
        date_obj = datetime.strptime(date_string, '%Y-%m-%d')
        return date_obj
    except ValueError:
        return None


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


def fetch_for_specific_date(date_str):
    """
    Fetch matches for a specific date
    """
    print("=" * 80)
    print(f"FETCHING TENNIS MATCH DATA FOR {date_str}")
    print("=" * 80)
    
    # Validate date format
    date_obj = validate_date(date_str)
    if not date_obj:
        print(f"\n✗ ERROR: Invalid date format '{date_str}'")
        print("Please use format: YYYY-MM-DD (e.g., 2024-01-15)")
        return None
    
    # Fetch data
    data = fetch_matches_for_date(date_str)
    
    if not data:
        print(f"\n✗ Failed to fetch data for {date_str}")
        return None
    
    # Format result
    result = {
        'fetch_date': datetime.now().isoformat(),
        'date_requested': date_str,
        'total_tournaments': len(data),
        'data': data
    }
    
    return result


def save_to_file(data, date_str):
    """Save fetched data to JSON file with date in filename in api_pulls folder"""
    # Create api_pulls directory if it doesn't exist
    os.makedirs('api_pulls', exist_ok=True)
    
    filename = f'api_pulls/tennis_matches_{date_str}.json'
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\n✓ Saved data to {filename}")
    print(f"✓ Total tournaments: {data['total_tournaments']}")


def main():
    """
    Entry point - parse command line arguments
    """
    if len(sys.argv) != 2:
        print("Usage: python fetch_tennis_date.py YYYY-MM-DD")
        print("Example: python fetch_tennis_date.py 2024-01-15")
        sys.exit(1)
    
    date_str = sys.argv[1]
    
    # Fetch data
    data = fetch_for_specific_date(date_str)
    
    if data:
        save_to_file(data, date_str)
        print("\n" + "=" * 80)
        print("FETCH COMPLETE")
        print("=" * 80)
    else:
        print("\n✗ Fetch failed")
        sys.exit(1)


if __name__ == "__main__":
    main()