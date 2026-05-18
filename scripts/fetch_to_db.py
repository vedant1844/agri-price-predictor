"""
Standalone script to fetch agricultural price data from the
Government of India API and store directly in Supabase (PostgreSQL).

Designed to run via GitHub Actions daily (Ubuntu runner).
Uses curl for HTTP requests — much more reliable than Python requests
for the slow govt API (same approach as the PowerShell local script).

Can also be run locally on Windows/Linux/Mac.
"""

import os
import sys
import json
import time
import subprocess
import platform
from datetime import datetime, timezone

# Try to load .env for local development
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
except ImportError:
    pass  # dotenv not needed in GitHub Actions (uses secrets)


def get_db_connection():
    """Create a direct psycopg2 connection to Supabase."""
    import psycopg2
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    return psycopg2.connect(db_url)


def fetch_page_curl(base_url, limit, offset, timeout=120):
    """
    Fetch one page from the govt API using curl (Linux/Mac)
    or PowerShell (Windows). These handle slow connections much
    better than Python's requests library.
    """
    separator = "&" if "?" in base_url else "?"
    url = f"{base_url}{separator}limit={limit}&offset={offset}"

    try:
        if platform.system() == "Windows":
            # Use PowerShell on Windows (proven to work)
            ps_cmd = (
                f"$ProgressPreference='SilentlyContinue'; "
                f"try {{ $r = Invoke-RestMethod -Uri '{url}' "
                f"-TimeoutSec {timeout} -UseBasicParsing; "
                f"$r | ConvertTo-Json -Depth 10 -Compress }} "
                f"catch {{ Write-Error $_.Exception.Message; exit 1 }}"
            )
            result = subprocess.run(
                ["powershell", "-Command", ps_cmd],
                capture_output=True, text=True,
                timeout=timeout + 30, encoding='utf-8'
            )
        else:
            # Use curl on Linux/Mac (GitHub Actions runners)
            result = subprocess.run(
                [
                    "curl", "-s", "-f",
                    "--max-time", str(timeout),
                    "--retry", "2",
                    "--retry-delay", "5",
                    "--retry-max-time", str(timeout * 2),
                    url
                ],
                capture_output=True, text=True,
                timeout=timeout + 30
            )

        if result.returncode != 0:
            stderr = result.stderr.strip()[:200] if result.stderr else "unknown error"
            print(f"HTTP error: {stderr}")
            return None

        return json.loads(result.stdout)

    except subprocess.TimeoutExpired:
        print("subprocess timeout")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return None
    except Exception as e:
        print(f"unexpected error: {e}")
        return None


def insert_records(conn, records):
    """Insert a batch of records into the prices table."""
    cursor = conn.cursor()
    inserted = 0

    for item in records:
        try:
            modal_price = float(item.get("modal_price", 0) or 0)
            min_price = float(item.get("min_price", 0) or 0)
            max_price = float(item.get("max_price", 0) or 0)

            if modal_price <= 0:
                continue

            # Parse arrival date
            arrival_date = None
            date_str = item.get("arrival_date", "")
            if date_str:
                for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
                    try:
                        arrival_date = datetime.strptime(date_str, fmt).date()
                        break
                    except ValueError:
                        continue

            cursor.execute("""
                INSERT INTO prices
                    (commodity, state, district, market, variety, grade,
                     min_price, max_price, modal_price, price,
                     unit, source, arrival_date, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                item.get("commodity", "Unknown").strip(),
                (item.get("state", "") or "").strip() or None,
                (item.get("district", "") or "").strip() or None,
                (item.get("market", "") or "").strip() or None,
                (item.get("variety", "") or "").strip() or None,
                (item.get("grade", "") or "").strip() or None,
                min_price if min_price > 0 else None,
                max_price if max_price > 0 else None,
                modal_price,
                modal_price,
                "quintal",
                "data.gov.in",
                arrival_date,
                datetime.now(timezone.utc),
            ))
            inserted += 1

        except Exception as e:
            print(f"  Skipping bad record: {e}")

    conn.commit()
    cursor.close()
    return inserted


def main():
    api_url = os.getenv("AGRI_API_URL")
    if not api_url:
        print("ERROR: AGRI_API_URL not set")
        sys.exit(1)

    PAGE_SIZE = 20
    MAX_PAGES = 50  # Up to 1000 records per run

    print(f"{'='*60}")
    print(f"Agri Price Data Fetch")
    print(f"Started: {datetime.now(timezone.utc).isoformat()}")
    print(f"Platform: {platform.system()}")
    print(f"HTTP client: {'PowerShell' if platform.system() == 'Windows' else 'curl'}")
    print(f"Config: {PAGE_SIZE} records/page, up to {MAX_PAGES} pages")
    print(f"{'='*60}\n")

    conn = get_db_connection()
    print("Connected to database successfully\n")

    total_stored = 0
    failed_pages = 0

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        print(f"Page {page + 1}/{MAX_PAGES} (offset={offset})...", end=" ", flush=True)

        data = fetch_page_curl(api_url, limit=PAGE_SIZE, offset=offset, timeout=90)

        if data is None:
            failed_pages += 1
            print("FAILED")
            if failed_pages >= 5:
                print("\nToo many consecutive failures, stopping.")
                break
            continue
        else:
            # Reset consecutive failure count on success
            failed_pages = 0

        records = data.get("records", [])
        if not records:
            print("No more records, done.")
            break

        count = insert_records(conn, records)
        total_stored += count
        print(f"OK (+{count}, total={total_stored})")

        time.sleep(1)  # Be nice to the API

    conn.close()

    print(f"\n{'='*60}")
    print(f"RESULT: {total_stored} records stored")
    print(f"Failed pages: {failed_pages}")
    print(f"Finished: {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*60}")

    if total_stored == 0:
        print("\nWARNING: No records were stored!")
        sys.exit(1)
    else:
        print(f"\nSUCCESS: {total_stored} records saved to Supabase")


if __name__ == "__main__":
    main()
