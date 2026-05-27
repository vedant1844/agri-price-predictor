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

from app.api.routes import router
from app.db import engine, Base
import app.models


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


def grant_api_access():
    """
    Grant Supabase Data API access to public tables.

    As of May 30, 2026, Supabase no longer auto-exposes tables in the
    'public' schema to the Data API (PostgREST / supabase-js / GraphQL).
    This function adds explicit GRANT statements for the 'anon' and
    'authenticated' roles so the tables remain accessible.

    See: https://supabase.com/changelog
    """
    from sqlalchemy import text

    tables = ["prices", "commodity_prices", "commodity_data", "predictions"]
    roles = ["anon", "authenticated"]

    with engine.connect() as conn:
        for table in tables:
            for role in roles:
                try:
                    conn.execute(text(
                        f"GRANT SELECT ON {table} TO {role}"
                    ))
                except Exception as e:
                    # Role/table may not exist in non-Supabase environments
                    print(f"⚠ GRANT {role} on {table}: {e}")
        try:
            # Ensure usage on the public schema is also granted
            for role in roles:
                conn.execute(text(
                    f"GRANT USAGE ON SCHEMA public TO {role}"
                ))
        except Exception as e:
            print(f"⚠ GRANT USAGE on schema public: {e}")
        conn.commit()
    print("✅ Supabase Data API access granted (anon, authenticated)")


def enable_rls():
    """
    Enable Row-Level Security (RLS) on public tables and create
    appropriate access policies.

    Without RLS, anyone with the Supabase project URL can read, edit,
    and delete all data via the Data API. This is flagged as a CRITICAL
    security issue by Supabase's Security Advisor.

    Our approach:
    - Enable RLS on the prices table
    - Allow anon & authenticated roles to SELECT (read) only
    - The 'postgres' role (used by our backend & scripts via
      DATABASE_URL) bypasses RLS automatically, so all backend
      writes continue to work without changes.
    """
    from sqlalchemy import text

    tables = ["prices", "commodity_prices", "commodity_data", "predictions"]

    with engine.connect() as conn:
        for table in tables:
            # 1. Enable RLS
            try:
                conn.execute(text(
                    f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"
                ))
                print(f"  RLS enabled on '{table}'")
            except Exception as e:
                print(f"  RLS on {table}: {e}")

            # 2. Create a read-only policy (drop first for idempotency)
            policy_name = f"{table}_public_read"
            try:
                conn.execute(text(
                    f"DROP POLICY IF EXISTS {policy_name} ON {table}"
                ))
                conn.execute(text(f"""
                    CREATE POLICY {policy_name} ON {table}
                        FOR SELECT
                        TO anon, authenticated
                        USING (true)
                """))
                print(f"  Policy '{policy_name}' created (SELECT only)")
            except Exception as e:
                print(f"  Policy on {table}: {e}")

        conn.commit()

    print("✅ Row-Level Security configured (prices table is now protected)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events for the FastAPI app."""
    # ── Startup ──
    Base.metadata.create_all(bind=engine)
    migrate_database()
    grant_api_access()
    enable_rls()
    print("✅ Database tables created/verified")
    print("ℹ️  Data fetching handled by external cron job (cron-job.org)")

    yield

    # ── Shutdown ──
    print("🛑 Server shutting down")


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