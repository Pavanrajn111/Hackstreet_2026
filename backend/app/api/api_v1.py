from fastapi import APIRouter
from app.core.config import settings
from app.api.routes.crops import router as crops_router
from app.api.routes.soils import router as soils_router
from app.api.routes.recommend import router as recommend_router
from app.api.routes.farms import router as farms_router
from app.api.routes.history import router as history_router
from app.api.routes.hybrid import router as hybrid_router

api_router = APIRouter(prefix="/api")


@api_router.get("/health", tags=["Health"])
def api_health_check():
    """Health check endpoint under /api prefix."""
    return {
        "status": "healthy",
        "environment": settings.APP_ENV,
        "database": "sqlite_ready",
    }


api_router.include_router(crops_router)
api_router.include_router(soils_router)
api_router.include_router(recommend_router)
api_router.include_router(farms_router)
api_router.include_router(history_router)
api_router.include_router(hybrid_router)
