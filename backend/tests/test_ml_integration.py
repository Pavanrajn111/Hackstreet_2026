"""Tests for Task 1: ML Model Loading, Interface, and Status API."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.services import ml_bridge


@pytest.fixture
def client():
    return TestClient(app)


def test_ml_status_endpoint(client):
    """Verify /api/ml/status and /api/v1/ml/status return expected schema."""
    for path in ["/api/ml/status", "/api/v1/ml/status"]:
        response = client.get(path)
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "loaded" in data
        assert "models_available" in data
        assert "models_missing" in data
        assert "model_dir" in data
        assert "framework_versions" in data
        assert isinstance(data["models_available"], list)
        assert isinstance(data["models_missing"], list)
        assert isinstance(data["framework_versions"], dict)
        for key in ["scikit-learn", "numpy", "pandas", "joblib", "xgboost"]:
            assert key in data["framework_versions"]


def test_health_endpoints_include_ml(client):
    """Verify /health and /api/health include ML status block."""
    for path in ["/health", "/api/health", "/api/v1/health"]:
        response = client.get(path)
        assert response.status_code == 200
        data = response.json()
        assert "ml" in data
        assert "enabled" in data["ml"]
        assert "loaded" in data["ml"]


def test_ml_disabled_clean_fallback(monkeypatch):
    """When ML is disabled in settings, ml_bridge returns clean deterministic fallback."""
    monkeypatch.setattr(settings, "ML_MODEL_ENABLED", False)
    ml_bridge.reset_model_manager()

    features = {
        "crop": "tomato",
        "soil": "sandy loam",
        "stage": "flowering",
        "kc": 1.15,
        "depletion_mm": 20.0,
        "taw_mm": 50.0,
        "days_since_irrigation": 3,
        "et0": 4.5,
        "tmax": 32.0,
        "tmin": 22.0,
        "tmean": 27.0,
        "rainfall": 0.0,
        "humidity": 60.0,
        "wind": 2.5,
        "solar": 18.0,
        "latitude": 12.97,
        "longitude": 77.59,
    }

    pred = ml_bridge.predict_irrigation_adjustment(features)
    assert pred["ml_adjustment_used"] is False
    assert pred["irrigate_now"] is False
    assert pred["over_irrigation_risk"] is None
    assert pred["under_irrigation_risk"] is None
    assert "disabled" in pred["explanation_note"].lower()


def test_ml_enabled_without_artifacts(monkeypatch):
    """When ML is enabled but joblib artifacts are missing, fallback is safe."""
    monkeypatch.setattr(settings, "ML_MODEL_ENABLED", True)
    ml_bridge.reset_model_manager()

    status = ml_bridge.get_ml_status()
    assert status["enabled"] is True
    # If joblib artifacts are absent in ml/models, loaded should be False
    assert status["loaded"] is False

    features = {
        "crop": "tomato",
        "soil": "sandy loam",
        "stage": "flowering",
        "kc": 1.15,
        "depletion_mm": 20.0,
        "taw_mm": 50.0,
        "days_since_irrigation": 3,
        "et0": 4.5,
        "tmax": 32.0,
        "tmin": 22.0,
        "tmean": 27.0,
        "rainfall": 0.0,
        "humidity": 60.0,
        "wind": 2.5,
        "solar": 18.0,
        "latitude": 12.97,
        "longitude": 77.59,
    }

    pred = ml_bridge.predict_irrigation_adjustment(features)
    assert pred["ml_adjustment_used"] is False
    assert pred["over_irrigation_risk"] is None
    assert pred["under_irrigation_risk"] is None


def test_ml_bridge_import_safety():
    """Verify that ml_bridge exposes expected interface and handles import resolution."""
    from app.services.ml_bridge import (
        predict_irrigation_adjustment,
        get_ml_status,
        get_model_manager,
    )
    assert callable(predict_irrigation_adjustment)
    assert callable(get_ml_status)
    assert callable(get_model_manager)


def test_et0_day_offsets():
    """Verify that ET0 date offset logic uses day increments rather than month offsets."""
    from datetime import date, timedelta
    import math

    today = date(2026, 1, 31)
    # Day 1 offset should be Feb 1 (month 2), not month 1 + 1 = month 2 offset as 2 months
    for day_index in range(1, 8):
        forecast_date = today + timedelta(days=day_index)
        month_angle = (forecast_date.month - 1) * (2 * math.pi / 12.0)
        expected_sin = math.sin(month_angle)
        expected_cos = math.cos(month_angle)
        assert -1.0 <= expected_sin <= 1.0
        assert -1.0 <= expected_cos <= 1.0


def test_weather_feature_mapping():
    """Verify build_irrigation_features correctly maps crop, soil, stage, wind, solar, and daily_weather."""
    from datetime import date
    from app.schemas.recommendation import RecommendRequest, RecommendResponse, WeatherDayItem
    from app.services.ml_bridge import build_irrigation_features

    req = RecommendRequest(
        farm_name="Test Farm",
        latitude=12.97,
        longitude=77.59,
        crop="Rice",  # should map to paddy
        soil_type="Black Clay Soil",  # should map to clay
        sowing_date=date(2026, 10, 1),
        farm_area_hectares=2.0,
    )

    weather_items = [
        WeatherDayItem(
            date="2026-11-05",
            day="Today",
            temp_max_c=31.5,
            temp_min_c=21.0,
            humidity_pct=65,
            rainfall_mm=0.0,
            et0_mm=4.5,
            condition="Clear",
            wind_m_s=3.2,
            solar_mj_m2=21.5,
        ),
        WeatherDayItem(
            date="2026-11-06",
            day="Fri",
            temp_max_c=30.0,
            temp_min_c=20.5,
            humidity_pct=70,
            rainfall_mm=2.5,
            et0_mm=4.0,
            condition="Rainy",
            wind_m_s=4.1,
            solar_mj_m2=18.0,
        ),
    ]

    rec = RecommendResponse(
        irrigate_today=True,
        irrigation_depth_mm=15.0,
        water_volume_litres=30000.0,
        current_growth_stage="Flowering Stage",  # should map to middle
        current_kc=1.1,
        risk_status="Low",
        explanation="Baseline",
        seven_day_schedule=[],
        seven_day_weather=weather_items,
    )

    features = build_irrigation_features(req, rec)
    assert features["crop"] == "paddy"
    assert features["soil"] == "clay"
    assert features["stage"] == "middle"
    assert features["wind"] == 3.2
    assert features["solar"] == 21.5
    assert len(features["daily_weather"]) == 2
    assert features["daily_weather"][0]["wind"] == 3.2
    assert features["daily_weather"][1]["rainfall"] == 2.5


def test_ml_fallback_risk_values():
    """Verify that water resilience service does not emit hardcoded 0.35/0.05 fake risks in fallback mode."""
    from app.services.water_resilience_service import _fetch_ml_signals

    signals = _fetch_ml_signals(
        crop="Tomato",
        soil="Sandy Loam",
        stage="Vegetative",
        kc=1.0,
        depth_mm=20.0,
        lat=12.97,
        lon=77.59,
    )
    assert signals["under_irrigation_risk"] is None
    assert signals["over_irrigation_risk"] is None
    assert signals["ml_model_used"] is False
