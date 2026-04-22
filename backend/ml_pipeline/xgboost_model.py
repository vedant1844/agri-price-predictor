import os
import numpy as np
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

def predict_price():
    # If model exists → load it
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)

        # Example input (you can later replace with real data)
        sample = np.array([[1]])  

        prediction = model.predict(sample)
        return float(prediction[0])

    # If model not trained yet
    return "Model not trained yet"