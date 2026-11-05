from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.farm import FarmModel
from app.schemas.farm import FarmCreate, FarmRead

router = APIRouter(prefix="/farms", tags=["Farms"])


@router.get("", response_model=List[FarmRead])
def list_farms(db: Session = Depends(get_db)):
    """Retrieve list of saved farm profiles."""
    return db.query(FarmModel).order_by(FarmModel.created_at.desc()).all()


@router.post("", response_model=FarmRead)
def create_farm(farm_in: FarmCreate, db: Session = Depends(get_db)):
    """Register or save a new farm configuration."""
    farm_record = FarmModel(**farm_in.model_dump())
    db.add(farm_record)
    db.commit()
    db.refresh(farm_record)
    return farm_record


@router.get("/{farm_id}", response_model=FarmRead)
def get_farm(farm_id: int, db: Session = Depends(get_db)):
    """Get single farm profile details."""
    farm = db.query(FarmModel).filter(FarmModel.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm
