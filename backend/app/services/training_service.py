from ml_pipeline.trainer import train_model

def run_pipeline():
    train_model()
    return {"message": "Model trained successfully"}