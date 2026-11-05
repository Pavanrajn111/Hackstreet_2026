from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


# --- Phase 3: Hybrid Crop Recommendation ---

class CandidateCrop(BaseModel):
    crop_id: str
    crop_name: str
    compatibility_tier: str  # "Highly Compatible", "Moderately Compatible", "Marginal", "Not Recommended"
    compatibility_score: int  # 0 to 100
    canopy_layer: str
    shade_tolerance: str
    root_depth_separation: str
    water_synergy_and_competition: str
    nutrient_interaction: str
    recommended_planting_season: str
    usable_land_area_pct: float
    estimated_plant_density_per_ha: int
    estimated_yield_per_ha_kg: Dict[str, float]
    suitability_explanation: str
    risks_and_limitations: str
    data_source: str


class HybridRecommendRequest(BaseModel):
    farm_id: Optional[int] = Field(default=None, json_schema_extra={"example": 1})
    main_crop: str = Field(..., min_length=1, json_schema_extra={"example": "Coconut"})
    farm_area_hectares: float = Field(..., gt=0.0, le=100000.0, json_schema_extra={"example": 2.0})
    soil_type: Optional[str] = Field(default="Red Sandy Loam", json_schema_extra={"example": "Red Sandy Loam"})
    main_crop_age_years: Optional[int] = Field(default=8, ge=0, le=100, json_schema_extra={"example": 8})
    irrigation_method: Optional[str] = Field(default="Drip Irrigation", json_schema_extra={"example": "Drip Irrigation"})
    water_availability: Optional[str] = Field(default="Adequate", json_schema_extra={"example": "Adequate"})
    available_sunlight: Optional[str] = Field(default="Partial Shade", json_schema_extra={"example": "Partial Shade"})

    @field_validator("main_crop")
    @classmethod
    def clean_main_crop(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("main_crop cannot be empty")
        return s


class HybridRecommendResponse(BaseModel):
    main_crop: str
    farm_area_hectares: float
    usable_intercrop_area_hectares: float
    recommendations: List[CandidateCrop]
    agronomic_principles: str
    data_sources: List[str]


# --- Phase 4: Farm Layout & Sowing Pattern ---

class LayoutRequest(BaseModel):
    farm_id: Optional[int] = None
    farm_area_hectares: float = Field(..., gt=0.0, le=100000.0)
    main_crop: str = Field(..., min_length=1)
    intercrop: str = Field(..., min_length=1)
    farm_length_m: Optional[float] = Field(default=None, gt=0.0)
    farm_width_m: Optional[float] = Field(default=None, gt=0.0)
    planting_system: Optional[str] = Field(default="Multi-Tier Intercropping")
    custom_unusable_area_pct: Optional[float] = Field(default=10.0, ge=0.0, le=50.0)


class LayoutResponse(BaseModel):
    main_crop: str
    intercrop: str
    total_farm_area_sqm: float
    usable_cultivated_area_sqm: float
    main_crop_allocated_area_sqm: float
    intercrop_allocated_area_sqm: float
    main_crop_plant_count: int
    intercrop_plant_count: int
    main_crop_spacing: Dict[str, Any]
    intercrop_spacing: Dict[str, Any]
    planting_pattern_summary: str
    row_arrangement: Dict[str, Any]
    irrigation_line_layout: str
    planting_calendar: List[Dict[str, str]]
    limitations: List[str]


# --- Phase 5: Cultivation Guide ---

class CultivationStageItem(BaseModel):
    stage_number: int
    stage_name: str
    description: str


class CultivationGuideResponse(BaseModel):
    crop_id: str
    crop_name: str
    botanical_name: str
    season: str
    duration_days: int
    climate: Dict[str, Any]
    soil: Dict[str, Any]
    stages: List[CultivationStageItem]
    yield_potential: Dict[str, Any]
    data_source: str


# --- Phase 6: Hybrid Irrigation ---

class HybridIrrigationRequest(BaseModel):
    farm_id: Optional[int] = None
    farm_area_hectares: float = Field(..., gt=0.0, le=100000.0)
    main_crop: str = Field(..., min_length=1)
    intercrop: str = Field(..., min_length=1)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    soil_type: str = Field(default="Red Sandy Loam")
    irrigation_method: Optional[str] = Field(default="Drip Irrigation")
    pump_flow_rate_lpm: Optional[float] = Field(default=120.0, ge=0.0)


class HybridIrrigationScheduleDay(BaseModel):
    date: str
    day: str
    irrigate: bool
    action: str
    combined_depth_mm: float
    main_crop_depth_mm: float
    intercrop_depth_mm: float
    water_volume_litres: float
    runtime_minutes: int
    notes: Optional[str] = None


class HybridIrrigationResponse(BaseModel):
    main_crop: str
    intercrop: str
    combined_daily_etc_mm: float
    main_crop_etc_mm: float
    intercrop_etc_mm: float
    weighted_kc: float
    irrigate_today: bool
    recommended_depth_mm: float
    total_water_volume_litres: float
    estimated_pump_runtime_minutes: int
    shared_schedule_advisable: bool
    shared_schedule_reasoning: str
    water_competition_risk: str
    seven_day_schedule: List[HybridIrrigationScheduleDay]
    methodology: str


# --- Phase 7: Profit and Investment Calculator ---

class ProfitEstimateRequest(BaseModel):
    farm_area_hectares: float = Field(..., gt=0.0, le=100000.0)
    main_crop: str = Field(..., min_length=1)
    intercrop: Optional[str] = None
    custom_main_yield_kg: Optional[float] = Field(default=None, ge=0.0)
    custom_main_price_per_kg: Optional[float] = Field(default=None, ge=0.0)
    custom_inter_yield_kg: Optional[float] = Field(default=None, ge=0.0)
    custom_inter_price_per_kg: Optional[float] = Field(default=None, ge=0.0)
    custom_additional_investment_inr: Optional[float] = Field(default=None, ge=0.0)


class FinancialScenario(BaseModel):
    scenario_name: str
    main_crop_revenue_inr: float
    intercrop_revenue_inr: float
    total_gross_revenue_inr: float
    total_operating_expenses_inr: float
    net_profit_inr: float
    profit_per_acre_inr: float
    profit_per_hectare_inr: float
    roi_pct: float
    break_even_months: float


class ProfitEstimateResponse(BaseModel):
    main_crop: str
    intercrop: Optional[str] = None
    farm_area_hectares: float
    initial_capital_investment_inr: float
    operating_expenses_breakdown: Dict[str, float]
    scenarios: Dict[str, FinancialScenario]
    hybrid_gain_vs_monoculture: Dict[str, Any]
    financial_assumptions: List[str]


# --- Phase 8: Value-Added Products & Comparison ---

class ProductOpportunity(BaseModel):
    product_id: str
    product_name: str
    crop_id: str
    processing_stage: str
    processing_scale: str
    raw_input_kg: float
    recovery_rate_pct: float
    output_product_kg: float
    processing_method: str
    equipment_required: str
    processing_cost_per_kg_input_inr: float
    packaging_cost_per_kg_output_inr: float
    typical_farmgate_price_per_kg_inr: float
    typical_selling_price_per_kg_inr: float
    gross_margin_pct: float
    licenses_required: str
    limitations: str


class RawVsProcessedRequest(BaseModel):
    crop_id: str = Field(..., min_length=1)
    harvest_quantity_kg: float = Field(..., gt=0.0, le=10000000.0)
    custom_raw_price_per_kg: Optional[float] = Field(default=None, ge=0.0)


class ProcessingOption(BaseModel):
    option_id: str
    option_name: str
    processing_stage: str
    processing_scale: str
    raw_input_kg: float
    recovery_rate_pct: float
    finished_product_kg: float
    selling_price_per_unit_inr: float
    gross_revenue_inr: float
    raw_material_opportunity_cost_inr: float
    processing_costs_inr: float
    packaging_costs_inr: float
    total_processing_expenses_inr: float
    net_profit_inr: float
    profit_gain_over_raw_inr: float
    profit_gain_pct: float
    equipment_needed: str
    licenses_required: str


class RawVsProcessedResponse(BaseModel):
    crop_name: str
    harvest_quantity_kg: float
    comparison_options: List[ProcessingOption]
    recommended_strategy: str
    strategic_advisory: str


# --- Phase 14: Hybrid Plan Database Persistence ---

class HybridPlanCreate(BaseModel):
    farm_id: Optional[int] = None
    plan_name: str = Field(..., min_length=1, max_length=120)
    main_crop: str
    intercrop: str
    farm_area_hectares: float = Field(..., gt=0.0)
    plant_count_summary: Optional[str] = None
    net_profit_expected_inr: Optional[float] = 0.0
    roi_pct: Optional[float] = 0.0
    notes: Optional[str] = None


class HybridPlanRead(HybridPlanCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
