"""
Adaptive Irrigation Options & Comparison Engine
------------------------------------------------
Evaluates farm-specific suitability of modern and improved irrigation methods:
  - Drip Irrigation
  - Sprinkler Irrigation
  - Surface / Furrow Irrigation
  - Improved Existing System (Pressure regulation, nozzle replacement, filtration)
  - Better Irrigation Scheduling (Night-time / low-ET0 irrigation, regulated deficit)
  - Irrigation Zoning (Soil texture & canopy grouping)
  - Leak & Distribution-Loss Reduction (Canal lining, pipe joint repair)
  - Mulching & Soil Moisture Conservation (Organic / biodegradable plastic mulch)

Transparent rule-based scoring based on FAO-56 and ICAR water management standards.
"""

import math
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.farm import FarmModel
from app.schemas.adaptive_irrigation import (
    IrrigationOptionsRequest,
    IrrigationOptionItem,
    IrrigationOptionsResponse,
    IrrigationCompareRequest,
    IrrigationCompareItem,
    IrrigationCompareResponse,
)

# Reference application efficiencies based on FAO-56 Irrigation & Drainage Paper
EFFICIENCY_BENCHMARKS = {
    "Drip Irrigation": 0.90,
    "Sprinkler Irrigation": 0.75,
    "Surface / Flood Irrigation": 0.50,
    "Surface / Furrow Irrigation": 0.60,
    "Improved Existing System": 0.68,
    "Better Irrigation Scheduling": 0.60,
    "Irrigation Zoning": 0.72,
    "Leak & Distribution-Loss Reduction": 0.65,
    "Mulching & Soil Moisture Conservation": 0.65,
}

# Indicative capital investment per hectare (INR) under Indian PMKSY subsidy norms
INDICATIVE_CAPITAL_COST_INR_PER_HA = {
    "Drip Irrigation": 65000.0,
    "Sprinkler Irrigation": 38000.0,
    "Surface / Flood Irrigation": 6000.0,
    "Surface / Furrow Irrigation": 9000.0,
    "Improved Existing System": 5000.0,
    "Better Irrigation Scheduling": 0.0,
    "Irrigation Zoning": 8500.0,
    "Leak & Distribution-Loss Reduction": 3500.0,
    "Mulching & Soil Moisture Conservation": 14000.0,
}


def evaluate_irrigation_options(
    req: IrrigationOptionsRequest, db: Optional[Session] = None
) -> IrrigationOptionsResponse:
    """
    Evaluates and ranks all practical irrigation methods and improvements
    against crop, soil, terrain, water availability, and farmer constraints.
    """
    missing_info: List[str] = []
    warnings: List[str] = []

    # 1. Resolve defaults from FarmModel if farm_id provided
    farm = None
    if req.farm_id is not None and db is not None:
        farm = db.query(FarmModel).filter(FarmModel.id == req.farm_id).first()
        if not farm:
            warnings.append(f"Farm ID {req.farm_id} not found in database; using provided request parameters.")

    crop_name = req.crop or (farm.crop if farm else None) or "Tomato"
    if not req.crop and not farm:
        missing_info.append("crop (defaulted to Tomato)")

    soil_type = req.soil_type or (farm.soil_type if farm else None) or "Red Sandy Loam"
    if not req.soil_type and not farm:
        missing_info.append("soil_type (defaulted to Red Sandy Loam)")

    farm_area = req.farm_area_hectares or (farm.farm_area_hectares if farm else None) or 1.0
    if not req.farm_area_hectares and not farm:
        missing_info.append("farm_area_hectares (defaulted to 1.0 ha)")

    current_method = req.existing_irrigation_method or (farm.irrigation_method if farm else None) or "Surface / Flood Irrigation"

    water_avail = (req.water_availability or "Moderate").capitalize()
    slope = req.terrain_slope or "Flat (0-2%)"
    power_avail = req.pump_electricity_availability or "Reliable Grid 6+ hrs"
    labor_avail = (req.labor_availability or "Moderate").capitalize()

    # Calculate data completeness metric
    tracked_inputs = [
        bool(req.crop or (farm and farm.crop)),
        bool(req.soil_type or (farm and farm.soil_type)),
        bool(req.farm_area_hectares or (farm and farm.farm_area_hectares)),
        bool(req.water_availability),
        bool(req.terrain_slope),
        bool(req.pump_electricity_availability),
        bool(req.budget_limit_inr),
        bool(req.water_source),
    ]
    completeness_score = round(sum(tracked_inputs) / len(tracked_inputs), 2)

    # 2. Evaluate all 8 options
    evaluated_options: List[IrrigationOptionItem] = []

    # --- Option 1: Drip Irrigation ---
    drip_score, drip_expl, drip_limits = _score_drip(
        crop_name, soil_type, slope, water_avail, power_avail, req.budget_limit_inr, farm_area, req.constraints
    )
    drip_cost = _get_cost(
        "Drip Irrigation", farm_area, req.user_cost_assumptions, req.budget_limit_inr
    )
    evaluated_options.append(
        IrrigationOptionItem(
            method="Drip Irrigation",
            category="Capital System Upgrade",
            suitability_score=drip_score,
            score_explanation=drip_expl,
            why_recommended=(
                f"Delivers water directly to the active root zone with ~90% application efficiency. "
                f"Saves 35-50% water compared to surface flood, making it optimal for {crop_name} under {water_avail.lower()} water availability."
            ),
            limitations=drip_limits,
            required_inputs=["1.5 - 2.5 bar operating pressure", "Screen / disc filter system", "Laterals with drippers matching plant spacing"],
            installation_requirements=["Head control unit with fertigation venturi", "PVC mainline & sub-mains", "Pressure regulating valves"],
            maintenance_requirements=["Periodic lateral flushing (every 15 days)", "Acid/chlorine treatment for emitter clogging", "Filter backwashing"],
            estimated_cost=drip_cost,
            estimated_water_impact={
                "efficiency_pct": 90.0,
                "water_saving_vs_flood_pct": 44.4,
                "evaporation_loss_rating": "Minimal",
                "deep_percolation_loss": "Negligible",
            },
            confidence_or_data_completeness=completeness_score,
            next_steps=["Survey field elevation and water source location", "Calculate dripper discharge and pump operating head", "Apply for PMKSY / state micro-irrigation subsidy (up to 45-55%)"],
        )
    )

    # --- Option 2: Sprinkler Irrigation ---
    sprinkler_score, sprinkler_expl, sprinkler_limits = _score_sprinkler(
        crop_name, soil_type, slope, water_avail, power_avail, req.budget_limit_inr, farm_area, req.constraints
    )
    sprinkler_cost = _get_cost(
        "Sprinkler Irrigation", farm_area, req.user_cost_assumptions, req.budget_limit_inr
    )
    evaluated_options.append(
        IrrigationOptionItem(
            method="Sprinkler Irrigation",
            category="Capital System Upgrade",
            suitability_score=sprinkler_score,
            score_explanation=sprinkler_expl,
            why_recommended=(
                "Simulates natural rainfall over dense crops with ~75% efficiency. "
                "Copes well with undulating terrain without extensive land grading."
            ),
            limitations=sprinkler_limits,
            required_inputs=["2.5 - 4.0 bar pump pressure", "Clean or filtered water", "HDPE quick-coupling pipes and risers"],
            installation_requirements=["Booster pump or sufficient head", "Overlapping nozzle layout for 100% uniformity coefficient"],
            maintenance_requirements=["Nozzle wear inspection", "Washer replacement", "Sprinkler riser vertical alignment check"],
            estimated_cost=sprinkler_cost,
            estimated_water_impact={
                "efficiency_pct": 75.0,
                "water_saving_vs_flood_pct": 25.0,
                "evaporation_loss_rating": "Moderate (higher in windy/afternoon conditions)",
                "deep_percolation_loss": "Low",
            },
            confidence_or_data_completeness=completeness_score,
            next_steps=["Verify pump pressure curve satisfies 2.5+ bar at the furthest nozzle", "Check local wind speeds during intended watering hours"],
        )
    )

    # --- Option 3: Surface / Furrow Irrigation ---
    furrow_score, furrow_expl, furrow_limits = _score_furrow(
        crop_name, soil_type, slope, water_avail, farm_area, req.constraints
    )
    furrow_cost = _get_cost(
        "Surface / Furrow Irrigation", farm_area, req.user_cost_assumptions, req.budget_limit_inr
    )
    evaluated_options.append(
        IrrigationOptionItem(
            method="Surface / Furrow Irrigation",
            category="Traditional / Low-Cost Improvement",
            suitability_score=furrow_score,
            score_explanation=furrow_expl,
            why_recommended=(
                "Inexpensive gravity-fed channel irrigation with zero pressurized energy needs. "
                "Furrowing concentrates water along crop rows rather than flooding entire beds."
            ),
            limitations=furrow_limits,
            required_inputs=["Precise land leveling (0.1 - 0.5% grade)", "Continuous labor for channel management", "Adequate water volume per irrigation turn"],
            installation_requirements=["Tractor ridger/bed former", "Siphon tubes or gated pipe for uniform inflow"],
            maintenance_requirements=["Weeding furrow channels", "Erosion repair and silt clearing"],
            estimated_cost=furrow_cost,
            estimated_water_impact={
                "efficiency_pct": 60.0,
                "water_saving_vs_flood_pct": 16.7,
                "evaporation_loss_rating": "High",
                "deep_percolation_loss": "High in sandy soil, Moderate in clay",
            },
            confidence_or_data_completeness=completeness_score,
            next_steps=["Construct ridge-and-furrow beds with consistent longitudinal grade", "Use siphon pipes to regulate inflow and prevent channel scouring"],
        )
    )

    # --- Option 4: Improved Existing System ---
    improved_score, improved_expl, improved_limits = _score_improved_existing(
        current_method, soil_type, water_avail
    )
    improved_cost = _get_cost(
        "Improved Existing System", farm_area, req.user_cost_assumptions, req.budget_limit_inr
    )
    evaluated_options.append(
        IrrigationOptionItem(
            method="Improved Existing System",
            category="Operational Improvement",
            suitability_score=improved_score,
            score_explanation=improved_expl,
            why_recommended=(
                f"Optimizes your current {current_method} without discarding existing infrastructure. "
                "Pressure regulation, leak sealing, and clean filters typically recover 10-18% wasted water."
            ),
            limitations=improved_limits,
            required_inputs=["Pressure gauge at pump head and line ends", "Flow meter or runtime calibration", "Replacement gaskets and seals"],
            installation_requirements=["Pressure regulating valves", "Sub-main flow control shut-offs"],
            maintenance_requirements=["Monthly pressure calibration", "Quarterly chemical clean of emitters/jets"],
            estimated_cost=improved_cost,
            estimated_water_impact={
                "efficiency_pct": 68.0,
                "water_saving_vs_flood_pct": 18.0,
                "evaporation_loss_rating": "Dependent on baseline",
                "deep_percolation_loss": "Reduced by 20% through uniform pressure",
            },
            confidence_or_data_completeness=completeness_score,
            next_steps=["Perform catch-can uniformity test across field quadrants", "Replace damaged drippers/sprinkler nozzles with uniform discharge parts"],
        )
    )

    # --- Option 5: Better Irrigation Scheduling ---
    sched_score = 92.0
    sched_expl = [
        "Eliminates midday evaporation losses by scheduling irrigation early morning (5:00 - 8:00 AM) or night (7:00 - 10:00 PM).",
        "Uses FAO-56 Penman-Monteith depletion triggering rather than fixed calendar intervals.",
        "Zero capital expenditure required.",
    ]
    evaluated_options.append(
        IrrigationOptionItem(
            method="Better Irrigation Scheduling",
            category="Operational Improvement",
            suitability_score=sched_score,
            score_explanation=sched_expl,
            why_recommended=(
                "Immediately reduces unproductive water evaporation by 12-20% at zero capital cost. "
                "Aligns irrigation events with actual soil moisture depletion thresholds."
            ),
            limitations=["Requires farmer discipline to monitor trigger thresholds", "Night irrigation requires reliable electricity or automation"],
            required_inputs=["Tensiometer, soil moisture sensor, or backend app daily depletion advisory", "Automated timer switch (optional)"],
            installation_requirements=["None (Zero capital required)"],
            maintenance_requirements=["Review weather forecasts weekly for rain deferrals"],
            estimated_cost={"cost_inr": 0.0, "cost_type": "operational_practice", "is_user_assumption": False},
            estimated_water_impact={
                "efficiency_pct": 60.0,
                "water_saving_vs_flood_pct": 15.0,
                "evaporation_loss_rating": "Significantly reduced (transpiration optimized)",
                "deep_percolation_loss": "Avoided by matching depth to root zone capacity",
            },
            confidence_or_data_completeness=completeness_score,
            next_steps=["Shift watering times to before 8:00 AM or after 6:30 PM", "Follow the backend daily dashboard 'Irrigate Today: YES/NO' trigger"],
        )
    )

    # --- Option 6: Irrigation Zoning ---
    zoning_score, zoning_expl = _score_zoning(farm_area, soil_type, slope)
    zoning_cost = _get_cost(
        "Irrigation Zoning", farm_area, req.user_cost_assumptions, req.budget_limit_inr
    )
    evaluated_options.append(
        IrrigationOptionItem(
            method="Irrigation Zoning",
            category="Operational Improvement",
            suitability_score=zoning_score,
            score_explanation=zoning_expl,
            why_recommended=(
                "Divides farm into distinct hydraulic zones based on soil texture, crop age, and pump discharge. "
                "Ensures adequate operating pressure and prevents over-watering near the pump."
            ),
            limitations=["Requires manual valve shifting unless automated solenoid valves are installed"],
            required_inputs=["Division into 2-4 sub-blocks", "Isolation ball valves at each sub-main"],
            installation_requirements=["Tee-joints and ball valves at each lateral manifold"],
            maintenance_requirements=["Inspect valve packing annually for leakage"],
            estimated_cost=zoning_cost,
            estimated_water_impact={
                "efficiency_pct": 72.0,
                "water_saving_vs_flood_pct": 20.0,
                "evaporation_loss_rating": "Low",
                "deep_percolation_loss": "Minimized across varying soil blocks",
            },
            confidence_or_data_completeness=completeness_score,
            next_steps=["Map farm blocks with different crop stages or soil textures", "Install isolation valves to operate zones sequentially"],
        )
    )

    # --- Option 7: Leak & Distribution-Loss Reduction ---
    leak_score = 88.0
    leak_expl = [
        "Unlined earthen channels lose 20-35% of water to conveyance seepage before reaching crops.",
        "Leaky PVC pipe joints, cracked hoses, and punctured laterals create chronic water waste.",
        "Fast payback with immediate volume recovery.",
    ]
    leak_cost = _get_cost(
        "Leak & Distribution-Loss Reduction", farm_area, req.user_cost_assumptions, req.budget_limit_inr
    )
    evaluated_options.append(
        IrrigationOptionItem(
            method="Leak & Distribution-Loss Reduction",
            category="Operational Improvement",
            suitability_score=leak_score,
            score_explanation=leak_expl,
            why_recommended=(
                "Directly recovers 15-30% of pumped water currently lost in conveyance. "
                "Fixing mainline leaks and unlined channels immediately boosts delivery pressure."
            ),
            limitations=["Requires continuous diligence after heavy machinery operations or rodent damage"],
            required_inputs=["PVC pipe joiners, plumber's solvent, rubber gaskets, LDPE patches"],
            installation_requirements=["Repair cracked pipe sections and replace perished washers"],
            maintenance_requirements=["Walk mainlines during first 15 minutes of every irrigation turn"],
            estimated_cost=leak_cost,
            estimated_water_impact={
                "efficiency_pct": 65.0,
                "water_saving_vs_flood_pct": 22.0,
                "evaporation_loss_rating": "Moderate",
                "deep_percolation_loss": "Seepage completely eliminated along main conveyance lines",
            },
            confidence_or_data_completeness=completeness_score,
            next_steps=["Pressurize system and walk lines to mark damp spots", "Wrap earthen delivery channels with UV-stabilized polythene sheets if piped conveyance is unavailable"],
        )
    )

    # --- Option 8: Mulching & Soil Moisture Conservation ---
    mulch_score, mulch_expl = _score_mulching(crop_name, soil_type, water_avail)
    mulch_cost = _get_cost(
        "Mulching & Soil Moisture Conservation", farm_area, req.user_cost_assumptions, req.budget_limit_inr
    )
    evaluated_options.append(
        IrrigationOptionItem(
            method="Mulching & Soil Moisture Conservation",
            category="Field Conservation",
            suitability_score=mulch_score,
            score_explanation=mulch_expl,
            why_recommended=(
                "Reduces bare-soil evaporation by 30-45%, moderates root-zone soil temperatures, and suppresses weeds. "
                "Extends the allowable interval between irrigations by 2 to 4 days."
            ),
            limitations=["Organic mulch can harbor field mice/termites if kept directly against tree bark", "Plastic mulch requires safe disposal"],
            required_inputs=["Paddy straw, coconut husk, sugarcane bagasse, or 25-micron silver-black plastic mulch"],
            installation_requirements=["Spread 7-10 cm organic layer around plant basins, leaving 5 cm collar around stem"],
            maintenance_requirements=["Replenish organic mulch every 3-4 months as it breaks down into organic humus"],
            estimated_cost=mulch_cost,
            estimated_water_impact={
                "efficiency_pct": 65.0,
                "water_saving_vs_flood_pct": 28.0,
                "evaporation_loss_rating": "Drastically reduced soil surface evaporation",
                "deep_percolation_loss": "No change to percolation; preserves stored capillary water",
            },
            confidence_or_data_completeness=completeness_score,
            next_steps=["Procure local crop residue (paddy straw, coconut fronds, or dried grass)", "Apply mulch immediately following the next irrigation event"],
        )
    )

    # 3. Sort options descending by suitability score
    evaluated_options.sort(key=lambda x: x.suitability_score, reverse=True)
    top_option = evaluated_options[0].method

    return IrrigationOptionsResponse(
        farm_id=req.farm_id,
        crop=crop_name,
        farm_area_hectares=farm_area,
        current_method=current_method,
        recommended_option=top_option,
        ranking_method="Multi-Factor Rule-Based Agronomic Evaluation",
        data_completeness={
            "score": completeness_score,
            "status": "High" if completeness_score >= 0.75 else ("Medium" if completeness_score >= 0.5 else "Partial"),
            "evaluated_factors": ["crop_type", "soil_texture", "terrain_slope", "water_availability", "electricity_reliability", "capital_budget"],
        },
        missing_information=missing_info,
        warnings=warnings,
        options=evaluated_options,
        source_metadata={
            "engine": "AGR002 Adaptive Irrigation Options Engine v1.0",
            "standards": ["FAO-56 Irrigation and Drainage Paper", "ICAR Micro-Irrigation Handbook", "PMKSY Benchmark Norms"],
        },
    )


def compare_irrigation_methods(
    req: IrrigationCompareRequest, db: Optional[Session] = None
) -> IrrigationCompareResponse:
    """
    Compares the farm's current irrigation method against one or more alternative methods
    in terms of application efficiency, water savings %, capital investment, and labor.
    """
    crop_name = req.crop or "Tomato"
    soil_type = req.soil_type or "Red Sandy Loam"
    area_ha = req.farm_area_hectares or 1.0

    current_item = _build_compare_item(
        req.current_method, req.current_method, crop_name, soil_type, area_ha, req.user_cost_assumptions
    )

    alternatives = []
    for alt_method in req.comparison_methods:
        if alt_method.strip().lower() == req.current_method.strip().lower():
            continue
        item = _build_compare_item(
            alt_method, req.current_method, crop_name, soil_type, area_ha, req.user_cost_assumptions
        )
        alternatives.append(item)

    # Key tradeoffs analysis
    tradeoffs = [
        "Modern pressurized systems (Drip/Sprinkler) require higher initial capital investment but drastically reduce operational labor and pumping electricity.",
        "Surface and flood systems incur near-zero capital costs but waste 40-50% of pumped water through percolation and evaporation.",
        "Operational practices (Scheduling, Zoning, Mulching) deliver 15-25% immediate water savings with minimal or zero capital outlay.",
    ]

    verdict = (
        f"For {crop_name} in {soil_type}, transitioning from {req.current_method} to "
        f"{alternatives[0].method if alternatives else 'Drip Irrigation'} yields significant water conservation and yield stability."
    )

    return IrrigationCompareResponse(
        crop=crop_name,
        soil_type=soil_type,
        farm_area_hectares=area_ha,
        current_method_assessment=current_item,
        alternative_comparisons=alternatives,
        key_tradeoffs=tradeoffs,
        overall_verdict=verdict,
        data_completeness_pct=85.0,
    )


# -------------------------------------------------------------------------
# Scoring Helpers
# -------------------------------------------------------------------------

def _score_drip(
    crop: str, soil: str, slope: str, water: str, power: str, budget: Optional[float], area: float, constraints: Optional[List[str]]
) -> Tuple[float, List[str], List[str]]:
    score = 85.0
    expl = []
    limits = []

    c_clean = crop.lower()
    s_clean = soil.lower()

    # Crop fit
    if any(k in c_clean for k in ["tomato", "coconut", "banana", "papaya", "pepper", "vegetable", "cotton", "orchard"]):
        score += 10
        expl.append(f"Drip is the global gold standard for {crop}, maximizing yield and fruit uniformity.")
    elif any(k in c_clean for k in ["rice", "wheat"]):
        score -= 20
        limits.append(f"{crop} requires high-density broadcast sowing where conventional drip laterals have high per-hectare piping cost.")

    # Soil fit
    if "sandy" in s_clean:
        score += 8
        expl.append("Sandy soil has high percolation rates; drip prevents deep leaching losses.")
    elif "clay" in s_clean:
        expl.append("Clay soil requires lower emitter discharge rates (1.0 - 2.0 L/h) to prevent surface ponding.")

    # Slope fit
    if "steep" in slope.lower() or "undulating" in slope.lower():
        score += 8
        expl.append("Pressure-compensating drip emitters maintain uniform delivery on steep/undulating ground.")

    # Water scarcity
    if water in ("Scarce", "Critical"):
        score += 10
        expl.append("Crucial for severe water scarcity: 90% efficiency maximizes yield per cubic metre.")

    # Power availability
    if "solar" in power.lower():
        score += 5
        expl.append("Compatible with solar DC pump operating heads (1.5 - 2.0 bar).")
    elif "no pump" in power.lower():
        score -= 15
        limits.append("Requires gravity head tank (minimum 5m elevation) or small booster pump to operate drippers.")

    # Budget check
    est_cost = INDICATIVE_CAPITAL_COST_INR_PER_HA["Drip Irrigation"] * area
    if budget is not None and budget < est_cost:
        score -= 15
        limits.append(f"Estimated capital outlay (Rs. {int(est_cost):,}) exceeds budget (Rs. {int(budget):,}); government subsidy or phased installation recommended.")

    limits.append("Susceptible to emitter clogging if water contains high dissolved iron, carbonates, or organic algae.")
    return min(99.0, max(20.0, score)), expl, limits


def _score_sprinkler(
    crop: str, soil: str, slope: str, water: str, power: str, budget: Optional[float], area: float, constraints: Optional[List[str]]
) -> Tuple[float, List[str], List[str]]:
    score = 75.0
    expl = []
    limits = []

    c_clean = crop.lower()
    s_clean = soil.lower()

    if any(k in c_clean for k in ["groundnut", "wheat", "maize", "pulses", "gram", "soybean", "pasture"]):
        score += 12
        expl.append(f"Sprinkler is highly suitable for close-spaced {crop}, providing uniform moisture.")
    elif any(k in c_clean for k in ["tomato", "cotton", "chilli"]):
        score -= 12
        limits.append("Overhead canopy wetting can promote foliar fungal blights and wash off protective biocontrols.")

    if "clay" in s_clean:
        score -= 8
        limits.append("Heavy clay soil has slow infiltration; sprinkler precipitation rate must not exceed soil intake to avoid runoff.")

    if "steep" in slope.lower():
        score -= 10
        limits.append("Risk of surface runoff and soil erosion on steep slopes.")

    if water in ("Scarce", "Critical"):
        score -= 8
        limits.append("Moderate evaporation losses in high heat/wind reduce water efficiency compared to drip.")

    est_cost = INDICATIVE_CAPITAL_COST_INR_PER_HA["Sprinkler Irrigation"] * area
    if budget is not None and budget < est_cost:
        score -= 10
        limits.append(f"Estimated cost (Rs. {int(est_cost):,}) exceeds budget (Rs. {int(budget):,}).")

    return min(95.0, max(25.0, score)), expl, limits


def _score_furrow(
    crop: str, soil: str, slope: str, water: str, area: float, constraints: Optional[List[str]]
) -> Tuple[float, List[str], List[str]]:
    score = 55.0
    expl = []
    limits = []

    s_clean = soil.lower()

    if "sandy" in s_clean:
        score -= 20
        limits.append("Sandy soil causes extreme deep percolation losses in open channels (up to 50% water loss).")
    elif "loam" in s_clean or "clay" in s_clean:
        score += 8
        expl.append("Loam and clay soils allow water to spread laterally across ridge beds effectively.")

    if "steep" in slope.lower() or "undulating" in slope.lower():
        score -= 25
        limits.append("Disqualified on steep slopes due to high soil erosion and furrow breaches.")
    else:
        expl.append("Works on gently graded or flat ground without expensive pipe networks.")

    if water in ("Scarce", "Critical"):
        score -= 20
        limits.append("Unsuitable under acute water scarcity due to lower conveyance and application efficiency (~60%).")

    limits.append("Requires continuous manual weeding, channel maintenance, and active labor during each irrigation event.")
    return min(80.0, max(20.0, score)), expl, limits


def _score_improved_existing(current: str, soil: str, water: str) -> Tuple[float, List[str], List[str]]:
    score = 80.0
    expl = [
        "Inexpensive intervention that recovers 12-18% of previously lost irrigation volume.",
        "Preserves existing capital assets while resolving pressure imbalances.",
    ]
    limits = [
        "Will not exceed the inherent physical efficiency ceiling of the underlying system architecture."
    ]
    if "flood" in current.lower():
        expl.append("Adding furrow dividers and siphon tubes to flood basins immediately cuts conveyance waste.")
    return score, expl, limits


def _score_zoning(area: float, soil: str, slope: str) -> Tuple[float, List[str]]:
    score = 78.0
    expl = [
        "Splitting field into smaller zones ensures consistent operating pressure at every nozzle.",
        "Allows prioritizing water to stressed sections when pump runtime is limited by power cuts.",
    ]
    if area >= 1.5:
        score += 10
        expl.append(f"Subdividing a {area} ha farm prevents pump pressure collapse.")
    return score, expl


def _score_mulching(crop: str, soil: str, water: str) -> Tuple[float, List[str]]:
    score = 84.0
    expl = [
        "Drastically curtails direct soil evaporation, preserving moisture in the root zone.",
        "Suppresses weed competition, leaving more water and nutrients for crops.",
    ]
    if water in ("Scarce", "Critical"):
        score += 8
        expl.append("Essential conservation practice during moisture deficits to stretch irrigation intervals.")
    return score, expl


def _get_cost(
    method: str, area_ha: float, user_assumptions: Optional[Dict[str, float]], budget: Optional[float]
) -> Dict[str, Any]:
    if user_assumptions and method in user_assumptions:
        rate = float(user_assumptions[method])
        return {
            "total_estimated_inr": round(rate * area_ha, 2),
            "rate_per_ha_inr": rate,
            "cost_basis": "user_provided_assumption",
            "is_user_assumption": True,
            "notes": "Cost calculated directly from your custom cost-per-hectare assumption.",
        }

    base_rate = INDICATIVE_CAPITAL_COST_INR_PER_HA.get(method)
    if base_rate is None or base_rate == 0.0:
        return {
            "total_estimated_inr": 0.0,
            "rate_per_ha_inr": 0.0,
            "cost_basis": "zero_capital_operational_practice",
            "is_user_assumption": False,
            "notes": "Zero capital requirement; practice involves labor and operational timing adjustments.",
        }

    total = round(base_rate * area_ha, 2)
    return {
        "total_estimated_inr": total,
        "rate_per_ha_inr": base_rate,
        "cost_basis": "PMKSY_benchmark_estimate",
        "is_user_assumption": False,
        "notes": "Indicative capital cost before state/central micro-irrigation subsidies (subsidies range from 45% to 55%).",
    }


def _build_compare_item(
    method: str, current_method: str, crop: str, soil: str, area_ha: float, user_assumptions: Optional[Dict[str, float]]
) -> IrrigationCompareItem:
    eff = EFFICIENCY_BENCHMARKS.get(method, 0.60)
    current_eff = EFFICIENCY_BENCHMARKS.get(current_method, 0.50)
    water_saving = round(max(0.0, (eff - current_eff) / eff) * 100.0, 1)

    cost_dict = _get_cost(method, area_ha, user_assumptions, None)
    cost_val = cost_dict["total_estimated_inr"] if cost_dict["total_estimated_inr"] > 0 else None

    # Scores
    score_map = {
        "Drip Irrigation": 92.0,
        "Sprinkler Irrigation": 82.0,
        "Surface / Flood Irrigation": 48.0,
        "Surface / Furrow Irrigation": 65.0,
        "Improved Existing System": 78.0,
        "Better Irrigation Scheduling": 88.0,
        "Irrigation Zoning": 80.0,
        "Mulching & Soil Moisture Conservation": 85.0,
    }
    score = score_map.get(method, 70.0)
    tier = "Highly Recommended" if score >= 85 else ("Recommended" if score >= 70 else "Marginal")

    advantages_map = {
        "Drip Irrigation": ["90% water efficiency", "Direct root-zone delivery", "Compatible with fertigation", "Works on slopes"],
        "Sprinkler Irrigation": ["75% efficiency", "Covers close-growing crops", "Low labor during operation", "Frost protection"],
        "Surface / Flood Irrigation": ["Zero capital expenditure", "Simple gravity flow", "Flushes soil salts"],
        "Surface / Furrow Irrigation": ["Low capital investment", "Better than flood", "Easier row drainage"],
        "Improved Existing System": ["Low cost", "Recovers 12-18% water", "Fast installation"],
        "Better Irrigation Scheduling": ["Zero capital cost", "Cuts midday evaporation by 15%", "Immediate implementation"],
        "Irrigation Zoning": ["Equalizes pressure", "Prevents pump overload", "Allows prioritizing critical plots"],
        "Mulching & Soil Moisture Conservation": ["Cuts soil evaporation by 35%", "Suppresses weeds", "Moderates root temperature"],
    }

    limitations_map = {
        "Drip Irrigation": ["Higher capital cost", "Requires filtration to prevent emitter clogging", "Rodent damage risk"],
        "Sprinkler Irrigation": ["Higher pump pressure needed (2.5+ bar)", "Foliar disease risk for sensitive vegetables", "Wind drift losses"],
        "Surface / Flood Irrigation": ["Wastes 50% of water", "Severe weed growth", "Waterlogging and leaching risks"],
        "Surface / Furrow Irrigation": ["Labor intensive", "Erosion risk on slopes", "Seepage in sandy soils"],
        "Improved Existing System": ["Cannot exceed baseline efficiency ceiling", "Frequent seal checks needed"],
        "Better Irrigation Scheduling": ["Requires monitoring trigger advisories daily"],
        "Irrigation Zoning": ["Requires valve management unless automated"],
        "Mulching & Soil Moisture Conservation": ["Labor to spread biomass", "Plastic mulch disposal needed"],
    }

    return IrrigationCompareItem(
        method=method,
        suitability_score=score,
        suitability_tier=tier,
        application_efficiency_pct=eff * 100.0,
        water_saving_vs_current_pct=water_saving,
        estimated_capital_cost_inr=cost_val,
        cost_data_source=cost_dict["cost_basis"],
        operating_requirements="1.5 - 2.5 bar pressure" if "Drip" in method else ("2.5 - 4.0 bar pressure" if "Sprinkler" in method else "Gravity flow"),
        maintenance_complexity="Moderate" if "Drip" in method else ("Low to Moderate" if "Sprinkler" in method else "Low"),
        labor_intensity="Low" if ("Drip" in method or "Sprinkler" in method) else "High",
        key_advantages=advantages_map.get(method, ["Agronomic water improvement"]),
        critical_limitations=limitations_map.get(method, ["Requires periodic maintenance"]),
        recommendation_summary=f"{tier} method for {crop} in {soil} achieving {eff * 100.0:.0f}% application efficiency.",
    )
