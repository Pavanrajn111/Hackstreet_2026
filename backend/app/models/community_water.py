"""
SQLAlchemy Models for Community Water Sharing & Resilience Planning
---------------------------------------------------------------------
Defines:
  1. SharedWaterResourceModel - Opt-in community water sharing repository
  2. WaterSharingRequestModel - Request & exchange coordination workflow
  3. WaterActionPlanAuditModel - History of generated water shortage action plans
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class SharedWaterResourceModel(Base):
    """
    Opt-in shared water resource or agricultural equipment.
    Strict privacy: exact coordinates and full contact are never exposed publicly.
    """
    __tablename__ = "shared_water_resources"

    id = Column(Integer, primary_key=True, index=True)
    owner_farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_name = Column(String(100), nullable=True, default="Neighboring Farmer")
    owner_contact_masked = Column(String(50), nullable=True, default="+91 98**** 1234")
    owner_contact_full = Column(String(50), nullable=True)  # Consented sharing only

    # Resource categorization
    # Options: farm_pond_surplus, borewell_slot, shared_pump, water_tanker, open_well_surplus
    resource_type = Column(String(60), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Quantity & Flow
    available_quantity_litres = Column(Float, nullable=False, default=10000.0)
    quantity_unit = Column(String(20), nullable=False, default="litres")
    flow_rate_lpm = Column(Float, nullable=True, default=120.0)

    # Water Quality (freshwater, slightly_saline, treated_wastewater, turbid_surface_water)
    water_quality = Column(String(50), nullable=False, default="freshwater")
    suitability_notes = Column(Text, nullable=True)

    # Availability Window
    availability_start = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    availability_end = Column(DateTime, nullable=False)

    # Commercial / Sharing Terms (free, paid, negotiable, cost_sharing)
    sharing_type = Column(String(30), nullable=False, default="free")
    price_per_unit = Column(Float, nullable=True, default=0.0)
    price_unit = Column(String(30), nullable=True, default="INR/1000L")
    terms_and_conditions = Column(Text, nullable=True)

    # Location & Discovery
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    approx_district = Column(String(100), nullable=True, default="Bengaluru Rural")
    approx_village_or_area = Column(String(120), nullable=True)
    discovery_radius_km = Column(Float, nullable=False, default=10.0)

    # Privacy and Status flags
    is_discoverable = Column(Boolean, nullable=False, default=False)  # Owner must explicitly opt in
    status = Column(String(30), nullable=False, default="active")    # active, paused, exhausted, closed
    is_demo_sample = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    farm = relationship("FarmModel", backref="shared_resources")
    requests = relationship(
        "WaterSharingRequestModel",
        back_populates="resource",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class WaterSharingRequestModel(Base):
    """
    Coordination workflow for requesting and approving water sharing.
    State machine: pending -> accepted | declined | cancelled -> completed.
    """
    __tablename__ = "water_sharing_requests"

    id = Column(Integer, primary_key=True, index=True)
    requesting_farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(Integer, ForeignKey("shared_water_resources.id", ondelete="CASCADE"), nullable=False, index=True)

    requested_quantity_litres = Column(Float, nullable=False)
    agreed_quantity_litres = Column(Float, nullable=True)

    preferred_start_time = Column(DateTime, nullable=False)
    preferred_end_time = Column(DateTime, nullable=False)
    agreed_start_time = Column(DateTime, nullable=True)
    agreed_end_time = Column(DateTime, nullable=True)

    requester_message = Column(Text, nullable=True)
    owner_response_notes = Column(Text, nullable=True)

    # Status: pending, accepted, declined, cancelled, completed
    status = Column(String(30), nullable=False, default="pending", index=True)
    delivery_method = Column(String(60), nullable=True, default="pipe_connection")

    completion_confirmed_by_requester = Column(Boolean, default=False)
    completion_confirmed_by_owner = Column(Boolean, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    requester_farm = relationship("FarmModel", backref="water_requests_made")
    resource = relationship("SharedWaterResourceModel", back_populates="requests")


class WaterActionPlanAuditModel(Base):
    """
    Audit log of generated water resilience / water shortage action plans.
    """
    __tablename__ = "water_action_plan_audits"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=True, index=True)
    crop = Column(String(50), nullable=False)
    water_deficit_litres = Column(Float, default=0.0)
    shortage_severity = Column(String(30), default="moderate")
    recommended_action_summary = Column(Text, nullable=True)
    ml_risk_signal = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    farm = relationship("FarmModel", backref="water_action_plans")
