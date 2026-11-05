from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class FarmBase(BaseModel):
    farm_name: str = Field(..., max_length=100)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    crop: str = Field(..., max_length=50)
    soil_type: str = Field(..., max_length=50)
    sowing_date: date
    farm_area_hectares: float = Field(default=1.0, gt=0.0)
    irrigation_method: str = Field(default="Drip Irrigation")
    last_irrigation_date: Optional[date] = None
    pump_flow_rate_lpm: Optional[float] = Field(default=100.0, ge=0.0)


class FarmCreate(FarmBase):
    pass


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
