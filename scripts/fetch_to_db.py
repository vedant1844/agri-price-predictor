"""
Standalone script to fetch agricultural price data from the
Government of India API and store directly in Supabase (PostgreSQL).

Designed to run via GitHub Actions daily, but can also be run locally.
Fetches ALL available records in small paginated batches for reliability.
"""

import os
import sys
import time
import requests
from datetime import datetime

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


def fetch_page(base_url, limit, offset, timeout=30):
    """Fetch one page from the govt API with retries."""
    separator = "&" if "?" in base_url else "?"
    url = f"{base_url}{separator}limit={limit}&offset={offset}"

    for attempt in range(1, 4):
        try:
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            print(f"  Attempt {attempt}/3: timeout at offset={offset}")
            time.sleep(3 * attempt)
        except requests.exceptions.HTTPError as e:
            print(f"  Attempt {attempt}/3: HTTP {response.status_code} at offset={offset}")
            time.sleep(5 * attempt)
        except requests.exceptions.ConnectionError:
            print(f"  Attempt {attempt}/3: connection error at offset={offset}")
            time.sleep(5 * attempt)

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
                datetime.utcnow(),
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

    print(f"Starting data fetch at {datetime.utcnow().isoformat()}")
    print(f"Config: {PAGE_SIZE} records/page, up to {MAX_PAGES} pages")

    conn = get_db_connection()
    total_stored = 0
    failed_pages = 0

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        print(f"Page {page + 1}/{MAX_PAGES} (offset={offset})...", end=" ")

        data = fetch_page(api_url, limit=PAGE_SIZE, offset=offset, timeout=45)

        if data is None:
            failed_pages += 1
            print("FAILED")
            if failed_pages >= 5:
                print("Too many failures, stopping.")
                break
            continue

        records = data.get("records", [])
        if not records:
            print("No more records, done.")
            break

        count = insert_records(conn, records)
        total_stored += count
        print(f"OK (+{count}, total={total_stored})")

        time.sleep(1)  # Be nice to the API

    conn.close()

    print(f"\nDone! Stored {total_stored} records, {failed_pages} pages failed.")

    if total_stored == 0:
        print("WARNING: No records were stored!")
        sys.exit(1)


if __name__ == "__main__":
    main()
