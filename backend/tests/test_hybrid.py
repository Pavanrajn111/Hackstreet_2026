import os
import sys
import pytest

# Ensure root workspace and backend are in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_hybrid_recommendations_for_coconut():
    payload = {
        "main_crop": "Coconut",
        "farm_area_hectares": 2.0,
        "soil_type": "Red Sandy Loam",
        "main_crop_age_years": 10,
        "water_availability": "Adequate",
        "available_sunlight": "Partial Shade",
    }
    response = client.post("/api/hybrid/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["main_crop"] == "Coconut"
    assert data["farm_area_hectares"] == 2.0
    assert data["usable_intercrop_area_hectares"] == 1.2  # 60% of 2.0 ha
    assert len(data["recommendations"]) >= 3

    # Check top candidates
    candidate_ids = [c["crop_id"] for c in data["recommendations"]]
    assert "turmeric" in candidate_ids
    assert "black-pepper" in candidate_ids
    assert "banana" in candidate_ids

    # Check first recommendation attributes
    top = data["recommendations"][0]
    assert "compatibility_tier" in top
    assert top["compatibility_score"] > 80
    assert "canopy_layer" in top
    assert "root_depth_separation" in top
    assert "suitability_explanation" in top


def test_hybrid_recommendations_water_scarcity_adjustment():
    payload = {
        "main_crop": "Coconut",
        "farm_area_hectares": 1.5,
        "water_availability": "Scarce",
    }
    response = client.post("/api/hybrid/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()

    banana_cand = next((c for c in data["recommendations"] if c["crop_id"] == "banana"), None)
    if banana_cand:
        # Under scarce water, Banana compatibility is penalized
        assert banana_cand["compatibility_score"] < 70 or banana_cand["compatibility_tier"] == "Not Recommended"


def test_hybrid_recommendations_with_registered_farm():
    # 1. Create farm
    farm_payload = {
        "farm_name": "Coconut Estate Tumakuru",
        "district": "Tumakuru",
        "latitude": 13.3409,
        "longitude": 77.1010,
        "crop": "Coconut",
        "soil_type": "Red Sandy Loam",
        "sowing_date": "2018-06-15",
        "farm_area_hectares": 3.0,
        "irrigation_method": "Drip Irrigation",
    }
    res_farm = client.post("/api/farms", json=farm_payload)
    assert res_farm.status_code in [200, 201]
    farm_id = res_farm.json()["id"]

    # 2. Request hybrid recommendations using farm_id
    rec_res = client.post("/api/hybrid/recommendations", json={"farm_id": farm_id, "main_crop": "Coconut", "farm_area_hectares": 3.0})
    assert rec_res.status_code == 200
    assert rec_res.json()["farm_area_hectares"] == 3.0

    # 3. Invalid farm_id returns 404
    bad_res = client.post("/api/hybrid/recommendations", json={"farm_id": 999999, "main_crop": "Coconut", "farm_area_hectares": 1.0})
    assert bad_res.status_code == 404


def test_farm_layout_and_plant_counts():
    payload = {
        "main_crop": "Coconut",
        "intercrop": "Turmeric",
        "farm_area_hectares": 1.5,
        "custom_unusable_area_pct": 10.0,
    }
    response = client.post("/api/hybrid/layout", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["total_farm_area_sqm"] == 15000.0
    assert data["usable_cultivated_area_sqm"] == 13500.0  # 90%
    assert data["main_crop_plant_count"] > 200            # Coconut palms
    assert data["intercrop_plant_count"] > 40000          # Turmeric plants in inter-row alleys
    assert "main_crop_spacing" in data
    assert "intercrop_spacing" in data
    assert "irrigation_line_layout" in data
    assert len(data["planting_calendar"]) >= 4
    assert len(data["limitations"]) >= 2


def test_pepper_layout_uses_vertical_standards():
    payload = {
        "main_crop": "Coconut",
        "intercrop": "Black Pepper",
        "farm_area_hectares": 2.0,
    }
    response = client.post("/api/hybrid/layout", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Pepper utilizes 2 vines per coconut standard
    assert data["intercrop_plant_count"] == data["main_crop_plant_count"] * 2


def test_cultivation_guide_endpoints():
    crops_to_test = ["turmeric", "coconut", "banana", "black-pepper", "groundnut"]
    for crop in crops_to_test:
        res = client.get(f"/api/hybrid/crops/{crop}/guide")
        assert res.status_code == 200
        data = res.json()
        assert data["crop_id"] == crop
        assert len(data["stages"]) == 10
        assert data["stages"][0]["stage_number"] == 1
        assert "Preparation" in data["stages"][0]["stage_name"]
        assert "soil" in data
        assert "climate" in data
        assert "yield_potential" in data
        assert "data_source" in data

    # Generalized fallback for other crops
    res_wheat = client.get("/api/hybrid/crops/wheat/guide")
    assert res_wheat.status_code == 200
    assert len(res_wheat.json()["stages"]) == 10


def test_hybrid_irrigation_calculation():
    payload = {
        "farm_area_hectares": 2.0,
        "main_crop": "Coconut",
        "intercrop": "Turmeric",
        "latitude": 13.0,
        "longitude": 77.0,
        "soil_type": "Red Sandy Loam",
        "irrigation_method": "Drip Irrigation",
        "pump_flow_rate_lpm": 150.0,
    }
    response = client.post("/api/hybrid/irrigation", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["combined_daily_etc_mm"] > 0
    assert data["weighted_kc"] > 0
    assert "irrigate_today" in data
    assert data["total_water_volume_litres"] >= 0
    assert data["shared_schedule_advisable"] is True
    assert "seven_day_schedule" in data
    assert len(data["seven_day_schedule"]) == 7


def test_profit_and_investment_estimator():
    payload = {
        "farm_area_hectares": 2.0,
        "main_crop": "Coconut",
        "intercrop": "Turmeric",
    }
    response = client.post("/api/hybrid/profit-estimate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "initial_capital_investment_inr" in data
    assert "operating_expenses_breakdown" in data
    assert "scenarios" in data

    scenarios = data["scenarios"]
    assert "conservative_low" in scenarios
    assert "expected_realistic" in scenarios
    assert "optimistic_high" in scenarios

    realistic = scenarios["expected_realistic"]
    assert realistic["total_gross_revenue_inr"] > realistic["total_operating_expenses_inr"]
    assert realistic["net_profit_inr"] > 0
    assert realistic["profit_per_acre_inr"] > 0
    assert realistic["roi_pct"] > 0
    assert realistic["break_even_months"] > 0

    # Verify incremental gain over monoculture
    gain = data["hybrid_gain_vs_monoculture"]
    assert gain["additional_net_profit_inr"] > 0
    assert gain["percentage_income_increase"] > 0


def test_value_added_products_catalog():
    # Turmeric products
    res_turmeric = client.get("/api/hybrid/crops/turmeric/products")
    assert res_turmeric.status_code == 200
    prods = res_turmeric.json()
    assert len(prods) >= 3
    p_names = [p["product_name"] for p in prods]
    assert any("Powder" in name for name in p_names)
    assert any("Fingers" in name for name in p_names)

    # Coconut products
    res_coco = client.get("/api/hybrid/crops/coconut/products")
    assert res_coco.status_code == 200
    assert len(res_coco.json()) >= 3

    # 404 for invalid crop
    res_invalid = client.get("/api/hybrid/crops/nonexistent-item-999/products")
    assert res_invalid.status_code == 404


def test_raw_vs_processed_comparison():
    payload = {
        "crop_id": "turmeric",
        "harvest_quantity_kg": 5000.0,
        "custom_raw_price_per_kg": 28.0,
    }
    response = client.post("/api/hybrid/product-profit", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["crop_name"] == "Turmeric"
    assert data["harvest_quantity_kg"] == 5000.0
    assert len(data["comparison_options"]) >= 2

    # Verify physical mass balance: finished output <= raw input
    for opt in data["comparison_options"]:
        assert opt["finished_product_kg"] <= 5000.0
        assert opt["finished_product_kg"] == round(5000.0 * (opt["recovery_rate_pct"] / 100.0), 2)
        assert opt["gross_revenue_inr"] > 0

    # Check packaged powder option shows higher profit than raw selling
    powder_opt = next((o for o in data["comparison_options"] if "Powder" in o["option_name"]), None)
    if powder_opt:
        assert powder_opt["profit_gain_over_raw_inr"] > 0
        assert powder_opt["profit_gain_pct"] > 0


def test_hybrid_plan_database_persistence():
    # 1. Create a farm
    farm_res = client.post("/api/farms", json={
        "farm_name": "Plan Test Farm",
        "district": "Hassan",
        "latitude": 13.0,
        "longitude": 76.1,
        "crop": "Coconut",
        "soil_type": "Red Sandy Loam",
        "sowing_date": "2020-01-01",
        "farm_area_hectares": 1.5,
    })
    farm_id = farm_res.json()["id"]

    # 2. Save hybrid plan
    plan_payload = {
        "farm_id": farm_id,
        "plan_name": "Coconut + Turmeric High Value Intercrop",
        "main_crop": "Coconut",
        "intercrop": "Turmeric",
        "farm_area_hectares": 1.5,
        "plant_count_summary": "260 Palms + 65,000 Turmeric Plants",
        "net_profit_expected_inr": 385000.0,
        "roi_pct": 74.5,
        "notes": "Plan designed for Kharif pre-monsoon planting",
    }
    create_res = client.post("/api/hybrid/plans", json=plan_payload)
    assert create_res.status_code == 201
    plan_data = create_res.json()
    assert plan_data["id"] is not None
    assert plan_data["plan_name"] == "Coconut + Turmeric High Value Intercrop"

    # 3. Retrieve list of plans for this farm
    list_res = client.get(f"/api/hybrid/plans?farm_id={farm_id}")
    assert list_res.status_code == 200
    plans = list_res.json()
    assert len(plans) >= 1
    assert any(p["id"] == plan_data["id"] for p in plans)

    # 4. Retrieve single plan by ID
    single_res = client.get(f"/api/hybrid/plans/{plan_data['id']}")
    assert single_res.status_code == 200
    assert single_res.json()["roi_pct"] == 74.5


def test_edge_cases_and_input_validation():
    # 1. Zero farm area should fail validation (422)
    bad_recommend = {
        "main_crop": "Coconut",
        "farm_area_hectares": 0.0,
    }
    assert client.post("/api/hybrid/recommendations", json=bad_recommend).status_code == 422

    # 2. Negative harvest quantity in raw vs processed should fail validation (422)
    bad_profit = {
        "crop_id": "turmeric",
        "harvest_quantity_kg": -100.0,
    }
    assert client.post("/api/hybrid/product-profit", json=bad_profit).status_code == 422

    # 3. Invalid / unknown crop in raw vs processed should return 404
    unknown_crop = {
        "crop_id": "unknown-fictional-crop-xyz",
        "harvest_quantity_kg": 500.0,
    }
    assert client.post("/api/hybrid/product-profit", json=unknown_crop).status_code == 404

    # 4. Profit comparison endpoint alias works identically
    alias_res = client.post("/api/hybrid/profit-comparison", json={
        "farm_area_hectares": 1.0,
        "main_crop": "Coconut",
        "intercrop": "Turmeric",
    })
    assert alias_res.status_code == 200
    assert "scenarios" in alias_res.json()

