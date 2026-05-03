"""
XGBoost Prediction Module
==========================
Uses the trained hybrid model to make price predictions.

If the model is trained:
    1. Encode commodity/state
    2. Build feature vector with available data
    3. Use ARIMA baseline + XGBoost correction
    4. Return prediction with confidence interval

If the model is NOT trained:
    Falls back to statistical estimation from database.
"""

import os
import numpy as np
import joblib
from datetime import datetime


def _to_native(obj):
    """Recursively convert numpy types to native Python types for JSON serialization."""
    if isinstance(obj, dict):
        return {k: _to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_to_native(v) for v in obj]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

MODEL_DIR = os.path.join(os.path.dirname(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
ENCODERS_PATH = os.path.join(MODEL_DIR, "encoders.pkl")


def predict_price(commodity="wheat", state="karnataka", month=4,
                  current_year=2026, future_year=2028):
    """
    Predict future crop price using the hybrid model.

    If the trained model exists, uses ARIMA + XGBoost hybrid.
    Otherwise, falls back to statistical estimation from database.

    Returns a structured prediction dictionary.
    """

    # Try to use the trained model
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODERS_PATH):
        try:
            return _predict_with_model(commodity, state, month,
                                       current_year, future_year)
        except Exception as e:
            print(f"⚠ Model prediction failed: {e}, using fallback")

    # Fallback: statistical estimation from database
    return _predict_with_stats(commodity, state, month,
                               current_year, future_year)


def _predict_with_model(commodity, state, month, current_year, future_year):
    """Predict using the trained hybrid ARIMA + XGBoost model."""
    model_data = joblib.load(MODEL_PATH)
    encoders = joblib.load(ENCODERS_PATH)

    xgb_model = model_data["xgb_model"]
    rmse = model_data.get("rmse", 0)

    # Encode commodity
    commodity_enc = _safe_encode(encoders.get("commodity"), commodity)
    state_enc = _safe_encode(encoders.get("state"), state)

    # Get base price from database for this commodity
    base_price = _get_base_price(commodity, state)

    if base_price is None:
        base_price = 2500  # default

    # Build feature vector
    quarter = (month - 1) // 3 + 1
    day_of_year = (month - 1) * 30 + 15
    day_of_week = 3

    # Use base price for lag/ma features (best estimate without full series)
    features = np.array([[
        commodity_enc,       # commodity_encoded
        state_enc,           # state_encoded
        month,               # month
        day_of_week,         # day_of_week
        quarter,             # quarter
        day_of_year,         # day_of_year
        base_price * 0.15,   # price_spread estimate
        base_price,          # lag_1
        base_price * 0.99,   # lag_2
        base_price * 0.98,   # lag_3
        base_price * 0.97,   # lag_5
        base_price * 0.96,   # lag_7
        base_price,          # ma_3
        base_price * 0.99,   # ma_7
        base_price * 0.98,   # ma_14
        base_price * 0.05,   # volatility_7
        base_price,          # arima_pred (linear baseline)
    ]])

    # XGBoost predicts the residual correction
    residual_correction = float(xgb_model.predict(features)[0])

    # Current price = ARIMA baseline + XGBoost correction
    current_price = float(base_price + residual_correction)

    # Project into the future using growth rate
    years = future_year - current_year
    if years <= 0:
        years = 1

    # Estimate growth rate from historical data
    growth_rate = _estimate_growth_rate(commodity, state)
    future_price = current_price * ((1 + growth_rate) ** years)

    # Confidence based on model RMSE
    confidence = max(70, min(95, 95 - (rmse / base_price * 100)))
    price_range = rmse * 1.5 * years

    return _build_prediction_response(
        current_price=round(current_price, 2),
        future_price=round(future_price, 2),
        confidence=round(confidence, 1),
        price_range=round(price_range, 2),
        years=years,
        growth_rate=round(growth_rate * 100, 2),
        commodity=commodity,
        state=state,
        month=month,
        current_year=current_year,
        future_year=future_year,
        model_type="hybrid_arima_xgboost",
    )


def _predict_with_stats(commodity, state, month, current_year, future_year):
    """Fallback: Statistical estimation from database when model isn't trained."""
    base_price = _get_base_price(commodity, state)

    if base_price is None:
        # Use crop-specific defaults if no DB data
        crop_defaults = {
            "wheat": 2400, "rice": 2800, "cotton": 6500,
            "sugarcane": 350, "maize": 2000, "soybean": 4500,
            "tomato": 1800, "onion": 2200, "potato": 1600,
            "apple": 7200, "banana": 2000, "groundnut": 5500,
        }
        base_price = crop_defaults.get(commodity.lower(), 2500)

    years = max(1, future_year - current_year)
    growth_rate = _estimate_growth_rate(commodity, state)
    current_price = base_price
    future_price = current_price * ((1 + growth_rate) ** years)

    confidence = 75.0  # Lower confidence for statistical fallback
    price_range = base_price * 0.12 * years

    return _build_prediction_response(
        current_price=round(current_price, 2),
        future_price=round(future_price, 2),
        confidence=confidence,
        price_range=round(price_range, 2),
        years=years,
        growth_rate=round(growth_rate * 100, 2),
        commodity=commodity,
        state=state,
        month=month,
        current_year=current_year,
        future_year=future_year,
        model_type="statistical_fallback",
    )


def _build_prediction_response(current_price, future_price, confidence,
                                 price_range, years, growth_rate,
                                 commodity, state, month,
                                 current_year, future_year, model_type):
    """Build a structured prediction response for the frontend."""
    pct_change = ((future_price - current_price) / current_price * 100) if current_price > 0 else 0
    min_price = future_price - price_range
    max_price = future_price + price_range

    # Generate trend data for chart
    labels = []
    prices = []
    p_min = []
    p_max = []
    for y in range(current_year, future_year + 1):
        labels.append(str(y))
        yrs_from_now = y - current_year
        p = round(current_price * ((1 + growth_rate / 100) ** yrs_from_now), 2)
        prices.append(p)
        p_min.append(round(p * 0.91, 2))
        p_max.append(round(p * 1.09, 2))

    # Generate advice
    advice = _generate_advice(commodity, confidence, years, pct_change)

    return _to_native({
        "current_price": current_price,
        "future_price": future_price,
        "confidence": confidence,
        "price_range": price_range,
        "pct_change": round(pct_change, 1),
        "min_price": round(min_price, 2),
        "max_price": round(max_price, 2),
        "days": years * 365,
        "years": years,
        "growth_rate": growth_rate,
        "commodity": commodity,
        "state": state,
        "month": month,
        "current_year": current_year,
        "future_year": future_year,
        "model_type": model_type,
        "chart": {
            "labels": labels,
            "prices": prices,
            "p_min": p_min,
            "p_max": p_max,
        },
        "advice": advice,
    })


def _generate_advice(commodity, confidence, years, pct_change):
    """Generate farmer advice based on prediction results."""
    crop_name = commodity.capitalize()

    if pct_change > 15:
        timing = f"Prices for {crop_name} are expected to rise significantly. Consider holding stock if storage is feasible."
        action = f"Strong upward trend detected. Hold for {max(1, int(years * 0.5))} more months for potentially better prices."
    elif pct_change > 5:
        timing = f"Moderate price increase expected for {crop_name}. Monitor market conditions closely."
        action = f"Moderate growth expected. Compare prices at 2-3 nearby mandis before selling."
    else:
        timing = f"Price for {crop_name} may remain relatively stable. Consider selling at current rates."
        action = "Prices are stable. Sell at the best available mandi rate to avoid storage costs."

    risk = "Low risk — market conditions are relatively stable." if confidence > 85 else "Moderate risk — monitor market trends and weather conditions."

    return [
        {"icon": "🎯", "title": "Market Timing", "text": timing},
        {"icon": "🌤", "title": "Seasonal Outlook", "text": "Monitor weather forecasts. Price volatility typically increases near harvest season."},
        {"icon": "⚠", "title": "Risk Assessment", "text": risk},
        {"icon": "✅", "title": "Action Plan", "text": action},
    ]


def _get_base_price(commodity, state):
    """Get the average recent price from Supabase for a commodity."""
    try:
        from app.db import SessionLocal
        from app.models import Price
        from sqlalchemy import func

        db = SessionLocal()
        try:
            query = db.query(func.avg(Price.modal_price)).filter(
                func.lower(Price.commodity) == commodity.lower()
            )
            if state:
                query = query.filter(
                    func.lower(Price.state) == state.lower()
                )

            result = query.scalar()
            return float(result) if result else None
        finally:
            db.close()
    except Exception:
        return None


def _estimate_growth_rate(commodity, state):
    """Estimate annual growth rate from historical data in Supabase."""
    try:
        from app.db import SessionLocal
        from app.models import Price
        from sqlalchemy import func

        db = SessionLocal()
        try:
            # Get earliest and latest prices for this commodity
            earliest = (
                db.query(Price)
                .filter(func.lower(Price.commodity) == commodity.lower())
                .order_by(Price.created_at.asc())
                .first()
            )
            latest = (
                db.query(Price)
                .filter(func.lower(Price.commodity) == commodity.lower())
                .order_by(Price.created_at.desc())
                .first()
            )

            if earliest and latest and earliest.modal_price and latest.modal_price:
                if earliest.created_at and latest.created_at:
                    days = (latest.created_at - earliest.created_at).days
                    if days > 30 and earliest.modal_price > 0:
                        total_growth = latest.modal_price / earliest.modal_price
                        years = days / 365.25
                        if years > 0:
                            annual_rate = total_growth ** (1 / years) - 1
                            # Cap between -20% and +30%
                            return max(-0.20, min(0.30, annual_rate))

            # Default growth rate if not enough data
            return 0.05

        finally:
            db.close()
    except Exception:
        return 0.05


def _safe_encode(encoder, value):
    """Safely encode a value, returning 0 if the encoder doesn't know it."""
    if encoder is None:
        return 0
    try:
        return encoder.transform([value.lower()])[0]
    except (ValueError, AttributeError):
        return 0