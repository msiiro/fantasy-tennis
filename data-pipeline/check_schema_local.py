"""
Run this script in your local environment where you have supabase installed.

This will help identify the schema mismatch causing the team_id error.
"""

from supabase import create_client, Client
from dotenv import load_dotenv
import os
import json

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("="*80)
print("SUPABASE SCHEMA CHECKER")
print("="*80)

# Step 1: Get existing data to see actual column names
print("\n1. Checking existing records in table...")
try:
    result = supabase.table('tennis_matches').select('*').limit(1).execute()
    
    if result.data and len(result.data) > 0:
        db_columns = sorted(result.data[0].keys())
        print(f"✓ Found columns in database ({len(db_columns)} total):")
        for col in db_columns:
            print(f"  - {col}")
        
        # Check if team_id exists
        if 'team_id' in db_columns:
            print("\n⚠️  FOUND THE PROBLEM!")
            print("   'team_id' column EXISTS in your database table")
            print("   but your transform_match_data() function doesn't provide it.")
    else:
        print("⚠️  Table is empty, cannot determine columns from data")
        print("   Will try a test insert instead...")
        
except Exception as e:
    print(f"✗ Error: {e}")

# Step 2: Try a minimal insert to see what's required
print("\n" + "="*80)
print("2. Testing what columns are required...")
try:
    # Try inserting with just match_id
    test = supabase.table('tennis_matches').insert({
        'match_id': 999999999
    }).execute()
    print("✓ Insert with just match_id succeeded")
except Exception as e:
    error_str = str(e)
    print(f"✗ Insert failed: {error_str}")
    
    # Check if error mentions team_id
    if 'team_id' in error_str:
        print("\n⚠️  CONFIRMED: The error mentions 'team_id'")
        print("   Your table schema has a 'team_id' column that needs a value")

# Step 3: Load the transformed data and compare
print("\n" + "="*80)
print("3. Comparing with our transformed data...")

# Load the transformed error record
with open('errors_20260125_223640.json', 'r') as f:
    transformed = json.load(f)

our_columns = set(transformed.keys())
print(f"\nOur transform creates {len(our_columns)} columns")

try:
    result = supabase.table('tennis_matches').select('*').limit(1).execute()
    if result.data and len(result.data) > 0:
        db_columns = set(result.data[0].keys())
        
        print(f"\nColumns in DATABASE but NOT in our TRANSFORM:")
        missing = db_columns - our_columns
        if missing:
            for col in sorted(missing):
                print(f"  ⚠️  {col} <- THIS IS MISSING!")
        else:
            print("  (none)")
        
        print(f"\nColumns in our TRANSFORM but NOT in DATABASE:")
        extra = our_columns - db_columns
        if extra:
            for col in sorted(extra):
                print(f"  - {col}")
        else:
            print("  (none)")

except Exception as e:
    print(f"Could not compare: {e}")

print("\n" + "="*80)
print("RECOMMENDATION:")
print("="*80)
if 'team_id' in str(locals()):
    print("""
Either:
A) Add 'team_id' to your transform_match_data() function, or
B) Remove the 'team_id' column from your Supabase table, or  
C) Make 'team_id' nullable with a default value in Supabase

To remove the column in Supabase, run this SQL:
    ALTER TABLE tennis_matches DROP COLUMN team_id;

To make it nullable:
    ALTER TABLE tennis_matches ALTER COLUMN team_id DROP NOT NULL;
    ALTER TABLE tennis_matches ALTER COLUMN team_id SET DEFAULT NULL;
""")
else:
    print("Could not determine the exact issue. Check the output above.")