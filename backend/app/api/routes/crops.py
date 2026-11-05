from typing import List
from fastapi import APIRouter
from app.schemas.farm import CropInfo
from app.services.irrigation_engine import load_crops_catalog

router = APIRouter(prefix="/crops", tags=["Crops"])


@router.get("", response_model=List[CropInfo])
def get_supported_crops():
    """Retrieve list of crops supported by the agronomic knowledge base."""
    crops_dict = load_crops_catalog()
    crop_list = []
    for name, data in crops_dict.items():
        crop_list.append(
            CropInfo(
                id=data.get("id", name.lower().replace(" ", "-")),
                name=name,
                category=data.get("category", "Field / Vegetable"),
                duration_days=data.get("duration_days", 110),
                stages=data.get("stages", []),
                base_kc=data.get("base_kc", 0.85),
            )
        )
    return crop_list
