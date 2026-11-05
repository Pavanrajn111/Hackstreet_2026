from typing import List
from fastapi import APIRouter
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
