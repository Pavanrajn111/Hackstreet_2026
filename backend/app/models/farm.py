from datetime import date, datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class FarmModel(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    farm_name = Column(String(100), nullable=False)
    district = Column(String(100), nullable=True, default="Bengaluru Rural")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    crop = Column(String(50), nullable=False)
    soil_type = Column(String(50), nullable=False)
    sowing_date = Column(Date, nullable=False)
    farm_area_hectares = Column(Float, nullable=False, default=1.0)
    irrigation_method = Column(String(50), nullable=False, default="Drip Irrigation")
    last_irrigation_date = Column(Date, nullable=True)
    pump_flow_rate_lpm = Column(Float, nullable=True, default=120.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships with cascade deletion
    irrigation_logs = relationship(
        "IrrigationLogModel",
        back_populates="farm",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    recommendation_history = relationship(
        "RecommendationHistoryModel",
        back_populates="farm",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    hybrid_plans = relationship(
        "HybridPlanModel",
        back_populates="farm",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class IrrigationLogModel(Base):
    __tablename__ = "irrigation_logs"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=True, index=True)
    crop = Column(String(50), nullable=True)
    irrigation_date = Column(Date, default=date.today)
    depth_applied_mm = Column(Float, nullable=False)
    volume_applied_litres = Column(Float, nullable=False)
    pump_runtime_minutes = Column(Integer, nullable=True)
    was_recommended = Column(Boolean, default=True)
    water_saved_litres = Column(Float, nullable=True, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    farm = relationship("FarmModel", back_populates="irrigation_logs")


class RecommendationHistoryModel(Base):
    __tablename__ = "recommendation_history"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=True, index=True)
    farm_name = Column(String(100), nullable=False)
    crop = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    irrigate_today = Column(Boolean, nullable=False)
    depth_mm = Column(Float, nullable=False)
    volume_litres = Column(Float, nullable=False)
    runtime_minutes = Column(Integer, default=0)
    growth_stage = Column(String(100), nullable=True)
    risk_status = Column(String(50), nullable=True)
    weather_source = Column(String(50), default="open-meteo")
    ml_adjustment_used = Column(Boolean, default=False)
    explanation = Column(Text, nullable=True)

    farm = relationship("FarmModel", back_populates="recommendation_history")


class HybridPlanModel(Base):
    __tablename__ = "hybrid_plans"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=True, index=True)
    plan_name = Column(String(120), nullable=False)
    main_crop = Column(String(50), nullable=False)
    intercrop = Column(String(50), nullable=False)
    farm_area_hectares = Column(Float, nullable=False)
    plant_count_summary = Column(Text, nullable=True)
    net_profit_expected_inr = Column(Float, nullable=True, default=0.0)
    roi_pct = Column(Float, nullable=True, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    farm = relationship("FarmModel", back_populates="hybrid_plans")
