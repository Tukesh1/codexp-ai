import os
from typing import Optional

class Settings:
    # Environment
    ENVIRONMENT: str = os.getenv("PYTHON_ENV", "development")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://codeexp:secure_password@localhost:5432/codeexp"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Hugging Face
    HUGGINGFACE_API_KEY: Optional[str] = os.getenv("HUGGINGFACE_API_KEY")
    MODEL_CACHE_DIR: str = os.getenv("MODEL_CACHE_DIR", "/app/models")
    
    # Model Configuration
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    SUMMARIZATION_MODEL: str = "microsoft/CodeBERT-base"
    CODE_GENERATION_MODEL: str = "Salesforce/codet5-base"
    
    # Processing
    MAX_CHUNK_SIZE: int = 512
    MAX_WORKERS: int = 4
    BATCH_SIZE: int = 32
    
    # Storage
    S3_BUCKET: Optional[str] = os.getenv("S3_BUCKET")
    S3_ACCESS_KEY: Optional[str] = os.getenv("S3_ACCESS_KEY")
    S3_SECRET_KEY: Optional[str] = os.getenv("S3_SECRET_KEY")
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
    
    # Monitoring
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

settings = Settings()
