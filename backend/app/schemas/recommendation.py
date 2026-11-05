from datetime import date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ScheduleDayItem(BaseModel):
    date: str
    day: str
    action: str
    irrigate: Optional[bool] = False
    recommended_depth_mm: float
    water_volume_litres: float
    runtime_minutes: int
    rain_note: Optional[str] = None


class WeatherDayItem(BaseModel):
    date: str
    day: str
    temp_max_c: float
    temp_min_c: float
    humidity_pct: int
    rainfall_mm: float
    rain_probability_pct: Optional[int] = 0
    et0_mm: float
    condition: str


class AlertItem(BaseModel):
    id: str
    type: str  # "warning", "info", "tip"
    title: str
    message: str
    priority: str  # "high", "medium", "low"


class RecommendRequest(BaseModel):
    farm_id: Optional[int] = Field(default=None, json_schema_extra={"example": 1})
    farm_name: str = Field(..., json_schema_extra={"example": "Bengaluru Green Fields"})
    latitude: float = Field(..., ge=-90.0, le=90.0, json_schema_extra={"example": 12.9716})
    longitude: float = Field(..., ge=-180.0, le=180.0, json_schema_extra={"example": 77.5946})
    crop: str = Field(..., json_schema_extra={"example": "Tomato"})
    soil_type: str = Field(..., json_schema_extra={"example": "Red Sandy Loam"})
    sowing_date: date = Field(..., json_schema_extra={"example": "2026-10-15"})
    farm_area_hectares: float = Field(..., gt=0.0, json_schema_extra={"example": 1.5})
    irrigation_method: str = Field(default="Drip Irrigation", json_schema_extra={"example": "Drip Irrigation"})
    last_irrigation_date: Optional[date] = Field(default=None, json_schema_extra={"example": "2026-11-02"})
    pump_flow_rate_lpm: Optional[float] = Field(default=120.0, ge=0.0, json_schema_extra={"example": 120.0})


class RecommendResponse(BaseModel):
    irrigate_today: bool
    irrigation_depth_mm: float
    water_volume_litres: float
    estimated_pump_runtime_minutes: Optional[int] = 0
    current_growth_stage: str
    current_kc: float
    next_irrigation_date: Optional[str] = None
    rain_warning: Optional[str] = None
    risk_status: str
    under_irrigation_risk: Optional[str] = "Low"
    under_irrigation_note: Optional[str] = None
    over_irrigation_risk: Optional[str] = "Low"
    over_irrigation_note: Optional[str] = None
    ml_adjustment_used: bool = False
    weather_source: Optional[str] = "open-meteo"
    explanation: str
    soil_moisture: Optional[Dict[str, Any]] = None
    water_savings: Optional[Dict[str, Any]] = None
    alerts: Optional[List[AlertItem]] = None
    seven_day_schedule: List[ScheduleDayItem]
    seven_day_weather: List[WeatherDayItem]
