import os
import sys
import logging

# Ensure backend root is on sys.path so 'app' is always resolvable
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core import database
from app.api.api_v1 import api_router, api_v1_router

# Ensure all database models are registered with Base metadata
import app.models.farm
import app.models.community_water

logger = logging.getLogger(__name__)

try:
    database.run_lightweight_migrations(database.engine, database.Base)
except (SQLAlchemyError, OSError, RuntimeError) as exc:
    logger.exception("Database initialization failed.")
    raise RuntimeError(
        "Database initialization failed. Check DATABASE_URL and ensure its directory is writable."
    ) from exc

app = FastAPI(
    title=settings.APP_NAME,
    description="Farmer-friendly smart irrigation recommendation engine and water balance API",
    version="0.1.0",
)

# Configure CORS for Vite dev server and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(api_router)
app.include_router(api_v1_router)


@app.get("/", tags=["Root"])
def root():
    """Root welcoming endpoint with basic service metadata."""
    return {
        "project": "AGR002 Smart Irrigation API",
        "status": "operational",
        "version": "0.1.0",
        "docs_url": "/docs",
        "health_check": "/health",
    }


@app.get("/health", tags=["Root"])
def health_check(response: Response):
    """Health status endpoint for monitoring and smoke testing."""
    from app.services.ml_bridge import get_ml_status

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
