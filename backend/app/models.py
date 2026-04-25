from sqlalchemy import Column, Integer, String, DateTime, Float, Date
from datetime import datetime
from app.db import Base


class Price(Base):
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True, index=True)

    commodity = Column(String, index=True, nullable=False)

    state = Column(String, index=True)

    district = Column(String)

    market = Column(String, index=True)

    variety = Column(String)

    grade = Column(String)

    min_price = Column(Float)

    max_price = Column(Float)

    modal_price = Column(Float)

    # Legacy 'price' column kept for backward compat — stores modal_price
    price = Column(Float, nullable=False)

    unit = Column(String, default="quintal")

    source = Column(String, nullable=True)

    arrival_date = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)