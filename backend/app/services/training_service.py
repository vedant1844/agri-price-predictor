from ml_pipeline.trainer import train_model


def run_pipeline():
    """Train the hybrid ARIMA + XGBoost model on data from Supabase."""
    result = train_model()
    return result