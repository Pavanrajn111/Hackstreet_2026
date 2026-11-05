"""
Tests for ML Extra Crop Planner & Market Price Forecasting APIs
----------------------------------------------------------------
Verifies:
  - Random Forest 22-class crop suitability predictions
  - 15-year DCF multi-tier extra crop planning
  - Price forecasts and historical data for supported commodities
  - Integration with hybrid recommendation endpoint
  - Resilience against missing/edge inputs
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.crop_planner_service import (
    predict_crop_suitability,
    plan_extra_crops,
    get_commodity_price_forecast,
    get_all_price_forecasts,
    enrich_candidate_crop_with_ml,
)

client = TestClient(app)


def test_ml_crop_suitability_endpoint():
    """Verify Random Forest crop suitability endpoint returns probabilities and top rankings."""
    payload = {
        "n": 60.0,
        "p": 45.0,
        "k": 40.0,
        "temperature": 27.5,
        "humidity": 75.0,
        "ph": 6.5,
        "rainfall": 140.0,
        "top_k": 5,
    }
    response = client.post("/api/ml/crop-suitability", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert "recommended_crop" in data
    assert isinstance(data["confidence"], float)
    assert len(data["top_predictions"]) == 5
    assert data["top_predictions"][0]["rank"] == 1
    assert data["top_predictions"][0]["probability"] >= data["top_predictions"][1]["probability"]
    assert "all_probabilities" in data
    assert len(data["all_probabilities"]) >= 3


def test_ml_crop_planner_endpoint():
    """Verify multi-layout companion crop planner calculates layout, plants, NPV, and water demand."""
    payload = {
        "ph": 6.5,
        "rainfall_mm_yr": 1400.0,
        "temp_c": 28.0,
        "humidity": 75.0,
        "n": 60.0,
        "p": 45.0,
        "k": 40.0,
        "soil": "Red",
        "shade_level": 0.3,
        "boundary_m": 360.0,
        "area_acre": 2.0,
        "intercrop_share": 0.15,
        "years": 15,
        "top": 8,
    }
    response = client.post("/api/ml/crop-planner", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert "recommendations" in data
    assert len(data["recommendations"]) > 0

    first = data["recommendations"][0]
    assert "crop" in first
    assert "layout" in first
    assert first["layout"] in ("boundary", "border", "intercrop", "understorey")
    assert first["fit"] >= 0.45
    assert first["plants"] > 0
    assert "npv_total" in first
    assert "water_l_day" in first
    assert "notes" in first

    # Check top ML general crops returned alongside planner
    assert "top_ml_general_crops" in data
    assert len(data["top_ml_general_crops"]) > 0


def test_hybrid_ml_planner_endpoint_alias():
    """Verify /api/hybrid/ml-planner alias returns identical structured response."""
    payload = {
        "ph": 6.0,
        "rainfall_mm_yr": 1200.0,
        "temp_c": 29.0,
        "soil": "Laterite",
        "area_acre": 3.0,
        "boundary_m": 450.0,
    }
    response = client.post("/api/hybrid/ml-planner", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0


def test_price_forecasts_all_endpoint():
    """Verify retrieval of all commodity price summaries."""
    response = client.get("/api/ml/price-forecasts")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["total_commodities"] >= 8
    assert "Coconut" in data["commodities"]
    assert "Turmeric" in data["commodities"]
    assert "Pepper" in data["commodities"]

    coconut_summary = data["commodities"]["Coconut"]
    assert coconut_summary["last_price"] > 0
    assert "growth_rate" in coconut_summary
    assert "forecast_12m" in coconut_summary


def test_price_forecasts_single_commodity():
    """Verify detailed 12-month forward forecast and history for a single commodity."""
    for commodity in ["Coconut", "turmeric", "pepper", "Drumstick"]:
        response = client.get(f"/api/ml/price-forecasts/{commodity}")
        assert response.status_code == 200, response.text
        data = response.json()

        assert "commodity" in data
        assert "last_price" in data
        assert data["last_price"] > 0
        assert "trend" in data
        assert data["trend"] in ("Bullish", "Bearish", "Stable")
        assert len(data["forecast_12m"]) == 12
        assert "recent_history" in data


def test_hybrid_recommendations_enriched_with_ml():
    """Verify existing /api/hybrid/recommendations is enriched with ML prediction fields."""
    payload = {
        "main_crop": "Coconut",
        "farm_area_hectares": 2.0,
        "soil_type": "Red Sandy Loam",
        "main_crop_age_years": 8,
    }
    response = client.post("/api/hybrid/recommendations", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert len(data["recommendations"]) > 0
    for cand in data["recommendations"]:
        # Verify candidate crops have ML fields
        assert hasattr(cand, "__getitem__")
        assert "ml_suitability_probability" in cand
        assert "forecast_npv_15yr" in cand
        assert "market_growth_rate" in cand
        assert "price_forecast_trend" in cand

        # Pepper or Turmeric should have enriched values
        if cand["crop_id"] in ("black_pepper", "turmeric", "pepper"):
            assert cand["forecast_npv_15yr"] is not None or cand["market_growth_rate"] is not None


def test_crop_planner_service_edge_cases():
    """Verify direct service functions behave predictably with extreme or sparse inputs."""
    # Extreme low/high rainfall
    res_dry = plan_extra_crops({"rainfall_mm_yr": 150.0, "ph": 4.0, "temp_c": 45.0, "soil": "Sandy", "boundary_m": 100.0, "area_acre": 0.5})
    assert isinstance(res_dry["recommendations"], list)

    # Unknown commodity query returns safe fallback
    res_unknown = get_commodity_price_forecast("Dragonfruit_Exotic")
    assert "last_price" in res_unknown
    assert len(res_unknown["forecast_12m"]) == 12

    # Direct ML suitability with zero rainfall and extreme pH
    suit = predict_crop_suitability(n=0, p=0, k=0, temperature=15, humidity=20, ph=3.5, rainfall=10)
    assert suit["recommended_crop"] is not None
    assert suit["confidence"] > 0


def test_rainfall_scaling_consistency():
    """Verify shared rainfall scaling helper behaves consistently for annual vs monthly inputs."""
    from app.services.crop_planner_service import scale_rainfall_for_ml

    # Annual rainfall (e.g. 1200 mm/yr) scales down to ~100 mm
    assert scale_rainfall_for_ml(1200.0) == 100.0
    assert scale_rainfall_for_ml(2400.0) == 200.0

    # Monthly / already-scaled rainfall (e.g. 120 mm) is preserved
    assert scale_rainfall_for_ml(120.0) == 120.0
    assert scale_rainfall_for_ml(45.0) == 45.0

    # Edge cases
    assert scale_rainfall_for_ml(0.0) == 0.0
    assert scale_rainfall_for_ml(-5.0) == 0.0


def test_price_summary_beats_naive():
    """Verify weak models (Arecanut, Coconut) are marked beats_naive=False and low confidence."""
    # Arecanut has model MAE > naive MAE
    arecanut = get_commodity_price_forecast("Arecanut")
    assert arecanut["beats_naive"] is False
    assert arecanut["confidence"] == "low"
    assert arecanut["data_source"] == "synthetic"

    # Coconut has model MAE > naive MAE
    coconut = get_commodity_price_forecast("Coconut")
    assert coconut["beats_naive"] is False
    assert coconut["confidence"] == "low"

    # Turmeric has model MAE < naive MAE
    turmeric = get_commodity_price_forecast("Turmeric")
    assert turmeric["beats_naive"] is True
    assert turmeric["confidence"] == "high"


def test_viability_threshold_constant():
    """Verify minimum agronomic fit threshold is consistently 0.50 across all recommendations."""
    from app.services.crop_planner_service import MIN_VIABILITY_FIT, plan_extra_crops

    assert MIN_VIABILITY_FIT == 0.5

    payload = {
        "ph": 6.5,
        "rainfall_mm_yr": 1200.0,
        "temp_c": 28.0,
        "humidity": 70.0,
        "n": 50.0,
        "p": 40.0,
        "k": 30.0,
        "soil": "Red",
        "shade_level": 0.3,
        "boundary_m": 360.0,
        "area_acre": 2.0,
    }
    plan = plan_extra_crops(payload)
    for rec in plan["recommendations"]:
        assert rec["fit"] >= MIN_VIABILITY_FIT
