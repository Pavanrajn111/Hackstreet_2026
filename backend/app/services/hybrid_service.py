"""
AGR002 Smart Irrigation & Hybrid Farming Intelligence Platform
---------------------------------------------------------------
Core service implementing:
  1. Hybrid crop compatibility & recommendation engine
  2. Farm layout & sowing pattern geometry generator
  3. 10-stage detailed crop cultivation guides
  4. Multi-crop hybrid irrigation water-balance calculator
  5. Multi-scenario profit and investment financial engine
  6. Value-added product opportunity & processing profitability analyzer
"""

import os
import json
import logging
from datetime import date, timedelta
from typing import Dict, Any, List, Optional, Tuple

from app.schemas.hybrid import (
    CandidateCrop,
    HybridRecommendRequest,
    HybridRecommendResponse,
    LayoutRequest,
    LayoutResponse,
    CultivationGuideResponse,
    CultivationStageItem,
    HybridIrrigationRequest,
    HybridIrrigationResponse,
    HybridIrrigationScheduleDay,
    ProfitEstimateRequest,
    ProfitEstimateResponse,
    FinancialScenario,
    ProductOpportunity,
    RawVsProcessedRequest,
    RawVsProcessedResponse,
    ProcessingOption,
)
from app.services.irrigation_engine import (
    load_crops_catalog,
    load_soils_catalog,
    find_crop_info,
    find_soil_info,
    get_irrigation_efficiency,
    calculate_effective_rainfall,
)
from app.services.weather_service import fetch_weather_data
from app.services.crop_planner_service import enrich_candidate_crop_with_ml

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")
COMBINATIONS_FILE = os.path.join(DATA_DIR, "hybrid_combinations.json")
GUIDES_FILE = os.path.join(DATA_DIR, "cultivation_guides.json")
PRODUCTS_FILE = os.path.join(DATA_DIR, "value_added_products.json")


def load_hybrid_combinations_catalog() -> List[Dict[str, Any]]:
    """Loads validated intercropping and multi-tier combinations."""
    try:
        with open(COMBINATIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("combinations", [])
    except Exception as e:
        logger.error("Could not load hybrid combinations from %s: %s", COMBINATIONS_FILE, e)
        return []


def load_cultivation_guides_catalog() -> Dict[str, Any]:
    """Loads 10-stage cultivation guidance packages."""
    try:
        with open(GUIDES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("guides", {})
    except Exception as e:
        logger.error("Could not load cultivation guides from %s: %s", GUIDES_FILE, e)
        return {}


def load_value_added_products_catalog() -> Dict[str, List[Dict[str, Any]]]:
    """Loads value-added product processing models."""
    try:
        with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("products", {})
    except Exception as e:
        logger.error("Could not load value-added products from %s: %s", PRODUCTS_FILE, e)
        return {}


# -------------------------------------------------------------------------
# Phase 3: Hybrid Crop Recommendation Engine
# -------------------------------------------------------------------------

def get_hybrid_crop_recommendations(req: HybridRecommendRequest) -> HybridRecommendResponse:
    """
    Analyzes farm conditions (main crop, area, age, soil, water availability, sunlight)
    and returns ranked, agronomically compatible candidate companion crops.
    """
    catalog = load_hybrid_combinations_catalog()
    main_clean = req.main_crop.strip().lower()

    # Find matching main crop framework
    matched_framework = None
    for item in catalog:
        if (
            item.get("main_crop_id", "").lower() == main_clean
            or item.get("main_crop_name", "").lower() == main_clean
            or main_clean in item.get("main_crop_name", "").lower()
        ):
            matched_framework = item
            break

    # If main crop is not in combinations catalog, provide generalized intelligent fallback
    if not matched_framework:
        return _generate_generalized_hybrid_recommendation(req)

    raw_candidates = matched_framework.get("intercrops", [])
    filtered_candidates: List[CandidateCrop] = []

    # Calculate usable intercrop area based on main crop canopy and spacing
    usable_area_ha = round(req.farm_area_hectares * 0.60, 2)

    for c in raw_candidates:
        min_age = c.get("min_main_crop_age_years", 0)
        max_age = c.get("max_main_crop_age_years", 999)

        score = c.get("compatibility_score", 85)
        tier = c.get("compatibility_tier", "Highly Compatible")

        # Adjust score based on farm condition factors
        if req.main_crop_age_years is not None:
            if req.main_crop_age_years < min_age:
                score -= 25
                tier = "Marginal"
            elif req.main_crop_age_years > max_age:
                score -= 20
                tier = "Marginal"

        # Water availability adjustment
        if req.water_availability and req.water_availability.lower() == "scarce":
            if "banana" in c.get("crop_id", ""):
                score -= 30
                tier = "Not Recommended"
            elif "groundnut" in c.get("crop_id", ""):
                score += 5  # Drought-hardy legume

        # Soil suitability check
        if req.soil_type and "clay" in req.soil_type.lower() and "turmeric" in c.get("crop_id", ""):
            score -= 10  # Requires extra drainage in heavy clay

        score = max(30, min(99, score))

        farm_conditions = {
            "soil": req.soil_type or "Red",
            "area_acre": req.farm_area_hectares * 2.47105,
            "temp_c": 28.0,
            "humidity": 70.0,
            "ph": 6.5,
            "rainfall_mm_yr": 1200.0,
        }
        ml_enrichment = enrich_candidate_crop_with_ml(
            c.get("crop_id", ""), c.get("crop_name", ""), farm_conditions
        )

        cand = CandidateCrop(
            crop_id=c.get("crop_id"),
            crop_name=c.get("crop_name"),
            compatibility_tier=tier,
            compatibility_score=score,
            canopy_layer=c.get("canopy_layer", "Understory"),
            shade_tolerance=c.get("shade_tolerance", "Moderate"),
            root_depth_separation=c.get("root_depth_separation", "Complementary root zones"),
            water_synergy_and_competition=c.get("water_synergy_and_competition", "Balanced shared irrigation"),
            nutrient_interaction=c.get("nutrient_interaction", "Symbiotic nutrient dynamics"),
            recommended_planting_season=c.get("recommended_planting_season", "Monsoon onset"),
            usable_land_area_pct=c.get("usable_land_area_pct", 55.0),
            estimated_plant_density_per_ha=c.get("estimated_plant_density_per_ha", 50000),
            estimated_yield_per_ha_kg=c.get("estimated_yield_per_ha_kg", {"expected": 15000}),
            suitability_explanation=c.get("suitability_explanation", "Compatible intercrop based on ICAR guidelines."),
            risks_and_limitations=c.get("risks_and_limitations", "Monitor drainage and timely fertilization."),
            data_source=c.get("data_source", "ICAR Agroforestry Guidelines"),
            ml_suitability_probability=ml_enrichment.get("ml_suitability_probability"),
            forecast_npv_15yr=ml_enrichment.get("forecast_npv_15yr"),
            market_growth_rate=ml_enrichment.get("market_growth_rate"),
            price_forecast_trend=ml_enrichment.get("price_forecast_trend"),
        )
        filtered_candidates.append(cand)

    # Sort candidates by compatibility score descending
    filtered_candidates.sort(key=lambda x: x.compatibility_score, reverse=True)

    return HybridRecommendResponse(
        main_crop=matched_framework.get("main_crop_name", req.main_crop),
        farm_area_hectares=req.farm_area_hectares,
        usable_intercrop_area_hectares=usable_area_ha,
        recommendations=filtered_candidates,
        agronomic_principles=(
            "Multi-tier agroforestry optimizes vertical solar radiation capture and stratifies root depths. "
            "Deep-rooted perennial main crops tap subsoil moisture (> 1.2m) while shallow-rooted intercrops "
            "(0.3m - 0.6m) utilize upper soil layers and organic leaf mulch without severe nutrient competition."
        ),
        data_sources=[
            "ICAR-Central Plantation Crops Research Institute (CPCRI) Kasaragod",
            "ICAR-Indian Institute of Spices Research (IISR) Calicut",
            "TNAU Agritech Portal Intercropping Systems",
        ],
    )


def _generate_generalized_hybrid_recommendation(req: HybridRecommendRequest) -> HybridRecommendResponse:
    """Generates baseline companion crop advice when main crop is not yet in primary combinations catalog."""
    usable_ha = round(req.farm_area_hectares * 0.50, 2)
    default_candidates = [
        CandidateCrop(
            crop_id="groundnut",
            crop_name="Groundnut",
            compatibility_tier="Highly Compatible",
            compatibility_score=85,
            canopy_layer="Ground Cover / Legume (< 0.5m)",
            shade_tolerance="Moderate (partial light)",
            root_depth_separation="Shallow taproot (0.4m - 0.6m)",
            water_synergy_and_competition="Low water demand; conserves soil moisture as living groundcover.",
            nutrient_interaction="Biological Nitrogen Fixation fixes 40-50 kg atmospheric N/ha.",
            recommended_planting_season="June - July (Kharif) or Oct - Nov (Rabi)",
            usable_land_area_pct=50.0,
            estimated_plant_density_per_ha=120000,
            estimated_yield_per_ha_kg={"low": 1500, "expected": 2200, "high": 3000},
            suitability_explanation=f"Groundnut is universally suited as a restorative legume companion crop for {req.main_crop}.",
            risks_and_limitations="Requires weed control during first 30 days before pegging.",
            data_source="ICAR-DGR Semi-Arid Cropping Manual",
        ),
        CandidateCrop(
            crop_id="turmeric",
            crop_name="Turmeric",
            compatibility_tier="Moderately Compatible",
            compatibility_score=78,
            canopy_layer="Understory Rhizome Bed",
            shade_tolerance="High (shade tolerant)",
            root_depth_separation="Shallow fibrous root zone (0.35m - 0.45m)",
            water_synergy_and_competition="Requires consistent moisture during rhizome bulking.",
            nutrient_interaction="Heavy organic mulching suppresses weeds and enriches humus.",
            recommended_planting_season="May - June",
            usable_land_area_pct=45.0,
            estimated_plant_density_per_ha=50000,
            estimated_yield_per_ha_kg={"low": 12000, "expected": 16000, "high": 21000},
            suitability_explanation=f"Turmeric can be cultivated in the inter-row alleys of {req.main_crop} provided adequate spacing exists.",
            risks_and_limitations="Avoid in poorly drained waterlogged ground.",
            data_source="ICAR-IISR Calicut Spice Intercropping Recommendations",
        ),
    ]

    return HybridRecommendResponse(
        main_crop=req.main_crop,
        farm_area_hectares=req.farm_area_hectares,
        usable_intercrop_area_hectares=usable_ha,
        recommendations=default_candidates,
        agronomic_principles="General intercropping principles apply: utilize open alley light with nitrogen-fixing pulses or shade-tolerant spices.",
        data_sources=["FAO Intercropping Principles & ICAR Standard Guidelines"],
    )


# -------------------------------------------------------------------------
# Phase 4: Farm Layout & Sowing Pattern Generator
# -------------------------------------------------------------------------

def generate_farm_layout(req: LayoutRequest) -> LayoutResponse:
    """
    Computes precise structured planting geometry, plant counts, spacing rules,
    row arrangement, and irrigation line layout for the chosen hybrid combination.
    """
    total_sqm = round(req.farm_area_hectares * 10000.0, 1)
    unusable_pct = req.custom_unusable_area_pct or 10.0
    usable_sqm = round(total_sqm * (1.0 - (unusable_pct / 100.0)), 1)

    main_clean = req.main_crop.strip().lower()
    inter_clean = req.intercrop.strip().lower()

    # Determine main crop spacing parameters
    if "coconut" in main_clean:
        main_spacing = {"row_spacing_m": 7.5, "plant_spacing_m": 7.5, "area_per_plant_sqm": 56.25}
        main_density_per_ha = 175
        main_allocated_pct = 40.0
    elif "arecanut" in main_clean:
        main_spacing = {"row_spacing_m": 2.7, "plant_spacing_m": 2.7, "area_per_plant_sqm": 7.29}
        main_density_per_ha = 1370
        main_allocated_pct = 50.0
    elif "mango" in main_clean:
        main_spacing = {"row_spacing_m": 10.0, "plant_spacing_m": 10.0, "area_per_plant_sqm": 100.0}
        main_density_per_ha = 100
        main_allocated_pct = 30.0
    elif "maize" in main_clean:
        main_spacing = {"row_spacing_m": 0.60, "plant_spacing_m": 0.20, "area_per_plant_sqm": 0.12}
        main_density_per_ha = 83333
        main_allocated_pct = 50.0
    elif "sugarcane" in main_clean:
        main_spacing = {"row_spacing_m": 1.20, "plant_spacing_m": 0.30, "area_per_plant_sqm": 0.36}
        main_density_per_ha = 27777
        main_allocated_pct = 55.0
    else:
        main_spacing = {"row_spacing_m": 3.0, "plant_spacing_m": 3.0, "area_per_plant_sqm": 9.0}
        main_density_per_ha = 1100
        main_allocated_pct = 50.0

    # Determine intercrop spacing parameters
    if "turmeric" in inter_clean:
        inter_spacing = {
            "bed_width_m": 1.2,
            "row_spacing_m": 0.30,
            "plant_spacing_m": 0.20,
            "planting_depth_cm": 5.0,
            "area_per_plant_sqm": 0.06,
            "buffer_from_main_m": 2.0,
        }
        inter_density_per_ha = 65000
    elif "black-pepper" in inter_clean or "pepper" in inter_clean:
        inter_spacing = {
            "standards_utilized": "Climbing main crop trunks (Coconut / Arecanut)",
            "vines_per_tree": 2 if "coconut" in main_clean else 1,
            "planting_distance_from_trunk_m": 0.35,
            "planting_depth_cm": 15.0,
        }
        inter_density_per_ha = 350 if "coconut" in main_clean else 1370
    elif "banana" in inter_clean:
        inter_spacing = {
            "row_spacing_m": 2.5,
            "plant_spacing_m": 2.5,
            "planting_depth_cm": 30.0,
            "area_per_plant_sqm": 6.25,
            "buffer_from_main_m": 2.5,
        }
        inter_density_per_ha = 800
    elif "ginger" in inter_clean:
        inter_spacing = {
            "bed_width_m": 1.0,
            "row_spacing_m": 0.25,
            "plant_spacing_m": 0.20,
            "planting_depth_cm": 4.0,
            "area_per_plant_sqm": 0.05,
            "buffer_from_main_m": 2.0,
        }
        inter_density_per_ha = 75000
    elif "groundnut" in inter_clean:
        inter_spacing = {
            "row_spacing_m": 0.30,
            "plant_spacing_m": 0.15,
            "planting_depth_cm": 4.0,
            "area_per_plant_sqm": 0.045,
            "buffer_from_main_m": 1.5,
        }
        inter_density_per_ha = 140000
    else:
        inter_spacing = {
            "row_spacing_m": 0.50,
            "plant_spacing_m": 0.30,
            "planting_depth_cm": 5.0,
            "area_per_plant_sqm": 0.15,
            "buffer_from_main_m": 1.5,
        }
        inter_density_per_ha = 30000

    # Calculate plant counts
    main_count = int(round(main_density_per_ha * req.farm_area_hectares))
    if "black-pepper" in inter_clean or "pepper" in inter_clean:
        vines_ratio = 2 if "coconut" in main_clean else 1
        inter_count = int(main_count * vines_ratio)
        inter_allocated_sqm = round(usable_sqm * 0.15, 1)
        main_allocated_sqm = round(usable_sqm * 0.85, 1)
    else:
        inter_allocated_sqm = round(usable_sqm * (1.0 - (main_allocated_pct / 100.0)), 1)
        main_allocated_sqm = round(usable_sqm * (main_allocated_pct / 100.0), 1)
        inter_count = int(round(inter_density_per_ha * (inter_allocated_sqm / 10000.0)))

    # Generate layout arrangement description
    summary = (
        f"Multi-tier planting layout on {req.farm_area_hectares} ha ({usable_sqm:,.0f} m² net cultivated). "
        f"Main crop ({req.main_crop}) occupies {main_count:,} primary stations spaced at "
        f"{main_spacing.get('row_spacing_m')}m x {main_spacing.get('plant_spacing_m')}m. "
        f"Intercrop ({req.intercrop}) is laid out in the inter-row alleys ({inter_allocated_sqm:,.0f} m²), "
        f"accommodating approximately {inter_count:,} plants with a buffer of {inter_spacing.get('buffer_from_main_m', 1.5)}m "
        f"from main crop root centers."
    )

    irrigation_layout = (
        "Main sub-surface header pipeline (63mm or 50mm PVC) along farm boundary with independent ball-valve controls. "
        "Primary drip line lateral (16mm inline, 4 LPH drippers) servicing main crop rows. "
        "Parallel intercrop drip laterals (16mm inline, 2 LPH drippers at 30cm spacing) laid along raised beds in inter-row alleys."
    )

    planting_calendar = [
        {"milestone": "Month 0", "action": "Field clearing, ploughing, bed raising, and drip lateral laying"},
        {"milestone": "Month 1 (Onset of Monsoon)", "action": f"Planting of {req.intercrop} and seedling establishment"},
        {"milestone": "Month 2 - 3", "action": "First split fertigation, weed mulching, and biostimulant drenching"},
        {"milestone": "Month 5 - 6", "action": "Mid-season earthing up and crop health inspection"},
        {"milestone": "Month 8 - 9", "action": f"Harvesting of {req.intercrop} and preparation for post-harvest value addition"},
    ]

    limitations = [
        f"Keep a mandatory unplanted buffer radius of {inter_spacing.get('buffer_from_main_m', 1.5)}m around {req.main_crop} to protect primary root anchorage.",
        "Ensure field drainage slope (0.5% - 1.0%) to prevent localized water stagnation during heavy rainfall spells.",
        "Reserve 3.0m peripheral boundary tracks for farm machinery, tractor spraying, and tractor harvest cart movement.",
    ]

    # Generate 3D spatial canopy strata and representative coordinate points for 3D visualization
    canopy_strata = {
        "overstorey": {
            "crop": req.main_crop,
            "layer": "Overstorey Canopy",
            "canopy_height_m": 12.0 if "coconut" in main_clean else (8.0 if "arecanut" in main_clean else 6.0),
            "crown_diameter_m": 5.0 if "coconut" in main_clean else (2.5 if "arecanut" in main_clean else 3.5),
            "root_depth_m": 1.8 if "coconut" in main_clean else 1.2,
            "light_transmission_pct": 55.0 if "coconut" in main_clean else 40.0,
        },
        "understorey": {
            "crop": req.intercrop,
            "layer": "Understorey / Inter-row Shrub & Rhizosphere",
            "canopy_height_m": 0.8 if "turmeric" in inter_clean or "ginger" in inter_clean else (2.5 if "banana" in inter_clean else 1.5),
            "crown_diameter_m": 0.6 if "turmeric" in inter_clean or "ginger" in inter_clean else 2.0,
            "root_depth_m": 0.35 if "turmeric" in inter_clean or "ginger" in inter_clean else 0.6,
            "shade_preference": "Partial to High Shade",
        },
        "spatial_root_separation_m": round(abs((1.8 if "coconut" in main_clean else 1.2) - (0.35 if "turmeric" in inter_clean or "ginger" in inter_clean else 0.6)), 2),
        "competition_index": "Low (Root zones vertically partitioned)",
    }

    # Generate sample 3D coordinates for a 30m x 30m field cell
    cell_w = 30.0
    cell_l = 30.0
    main_row_spacing = float(main_spacing.get("row_spacing_m", 7.5))
    main_plant_spacing = float(main_spacing.get("plant_spacing_m", 7.5))

    grid_coords = []
    # Main crop stations
    x = main_row_spacing / 2.0
    while x < cell_w:
        y = main_plant_spacing / 2.0
        while y < cell_l:
            grid_coords.append({
                "type": "main_crop",
                "crop": req.main_crop,
                "x": round(x, 2),
                "y": round(y, 2),
                "z": canopy_strata["overstorey"]["canopy_height_m"],
                "root_z": -canopy_strata["overstorey"]["root_depth_m"],
                "color": "#15803d",
            })
            y += main_plant_spacing
        x += main_row_spacing

    # Intercrop stations in alleys
    inter_row_spacing = float(inter_spacing.get("row_spacing_m", 1.0))
    buffer = float(inter_spacing.get("buffer_from_main_m", 1.5))

    x = main_row_spacing / 2.0 + buffer
    while x < cell_w - buffer:
        y = 1.0
        while y < cell_l - 1.0:
            grid_coords.append({
                "type": "intercrop",
                "crop": req.intercrop,
                "x": round(x, 2),
                "y": round(y, 2),
                "z": canopy_strata["understorey"]["canopy_height_m"],
                "root_z": -canopy_strata["understorey"]["root_depth_m"],
                "color": "#eab308" if "turmeric" in inter_clean else "#10b981",
            })
            y += max(inter_row_spacing * 2.0, 1.5)
        x += max(main_row_spacing / 2.0, 2.5)

    return LayoutResponse(
        main_crop=req.main_crop,
        intercrop=req.intercrop,
        total_farm_area_sqm=total_sqm,
        usable_cultivated_area_sqm=usable_sqm,
        main_crop_allocated_area_sqm=main_allocated_sqm,
        intercrop_allocated_area_sqm=inter_allocated_sqm,
        main_crop_plant_count=main_count,
        intercrop_plant_count=inter_count,
        main_crop_spacing=main_spacing,
        intercrop_spacing=inter_spacing,
        planting_pattern_summary=summary,
        row_arrangement={
            "inter_alley_width_m": main_spacing.get("row_spacing_m", 7.5),
            "beds_per_alley": 2 if "coconut" in main_clean else 1,
            "buffer_zone_m": inter_spacing.get("buffer_from_main_m", 1.5),
        },
        irrigation_line_layout=irrigation_layout,
        planting_calendar=planting_calendar,
        limitations=limitations,
        spatial_pattern_3d=canopy_strata,
        spatial_grid_coordinates=grid_coords,
    )


# -------------------------------------------------------------------------
# Phase 5: Cultivation Guide Service
# -------------------------------------------------------------------------

def get_crop_cultivation_guide(crop_id_or_name: str) -> CultivationGuideResponse:
    """Retrieves 10-stage cultivation guidance for a specific crop."""
    guides_catalog = load_cultivation_guides_catalog()
    clean = crop_id_or_name.strip().lower().replace(" ", "-")

    guide_data = None
    for k, v in guides_catalog.items():
        if k.lower() == clean or v.get("crop_name", "").lower() == crop_id_or_name.strip().lower():
            guide_data = v
            break

    # If exact guide not in catalog, create structured fallback from general crop catalog
    if not guide_data:
        crops_catalog = load_crops_catalog()
        matched_crop = find_crop_info(crop_id_or_name, crops_catalog)
        return _generate_fallback_cultivation_guide(matched_crop)

    stages_list = [
        CultivationStageItem(
            stage_number=s.get("stage_number", i + 1),
            stage_name=s.get("stage_name", f"Stage {i + 1}"),
            description=s.get("description", "Standard agricultural management practice."),
        )
        for i, s in enumerate(guide_data.get("stages", []))
    ]

    return CultivationGuideResponse(
        crop_id=guide_data.get("crop_id", clean),
        crop_name=guide_data.get("crop_name", crop_id_or_name.title()),
        botanical_name=guide_data.get("botanical_name", "Plantae spp."),
        season=guide_data.get("season", "Kharif / Rabi"),
        duration_days=guide_data.get("duration_days", 120),
        climate=guide_data.get("climate", {"temperature": "20°C - 35°C", "sunlight": "Adequate"}),
        soil=guide_data.get("soil", {"preferred_types": ["Red Sandy Loam", "Alluvial Loam"], "drainage": "Well-drained"}),
        stages=stages_list,
        yield_potential=guide_data.get("yield_potential_kg_per_ha", {"expected": 15000}),
        data_source=guide_data.get("data_source", "ICAR Packages of Practices"),
    )


def _generate_fallback_cultivation_guide(crop_data: Dict[str, Any]) -> CultivationGuideResponse:
    """Generates structured 10-stage guide for any crop using generic FAO/ICAR principles."""
    name = crop_data.get("name", "Field Crop")
    stages = [
        CultivationStageItem(stage_number=1, stage_name="Land Preparation", description="Deep ploughing to 25cm, pulverize soil, apply 15 tonnes/ha FYM, and level field."),
        CultivationStageItem(stage_number=2, stage_name="Seed Selection & Treatment", description="Select certified high-yielding seeds/propagation material. Treat with bio-fungicide."),
        CultivationStageItem(stage_number=3, stage_name="Sowing / Transplanting", description="Sow at recommended spacing and depth into moist seedbed."),
        CultivationStageItem(stage_number=4, stage_name="Irrigation Management", description="Provide critical irrigation during establishment, flowering, and grain/fruit filling stages."),
        CultivationStageItem(stage_number=5, stage_name="Nutrient Management", description="Balanced N-P-K fertilizer application based on soil test recommendations."),
        CultivationStageItem(stage_number=6, stage_name="Weed & Canopy Management", description="Maintain field weed-free during first 30-45 days of vegetative establishment."),
        CultivationStageItem(stage_number=7, stage_name="Integrated Pest & Disease Management", description="Monitor regularly for pest flushes; use yellow sticky traps and bio-pesticides."),
        CultivationStageItem(stage_number=8, stage_name="Maturity & Harvesting", description="Harvest at optimal biological maturity indicated by color change and moisture drop."),
        CultivationStageItem(stage_number=9, stage_name="Post-Harvest Handling", description="Clean, grade, and dry produce on hygienic surfaces away from direct soil contact."),
        CultivationStageItem(stage_number=10, stage_name="Storage & Packaging", description="Store in aerated moisture-barrier bags in well-ventilated godowns."),
    ]
    return CultivationGuideResponse(
        crop_id=crop_data.get("id", name.lower().replace(" ", "-")),
        crop_name=name,
        botanical_name="Plantae spp.",
        season="Kharif / Rabi",
        duration_days=crop_data.get("duration_days", 120),
        climate={"temperature": "18°C - 35°C", "sunlight": "Full / Partial Sun"},
        soil={"preferred_types": ["Red Sandy Loam", "Alluvial Loam"], "drainage": "Well-drained"},
        stages=stages,
        yield_potential={"expected_yield_kg_per_ha": 3500},
        data_source="ICAR National Guidelines",
    )


# -------------------------------------------------------------------------
# Phase 6: Multi-Crop Hybrid Irrigation Service
# -------------------------------------------------------------------------

def calculate_hybrid_irrigation(req: HybridIrrigationRequest) -> HybridIrrigationResponse:
    """
    Computes joint evapotranspiration, root-zone depletion, and shared irrigation
    scheduling for multi-crop hybrid farming layouts.
    Uses FAO-56 multi-canopy area-weighted coefficients:
      Kc_weighted = (Kc_main * Area_main + Kc_inter * Area_inter) / Total_Area
    """
    crops_catalog = load_crops_catalog()
    soils_catalog = load_soils_catalog()

    main_info = find_crop_info(req.main_crop, crops_catalog)
    inter_info = find_crop_info(req.intercrop, crops_catalog)
    soil_info = find_soil_info(req.soil_type, soils_catalog)

    weather_data = fetch_weather_data(req.latitude, req.longitude)
    forecast = weather_data.get("forecast", [])

    today_weather = forecast[0] if forecast else {"et0_mm": 4.5, "rainfall_mm": 0.0}
    et0 = today_weather.get("et0_mm", 4.5)

    kc_main = main_info.get("base_kc", 0.90)
    kc_inter = inter_info.get("base_kc", 0.85)

    # Area allocation weights (60% main overstory, 40% understory intercrop)
    w_main = 0.60
    w_inter = 0.40
    weighted_kc = round((kc_main * w_main) + (kc_inter * w_inter), 2)

    main_etc = round(et0 * kc_main, 2)
    inter_etc = round(et0 * kc_inter, 2)
    combined_etc = round((main_etc * w_main) + (inter_etc * w_inter), 2)

    # Hydraulic limits
    fc = soil_info.get("field_capacity_pct", 22.0) / 100.0
    wp = soil_info.get("wilting_point_pct", 9.0) / 100.0
    root_depth = max(main_info.get("root_depth_m", 1.2), inter_info.get("root_depth_m", 0.5))
    mad = min(main_info.get("max_allowable_depletion", 0.50), inter_info.get("max_allowable_depletion", 0.40))

    taw_mm = round(1000.0 * (fc - wp) * root_depth, 1)
    raw_mm = round(mad * taw_mm, 1)
    efficiency = get_irrigation_efficiency(req.irrigation_method or "Drip Irrigation")

    # Determine daily decision (heuristic 3 days accumulated)
    accumulated_depletion = round(combined_etc * 3.0, 1)
    irrigate_today = accumulated_depletion >= raw_mm

    if irrigate_today:
        net_depth = round(min(accumulated_depletion, taw_mm), 1)
        gross_depth = round(net_depth / efficiency, 1)
    else:
        net_depth = 0.0
        gross_depth = 0.0

    total_litres = round(gross_depth * req.farm_area_hectares * 10000.0, 1)
    pump_flow = req.pump_flow_rate_lpm if req.pump_flow_rate_lpm is not None else 120.0
    runtime_mins = int(round(total_litres / pump_flow)) if (irrigate_today and pump_flow > 0) else 0

    # Evaluate shared schedule compatibility
    root_diff = abs(main_info.get("root_depth_m", 1.2) - inter_info.get("root_depth_m", 0.5))
    if root_diff > 1.0 and "banana" not in req.intercrop.lower():
        shared_advisable = True
        shared_reasoning = (
            f"{req.main_crop} (deep roots: {main_info.get('root_depth_m')}m) and {req.intercrop} "
            f"(shallow roots: {inter_info.get('root_depth_m')}m) draw water from vertically separated soil layers. "
            "A shared drip schedule with dedicated drippers on parallel laterals provides ideal water delivery without waterlogging."
        )
        water_risk = "Low (Vertical Root Separation)"
    elif "banana" in req.intercrop.lower() and "coconut" in req.main_crop.lower():
        shared_advisable = True
        shared_reasoning = (
            "Both Coconut and Banana require high volumetric water availability during dry months. "
            "Separate drip lateral valves are recommended so Banana can receive additional split irrigation cycles."
        )
        water_risk = "Moderate (High Combined Transpiration Demand)"
    else:
        shared_advisable = True
        shared_reasoning = "Combined water balance can be delivered via common irrigation infrastructure."
        water_risk = "Low"

    # 7-day schedule projection
    schedule_days: List[HybridIrrigationScheduleDay] = []
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    sim_depletion = 0.0 if irrigate_today else accumulated_depletion

    for i in range(7):
        w_item = forecast[i] if i < len(forecast) else today_weather
        d_date = w_item.get("date", (date.today() + timedelta(days=i)).isoformat())
        d_label = w_item.get("day", "Today" if i == 0 else "Day")
        rain_mm = w_item.get("rainfall_mm", 0.0)
        p_eff = calculate_effective_rainfall(rain_mm)

        if i == 0 and irrigate_today:
            sched_irr = True
            act = "Irrigate Both"
            dep = gross_depth
            sim_depletion = 0.0
        elif rain_mm >= 5.0:
            sched_irr = False
            act = "Rain Pause"
            dep = 0.0
            sim_depletion = max(0.0, sim_depletion - p_eff)
        else:
            sim_depletion += combined_etc
            if sim_depletion >= raw_mm:
                sched_irr = True
                act = "Irrigate Both"
                dep = round(sim_depletion / efficiency, 1)
                sim_depletion = 0.0
            else:
                sched_irr = False
                act = "Rest"
                dep = 0.0

        v_litres = round(dep * req.farm_area_hectares * 10000.0, 1)
        r_mins = int(round(v_litres / pump_flow)) if (sched_irr and pump_flow > 0 and dep > 0) else 0

        schedule_days.append(
            HybridIrrigationScheduleDay(
                date=d_date,
                day=d_label,
                irrigate=sched_irr,
                action=act,
                combined_depth_mm=dep,
                main_crop_depth_mm=round(dep * w_main, 1),
                intercrop_depth_mm=round(dep * w_inter, 1),
                water_volume_litres=v_litres,
                runtime_minutes=r_mins,
                notes=f"Rain: {rain_mm} mm" if rain_mm > 0 else "Normal transpiration",
            )
        )

    return HybridIrrigationResponse(
        main_crop=req.main_crop,
        intercrop=req.intercrop,
        combined_daily_etc_mm=combined_etc,
        main_crop_etc_mm=main_etc,
        intercrop_etc_mm=inter_etc,
        weighted_kc=weighted_kc,
        irrigate_today=irrigate_today,
        recommended_depth_mm=gross_depth,
        total_water_volume_litres=total_litres,
        estimated_pump_runtime_minutes=runtime_mins,
        shared_schedule_advisable=shared_advisable,
        shared_schedule_reasoning=shared_reasoning,
        water_competition_risk=water_risk,
        seven_day_schedule=schedule_days,
        methodology="FAO-56 multi-canopy area-weighted evapotranspiration modeling with vertical root stratification.",
    )


# -------------------------------------------------------------------------
# Phase 7: Profit and Investment Financial Estimator
# -------------------------------------------------------------------------

def calculate_profit_and_investment(req: ProfitEstimateRequest) -> ProfitEstimateResponse:
    """
    Computes comprehensive financial economics, ROI, and break-even comparison
    between standalone monoculture and multi-crop hybrid farming across 3 scenarios.
    """
    main_clean = req.main_crop.strip().lower()
    inter_clean = (req.intercrop or "").strip().lower()

    # Monoculture baseline economics per hectare
    if "coconut" in main_clean:
        base_main_yield_kg = req.custom_main_yield_kg or 11000.0  # ~11,000 nuts (approx 5,500 kg copra/meat)
        base_main_price = req.custom_main_price_per_kg or 25.0    # INR 25 per nut/kg
        base_main_opex = 45000.0 * req.farm_area_hectares
        base_main_capex = 0.0  # Mature orchard
    elif "arecanut" in main_clean:
        base_main_yield_kg = req.custom_main_yield_kg or 2200.0
        base_main_price = req.custom_main_price_per_kg or 380.0
        base_main_opex = 85000.0 * req.farm_area_hectares
        base_main_capex = 0.0
    elif "mango" in main_clean:
        base_main_yield_kg = req.custom_main_yield_kg or 8500.0
        base_main_price = req.custom_main_price_per_kg or 45.0
        base_main_opex = 55000.0 * req.farm_area_hectares
        base_main_capex = 0.0
    else:
        base_main_yield_kg = req.custom_main_yield_kg or 4500.0
        base_main_price = req.custom_main_price_per_kg or 35.0
        base_main_opex = 35000.0 * req.farm_area_hectares
        base_main_capex = 0.0

    # Intercrop economics per hectare (effective cultivated area ~0.60 ha per ha farm)
    usable_ha = req.farm_area_hectares * 0.60
    if "turmeric" in inter_clean:
        base_inter_yield_kg = req.custom_inter_yield_kg or (18000.0 * usable_ha)
        base_inter_price = req.custom_inter_price_per_kg or 28.0
        inter_capex = req.custom_additional_investment_inr or (35000.0 * req.farm_area_hectares)  # Drip extension & seed rhizomes
        inter_opex = 65000.0 * usable_ha  # Labor, bio-fertilizers, curing
    elif "black-pepper" in inter_clean or "pepper" in inter_clean:
        base_inter_yield_kg = req.custom_inter_yield_kg or (550.0 * req.farm_area_hectares)
        base_inter_price = req.custom_inter_price_per_kg or 600.0
        inter_capex = req.custom_additional_investment_inr or (25000.0 * req.farm_area_hectares)
        inter_opex = 30000.0 * req.farm_area_hectares
    elif "banana" in inter_clean:
        base_inter_yield_kg = req.custom_inter_yield_kg or (22000.0 * usable_ha)
        base_inter_price = req.custom_inter_price_per_kg or 18.0
        inter_capex = req.custom_additional_investment_inr or (40000.0 * req.farm_area_hectares)
        inter_opex = 75000.0 * usable_ha
    elif "groundnut" in inter_clean:
        base_inter_yield_kg = req.custom_inter_yield_kg or (2200.0 * usable_ha)
        base_inter_price = req.custom_inter_price_per_kg or 60.0
        inter_capex = req.custom_additional_investment_inr or (15000.0 * req.farm_area_hectares)
        inter_opex = 28000.0 * usable_ha
    elif "ginger" in inter_clean:
        base_inter_yield_kg = req.custom_inter_yield_kg or (15000.0 * usable_ha)
        base_inter_price = req.custom_inter_price_per_kg or 45.0
        inter_capex = req.custom_additional_investment_inr or (45000.0 * req.farm_area_hectares)
        inter_opex = 70000.0 * usable_ha
    else:
        base_inter_yield_kg = req.custom_inter_yield_kg or 0.0
        base_inter_price = req.custom_inter_price_per_kg or 0.0
        inter_capex = req.custom_additional_investment_inr or 0.0
        inter_opex = 0.0

    total_capex = round(base_main_capex + inter_capex, 2)
    total_opex = round(base_main_opex + inter_opex, 2)

    opex_breakdown = {
        "seeds_and_planting_material": round(inter_capex * 0.40, 2),
        "fertilizer_and_compost": round(total_opex * 0.28, 2),
        "labor_and_cultural_operations": round(total_opex * 0.42, 2),
        "irrigation_power_and_maintenance": round(total_opex * 0.15, 2),
        "harvesting_and_transport": round(total_opex * 0.15, 2),
    }

    # Generate 3 realistic financial scenarios
    scenarios_multipliers = {
        "conservative_low": {"yield_mult": 0.80, "price_mult": 0.85, "name": "Conservative / Low Yield & Mandi Slump"},
        "expected_realistic": {"yield_mult": 1.00, "price_mult": 1.00, "name": "Expected / Realistic Benchmark"},
        "optimistic_high": {"yield_mult": 1.20, "price_mult": 1.15, "name": "Optimistic / Premium Quality & Direct Market"},
    }

    scenarios: Dict[str, FinancialScenario] = {}
    acres = req.farm_area_hectares * 2.47105

    for key, sc in scenarios_multipliers.items():
        ym = sc["yield_mult"]
        pm = sc["price_mult"]

        main_rev = round((base_main_yield_kg * ym) * (base_main_price * pm), 2)
        inter_rev = round((base_inter_yield_kg * ym) * (base_inter_price * pm), 2)
        total_rev = round(main_rev + inter_rev, 2)
        net_prof = round(total_rev - total_opex, 2)
        prof_per_ha = round(net_prof / req.farm_area_hectares, 2)
        prof_per_acre = round(net_prof / acres, 2)

        # ROI = (Net Profit / Total Investment) * 100
        investment_base = max(total_capex + total_opex, 1000.0)
        roi = round((net_prof / investment_base) * 100.0, 1)

        # Break-even in months (crop duration approx 9 months)
        be_months = round((investment_base / (total_rev / 9.0)), 1) if total_rev > 0 else 0.0

        scenarios[key] = FinancialScenario(
            scenario_name=sc["name"],
            main_crop_revenue_inr=main_rev,
            intercrop_revenue_inr=inter_rev,
            total_gross_revenue_inr=total_rev,
            total_operating_expenses_inr=total_opex,
            net_profit_inr=net_prof,
            profit_per_acre_inr=prof_per_acre,
            profit_per_hectare_inr=prof_per_ha,
            roi_pct=roi,
            break_even_months=min(be_months, 24.0),
        )

    # Monoculture comparison
    mono_rev = round(base_main_yield_kg * base_main_price, 2)
    mono_net = round(mono_rev - base_main_opex, 2)
    hybrid_net = scenarios["expected_realistic"].net_profit_inr
    incremental_gain = round(hybrid_net - mono_net, 2)
    gain_pct = round((incremental_gain / mono_net) * 100.0, 1) if mono_net > 0 else 100.0

    return ProfitEstimateResponse(
        main_crop=req.main_crop,
        intercrop=req.intercrop,
        farm_area_hectares=req.farm_area_hectares,
        initial_capital_investment_inr=total_capex,
        operating_expenses_breakdown=opex_breakdown,
        scenarios=scenarios,
        hybrid_gain_vs_monoculture={
            "monoculture_net_profit_inr": mono_net,
            "hybrid_net_profit_inr": hybrid_net,
            "additional_net_profit_inr": incremental_gain,
            "percentage_income_increase": gain_pct,
            "summary": (
                f"Integrating {req.intercrop} into your {req.farm_area_hectares} ha {req.main_crop} plantation "
                f"generates an estimated additional net profit of INR {incremental_gain:,.0f} (+{gain_pct}% increase) "
                f"from the same land parcel."
            ),
        },
        financial_assumptions=[
            f"Farm area: {req.farm_area_hectares} ha ({acres:.1f} acres).",
            f"Intercrop utilizes 60% of plantation floor between {req.main_crop} rows.",
            "Yields based on ICAR-CPCRI and TNAU agronomic field trials under drip fertigation.",
            "Prices based on recent 3-year Agmarknet mandi modal benchmarks.",
            "No double-counting of existing fixed land or borewell infrastructure costs.",
        ],
    )


# -------------------------------------------------------------------------
# Phase 8: Value-Added Product Opportunity & Processing Profitability
# -------------------------------------------------------------------------

def get_value_added_products(crop_id_or_name: str) -> List[ProductOpportunity]:
    """Retrieves all processed and value-added product opportunities for a crop."""
    products_catalog = load_value_added_products_catalog()
    clean = crop_id_or_name.strip().lower().replace(" ", "-")

    matched_list = products_catalog.get(clean, [])
    if not matched_list:
        # Check by crop_id partial
        for k, v in products_catalog.items():
            if clean in k or k in clean:
                matched_list = v
                break

    output: List[ProductOpportunity] = []
    for p in matched_list:
        output.append(
            ProductOpportunity(
                product_id=p["product_id"],
                product_name=p["product_name"],
                crop_id=p["crop_id"],
                processing_stage=p["processing_stage"],
                processing_scale=p["processing_scale"],
                raw_input_kg=p["raw_input_kg"],
                recovery_rate_pct=p["recovery_rate_pct"],
                output_product_kg=p["output_product_kg"],
                processing_method=p["processing_method"],
                equipment_required=p["equipment_required"],
                processing_cost_per_kg_input_inr=p["processing_cost_per_kg_input_inr"],
                packaging_cost_per_kg_output_inr=p["packaging_cost_per_kg_output_inr"],
                typical_farmgate_price_per_kg_inr=p["typical_farmgate_price_per_kg_inr"],
                typical_selling_price_per_kg_inr=p["typical_selling_price_per_kg_inr"],
                gross_margin_pct=p["gross_margin_pct"],
                licenses_required=p["licenses_required"],
                limitations=p["limitations"],
            )
        )
    return output


def compare_raw_vs_processed(req: RawVsProcessedRequest) -> RawVsProcessedResponse:
    """
    Compares selling raw agricultural harvest at farmgate vs processing into
    primary or secondary value-added products.
    Enforces strict physical mass balance: finished output = raw harvest * (recovery_rate / 100).
    """
    products_catalog = load_value_added_products_catalog()
    clean = req.crop_id.strip().lower().replace(" ", "-")

    product_models = products_catalog.get(clean, [])
    if not product_models:
        for k, v in products_catalog.items():
            if clean in k or k in clean:
                product_models = v
                clean = k
                break

    if not product_models:
        raise ValueError(f"No value-added product models found for crop '{req.crop_id}'")

    raw_base_model = product_models[0]
    raw_farmgate_price = req.custom_raw_price_per_kg or raw_base_model.get("typical_farmgate_price_per_kg_inr", 30.0)

    # Option 1: Baseline raw farmgate sale
    raw_gross_revenue = round(req.harvest_quantity_kg * raw_farmgate_price, 2)
    raw_costs = round(req.harvest_quantity_kg * raw_base_model.get("processing_cost_per_kg_input_inr", 1.5), 2)
    raw_net_profit = round(raw_gross_revenue - raw_costs, 2)

    comparison_options: List[ProcessingOption] = []

    for p in product_models:
        recovery_pct = p.get("recovery_rate_pct", 100.0)
        # Strict physical mass conversion
        finished_kg = round(req.harvest_quantity_kg * (recovery_pct / 100.0), 2)

        selling_price = p.get("typical_selling_price_per_kg_inr", 100.0)
        gross_rev = round(finished_kg * selling_price, 2)

        # Processing expenses
        proc_cost = round(req.harvest_quantity_kg * p.get("processing_cost_per_kg_input_inr", 3.0), 2)
        pkg_cost = round(finished_kg * p.get("packaging_cost_per_kg_output_inr", 5.0), 2)
        total_proc_expenses = round(proc_cost + pkg_cost, 2)

        # Opportunity cost of raw harvest
        raw_opp_cost = raw_gross_revenue

        net_profit = round(gross_rev - total_proc_expenses, 2)
        profit_gain_over_raw = round(net_profit - raw_net_profit, 2)
        profit_gain_pct = round((profit_gain_over_raw / raw_net_profit) * 100.0, 1) if raw_net_profit > 0 else 0.0

        comparison_options.append(
            ProcessingOption(
                option_id=p.get("product_id"),
                option_name=p.get("product_name"),
                processing_stage=p.get("processing_stage"),
                processing_scale=p.get("processing_scale"),
                raw_input_kg=req.harvest_quantity_kg,
                recovery_rate_pct=recovery_pct,
                finished_product_kg=finished_kg,
                selling_price_per_unit_inr=selling_price,
                gross_revenue_inr=gross_rev,
                raw_material_opportunity_cost_inr=raw_opp_cost,
                processing_costs_inr=proc_cost,
                packaging_costs_inr=pkg_cost,
                total_processing_expenses_inr=total_proc_expenses,
                net_profit_inr=net_profit,
                profit_gain_over_raw_inr=profit_gain_over_raw,
                profit_gain_pct=profit_gain_pct,
                equipment_needed=p.get("equipment_required", "Standard processing equipment"),
                licenses_required=p.get("licenses_required", "FSSAI Registration"),
            )
        )

    # Sort options by net profit descending
    best_option = max(comparison_options, key=lambda x: x.net_profit_inr)
    recommended_strategy = f"{best_option.option_name} ({best_option.processing_scale})"
    advisory = (
        f"Processing {req.harvest_quantity_kg:,.0f} kg of raw {clean.title()} into {best_option.option_name} "
        f"yields {best_option.finished_product_kg:,.0f} kg of finished goods, generating INR {best_option.net_profit_inr:,.0f} "
        f"net profit (an additional INR {best_option.profit_gain_over_raw_inr:,.0f} or +{best_option.profit_gain_pct}% over raw mandi selling)."
    )

    return RawVsProcessedResponse(
        crop_name=clean.title(),
        harvest_quantity_kg=req.harvest_quantity_kg,
        comparison_options=comparison_options,
        recommended_strategy=recommended_strategy,
        strategic_advisory=advisory,
    )
