import json
from pathlib import Path

def get_tournament_types(data):
    if isinstance(data, dict):
        events = data.get("events", [])
    elif isinstance(data, list):
        events = data
    else:
        raise ValueError("Unexpected JSON structure")
    
    tournament_types = set()
    for event in events:
        filters = event.get("eventFilters", {})
        types = filters.get("tournament", [])
        tournament_types.update(types)
    
    return tournament_types


if __name__ == "__main__":
    folder = Path("tennis_data")
    combos = set()

    for filepath in folder.glob("*.json"):
        with open(filepath, "r") as f:
            data = json.load(f)
        events = data.get("events", []) if isinstance(data, dict) else data
        for event in events:
            ut = event.get("tournament", {}).get("uniqueTournament", {})
            category = ut.get("category", {}).get("name", "unknown")
            points = ut.get("tennisPoints", "unknown")
            combos.add((category, points))

    for category, points in sorted(combos, key=lambda x: (x[0], str(x[1]))):
        print(f"  {category}: {points} points")