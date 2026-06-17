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

    # Browser / deployment configuration
    CORS_ORIGINS: str = ""
    CORS_ORIGIN_REGEX: Optional[str] = r"^http://(localhost|127\.0\.0\.1)(:\d+)?$"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: Optional[str] = None

    # Sentry
    SENTRY_DSN: Optional[str] = None

    # SMTP Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@medicaldiary.com"
    RESEND_API_KEY: Optional[str] = None

    # App Config
    APP_NAME: str = "Medical Diary API"
    DEBUG: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    from pydantic import field_validator

    @field_validator("JWT_SECRET", "ENCRYPTION_KEY", mode="before")
    @classmethod
    def clean_keys(cls, v: str) -> str:
        if not isinstance(v, str):
            return v
        v = v.strip()
        if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
            v = v[1:-1]
        if '\\"' in v:
            v = v.replace('\\"', '"')
        return v


    @property
    def cors_origin_list(self) -> List[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def cors_origin_regex(self) -> Optional[str]:
        if not self.DEBUG or not self.CORS_ORIGIN_REGEX:
            return None
        value = self.CORS_ORIGIN_REGEX.strip()
        return value or None

    @property
    def cookie_samesite(self) -> str:
        value = self.COOKIE_SAMESITE.strip().lower()
        return value if value in {"lax", "strict", "none"} else "lax"

    @property
    def cookie_domain(self) -> Optional[str]:
        if not self.COOKIE_DOMAIN:
            return None
        value = self.COOKIE_DOMAIN.strip()
        return value or None

settings = Settings()
