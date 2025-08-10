from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator, ValidationError


class Settings(BaseSettings):
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    HUGGINGFACE_TOKEN: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    SUPABASE_URL: str
    SUPABASE_JWT_SECRET: str
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
