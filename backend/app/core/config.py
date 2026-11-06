from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AGR002 Smart Irrigation API"
    APP_ENV: str = "development"
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./irrigation.db"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    WEATHER_CACHE_TTL_SECONDS: int = 3600
    WEATHER_API_TIMEOUT_SECONDS: float = 8.0

    # ML settings
    ML_MODEL_ENABLED: bool = False
    ML_MODEL_DIR: str = "ml/models/models"
    ML_MODEL_PATH: str = "../ml/models/irrigation_model.joblib"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
