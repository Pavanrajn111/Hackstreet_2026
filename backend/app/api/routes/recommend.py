import sys
import os
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.farm import RecommendationHistoryModel, FarmModel
from app.schemas.recommendation import RecommendRequest, RecommendResponse
from app.services.irrigation_engine import calculate_irrigation_recommendation

# Make ml module discoverable
ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../ml"))
if ML_DIR not in sys.path:
    sys.path.append(ML_DIR)

try:
    from model_interface import predict_irrigation_adjustment
except ImportError:
    def predict_irrigation_adjustment(features):
        return {"ml_adjustment_used": False}

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recommend", tags=["Recommendation"])


@router.post("", response_model=RecommendResponse)
def get_recommendation(payload: RecommendRequest, db: Session = Depends(get_db)):
    """
    Generate irrigation recommendation for a specific farm profile.
    Integrates:
      1. Open-Meteo live agro-weather service (ET0, precipitation, temperature, humidity)
      2. Agronomic FAO-56 Penman-Monteith water-balance engine
      3. Safe optional ML model adjustment hook
      4. SQLite persistence of the recommendation audit
    """
    # 1. Validation checks
    if payload.latitude < -90 or payload.latitude > 90:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Latitude must be between -90.0 and 90.0 degrees",
        )
    if payload.longitude < -180 or payload.longitude > 180:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Longitude must be between -180.0 and 180.0 degrees",
        )
    if payload.farm_area_hectares <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Farm area must be greater than 0 hectares",
        )

    # 2. Base agronomic calculation using Open-Meteo & FAO-56
    try:
        recommendation = calculate_irrigation_recommendation(payload)
    except Exception as exc:
        logger.error("Error computing water balance recommendation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate irrigation recommendation: {str(exc)}",
        )

    # 3. Optional ML adjustment hook
    try:
        ml_result = predict_irrigation_adjustment({
            "days_after_sowing": (datetime.utcnow().date() - payload.sowing_date).days,
            "crop": payload.crop,
            "soil_type": payload.soil_type,
            "farm_area_hectares": payload.farm_area_hectares,
            "temp_max": recommendation.seven_day_weather[0].temp_max_c if recommendation.seven_day_weather else 28.0,
            "temp_min": recommendation.seven_day_weather[0].temp_min_c if recommendation.seven_day_weather else 19.0,
            "humidity_pct": recommendation.seven_day_weather[0].humidity_pct if recommendation.seven_day_weather else 60,
            "rainfall_mm": recommendation.seven_day_weather[0].rainfall_mm if recommendation.seven_day_weather else 0.0,
            "crop_kc_baseline": recommendation.current_kc,
            "irrigation_efficiency": 0.90 if "Drip" in payload.irrigation_method else 0.65,
            "last_irrigation_days_ago": (datetime.utcnow().date() - payload.last_irrigation_date).days if payload.last_irrigation_date else 3,
        })

        if ml_result.get("ml_adjustment_used"):
            recommendation.ml_adjustment_used = True
            adjusted_depth = ml_result.get("adjusted_depth_mm")
            if adjusted_depth is not None:
                recommendation.irrigation_depth_mm = adjusted_depth
                recommendation.water_volume_litres = round(adjusted_depth * payload.farm_area_hectares * 10000.0, 1)
                if payload.pump_flow_rate_lpm and payload.pump_flow_rate_lpm > 0:
                    recommendation.estimated_pump_runtime_minutes = int(round(recommendation.water_volume_litres / payload.pump_flow_rate_lpm))
            recommendation.explanation += f" (ML Refinement: {ml_result.get('explanation_note')})"
    except Exception as ml_err:
        logger.warning("ML adjustment evaluation failed gracefully: %s", ml_err)
        recommendation.ml_adjustment_used = False

    # 4. Persist audit in SQLite database
    try:
        matched_farm = db.query(FarmModel).filter(FarmModel.farm_name == payload.farm_name).first()
        farm_id = matched_farm.id if matched_farm else None

        audit_entry = RecommendationHistoryModel(
            farm_id=farm_id,
            farm_name=payload.farm_name,
            crop=payload.crop,
            timestamp=datetime.utcnow(),
            irrigate_today=recommendation.irrigate_today,
            depth_mm=recommendation.irrigation_depth_mm,
            volume_litres=recommendation.water_volume_litres,
            runtime_minutes=recommendation.estimated_pump_runtime_minutes or 0,
            growth_stage=recommendation.current_growth_stage,
            risk_status=recommendation.risk_status,
            weather_source=recommendation.weather_source or "open-meteo",
            ml_adjustment_used=recommendation.ml_adjustment_used,
            explanation=recommendation.explanation,
        )
        db.add(audit_entry)
        db.commit()
    except Exception as db_err:
        logger.warning("Could not persist recommendation audit to SQLite: %s", db_err)
        db.rollback()

    return recommendation
