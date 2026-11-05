from typing import List
from fastapi import APIRouter
from app.schemas.farm import SoilInfo
from app.services.irrigation_engine import SOIL_DATABASE

router = APIRouter(prefix="/soils", tags=["Soils"])


@router.get("", response_model=List[SoilInfo])
def get_supported_soils():
    """Retrieve list of soil classifications with their hydraulic properties."""
    soils_list = []
    descriptions = {
        "Red Sandy Loam": "Common in Southern India (e.g., Karnataka). Moderate water holding capacity, good drainage.",
        "Clay / Black Soil": "High water retention capacity (Vertisols), slow infiltration rate, common in Deccan plateau.",
        "Alluvial Loam": "Highly fertile soil prevalent in river basins, balanced water retention and drainage.",
        "Sandy Soil": "High infiltration, low water holding capacity; requires frequent, light irrigation pulses.",
    }
    for name, data in SOIL_DATABASE.items():
        soils_list.append(
            SoilInfo(
                id=name.lower().replace(" ", "-").replace("/", "-"),
                name=name,
                description=descriptions.get(name, "Standard agricultural soil type."),
                available_water_capacity_mm_per_m=data["available_water_capacity_mm_per_m"],
                infiltration_rate_mm_hr=data["infiltration_rate_mm_hr"],
            )
        )
    return soils_list
