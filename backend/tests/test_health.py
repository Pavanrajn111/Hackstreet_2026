import pytest
from fastapi.testclient import TestClient
from app.main import app

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


def test_crops_endpoint():
    response = client.get("/api/crops")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    crop_names = [c["name"] for c in data]
    assert "Tomato" in crop_names


def test_soils_endpoint():
    response = client.get("/api/soils")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    soil_names = [s["name"] for s in data]
    assert "Red Sandy Loam" in soil_names


def test_recommendation_endpoint():
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
        "pump_flow_rate_lpm": 120.0
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "irrigate_today" in data
    assert "irrigation_depth_mm" in data
    assert "water_volume_litres" in data
    assert "estimated_pump_runtime_minutes" in data
    assert "seven_day_schedule" in data
    assert len(data["seven_day_schedule"]) == 7
    assert len(data["seven_day_weather"]) == 7
