#!/usr/bin/env python3
import os
from pathlib import Path

print("=" * 80)
print("ENVIRONMENT DEBUG")
print("=" * 80)

# Check current directory
print(f"\nCurrent directory: {os.getcwd()}")

# Check if .env exists
env_file = Path('.env')
print(f"\n.env file exists: {env_file.exists()}")
print(f".env absolute path: {env_file.absolute()}")

if env_file.exists():
    print(f"\n.env file contents:")
    with open('.env', 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key = line.split('=')[0]
                print(f"  {key}=***")

# Try loading with dotenv
print("\n" + "=" * 80)
print("TESTING DOTENV")
print("=" * 80)

try:
    from dotenv import load_dotenv
    print("\n✓ dotenv imported successfully")
    
    result = load_dotenv()
    print(f"load_dotenv() returned: {result}")
    
    # Check if variables are loaded
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    print(f"\nSUPABASE_URL: {supabase_url}")
    print(f"SUPABASE_KEY: {'***' + supabase_key[-10:] if supabase_key else 'None'}")
    
    if supabase_url and supabase_key:
        print("\n✓ Environment variables loaded successfully!")
    else:
        print("\n✗ Environment variables NOT loaded")
        
except ImportError:
    print("\n✗ dotenv not installed")
except Exception as e:
    print(f"\n✗ Error: {e}")