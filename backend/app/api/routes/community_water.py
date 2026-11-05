"""
API Endpoints for Opt-in Community Water Sharing Network
---------------------------------------------------------
Provides:
  - POST   /community-water/resources
  - GET    /community-water/resources
  - GET    /community-water/resources/{resource_id}
  - PATCH  /community-water/resources/{resource_id}
  - DELETE /community-water/resources/{resource_id}
  - POST   /community-water/requests
  - GET    /community-water/requests
  - GET    /community-water/requests/{request_id}
  - PATCH  /community-water/requests/{request_id}/status
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.community_water import (
    SharedResourceCreate,
    SharedResourceUpdate,
    SharedResourceRead,
    WaterSharingRequestCreate,
    WaterSharingRequestStatusUpdate,
    WaterSharingRequestRead,
)
from app.services.community_water_service import (
    register_shared_resource,
    list_discoverable_resources,
    get_resource_by_id,
    update_resource,
    delete_resource,
    create_water_request,
    list_water_requests,
    get_water_request_by_id,
    update_water_request_status,
)

router = APIRouter(prefix="/community-water", tags=["Community Water Sharing Network"])


# --- Resource Endpoints ---

@router.post("/resources", response_model=SharedResourceRead, status_code=status.HTTP_201_CREATED)
def register_water_resource(res_in: SharedResourceCreate, db: Session = Depends(get_db)):
    """
    Register an available water resource (pond surplus, borewell slot, shared pump, tanker).
    Remains hidden from public discovery until the owner explicitly sets is_discoverable=True.
    """
    return register_shared_resource(db, res_in)


@router.get("/resources", response_model=List[SharedResourceRead])
def discover_water_resources(
    requesting_farm_id: Optional[int] = Query(default=None, description="Optional requesting farm ID to calculate distance"),
    lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0, description="Latitude for proximity discovery"),
    lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0, description="Longitude for proximity discovery"),
    radius_km: float = Query(default=15.0, gt=0.0, le=100.0, description="Maximum discovery radius in kilometres"),
    resource_type: Optional[str] = Query(default=None, description="Filter: farm_pond_surplus, borewell_slot, shared_pump, water_tanker"),
    sharing_type: Optional[str] = Query(default=None, description="Filter: free, paid, negotiable, cost_sharing"),
    water_quality: Optional[str] = Query(default=None, description="Filter: freshwater, slightly_saline, treated_wastewater"),
    min_quantity: Optional[float] = Query(default=None, ge=0.0, description="Minimum available quantity in litres"),
    db: Session = Depends(get_db),
):
    """
    Discover nearby shared water resources within an approximate radius.
    Only returns resources where the owner has explicitly enabled discovery (is_discoverable=True).
    Exact coordinates are fuzzed and contact details are masked for privacy.
    """
    return list_discoverable_resources(
        db=db,
        requesting_farm_id=requesting_farm_id,
        lat=lat,
        lon=lon,
        radius_km=radius_km,
        resource_type=resource_type,
        sharing_type=sharing_type,
        water_quality=water_quality,
        min_quantity=min_quantity,
    )


@router.get("/resources/{resource_id}", response_model=SharedResourceRead)
def get_single_water_resource(
    resource_id: int,
    requesting_farm_id: Optional[int] = Query(default=None, description="Optional requesting farm ID"),
    db: Session = Depends(get_db),
):
    """
    Retrieve details for a specific water resource.
    Unmasked contact details are revealed only to the verified resource owner or a farmer with an accepted request.
    """
    return get_resource_by_id(db, resource_id, requesting_farm_id)


@router.patch("/resources/{resource_id}", response_model=SharedResourceRead)
def update_water_resource(
    resource_id: int,
    update_in: SharedResourceUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a water resource's available quantity, schedule, or discoverability status.
    """
    return update_resource(db, resource_id, update_in)


@router.delete("/resources/{resource_id}")
def remove_water_resource(resource_id: int, db: Session = Depends(get_db)):
    """Remove a shared water resource from the community registry."""
    return delete_resource(db, resource_id)


# --- Request Workflow Endpoints ---

@router.post("/requests", response_model=WaterSharingRequestRead, status_code=status.HTTP_201_CREATED)
def submit_water_sharing_request(req_in: WaterSharingRequestCreate, db: Session = Depends(get_db)):
    """
    Submit a request to borrow or share water from an active discoverable community resource.
    Initial state is 'pending' until approved by the resource owner.
    """
    return create_water_request(db, req_in)


@router.get("/requests", response_model=List[WaterSharingRequestRead])
def list_community_water_requests(
    requesting_farm_id: Optional[int] = Query(default=None, description="Filter requests made by a farm"),
    owner_farm_id: Optional[int] = Query(default=None, description="Filter requests received by a resource owner"),
    status: Optional[str] = Query(default=None, description="Filter by status: pending, accepted, declined, cancelled, completed"),
    db: Session = Depends(get_db),
):
    """Retrieve water sharing requests with optional farm or status filtering."""
    return list_water_requests(
        db=db,
        requesting_farm_id=requesting_farm_id,
        owner_farm_id=owner_farm_id,
        status_filter=status,
    )


@router.get("/requests/{request_id}", response_model=WaterSharingRequestRead)
def get_single_water_request(request_id: int, db: Session = Depends(get_db)):
    """Retrieve details and audit history for a specific water sharing request."""
    return get_water_request_by_id(db, request_id)


@router.patch("/requests/{request_id}/status", response_model=WaterSharingRequestRead)
def transition_water_request_status(
    request_id: int,
    update_in: WaterSharingRequestStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Transition request status following strict state-machine rules:
      pending  -> accepted | declined | cancelled
      accepted -> completed | cancelled
    """
    return update_water_request_status(db, request_id, update_in)
