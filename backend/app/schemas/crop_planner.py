"""
Schemas for AGR002 Extra Crop Planner & ML Market Forecasting
--------------------------------------------------------------
Supports:
  1. ML Crop suitability predictions across 22 classes using Random Forest
  2. Multi-tier extra crop agronomic & 15-year DCF planning (boundary, border, intercrop, understorey)
  3. Machine-learned monthly price forecasts and trend analysis
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


class CropSuitabilityRequest(BaseModel):
    """Features required by the Random Forest crop suitability model."""
    n: float = Field(default=50.0, ge=0.0, le=300.0, description="Nitrogen content in soil (kg/ha or index)", json_schema_extra={"example": 60.0})
    p: float = Field(default=40.0, ge=0.0, le=200.0, description="Phosphorus content in soil (kg/ha or index)", json_schema_extra={"example": 45.0})
    k: float = Field(default=30.0, ge=0.0, le=250.0, description="Potassium content in soil (kg/ha or index)", json_schema_extra={"example": 40.0})
    temperature: float = Field(default=28.0, ge=-10.0, le=60.0, description="Average temperature in Celsius", json_schema_extra={"example": 27.5})
    humidity: float = Field(default=70.0, ge=0.0, le=100.0, description="Relative humidity percentage", json_schema_extra={"example": 75.0})
    ph: float = Field(default=6.5, ge=2.0, le=12.0, description="Soil pH level", json_schema_extra={"example": 6.5})
    rainfall: float = Field(default=120.0, ge=0.0, le=5000.0, description="Rainfall (in mm)", json_schema_extra={"example": 140.0})
    top_k: int = Field(default=5, ge=1, le=22, description="Number of top suitable crops to return")


class CropSuitabilityPrediction(BaseModel):
    crop: str
    probability: float
    probability_pct: float
    rank: int


class CropSuitabilityResponse(BaseModel):
    recommended_crop: str
    confidence: float
    confidence_pct: float
    top_predictions: List[CropSuitabilityPrediction]
    all_probabilities: Dict[str, float]
    input_features: Dict[str, float]
    model_version: str = "RandomForest-22Class-v1"


class CropPlannerRequest(BaseModel):
    """
    Farm parameters for multi-tier companion crop planning,
    integrating rule-based agronomic fit and 15-year DCF cashflow.
    """
    ph: float = Field(default=6.5, ge=3.0, le=10.0, description="Soil pH", json_schema_extra={"example": 6.5})
    rainfall_mm_yr: float = Field(default=1200.0, ge=100.0, le=6000.0, description="Annual rainfall in mm", json_schema_extra={"example": 1400.0})
    temp_c: float = Field(default=28.0, ge=5.0, le=50.0, description="Average temperature in Celsius", json_schema_extra={"example": 28.0})
    humidity: float = Field(default=70.0, ge=10.0, le=100.0, description="Relative humidity %", json_schema_extra={"example": 75.0})
    n: float = Field(default=50.0, ge=0.0, le=300.0, description="Soil Nitrogen", json_schema_extra={"example": 60.0})
    p: float = Field(default=40.0, ge=0.0, le=200.0, description="Soil Phosphorus", json_schema_extra={"example": 45.0})
    k: float = Field(default=30.0, ge=0.0, le=250.0, description="Soil Potassium", json_schema_extra={"example": 40.0})
    soil: str = Field(default="Red", description="Soil type name (e.g., Red, Laterite, Alluvial, Loamy, Sandy, Black)", json_schema_extra={"example": "Red"})
    shade_level: float = Field(default=0.3, ge=0.0, le=1.0, description="Shade level (0 = open field, 1 = heavy dense shade)", json_schema_extra={"example": 0.3})
    boundary_m: float = Field(default=360.0, gt=0.0, le=50000.0, description="Perimeter boundary length in meters", json_schema_extra={"example": 360.0})
    area_acre: float = Field(default=2.0, gt=0.0, le=10000.0, description="Farm area in acres", json_schema_extra={"example": 2.0})
    intercrop_share: float = Field(default=0.15, gt=0.0, le=1.0, description="Fraction of area allocated to intercropping", json_schema_extra={"example": 0.15})
    years: int = Field(default=15, ge=1, le=40, description="Cashflow projection horizon in years", json_schema_extra={"example": 15})
    top: int = Field(default=8, ge=1, le=20, description="Max recommended crops to return", json_schema_extra={"example": 8})

    @field_validator("soil")
    @classmethod
    def clean_soil(cls, v: str) -> str:
        s = v.strip()
        if not s:
            return "Red"
        return s.capitalize()


class CropPlannerItem(BaseModel):
    crop: str
    layout: str  # boundary, border, intercrop, understorey
    fit: float  # 0.0 to 1.0 rule-based agronomic score
    ml_prob: Optional[float] = None  # Random Forest ML probability if in dataset
    plants: int
    first_income_year: int
    payback_year: Optional[int] = None
    npv_per_plant: float
    npv_total: float
    water_l_day: float
    notes: str
    commodity: Optional[str] = None
    price_per_unit: Optional[float] = None
    unit: Optional[str] = None


class CropPlannerResponse(BaseModel):
    farm_summary: Dict[str, Any]
    recommendations: List[CropPlannerItem]
    top_ml_general_crops: List[CropSuitabilityPrediction]
    model_status: Dict[str, Any]


class PriceForecastItem(BaseModel):
    month: str
    forecast_price: float


class PriceHistoricalItem(BaseModel):
    month: str
    price: float


class CommodityPriceForecastResponse(BaseModel):
    commodity: str
    crop_name: str
    last_price: float
    currency: str = "INR"
    growth_rate: float
    growth_pct: float
    trend: str  # "Bullish", "Bearish", "Stable"
    mae: float
    naive_mae: Optional[float] = None
    beats_naive: Optional[bool] = None
    confidence: Optional[str] = "high"
    data_source: str = "synthetic"
    forecast_12m: List[PriceForecastItem]
    recent_history: List[PriceHistoricalItem]


class AllPriceForecastsResponse(BaseModel):
    total_commodities: int
    commodities: Dict[str, Dict[str, Any]]
    model_family: str = "GradientBoostingRegressor"
    data_source: str = "synthetic"
