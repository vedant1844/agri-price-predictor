import os
import numpy as np
import joblib
from xgboost import XGBRegressor

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

def train_model():
    # Dummy training data (replace later with DB data)
    X = np.array([[1], [2], [3], [4], [5]])
    y = np.array([100, 200, 300, 400, 500])

    model = XGBRegressor()
    model.fit(X, y)

    # Save model
    joblib.dump(model, MODEL_PATH)

    print("Model trained and saved!")