import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

DB_URL = os.getenv("DATABASE_URL")
AGRI_API_URL = os.getenv("AGRI_API_URL")
THRESHOLD = float(os.getenv("THRESHOLD", 2))
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://agri-price-predictor.vercel.app")
