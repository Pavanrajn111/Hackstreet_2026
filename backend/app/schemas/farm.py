from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator


class FarmBase(BaseModel):
    farm_name: str = Field(..., min_length=1, max_length=100)
    district: Optional[str] = Field(default="Bengaluru Rural", max_length=100)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    crop: str = Field(..., min_length=1, max_length=50)
    soil_type: str = Field(..., min_length=1, max_length=50)
    sowing_date: date
    farm_area_hectares: float = Field(default=1.0, gt=0.0, le=100000.0)
    irrigation_method: str = Field(default="Drip Irrigation", max_length=50)
    last_irrigation_date: Optional[date] = None
    pump_flow_rate_lpm: Optional[float] = Field(default=120.0, ge=0.0, le=100000.0)

    @field_validator("farm_name", "crop", "soil_type")
    @classmethod
    def strip_and_validate_non_empty(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Field cannot be empty or whitespace only")
        return s


class FarmCreate(FarmBase):
    pass


class FarmUpdate(BaseModel):
    farm_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    district: Optional[str] = Field(default=None, max_length=100)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    crop: Optional[str] = Field(default=None, min_length=1, max_length=50)
    soil_type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    sowing_date: Optional[date] = None
    farm_area_hectares: Optional[float] = Field(default=None, gt=0.0, le=100000.0)
    irrigation_method: Optional[str] = Field(default=None, max_length=50)
    last_irrigation_date: Optional[date] = None
    pump_flow_rate_lpm: Optional[float] = Field(default=None, ge=0.0, le=100000.0)


class FarmRead(FarmBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CropInfo(BaseModel):
    id: str
    name: str
    category: str
    duration_days: int
    stages: list[dict]
    base_kc: float


class SoilInfo(BaseModel):
    id: str
    name: str
    description: str
    available_water_capacity_mm_per_m: float
    infiltration_rate_mm_hr: float
