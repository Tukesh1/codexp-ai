from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any

from app.services.code_analyzer import CodeAnalyzer
from app.services.embedding_service import EmbeddingService
from app.models.requests import (
    AnalyzeRepositoryRequest,
    GenerateEmbeddingRequest,
    SummarizeCodeRequest
)
from app.models.responses import (
    AnalysisResponse,
    EmbeddingResponse,
    SummaryResponse
)

router = APIRouter()

def get_model_manager(request: Request):
    """Dependency to get model manager from app state"""
    if not hasattr(request.app.state, 'model_manager'):
        raise HTTPException(status_code=503, detail="Models not loaded")
    return request.app.state.model_manager

@router.post("/analyze/repository", response_model=AnalysisResponse)
async def analyze_repository(
    request: AnalyzeRepositoryRequest,
    model_manager = Depends(get_model_manager)
):
    """Analyze a repository and extract code structures"""
    try:
        analyzer = CodeAnalyzer(model_manager)
        result = await analyzer.analyze_repository(
            request.repository_path,
            request.project_id,
            request.languages
        )
        return AnalysisResponse(
            success=True,
            data=result,
            message="Repository analyzed successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/embeddings/generate", response_model=EmbeddingResponse)
async def generate_embeddings(
    request: GenerateEmbeddingRequest,
    model_manager = Depends(get_model_manager)
):
    """Generate embeddings for code snippets"""
    try:
        embedding_service = EmbeddingService(model_manager)
        embeddings = await embedding_service.generate_embeddings(request.texts)
        
        return EmbeddingResponse(
            success=True,
            embeddings=embeddings,
            dimension=len(embeddings[0]) if embeddings else 0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summarize/code", response_model=SummaryResponse)
async def summarize_code(
    request: SummarizeCodeRequest,
    model_manager = Depends(get_model_manager)
):
    """Generate summary for code snippets"""
    try:
        analyzer = CodeAnalyzer(model_manager)
        summary = await analyzer.summarize_code(
            request.code,
            request.language,
            request.context
        )
        
        return SummaryResponse(
            success=True,
            summary=summary,
            confidence=0.85  # Placeholder confidence score
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/status")
async def get_models_status(model_manager = Depends(get_model_manager)):
    """Get status of loaded models"""
    return {
        "embeddings": model_manager.is_loaded("embeddings"),
        "summarization": model_manager.is_loaded("summarization"),
        "generation": model_manager.is_loaded("generation"),
        "device": str(model_manager.device)
    }
