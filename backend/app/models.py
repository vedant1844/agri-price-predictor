from sqlalchemy import Column, Integer, String, DateTime, Float
from datetime import datetime
from app.db import Base

class Price(Base):
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True, index=True)

    commodity = Column(String, index=True, nullable=False)

    price = Column(Float, nullable=False)  # better for ML

    market = Column(String, index=True)  # location-based prediction

    unit = Column(String, default="kg")

    source = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)