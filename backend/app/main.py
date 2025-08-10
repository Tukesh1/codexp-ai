from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from app.core.config import settings
from app.core.auth import verify_supabase_token

app = FastAPI(title="Omni-SaaS FastAPI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Omni-SaaS — AI SaaS Starter Backend"}

app.include_router(api_router, prefix="/api/v1", dependencies=[Depends(verify_supabase_token)])
