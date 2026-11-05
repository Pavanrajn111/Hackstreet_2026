from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.farm import SoilInfo
from app.services.irrigation_engine import load_soils_catalog

router = APIRouter(prefix="/soils", tags=["Soils"])


@router.get("", response_model=List[SoilInfo])
def get_supported_soils():
    """Retrieve list of soil classifications with their hydraulic properties."""
    soils_dict = load_soils_catalog()
    soils_list = []
    for name, data in soils_dict.items():
        soils_list.append(
            SoilInfo(
                id=data.get("id", name.lower().replace(" ", "-").replace("/", "-")),
                name=name,
                description=data.get("description", "Standard agricultural soil type."),
                available_water_capacity_mm_per_m=data.get("available_water_capacity_mm_per_m", 130.0),
                infiltration_rate_mm_hr=data.get("infiltration_rate_mm_hr", 20.0),
            )
        )
    return soils_list


@router.get("/{soil_id_or_name}", response_model=SoilInfo)
def get_soil_by_name(soil_id_or_name: str):
    """Retrieve details for a specific soil classification."""
    soils_dict = load_soils_catalog()
    clean = soil_id_or_name.strip().lower().replace("/", " ").replace("-", " ")
    for name, data in soils_dict.items():
        norm_name = name.lower().replace("/", " ").replace("-", " ")
        if norm_name == clean or data.get("id", "").lower() == clean or clean in norm_name:
            return SoilInfo(
                id=data.get("id", name.lower().replace(" ", "-").replace("/", "-")),
                name=name,
                description=data.get("description", "Standard agricultural soil type."),
                available_water_capacity_mm_per_m=data.get("available_water_capacity_mm_per_m", 130.0),
                infiltration_rate_mm_hr=data.get("infiltration_rate_mm_hr", 20.0),
            )
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Soil '{soil_id_or_name}' not found in agronomic database",
    )
