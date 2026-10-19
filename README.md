# Agri Price Predictor

A full-stack agricultural price forecasting and market insights platform that helps users explore historical prices, view current mandi data, and predict future commodity prices using an AI-powered hybrid forecasting pipeline.

## Overview

This project combines:
- a React frontend for data visualization and user interaction
- a FastAPI backend for API access and business logic
- a machine learning pipeline using ARIMA + XGBoost for crop price prediction
- a scheduled data-fetch workflow for updating market data
- a Postgres/Supabase-backed data layer for storage and querying

The application is designed for agricultural stakeholders, traders, and researchers who want to monitor market trends and forecast price movements for various commodities across Indian states and districts.

## Features

- Historical commodity price exploration
- State and district-based filtering
- Price statistics such as min, max, average, and record count
- Commodity and state discovery endpoints
- AI-based price prediction for future months/years
- Live mandi market data retrieval
- Dashboard-style frontend reporting and charts
- Scheduled data refresh support
- Supabase/Postgres integration with row-level security configuration

## Tech Stack

Frontend
- React
- Chart.js
- react-chartjs-2
- jsPDF / jsPDF AutoTable
- CRA / react-scripts

Backend
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL / Supabase
- Pandas / NumPy
- scikit-learn
- statsmodels
- XGBoost
- joblib

ML Pipeline
- ARIMA-based time-series modeling
- XGBoost regression
- Model serialization with joblib

## Repository Structure

```bash
agri-price-predictor/
├── .github/                    # GitHub workflow/configuration files
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py       # API routes
│   │   ├── config/
│   │   │   └── settings.py     # Environment config
│   │   ├── services/
│   │   │   ├── market_service.py
│   │   │   ├── prediction_service.py
│   │   │   ├── price_service.py
│   │   │   └── training_service.py
│   │   ├── db.py               # Database engine/session setup
│   │   ├── main.py             # FastAPI app entrypoint
│   │   └── models.py
│   ├── ml_pipeline/
│   │   ├── trainer.py
│   │   ├── xgboost_model.py
│   │   ├── model.pkl
│   │   ├── encoders.pkl
│   │   └── __init__.py
│   ├── requirements.txt
│   └── .env.example / .env
├── database/
│   └── supabase_grants.sql     # Supabase access grants and schema setup
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.js
│   │   ├── api.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── package-lock.json
│   └── runtime.txt
├── scheduler/
│   ├── fetch_data.py
│   └── scheduler.py
├── scripts/
├── .gitignore
├── runtime.txt
└── README.md
Backend API
The FastAPI app is exposed through the backend service and includes the following core endpoints:

Health and Service
GET /
GET /health
Data Fetching
GET /update-data
GET /fetch
Historical Price Data
GET /prices
GET /price-stats
GET /commodities
GET /states
GET /districts
Prediction
GET /predict
Model Training
GET /train
Market Data
GET /market-data
Example:

bash
curl "http://localhost:8000/predict?commodity=wheat&state=karnataka&month=4"
Environment Variables
Configure environment variables for the backend, typically in backend/.env:

env
DATABASE_URL=your_postgres_or_supabase_connection_string
AGRI_API_URL=your_agri_data_source_url
FRONTEND_URL=http://localhost:3000
THRESHOLD=2
The app loads these values from the backend environment on startup.

Getting Started
1. Clone the repository
bash
git clone https://github.com/vedant1844/agri-price-predictor.git
cd agri-price-predictor
2. Backend setup
bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
Run the backend:

bash
uvicorn app.main:app --reload
The API will typically be available at:

bash
http://localhost:8000
3. Frontend setup
bash
cd frontend
npm install
npm start
The frontend will typically run at:

bash
http://localhost:3000
Data Flow
Market/price data is fetched from agriculture data sources via scheduled scripts.
Data is normalized and stored in the Postgres/Supabase database.
The backend exposes endpoints for querying historical and live data.
The prediction service uses the trained hybrid model to generate forecasts.
The frontend visualizes the results in charts and dashboards.
Machine Learning
The project uses a hybrid forecasting strategy:

ARIMA for time-series trend modeling
XGBoost for capturing nonlinear patterns and feature-driven variation
Model artifacts stored in backend/ml_pipeline/
The training pipeline can be triggered with the backend training endpoint.

Deployment Notes
Frontend is intended to be served via Vercel-style deployment.
Backend is designed for a cloud-hosted Python service.
Scheduler jobs can be used to periodically refresh market data.
License
This project does not currently include a repository license file. If this project is intended for public reuse, consider adding an appropriate license such as MIT or Apache 2.0.

Contributing
Contributions are welcome. If you want to improve the model, data ingestion, or frontend experience:
Submit Your Enquiry at
Project repository:

https://github.com/vedant1844/agri-price-predictor

Acknowledgements

Government agricultural market datasets
FastAPI and the Python data science ecosystem
React and charting libraries
Supabase/PostgreSQL for data management
