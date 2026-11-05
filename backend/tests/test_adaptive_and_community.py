"""
Tests for Adaptive Irrigation Options, Community Water Network, and Water Resilience Action Planner
------------------------------------------------------------------------------------------------------
Verifies:
  1. Adaptive Irrigation Options & Comparison Engine
  2. Opt-in Community Water Sharing Network with Privacy Masking
  3. Water-Sharing Request Workflow and State-Machine Transitions
  4. Water Shortage / Resilience Action Planner with Stage Sensitivity & ML Integration
"""

import os
import sys
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

# Ensure root workspace and backend are in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.main import app
from app.core.database import SessionLocal
from app.models.farm import FarmModel
from app.models.community_water import SharedWaterResourceModel, WaterSharingRequestModel

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_test_farms():
    """Sets up two test farms for owner and requester scenarios."""
    db = SessionLocal()
    # Create farm 1 (Owner)
    f1 = FarmModel(
        farm_name="Green Valley Agro",
        district="Bengaluru Rural",
        latitude=13.1200,
        longitude=77.5800,
        crop="Tomato",
        soil_type="Red Sandy Loam",
        sowing_date=datetime.now(timezone.utc).date() - timedelta(days=45),
        farm_area_hectares=2.0,
        irrigation_method="Drip Irrigation",
        pump_flow_rate_lpm=150.0,
    )
    # Create farm 2 (Requester)
    f2 = FarmModel(
        farm_name="Sunrise Orchard",
        district="Bengaluru Rural",
        latitude=13.1350,
        longitude=77.5950,
        crop="Coconut",
        soil_type="Red Sandy Loam",
        sowing_date=datetime.now(timezone.utc).date() - timedelta(days=365),
        farm_area_hectares=1.5,
        irrigation_method="Surface / Flood Irrigation",
        pump_flow_rate_lpm=100.0,
    )
    db.add(f1)
    db.add(f2)
    db.commit()
    db.refresh(f1)
    db.refresh(f2)
    f1_id = f1.id
    f2_id = f2.id
    db.close()
    yield f1_id, f2_id


# =========================================================================
# Feature 1: Adaptive Irrigation Options & Comparison
# =========================================================================

def test_irrigation_options_with_full_input(setup_test_farms):
    f1_id, _ = setup_test_farms
    payload = {
        "farm_id": f1_id,
        "crop": "Tomato",
        "crop_stage": "Mid-Season",
        "soil_type": "Red Sandy Loam",
        "farm_area_hectares": 2.0,
        "existing_irrigation_method": "Surface / Flood Irrigation",
        "water_source": "Borewell",
        "water_availability": "Moderate",
        "terrain_slope": "Flat (0-2%)",
        "budget_limit_inr": 80000.0,
    }
    response = client.post("/api/v1/irrigation/options", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["crop"] == "Tomato"
    assert "recommended_option" in data
    assert len(data["options"]) >= 6
    assert data["data_completeness"]["status"] in ("High", "Medium")

    # Check that Drip is evaluated and scored highly for Tomato
    drip_opt = next((o for o in data["options"] if o["method"] == "Drip Irrigation"), None)
    assert drip_opt is not None
    assert drip_opt["suitability_score"] >= 80.0
    assert len(drip_opt["score_explanation"]) > 0
    assert drip_opt["estimated_water_impact"]["efficiency_pct"] == 90.0


def test_irrigation_options_missing_optional_data():
    payload = {
        "crop": "Maize"
    }
    response = client.post("/api/v1/irrigation/options", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["crop"] == "Maize"
    assert len(data["missing_information"]) > 0
    assert data["data_completeness"]["score"] < 0.5


def test_irrigation_compare_endpoint(setup_test_farms):
    f1_id, _ = setup_test_farms
    payload = {
        "farm_id": f1_id,
        "current_method": "Surface / Flood Irrigation",
        "comparison_methods": ["Drip Irrigation", "Sprinkler Irrigation"],
        "crop": "Tomato",
        "soil_type": "Red Sandy Loam",
        "farm_area_hectares": 1.5,
    }
    response = client.post("/api/v1/irrigation/compare", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["current_method_assessment"]["method"] == "Surface / Flood Irrigation"
    assert len(data["alternative_comparisons"]) == 2
    assert "overall_verdict" in data

    drip_comp = next((a for a in data["alternative_comparisons"] if a["method"] == "Drip Irrigation"), None)
    assert drip_comp is not None
    assert drip_comp["water_saving_vs_current_pct"] > 30.0


# =========================================================================
# Feature 2: Community Water Sharing Network (Opt-In & Privacy)
# =========================================================================

def test_community_resource_registration_and_opt_in(setup_test_farms):
    f1_id, _ = setup_test_farms
    start_dt = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    end_dt = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()

    # 1. Register with is_discoverable=False (hidden by default)
    payload_hidden = {
        "owner_farm_id": f1_id,
        "owner_name": "Ramesh Patel",
        "owner_contact_full": "+91 98451 98765",
        "resource_type": "farm_pond_surplus",
        "description": "Rainwater harvested farm pond with diesel pump access.",
        "available_quantity_litres": 60000.0,
        "water_quality": "freshwater",
        "availability_start": start_dt,
        "availability_end": end_dt,
        "sharing_type": "cost_sharing",
        "price_per_unit": 0.04,
        "price_unit": "INR/1000L",
        "latitude": 13.1220,
        "longitude": 77.5810,
        "approx_district": "Bengaluru Rural",
        "approx_village_or_area": "Nelamangala",
        "discovery_radius_km": 12.0,
        "is_discoverable": False,  # Not opted-in yet
    }
    resp1 = client.post("/api/v1/community-water/resources", json=payload_hidden)
    assert resp1.status_code == 201, resp1.text
    hidden_res = resp1.json()
    hidden_id = hidden_res["id"]
    assert hidden_res["owner_contact_masked"] == "+91 98****8765"

    # 2. Search public discovery - hidden resource must NOT appear
    search_resp = client.get("/api/v1/community-water/resources?lat=13.1200&lon=77.5800&radius_km=15")
    assert search_resp.status_code == 200
    ids_found = [r["id"] for r in search_resp.json()]
    assert hidden_id not in ids_found, "Resource with is_discoverable=False must not be publicly discoverable"

    # 3. Owner opts in (is_discoverable=True)
    patch_resp = client.patch(f"/api/v1/community-water/resources/{hidden_id}", json={"is_discoverable": True})
    assert patch_resp.status_code == 200

    # 4. Search public discovery again - resource now appears with masked contact and distance
    search_resp2 = client.get("/api/v1/community-water/resources?lat=13.1200&lon=77.5800&radius_km=15")
    assert search_resp2.status_code == 200
    ids_found2 = [r["id"] for r in search_resp2.json()]
    assert hidden_id in ids_found2

    found_item = next(r for r in search_resp2.json() if r["id"] == hidden_id)
    assert found_item["owner_contact_masked"] == "+91 98****8765"
    assert "owner_contact_full" not in found_item
    assert found_item["approx_distance_km"] is not None
    assert found_item["approx_distance_km"] < 5.0


def test_community_resource_date_validation(setup_test_farms):
    f1_id, _ = setup_test_farms
    payload = {
        "owner_farm_id": f1_id,
        "resource_type": "borewell_slot",
        "available_quantity_litres": 20000.0,
        "availability_start": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        "availability_end": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),  # Invalid: end before start
        "latitude": 13.1220,
        "longitude": 77.5810,
    }
    resp = client.post("/api/v1/community-water/resources", json=payload)
    assert resp.status_code == 400


# =========================================================================
# Feature 3: Water-Sharing Request Workflow & State Transitions
# =========================================================================

def test_water_sharing_request_lifecycle(setup_test_farms):
    f1_id, f2_id = setup_test_farms
    start_dt = datetime.now(timezone.utc) + timedelta(hours=2)
    end_dt = datetime.now(timezone.utc) + timedelta(days=5)

    # 1. Create discoverable resource from Farm 1 (Owner)
    res_resp = client.post("/api/v1/community-water/resources", json={
        "owner_farm_id": f1_id,
        "owner_name": "Farmer Ramesh",
        "owner_contact_full": "+91 99000 11223",
        "resource_type": "shared_pump",
        "available_quantity_litres": 40000.0,
        "availability_start": start_dt.isoformat(),
        "availability_end": end_dt.isoformat(),
        "latitude": 13.1220,
        "longitude": 77.5810,
        "is_discoverable": True,
    })
    assert res_resp.status_code == 201
    res_id = res_resp.json()["id"]

    # 2. Farm 2 requests water
    req_resp = client.post("/api/v1/community-water/requests", json={
        "requesting_farm_id": f2_id,
        "resource_id": res_id,
        "requested_quantity_litres": 15000.0,
        "preferred_start_time": (start_dt + timedelta(hours=4)).isoformat(),
        "preferred_end_time": (start_dt + timedelta(hours=10)).isoformat(),
        "requester_message": "Need water to save flowering coconut palms.",
    })
    assert req_resp.status_code == 201, req_resp.text
    req_data = req_resp.json()
    req_id = req_data["id"]
    assert req_data["status"] == "pending"

    # 3. Invalid transition: cannot jump directly from pending to completed
    bad_transition = client.patch(
        f"/api/v1/community-water/requests/{req_id}/status",
        json={"status": "completed"}
    )
    assert bad_transition.status_code == 400, "Pending cannot jump directly to completed"

    # 4. Owner accepts the request
    accept_resp = client.patch(
        f"/api/v1/community-water/requests/{req_id}/status",
        json={
            "status": "accepted",
            "agreed_quantity_litres": 15000.0,
            "owner_response_notes": "Accepted. Connect hose to pump line B at 10 AM.",
        }
    )
    assert accept_resp.status_code == 200
    accepted_data = accept_resp.json()
    assert accepted_data["status"] == "accepted"
    assert accepted_data["owner_contact"] == "+91 99000 11223", "Consented contact revealed upon acceptance"

    # 5. Complete the exchange
    comp_resp = client.patch(
        f"/api/v1/community-water/requests/{req_id}/status",
        json={"status": "completed"}
    )
    assert comp_resp.status_code == 200
    assert comp_resp.json()["status"] == "completed"


def test_cannot_request_own_resource(setup_test_farms):
    f1_id, _ = setup_test_farms
    start_dt = datetime.now(timezone.utc) + timedelta(hours=1)
    end_dt = datetime.now(timezone.utc) + timedelta(days=3)

    res_resp = client.post("/api/v1/community-water/resources", json={
        "owner_farm_id": f1_id,
        "resource_type": "borewell_slot",
        "available_quantity_litres": 25000.0,
        "availability_start": start_dt.isoformat(),
        "availability_end": end_dt.isoformat(),
        "latitude": 13.1250,
        "longitude": 77.5850,
        "is_discoverable": True,
    })
    res_id = res_resp.json()["id"]

    # Attempt to request from own farm
    bad_req = client.post("/api/v1/community-water/requests", json={
        "requesting_farm_id": f1_id,  # Same as owner
        "resource_id": res_id,
        "requested_quantity_litres": 5000.0,
        "preferred_start_time": (start_dt + timedelta(hours=2)).isoformat(),
        "preferred_end_time": (start_dt + timedelta(hours=4)).isoformat(),
    })
    assert bad_req.status_code == 400


# =========================================================================
# Feature 4: Water Shortage / Water Resilience Action Planner
# =========================================================================

def test_water_shortage_action_planner(setup_test_farms):
    f1_id, f2_id = setup_test_farms

    payload = {
        "farm_id": f2_id,
        "crop": "Tomato",
        "crop_stage": "Mid-Season",
        "soil_type": "Red Sandy Loam",
        "farm_area_hectares": 1.5,
        "latitude": 13.1350,
        "longitude": 77.5950,
        "existing_irrigation_method": "Surface / Flood Irrigation",
        "available_water_litres": 5000.0,  # Deliberate water deficit scenario
        "shortage_severity": "severe",
        "budget_limit_inr": 40000.0,
        "max_community_search_radius_km": 15.0,
    }

    response = client.post("/api/v1/water-shortage/action-plan", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["crop"] == "Tomato"
    assert data["water_deficit_litres"] > 0
    assert "stage_sensitivity_status" in data
    assert "Critical Stage" in data["stage_sensitivity_status"]
    assert len(data["recommended_actions"]) >= 3

    # Check 4-tier action categories
    categories = [a["category"] for a in data["recommended_actions"]]
    assert any("Emergency" in c or "Sourcing" in c for c in categories)
    assert any("Operational" in c for c in categories)
    assert any("Moisture" in c or "Conservation" in c for c in categories)

    # Check ML insights object presence
    assert "ml_insights" in data
    assert "ml_status" in data["ml_insights"]

    # Verify irrigation options and community matches are attached
    assert len(data["irrigation_method_options"]) > 0
    assert isinstance(data["community_resource_matches"], list)


def test_alias_routes_under_api():
    """Verify endpoints also work under /api prefix for maximum client flexibility."""
    res1 = client.get("/api/v1/health")
    assert res1.status_code == 200
    assert res1.json()["api_version"] == "v1"

    res2 = client.get("/api/health")
    assert res2.status_code == 200
