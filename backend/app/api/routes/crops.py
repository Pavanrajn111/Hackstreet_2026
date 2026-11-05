from typing import List
from fastapi import APIRouter
from app.schemas.farm import CropInfo
from app.services.irrigation_engine import CROP_DATABASE

router = APIRouter(prefix="/crops", tags=["Crops"])


@router.get("", response_model=List[CropInfo])
def get_supported_crops():
    """Retrieve list of crops supported by the irrigation knowledge base."""
    crop_list = []
    for name, data in CROP_DATABASE.items():
        crop_list.append(
            CropInfo(
                id=name.lower().replace(" ", "-"),
                name=name,
                category="Field / Vegetable",
                duration_days=data["duration_days"],
                stages=data["stages"],
                base_kc=data["stages"][1]["kc"],
            )
        )
    return crop_list
