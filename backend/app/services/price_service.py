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

        response = requests.get(fetch_url, timeout=30)
        response.raise_for_status()
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
    Retrieve stored prices from Supabase, optionally filtered.
    """
    db = SessionLocal()

    try:
        query = db.query(Price)

        if commodity:
            query = query.filter(
                func.lower(Price.commodity) == commodity.lower()
            )
        if state:
            query = query.filter(
                func.lower(Price.state) == state.lower()
            )

        prices = (
            query
            .order_by(Price.created_at.desc())
            .limit(min(limit, 500))
            .all()
        )

        return [
            {
                "commodity": p.commodity,
                "state": getattr(p, 'state', None),
                "district": getattr(p, 'district', None),
                "market": getattr(p, 'market', None),
                "variety": getattr(p, 'variety', None),
                "grade": getattr(p, 'grade', None),
                "min_price": getattr(p, 'min_price', None),
                "max_price": getattr(p, 'max_price', None),
                "modal_price": getattr(p, 'modal_price', None) or p.price,
                "price": p.price,
                "unit": p.unit,
                "arrival_date": getattr(p, 'arrival_date', None).strftime("%Y-%m-%d") if getattr(p, 'arrival_date', None) else None,
                "date": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else None,
            }
            for p in prices
        ]

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
    Used by the frontend for summary cards.
    """
    db = SessionLocal()
    try:
        query = db.query(
            func.min(Price.min_price).label("overall_min"),
            func.max(Price.max_price).label("overall_max"),
            func.avg(Price.modal_price).label("avg_modal"),
            func.count(Price.id).label("total_records"),
        )

        if commodity:
            query = query.filter(
                func.lower(Price.commodity) == commodity.lower()
            )
        if state:
            query = query.filter(
                func.lower(Price.state) == state.lower()
            )

        row = query.first()

        return {
            "min_price": round(row.overall_min, 2) if row.overall_min else 0,
            "max_price": round(row.overall_max, 2) if row.overall_max else 0,
            "avg_modal": round(row.avg_modal, 2) if row.avg_modal else 0,
            "total_records": row.total_records or 0,
        }
    finally:
        db.close()