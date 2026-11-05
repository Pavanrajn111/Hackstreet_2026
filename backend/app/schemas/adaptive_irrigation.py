"""
Pydantic Schemas for Adaptive Irrigation Options Engine
--------------------------------------------------------
Supports evaluation and comparative analysis of irrigation methods,
operational tuning, zoning, and moisture conservation practices.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


class IrrigationOptionsRequest(BaseModel):
    """
    Inputs for evaluating suitable irrigation options and improvements.
    All parameters are optional if farm_id is provided.
    """
    farm_id: Optional[int] = Field(default=None, description="Optional ID of registered farm to pull defaults from", json_schema_extra={"example": 1})
    crop: Optional[str] = Field(default=None, description="Crop name (e.g. Tomato, Coconut, Maize)", json_schema_extra={"example": "Tomato"})
    crop_stage: Optional[str] = Field(default=None, description="Crop development stage (Initial, Development, Mid-Season, Late)", json_schema_extra={"example": "Mid-Season"})
    soil_type: Optional[str] = Field(default=None, description="Soil texture class (Sandy, Red Sandy Loam, Clay, Black)", json_schema_extra={"example": "Red Sandy Loam"})
    farm_area_hectares: Optional[float] = Field(default=None, gt=0.0, le=10000.0, description="Farm area in hectares", json_schema_extra={"example": 1.5})
    existing_irrigation_method: Optional[str] = Field(default="Surface / Flood Irrigation", description="Current irrigation method on farm", json_schema_extra={"example": "Surface / Flood Irrigation"})
    water_source: Optional[str] = Field(default=None, description="Borewell, Canal, Farm Pond, Open Well, Rainfed", json_schema_extra={"example": "Borewell"})
    water_availability: Optional[str] = Field(default=None, description="Abundant, Adequate, Moderate, Scarce, Critical", json_schema_extra={"example": "Moderate"})
    water_quality: Optional[str] = Field(default="freshwater", description="Freshwater, Slightly Saline, Turbid", json_schema_extra={"example": "freshwater"})
    terrain_slope: Optional[str] = Field(default="Flat (0-2%)", description="Flat (0-2%), Gentle (2-5%), Steep (>5%), Undulating", json_schema_extra={"example": "Flat (0-2%)"})
    pump_electricity_availability: Optional[str] = Field(default=None, description="Reliable Grid 6+ hrs, Unreliable 2-4 hrs, Solar Powered, Diesel Pump, Gravity", json_schema_extra={"example": "Reliable Grid 6+ hrs"})
    labor_availability: Optional[str] = Field(default="Moderate", description="High, Moderate, Low / Scarce", json_schema_extra={"example": "Moderate"})
    budget_limit_inr: Optional[float] = Field(default=None, ge=0.0, description="Farmer approximate capital budget in INR", json_schema_extra={"example": 60000.0})
    user_cost_assumptions: Optional[Dict[str, float]] = Field(default=None, description="User provided custom cost per hectare overrides")
    constraints: Optional[List[str]] = Field(default_factory=list, description="User constraints (e.g. ['low_electricity', 'rocky_soil'])")


class IrrigationOptionItem(BaseModel):
    method: str
    category: str  # "Capital System Upgrade", "Operational Improvement", "Field Conservation"
    suitability_score: float  # 0.0 to 100.0
    score_explanation: List[str]
    why_recommended: str
    limitations: List[str]
    required_inputs: List[str]
    installation_requirements: List[str]
    maintenance_requirements: List[str]
    estimated_cost: Optional[Dict[str, Any]] = None  # None if unavailable, or tagged as assumption
    estimated_water_impact: Dict[str, Any]
    confidence_or_data_completeness: float  # 0.0 to 1.0
    next_steps: List[str]


class IrrigationOptionsResponse(BaseModel):
    farm_id: Optional[int] = None
    crop: str
    farm_area_hectares: float
    current_method: str
    recommended_option: str
    ranking_method: str = "Multi-Factor Rule-Based Agronomic Evaluation"
    data_completeness: Dict[str, Any]
    missing_information: List[str]
    warnings: List[str]
    options: List[IrrigationOptionItem]
    source_metadata: Dict[str, Any]


class IrrigationCompareRequest(BaseModel):
    farm_id: Optional[int] = Field(default=None, json_schema_extra={"example": 1})
    current_method: str = Field(default="Surface / Flood Irrigation", json_schema_extra={"example": "Surface / Flood Irrigation"})
    comparison_methods: List[str] = Field(
        default=["Drip Irrigation", "Sprinkler Irrigation"],
        min_length=1,
        json_schema_extra={"example": ["Drip Irrigation", "Sprinkler Irrigation"]},
    )
    farm_area_hectares: Optional[float] = Field(default=1.0, gt=0.0)
    crop: Optional[str] = Field(default="Tomato")
    soil_type: Optional[str] = Field(default="Red Sandy Loam")
    user_cost_assumptions: Optional[Dict[str, float]] = None


class IrrigationCompareItem(BaseModel):
    method: str
    suitability_score: float
    suitability_tier: str
    application_efficiency_pct: float
    water_saving_vs_current_pct: float
    estimated_capital_cost_inr: Optional[float] = None
    cost_data_source: str
    operating_requirements: str
    maintenance_complexity: str
    labor_intensity: str
    key_advantages: List[str]
    critical_limitations: List[str]
    recommendation_summary: str


class IrrigationCompareResponse(BaseModel):
    crop: str
    soil_type: str
    farm_area_hectares: float
    current_method_assessment: IrrigationCompareItem
    alternative_comparisons: List[IrrigationCompareItem]
    key_tradeoffs: List[str]
    overall_verdict: str
    data_completeness_pct: float
