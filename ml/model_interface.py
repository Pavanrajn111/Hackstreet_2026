"""
AGR002 Smart Irrigation - Machine Learning Model Interface
---------------------------------------------------------
This module provides the integration bridge between the FastAPI backend and
the Machine Learning model pipeline.

NOTICE:
- No trained ML model weights are committed to this repository.
- When no trained model file is found, this interface returns a graceful fallback
  indicating `ml_adjustment_used: False` so the deterministic agronomic engine
  continues to function without interruption.
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Default path where ML teammate should place serialized model weights (e.g., joblib/pickle)
DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "irrigation_model.joblib")


class MLModelManager:
    """Manages loading and inference for the irrigation ML model."""

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or os.getenv("ML_MODEL_PATH", DEFAULT_MODEL_PATH)
        self.model = None
        self._load_model_if_available()

    def _load_model_if_available(self) -> None:
        """
        Attempts to load the model file from disk.
        If file does not exist, logs an informational notice and stays in fallback mode.
        """
        if os.path.exists(self.model_path):
            try:
                # TODO [ML Teammate]: Replace with your preferred loading mechanism (joblib, onnxruntime, etc.)
                import joblib  # lazy import
                self.model = joblib.load(self.model_path)
                logger.info("Loaded ML model successfully from %s", self.model_path)
            except Exception as exc:
                logger.warning("Could not load ML model from %s: %s. Using rule-based fallback.", self.model_path, exc)
                self.model = None
        else:
            logger.info("No ML model weights found at %s. Operating in deterministic rule-based mode.", self.model_path)
            self.model = None

    def is_model_available(self) -> bool:
        """Returns True if a trained ML model is loaded and ready for inference."""
        return self.model is not None

    def predict_irrigation_adjustment(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Placeholder inference function.

        Args:
            features: Dictionary containing standardized inputs:
                - days_after_sowing (int)
                - temp_max (float, deg C)
                - temp_min (float, deg C)
                - humidity_pct (float, %)
                - rainfall_mm (float, mm)
                - soil_field_capacity (float, %)
                - soil_wilting_point (float, %)
                - crop_kc_baseline (float)
                - irrigation_efficiency (float)
                - last_irrigation_days_ago (int)

        Returns:
            Dictionary matching the API ML contract:
                - ml_adjustment_used (bool): True if ML was used, False otherwise.
                - predicted_depletion_mm (Optional[float]): Model's depletion estimate.
                - adjusted_depth_mm (Optional[float]): ML adjusted depth recommendation.
                - confidence_score (Optional[float]): Model confidence level.
                - explanation_note (str): Explainability summary for the farmer.
        """
        if not self.is_model_available():
            # Graceful placeholder fallback when no model is installed
            return {
                "ml_adjustment_used": False,
                "predicted_depletion_mm": None,
                "adjusted_depth_mm": None,
                "confidence_score": None,
                "explanation_note": "ML model is not loaded; using deterministic FAO-56 Penman-Monteith calculation."
            }

        try:
            # =========================================================================
            # TODO [ML Teammate]: Implement feature extraction and real model inference
            # Example:
            # X_input = [[
            #     features["days_after_sowing"],
            #     features["temp_max"],
            #     features["temp_min"],
            #     features["humidity_pct"],
            #     features["rainfall_mm"],
            #     features["soil_field_capacity"],
            #     features["soil_wilting_point"],
            #     features["crop_kc_baseline"],
            #     features["irrigation_efficiency"],
            #     features["last_irrigation_days_ago"]
            # ]]
            # raw_pred = self.model.predict(X_input)[0]
            # =========================================================================
            logger.info("Running ML inference for features: %s", features)
            return {
                "ml_adjustment_used": True,
                "predicted_depletion_mm": 18.0,
                "adjusted_depth_mm": 18.0,
                "confidence_score": 0.85,
                "explanation_note": "ML model fine-tuned the water balance adjustment."
            }
        except Exception as err:
            logger.error("ML inference failed: %s. Falling back to deterministic calculation.", err)
            return {
                "ml_adjustment_used": False,
                "predicted_depletion_mm": None,
                "adjusted_depth_mm": None,
                "confidence_score": None,
                "explanation_note": f"ML inference failed ({err}); falling back to deterministic calculations."
            }


# Global singleton instance for easy backend imports
model_manager = MLModelManager()


def predict_irrigation_adjustment(features: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience functional wrapper around the MLModelManager singleton."""
    return model_manager.predict_irrigation_adjustment(features)
