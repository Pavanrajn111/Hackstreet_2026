from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.farm import FarmModel
from app.schemas.farm import FarmCreate, FarmUpdate, FarmRead

router = APIRouter(prefix="/farms", tags=["Farms"])


@router.get("", response_model=List[FarmRead])
def list_farms(db: Session = Depends(get_db)):
    """Retrieve list of registered farm profiles."""
    return db.query(FarmModel).order_by(FarmModel.created_at.desc()).all()


@router.post("", response_model=FarmRead, status_code=status.HTTP_201_CREATED)
def create_farm(farm_in: FarmCreate, db: Session = Depends(get_db)):
    """Register or save a new farm configuration."""
    farm_record = FarmModel(**farm_in.model_dump())
    db.add(farm_record)
    db.commit()
    db.refresh(farm_record)
    return farm_record


@router.get("/{farm_id}", response_model=FarmRead)
def get_farm(farm_id: int, db: Session = Depends(get_db)):
    """Get single farm profile details by ID."""
    farm = db.query(FarmModel).filter(FarmModel.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with ID {farm_id} not found",
        )
    return farm


@router.put("/{farm_id}", response_model=FarmRead)
def update_farm(farm_id: int, farm_update: FarmUpdate, db: Session = Depends(get_db)):
    """Update fields of an existing farm configuration."""
    farm = db.query(FarmModel).filter(FarmModel.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with ID {farm_id} not found",
        )
    update_data = farm_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(farm, key, value)
    db.commit()
    db.refresh(farm)
    return farm


@router.delete("/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm(farm_id: int, db: Session = Depends(get_db)):
    """Delete a farm profile and its cascade-related logs and recommendation audits."""
    farm = db.query(FarmModel).filter(FarmModel.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with ID {farm_id} not found",
        )
    db.delete(farm)
    db.commit()
    return None
