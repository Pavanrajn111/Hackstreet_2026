"""
Pydantic Schemas for Community Water Sharing Network & Workflow
----------------------------------------------------------------
Provides schemas for resource registration, privacy-preserving discovery,
and exchange request state transitions.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


class SharedResourceCreate(BaseModel):
    owner_farm_id: int = Field(..., description="ID of owner farm in DB", json_schema_extra={"example": 1})
    owner_name: Optional[str] = Field(default="Neighboring Farmer", json_schema_extra={"example": "Suresh Gowda"})
    owner_contact_full: Optional[str] = Field(default=None, description="Actual telephone or mobile number for consented exchange", json_schema_extra={"example": "+91 98450 12345"})
    resource_type: str = Field(
        ...,
        description="farm_pond_surplus, borewell_slot, shared_pump, water_tanker, open_well_surplus",
        json_schema_extra={"example": "farm_pond_surplus"},
    )
    description: Optional[str] = Field(default=None, json_schema_extra={"example": "Surplus harvested rain pond water, accessible via tractor lane."})
    available_quantity_litres: float = Field(..., gt=0.0, json_schema_extra={"example": 50000.0})
    flow_rate_lpm: Optional[float] = Field(default=120.0, ge=0.0, description="Pump flow rate in litres per minute")
    water_quality: str = Field(default="freshwater", description="freshwater, slightly_saline, treated_wastewater, turbid_surface_water", json_schema_extra={"example": "freshwater"})
    suitability_notes: Optional[str] = Field(default="Suitable for all horticultural and field crops.", json_schema_extra={"example": "Suitable for all horticultural crops."})
    availability_start: datetime = Field(..., json_schema_extra={"example": "2026-11-06T06:00:00Z"})
    availability_end: datetime = Field(..., json_schema_extra={"example": "2026-11-12T18:00:00Z"})
    sharing_type: str = Field(default="free", description="free, paid, negotiable, cost_sharing", json_schema_extra={"example": "cost_sharing"})
    price_per_unit: Optional[float] = Field(default=0.0, ge=0.0, json_schema_extra={"example": 0.05})
    price_unit: Optional[str] = Field(default="INR/1000L", json_schema_extra={"example": "INR/1000L"})
    terms_and_conditions: Optional[str] = Field(default="Farmer brings own suction hose or tanker.", json_schema_extra={"example": "Farmer brings own suction hose."})
    latitude: float = Field(..., ge=-90.0, le=90.0, json_schema_extra={"example": 13.1250})
    longitude: float = Field(..., ge=-180.0, le=180.0, json_schema_extra={"example": 77.5850})
    approx_district: Optional[str] = Field(default="Bengaluru Rural", json_schema_extra={"example": "Bengaluru Rural"})
    approx_village_or_area: Optional[str] = Field(default="Doddaballapur Taluk", json_schema_extra={"example": "Doddaballapur Taluk"})
    discovery_radius_km: float = Field(default=10.0, gt=0.0, le=100.0)
    is_discoverable: bool = Field(default=False, description="Explicit opt-in flag. Resource is HIDDEN until owner sets true.", json_schema_extra={"example": True})
    status: str = Field(default="active", description="active, paused, exhausted, closed")
    is_demo_sample: bool = Field(default=False)


class SharedResourceUpdate(BaseModel):
    available_quantity_litres: Optional[float] = Field(default=None, gt=0.0)
    flow_rate_lpm: Optional[float] = None
    water_quality: Optional[str] = None
    suitability_notes: Optional[str] = None
    availability_start: Optional[datetime] = None
    availability_end: Optional[datetime] = None
    sharing_type: Optional[str] = None
    price_per_unit: Optional[float] = None
    terms_and_conditions: Optional[str] = None
    is_discoverable: Optional[bool] = None
    status: Optional[str] = None
    description: Optional[str] = None


class SharedResourceRead(BaseModel):
    id: int
    owner_farm_id: int
    owner_name: str
    owner_contact_masked: str
    resource_type: str
    description: Optional[str] = None
    available_quantity_litres: float
    quantity_unit: str = "litres"
    flow_rate_lpm: Optional[float] = None
    water_quality: str
    suitability_notes: Optional[str] = None
    availability_start: datetime
    availability_end: datetime
    sharing_type: str
    price_per_unit: Optional[float] = None
    price_unit: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    approx_district: Optional[str] = None
    approx_village_or_area: Optional[str] = None
    approx_distance_km: Optional[float] = None  # Computed relative to requesting farm
    is_discoverable: bool
    status: str
    is_demo_sample: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WaterSharingRequestCreate(BaseModel):
    requesting_farm_id: int = Field(..., description="ID of farm needing water", json_schema_extra={"example": 2})
    resource_id: int = Field(..., description="ID of shared resource being requested", json_schema_extra={"example": 1})
    requested_quantity_litres: float = Field(..., gt=0.0, json_schema_extra={"example": 15000.0})
    preferred_start_time: datetime = Field(..., json_schema_extra={"example": "2026-11-07T08:00:00Z"})
    preferred_end_time: datetime = Field(..., json_schema_extra={"example": "2026-11-07T14:00:00Z"})
    requester_message: Optional[str] = Field(default=None, json_schema_extra={"example": "Require emergency water for flowering tomato plot due to pump breakdown."})
    delivery_method: Optional[str] = Field(default="pipe_connection", json_schema_extra={"example": "tractor_tanker"})


class WaterSharingRequestStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status: accepted, declined, cancelled, completed", json_schema_extra={"example": "accepted"})
    agreed_quantity_litres: Optional[float] = Field(default=None, gt=0.0)
    agreed_start_time: Optional[datetime] = None
    agreed_end_time: Optional[datetime] = None
    owner_response_notes: Optional[str] = Field(default=None, json_schema_extra={"example": "Available on Saturday morning. Connect to main outlet."})
    confirmed_completed: Optional[bool] = False

    @field_validator("status")
    @classmethod
    def validate_target_status(cls, v: str) -> str:
        valid = {"pending", "accepted", "declined", "cancelled", "completed"}
        if v.lower() not in valid:
            raise ValueError(f"Status must be one of {valid}")
        return v.lower()


class WaterSharingRequestRead(BaseModel):
    id: int
    requesting_farm_id: int
    resource_id: int
    resource_type: Optional[str] = None
    resource_owner_farm_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None  # Revealed only when accepted or to owner
    requested_quantity_litres: float
    agreed_quantity_litres: Optional[float] = None
    preferred_start_time: datetime
    preferred_end_time: datetime
    agreed_start_time: Optional[datetime] = None
    agreed_end_time: Optional[datetime] = None
    requester_message: Optional[str] = None
    owner_response_notes: Optional[str] = None
    status: str
    delivery_method: Optional[str] = None
    completion_confirmed_by_requester: bool
    completion_confirmed_by_owner: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResourceMatchItem(BaseModel):
    resource_id: int
    resource_type: str
    distance_km: float
    available_quantity_litres: float
    match_score: float  # 0 to 100
    compatibility_tier: str  # Excellent, Good, Moderate, Limited
    sharing_type: str
    cost_summary: str
    match_explanation: List[str]
    is_available_now: bool
    approx_location: str
