from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.farm import FarmModel, HybridPlanModel
from app.schemas.hybrid import (
    HybridRecommendRequest,
    HybridRecommendResponse,
    LayoutRequest,
    LayoutResponse,
    CultivationGuideResponse,
    HybridIrrigationRequest,
    HybridIrrigationResponse,
    ProfitEstimateRequest,
    ProfitEstimateResponse,
    ProductOpportunity,
    RawVsProcessedRequest,
    RawVsProcessedResponse,
    HybridPlanCreate,
    HybridPlanRead,
)
from app.services.hybrid_service import (
    get_hybrid_crop_recommendations,
    generate_farm_layout,
    get_crop_cultivation_guide,
    calculate_hybrid_irrigation,
    calculate_profit_and_investment,
    get_value_added_products,
    compare_raw_vs_processed,
)

router = APIRouter(prefix="/hybrid", tags=["Hybrid Farming Intelligence"])


@router.post("/recommendations", response_model=HybridRecommendResponse)
def recommend_hybrid_crops(req: HybridRecommendRequest, db: Session = Depends(get_db)):
    """
    Recommend agronomically compatible additional companion crops for an existing farm.
    Evaluates canopy architecture, root depth stratification, shade tolerance, and water requirements.
    """
    if req.farm_id is not None:
        farm = db.query(FarmModel).filter(FarmModel.id == req.farm_id).first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farm with ID {req.farm_id} not found",
            )
        # Use farm parameters if not explicitly provided
        if not req.main_crop:
            req.main_crop = farm.crop
        if not req.farm_area_hectares:
            req.farm_area_hectares = farm.farm_area_hectares

    return get_hybrid_crop_recommendations(req)


@router.post("/layout", response_model=LayoutResponse)
def calculate_planting_layout(req: LayoutRequest, db: Session = Depends(get_db)):
    """
    Generate structured planting geometry, row arrangement, and estimated plant counts
    for multi-tier hybrid farming layouts.
    """
    if req.farm_id is not None:
        farm = db.query(FarmModel).filter(FarmModel.id == req.farm_id).first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farm with ID {req.farm_id} not found",
            )
    return generate_farm_layout(req)


@router.get("/crops/{crop_id}/guide", response_model=CultivationGuideResponse)
def get_cultivation_guide(crop_id: str):
    """
    Retrieve comprehensive 10-stage cultivation guidance covering land preparation,
    seed selection, sowing, irrigation, NPK nutrients, IPM pest management, harvesting, and storage.
    """
    try:
        return get_crop_cultivation_guide(crop_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cultivation guide for '{crop_id}' could not be generated: {str(exc)}",
        )


@router.post("/irrigation", response_model=HybridIrrigationResponse)
def calculate_hybrid_irrigation_requirements(req: HybridIrrigationRequest, db: Session = Depends(get_db)):
    """
    Calculate combined evapotranspiration and shared irrigation water balance
    for multi-tier hybrid crop combinations.
    """
    if req.farm_id is not None:
        farm = db.query(FarmModel).filter(FarmModel.id == req.farm_id).first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farm with ID {req.farm_id} not found",
            )
    return calculate_hybrid_irrigation(req)


@router.post("/profit-estimate", response_model=ProfitEstimateResponse)
def estimate_profit_and_investment(req: ProfitEstimateRequest):
    """
    Estimate capital investment, operating costs, revenues, net profits, ROI %,
    and break-even period across Conservative, Expected, and Optimistic scenarios.
    """
    return calculate_profit_and_investment(req)


@router.post("/profit-comparison", response_model=ProfitEstimateResponse)
def compare_profit_and_investment(req: ProfitEstimateRequest):
    """
    Alias endpoint for comparing monoculture baseline against multi-crop hybrid farming.
    """
    return calculate_profit_and_investment(req)


@router.get("/crops/{crop_id}/products", response_model=List[ProductOpportunity])
def list_value_added_products(crop_id: str):
    """
    Retrieve value-added product processing opportunities, recovery rates %,
    equipment needs, and licensing requirements for a crop.
    """
    products = get_value_added_products(crop_id)
    if not products:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No value-added product models found for crop '{crop_id}'",
        )
    return products


@router.post("/product-profit", response_model=RawVsProcessedResponse)
def analyze_product_processing_profit(req: RawVsProcessedRequest):
    """
    Compare selling raw agricultural produce at farmgate vs processing into
    primary or secondary value-added products with physical mass balance validation.
    """
    try:
        return compare_raw_vs_processed(req)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate processing comparison: {str(exc)}",
        )


@router.post("/plans", response_model=HybridPlanRead, status_code=status.HTTP_201_CREATED)
def save_hybrid_plan(plan_in: HybridPlanCreate, db: Session = Depends(get_db)):
    """
    Save a farmer's hybrid farming plan, layout, and financial evaluation into SQLite for future audit.
    """
    if plan_in.farm_id is not None:
        farm = db.query(FarmModel).filter(FarmModel.id == plan_in.farm_id).first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farm with ID {plan_in.farm_id} not found",
            )
    plan_record = HybridPlanModel(**plan_in.model_dump())
    db.add(plan_record)
    db.commit()
    db.refresh(plan_record)
    return plan_record


@router.get("/plans", response_model=List[HybridPlanRead])
def list_saved_hybrid_plans(
    farm_id: Optional[int] = Query(default=None, description="Filter plans by farm ID"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve saved hybrid farming plans."""
    query = db.query(HybridPlanModel)
    if farm_id is not None:
        query = query.filter(HybridPlanModel.farm_id == farm_id)
    return query.order_by(HybridPlanModel.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/plans/{plan_id}", response_model=HybridPlanRead)
def get_hybrid_plan_by_id(plan_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a saved hybrid farming plan by its ID."""
    plan = db.query(HybridPlanModel).filter(HybridPlanModel.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hybrid plan with ID {plan_id} not found",
        )
    return plan


# --- ML Extra Crop Planner & Forecasting Endpoints ---

from app.schemas.crop_planner import (
    CropPlannerRequest,
    CropPlannerResponse,
    CommodityPriceForecastResponse,
    AllPriceForecastsResponse,
)
from app.services.crop_planner_service import (
    plan_extra_crops,
    get_commodity_price_forecast,
    get_all_price_forecasts,
)


@router.post("/ml-planner", response_model=CropPlannerResponse)
def get_hybrid_ml_crop_planner(req: CropPlannerRequest):
    """
    ML-augmented multi-tier companion crop planning:
    Integrates Random Forest suitability probability, 15-year DCF cashflow,
    layout groupings (boundary, border, intercrop, understorey), plant density, and daily water demand.
    """
    farm_dict = req.model_dump()
    return plan_extra_crops(farm_dict, years=req.years, top=req.top)


@router.get("/price-forecasts", response_model=AllPriceForecastsResponse)
def get_hybrid_price_forecasts_all():
    """Market price summaries and annual projected growth rates for 8 key commodities."""
    return get_all_price_forecasts()


@router.get("/price-forecasts/{commodity}", response_model=CommodityPriceForecastResponse)
def get_hybrid_commodity_price_forecast(commodity: str):
    """12-month forward price forecast and historical price series for a specific commodity."""
    return get_commodity_price_forecast(commodity)
