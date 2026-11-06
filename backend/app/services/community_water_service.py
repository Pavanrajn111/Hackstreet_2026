"""
Community Water Sharing Network & Request Workflow Service
-----------------------------------------------------------
Implements:
  1. Privacy-preserving resource registration & discovery
  2. Geographic proximity calculation (Haversine distance)
  3. Strict opt-in visibility (is_discoverable) & contact masking
  4. State-machine validated water exchange requests
  5. Automated matching engine for water shortage resilience
"""

import math
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.farm import FarmModel
from app.models.community_water import (
    SharedWaterResourceModel,
    WaterSharingRequestModel,
)
from app.schemas.community_water import (
    SharedResourceCreate,
    SharedResourceUpdate,
    SharedResourceRead,
    WaterSharingRequestCreate,
    WaterSharingRequestStatusUpdate,
    WaterSharingRequestRead,
    ResourceMatchItem,
)

logger = logging.getLogger(__name__)


def _is_available_now(start_val: Any, end_val: Any) -> bool:
    if not start_val or not end_val:
        return False
    now = datetime.now(timezone.utc)
    try:
        s = start_val if getattr(start_val, "tzinfo", None) is not None else start_val.replace(tzinfo=timezone.utc)
        e = end_val if getattr(end_val, "tzinfo", None) is not None else end_val.replace(tzinfo=timezone.utc)
        return s <= now <= e
    except Exception:
        return False


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two geographic coordinates in kilometres."""
    r = 6371.0  # Earth's mean radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)


def mask_contact_info(phone: Optional[str]) -> str:
    """Masks phone number for privacy during open discovery."""
    if not phone or len(phone.strip()) < 6:
        return "+91 98**** 1234"
    cleaned = phone.strip()
    prefix = cleaned[:6]
    suffix = cleaned[-4:] if len(cleaned) >= 10 else cleaned[-2:]
    return f"{prefix}****{suffix}"


# -------------------------------------------------------------------------
# Resource Management
# -------------------------------------------------------------------------

def register_shared_resource(db: Session, res_in: SharedResourceCreate) -> SharedWaterResourceModel:
    """
    Registers a new sharable water resource or pump.
    Remains hidden from discovery until owner sets is_discoverable=True.
    """
    # 1. Validate owner farm exists
    farm = db.query(FarmModel).filter(FarmModel.id == res_in.owner_farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Owner farm ID {res_in.owner_farm_id} does not exist in the database.",
        )

    # 2. Validate availability window
    if res_in.availability_end <= res_in.availability_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="availability_end must be chronologically after availability_start.",
        )

    masked_phone = mask_contact_info(res_in.owner_contact_full)

    record = SharedWaterResourceModel(
        owner_farm_id=res_in.owner_farm_id,
        owner_name=res_in.owner_name or farm.farm_name,
        owner_contact_masked=masked_phone,
        owner_contact_full=res_in.owner_contact_full,
        resource_type=res_in.resource_type.strip().lower(),
        description=res_in.description,
        available_quantity_litres=res_in.available_quantity_litres,
        quantity_unit="litres",
        flow_rate_lpm=res_in.flow_rate_lpm or farm.pump_flow_rate_lpm,
        water_quality=res_in.water_quality,
        suitability_notes=res_in.suitability_notes,
        availability_start=res_in.availability_start,
        availability_end=res_in.availability_end,
        sharing_type=res_in.sharing_type,
        price_per_unit=res_in.price_per_unit,
        price_unit=res_in.price_unit,
        terms_and_conditions=res_in.terms_and_conditions,
        latitude=res_in.latitude,
        longitude=res_in.longitude,
        approx_district=res_in.approx_district or farm.district,
        approx_village_or_area=res_in.approx_village_or_area,
        discovery_radius_km=res_in.discovery_radius_km,
        is_discoverable=res_in.is_discoverable,
        status=res_in.status,
        is_demo_sample=res_in.is_demo_sample,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_discoverable_resources(
    db: Session,
    requesting_farm_id: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: float = 15.0,
    resource_type: Optional[str] = None,
    sharing_type: Optional[str] = None,
    water_quality: Optional[str] = None,
    min_quantity: Optional[float] = None,
    include_non_discoverable_for_owner: bool = False,
) -> List[SharedResourceRead]:
    """
    Public discovery listing with strict opt-in filtering and contact privacy.
    Never exposes exact coordinates or raw phone numbers to general searchers.
    """
    # Resolve reference coordinates
    ref_lat = lat
    ref_lon = lon
    if requesting_farm_id is not None and (ref_lat is None or ref_lon is None):
        farm = db.query(FarmModel).filter(FarmModel.id == requesting_farm_id).first()
        if farm:
            ref_lat = farm.latitude
            ref_lon = farm.longitude

    query = db.query(SharedWaterResourceModel)

    # Privacy filter: ONLY discoverable resources, unless the owner is viewing their own
    if not (include_non_discoverable_for_owner and requesting_farm_id is not None):
        query = query.filter(SharedWaterResourceModel.is_discoverable == True)
        query = query.filter(SharedWaterResourceModel.status == "active")
        query = query.filter(SharedWaterResourceModel.availability_end >= datetime.now(timezone.utc))

    if resource_type:
        query = query.filter(SharedWaterResourceModel.resource_type == resource_type.strip().lower())
    if sharing_type:
        query = query.filter(SharedWaterResourceModel.sharing_type == sharing_type.strip().lower())
    if water_quality:
        query = query.filter(SharedWaterResourceModel.water_quality == water_quality.strip().lower())
    if min_quantity is not None:
        query = query.filter(SharedWaterResourceModel.available_quantity_litres >= min_quantity)

    all_active = query.all()

    results: List[Tuple[float, SharedResourceRead]] = []

    for r in all_active:
        # Distance calculation
        dist = None
        if ref_lat is not None and ref_lon is not None:
            dist = haversine_distance(ref_lat, ref_lon, r.latitude, r.longitude)
            # Filter by radius
            max_r = max(radius_km, r.discovery_radius_km)
            if dist > max_r:
                continue

        item = SharedResourceRead(
            id=r.id,
            owner_farm_id=r.owner_farm_id,
            owner_name=r.owner_name or "Neighboring Farmer",
            owner_contact_masked=r.owner_contact_masked or "+91 98**** 1234",
            resource_type=r.resource_type,
            description=r.description,
            available_quantity_litres=r.available_quantity_litres,
            quantity_unit=r.quantity_unit or "litres",
            flow_rate_lpm=r.flow_rate_lpm,
            water_quality=r.water_quality,
            suitability_notes=r.suitability_notes,
            availability_start=r.availability_start,
            availability_end=r.availability_end,
            sharing_type=r.sharing_type,
            price_per_unit=r.price_per_unit,
            price_unit=r.price_unit,
            terms_and_conditions=r.terms_and_conditions,
            approx_district=r.approx_district,
            approx_village_or_area=r.approx_village_or_area,
            approx_distance_km=dist,
            is_discoverable=r.is_discoverable,
            status=r.status,
            is_demo_sample=r.is_demo_sample,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        results.append((dist if dist is not None else 9999.0, item))

    # Sort results by distance ascending
    results.sort(key=lambda x: x[0])
    return [x[1] for x in results]


def get_resource_by_id(
    db: Session, resource_id: int, requesting_farm_id: Optional[int] = None
) -> SharedResourceRead:
    """Retrieves single resource details with privacy masking."""
    res = db.query(SharedWaterResourceModel).filter(SharedWaterResourceModel.id == resource_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shared water resource ID {resource_id} not found.",
        )

    # Privacy check: if not discoverable, only the owner can see it
    if not res.is_discoverable and (requesting_farm_id != res.owner_farm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This water resource has not been made discoverable by its owner.",
        )

    dist = None
    if requesting_farm_id is not None:
        farm = db.query(FarmModel).filter(FarmModel.id == requesting_farm_id).first()
        if farm:
            dist = haversine_distance(farm.latitude, farm.longitude, res.latitude, res.longitude)

    # Show unmasked contact if requester is owner or has an accepted exchange request
    contact_display = res.owner_contact_masked or "+91 98**** 1234"
    if requesting_farm_id is not None:
        if requesting_farm_id == res.owner_farm_id:
            contact_display = res.owner_contact_full or res.owner_contact_masked
        else:
            has_accepted = db.query(WaterSharingRequestModel).filter(
                WaterSharingRequestModel.resource_id == resource_id,
                WaterSharingRequestModel.requesting_farm_id == requesting_farm_id,
                WaterSharingRequestModel.status.in_(["accepted", "completed"]),
            ).first()
            if has_accepted:
                contact_display = res.owner_contact_full or res.owner_contact_masked

    return SharedResourceRead(
        id=res.id,
        owner_farm_id=res.owner_farm_id,
        owner_name=res.owner_name or "Neighboring Farmer",
        owner_contact_masked=contact_display,
        resource_type=res.resource_type,
        description=res.description,
        available_quantity_litres=res.available_quantity_litres,
        quantity_unit=res.quantity_unit or "litres",
        flow_rate_lpm=res.flow_rate_lpm,
        water_quality=res.water_quality,
        suitability_notes=res.suitability_notes,
        availability_start=res.availability_start,
        availability_end=res.availability_end,
        sharing_type=res.sharing_type,
        price_per_unit=res.price_per_unit,
        price_unit=res.price_unit,
        terms_and_conditions=res.terms_and_conditions,
        approx_district=res.approx_district,
        approx_village_or_area=res.approx_village_or_area,
        approx_distance_km=dist,
        is_discoverable=res.is_discoverable,
        status=res.status,
        is_demo_sample=res.is_demo_sample,
        created_at=res.created_at,
        updated_at=res.updated_at,
    )


def update_resource(db: Session, resource_id: int, update_in: SharedResourceUpdate) -> SharedWaterResourceModel:
    """Updates resource attributes (quantity, availability, discoverability)."""
    res = db.query(SharedWaterResourceModel).filter(SharedWaterResourceModel.id == resource_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shared water resource ID {resource_id} not found.",
        )

    for field, val in update_in.model_dump(exclude_unset=True).items():
        setattr(res, field, val)

    db.commit()
    db.refresh(res)
    return res


def delete_resource(db: Session, resource_id: int) -> Dict[str, Any]:
    """Deletes or marks resource closed."""
    res = db.query(SharedWaterResourceModel).filter(SharedWaterResourceModel.id == resource_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shared water resource ID {resource_id} not found.",
        )
    db.delete(res)
    db.commit()
    return {"status": "deleted", "resource_id": resource_id}


# -------------------------------------------------------------------------
# Request Workflow Management
# -------------------------------------------------------------------------

def create_water_request(db: Session, req_in: WaterSharingRequestCreate) -> WaterSharingRequestModel:
    """
    Creates a new water sharing request.
    Validates resource availability, quantity boundaries, and timing.
    """
    # 1. Validate resource
    res = db.query(SharedWaterResourceModel).filter(SharedWaterResourceModel.id == req_in.resource_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shared water resource ID {req_in.resource_id} not found.",
        )

    if not res.is_discoverable or res.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This water resource is currently inactive or not approved for public requests.",
        )

    # 2. Cannot request from own farm
    if req_in.requesting_farm_id == res.owner_farm_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Farmer cannot submit a water request to their own resource.",
        )

    # 3. Validate requesting farm exists
    req_farm = db.query(FarmModel).filter(FarmModel.id == req_in.requesting_farm_id).first()
    if not req_farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requesting farm ID {req_in.requesting_farm_id} not found.",
        )

    # 4. Quantity boundary check
    if req_in.requested_quantity_litres > res.available_quantity_litres:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Requested quantity ({req_in.requested_quantity_litres:,.0f} L) exceeds "
                f"total currently available resource quantity ({res.available_quantity_litres:,.0f} L)."
            ),
        )

    # 5. Timing check
    if req_in.preferred_end_time <= req_in.preferred_start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="preferred_end_time must be strictly after preferred_start_time.",
        )

    req_obj = WaterSharingRequestModel(
        requesting_farm_id=req_in.requesting_farm_id,
        resource_id=req_in.resource_id,
        requested_quantity_litres=req_in.requested_quantity_litres,
        agreed_quantity_litres=None,
        preferred_start_time=req_in.preferred_start_time,
        preferred_end_time=req_in.preferred_end_time,
        requester_message=req_in.requester_message,
        status="pending",
        delivery_method=req_in.delivery_method or "pipe_connection",
    )
    db.add(req_obj)
    db.commit()
    db.refresh(req_obj)
    return req_obj


def list_water_requests(
    db: Session,
    requesting_farm_id: Optional[int] = None,
    owner_farm_id: Optional[int] = None,
    status_filter: Optional[str] = None,
) -> List[WaterSharingRequestRead]:
    """Lists requests filtered by requester, resource owner, or status."""
    query = db.query(WaterSharingRequestModel)

    if requesting_farm_id is not None:
        query = query.filter(WaterSharingRequestModel.requesting_farm_id == requesting_farm_id)

    if owner_farm_id is not None:
        query = query.join(SharedWaterResourceModel).filter(
            SharedWaterResourceModel.owner_farm_id == owner_farm_id
        )

    if status_filter:
        query = query.filter(WaterSharingRequestModel.status == status_filter.strip().lower())

    records = query.order_by(WaterSharingRequestModel.created_at.desc()).all()
    output = []
    for r in records:
        res = r.resource
        # Reveal contact only if accepted or completed
        revealed_contact = None
        if r.status in ("accepted", "completed"):
            revealed_contact = res.owner_contact_full or res.owner_contact_masked

        output.append(
            WaterSharingRequestRead(
                id=r.id,
                requesting_farm_id=r.requesting_farm_id,
                resource_id=r.resource_id,
                resource_type=res.resource_type if res else None,
                resource_owner_farm_id=res.owner_farm_id if res else None,
                owner_name=res.owner_name if res else None,
                owner_contact=revealed_contact,
                requested_quantity_litres=r.requested_quantity_litres,
                agreed_quantity_litres=r.agreed_quantity_litres,
                preferred_start_time=r.preferred_start_time,
                preferred_end_time=r.preferred_end_time,
                agreed_start_time=r.agreed_start_time,
                agreed_end_time=r.agreed_end_time,
                requester_message=r.requester_message,
                owner_response_notes=r.owner_response_notes,
                status=r.status,
                delivery_method=r.delivery_method,
                completion_confirmed_by_requester=r.completion_confirmed_by_requester,
                completion_confirmed_by_owner=r.completion_confirmed_by_owner,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )
    return output


def get_water_request_by_id(db: Session, request_id: int) -> WaterSharingRequestRead:
    """Retrieves a single request by its ID."""
    r = db.query(WaterSharingRequestModel).filter(WaterSharingRequestModel.id == request_id).first()
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Water sharing request ID {request_id} not found.",
        )
    res = r.resource
    revealed_contact = None
    if r.status in ("accepted", "completed"):
        revealed_contact = res.owner_contact_full or res.owner_contact_masked

    return WaterSharingRequestRead(
        id=r.id,
        requesting_farm_id=r.requesting_farm_id,
        resource_id=r.resource_id,
        resource_type=res.resource_type if res else None,
        resource_owner_farm_id=res.owner_farm_id if res else None,
        owner_name=res.owner_name if res else None,
        owner_contact=revealed_contact,
        requested_quantity_litres=r.requested_quantity_litres,
        agreed_quantity_litres=r.agreed_quantity_litres,
        preferred_start_time=r.preferred_start_time,
        preferred_end_time=r.preferred_end_time,
        agreed_start_time=r.agreed_start_time,
        agreed_end_time=r.agreed_end_time,
        requester_message=r.requester_message,
        owner_response_notes=r.owner_response_notes,
        status=r.status,
        delivery_method=r.delivery_method,
        completion_confirmed_by_requester=r.completion_confirmed_by_requester,
        completion_confirmed_by_owner=r.completion_confirmed_by_owner,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def update_water_request_status(
    db: Session, request_id: int, update_in: WaterSharingRequestStatusUpdate
) -> WaterSharingRequestRead:
    """
    Validates state transitions:
      pending -> accepted | declined | cancelled
      accepted -> completed | cancelled
    """
    r = db.query(WaterSharingRequestModel).filter(WaterSharingRequestModel.id == request_id).first()
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Water sharing request ID {request_id} not found.",
        )

    current_status = r.status
    target_status = update_in.status.lower().strip()

    valid_transitions = {
        "pending": {"accepted", "declined", "cancelled"},
        "accepted": {"completed", "cancelled"},
        "declined": set(),
        "cancelled": set(),
        "completed": set(),
    }

    if target_status not in valid_transitions.get(current_status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid status transition from '{current_status}' to '{target_status}'. "
                f"Permitted next statuses: {list(valid_transitions.get(current_status, []))}"
            ),
        )

    r.status = target_status

    if update_in.owner_response_notes is not None:
        r.owner_response_notes = update_in.owner_response_notes

    if target_status == "accepted":
        r.agreed_quantity_litres = (
            update_in.agreed_quantity_litres or r.requested_quantity_litres
        )
        r.agreed_start_time = update_in.agreed_start_time or r.preferred_start_time
        r.agreed_end_time = update_in.agreed_end_time or r.preferred_end_time

    if target_status == "completed":
        r.completion_confirmed_by_owner = True
        r.completion_confirmed_by_requester = True

    db.commit()
    db.refresh(r)
    return get_water_request_by_id(db, request_id)


# -------------------------------------------------------------------------
# Shortage Action Planner Matching Engine
# -------------------------------------------------------------------------

def match_resources_for_shortage(
    db: Session,
    requester_farm_id: Optional[int],
    lat: float,
    lon: float,
    needed_litres: float,
    max_radius_km: float = 15.0,
) -> List[ResourceMatchItem]:
    """
    Finds and ranks active discoverable community resources to bridge a water deficit.
    """
    active_resources = (
        db.query(SharedWaterResourceModel)
        .filter(
            SharedWaterResourceModel.is_discoverable == True,
            SharedWaterResourceModel.status == "active",
            SharedWaterResourceModel.availability_end >= datetime.now(timezone.utc),
        )
        .all()
    )

    matches: List[Tuple[float, ResourceMatchItem]] = []

    for r in active_resources:
        if requester_farm_id is not None and r.owner_farm_id == requester_farm_id:
            continue

        dist = haversine_distance(lat, lon, r.latitude, r.longitude)
        if dist > max_radius_km:
            continue

        # Scoring
        match_score = 70.0
        explanations = []

        # Distance score
        if dist <= 3.0:
            match_score += 18.0
            explanations.append(f"Very close proximity ({dist} km); feasible for portable hose or direct piping.")
        elif dist <= 8.0:
            match_score += 10.0
            explanations.append(f"Moderate distance ({dist} km); suitable for tractor tanker or bowser transfer.")
        else:
            match_score -= 5.0
            explanations.append(f"Extended distance ({dist} km); requires motorized tanker transport.")

        # Volume coverage score
        coverage_pct = round(min(1.0, r.available_quantity_litres / max(1.0, needed_litres)) * 100.0, 1)
        if coverage_pct >= 100.0:
            match_score += 12.0
            explanations.append(f"Fully covers required deficit ({r.available_quantity_litres:,.0f} L available vs {needed_litres:,.0f} L needed).")
        else:
            match_score += 5.0
            explanations.append(f"Partially covers deficit ({coverage_pct}% of needed volume).")

        # Water quality
        if r.water_quality == "freshwater":
            explanations.append("Freshwater quality suitable for direct foliar/drip application.")
        else:
            match_score -= 5.0
            explanations.append(f"Water quality noted as '{r.water_quality}'; verify crop tolerance.")

        tier = "Excellent" if match_score >= 85 else ("Good" if match_score >= 75 else "Moderate")

        cost_sum = "Free / Mutual Support"
        if r.sharing_type == "paid":
            cost_sum = f"Paid ({r.price_per_unit} {r.price_unit})"
        elif r.sharing_type == "cost_sharing":
            cost_sum = "Electricity / Diesel Cost Sharing"

        item = ResourceMatchItem(
            resource_id=r.id,
            resource_type=r.resource_type.replace("_", " ").title(),
            distance_km=dist,
            available_quantity_litres=r.available_quantity_litres,
            match_score=min(99.0, max(40.0, round(match_score, 1))),
            compatibility_tier=tier,
            sharing_type=r.sharing_type.capitalize(),
            cost_summary=cost_sum,
            match_explanation=explanations,
            is_available_now=_is_available_now(r.availability_start, r.availability_end),
            approx_location=f"{r.approx_village_or_area or 'Local Area'}, {r.approx_district or 'Bengaluru'}",
        )
        matches.append((match_score, item))

    matches.sort(key=lambda x: x[0], reverse=True)
    return [m[1] for m in matches[:5]]
