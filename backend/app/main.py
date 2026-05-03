import sys
import os

# Ensure the backend directory is on the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv

# Load environment variables BEFORE importing anything else
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

from app.api.routes import router
from app.db import engine, Base
import app.models


# ─── Scheduler for automatic data fetching ───────────────────────

scheduler = BackgroundScheduler()


def scheduled_fetch():
    """Background job: fetch prices from govt API and store in Supabase."""
    try:
        from app.services.price_service import fetch_and_store_prices
        print("⏳ [Scheduler] Fetching agri data...")
        result = fetch_and_store_prices()
        if result:
            print(f"✅ [Scheduler] Stored {result} records")
        else:
            print("❌ [Scheduler] Failed to fetch data")
    except Exception as e:
        print(f"❌ [Scheduler] Error: {e}")


def migrate_database():
    """Add new columns to existing tables if they don't exist."""
    from sqlalchemy import text
    new_columns = [
        ("state", "VARCHAR(100)"),
        ("district", "VARCHAR(100)"),
        ("market", "VARCHAR(200)"),
        ("variety", "VARCHAR(100)"),
        ("grade", "VARCHAR(50)"),
        ("min_price", "FLOAT"),
        ("max_price", "FLOAT"),
        ("modal_price", "FLOAT"),
        ("arrival_date", "DATE"),
        ("unit", "VARCHAR(50)"),
        ("source", "VARCHAR(100)"),
    ]
    with engine.connect() as conn:
        for col_name, col_type in new_columns:
            try:
                conn.execute(text(
                    f"ALTER TABLE prices ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                ))
            except Exception as e:
                print(f"⚠ Column {col_name} migration: {e}")
        conn.commit()
    print("✅ Database migration completed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events for the FastAPI app."""
    # ── Startup ──
    # Create database tables (new tables only)
    Base.metadata.create_all(bind=engine)
    # Add new columns to existing tables
    migrate_database()
    print("✅ Database tables created/verified")

    # Start the background scheduler
    # Fetch data every 30 minutes to keep Supabase populated
    scheduler.add_job(scheduled_fetch, 'interval', minutes=30, id='fetch_prices')

    # Also run once at startup to populate data immediately
    scheduler.add_job(scheduled_fetch, 'date', id='fetch_prices_startup')

    scheduler.start()
    print("🚀 Background scheduler started (every 30 min)")

    yield

    # ── Shutdown ──
    scheduler.shutdown(wait=False)
    print("🛑 Scheduler stopped")


# ─── FastAPI App ─────────────────────────────────────────────────

app = FastAPI(
    title="Agri Price Prediction API 🚀",
    description="AI-powered crop price prediction using hybrid ARIMA + XGBoost",
    version="2.0.0",
    lifespan=lifespan,
)

# ✅ CORS — allow the Vercel frontend
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://agri-price-predictor.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",  # local React dev
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Include routes
app.include_router(router)

# ✅ Root endpoint (also in routes, but kept here as a top-level fallback)
@app.get("/")
def home():
    return {"message": "Agri API Running"}