import os
import requests
from datetime import datetime
from sqlalchemy import func
from app.db import SessionLocal
from app.models import Price


def fetch_and_store_prices():
    """
    Fetch agricultural commodity prices from the Government of India
    data.gov.in API and store them in Supabase.
    Fetches ALL available records with all fields as per the research paper.
    """
    url = os.getenv("AGRI_API_URL")

    if not url:
        print("❌ AGRI_API_URL not found in environment")
        return None

    db = SessionLocal()
    stored_count = 0

    try:
        # Fetch with higher limit
        fetch_url = url
        if "limit=" not in fetch_url:
            separator = "&" if "?" in fetch_url else "?"
            fetch_url += f"{separator}limit=500"

        # Retry up to 3 times with increasing timeout (govt API can be slow)
        response = None
        for attempt in range(1, 4):
            try:
                timeout = 30 * attempt  # 30s, 60s, 90s
                print(f"⏳ Attempt {attempt}/3 (timeout={timeout}s)...")
                response = requests.get(fetch_url, timeout=timeout)
                response.raise_for_status()
                break
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                print(f"⚠ Attempt {attempt} failed: {e}")
                if attempt == 3:
                    raise
                import time
                time.sleep(5)  # Wait 5s before retry

        data = response.json()

        records = data.get("records", [])
        print(f"📦 Received {len(records)} records from API")

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

                price = Price(
                    commodity=item.get("commodity", "Unknown").strip(),
                    state=item.get("state", "").strip() or None,
                    district=item.get("district", "").strip() or None,
                    market=item.get("market", "").strip() or None,
                    variety=item.get("variety", "").strip() or None,
                    grade=item.get("grade", "").strip() or None,
                    min_price=min_price if min_price > 0 else None,
                    max_price=max_price if max_price > 0 else None,
                    modal_price=modal_price,
                    price=modal_price,  # legacy column
                    unit="quintal",
                    source="data.gov.in",
                    arrival_date=arrival_date,
                    created_at=datetime.utcnow(),
                )

                db.add(price)
                stored_count += 1

            except Exception as inner_error:
                print(f"⚠ Skipping bad record: {inner_error}")

        db.commit()
        print(f"✅ Stored {stored_count} price records in Supabase")
        return stored_count

    except Exception as e:
        db.rollback()
        print(f"❌ Error fetching data: {e}")
        return None

    finally:
        db.close()


def get_cached_prices(commodity=None, state=None, limit=100):
    """
    Retrieve stored prices from Supabase using raw SQL.
    """
    from sqlalchemy import text
    db = SessionLocal()

    try:
        # Simple raw SQL — SELECT * avoids any column mismatch
        conditions = []
        params = {"lim": min(limit, 500)}

        if commodity:
            conditions.append("LOWER(commodity) = LOWER(:commodity)")
            params["commodity"] = commodity
        if state:
            conditions.append("LOWER(state) = LOWER(:state)")
            params["state"] = state

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        sql = f"SELECT * FROM prices {where} ORDER BY created_at DESC LIMIT :lim"

        result = db.execute(text(sql), params)
        rows = result.fetchall()
        col_names = list(result.keys())

        output = []
        for r in rows:
            row_dict = dict(zip(col_names, r))
            modal = row_dict.get("modal_price") or row_dict.get("price", 0)
            arrival = row_dict.get("arrival_date")

            try:
                arrival_str = arrival.strftime("%Y-%m-%d") if arrival else None
            except Exception:
                arrival_str = str(arrival) if arrival else None

            try:
                date_str = row_dict["created_at"].strftime("%Y-%m-%d %H:%M") if row_dict.get("created_at") else None
            except Exception:
                date_str = None

            output.append({
                "commodity": row_dict.get("commodity", "Unknown"),
                "state": row_dict.get("state"),
                "district": row_dict.get("district"),
                "market": row_dict.get("market"),
                "variety": row_dict.get("variety"),
                "grade": row_dict.get("grade"),
                "min_price": row_dict.get("min_price"),
                "max_price": row_dict.get("max_price"),
                "modal_price": modal,
                "price": row_dict.get("price", 0),
                "unit": row_dict.get("unit", "quintal"),
                "arrival_date": arrival_str,
                "date": date_str,
            })

        return output

    except Exception as e:
        import traceback
        traceback.print_exc()
        return []

    finally:
        db.close()


def get_distinct_commodities():
    """Return list of unique commodity names from the database."""
    db = SessionLocal()
    try:
        result = db.query(Price.commodity).distinct().all()
        return sorted([r[0] for r in result if r[0]])
    finally:
        db.close()


def get_distinct_states():
    """Return list of unique state names from the database."""
    db = SessionLocal()
    try:
        result = db.query(Price.state).distinct().all()
        return sorted([r[0] for r in result if r[0]])
    finally:
        db.close()


def get_price_stats(commodity=None, state=None):
    """
    Get aggregated price statistics for a commodity/state.
    Uses Price.price as fallback if new columns don't exist yet.
    """
    db = SessionLocal()
    try:
        try:
            query = db.query(
                func.min(Price.min_price).label("overall_min"),
                func.max(Price.max_price).label("overall_max"),
                func.avg(Price.modal_price).label("avg_modal"),
                func.count(Price.id).label("total_records"),
            )
            if commodity:
                query = query.filter(func.lower(Price.commodity) == commodity.lower())
            if state:
                query = query.filter(func.lower(Price.state) == state.lower())
            row = query.first()
        except Exception:
            db.rollback()
            # Fallback: use legacy 'price' column
            query = db.query(
                func.min(Price.price).label("overall_min"),
                func.max(Price.price).label("overall_max"),
                func.avg(Price.price).label("avg_modal"),
                func.count(Price.id).label("total_records"),
            )
            if commodity:
                query = query.filter(func.lower(Price.commodity) == commodity.lower())
            if state:
                query = query.filter(func.lower(Price.state) == state.lower())
            row = query.first()

        return {
            "min_price": round(row.overall_min, 2) if row.overall_min else 0,
            "max_price": round(row.overall_max, 2) if row.overall_max else 0,
            "avg_modal": round(row.avg_modal, 2) if row.avg_modal else 0,
            "total_records": row.total_records or 0,
        }
    finally:
        db.close()