import sys
import os
import pytest
from unittest.mock import patch
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
    find_crop_info,
    find_soil_info,
    get_irrigation_efficiency,
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
    # Manager with non-existent path
    manager = MLModelManager(model_path="ml/models/non_existent.joblib")
    assert not manager.is_model_available()

    res = manager.predict_irrigation_adjustment({"days_after_sowing": 20})
    assert res["ml_adjustment_used"] is False
    assert res["adjusted_depth_mm"] is None


def test_ml_model_invalid_output_handling():
    # Fake mock model that returns crazy numbers (> 100 mm)
    class CrazyModel:
        def predict(self, X):
            return [9999.0]

    manager = MLModelManager()
    manager.model = CrazyModel()
    assert manager.is_model_available()

    res = manager.predict_irrigation_adjustment({
        "days_after_sowing": 20,
        "temp_max": 30.0,
        "temp_min": 20.0,
        "humidity_pct": 50.0,
        "rainfall_mm": 0.0,
        "crop_kc_baseline": 0.85,
    })
    # Must reject out-of-bounds output
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


def test_api_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "sqlite_ready"


def test_farm_crud_full_lifecycle():
    # 1. Create farm
    create_payload = {
        "farm_name": "Lifecycle Farm Mysuru",
        "district": "Mysuru",
        "latitude": 12.2958,
        "longitude": 76.6394,
        "crop": "Cotton",
        "soil_type": "Clay / Black Soil",
        "sowing_date": "2026-07-01",
        "farm_area_hectares": 2.5,
        "irrigation_method": "Drip Irrigation",
        "last_irrigation_date": "2026-11-01",
        "pump_flow_rate_lpm": 180.0,
    }
    create_res = client.post("/api/farms", json=create_payload)
    assert create_res.status_code == 201
    farm_id = create_res.json()["id"]

    # 2. Read single farm
    get_res = client.get(f"/api/farms/{farm_id}")
    assert get_res.status_code == 200
    assert get_res.json()["farm_name"] == "Lifecycle Farm Mysuru"

    # 3. Update farm
    update_payload = {
        "farm_name": "Updated Lifecycle Farm",
        "farm_area_hectares": 3.0,
        "pump_flow_rate_lpm": 200.0,
    }
    put_res = client.put(f"/api/farms/{farm_id}", json=update_payload)
    assert put_res.status_code == 200
    assert put_res.json()["farm_name"] == "Updated Lifecycle Farm"
    assert put_res.json()["farm_area_hectares"] == 3.0

    # 4. Generate recommendation by farm ID
    rec_res = client.get(f"/api/recommend/{farm_id}")
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert "irrigate_today" in rec_data
    assert rec_data["water_volume_litres"] >= 0

    # 5. Delete farm
    del_res = client.delete(f"/api/farms/{farm_id}")
    assert del_res.status_code == 204

    # 6. Verify 404 after deletion
    get_after_del = client.get(f"/api/farms/{farm_id}")
    assert get_after_del.status_code == 404
    rec_after_del = client.get(f"/api/recommend/{farm_id}")
    assert rec_after_del.status_code == 404


def test_crops_and_soils_single_endpoints():
    # Crop endpoints
    res_crop = client.get("/api/crops/tomato")
    assert res_crop.status_code == 200
    assert res_crop.json()["name"] == "Tomato"

    res_crop_404 = client.get("/api/crops/nonexistent-crop-xyz")
    assert res_crop_404.status_code == 404

    # Soil endpoints
    res_soil = client.get("/api/soils/red-sandy-loam")
    assert res_soil.status_code == 200
    assert "Red Sandy Loam" in res_soil.json()["name"]

    res_soil_404 = client.get("/api/soils/nonexistent-soil-xyz")
    assert res_soil_404.status_code == 404


def test_zero_and_missing_pump_capacity_safety():
    # When pump flow rate is explicitly 0.0 LPM
    payload = {
        "farm_name": "Zero Pump Farm",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "crop": "Tomato",
        "soil_type": "Red Sandy Loam",
        "sowing_date": "2026-09-01",
        "farm_area_hectares": 1.0,
        "irrigation_method": "Drip Irrigation",
        "last_irrigation_date": "2026-10-20",
        "pump_flow_rate_lpm": 0.0,
    }
    res = client.post("/api/recommend", json=payload)
    assert res.status_code == 200
    data = res.json()
    # Must not divide by zero and runtime must be 0
    assert data["estimated_pump_runtime_minutes"] == 0
    assert data["water_volume_litres"] > 0
    assert data["water_savings"]["pump_hours_saved"] == 0.0


def test_case_insensitive_crop_and_soil_resolution():
    crops = load_crops_catalog()
    soils = load_soils_catalog()

    # Case insensitive crop resolution
    c1 = find_crop_info("rice", crops)
    assert c1["name"] == "Rice"
    c2 = find_crop_info("SUGARCANE", crops)
    assert c2["name"] == "Sugarcane"

    # Soil resolution
    s1 = find_soil_info("clay / black soil", soils)
    assert "Clay" in s1["name"]
    s2 = find_soil_info("sandy-soil", soils)
    assert s2["name"] == "Sandy Soil"


def test_growth_stage_date_edge_cases():
    crops = load_crops_catalog()
    tomato = crops["Tomato"]

    # Future sowing date
    tomorrow = date.today() + timedelta(days=2)
    stage_fut, kc_fut = determine_growth_stage(tomato, tomorrow)
    assert "Initial" in stage_fut
    assert kc_fut > 0

    # None sowing date
    stage_none, kc_none = determine_growth_stage(tomato, None)
    assert "Initial" in stage_none

    # Very old sowing date (> 150 days ago)
    old_date = date.today() - timedelta(days=160)
    stage_old, kc_old = determine_growth_stage(tomato, old_date)
    assert "Late" in stage_old


def test_recommendation_with_invalid_farm_id():
    payload = {
        "farm_id": 99999999,
        "farm_name": "Missing Farm ID",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "crop": "Tomato",
        "soil_type": "Red Sandy Loam",
        "sowing_date": "2026-10-15",
        "farm_area_hectares": 1.0,
        "irrigation_method": "Drip Irrigation",
    }
    res = client.post("/api/recommend", json=payload)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_history_date_filtering_and_farm_validation():
    # 1. Reject invalid farm_id on log creation
    bad_log = {
        "farm_id": 99999999,
        "crop": "Tomato",
        "depth_applied_mm": 10.0,
        "volume_applied_litres": 100000.0,
    }
    res_bad = client.post("/api/history", json=bad_log)
    assert res_bad.status_code == 404

    # 2. Date filtering
    today_str = str(date.today())
    past_str = str(date.today() - timedelta(days=30))
    res_filtered = client.get(f"/api/history?start_date={past_str}&end_date={today_str}")
    assert res_filtered.status_code == 200
    assert isinstance(res_filtered.json(), list)


def test_weather_network_failure_resilience():
    # Mock httpx failure and verify fallback
    with patch("httpx.get", side_effect=Exception("Simulated connection timeout")):
        weather = fetch_weather_data(13.0, 77.0)
        assert "forecast" in weather
        assert len(weather["forecast"]) == 7
        assert weather["source"] in ["open-meteo-cache", "open-meteo-stale-cache", "offline-baseline"]
