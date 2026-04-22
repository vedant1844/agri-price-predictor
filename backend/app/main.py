import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.db import engine, Base
import app.models

app = FastAPI(title="Agri Price Prediction API 🚀")

# ✅ CORS (for React / frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ restrict in production later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Create tables automatically
Base.metadata.create_all(bind=engine)

# ✅ Include routes
app.include_router(router)

# ✅ Root endpoint
@app.get("/")
def home():
    return {"message": "Agri API Running 🚀"}