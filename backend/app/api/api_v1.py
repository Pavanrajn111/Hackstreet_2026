from fastapi import APIRouter, Response, status
from app.core.database import check_db_health, get_last_backup_info
from app.core.config import settings
from app.api.routes.crops import router as crops_router
from app.api.routes.soils import router as soils_router
from app.api.routes.recommend import router as recommend_router
from app.api.routes.farms import router as farms_router
from app.api.routes.history import router as history_router
from app.api.routes.hybrid import router as hybrid_router
from app.api.routes.crop_planner import router as crop_planner_router
from app.api.routes.adaptive_irrigation import router as adaptive_irrigation_router
from app.api.routes.community_water import router as community_water_router
from app.api.routes.water_resilience import router as water_resilience_router
from app.api.routes.chat import router as chat_router

api_router = APIRouter(prefix="/api")
api_v1_router = APIRouter(prefix="/api/v1")


from app.services.ml_bridge import get_ml_status


@api_router.get("/health", tags=["Health"])
def api_health_check(response: Response):
    """Health check endpoint under /api prefix."""
    from app.core import database
    db_ok, db_msg = database.check_db_health()
    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "healthy" if db_ok else "unhealthy",
        "environment": settings.APP_ENV,
        "database": "sqlite_ready" if db_ok else "unavailable",
        "database_details": db_msg,
        "backup": database.get_last_backup_info(),
        "ml": get_ml_status(),
    }


@api_v1_router.get("/health", tags=["Health"])
def api_v1_health_check(response: Response):
    """Health check endpoint under /api/v1 prefix."""
    from app.core import database
    db_ok, db_msg = database.check_db_health()
    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "healthy" if db_ok else "unhealthy",
        "environment": settings.APP_ENV,
        "database": "sqlite_ready" if db_ok else "unavailable",
        "database_details": db_msg,
        "api_version": "v1",
        "backup": database.get_last_backup_info(),
        "ml": get_ml_status(),
    }


@api_router.get("/ml/status", tags=["ML"])
def get_ml_status_api():
    """Current ML subsystem status, loaded models, and framework versions."""
    return get_ml_status()


@api_v1_router.get("/ml/status", tags=["ML"])
def get_ml_v1_status_api():
    """Current ML subsystem status, loaded models, and framework versions."""
    return get_ml_status()


# Mount all route modules on /api
api_router.include_router(crops_router)
api_router.include_router(soils_router)
api_router.include_router(recommend_router)
api_router.include_router(farms_router)
api_router.include_router(history_router)
api_router.include_router(hybrid_router)
api_router.include_router(crop_planner_router)
api_router.include_router(adaptive_irrigation_router)
api_router.include_router(community_water_router)
api_router.include_router(water_resilience_router)
api_router.include_router(chat_router)

# Mount all route modules on /api/v1
api_v1_router.include_router(crops_router)
api_v1_router.include_router(soils_router)
api_v1_router.include_router(recommend_router)
api_v1_router.include_router(farms_router)
api_v1_router.include_router(history_router)
api_v1_router.include_router(hybrid_router)
api_v1_router.include_router(crop_planner_router)
api_v1_router.include_router(adaptive_irrigation_router)
api_v1_router.include_router(community_water_router)
api_v1_router.include_router(water_resilience_router)
api_v1_router.include_router(chat_router)
