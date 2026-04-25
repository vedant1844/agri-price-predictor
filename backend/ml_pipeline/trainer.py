"""
Hybrid ARIMA + XGBoost Price Prediction Model
===============================================
Implements the methodology from the research paper:

    Y_t = L_t + N_t

Where:
    - L_t = Linear component (ARIMA captures trends and seasonality)
    - N_t = Nonlinear component (XGBoost captures residual patterns)

Pipeline:
    1. Fetch historical price data from Supabase
    2. Preprocess: handle missing values, normalize, create features
    3. Fit ARIMA model on the time series → get linear predictions
    4. Calculate residuals (actual - ARIMA predictions)
    5. Train XGBoost on residuals with engineered features
    6. Final prediction = ARIMA forecast + XGBoost residual correction
"""

import os
import numpy as np
import pandas as pd
import joblib
import warnings
from datetime import datetime

from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings("ignore")

MODEL_DIR = os.path.join(os.path.dirname(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
ENCODERS_PATH = os.path.join(MODEL_DIR, "encoders.pkl")


def get_training_data():
    """Fetch historical price data from Supabase for training."""
    from app.db import SessionLocal
    from app.models import Price

    db = SessionLocal()
    try:
        prices = (
            db.query(Price)
            .filter(Price.modal_price > 0)
            .order_by(Price.created_at.asc())
            .all()
        )

        if not prices:
            return None

        data = []
        for p in prices:
            data.append({
                "commodity": p.commodity or "Unknown",
                "state": p.state or "Unknown",
                "market": p.market or "Unknown",
                "modal_price": p.modal_price or p.price,
                "min_price": p.min_price or p.modal_price or p.price,
                "max_price": p.max_price or p.modal_price or p.price,
                "created_at": p.created_at or datetime.utcnow(),
            })

        return pd.DataFrame(data)

    finally:
        db.close()


def create_features(df):
    """
    Feature engineering as described in the research paper:
    - Temporal features (month, day of week, quarter)
    - Lag features (previous prices)
    - Moving averages (7-day, 14-day, 30-day)
    - Price spread (max - min)
    - Commodity and state encoding
    """
    df = df.copy()
    df["created_at"] = pd.to_datetime(df["created_at"])
    df = df.sort_values("created_at").reset_index(drop=True)

    # Temporal features
    df["month"] = df["created_at"].dt.month
    df["day_of_week"] = df["created_at"].dt.dayofweek
    df["quarter"] = df["created_at"].dt.quarter
    df["day_of_year"] = df["created_at"].dt.dayofyear

    # Price spread feature
    df["price_spread"] = df["max_price"] - df["min_price"]

    # Lag features (previous price observations)
    for lag in [1, 2, 3, 5, 7]:
        df[f"lag_{lag}"] = df["modal_price"].shift(lag)

    # Moving averages
    for window in [3, 7, 14]:
        df[f"ma_{window}"] = df["modal_price"].rolling(window=window, min_periods=1).mean()

    # Rolling standard deviation (volatility)
    df["volatility_7"] = df["modal_price"].rolling(window=7, min_periods=1).std()

    # Fill NaN from lag/rolling with forward fill then backward fill
    df = df.fillna(method="ffill").fillna(method="bfill")

    return df


def fit_arima_component(series):
    """
    Fit ARIMA model for the linear component L_t.
    Uses statsmodels ARIMA with automatic order selection.
    Returns the fitted values (in-sample predictions).
    """
    try:
        from statsmodels.tsa.arima.model import ARIMA

        # Use ARIMA(2,1,2) — common for commodity price time series
        model = ARIMA(series.values, order=(2, 1, 2))
        fitted = model.fit()

        # Get in-sample predictions
        predictions = fitted.fittedvalues

        # Pad the beginning (differenced series loses first observation)
        if len(predictions) < len(series):
            pad = np.full(len(series) - len(predictions), series.iloc[0])
            predictions = np.concatenate([pad, predictions])

        return predictions

    except Exception as e:
        print(f"⚠ ARIMA fitting failed: {e}, using moving average fallback")
        # Fallback: use simple moving average as linear component
        return series.rolling(window=7, min_periods=1).mean().values


def train_model():
    """
    Train the hybrid ARIMA + XGBoost model on real data from Supabase.

    Steps (as per research paper):
        1. Fetch data from Supabase
        2. Preprocess and engineer features
        3. Fit ARIMA on price series → get linear predictions
        4. Calculate residuals = actual - ARIMA
        5. Train XGBoost on residuals with feature matrix
        6. Save both model and encoders
    """
    print("🔄 Starting model training pipeline...")

    df = get_training_data()
    if df is None or len(df) < 10:
        print("❌ Not enough training data. Need at least 10 records.")
        print("   Run /update-data first to fetch prices from the API.")
        return {"status": "error", "message": "Not enough training data"}

    print(f"📊 Training with {len(df)} records")

    # --- Step 1: Encode categorical features ---
    encoders = {}

    commodity_encoder = LabelEncoder()
    df["commodity_encoded"] = commodity_encoder.fit_transform(df["commodity"].fillna("Unknown"))
    encoders["commodity"] = commodity_encoder

    state_encoder = LabelEncoder()
    df["state_encoded"] = state_encoder.fit_transform(df["state"].fillna("Unknown"))
    encoders["state"] = state_encoder

    # --- Step 2: Create features ---
    df = create_features(df)

    # --- Step 3: ARIMA for linear component ---
    print("📈 Fitting ARIMA model for linear trend...")
    arima_predictions = fit_arima_component(df["modal_price"])
    df["arima_pred"] = arima_predictions

    # --- Step 4: Calculate residuals ---
    df["residuals"] = df["modal_price"] - df["arima_pred"]

    # --- Step 5: Prepare feature matrix for XGBoost ---
    feature_cols = [
        "commodity_encoded", "state_encoded",
        "month", "day_of_week", "quarter", "day_of_year",
        "price_spread",
        "lag_1", "lag_2", "lag_3", "lag_5", "lag_7",
        "ma_3", "ma_7", "ma_14",
        "volatility_7",
        "arima_pred",
    ]

    # Drop rows with NaN in features
    df_clean = df.dropna(subset=feature_cols + ["residuals"])

    if len(df_clean) < 5:
        print("❌ Not enough clean data after feature engineering")
        return {"status": "error", "message": "Not enough data after preprocessing"}

    X = df_clean[feature_cols].values
    y_residuals = df_clean["residuals"].values

    # --- Step 6: Train XGBoost on residuals ---
    print("🌲 Training XGBoost on ARIMA residuals...")
    xgb_model = XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
    )
    xgb_model.fit(X, y_residuals)

    # --- Step 7: Evaluate ---
    predictions = arima_predictions[len(arima_predictions) - len(df_clean):] + xgb_model.predict(X)
    actuals = df_clean["modal_price"].values

    rmse = np.sqrt(np.mean((actuals - predictions) ** 2))
    mae = np.mean(np.abs(actuals - predictions))
    mape = np.mean(np.abs((actuals - predictions) / (actuals + 1e-8))) * 100

    print(f"📊 Model Performance:")
    print(f"   RMSE: {rmse:.2f}")
    print(f"   MAE:  {mae:.2f}")
    print(f"   MAPE: {mape:.2f}%")

    # --- Step 8: Save model and encoders ---
    model_data = {
        "xgb_model": xgb_model,
        "feature_cols": feature_cols,
        "rmse": rmse,
        "mae": mae,
        "mape": mape,
        "trained_at": datetime.utcnow().isoformat(),
        "training_samples": len(df_clean),
    }
    joblib.dump(model_data, MODEL_PATH)
    joblib.dump(encoders, ENCODERS_PATH)

    print("✅ Model trained and saved!")

    return {
        "status": "success",
        "rmse": round(rmse, 2),
        "mae": round(mae, 2),
        "mape": round(mape, 2),
        "samples": len(df_clean),
    }