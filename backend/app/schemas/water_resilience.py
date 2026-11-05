"""
Pydantic Schemas for Water Resilience & Water Shortage Action Planner
----------------------------------------------------------------------
Synthesizes FAO-56 water balance, adaptive irrigation improvements,
opt-in community water sharing, and ML signals into an actionable roadmap.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.adaptive_irrigation import IrrigationOptionItem
from app.schemas.community_water import ResourceMatchItem


class WaterShortageActionPlanRequest(BaseModel):
    farm_id: Optional[int] = Field(default=None, description="Registered farm ID to load defaults", json_schema_extra={"example": 1})
    crop: Optional[str] = Field(default=None, description="Crop name", json_schema_extra={"example": "Tomato"})
    crop_stage: Optional[str] = Field(default=None, description="Growth stage (Initial, Development, Mid-Season, Late)", json_schema_extra={"example": "Mid-Season"})
    soil_type: Optional[str] = Field(default=None, description="Soil texture class", json_schema_extra={"example": "Red Sandy Loam"})
    farm_area_hectares: Optional[float] = Field(default=None, gt=0.0, json_schema_extra={"example": 1.0})
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0, json_schema_extra={"example": 13.1250})
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0, json_schema_extra={"example": 77.5850})
    existing_irrigation_method: Optional[str] = Field(default="Surface / Flood Irrigation", json_schema_extra={"example": "Surface / Flood Irrigation"})
    available_water_litres: Optional[float] = Field(default=None, ge=0.0, description="Farmer current on-farm water storage in litres", json_schema_extra={"example": 8000.0})
    shortage_severity: Optional[str] = Field(default="moderate", description="mild, moderate, severe, critical", json_schema_extra={"example": "moderate"})
    budget_limit_inr: Optional[float] = Field(default=None, ge=0.0, json_schema_extra={"example": 35000.0})
    max_community_search_radius_km: float = Field(default=15.0, gt=0.0, le=100.0)
    user_constraints: Optional[List[str]] = Field(default_factory=list)


class ResilienceActionItem(BaseModel):
    action_id: str
    priority_level: int  # 1 = Immediate / Emergency, 2 = Operational, 3 = Conservation, 4 = Medium-Term
    title: str
    category: str  # "Emergency Water Sourcing", "Operational Tuning", "Moisture Conservation", "Infrastructure Retrofit"
    description: str
    water_saving_or_gain_litres: Optional[float] = None
    estimated_cost_inr: Optional[float] = None
    timeframe: str  # "Today", "Within 48 Hours", "This Week", "Next Season"
    agronomic_safety_rating: str  # "Safe", "Conditional (Monitor Soil)", "High Risk"
    implementation_steps: List[str]
    farmer_confirmation_required: str


class WaterShortageActionPlanResponse(BaseModel):
    farm_id: Optional[int] = None
    crop: str
    growth_stage: str
    stage_sensitivity_status: str
    current_water_status: Dict[str, Any]
    water_deficit_litres: float
    water_surplus_or_deficit_status: str
    existing_irrigation_recommendation: Dict[str, Any]
    recommended_actions: List[ResilienceActionItem]
    irrigation_method_options: List[IrrigationOptionItem]
    community_resource_matches: List[ResourceMatchItem]
    ml_insights: Dict[str, Any]
    warnings: List[str]
    data_completeness: Dict[str, Any]
    source_metadata: Dict[str, Any]
