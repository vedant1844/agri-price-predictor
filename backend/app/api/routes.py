# app/api/routes.py

from fastapi import APIRouter
from app.services.price_service import fetch_and_store_prices, get_cached_prices
from app.services.prediction_service import get_prediction
from app.services.training_service import run_pipeline

router = APIRouter()

@router.get("/")
def home():
    return {"message": "Agri API Running"}

@router.get("/update-data")
def update_data():
    fetch_and_store_prices()
    return {"message": "Data updated successfully"}

@router.get("/prices")
def prices():
    return get_cached_prices()

@router.get("/predict")
def predict():
    return get_prediction()

@router.get("/train")
def train():
    return run_pipeline()

@router.get("/fetch")
def fetch():
    fetch_and_store_prices()
    return {"message": "Data fetched and stored successfully"}