from datetime import date, datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Text
from app.core.database import Base


class FarmModel(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    farm_name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    crop = Column(String(50), nullable=False)
    soil_type = Column(String(50), nullable=False)
    sowing_date = Column(Date, nullable=False)
    farm_area_hectares = Column(Float, nullable=False, default=1.0)
    irrigation_method = Column(String(50), nullable=False, default="Drip Irrigation")
    last_irrigation_date = Column(Date, nullable=True)
    pump_flow_rate_lpm = Column(Float, nullable=True, default=100.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class IrrigationLogModel(Base):
    __tablename__ = "irrigation_logs"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, nullable=True)
    irrigation_date = Column(Date, default=date.today)
    depth_applied_mm = Column(Float, nullable=False)
    volume_applied_litres = Column(Float, nullable=False)
    pump_runtime_minutes = Column(Integer, nullable=True)
    was_recommended = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
