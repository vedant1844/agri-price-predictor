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

