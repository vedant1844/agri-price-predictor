"""
Two-step fetch: PowerShell downloads JSON, Python inserts into Supabase.
This handles the slow govt API by using PowerShell for HTTP (more reliable).
"""
import os
import sys
import json
import subprocess
import tempfile
from datetime import datetime, timezone

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
except ImportError:
    pass

import psycopg2

API_URL = os.getenv("AGRI_API_URL")
DB_URL = os.getenv("DATABASE_URL")
PAGE_SIZE = 20
MAX_PAGES = 50  # Up to 1000 records


def fetch_with_powershell(limit, offset):
    """Use PowerShell to fetch data (handles slow APIs better)."""
    sep = "&" if "?" in API_URL else "?"
    url = f"{API_URL}{sep}limit={limit}&offset={offset}"
    
    cmd = f'''$ProgressPreference='SilentlyContinue'; try {{ $r = Invoke-RestMethod -Uri "{url}" -TimeoutSec 90 -UseBasicParsing; $r | ConvertTo-Json -Depth 10 -Compress }} catch {{ Write-Error $_.Exception.Message; exit 1 }}'''
    
    result = subprocess.run(
        ["powershell", "-Command", cmd],
        capture_output=True, text=True, timeout=120, encoding='utf-8'
    )
    
    if result.returncode != 0:
        return None
    
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return None


def main():
    if not API_URL or not DB_URL:
        print("ERROR: Set DATABASE_URL and AGRI_API_URL in backend/.env")
        sys.exit(1)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    total = 0
    fails = 0

    print(f"=== Fetching data at {datetime.now().strftime('%Y-%m-%d %H:%M')} ===")
    print(f"Using PowerShell for HTTP requests")
    print(f"Pages: up to {MAX_PAGES}, Size: {PAGE_SIZE}\n")

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        print(f"Page {page+1}/{MAX_PAGES} (offset={offset})...", end=" ", flush=True)

        data = fetch_with_powershell(PAGE_SIZE, offset)
        
        if data is None:
            fails += 1
            print("FAILED")
            if fails >= 5:
                print("Too many failures, stopping.")
                break
            continue

        # Handle PowerShell returning records differently
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
                    (item.get("commodity") or "Unknown").strip(),
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
                pass

        conn.commit()
        total += count
        print(f"OK +{count} (total={total})")

    cur.close()
    conn.close()
    print(f"\nDone! {total} records saved, {fails} pages failed.")


if __name__ == "__main__":
    main()
