import sys
import os

# Fix path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.price_service import fetch_agri_prices

def run():
    print("⏳ Fetching data...")
    data = fetch_agri_prices()
    print("✅ Done")

if __name__ == "__main__":
    run()