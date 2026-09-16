from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Automotive Virtual Advisor (Luis)"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["*"]

    # Database Configuration (SQLite by default for zero-config run, PostgreSQL supported)
    DATABASE_URL: str = "sqlite:///./auto_advisor.db"

    # Google Gen AI / Vertex AI Configuration
    GEMINI_API_KEY: Optional[str] = None
    GCP_PROJECT_ID: Optional[str] = None
    DEFAULT_MODEL: str = "gemini-1.5-pro"
    AGENT_TEMPERATURE: float = 0.2

    # Context & Memory Management
    MAX_HISTORY_MESSAGES: int = 20
    MAX_CONTEXT_TOKENS: int = 4000

    # OpenTelemetry & Google Cloud Trace Configuration
    OTEL_SERVICE_NAME: str = "auto-advisor-agent"
    ENABLE_GCP_TRACE: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
