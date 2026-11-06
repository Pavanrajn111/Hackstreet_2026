# AGR002 Hybrid Farming Intelligence Platform — Frontend Integration Guide

This document is the API and integration handbook for frontend developers connecting to the **AGR002 Hybrid Farming Intelligence Platform** backend.

---

## 1. Base URL & Prefix

All backend hybrid endpoints are served under the `/api/hybrid` prefix:

- **Local Development URL**: `http://127.0.0.1:8000/api/hybrid`
- **Swagger / Interactive Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

---

## 2. API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/hybrid/recommendations` | Companion crop recommendation with compatibility scores & agronomic reasoning |
| `POST` | `/api/hybrid/layout` | Structured planting arrangement, spacing rules, and plant counts |
| `GET` | `/api/hybrid/crops/{crop_id}/guide` | 10-stage end-to-end crop cultivation guide |
| `POST` | `/api/hybrid/irrigation` | Dual-canopy hybrid water requirements & 7-day schedule |
| `POST` | `/api/hybrid/profit-estimate` | Scenario-based financial estimator (Conservative, Expected, Optimistic) |
| `POST` | `/api/hybrid/profit-comparison` | Monoculture vs. hybrid farming financial comparison |
| `GET` | `/api/hybrid/crops/{crop_id}/products` | Value-added processed product opportunities |
| `POST` | `/api/hybrid/product-profit` | Raw produce vs. processed product profitability comparison |
| `POST` | `/api/hybrid/plans` | Save farmer's selected hybrid plan to SQLite database |
| `GET` | `/api/hybrid/plans` | Retrieve saved hybrid plans (optional filter by `farm_id`) |
| `GET` | `/api/hybrid/plans/{plan_id}` | Retrieve details of a saved hybrid plan by ID |

---

## 3. Endpoints Detail & JSON Contracts

### 3.1 Companion Crop Recommendation
- **Endpoint**: `POST /api/hybrid/recommendations`
- **Request Body**:
```json
{
  "farm_id": 1,
  "main_crop": "Coconut",
  "farm_area_hectares": 2.0,
  "soil_type": "Red Sandy Loam",
  "main_crop_age_years": 8,
  "irrigation_method": "Drip Irrigation",
  "water_availability": "Adequate",
  "available_sunlight": "Partial Shade"
}
```
- **Response Structure**:
```json
{
  "main_crop": "Coconut",
  "farm_area_hectares": 2.0,
  "usable_intercrop_area_hectares": 1.2,
  "recommendations": [
    {
      "crop_id": "black-pepper",
      "crop_name": "Black Pepper",
      "compatibility_tier": "Highly Compatible",
      "compatibility_score": 96,
      "canopy_layer": "Climber / Vertical Trunk Epiphyte",
      "shade_tolerance": "High (climbs coconut trunk)",
      "root_depth_separation": "Main: 1.5m vs Intercrop: 0.65m",
      "water_synergy_and_competition": "Utilizes palm irrigation basin with micro-sprinkler or drip ring",
      "nutrient_interaction": "Symbiotic vertical space utilization",
      "recommended_planting_season": "June - July (South-West Monsoon)",
      "usable_land_area_pct": 15.0,
      "estimated_plant_density_per_ha": 350,
      "estimated_yield_per_ha_kg": { "low": 300, "expected": 550, "high": 850 },
      "suitability_explanation": "Standard vertical multi-tier cropping system recommended by ICAR-CPCRI.",
      "risks_and_limitations": "Monitor Phytophthora foot rot during heavy monsoon.",
      "data_source": "ICAR-IISR Calicut"
    },
    {
      "crop_id": "turmeric",
      "crop_name": "Turmeric",
      "compatibility_tier": "Highly Compatible",
      "compatibility_score": 94,
      "canopy_layer": "Ground / Root (Rhizosphere)",
      "shade_tolerance": "High (thrives in 30-50% filtered canopy shade)",
      "root_depth_separation": "Main: 1.5m - 2.0m vs Intercrop: 0.35m - 0.45m",
      "usable_land_area_pct": 65.0,
      "estimated_plant_density_per_ha": 65000,
      "estimated_yield_per_ha_kg": { "low": 12000, "expected": 18000, "high": 24000 }
    }
  ],
  "agronomic_principles": "Multi-tier agroforestry optimizes vertical solar radiation capture...",
  "data_sources": ["ICAR-CPCRI Kasaragod", "ICAR-IISR Calicut"]
}
```

---

### 3.2 Farm Layout & Sowing Pattern
- **Endpoint**: `POST /api/hybrid/layout`
- **Request Body**:
```json
{
  "main_crop": "Coconut",
  "intercrop": "Turmeric",
  "farm_area_hectares": 1.5,
  "custom_unusable_area_pct": 10.0
}
```
- **Response Structure**:
```json
{
  "main_crop": "Coconut",
  "intercrop": "Turmeric",
  "total_farm_area_sqm": 15000.0,
  "usable_cultivated_area_sqm": 13500.0,
  "main_crop_allocated_area_sqm": 5400.0,
  "intercrop_allocated_area_sqm": 8100.0,
  "main_crop_plant_count": 262,
  "intercrop_plant_count": 52650,
  "main_crop_spacing": {
    "row_spacing_m": 7.5,
    "plant_spacing_m": 7.5,
    "area_per_plant_sqm": 56.25
  },
  "intercrop_spacing": {
    "bed_width_m": 1.2,
    "row_spacing_m": 0.3,
    "plant_spacing_m": 0.2,
    "planting_depth_cm": 5.0,
    "buffer_from_main_m": 2.0
  },
  "planting_pattern_summary": "Multi-tier planting layout on 1.5 ha...",
  "row_arrangement": {
    "inter_alley_width_m": 7.5,
    "beds_per_alley": 2,
    "buffer_zone_m": 2.0
  },
  "irrigation_line_layout": "Primary drip line lateral servicing main crop rows; parallel drip laterals on raised beds in inter-row alleys.",
  "planting_calendar": [
    { "milestone": "Month 0", "action": "Bed raising and lateral laying" },
    { "milestone": "Month 1", "action": "Planting of Turmeric" }
  ],
  "limitations": [
    "Keep 2.0m buffer radius around Coconut trunks.",
    "Reserve 3.0m peripheral tracks for farm equipment."
  ]
}
```

---

### 3.3 10-Stage Cultivation Guide
- **Endpoint**: `GET /api/hybrid/crops/{crop_id}/guide`
- **Supported Crops**: `turmeric`, `coconut`, `banana`, `black-pepper`, `groundnut`, `ginger`, `mango`, `maize`, `rice`, `wheat`, `sugarcane`, `cotton`, `ragi`, etc.
- **Response Structure**:
```json
{
  "crop_id": "turmeric",
  "crop_name": "Turmeric",
  "botanical_name": "Curcuma longa L.",
  "season": "May - June (Kharif pre-monsoon)",
  "duration_days": 250,
  "climate": {
    "temperature_c": "20°C to 35°C",
    "rainfall_annual_mm": "1000 - 2000 mm",
    "sunlight": "Thrives in 30-50% filtered shade"
  },
  "soil": {
    "preferred_types": ["Red Sandy Loam", "Alluvial Loam"],
    "ph_range": "6.0 - 7.5",
    "drainage": "Must be well-drained."
  },
  "stages": [
    { "stage_number": 1, "stage_name": "Land Preparation", "description": "Deep ploughing 2 to 3 times..." },
    { "stage_number": 2, "stage_name": "Seed Selection & Pre-Treatment", "description": "Select healthy 35-45g rhizomes..." },
    { "stage_number": 3, "stage_name": "Sowing & Planting", "description": "Plant at 30cm x 20cm spacing..." },
    { "stage_number": 4, "stage_name": "Irrigation Management", "description": "Maintain soil moisture above 60%..." },
    { "stage_number": 5, "stage_name": "Nutrient Management", "description": "60:50:120 kg N:P2O5:K2O per ha..." },
    { "stage_number": 6, "stage_name": "Pest & Disease Prevention", "description": "Manage Rhizome Rot with Trichoderma..." },
    { "stage_number": 7, "stage_name": "Crop Growth Milestones", "description": "Sprouting at 15-30 days, bulking at 90-180 days..." },
    { "stage_number": 8, "stage_name": "Harvesting Indicators & Techniques", "description": "Harvest when 80-90% of foliage lodges..." },
    { "stage_number": 9, "stage_name": "Post-Harvest Curing & Drying", "description": "Boil fingers for 45-60 min and sun-dry to 10% moisture..." },
    { "stage_number": 10, "stage_name": "Safe Storage", "description": "Store in food-grade gunny bags in cool, dry godowns..." }
  ],
  "yield_potential": {
    "fresh_rhizome": { "low": 15000, "expected": 22000, "high": 28000 },
    "cured_dry_fingers": { "low": 3000, "expected": 4400, "high": 5600 }
  },
  "data_source": "ICAR-IISR Calicut"
}
```

---

### 3.4 Hybrid Irrigation Water Balance
- **Endpoint**: `POST /api/hybrid/irrigation`
- **Request Body**:
```json
{
  "farm_area_hectares": 2.0,
  "main_crop": "Coconut",
  "intercrop": "Turmeric",
  "latitude": 13.0,
  "longitude": 77.0,
  "soil_type": "Red Sandy Loam",
  "irrigation_method": "Drip Irrigation",
  "pump_flow_rate_lpm": 150.0
}
```
- **Response Structure**:
```json
{
  "main_crop": "Coconut",
  "intercrop": "Turmeric",
  "combined_daily_etc_mm": 3.96,
  "main_crop_etc_mm": 4.05,
  "intercrop_etc_mm": 3.82,
  "weighted_kc": 0.88,
  "irrigate_today": true,
  "recommended_depth_mm": 13.2,
  "total_water_volume_litres": 264000.0,
  "estimated_pump_runtime_minutes": 1760,
  "shared_schedule_advisable": true,
  "shared_schedule_reasoning": "Coconut (deep roots: 1.5m) and Turmeric (shallow roots: 0.45m) draw water from vertically separated soil layers. A shared drip schedule provides ideal water delivery without waterlogging.",
  "water_competition_risk": "Low (Vertical Root Separation)",
  "seven_day_schedule": [
    {
      "date": "2026-11-05",
      "day": "Today",
      "irrigate": true,
      "action": "Irrigate Both",
      "combined_depth_mm": 13.2,
      "main_crop_depth_mm": 7.9,
      "intercrop_depth_mm": 5.3,
      "water_volume_litres": 264000.0,
      "runtime_minutes": 1760,
      "notes": "Normal transpiration"
    }
  ],
  "methodology": "FAO-56 multi-canopy area-weighted evapotranspiration modeling with vertical root stratification."
}
```

---

### 3.5 Profit & Investment Calculator
- **Endpoint**: `POST /api/hybrid/profit-estimate` (or `/api/hybrid/profit-comparison`)
- **Request Body**:
```json
{
  "farm_area_hectares": 2.0,
  "main_crop": "Coconut",
  "intercrop": "Turmeric"
}
```
- **Response Structure**:
```json
{
  "main_crop": "Coconut",
  "intercrop": "Turmeric",
  "farm_area_hectares": 2.0,
  "initial_capital_investment_inr": 70000.0,
  "operating_expenses_breakdown": {
    "seeds_and_planting_material": 28000.0,
    "fertilizer_and_compost": 47040.0,
    "labor_and_cultural_operations": 70560.0,
    "irrigation_power_and_maintenance": 25200.0,
    "harvesting_and_transport": 25200.0
  },
  "scenarios": {
    "conservative_low": {
      "scenario_name": "Conservative / Low Yield & Mandi Slump",
      "total_gross_revenue_inr": 599000.0,
      "total_operating_expenses_inr": 168000.0,
      "net_profit_inr": 431000.0,
      "profit_per_acre_inr": 87210.0,
      "roi_pct": 181.1,
      "break_even_months": 3.6
    },
    "expected_realistic": {
      "scenario_name": "Expected / Realistic Benchmark",
      "total_gross_revenue_inr": 880000.0,
      "total_operating_expenses_inr": 168000.0,
      "net_profit_inr": 712000.0,
      "profit_per_acre_inr": 144068.0,
      "roi_pct": 299.2,
      "break_even_months": 2.4
    },
    "optimistic_high": {
      "scenario_name": "Optimistic / Premium Quality & Direct Market",
      "total_gross_revenue_inr": 1214400.0,
      "total_operating_expenses_inr": 168000.0,
      "net_profit_inr": 1046400.0,
      "profit_per_acre_inr": 211736.0,
      "roi_pct": 439.7,
      "break_even_months": 1.8
    }
  },
  "hybrid_gain_vs_monoculture": {
    "monoculture_net_profit_inr": 185000.0,
    "hybrid_net_profit_inr": 712000.0,
    "additional_net_profit_inr": 527000.0,
    "percentage_income_increase": 284.9,
    "summary": "Integrating Turmeric into your 2.0 ha Coconut plantation generates an estimated additional net profit of INR 527,000 (+284.9% increase) from the same land parcel."
  },
  "financial_assumptions": [
    "Farm area: 2.0 ha (4.9 acres).",
    "Intercrop utilizes 60% of plantation floor between Coconut rows.",
    "Yields based on ICAR-CPCRI and TNAU agronomic field trials under drip fertigation."
  ]
}
```

---

### 3.6 Value-Added Products & Processing Profitability
- **Endpoint**: `GET /api/hybrid/crops/{crop_id}/products`
  - Returns array of value-addition options (Farm-level, Small Enterprise, Industrial).
- **Endpoint**: `POST /api/hybrid/product-profit`
  - Compares raw farmgate selling against processed products with strict physical mass-balance validation.
- **Request Body**:
```json
{
  "crop_id": "turmeric",
  "harvest_quantity_kg": 5000.0,
  "custom_raw_price_per_kg": 28.0
}
```
- **Response Structure**:
```json
{
  "crop_name": "Turmeric",
  "harvest_quantity_kg": 5000.0,
  "comparison_options": [
    {
      "option_id": "turmeric-fresh",
      "option_name": "Fresh Farmgate Rhizomes",
      "processing_stage": "Raw / Minimal Grading",
      "processing_scale": "Farm-level",
      "raw_input_kg": 5000.0,
      "recovery_rate_pct": 100.0,
      "finished_product_kg": 5000.0,
      "selling_price_per_unit_inr": 32.0,
      "gross_revenue_inr": 160000.0,
      "net_profit_inr": 142500.0,
      "profit_gain_over_raw_inr": 10000.0,
      "profit_gain_pct": 7.5
    },
    {
      "option_id": "turmeric-dried-fingers",
      "option_name": "Dry Cured Turmeric Fingers",
      "processing_stage": "Primary Processing",
      "processing_scale": "Farm-level / FPO Cluster",
      "raw_input_kg": 5000.0,
      "recovery_rate_pct": 20.0,
      "finished_product_kg": 1000.0,
      "selling_price_per_unit_inr": 185.0,
      "gross_revenue_inr": 185000.0,
      "net_profit_inr": 159500.0,
      "profit_gain_over_raw_inr": 27000.0,
      "profit_gain_pct": 20.4
    },
    {
      "option_id": "turmeric-powder-packaged",
      "option_name": "Pure Packaged Turmeric Powder",
      "processing_stage": "Secondary Value Addition",
      "processing_scale": "Small Enterprise (MSME)",
      "raw_input_kg": 5000.0,
      "recovery_rate_pct": 19.0,
      "finished_product_kg": 950.0,
      "selling_price_per_unit_inr": 280.0,
      "gross_revenue_inr": 266000.0,
      "net_profit_inr": 216400.0,
      "profit_gain_over_raw_inr": 83900.0,
      "profit_gain_pct": 63.3,
      "equipment_needed": "Stainless steel pulverizer (5 HP), vibrating sifter, nitrogen band sealer",
      "licenses_required": "FSSAI State License, Agmark certification, GST"
    }
  ],
  "recommended_strategy": "Pure Packaged Turmeric Powder (Small Enterprise (MSME))",
  "strategic_advisory": "Processing 5,000 kg of raw Turmeric into Pure Packaged Turmeric Powder yields 950 kg of finished goods, generating INR 216,400 net profit (an additional INR 83,900 or +63.3% over raw mandi selling)."
}
```

---

### 3.7 Save & Retrieve Hybrid Plans
- **Save Plan**: `POST /api/hybrid/plans`
```json
{
  "farm_id": 1,
  "plan_name": "Coconut + Turmeric High Value Intercrop",
  "main_crop": "Coconut",
  "intercrop": "Turmeric",
  "farm_area_hectares": 1.5,
  "plant_count_summary": "262 Palms + 52,650 Turmeric Plants",
  "net_profit_expected_inr": 534000.0,
  "roi_pct": 299.2,
  "notes": "Plan scheduled for Kharif pre-monsoon planting"
}
```
- **List Plans**: `GET /api/hybrid/plans?farm_id=1`
- **Get Plan by ID**: `GET /api/hybrid/plans/{plan_id}`
