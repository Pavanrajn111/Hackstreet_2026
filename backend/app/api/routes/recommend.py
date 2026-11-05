import sys
import os
import logging
import math
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.farm import RecommendationHistoryModel, FarmModel
from app.schemas.recommendation import RecommendRequest, RecommendResponse
from app.services.irrigation_engine import (
    calculate_irrigation_recommendation,
    calculate_taw_and_raw,
    load_crops_catalog,
    load_soils_catalog,
)

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


def _normalise_crop_name(crop_name: str) -> str:
    crop = crop_name.strip().lower()
    return {"rice": "paddy"}.get(crop, crop)


def _normalise_soil_name(soil_name: str) -> str:
    soil = soil_name.strip().lower()
    if "clay" in soil or "black" in soil:
        return "clay"
    if "sandy soil" in soil or soil == "sandy":
        return "sandy"
    if "sand" in soil or "alluvial" in soil or "loam" in soil:
        return "loam"
    return soil


def _normalise_stage_name(stage_name: str) -> str:
    stage = stage_name.strip().lower()
    if "initial" in stage or "establish" in stage:
        return "initial"
    if "late" in stage or "ripen" in stage or "matur" in stage:
        return "late"
    return "middle"


def _build_ml_features(payload: RecommendRequest, recommendation: RecommendResponse) -> dict:
    crops = load_crops_catalog()
    soils = load_soils_catalog()
    crop_info = crops.get(payload.crop, crops.get("Tomato", {}))
    soil_info = soils.get(payload.soil_type, soils.get("Red Sandy Loam", {}))
    taw_mm, _ = calculate_taw_and_raw(soil_info, crop_info)

    days_since_irrigation = (
        max(1, (date.today() - payload.last_irrigation_date).days)
        if payload.last_irrigation_date
        else 3
    )
    weather = recommendation.seven_day_weather[0] if recommendation.seven_day_weather else None
    soil_moisture = recommendation.soil_moisture or {}
    available_moisture_pct = float(soil_moisture.get("current_pct", 100.0))
    depletion_mm = taw_mm * (1.0 - min(100.0, max(0.0, available_moisture_pct)) / 100.0)
    tmax = weather.temp_max_c if weather else 28.0
    tmin = weather.temp_min_c if weather else 19.0

    return {
        "crop": _normalise_crop_name(payload.crop),
        "soil": _normalise_soil_name(payload.soil_type),
        "stage": _normalise_stage_name(recommendation.current_growth_stage),
        "kc": float(recommendation.current_kc),
        "depletion_mm": float(depletion_mm),
        "taw_mm": float(taw_mm),
        "days_since_irrigation": int(days_since_irrigation),
        "et0": float(weather.et0_mm if weather else 4.2),
        "tmax": float(tmax),
        "tmin": float(tmin),
        "tmean": (float(tmax) + float(tmin)) / 2.0,
        "rainfall": float(weather.rainfall_mm if weather else 0.0),
        "humidity": float(weather.humidity_pct if weather else 60),
        "wind": 2.5,
        "solar": 20.0,
        "latitude": float(payload.latitude),
        "longitude": float(payload.longitude),
    }


def _risk_level(probability: float) -> str:
    if probability >= 0.65:
        return "High"
    if probability >= 0.45:
        return "Moderate"
    return "Low"


def _higher_risk(first: str, second: str) -> str:
    levels = {"Low": 0, "Moderate": 1, "High": 2}
    return max((first, second), key=lambda level: levels.get(level, 0))


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

    # Validate farm_id if provided
    audit_farm_id = None
    if payload.farm_id is not None:
        farm = db.query(FarmModel).filter(FarmModel.id == payload.farm_id).first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farm with ID {payload.farm_id} not found",
            )
        audit_farm_id = farm.id
    else:
        matched_farm = db.query(FarmModel).filter(FarmModel.farm_name == payload.farm_name).first()
        if matched_farm:
            audit_farm_id = matched_farm.id

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
        ml_result = predict_irrigation_adjustment(_build_ml_features(payload, recommendation))

        if ml_result.get("ml_adjustment_used"):
            recommendation.ml_adjustment_used = True
            probability = float(ml_result.get("irrigation_probability", 0.0) or 0.0)
            risk_category = ml_result.get("risk_category", "Low")
            recommendation.explanation += (
                " ML guidance indicates a "
                f"{str(risk_category).lower()} risk profile and "
                f"{probability:.2%} irrigation likelihood."
            )

            amount_mm = float(ml_result.get("irrigation_amount_mm", 0.0) or 0.0)
            if math.isfinite(amount_mm) and amount_mm > 0.0 and ml_result.get("irrigate_now"):
                recommendation.irrigate_today = True
                recommendation.irrigation_depth_mm = max(recommendation.irrigation_depth_mm, amount_mm)
                recommendation.water_volume_litres = round(
                    recommendation.irrigation_depth_mm * payload.farm_area_hectares * 10000.0,
                    1,
                )
                pump_flow_rate = payload.pump_flow_rate_lpm or 120.0
                if pump_flow_rate > 0:
                    recommendation.estimated_pump_runtime_minutes = int(
                        round(recommendation.water_volume_litres / pump_flow_rate)
                    )

                if recommendation.seven_day_schedule:
                    today_schedule = recommendation.seven_day_schedule[0]
                    today_schedule.irrigate = True
                    today_schedule.action = "Irrigate"
                    today_schedule.recommended_depth_mm = recommendation.irrigation_depth_mm
                    today_schedule.water_volume_litres = recommendation.water_volume_litres
                    today_schedule.runtime_minutes = recommendation.estimated_pump_runtime_minutes or 0

            over_risk = _risk_level(float(ml_result.get("over_irrigation_risk", 0.0) or 0.0))
            under_risk = _risk_level(float(ml_result.get("under_irrigation_risk", 0.0) or 0.0))
            recommendation.over_irrigation_risk = _higher_risk(recommendation.over_irrigation_risk or "Low", over_risk)
            recommendation.under_irrigation_risk = _higher_risk(recommendation.under_irrigation_risk or "Low", under_risk)
            recommendation.risk_status = _higher_risk(recommendation.risk_status, str(risk_category))
            if over_risk != "Low":
                recommendation.over_irrigation_note = (
                    f"ML-estimated over-irrigation risk is {over_risk.lower()}."
                )
            if under_risk != "Low":
                recommendation.under_irrigation_note = (
                    f"ML-estimated under-irrigation risk is {under_risk.lower()}."
                )
    except Exception as ml_err:
        logger.warning("ML adjustment evaluation failed gracefully: %s", ml_err)
        recommendation.ml_adjustment_used = False

    # 4. Persist audit in SQLite database
    try:
        audit_entry = RecommendationHistoryModel(
            farm_id=audit_farm_id,
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


@router.get("/{farm_id}", response_model=RecommendResponse)
def get_recommendation_for_farm(farm_id: int, db: Session = Depends(get_db)):
    """
    Generate irrigation recommendation directly for a registered farm by ID.
    Retrieves stored farm characteristics and executes water balance calculations.
    """
    farm = db.query(FarmModel).filter(FarmModel.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with ID {farm_id} not found",
        )

    payload = RecommendRequest(
        farm_id=farm.id,
        farm_name=farm.farm_name,
        latitude=farm.latitude,
        longitude=farm.longitude,
        crop=farm.crop,
        soil_type=farm.soil_type,
        sowing_date=farm.sowing_date,
        farm_area_hectares=farm.farm_area_hectares,
        irrigation_method=farm.irrigation_method,
        last_irrigation_date=farm.last_irrigation_date,
        pump_flow_rate_lpm=farm.pump_flow_rate_lpm,
    )
    return get_recommendation(payload=payload, db=db)
