"""AGR002 ML Integration Bridge.

Provides a unified, resilient bridge between the backend FastAPI services and the
trained ML irrigation model bundle in the ml/ directory.

Key design principles:
1. Safe path resolution: resolves ml/ relative to this file, independent of CWD.
2. Settings respect: when settings.ML_MODEL_ENABLED is False, no model files are
   searched or loaded, preventing log spam and unnecessary filesystem access.
3. Singleton lifecycle: when enabled, MLModelManager is initialized once and reused.
4. Deterministic fallback: returns clean fallback dictionaries when ML is disabled
   or artifacts are unavailable.
5. Introspection: exposes get_ml_status() for health checks and monitoring.
6. Centralized feature extraction: exposes build_irrigation_features() with
   categorical validation and per-day weather mapping.
"""

from __future__ import annotations

import logging
import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Resolve ml/ directory safely from the repository structure
# Path(__file__) -> backend/app/services/ml_bridge.py
# .parents[0] -> backend/app/services
# .parents[1] -> backend/app
# .parents[2] -> backend
# .parents[3] -> repo root (Hackstreet)
SERVICES_DIR = Path(__file__).resolve().parent
APP_DIR = SERVICES_DIR.parent
BACKEND_DIR = APP_DIR.parent
REPO_ROOT = BACKEND_DIR.parent
ML_DIR = REPO_ROOT / "ml"

if ML_DIR.exists() and str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

# All expected model bundle keys
ALL_EXPECTED_MODELS = [
    "irrigation_classifier",
    "irrigation_amount",
    "over_irrigation",
    "under_irrigation",
    "et0_day_1",
    "et0_day_2",
    "et0_day_3",
    "et0_day_4",
    "et0_day_5",
    "et0_day_6",
    "et0_day_7",
]


def normalise_crop_name(crop_name: str) -> str:
    """Normalizes crop names and validates against model expectations."""
    raw = str(crop_name).strip()
    crop = raw.lower()
    mapped = {"rice": "paddy"}.get(crop, crop)
    if mapped != crop:
        logger.debug("Normalized crop '%s' to '%s'", raw, mapped)
    return mapped


def normalise_soil_name(soil_name: str) -> str:
    """Normalizes soil types to standard categories (clay, sandy, loam)."""
    raw = str(soil_name).strip()
    soil = raw.lower()
    mapped = soil
    if "clay" in soil or "black" in soil:
        mapped = "clay"
    elif "sandy soil" in soil or soil == "sandy":
        mapped = "sandy"
    elif "sand" in soil or "alluvial" in soil or "loam" in soil:
        mapped = "loam"
    if mapped != soil:
        logger.debug("Normalized soil '%s' to '%s'", raw, mapped)
    return mapped


def normalise_stage_name(stage_name: str) -> str:
    """Normalizes crop growth stages to standard categories (initial, middle, late)."""
    raw = str(stage_name).strip()
    stage = raw.lower()
    mapped = stage
    if "initial" in stage or "germination" in stage or "establishment" in stage:
        mapped = "initial"
    elif "mid" in stage or "flowering" in stage or "yield" in stage or "vegetative" in stage:
        mapped = "middle"
    elif "late" in stage or "ripening" in stage or "harvest" in stage or "maturity" in stage:
        mapped = "late"
    if mapped != stage:
        logger.debug("Normalized growth stage '%s' to '%s'", raw, mapped)
    return mapped


def build_irrigation_features(payload: Any, recommendation: Any) -> Dict[str, Any]:
    """Constructs a normalized feature dictionary for ML irrigation models and ET0 forecasting.

    Extracts daily weather (temperature, humidity, rainfall, wind, solar radiation)
    and agronomic characteristics, ensuring clean categorical mapping and unit
    consistency.
    """
    from app.services.irrigation_engine import (
        load_crops_catalog,
        load_soils_catalog,
        calculate_taw_and_raw,
    )

    crops = load_crops_catalog()
    soils = load_soils_catalog()

    crop_name = getattr(payload, "crop", "Tomato")
    soil_type = getattr(payload, "soil_type", "Red Sandy Loam")

    crop_info = crops.get(crop_name, crops.get("Tomato", {}))
    soil_info = soils.get(soil_type, soils.get("Red Sandy Loam", {}))
    taw_mm, _ = calculate_taw_and_raw(soil_info, crop_info)

    last_irr = getattr(payload, "last_irrigation_date", None)
    days_since_irrigation = max(1, (date.today() - last_irr).days) if last_irr else 3

    weather_list = getattr(recommendation, "seven_day_weather", None) or []
    weather = weather_list[0] if weather_list else None

    soil_moisture = getattr(recommendation, "soil_moisture", {}) or {}
    available_moisture_pct = float(soil_moisture.get("current_pct", 100.0))
    depletion_mm = taw_mm * (1.0 - min(100.0, max(0.0, available_moisture_pct)) / 100.0)

    tmax = getattr(weather, "temp_max_c", 28.0) if weather else 28.0
    tmin = getattr(weather, "temp_min_c", 19.0) if weather else 19.0

    # Extract real wind speed and solar radiation if present, falling back to seasonal defaults
    raw_wind = getattr(weather, "wind_m_s", None) if weather else None
    wind = float(raw_wind) if raw_wind is not None and float(raw_wind) > 0 else 2.5

    raw_solar = getattr(weather, "solar_mj_m2", None) if weather else None
    solar = float(raw_solar) if raw_solar is not None and float(raw_solar) > 0 else 20.0

    lat = float(getattr(payload, "latitude", 12.97))
    lon = float(getattr(payload, "longitude", 77.59))

    daily_weather: List[Dict[str, float]] = []
    for w in weather_list:
        d_tmax = float(getattr(w, "temp_max_c", 28.0))
        d_tmin = float(getattr(w, "temp_min_c", 19.0))
        d_wind = getattr(w, "wind_m_s", None)
        d_solar = getattr(w, "solar_mj_m2", None)
        daily_weather.append({
            "tmax": d_tmax,
            "tmin": d_tmin,
            "tmean": (d_tmax + d_tmin) / 2.0,
            "rainfall": float(getattr(w, "rainfall_mm", 0.0)),
            "humidity": float(getattr(w, "humidity_pct", 60)),
            "wind": float(d_wind) if d_wind is not None and float(d_wind) > 0 else 2.5,
            "solar": float(d_solar) if d_solar is not None and float(d_solar) > 0 else 20.0,
            "latitude": lat,
            "longitude": lon,
        })

    return {
        "crop": normalise_crop_name(crop_name),
        "soil": normalise_soil_name(soil_type),
        "stage": normalise_stage_name(getattr(recommendation, "current_growth_stage", "middle")),
        "kc": float(getattr(recommendation, "current_kc", 1.0)),
        "depletion_mm": float(depletion_mm),
        "taw_mm": float(taw_mm),
        "days_since_irrigation": int(days_since_irrigation),
        "et0": float(getattr(weather, "et0_mm", 4.2)) if weather else 4.2,
        "tmax": float(tmax),
        "tmin": float(tmin),
        "tmean": (float(tmax) + float(tmin)) / 2.0,
        "rainfall": float(getattr(weather, "rainfall_mm", 0.0)) if weather else 0.0,
        "humidity": float(getattr(weather, "humidity_pct", 60)) if weather else 60.0,
        "wind": wind,
        "solar": solar,
        "latitude": lat,
        "longitude": lon,
        "daily_weather": daily_weather,
    }


def _get_configured_model_dir() -> Path:
    raw_dir = getattr(settings, "ML_MODEL_DIR", "../ml/models")
    configured = Path(raw_dir)
    if not configured.is_absolute():
        configured = (BACKEND_DIR / configured).resolve()
    # Check if nested 'models' subfolder contains features.json or joblib files
    if (configured / "models").exists() and (
        (configured / "models" / "features.json").exists()
        or any((configured / "models").glob("*.joblib"))
    ):
        return (configured / "models").resolve()
    return configured


_manager_instance: Optional[Any] = None
_manager_attempted: bool = False


def get_model_manager() -> Optional[Any]:
    """Retrieve the singleton MLModelManager instance, or None if disabled or unavailable."""
    global _manager_instance, _manager_attempted
    if not getattr(settings, "ML_MODEL_ENABLED", False):
        return None

    if _manager_instance is None and not _manager_attempted:
        _manager_attempted = True
        try:
            import model_interface

            model_dir = _get_configured_model_dir()
            _manager_instance = model_interface.MLModelManager(model_dir=model_dir)
            logger.info("Initialized MLModelManager pointing to %s", model_dir)
        except Exception as exc:
            logger.warning("Could not initialize MLModelManager: %s", exc)
            _manager_instance = None

    return _manager_instance


def reset_model_manager() -> None:
    """Reset the singleton instance (primarily for testing purposes)."""
    global _manager_instance, _manager_attempted
    _manager_instance = None
    _manager_attempted = False


def _inspect_framework_versions() -> Dict[str, Optional[str]]:
    packages = {
        "scikit-learn": "sklearn",
        "numpy": "numpy",
        "pandas": "pandas",
        "joblib": "joblib",
        "xgboost": "xgboost",
    }
    versions: Dict[str, Optional[str]] = {}
    for display_name, mod_name in packages.items():
        try:
            mod = __import__(mod_name)
            versions[display_name] = getattr(mod, "__version__", "unknown")
        except ImportError:
            versions[display_name] = None
    return versions


def get_ml_status() -> Dict[str, Any]:
    """Return the health and readiness status of the ML subsystem."""
    enabled = bool(getattr(settings, "ML_MODEL_ENABLED", False))
    model_dir = _get_configured_model_dir()
    framework_versions = _inspect_framework_versions()

    if not enabled:
        return {
            "enabled": False,
            "loaded": False,
            "models_available": [],
            "models_missing": ALL_EXPECTED_MODELS[:],
            "model_dir": str(model_dir),
            "framework_versions": framework_versions,
        }

    manager = get_model_manager()
    if manager is None:
        return {
            "enabled": True,
            "loaded": False,
            "models_available": [],
            "models_missing": ALL_EXPECTED_MODELS[:],
            "model_dir": str(model_dir),
            "framework_versions": framework_versions,
        }

    available = list(getattr(manager, "models", {}).keys())
    missing = [m for m in ALL_EXPECTED_MODELS if m not in available]
    return {
        "enabled": True,
        "loaded": bool(manager.is_model_available()),
        "models_available": available,
        "models_missing": missing,
        "model_dir": str(manager.model_dir),
        "framework_versions": framework_versions,
    }


def predict_irrigation_adjustment(features: Mapping[str, Any]) -> Dict[str, Any]:
    """Execute ML prediction via MLModelManager or return safe deterministic fallback."""
    if not getattr(settings, "ML_MODEL_ENABLED", False):
        return {
            "ml_adjustment_used": False,
            "irrigate_now": False,
            "irrigation_probability": 0.0,
            "irrigation_amount_mm": 0.0,
            "over_irrigation_risk": None,
            "under_irrigation_risk": None,
            "risk_category": "Low",
            "et0_forecast_mm": [0.0] * 7,
            "explanation_note": "ML model disabled in settings; using deterministic FAO-56 recommendation.",
        }

    manager = get_model_manager()
    if manager is None or not manager.is_model_available():
        return {
            "ml_adjustment_used": False,
            "irrigate_now": False,
            "irrigation_probability": 0.0,
            "irrigation_amount_mm": 0.0,
            "over_irrigation_risk": None,
            "under_irrigation_risk": None,
            "risk_category": "Low",
            "et0_forecast_mm": [0.0] * 7,
            "explanation_note": "ML model artifacts unavailable; using deterministic FAO-56 recommendation.",
        }

    try:
        return manager.predict(features)
    except Exception as exc:
        logger.warning("ML prediction failed: %s; falling back to deterministic FAO-56.", exc)
        return {
            "ml_adjustment_used": False,
            "irrigate_now": False,
            "irrigation_probability": 0.0,
            "irrigation_amount_mm": 0.0,
            "over_irrigation_risk": None,
            "under_irrigation_risk": None,
            "risk_category": "Low",
            "et0_forecast_mm": [0.0] * 7,
            "explanation_note": f"ML prediction failed ({exc}); using deterministic FAO-56 recommendation.",
        }
