# app/api/routes.py

from fastapi import APIRouter, Query
from typing import Optional
from app.services.price_service import (
    fetch_and_store_prices,
    get_cached_prices,
    get_distinct_commodities,
    get_distinct_states,
    get_price_stats,
)
from app.services.prediction_service import get_prediction
from app.services.training_service import run_pipeline
from app.services.market_service import fetch_market_data

router = APIRouter()


@router.get("/")
def home():
    return {"message": "Agri API Running"}


@router.get("/health")
def health():
    """Health check endpoint for cron job pinging (keeps Render awake)."""
    return {"status": "healthy", "service": "agri-backend"}


# ─── Data Fetching ───────────────────────────────────────────────

@router.get("/update-data")
def update_data():
    """Fetch latest prices from govt API and store in Supabase."""
    count = fetch_and_store_prices()
    if count is not None:
        return {"message": f"Data updated: {count} records stored"}
    return {"message": "Failed to update data", "error": True}


@router.get("/fetch")
def fetch():
    """Alias for /update-data."""
    return update_data()


# ─── Price Data ──────────────────────────────────────────────────

@router.get("/prices")
def prices(
    commodity: Optional[str] = Query(None, description="Filter by commodity name"),
    state: Optional[str] = Query(None, description="Filter by state name"),
    limit: int = Query(100, ge=1, le=500, description="Number of records"),
):
    """Get historical prices from Supabase, optionally filtered."""
    return get_cached_prices(commodity=commodity, state=state, limit=limit)


@router.get("/price-stats")
def price_stats(
    commodity: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
):
    """Get aggregated price statistics (min, max, avg, count)."""
    return get_price_stats(commodity=commodity, state=state)


@router.get("/commodities")
def commodities():
    """Get list of unique commodities in the database."""
    return {"commodities": get_distinct_commodities()}


@router.get("/states")
def states():
    """Get list of unique states in the database."""
    return {"states": get_distinct_states()}


# ─── Prediction ──────────────────────────────────────────────────

@router.get("/predict")
def predict(
    commodity: str = Query("wheat", description="Crop name"),
    state: str = Query("karnataka", description="State name"),
    month: int = Query(4, ge=1, le=12, description="Month (1-12)"),
    current_year: int = Query(2026, ge=2020, le=2035),
    future_year: int = Query(2028, ge=2021, le=2040),
):
    """
    Get AI-powered price prediction using hybrid ARIMA + XGBoost model.
    Falls back to statistical estimation if the model isn't trained.
    """
    return get_prediction(
        commodity=commodity,
        state=state,
        month=month,
        current_year=current_year,
        future_year=future_year,
    )


# ─── Model Training ─────────────────────────────────────────────

@router.get("/train")
def train():
    """Train the hybrid ARIMA + XGBoost model on Supabase data."""
    return run_pipeline()


# ─── Live Market Data ────────────────────────────────────────────

@router.get("/market-data")
def market_data(
    state: Optional[str] = Query(None, description="Filter by state"),
    commodity: Optional[str] = Query(None, description="Filter by commodity"),
):
    """Fetch live mandi prices from the Government of India API."""
    return fetch_market_data(state=state, commodity=commodity)