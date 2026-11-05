from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.farm import CropInfo
from app.services.irrigation_engine import load_crops_catalog, find_crop_info

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


@router.get("/{crop_id_or_name}", response_model=CropInfo)
def get_crop_by_name(crop_id_or_name: str):
    """Retrieve details for a specific supported crop by name or identifier."""
    crops_dict = load_crops_catalog()
    clean = crop_id_or_name.strip().lower()
    for name, data in crops_dict.items():
        if name.lower() == clean or data.get("id", "").lower() == clean:
            return CropInfo(
                id=data.get("id", name.lower().replace(" ", "-")),
                name=name,
                category=data.get("category", "Field / Vegetable"),
                duration_days=data.get("duration_days", 110),
                stages=data.get("stages", []),
                base_kc=data.get("base_kc", 0.85),
            )
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Crop '{crop_id_or_name}' not found in agronomic database",
    )
