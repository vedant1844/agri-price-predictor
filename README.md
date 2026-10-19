# 🌾 Agri Price Predictor

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

A full-stack agricultural price forecasting and market insights platform. Explore historical mandi prices, view live market data, and predict future commodity prices using a hybrid **ARIMA + XGBoost** forecasting pipeline.

**Live demo:** [agri-price-predictor.vercel.app](https://agri-price-predictor.vercel.app/) · **API docs:** `http://localhost:8000/docs` (when running locally)

<!-- Replace with real screenshots or a GIF -->
<!--
![Dashboard](docs/images/dashboard.png)
![Prediction chart](docs/images/prediction.png)
-->

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Reference](#api-reference)
- [Data Flow](#data-flow)
- [Machine Learning](#machine-learning)
- [Scheduler](#scheduler)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Overview

Agri Price Predictor is built for farmers, traders, and researchers who want to monitor market trends and forecast price movements for commodities across Indian states and districts.

It combines:

- a **React** frontend for charts and dashboards
- a **FastAPI** backend for data access and business logic
- an **ML pipeline** (ARIMA + XGBoost) for price prediction
- a **scheduled data-fetch workflow** that keeps market data fresh
- a **Postgres / Supabase** data layer with row-level security

## Features

- Historical commodity price exploration
- State and district-level filtering
- Price statistics: min, max, average, and record count
- Commodity, state, and district discovery endpoints
- AI-based price prediction for future months and years
- Live mandi market data retrieval
- Dashboard-style charts and PDF report export
- Scheduled data refresh
- Supabase/Postgres integration with row-level security

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React, Chart.js, react-chartjs-2, jsPDF, jsPDF AutoTable, react-scripts (CRA) |
| Backend | Python, FastAPI, SQLAlchemy, PostgreSQL / Supabase |
| ML | Pandas, NumPy, scikit-learn, statsmodels (ARIMA), XGBoost, joblib |
| Automation | Python scheduler scripts, GitHub workflows |

## Repository Structure

```bash
agri-price-predictor/
├── .github/                    # GitHub workflows
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
│   │   ├── main.py             # FastAPI entrypoint
│   │   └── models.py
│   ├── ml_pipeline/
│   │   ├── trainer.py
│   │   ├── xgboost_model.py
│   │   ├── model.pkl           # Trained model artifact
│   │   ├── encoders.pkl        # Label encoders
│   │   └── __init__.py
│   ├── requirements.txt
│   └── .env.example
├── database/
│   └── supabase_grants.sql     # Schema setup and access grants
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
│   └── runtime.txt
├── scheduler/
│   ├── fetch_data.py
│   └── scheduler.py
├── scripts/
├── .gitignore
├── runtime.txt
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- A PostgreSQL database (local or [Supabase](https://supabase.com))

### 1. Clone the repository

```bash
git clone https://github.com/vedant1844/agri-price-predictor.git
cd agri-price-predictor
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then edit .env (see below)
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Interactive docs are at `http://localhost:8000/docs`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm start
```

The frontend runs at `http://localhost:3000`.

> **Connecting to the backend:** the frontend calls the API through `src/api.js`. If the base URL is configurable via an environment variable (e.g. `REACT_APP_API_URL`), create `frontend/.env` with:
>
> ```env
> REACT_APP_API_URL=http://localhost:8000
> ```

## Environment Variables

Configure the backend in `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
AGRI_API_URL=https://your-agri-data-source-url
FRONTEND_URL=http://localhost:3000
THRESHOLD=2
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres / Supabase connection string |
| `AGRI_API_URL` | Source URL for mandi price data |
| `FRONTEND_URL` | Allowed frontend origin (used for CORS) |
| `THRESHOLD` | _Describe what this controls (e.g. minimum records required, price-change alert threshold)_ |

> Never commit your real `.env` file. Make sure it is listed in `.gitignore`.

## Database Setup

1. Create a Postgres database (or a Supabase project).
2. Run `database/supabase_grants.sql` in the SQL editor or via `psql` to create the schema and apply access grants and row-level security policies:

   ```bash
   psql "$DATABASE_URL" -f database/supabase_grants.sql
   ```

3. Populate data by running the data-fetch job (see [Scheduler](#scheduler)) or calling `/update-data`.

_List the main tables here (e.g. `prices`: commodity, state, district, market, date, min/max/modal price)._

## API Reference

Base URL: `http://localhost:8000`

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |

### Historical Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/prices` | Historical prices, filterable by commodity, state, district |
| GET | `/price-stats` | Min, max, average, and record count |
| GET | `/commodities` | List available commodities |
| GET | `/states` | List available states |
| GET | `/districts` | List districts (optionally by state) |

### Prediction

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/predict` | Forecast a commodity price |

**`/predict` parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `commodity` | string | yes | Commodity name, e.g. `wheat` |
| `state` | string | yes | State name, e.g. `karnataka` |
| `month` | integer | yes | Target month (1–12) |

```bash
curl "http://localhost:8000/predict?commodity=wheat&state=karnataka&month=4"
```

Example response _(update to match your actual output)_:

```json
{
  "commodity": "wheat",
  "state": "karnataka",
  "month": 4,
  "predicted_price": 2450.0
}
```

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/market-data` | Live mandi market data |

### Admin / Maintenance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/update-data`, `/fetch` | Fetch and store the latest market data |
| GET | `/train` | Retrain the model |

> ⚠️ **Production note:** `/update-data`, `/fetch`, and `/train` trigger expensive, state-changing jobs. Restrict access (API key, auth, or network rules) before exposing them publicly.

## Data Flow

1. Scheduled scripts fetch market and price data from agricultural data sources.
2. Data is normalized and stored in Postgres / Supabase.
3. The backend exposes endpoints for historical and live data.
4. The prediction service loads the trained hybrid model and generates forecasts.
5. The frontend visualizes results in charts and dashboards.

## Machine Learning

The project uses a hybrid forecasting strategy:

- **ARIMA** models the time-series trend and seasonality.
- **XGBoost** captures nonlinear, feature-driven variation.

_Describe how the two are combined (e.g. XGBoost on ARIMA residuals, or a weighted blend), the input features (commodity, state, month, lagged prices, etc.), and the evaluation metrics (MAE / RMSE / MAPE)._

**Artifacts:** the trained model and encoders live in `backend/ml_pipeline/` (`model.pkl`, `encoders.pkl`).

**Retraining:** trigger the training pipeline with the `/train` endpoint, or run `backend/ml_pipeline/trainer.py` directly. If `model.pkl` is missing, run training once before calling `/predict`.

## Scheduler

Market data is refreshed periodically by the scripts in `scheduler/`:

```bash
cd scheduler
python fetch_data.py     # one-off fetch
python scheduler.py      # recurring schedule
```

A GitHub workflow in `.github/` can also run the refresh on a schedule. _Document the cron frequency and required repository secrets here._

## Deployment

- **Frontend:** Vercel-style static deployment (set the API URL environment variable).
- **Backend:** any cloud Python host (Render, Railway, Fly.io, etc.). Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- **Database:** Supabase or any managed Postgres.
- **Scheduler:** GitHub Actions cron or a hosted cron job.

## Known Limitations

- Forecast accuracy depends on the amount and quality of historical data for each commodity and region.
- Some commodities or districts may have sparse or irregular records.
- Predictions are estimates and should not be the sole basis for trading decisions.

## Roadmap

- [ ] Protect admin endpoints with authentication
- [ ] Switch `/train` and `/update-data` to `POST`
- [ ] Add model evaluation metrics to the UI
- [ ] Multi-month forecast charts with confidence intervals
- [ ] Automated tests and CI

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push the branch and open a pull request

## License

Licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Contact

Project repository: https://github.com/vedant1844/agri-price-predictor

## Acknowledgements

- Government agricultural market datasets
- FastAPI and the Python data science ecosystem
- React and Chart.js
- Supabase / PostgreSQL
