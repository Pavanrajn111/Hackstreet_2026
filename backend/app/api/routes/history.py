from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.farm import FarmModel, IrrigationLogModel, RecommendationHistoryModel

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
    crop: Optional[str] = Field(default="Tomato", max_length=50)
    irrigation_date: date = Field(default_factory=date.today)
    depth_applied_mm: float = Field(..., ge=0.0)
    volume_applied_litres: float = Field(..., ge=0.0)
    pump_runtime_minutes: Optional[int] = Field(default=None, ge=0)
    was_recommended: bool = True
    water_saved_litres: Optional[float] = Field(default=0.0, ge=0.0)
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
def get_irrigation_history(
    farm_id: Optional[int] = None,
    start_date: Optional[date] = Query(default=None, description="Filter logs starting from this date (inclusive)"),
    end_date: Optional[date] = Query(default=None, description="Filter logs up to this date (inclusive)"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve full irrigation log history with optional farm and date range filtering."""
    query = db.query(IrrigationLogModel)
    if farm_id is not None:
        query = query.filter(IrrigationLogModel.farm_id == farm_id)
    if start_date is not None:
        query = query.filter(IrrigationLogModel.irrigation_date >= start_date)
    if end_date is not None:
        query = query.filter(IrrigationLogModel.irrigation_date <= end_date)
    return query.order_by(IrrigationLogModel.irrigation_date.desc()).offset(offset).limit(limit).all()


@router.get("/{farm_id}", response_model=List[IrrigationLogRead])
def get_farm_irrigation_history(
    farm_id: int,
    start_date: Optional[date] = Query(default=None, description="Filter logs starting from this date"),
    end_date: Optional[date] = Query(default=None, description="Filter logs up to this date"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve irrigation history specific to a farm ID."""
    farm = db.query(FarmModel).filter(FarmModel.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with ID {farm_id} not found",
        )
    query = db.query(IrrigationLogModel).filter(IrrigationLogModel.farm_id == farm_id)
    if start_date is not None:
        query = query.filter(IrrigationLogModel.irrigation_date >= start_date)
    if end_date is not None:
        query = query.filter(IrrigationLogModel.irrigation_date <= end_date)
    return query.order_by(IrrigationLogModel.irrigation_date.desc()).offset(offset).limit(limit).all()


@router.post("", response_model=IrrigationLogRead, status_code=status.HTTP_201_CREATED)
def record_irrigation_event(log_in: IrrigationLogCreate, db: Session = Depends(get_db)):
    """Log an irrigation event executed in the field."""
    if log_in.farm_id is not None:
        farm = db.query(FarmModel).filter(FarmModel.id == log_in.farm_id).first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farm with ID {log_in.farm_id} not found",
            )
    log_record = IrrigationLogModel(**log_in.model_dump())
    db.add(log_record)
    db.commit()
    db.refresh(log_record)
    return log_record


@router.get("/recommendations/audit", response_model=List[RecommendationAuditRead])
def get_recommendation_audits(
    farm_id: Optional[int] = None,
    start_date: Optional[datetime] = Query(default=None, description="Filter audits on or after timestamp"),
    end_date: Optional[datetime] = Query(default=None, description="Filter audits on or before timestamp"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve persisted recommendation decision audits."""
    query = db.query(RecommendationHistoryModel)
    if farm_id is not None:
        query = query.filter(RecommendationHistoryModel.farm_id == farm_id)
    if start_date is not None:
        query = query.filter(RecommendationHistoryModel.timestamp >= start_date)
    if end_date is not None:
        query = query.filter(RecommendationHistoryModel.timestamp <= end_date)
    return query.order_by(RecommendationHistoryModel.timestamp.desc()).offset(offset).limit(limit).all()
