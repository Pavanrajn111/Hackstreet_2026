import os
import sys

# Ensure backend root is on sys.path so 'app' is always resolvable
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.api_v1 import api_router

# Initialize database tables (SQLite)
Base.metadata.create_all(bind=engine)

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
    return {
        "status": "healthy",
        "environment": settings.APP_ENV,
        "database": "sqlite_ready",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
