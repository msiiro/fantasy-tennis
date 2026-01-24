import http.client
import json
from datetime import datetime, timedelta
import os

RAPIDAPI_KEY = "3a0418da1bmsh13fb9dd67aa52c0p16b691jsn8f1da227144c" 
OUTPUT_FOLDER = "tennis_data"

def ensure_folder_exists(folder_path):
    """Create folder if it doesn't exist"""
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        print(f"Created folder: {folder_path}")

def get_tennis_matches(date_str, save_to_file=True):
    """
    Get tennis fixtures for a specific date
    date_str: Format 'YYYY-MM-DD' (e.g., '2026-01-23')
    save_to_file: If True, saves the response to a JSON file
    """
    conn = http.client.HTTPSConnection("tennisapi1.p.rapidapi.com")
    
    headers = {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': "tennisapi1.p.rapidapi.com"
    }
    
    # Convert date string to datetime object
    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    
    # Format as YYYY/M/D (no leading zeros for month and day)
    year = date_obj.year
    month = date_obj.month
    day = date_obj.day
    
    # Construct the endpoint path
    endpoint = f"/api/tennis/events/{day}/{month}/{year}"
    
    print(f"Requesting: {endpoint}")
    
    conn.request("GET", endpoint, headers=headers)
    
    res = conn.getresponse()
    data = res.read()
    
    # Parse JSON response
    matches = json.loads(data.decode("utf-8"))
    
    conn.close()
    
    # Save to file if requested
    if save_to_file:
        ensure_folder_exists(OUTPUT_FOLDER)
        
        # Create filename with date
        filename = f"tennis_matches_{date_str}.json"
        filepath = os.path.join(OUTPUT_FOLDER, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(matches, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Saved to: {filepath}")
    
    return matches

# Example usage:
if __name__ == "__main__":
    # Get today's matches
    today = datetime.now().strftime('%Y-%m-%d')
    print(f"Fetching matches for today ({today})...")
    today_matches = get_tennis_matches(today)
    
    # Get tomorrow's matches
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    print(f"\nFetching matches for tomorrow ({tomorrow})...")
    tomorrow_matches = get_tennis_matches(tomorrow)
    
    # Get yesterday's matches
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    print(f"\nFetching matches for yesterday ({yesterday})...")
    yesterday_matches = get_tennis_matches(yesterday)