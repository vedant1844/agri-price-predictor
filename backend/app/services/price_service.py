import os
import requests
from datetime import datetime
from app.db import SessionLocal
from app.models import Price


def fetch_and_store_prices():
    url = os.getenv("AGRI_API_URL")

    if not url:
        print("❌ API URL not found")
        return

    db = SessionLocal()

    try:
        response = requests.get(url, timeout=20)
        data = response.json()

        records = data.get("records", [])

        for item in records[:10]:
            try:
                price_value = int(item.get("modal_price", 0))  # ✅ FIXED

                price = Price(
                    commodity=item.get("commodity", "Unknown"),
                    price=price_value,
                    created_at=datetime.utcnow()  # ✅ IMPORTANT
                )

                db.add(price)

            except Exception as inner_error: 
                print("Skipping bad record:", inner_error)

        db.commit()
        print("✅ Data stored successfully")

    except Exception as e:
        print("❌ Error fetching data:", e)

    finally:
        db.close()


def get_cached_prices():
    db = SessionLocal()

    try:
        prices = db.query(Price).order_by(Price.created_at.desc()).limit(100).all()

        return [
            {
                "commodity": p.commodity,
                "price": p.price,
                "date": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else None
            }
            for p in prices
        ]

    finally:
        db.close()