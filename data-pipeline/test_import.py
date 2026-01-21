#!/usr/bin/env python3

import sys
print(f"Python path: {sys.path}\n")

try:
    import fetch_matches
    print("✓ fetch_matches module imported")
    print(f"Module location: {fetch_matches.__file__}")
    print(f"\nAvailable functions in fetch_matches:")
    print([name for name in dir(fetch_matches) if not name.startswith('_')])
except Exception as e:
    print(f"✗ Error importing fetch_matches: {e}")
    import traceback
    traceback.print_exc()