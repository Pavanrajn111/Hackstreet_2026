# AGR002 Adaptive Irrigation Advisor & Community Water Network API Reference

This document provides complete instructions for the frontend and teammates to connect to the **Adaptive Irrigation Options Engine**, **Opt-in Community Water Sharing Network**, and **Water Shortage / Resilience Action Planner**.

Base URL: `http://localhost:8000` (or configured `VITE_API_BASE_URL`).
Both `/api/v1/...` and `/api/...` prefixes are supported.

---

## 1. Feature 1: Adaptive Irrigation Options Engine

### 1.1 Evaluate Irrigation Options
- **Endpoint**: `POST /api/v1/irrigation/options` (alias: `POST /api/irrigation/options`)
- **Description**: Recommends and ranks suitable irrigation methods and operational upgrades (Drip, Sprinkler, Surface/Furrow, Improved Existing, Better Scheduling, Zoning, Leak Reduction, Mulching) based on crop, soil, terrain, and water availability.

#### Request Format
```json
{
  "farm_id": 1,
  "crop": "Tomato",
  "crop_stage": "Mid-Season",
  "soil_type": "Red Sandy Loam",
  "farm_area_hectares": 1.5,
  "existing_irrigation_method": "Surface / Flood Irrigation",
  "water_source": "Borewell",
  "water_availability": "Moderate",
  "water_quality": "freshwater",
  "terrain_slope": "Flat (0-2%)",
  "pump_electricity_availability": "Reliable Grid 6+ hrs",
  "labor_availability": "Moderate",
  "budget_limit_inr": 60000.0,
  "user_cost_assumptions": {
    "Drip Irrigation": 55000.0
  },
  "constraints": ["low_electricity"]
}
```

#### Successful Response (200 OK)
```json
{
  "farm_id": 1,
  "crop": "Tomato",
  "farm_area_hectares": 1.5,
  "current_method": "Surface / Flood Irrigation",
  "recommended_option": "Drip Irrigation",
  "ranking_method": "Multi-Factor Rule-Based Agronomic Evaluation",
  "data_completeness": {
    "score": 0.88,
    "status": "High",
    "evaluated_factors": ["crop_type", "soil_texture", "terrain_slope", "water_availability", "electricity_reliability", "capital_budget"]
  },
  "missing_information": [],
  "warnings": [],
  "options": [
    {
      "method": "Drip Irrigation",
      "category": "Capital System Upgrade",
      "suitability_score": 93.0,
      "score_explanation": [
        "Drip is the global gold standard for Tomato, maximizing yield and fruit uniformity.",
        "Crucial for water scarcity: 90% efficiency maximizes yield per cubic metre."
      ],
      "why_recommended": "Delivers water directly to the active root zone with ~90% application efficiency. Saves 35-50% water compared to surface flood.",
      "limitations": [
        "Susceptible to emitter clogging if water contains high dissolved iron or organic algae."
      ],
      "required_inputs": [
        "1.5 - 2.5 bar operating pressure",
        "Screen / disc filter system",
        "Laterals with drippers matching plant spacing"
      ],
      "installation_requirements": [
        "Head control unit with fertigation venturi",
        "PVC mainline & sub-mains",
        "Pressure regulating valves"
      ],
      "maintenance_requirements": [
        "Periodic lateral flushing (every 15 days)",
        "Filter backwashing"
      ],
      "estimated_cost": {
        "total_estimated_inr": 82500.0,
        "rate_per_ha_inr": 55000.0,
        "cost_basis": "user_provided_assumption",
        "is_user_assumption": true,
        "notes": "Cost calculated directly from your custom cost-per-hectare assumption."
      },
      "estimated_water_impact": {
        "efficiency_pct": 90.0,
        "water_saving_vs_flood_pct": 44.4,
        "evaporation_loss_rating": "Minimal",
        "deep_percolation_loss": "Negligible"
      },
      "confidence_or_data_completeness": 0.88,
      "next_steps": [
        "Survey field elevation and water source location",
        "Apply for PMKSY subsidy (up to 45-55%)"
      ]
    }
  ],
  "source_metadata": {
    "engine": "AGR002 Adaptive Irrigation Options Engine v1.0",
    "standards": ["FAO-56 Irrigation and Drainage Paper", "ICAR Micro-Irrigation Handbook", "PMKSY Benchmark Norms"]
  }
}
```

---

### 1.2 Compare Irrigation Methods
- **Endpoint**: `POST /api/v1/irrigation/compare` (alias: `POST /api/irrigation/compare`)
- **Description**: Side-by-side comparison of current method vs one or more target methods.

#### Request Format
```json
{
  "farm_id": 1,
  "current_method": "Surface / Flood Irrigation",
  "comparison_methods": ["Drip Irrigation", "Sprinkler Irrigation", "Mulching & Soil Moisture Conservation"],
  "crop": "Tomato",
  "soil_type": "Red Sandy Loam",
  "farm_area_hectares": 1.5
}
```

#### Successful Response (200 OK)
```json
{
  "crop": "Tomato",
  "soil_type": "Red Sandy Loam",
  "farm_area_hectares": 1.5,
  "current_method_assessment": {
    "method": "Surface / Flood Irrigation",
    "suitability_score": 48.0,
    "suitability_tier": "Marginal",
    "application_efficiency_pct": 50.0,
    "water_saving_vs_current_pct": 0.0,
    "estimated_capital_cost_inr": 9000.0,
    "cost_data_source": "PMKSY_benchmark_estimate",
    "operating_requirements": "Gravity flow",
    "maintenance_complexity": "Low",
    "labor_intensity": "High",
    "key_advantages": ["Zero capital expenditure", "Simple gravity flow"],
    "critical_limitations": ["Wastes 50% of water", "Severe weed growth"],
    "recommendation_summary": "Marginal method for Tomato in Red Sandy Loam achieving 50% application efficiency."
  },
  "alternative_comparisons": [
    {
      "method": "Drip Irrigation",
      "suitability_score": 92.0,
      "suitability_tier": "Highly Recommended",
      "application_efficiency_pct": 90.0,
      "water_saving_vs_current_pct": 44.4,
      "estimated_capital_cost_inr": 97500.0,
      "cost_data_source": "PMKSY_benchmark_estimate",
      "operating_requirements": "1.5 - 2.5 bar pressure",
      "maintenance_complexity": "Moderate",
      "labor_intensity": "Low",
      "key_advantages": ["90% water efficiency", "Direct root-zone delivery", "Compatible with fertigation"],
      "critical_limitations": ["Higher capital cost", "Requires filtration"],
      "recommendation_summary": "Highly Recommended method for Tomato in Red Sandy Loam achieving 90% application efficiency."
    }
  ],
  "key_tradeoffs": [
    "Modern pressurized systems (Drip/Sprinkler) require higher initial capital investment but drastically reduce operational labor and pumping electricity.",
    "Operational practices (Scheduling, Zoning, Mulching) deliver 15-25% immediate water savings with minimal or zero capital outlay."
  ],
  "overall_verdict": "For Tomato in Red Sandy Loam, transitioning from Surface / Flood Irrigation to Drip Irrigation yields significant water conservation and yield stability.",
  "data_completeness_pct": 85.0
}
```

---

## 2. Feature 2: Opt-in Community Water Sharing Network

### 2.1 Register Sharable Resource
- **Endpoint**: `POST /api/v1/community-water/resources`
- **Description**: Registers surplus pond water, borewell time slot, shared pump, or tanker.
- **Privacy Note**: `is_discoverable` defaults to `false`. Resource remains hidden until owner explicitly sets `true`.

#### Request Format
```json
{
  "owner_farm_id": 1,
  "owner_name": "Ramesh Gowda",
  "owner_contact_full": "+91 98450 12345",
  "resource_type": "farm_pond_surplus",
  "description": "Surplus harvested rain pond water, accessible via tractor lane.",
  "available_quantity_litres": 50000.0,
  "flow_rate_lpm": 150.0,
  "water_quality": "freshwater",
  "suitability_notes": "Suitable for all horticultural and field crops.",
  "availability_start": "2026-11-06T06:00:00Z",
  "availability_end": "2026-11-20T18:00:00Z",
  "sharing_type": "cost_sharing",
  "price_per_unit": 0.05,
  "price_unit": "INR/1000L",
  "terms_and_conditions": "Farmer brings own suction hose or tanker.",
  "latitude": 13.1250,
  "longitude": 77.5850,
  "approx_district": "Bengaluru Rural",
  "approx_village_or_area": "Doddaballapur",
  "discovery_radius_km": 10.0,
  "is_discoverable": true
}
```

#### Successful Response (201 Created)
```json
{
  "id": 1,
  "owner_farm_id": 1,
  "owner_name": "Ramesh Gowda",
  "owner_contact_masked": "+91 98****2345",
  "resource_type": "farm_pond_surplus",
  "description": "Surplus harvested rain pond water, accessible via tractor lane.",
  "available_quantity_litres": 50000.0,
  "quantity_unit": "litres",
  "flow_rate_lpm": 150.0,
  "water_quality": "freshwater",
  "suitability_notes": "Suitable for all horticultural and field crops.",
  "availability_start": "2026-11-06T06:00:00Z",
  "availability_end": "2026-11-20T18:00:00Z",
  "sharing_type": "cost_sharing",
  "price_per_unit": 0.05,
  "price_unit": "INR/1000L",
  "terms_and_conditions": "Farmer brings own suction hose or tanker.",
  "approx_district": "Bengaluru Rural",
  "approx_village_or_area": "Doddaballapur",
  "approx_distance_km": null,
  "is_discoverable": true,
  "status": "active",
  "is_demo_sample": false,
  "created_at": "2026-11-05T12:00:00Z",
  "updated_at": "2026-11-05T12:00:00Z"
}
```

---

### 2.2 Discover Nearby Shared Resources
- **Endpoint**: `GET /api/v1/community-water/resources`
- **Query Parameters**:
  - `lat`, `lon`: Requester coordinates (or pass `requesting_farm_id`)
  - `radius_km`: Search radius in km (default: 15.0)
  - `resource_type`: e.g. `farm_pond_surplus`, `borewell_slot`, `shared_pump`, `water_tanker`
  - `sharing_type`: e.g. `free`, `paid`, `cost_sharing`
  - `min_quantity`: e.g. `10000`

---

## 3. Feature 3: Water-Sharing Request Workflow

### 3.1 Submit Request
- **Endpoint**: `POST /api/v1/community-water/requests`
```json
{
  "requesting_farm_id": 2,
  "resource_id": 1,
  "requested_quantity_litres": 15000.0,
  "preferred_start_time": "2026-11-07T08:00:00Z",
  "preferred_end_time": "2026-11-07T14:00:00Z",
  "requester_message": "Require water for flowering tomato plot due to borewell yield drop.",
  "delivery_method": "tractor_tanker"
}
```

### 3.2 Update Status (State Machine)
- **Endpoint**: `PATCH /api/v1/community-water/requests/{request_id}/status`
- **Permitted transitions**:
  - `pending` -> `accepted` | `declined` | `cancelled`
  - `accepted` -> `completed` | `cancelled`
```json
{
  "status": "accepted",
  "agreed_quantity_litres": 15000.0,
  "agreed_start_time": "2026-11-07T08:00:00Z",
  "agreed_end_time": "2026-11-07T14:00:00Z",
  "owner_response_notes": "Accepted. Suction valve A is unlocked."
}
```
*Note*: Unmasked owner contact (`+91 98450 12345`) is revealed in the response upon transition to `accepted` or `completed`.

---

## 4. Feature 4: Water Shortage & Water Resilience Action Planner

### 4.1 Generate Action Plan
- **Endpoint**: `POST /api/v1/water-shortage/action-plan` (alias: `POST /api/water-shortage/action-plan`)

#### Request Format
```json
{
  "farm_id": 2,
  "crop": "Tomato",
  "crop_stage": "Mid-Season",
  "soil_type": "Red Sandy Loam",
  "farm_area_hectares": 1.5,
  "latitude": 13.1350,
  "longitude": 77.5950,
  "existing_irrigation_method": "Surface / Flood Irrigation",
  "available_water_litres": 5000.0,
  "shortage_severity": "severe",
  "budget_limit_inr": 40000.0,
  "max_community_search_radius_km": 15.0
}
```

#### Successful Response (200 OK)
```json
{
  "farm_id": 2,
  "crop": "Tomato",
  "growth_stage": "Mid-Season",
  "stage_sensitivity_status": "Critical Stage — Moisture deficit during flowering causes severe blossom drop and reduced pod/fruit set. Do NOT withhold water.",
  "current_water_status": {
    "days_after_sowing": 365,
    "crop_coefficient_kc": 1.15,
    "recommended_volume_litres": 32000.0,
    "recommended_depth_mm": 21.3,
    "on_farm_available_water_litres": 5000.0
  },
  "water_deficit_litres": 27000.0,
  "water_surplus_or_deficit_status": "Critical Deficit",
  "existing_irrigation_recommendation": {
    "irrigate_today": true,
    "recommended_water_volume_litres": 32000.0,
    "recommended_water_depth_mm": 21.3,
    "explanation": "Soil water balance indicates root zone depletion exceeds RAW threshold."
  },
  "recommended_actions": [
    {
      "action_id": "act_community_request",
      "priority_level": 1,
      "title": "Request Opt-in Community Water Support",
      "category": "Emergency Water Sourcing",
      "description": "Found nearby shared water: 'Farm Pond Surplus' (1.8 km away, 50,000 L available on Cost Sharing terms). Covers your estimated deficit of 27,000 Litres.",
      "water_saving_or_gain_litres": 27000.0,
      "estimated_cost_inr": 500.0,
      "timeframe": "Today",
      "agronomic_safety_rating": "Safe",
      "implementation_steps": [
        "Submit an exchange request to Resource #1 via Community Water Network",
        "Arrange flexible suction hose or tractor tanker for water transfer upon owner acceptance",
        "Apply water directly to flowering/fruiting blocks first"
      ],
      "farmer_confirmation_required": "Requires owner confirmation of requested time window before water transfer."
    },
    {
      "action_id": "act_night_scheduling",
      "priority_level": 2,
      "title": "Shift Irrigation to Night Hours (8:00 PM - 5:00 AM)",
      "category": "Operational Tuning",
      "description": "Midday solar radiation and wind drive high evaporative losses (up to 20%). Watering during cool night hours maximizes transpiration efficiency.",
      "water_saving_or_gain_litres": 4800.0,
      "estimated_cost_inr": 0.0,
      "timeframe": "Today",
      "agronomic_safety_rating": "Safe",
      "implementation_steps": [
        "Shift pump operating schedule to start after 8:00 PM or before 6:30 AM"
      ],
      "farmer_confirmation_required": "Verify overnight electricity grid schedule or use automated delay timer."
    },
    {
      "action_id": "act_organic_mulching",
      "priority_level": 3,
      "title": "Apply 7-10 cm Organic Residue Mulch Around Crop Basins",
      "category": "Moisture Conservation",
      "description": "Applying straw or dried weed biomass cuts surface evaporation by 35% and extends interval between irrigations.",
      "water_saving_or_gain_litres": 8000.0,
      "estimated_cost_inr": 1500.0,
      "timeframe": "This Week",
      "agronomic_safety_rating": "Safe",
      "implementation_steps": [
        "Collect paddy straw or pruned biomass",
        "Spread 8 cm thick mulch layer covering wetting zone"
      ],
      "farmer_confirmation_required": "Confirm availability of crop residue on farm or nearby village."
    },
    {
      "action_id": "act_retrofit_drip",
      "priority_level": 4,
      "title": "Transition Field to Precision Micro-Irrigation (Drip)",
      "category": "Infrastructure Retrofit",
      "description": "Permanently solves recurring water shortages by reducing gross water demand by 44% compared to Surface / Flood Irrigation.",
      "water_saving_or_gain_litres": 14080.0,
      "estimated_cost_inr": 48750.0,
      "timeframe": "Next Season",
      "agronomic_safety_rating": "Safe",
      "implementation_steps": [
        "Submit PMKSY micro-irrigation subsidy application",
        "Install pressure-compensating inline drip lines"
      ],
      "farmer_confirmation_required": "Requires farmer capital planning and PMKSY subsidy documentation approval."
    }
  ],
  "irrigation_method_options": [],
  "community_resource_matches": [
    {
      "resource_id": 1,
      "resource_type": "Farm Pond Surplus",
      "distance_km": 1.8,
      "available_quantity_litres": 50000.0,
      "match_score": 98.0,
      "compatibility_tier": "Excellent",
      "sharing_type": "Cost Sharing",
      "cost_summary": "Electricity / Diesel Cost Sharing",
      "match_explanation": [
        "Very close proximity (1.8 km); feasible for portable hose or direct piping.",
        "Fully covers required deficit (50,000 L available vs 27,000 L needed).",
        "Freshwater quality suitable for direct foliar/drip application."
      ],
      "is_available_now": true,
      "approx_location": "Doddaballapur, Bengaluru Rural"
    }
  ],
  "ml_insights": {
    "ml_status": "fallback_mode",
    "ml_model_used": false,
    "risk_category": "Low",
    "under_irrigation_risk": 0.0,
    "over_irrigation_risk": 0.0,
    "et0_forecast_mm": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    "explanation_note": "ML model output is guiding the FAO-56 recommendation. The agronomic engine remains the baseline source."
  },
  "warnings": [],
  "data_completeness": {
    "farm_profile_loaded": true,
    "community_resources_searched": 1,
    "ml_signals_integrated": false
  },
  "source_metadata": {
    "engine": "AGR002 Water Shortage & Water Resilience Action Planner v1.0",
    "standards": ["FAO-56 Regulated Deficit Irrigation Guidelines", "ICAR Drought Management Guidelines"]
  }
}
```
