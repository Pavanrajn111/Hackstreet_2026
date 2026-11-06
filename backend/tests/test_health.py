import sys
import os
import pytest
from datetime import date, timedelta

# Ensure root workspace and backend are in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from app.main import app
from app.services.irrigation_engine import (
    calculate_taw_and_raw,
    calculate_effective_rainfall,
    determine_growth_stage,
    load_crops_catalog,
    load_soils_catalog,
)
from app.services.weather_service import fetch_weather_data, _generate_offline_baseline_weather
from ml.model_interface import MLModelManager

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "AGR002 Smart Irrigation API"
    assert data["status"] == "operational"


def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "sqlite_ready"


def test_crops_catalog():
    crops = load_crops_catalog()
    assert "Tomato" in crops
    assert "Rice" in crops
    assert "Wheat" in crops
    assert "Maize" in crops
    assert "Sugarcane" in crops
    assert "Cotton" in crops
    assert "Ragi" in crops
    assert "Groundnut" in crops

    response = client.get("/api/crops")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 8


def test_soils_catalog():
    soils = load_soils_catalog()
    assert "Red Sandy Loam" in soils
    assert "Clay / Black Soil" in soils
    assert "Alluvial Loam" in soils
    assert "Sandy Soil" in soils

    response = client.get("/api/soils")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 4


def test_farm_creation_and_listing():
    payload = {
        "farm_name": "Test Farm Mandya",
        "district": "Mandya",
        "latitude": 12.5218,
        "longitude": 76.8951,
        "crop": "Sugarcane",
        "soil_type": "Alluvial Loam",
        "sowing_date": "2026-06-01",
        "farm_area_hectares": 2.0,
        "irrigation_method": "Drip Irrigation",
        "last_irrigation_date": "2026-11-01",
        "pump_flow_rate_lpm": 150.0,
    }
    post_res = client.post("/api/farms", json=payload)
    assert post_res.status_code in [200, 201]
    farm_data = post_res.json()
    assert farm_data["id"] is not None
    assert farm_data["farm_name"] == "Test Farm Mandya"

    # Fetch list
    get_res = client.get("/api/farms")
    assert get_res.status_code == 200
    farms = get_res.json()
    assert any(f["farm_name"] == "Test Farm Mandya" for f in farms)

    # Fetch single farm
    single_res = client.get(f"/api/farms/{farm_data['id']}")
    assert single_res.status_code == 200
    assert single_res.json()["crop"] == "Sugarcane"


def test_valid_recommendation_matches_contract():
    payload = {
        "farm_name": "Bengaluru Green Fields",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "crop": "Tomato",
        "soil_type": "Red Sandy Loam",
        "sowing_date": "2026-10-15",
        "farm_area_hectares": 1.5,
        "irrigation_method": "Drip Irrigation",
        "last_irrigation_date": "2026-11-02",
        "pump_flow_rate_lpm": 120.0,
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Verify all contract fields
    assert "irrigate_today" in data
    assert isinstance(data["irrigate_today"], bool)
    assert "irrigation_depth_mm" in data
    assert "water_volume_litres" in data
    assert "estimated_pump_runtime_minutes" in data
    assert "current_growth_stage" in data
    assert "current_kc" in data
    assert "risk_status" in data
    assert "weather_source" in data
    assert "seven_day_schedule" in data
    assert len(data["seven_day_schedule"]) == 7
    assert "seven_day_weather" in data
    assert len(data["seven_day_weather"]) == 7


def test_invalid_coordinates_and_area():
    # Invalid latitude (> 90)
    bad_lat = {
        "farm_name": "Invalid Lat",
        "latitude": 99.9,
        "longitude": 77.5,
        "crop": "Tomato",
        "soil_type": "Red Sandy Loam",
        "sowing_date": "2026-10-15",
        "farm_area_hectares": 1.0,
    }
    res = client.post("/api/recommend", json=bad_lat)
    assert res.status_code == 422

    # Invalid area (<= 0)
    bad_area = {
        "farm_name": "Invalid Area",
        "latitude": 12.9,
        "longitude": 77.5,
        "crop": "Tomato",
        "soil_type": "Red Sandy Loam",
        "sowing_date": "2026-10-15",
        "farm_area_hectares": 0.0,
    }
    res = client.post("/api/recommend", json=bad_area)
    assert res.status_code == 422


def test_taw_raw_and_effective_rain_calculations():
    soil = {"field_capacity_pct": 22.0, "wilting_point_pct": 9.0}
    crop = {"root_depth_m": 0.7, "max_allowable_depletion": 0.40}

    # TAW = 1000 * (0.22 - 0.09) * 0.7 = 1000 * 0.13 * 0.7 = 91.0 mm
    # RAW = 0.40 * 91.0 = 36.4 mm
    taw, raw = calculate_taw_and_raw(soil, crop)
    assert pytest.approx(taw, 0.1) == 91.0
    assert pytest.approx(raw, 0.1) == 36.4

    # Effective rainfall
    assert calculate_effective_rainfall(2.0) == 0.0  # Under 3mm threshold
    assert calculate_effective_rainfall(10.0) == 5.5  # 10 * 0.75 - 2 = 5.5


def test_volumetric_conversion_and_pump_runtime():
    # 18.5 mm on 1.5 ha = 18.5 * 1.5 * 10000 = 277,500 Litres
    depth = 18.5
    area = 1.5
    vol = depth * area * 10000.0
    assert vol == 277500.0

    # Pump flow = 120 L/min -> 277500 / 120 = 2312.5 -> 2312 mins (or ~38.5 hrs across sub-plots)
    pump_flow = 120.0
    runtime = int(round(vol / pump_flow))
    assert runtime == 2312

    # High-capacity community borewell pump = 1200 L/min -> 231 mins
    high_flow = 1200.0
    assert int(round(vol / high_flow)) == 231


def test_dry_scenario_triggers_irrigation():
    # Last irrigated 10 days ago (dry scenario)
    ten_days_ago = (date.today() - timedelta(days=10)).isoformat()
    payload = {
        "farm_name": "Dry Field",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "crop": "Tomato",
        "soil_type": "Red Sandy Loam",
        "sowing_date": "2026-09-01",
        "farm_area_hectares": 1.0,
        "irrigation_method": "Drip Irrigation",
        "last_irrigation_date": ten_days_ago,
        "pump_flow_rate_lpm": 100.0,
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["irrigate_today"] is True
    assert data["irrigation_depth_mm"] > 0
    assert data["water_volume_litres"] > 0


def test_wet_scenario_skips_irrigation():
    # Irrigated yesterday (wet scenario)
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    payload = {
        "farm_name": "Wet Field",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "crop": "Tomato",
        "soil_type": "Clay / Black Soil",
        "sowing_date": "2026-10-25",
        "farm_area_hectares": 1.0,
        "irrigation_method": "Drip Irrigation",
        "last_irrigation_date": yesterday,
        "pump_flow_rate_lpm": 100.0,
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["irrigate_today"] is False
    assert data["irrigation_depth_mm"] == 0.0


def test_weather_cache_and_fallback():
    # Fetch live weather (or cached)
    data = fetch_weather_data(12.9716, 77.5946)
    assert "forecast" in data
    assert len(data["forecast"]) == 7
    assert data["source"] in ["open-meteo", "open-meteo-cache", "offline-baseline"]

    # Verify fallback generator
    baseline = _generate_offline_baseline_weather(12.9716, 77.5946)
    assert baseline["source"] == "offline-baseline"
    assert len(baseline["forecast"]) == 7


def test_ml_model_unavailable_fallback():
    manager = MLModelManager(model_dir="ml/models/non_existent")
    assert not manager.is_model_available()

    res = manager.predict({})
    assert res["ml_adjustment_used"] is False
    assert res["irrigate_now"] is False


def test_ml_model_invalid_output_handling():
    # Invalid model outputs must trigger the deterministic fallback.
    class CrazyModel:
        def predict(self, X):
            return [9999.0]

    manager = MLModelManager()
    manager.models = {
        "irrigation_classifier": CrazyModel(),
        "irrigation_amount": CrazyModel(),
        "over_irrigation": CrazyModel(),
        "under_irrigation": CrazyModel(),
    }
    assert manager.is_model_available()

    res = manager.predict({
        "crop": "tomato",
        "soil": "loam",
        "stage": "initial",
        "kc": 0.85,
        "depletion_mm": 18.0,
        "taw_mm": 90.0,
        "days_since_irrigation": 3,
        "et0": 4.2,
        "tmax": 30.0,
        "tmin": 20.0,
        "tmean": 25.0,
        "rainfall": 0.0,
        "humidity": 50.0,
        "wind": 2.5,
        "solar": 20.0,
        "latitude": 12.97,
        "longitude": 77.59,
    })
    assert res["ml_adjustment_used"] is False


def test_history_endpoints_and_audits():
    # Record log
    log_payload = {
        "farm_id": 1,
        "crop": "Tomato",
        "irrigation_date": str(date.today()),
        "depth_applied_mm": 15.0,
        "volume_applied_litres": 225000.0,
        "pump_runtime_minutes": 188,
        "was_recommended": True,
        "water_saved_litres": 112500.0,
        "notes": "Automated pytest log",
    }
    post_res = client.post("/api/history", json=log_payload)
    assert post_res.status_code in [200, 201]

    # Retrieve all
    get_res = client.get("/api/history")
    assert get_res.status_code == 200
    assert len(get_res.json()) > 0

    # Retrieve by farm_id
    farm_res = client.get("/api/history/1")
    assert farm_res.status_code == 200
    assert any(log["farm_id"] == 1 for log in farm_res.json())
