"""
API routes for ML Crop Planner and Price Forecasting
-----------------------------------------------------
Endpoints for:
  - Random Forest crop suitability prediction (22 crop classes)
  - Multi-tier companion crop planning (NPV, plant counts, water demand)
  - Price forecasts and market trends (8 key commodities)
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.crop_planner import (
    CropSuitabilityRequest,
    CropSuitabilityResponse,
    CropPlannerRequest,
    CropPlannerResponse,
    CommodityPriceForecastResponse,
    AllPriceForecastsResponse,
)
from app.services.crop_planner_service import (
    predict_crop_suitability,
    plan_extra_crops,
    get_commodity_price_forecast,
    get_all_price_forecasts,
)

router = APIRouter(prefix="/ml", tags=["Machine Learning & Predictions"])


@router.post("/crop-suitability", response_model=CropSuitabilityResponse)
def get_ml_crop_suitability(req: CropSuitabilityRequest):
    """
    Predict optimal crop suitability probabilities across 22 classes using the trained
    Random Forest model based on soil nutrients (N, P, K), temperature, humidity, pH, and rainfall.
    """
    try:
        return predict_crop_suitability(
            n=req.n,
            p=req.p,
            k=req.k,
            temperature=req.temperature,
            humidity=req.humidity,
            ph=req.ph,
            rainfall=req.rainfall,
            top_k=req.top_k,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Crop suitability prediction failed: {str(exc)}",
        )


@router.post("/crop-planner", response_model=CropPlannerResponse)
def get_extra_crop_plan(req: CropPlannerRequest):
    """
    Calculate an agronomic and economic extra crop plan for a farm:
    Integrates Random Forest suitability probability, 15-year DCF cashflow,
    layout groupings (boundary, border, intercrop, understorey), plant density, and daily water demand.
    """
    try:
        farm_dict = req.model_dump()
        return plan_extra_crops(farm_dict, years=req.years, top=req.top)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extra crop planning failed: {str(exc)}",
        )


@router.get("/price-forecasts", response_model=AllPriceForecastsResponse)
def list_all_price_forecasts():
    """
    Retrieve market price summaries, projected annual growth rates, and model errors
    for all 8 supported agricultural commodities.
    """
    try:
        return get_all_price_forecasts()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch price summaries: {str(exc)}",
        )


@router.get("/price-forecasts/{commodity}", response_model=CommodityPriceForecastResponse)
def get_single_price_forecast(commodity: str):
    """
    Retrieve detailed 12-month forward price projections and recent historical prices
    for a specific agricultural commodity (Coconut, Turmeric, Pepper, Papaya, Drumstick/Moringa, Arecanut, Lemon Grass, Marigold).
    """
    try:
        return get_commodity_price_forecast(commodity)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Price forecast for '{commodity}' failed: {str(exc)}",
        )
