from ml_pipeline.xgboost_model import predict_price


def get_prediction(commodity="wheat", state="karnataka", month=4,
                   current_year=2026, future_year=2028):
    """
    Get a price prediction using the hybrid ARIMA + XGBoost model.
    Falls back to statistical estimation if model isn't trained.
    """
    result = predict_price(
        commodity=commodity,
        state=state,
        month=month,
        current_year=current_year,
        future_year=future_year,
    )
    return result