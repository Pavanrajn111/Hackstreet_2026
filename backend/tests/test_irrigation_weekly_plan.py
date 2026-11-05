import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_weekly_schedule_metrics_and_depletion():
    """Verify that seven_day_schedule includes detailed soil water balance metrics."""
    payload = {
        "farm_name": "Mysuru Test Estate",
        "latitude": 12.2958,
        "longitude": 76.6394,
        "crop": "Tomato",
        "soil_type": "Red Sandy Loam",
        "sowing_date": "2026-10-01",
        "farm_area_hectares": 1.0,
        "irrigation_method": "Drip Irrigation",
        "pump_flow_rate_lpm": 120.0,
    }
    response = client.post("/api/v1/recommend", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    schedule = data.get("seven_day_schedule", [])
    assert len(schedule) == 7

    for item in schedule:
        assert "date" in item
        assert "day" in item
        assert "action" in item
        assert "recommended_depth_mm" in item
        assert "water_volume_litres" in item
        assert "runtime_minutes" in item
        # New detailed soil water balance fields
        assert item.get("et0_mm") is not None
        assert item.get("etc_mm") is not None
        assert item.get("rainfall_mm") is not None
        assert item.get("simulated_depletion_mm") is not None
        assert item.get("raw_mm") is not None
        assert item.get("soil_water_status_pct") is not None
        assert 0.0 <= item["soil_water_status_pct"] <= 100.0
        assert item["simulated_depletion_mm"] >= 0.0


def test_hybrid_farm_layout_3d_spatial_pattern():
    """Verify that layout generation produces 3D canopy strata and spatial coordinates."""
    payload = {
        "main_crop": "Coconut",
        "intercrop": "Turmeric",
        "farm_area_hectares": 2.0,
        "planting_system": "Multi-Tier Intercropping",
    }
    response = client.post("/api/v1/hybrid/layout", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["main_crop"] == "Coconut"
    assert data["intercrop"] == "Turmeric"

    # Verify 3D spatial pattern canopy strata
    spatial_3d = data.get("spatial_pattern_3d")
    assert spatial_3d is not None
    assert "overstorey" in spatial_3d
    assert "understorey" in spatial_3d
    assert spatial_3d["overstorey"]["canopy_height_m"] > spatial_3d["understorey"]["canopy_height_m"]
    assert "spatial_root_separation_m" in spatial_3d

    # Verify 3D coordinate grid
    coords = data.get("spatial_grid_coordinates")
    assert coords is not None
    assert len(coords) >= 4
    for pt in coords:
        assert "x" in pt
        assert "y" in pt
        assert "z" in pt
        assert "type" in pt
        assert pt["type"] in ("main_crop", "intercrop")


def test_plan_extra_crops_robust_soil_matching_and_fallback():
    """Verify that crop planner returns valid viable plans even with compound soil types."""
    payload = {
        "ph": 6.8,
        "rainfall_mm_yr": 1100.0,
        "temp_c": 28.0,
        "soil": "Red Sandy Loam",
        "area_acre": 2.5,
        "boundary_m": 400.0,
        "shade_level": 0.4,
    }
    response = client.post("/api/ml/crop-planner", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    # Must contain layout variety (boundary / intercrop / understorey)
    layouts = {r["layout"] for r in data["recommendations"]}
    assert len(layouts) >= 2
