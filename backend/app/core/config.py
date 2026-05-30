from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Database
    DATABASE_URL: str

    # Security
    JWT_SECRET: str
    ENCRYPTION_KEY: str
    ALGORITHM: str = "ES256"

    # Admin Configuration
    ADMIN_IP_ALLOWLIST: str = "127.0.0.1"

    # Sentry
    SENTRY_DSN: Optional[str] = None

    # SMTP Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@medicaldiary.com"

    # App Config
    APP_NAME: str = "Medical Diary API"
    DEBUG: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
