import sys
import os

# Fix import path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

import time
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.price_service import fetch_agri_prices


def job():
    print("⏳ Fetching agri data...")
    data = fetch_agri_prices()
    
    if data:
        print("✅ Cache updated")
    else:
        print("❌ Failed to update cache")


def start_scheduler():
    scheduler = BackgroundScheduler()
    
    # Run every 5 minutes (faster updates)
    scheduler.add_job(job, 'interval', minutes=5)
    
    scheduler.start()
    print("🚀 Scheduler started...")

    try:
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()


if __name__ == "__main__":
    start_scheduler()