"""AGR002 smart-irrigation model interface.

This module owns the trained ML inference bundle shipped with the project. It loads
all serialized XGBoost artifacts and the feature manifest once at import time,
validates the expected feature ordering, and exposes a safe fallback so the
FAO-56 agronomic engine remains the deterministic source of truth whenever the ML
bundle is absent or unusable.
"""

from __future__ import annotations

import json
import logging
import math
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional

logger = logging.getLogger(__name__)

try:
    import joblib
except ImportError:  # pragma: no cover - handled at runtime by the fallback path.
    joblib = None

try:
    import numpy as np
    import pandas as pd
except ImportError:  # pragma: no cover
    np = None
    pd = None

try:
    import xgboost as xgb
except ImportError:  # pragma: no cover - optional at runtime in fallback mode.
    xgb = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_DIR = PROJECT_ROOT / "ml" / "models"


def _resolve_model_dir() -> Path:
    candidates = [
        DEFAULT_MODEL_DIR,
        DEFAULT_MODEL_DIR / "models",
    ]
    for candidate in candidates:
        if candidate.exists():
            if any(candidate.glob("*.joblib")) or (candidate / "features.json").exists():
                return candidate
    return DEFAULT_MODEL_DIR


MODEL_DIR = _resolve_model_dir()
FEATURES_MANIFEST = MODEL_DIR / "features.json"

EXPECTED_FEATURE_NAMES: List[str] = [
    "crop",
    "soil",
    "stage",
    "kc",
    "depletion_mm",
    "taw_mm",
    "days_since_irrigation",
    "et0",
    "tmax",
    "tmin",
    "tmean",
    "rainfall",
    "humidity",
    "wind",
    "solar",
    "latitude",
    "longitude",
]

ET0_FEATURE_NAMES: List[str] = [
    "tmax",
    "tmin",
    "tmean",
    "rainfall",
    "humidity",
    "wind",
    "solar",
    "latitude",
    "longitude",
    "month_sin",
    "month_cos",
]

MODEL_FILES = {
    "irrigation_classifier": "irrigation_classifier.joblib",
    "irrigation_amount": "irrigation_amount.joblib",
    "over_irrigation": "over_irrigation.joblib",
    "under_irrigation": "under_irrigation.joblib",
    "et0_day_1": "et0_day_1.joblib",
    "et0_day_2": "et0_day_2.joblib",
    "et0_day_3": "et0_day_3.joblib",
    "et0_day_4": "et0_day_4.joblib",
    "et0_day_5": "et0_day_5.joblib",
    "et0_day_6": "et0_day_6.joblib",
    "et0_day_7": "et0_day_7.joblib",
}


def _fallback_response(message: str) -> Dict[str, Any]:
    return {
        "ml_adjustment_used": False,
        "irrigate_now": False,
        "irrigation_probability": 0.0,
        "irrigation_amount_mm": 0.0,
        "over_irrigation_risk": None,
        "under_irrigation_risk": None,
        "risk_category": "Low",
        "et0_forecast_mm": [0.0] * 7,
        "explanation_note": message,
    }


class MLModelManager:
    """Loads and validates the trained irrigation model bundle once per backend lifespan."""

    def __init__(self, model_dir: Optional[Path | str] = None):
        self.model_dir = Path(model_dir) if model_dir else MODEL_DIR
        self.model_dir = self.model_dir.resolve()
        self.models: Dict[str, Any] = {}
        self.feature_names: List[str] = []
        self._load_feature_manifest()
        self._load_all_models()

    def _load_feature_manifest(self) -> None:
        manifest_path = self.model_dir / "features.json"
        if not manifest_path.exists():
            logger.info("Model feature manifest not found at %s; ML fallback will remain active.", manifest_path)
            return

        try:
            with manifest_path.open("r", encoding="utf-8") as handle:
                loaded = json.load(handle)
            if isinstance(loaded, list):
                self.feature_names = [str(item) for item in loaded]
            else:
                self.feature_names = EXPECTED_FEATURE_NAMES[:]
        except Exception as exc:  # pragma: no cover - defensive runtime guard.
            logger.warning("Could not load ML feature manifest: %s. Using the known contract fallback.", exc)
            self.feature_names = EXPECTED_FEATURE_NAMES[:]

    def _load_all_models(self) -> None:
        if joblib is None:
            logger.warning("joblib is unavailable; ML inference is disabled.")
            return

        missing_models: List[str] = []
        for key, file_name in MODEL_FILES.items():
            path = self.model_dir / file_name
            if not path.exists():
                missing_models.append(key)
                continue

            try:
                self.models[key] = joblib.load(path)
                version = getattr(self.models[key], "__version__", None)
                version_str = f" (v{version})" if version else ""
                logger.info("Loaded ML artifact %s%s from %s", key, version_str, path)
            except Exception as exc:  # pragma: no cover - runtime compatibility can vary by environment.
                logger.warning("Failed to load %s from %s: %s", key, path, exc)
                self.models.pop(key, None)

        if missing_models:
            logger.info(
                "ML artifacts missing in %s (%d/%d): %s. Running in fallback mode.",
                self.model_dir,
                len(missing_models),
                len(MODEL_FILES),
                ", ".join(missing_models),
            )

    def is_model_available(self) -> bool:
        required = [
            "irrigation_classifier",
            "irrigation_amount",
            "over_irrigation",
            "under_irrigation",
        ]
        return all(name in self.models for name in required)

    def _normalise_feature_mapping(self, raw_features: Mapping[str, Any]) -> Dict[str, Any]:
        normalised: Dict[str, Any] = dict(raw_features)

        if "soil_type" in normalised and "soil" not in normalised:
            normalised["soil"] = str(normalised["soil_type"]).strip()
        if "soil" in normalised and isinstance(normalised["soil"], str):
            normalised["soil"] = normalised["soil"].strip().lower()

        if "crop" in normalised and isinstance(normalised["crop"], str):
            normalised["crop"] = normalised["crop"].strip().lower()

        if "stage" in normalised and isinstance(normalised["stage"], str):
            stage_key = normalised["stage"].strip().lower()
            stage_aliases = {
                "initial / establishment": "initial",
                "initial": "initial",
                "vegetative / flowering": "middle",
                "vegetative": "middle",
                "flowering": "middle",
                "mid-season / yield formation": "middle",
                "middle": "middle",
                "late / ripening": "late",
                "late": "late",
                "maturity": "late",
            }
            normalised["stage"] = stage_aliases.get(stage_key, stage_key)

        if "tmean" not in normalised and "tmax" in normalised and "tmin" in normalised:
            normalised["tmean"] = (float(normalised["tmax"]) + float(normalised["tmin"])) / 2.0

        if "month_sin" not in normalised or "month_cos" not in normalised:
            month = int(date.today().month)
            month_angle = (month - 1) * (2 * math.pi / 12.0)
            normalised["month_sin"] = math.sin(month_angle)
            normalised["month_cos"] = math.cos(month_angle)

        return normalised

    def _prepare_classifier_features(self, raw_features: Mapping[str, Any]) -> pd.DataFrame:
        if pd is None:
            raise RuntimeError("pandas is required for ML feature preparation.")

        normalised = self._normalise_feature_mapping(raw_features)
        for key in EXPECTED_FEATURE_NAMES:
            if key not in normalised:
                raise KeyError(f"Missing required feature '{key}' for the ML model bundle.")

        ordered = {key: normalised[key] for key in EXPECTED_FEATURE_NAMES}
        frame = pd.DataFrame([ordered], columns=EXPECTED_FEATURE_NAMES)

        # Keep the original training contract: crop/soil/stage are strings and the rest remain numeric.
        frame["crop"] = frame["crop"].astype(str)
        frame["soil"] = frame["soil"].astype(str)
        frame["stage"] = frame["stage"].astype(str)
        for numeric_key in [
            "kc",
            "depletion_mm",
            "taw_mm",
            "days_since_irrigation",
            "et0",
            "tmax",
            "tmin",
            "tmean",
            "rainfall",
            "humidity",
            "wind",
            "solar",
            "latitude",
            "longitude",
        ]:
            frame[numeric_key] = pd.to_numeric(frame[numeric_key], errors="coerce")

        return frame

    def _prepare_et0_features(self, raw_features: Mapping[str, Any]) -> pd.DataFrame:
        if pd is None:
            raise RuntimeError("pandas is required for ET0 forecasting.")

        normalised = self._normalise_feature_mapping(raw_features)
        for key in ET0_FEATURE_NAMES:
            if key not in normalised:
                raise KeyError(f"Missing ET0 feature '{key}'.")

        ordered = {key: normalised[key] for key in ET0_FEATURE_NAMES}
        frame = pd.DataFrame([ordered], columns=ET0_FEATURE_NAMES)
        for numeric_key in [
            "tmax",
            "tmin",
            "tmean",
            "rainfall",
            "humidity",
            "wind",
            "solar",
            "latitude",
            "longitude",
            "month_sin",
            "month_cos",
        ]:
            frame[numeric_key] = pd.to_numeric(frame[numeric_key], errors="coerce")
        return frame

    def _predict_with_booster(self, model_name: str, features_frame: pd.DataFrame, model_kind: str) -> float:
        if model_name not in self.models:
            raise ValueError(f"Model '{model_name}' is not loaded.")

        model = self.models[model_name]

        # Prefer standard scikit-learn / XGBoost estimator interfaces first
        if model_kind == "classifier" and hasattr(model, "predict_proba"):
            try:
                prediction = model.predict_proba(features_frame)
                values = np.asarray(prediction, dtype=float)
                if values.ndim > 1 and values.shape[1] > 1:
                    values = values[:, 1]
                return float(np.asarray(values, dtype=float).ravel()[0]) if values.size else math.nan
            except Exception:
                pass

        if model_kind != "classifier" and hasattr(model, "predict"):
            try:
                prediction = model.predict(features_frame)
                values = np.asarray(prediction, dtype=float).ravel()
                return float(values[0]) if len(values) and math.isfinite(values[0]) else math.nan
            except Exception:
                pass

        # Handle pipelines with preprocessor + estimator
        named_steps = getattr(model, "named_steps", None)
        if named_steps is not None and "preprocessor" in named_steps:
            preprocessor = named_steps["preprocessor"]
            transformed = preprocessor.transform(features_frame)
            estimator_name = "classifier" if model_kind == "classifier" else "regressor"
            if estimator_name in named_steps:
                estimator = named_steps[estimator_name]
                if model_kind == "classifier" and hasattr(estimator, "predict_proba"):
                    prediction = estimator.predict_proba(transformed)
                    values = np.asarray(prediction, dtype=float)
                    if values.ndim > 1 and values.shape[1] > 1:
                        values = values[:, 1]
                    return float(np.asarray(values, dtype=float).ravel()[0]) if values.size else math.nan
                if hasattr(estimator, "predict"):
                    prediction = estimator.predict(transformed)
                    values = np.asarray(prediction, dtype=float).ravel()
                    return float(values[0]) if len(values) else math.nan

                # Fall back to Booster if estimator wraps a Booster
                booster = getattr(estimator, "_Booster", estimator)
                if xgb is not None and hasattr(booster, "predict"):
                    feature_names = None
                    if hasattr(preprocessor, "get_feature_names_out"):
                        feature_names = list(preprocessor.get_feature_names_out())
                    dmatrix = xgb.DMatrix(transformed, feature_names=feature_names)
                    prediction = booster.predict(dmatrix)
                    values = np.asarray(prediction, dtype=float).ravel()
                    return float(values[0]) if len(values) else math.nan

        # Raw Booster fallback
        booster = getattr(model, "_Booster", None)
        if booster is not None:
            if xgb is None:
                raise RuntimeError("xgboost is not installed; raw Booster inference is unavailable.")
            feature_names = list(getattr(model, "feature_names_in_", features_frame.columns))
            dmatrix = xgb.DMatrix(features_frame, feature_names=feature_names)
            prediction = booster.predict(dmatrix)
            values = np.asarray(prediction, dtype=float).ravel()
            return float(values[0]) if len(values) else math.nan

        if hasattr(model, "predict"):
            prediction = model.predict(features_frame)
            values = np.asarray(prediction, dtype=float).ravel()
            return float(values[0]) if len(values) else math.nan

        raise ValueError(f"Model '{model_name}' cannot be used for prediction in this runtime.")

    def predict(self, features: Mapping[str, Any]) -> Dict[str, Any]:
        if not self.is_model_available():
            return _fallback_response("ML artifact bundle is unavailable; using the deterministic FAO-56 recommendation.")

        try:
            classifier_features = self._prepare_classifier_features(features)
            classifier_probability = self._predict_with_booster("irrigation_classifier", classifier_features, "classifier")
            irrigation_amount_mm = self._predict_with_booster("irrigation_amount", classifier_features, "regressor")
            over_irrigation_risk = self._predict_with_booster("over_irrigation", classifier_features, "classifier")
            under_irrigation_risk = self._predict_with_booster("under_irrigation", classifier_features, "classifier")

            irrigation_required = bool(classifier_probability >= 0.5)
            finite_amount = float(irrigation_amount_mm) if math.isfinite(float(irrigation_amount_mm)) else 0.0
            irrigation_amount_mm = max(0.0, finite_amount)
            over_irrigation_risk = max(0.0, min(1.0, float(over_irrigation_risk)))
            under_irrigation_risk = max(0.0, min(1.0, float(under_irrigation_risk)))

            risk_category = "Low"
            if over_irrigation_risk >= 0.65 or under_irrigation_risk >= 0.65:
                risk_category = "High"
            elif over_irrigation_risk >= 0.45 or under_irrigation_risk >= 0.45:
                risk_category = "Moderate"

            et0_values: List[float] = []
            for day_index in range(1, 8):
                et0_model_name = f"et0_day_{day_index}"
                if et0_model_name not in self.models:
                    break
                forecast_date = date.today() + timedelta(days=day_index)
                month_angle = (forecast_date.month - 1) * (2 * math.pi / 12.0)
                et0_features = {
                    "tmax": features.get("tmax", 0.0),
                    "tmin": features.get("tmin", 0.0),
                    "tmean": features.get("tmean", 0.0),
                    "rainfall": features.get("rainfall", 0.0),
                    "humidity": features.get("humidity", 0.0),
                    "wind": features.get("wind", 0.0),
                    "solar": features.get("solar", 0.0),
                    "latitude": features.get("latitude", 0.0),
                    "longitude": features.get("longitude", 0.0),
                    "month_sin": math.sin(month_angle),
                    "month_cos": math.cos(month_angle),
                }
                et0_frame = self._prepare_et0_features(et0_features)
                et0_value = self._predict_with_booster(et0_model_name, et0_frame, "regressor")
                safe_et0 = float(et0_value) if math.isfinite(float(et0_value)) else 0.0
                et0_values.append(max(0.0, safe_et0))

            return {
                "ml_adjustment_used": True,
                "irrigate_now": irrigation_required,
                "irrigation_probability": float(classifier_probability),
                "irrigation_amount_mm": irrigation_amount_mm,
                "over_irrigation_risk": over_irrigation_risk,
                "under_irrigation_risk": under_irrigation_risk,
                "risk_category": risk_category,
                "et0_forecast_mm": et0_values or [0.0] * 7,
                "explanation_note": (
                    "ML model output is guiding the FAO-56 recommendation. "
                    "The agronomic engine remains the baseline source and the model only adjusts the confidence signal."
                ),
            }
        except Exception as exc:
            logger.warning("ML classification/regression failed: %s. Falling back to deterministic irrigation logic.", exc)
            return _fallback_response(f"ML inference failed ({exc}); using the deterministic FAO-56 calculation.")


_lazy_model_manager: Optional[MLModelManager] = None


def get_default_model_manager() -> MLModelManager:
    global _lazy_model_manager
    if _lazy_model_manager is None:
        _lazy_model_manager = MLModelManager()
    return _lazy_model_manager


class _LazyManagerProxy:
    def __getattr__(self, name: str) -> Any:
        return getattr(get_default_model_manager(), name)


model_manager = _LazyManagerProxy()


def predict_irrigation_adjustment(features: Mapping[str, Any]) -> Dict[str, Any]:
    """Convenience wrapper for backend imports."""
    return get_default_model_manager().predict(features)
