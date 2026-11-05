from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.farm import IrrigationLogModel

router = APIRouter(prefix="/history", tags=["History"])


class IrrigationLogRead(BaseModel):
    id: int
    farm_id: Optional[int]
    irrigation_date: date
    depth_applied_mm: float
    volume_applied_litres: float
    pump_runtime_minutes: Optional[int]
    was_recommended: bool
    notes: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class IrrigationLogCreate(BaseModel):
    farm_id: Optional[int] = None
    irrigation_date: date = date.today()
    depth_applied_mm: float
    volume_applied_litres: float
    pump_runtime_minutes: Optional[int] = None
    was_recommended: bool = True
    notes: Optional[str] = None


@router.get("", response_model=List[IrrigationLogRead])
def get_irrigation_history(farm_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Retrieve irrigation log history for water accounting and audits."""
    query = db.query(IrrigationLogModel)
    if farm_id is not None:
        query = query.filter(IrrigationLogModel.farm_id == farm_id)
    return query.order_by(IrrigationLogModel.irrigation_date.desc()).limit(50).all()


@router.post("", response_model=IrrigationLogRead)
def record_irrigation_event(log_in: IrrigationLogCreate, db: Session = Depends(get_db)):
    """Log an irrigation event executed in the field."""
    log_record = IrrigationLogModel(**log_in.model_dump())
    db.add(log_record)
    db.commit()
    db.refresh(log_record)
    return log_record
