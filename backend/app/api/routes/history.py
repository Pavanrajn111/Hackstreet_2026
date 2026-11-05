from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.farm import IrrigationLogModel, RecommendationHistoryModel

router = APIRouter(prefix="/history", tags=["History"])


class IrrigationLogRead(BaseModel):
    id: int
    farm_id: Optional[int] = None
    crop: Optional[str] = "Tomato"
    irrigation_date: date
    depth_applied_mm: float
    volume_applied_litres: float
    pump_runtime_minutes: Optional[int] = 0
    was_recommended: bool = True
    water_saved_litres: Optional[float] = 0.0
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class IrrigationLogCreate(BaseModel):
    farm_id: Optional[int] = None
    crop: Optional[str] = "Tomato"
    irrigation_date: date = date.today()
    depth_applied_mm: float
    volume_applied_litres: float
    pump_runtime_minutes: Optional[int] = None
    was_recommended: bool = True
    water_saved_litres: Optional[float] = 0.0
    notes: Optional[str] = None


class RecommendationAuditRead(BaseModel):
    id: int
    farm_id: Optional[int] = None
    farm_name: str
    crop: str
    timestamp: datetime
    irrigate_today: bool
    depth_mm: float
    volume_litres: float
    runtime_minutes: int
    growth_stage: Optional[str] = None
    risk_status: Optional[str] = None
    weather_source: str
    ml_adjustment_used: bool
    explanation: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[IrrigationLogRead])
def get_irrigation_history(farm_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Retrieve full irrigation log history."""
    query = db.query(IrrigationLogModel)
    if farm_id is not None:
        query = query.filter(IrrigationLogModel.farm_id == farm_id)
    return query.order_by(IrrigationLogModel.irrigation_date.desc()).limit(100).all()


@router.get("/{farm_id}", response_model=List[IrrigationLogRead])
def get_farm_irrigation_history(farm_id: int, db: Session = Depends(get_db)):
    """Retrieve irrigation history specific to a farm ID."""
    return (
        db.query(IrrigationLogModel)
        .filter(IrrigationLogModel.farm_id == farm_id)
        .order_by(IrrigationLogModel.irrigation_date.desc())
        .limit(100)
        .all()
    )


@router.post("", response_model=IrrigationLogRead, status_code=status.HTTP_201_CREATED)
def record_irrigation_event(log_in: IrrigationLogCreate, db: Session = Depends(get_db)):
    """Log an irrigation event executed in the field."""
    log_record = IrrigationLogModel(**log_in.model_dump())
    db.add(log_record)
    db.commit()
    db.refresh(log_record)
    return log_record


@router.get("/recommendations/audit", response_model=List[RecommendationAuditRead])
def get_recommendation_audits(farm_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Retrieve persisted recommendation decision audits."""
    query = db.query(RecommendationHistoryModel)
    if farm_id is not None:
        query = query.filter(RecommendationHistoryModel.farm_id == farm_id)
    return query.order_by(RecommendationHistoryModel.timestamp.desc()).limit(50).all()
