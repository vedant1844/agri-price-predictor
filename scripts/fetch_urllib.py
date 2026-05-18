"""
Fetch data from Govt API using urllib (more reliable for slow APIs)
and store directly in Supabase.
"""
import os
import sys
import json
import time
import urllib.request
import ssl
from datetime import datetime, timezone

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
except ImportError:
    pass

import psycopg2

API_URL = os.getenv("AGRI_API_URL")
DB_URL = os.getenv("DATABASE_URL")
PAGE_SIZE = 10
MAX_PAGES = 100  # Up to 1000 records


def fetch_page(offset):
    """Fetch one page using urllib with long timeout."""
    sep = "&" if "?" in API_URL else "?"
    url = f"{API_URL}{sep}limit={PAGE_SIZE}&offset={offset}"
    
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": "AgriPricePredictor/1.0"})
    
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90, context=ctx) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            print(f"  Retry {attempt+1}/3: {e}")
            time.sleep(5 * (attempt + 1))
    return None


def main():
    if not API_URL or not DB_URL:
        print("ERROR: Set DATABASE_URL and AGRI_API_URL")
        sys.exit(1)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    total = 0
    fails = 0

    print(f"Starting fetch at {datetime.now(timezone.utc).isoformat()}")
    print(f"Pages: {MAX_PAGES}, Size: {PAGE_SIZE}")

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        print(f"Page {page+1}/{MAX_PAGES} (offset={offset})...", end=" ", flush=True)

        data = fetch_page(offset)
        if data is None:
            fails += 1
            print("FAILED")
            if fails >= 5:
                print("Too many failures, stopping.")
                break
            continue

        records = data.get("records", [])
        if not records:
            print("No more records.")
            break

        count = 0
        for item in records:
            try:
                modal = float(item.get("modal_price", 0) or 0)
                minp = float(item.get("min_price", 0) or 0)
                maxp = float(item.get("max_price", 0) or 0)
                if modal <= 0:
                    continue

                arrival = None
                ds = item.get("arrival_date", "")
                if ds:
                    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
                        try:
                            arrival = datetime.strptime(ds, fmt).date()
                            break
                        except ValueError:
                            pass

                cur.execute("""
                    INSERT INTO prices 
                    (commodity, state, district, market, variety, grade,
                     min_price, max_price, modal_price, price,
                     unit, source, arrival_date, created_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    item.get("commodity", "Unknown").strip(),
                    (item.get("state") or "").strip() or None,
                    (item.get("district") or "").strip() or None,
                    (item.get("market") or "").strip() or None,
                    (item.get("variety") or "").strip() or None,
                    (item.get("grade") or "").strip() or None,
                    minp if minp > 0 else None,
                    maxp if maxp > 0 else None,
                    modal, modal, "quintal", "data.gov.in",
                    arrival, datetime.now(timezone.utc),
                ))
                count += 1
            except Exception as e:
                print(f"skip({e})", end=" ")

        conn.commit()
        total += count
        print(f"OK +{count} (total={total})")
        time.sleep(2)

    cur.close()
    conn.close()
    print(f"\nDone! {total} records saved, {fails} pages failed.")


if __name__ == "__main__":
    main()
