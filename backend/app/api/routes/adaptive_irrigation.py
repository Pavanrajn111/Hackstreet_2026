"""
API Endpoints for Adaptive Irrigation Options Engine
-----------------------------------------------------
Provides:
  - POST /irrigation/options
  - POST /irrigation/compare
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.adaptive_irrigation import (
    IrrigationOptionsRequest,
    IrrigationOptionsResponse,
    IrrigationCompareRequest,
    IrrigationCompareResponse,
)
from app.services.adaptive_irrigation_service import (
    evaluate_irrigation_options,
    compare_irrigation_methods,
)

router = APIRouter(prefix="/irrigation", tags=["Adaptive Irrigation Advisor"])


@router.post("/options", response_model=IrrigationOptionsResponse)
def get_irrigation_options(req: IrrigationOptionsRequest, db: Session = Depends(get_db)):
    """
    Evaluates suitable modern and improved irrigation methods for a farm:
    Drip, Sprinkler, Surface/Furrow, Improved Existing System, Scheduling,
    Zoning, Leak Reduction, and Mulching.
    """
    try:
        return evaluate_irrigation_options(req, db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate irrigation options: {str(exc)}",
        )


@router.post("/compare", response_model=IrrigationCompareResponse)
def compare_irrigation_options(req: IrrigationCompareRequest, db: Session = Depends(get_db)):
    """
    Compares the farm's current irrigation method against one or more alternative methods
    in terms of application efficiency, water savings %, capital costs, and labor requirements.
    """
    try:
        return compare_irrigation_methods(req, db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare irrigation methods: {str(exc)}",
        )
