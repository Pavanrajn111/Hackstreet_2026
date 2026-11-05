import sys
import os
from fastapi import APIRouter
from app.schemas.recommendation import RecommendRequest, RecommendResponse
from app.services.irrigation_engine import calculate_irrigation_recommendation

# Make ml module discoverable if available
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../ml")))
try:
    from model_interface import predict_irrigation_adjustment
except ImportError:
    def predict_irrigation_adjustment(features):
        return {"ml_adjustment_used": False}

router = APIRouter(prefix="/recommend", tags=["Recommendation"])


@router.post("", response_model=RecommendResponse)
def get_recommendation(payload: RecommendRequest):
    """
    Generate irrigation recommendation for a specific farm profile.
    Combines FAO-56 Penman-Monteith water-balance engine with ML adjustment (if available).
    """
    # 1. Base agronomic calculation
    recommendation = calculate_irrigation_recommendation(payload)

    # 2. Optional ML adjustment hook
    ml_result = predict_irrigation_adjustment({
        "crop": payload.crop,
        "soil_type": payload.soil_type,
        "farm_area_hectares": payload.farm_area_hectares,
        "days_after_sowing": 21,
    })

    if ml_result.get("ml_adjustment_used"):
        recommendation.ml_adjustment_used = True
        # Teammates can fine-tune recommendation here

    return recommendation
