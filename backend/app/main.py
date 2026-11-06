import logging

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.database import engine, Base
from app.api.api_v1 import api_router

logger = logging.getLogger(__name__)

# Initialize database tables (SQLite)
try:
    Base.metadata.create_all(bind=engine)
except SQLAlchemyError as exc:
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
def health_check():
    """Health status endpoint for monitoring and smoke testing."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.exception("Database health check failed.")
        raise HTTPException(status_code=503, detail="Database is unavailable.") from exc

    return {
        "status": "healthy",
        "environment": settings.APP_ENV,
        "database": "sqlite_ready",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
