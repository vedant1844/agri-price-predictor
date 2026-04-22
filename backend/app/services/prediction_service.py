from ml_pipeline.xgboost_model import predict_price

def get_prediction():
    result = predict_price()
    return {"prediction": result}