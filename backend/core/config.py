import os
from typing import List, Optional
from pydantic import AnyHttpUrl, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Core Security
    PROJECT_NAME: str = "THE MRIDANSH Headquarters"
    API_V1_STR: str = "/api/v1"
    JWT_SECRET: str = "bootstrap_placeholder_secret_key_change_me_in_production"
    SESSION_SECRET: str = "bootstrap_placeholder_session_secret_change_me_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    ALGORITHM: str = "HS256"
    COMMANDER_USERNAME: str = "commander"
    COMMANDER_PASSWORD: str = "default_mridansh_password_change_me"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/mridansh_hq"

    # CORS Origins (to support localhost, Vercel, and future custom domains)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "https://aether-core-three.vercel.app",,  # Placeholder Vercel URL
    ]

    # External APIs
    CESIUM_ION_TOKEN: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    NASA_API_KEY: Optional[str] = None
    MAP_API_KEY: Optional[str] = None
    OPENWEATHER_API_KEY: Optional[str] = None
    GITHUB_API_KEY: Optional[str] = None

    # Integration Configuration Options
    AI_PROVIDER: str = "mock"  # openapi, gemini, mock
    GITHUB_OWNER: str = "GOURGOPAL618"
    GITHUB_REPO: str = "THE_MRIDANSH_HQ"
    GLOBAL_MOCK_MODE: bool = True  # Bypass outbound networks by default in development
    TRUSTED_PROXIES: List[str] = []  # Explicitly configured trusted reverse proxies list

    # App environment config to read .env
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @model_validator(mode="after")
    def resolve_sqlite_path(self) -> "Settings":
        if self.DATABASE_URL.startswith("sqlite:///./"):
            import os
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_file = self.DATABASE_URL.replace("sqlite:///./", "")
            self.DATABASE_URL = f"sqlite:///{os.path.join(backend_dir, db_file)}"
        return self

settings = Settings()
