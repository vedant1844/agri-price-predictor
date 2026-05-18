"""Quick script to check Supabase database status."""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
except ImportError:
    pass

import psycopg2

db_url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(db_url)
cur = conn.cursor()

print("=== SUPABASE DATABASE STATUS ===\n")

# Total records
cur.execute("SELECT COUNT(*) FROM prices")
print(f"Total records: {cur.fetchone()[0]}")

# Date range
cur.execute("SELECT MIN(arrival_date), MAX(arrival_date) FROM prices WHERE arrival_date IS NOT NULL")
row = cur.fetchone()
print(f"Date range: {row[0]} to {row[1]}")

cur.execute("SELECT MIN(created_at), MAX(created_at) FROM prices")
row = cur.fetchone()
print(f"Created range: {row[0]} to {row[1]}")

# Records by date
cur.execute("""
    SELECT arrival_date, COUNT(*) 
    FROM prices 
    WHERE arrival_date IS NOT NULL 
    GROUP BY arrival_date 
    ORDER BY arrival_date DESC 
    LIMIT 10
""")
print("\nRecords by arrival date (latest 10):")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} records")

# Top commodities
cur.execute("""
    SELECT commodity, COUNT(*) 
    FROM prices 
    GROUP BY commodity 
    ORDER BY COUNT(*) DESC 
    LIMIT 10
""")
print("\nTop 10 commodities:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} records")

# Fields completeness
cur.execute("""
    SELECT 
        COUNT(*) as total,
        COUNT(state) as with_state,
        COUNT(market) as with_market,
        COUNT(min_price) as with_min,
        COUNT(max_price) as with_max,
        COUNT(arrival_date) as with_date
    FROM prices
""")
row = cur.fetchone()
print(f"\nField completeness:")
print(f"  Total: {row[0]}")
print(f"  With state: {row[1]}")
print(f"  With market: {row[2]}")
print(f"  With min_price: {row[3]}")
print(f"  With max_price: {row[4]}")
print(f"  With arrival_date: {row[5]}")

cur.close()
conn.close()
