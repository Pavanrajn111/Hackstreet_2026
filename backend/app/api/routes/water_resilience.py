"""
API Endpoints for Water Shortage & Water Resilience Action Planner
------------------------------------------------------------------
Provides:
  - POST /water-shortage/action-plan
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.water_resilience import (
    WaterShortageActionPlanRequest,
    WaterShortageActionPlanResponse,
)
from app.services.water_resilience_service import generate_water_shortage_action_plan

router = APIRouter(prefix="/water-shortage", tags=["Water Shortage & Resilience Planner"])


@router.post("/action-plan", response_model=WaterShortageActionPlanResponse)
def create_water_shortage_action_plan(
    req: WaterShortageActionPlanRequest, db: Session = Depends(get_db)
):
    """
    Generate an actionable multi-tier drought and water resilience action plan:
      1. Deterministic FAO-56 deficit calculation
      2. Adaptive irrigation method options and moisture conservation
      3. Opt-in community water sharing matches within radius
      4. Agronomic stage-sensitive crop protection rules
      5. ML prediction risk signals
    """
    try:
        return generate_water_shortage_action_plan(req, db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate water shortage action plan: {str(exc)}",
        )
