import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.core.config import settings
from app.core.database import database
from app.core.redis_client import redis_client
from app.api.routes import router
from app.services.model_manager import ModelManager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting AI Service...")
    
    # Initialize database connection
    await database.connect()
    logger.info("Database connected")
    
    # Initialize Redis connection
    await redis_client.initialize()
    logger.info("Redis connected")
    
    # Initialize and load models
    model_manager = ModelManager()
    await model_manager.load_models()
    app.state.model_manager = model_manager
    logger.info("Models loaded successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Service...")
    await database.disconnect()
    await redis_client.close()
    logger.info("AI Service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="CodeExp AI Service",
    description="AI-powered code analysis and documentation service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database
        db_status = "healthy" if database.is_connected else "unhealthy"
        
        # Check Redis
        redis_status = "healthy" if redis_client.is_connected else "unhealthy"
        
        # Check models
        model_status = "healthy" if hasattr(app.state, 'model_manager') else "unhealthy"
        
        overall_status = "healthy" if all(s == "healthy" for s in [db_status, redis_status, model_status]) else "degraded"
        
        return {
            "status": overall_status,
            "services": {
                "database": db_status,
                "redis": redis_status,
                "models": model_status
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development"
    )
