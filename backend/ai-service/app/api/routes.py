from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Any, Dict, List

from app.services.code_analyzer import CodeAnalyzer
from app.services.embedding_service import EmbeddingService
from app.models.requests import (
    AnalyzeRepositoryRequest,
    GenerateEmbeddingRequest,
    SummarizeCodeRequest,
    AskQuestionRequest,
)
from app.models.responses import (
    AnalysisResponse,
    EmbeddingResponse,
    SummaryResponse,
    AskQuestionResponse,
)
from app.core.database import database

router = APIRouter()


def get_model_manager(request: Request):
    """Dependency to get model manager from app state"""
    if not hasattr(request.app.state, "model_manager"):
        raise HTTPException(status_code=503, detail="Models not loaded")
    return request.app.state.model_manager


@router.post("/analyze/repository", response_model=AnalysisResponse)
async def analyze_repository(
    request: AnalyzeRepositoryRequest,
    model_manager=Depends(get_model_manager),
):
    """Analyze a repository and extract code structures"""
    try:
        analyzer = CodeAnalyzer(model_manager)
        result = await analyzer.analyze_repository(
            request.repository_path,
            request.project_id,
            request.languages,
        )
        return AnalysisResponse(
            success=True,
            data=result,
            message="Repository analyzed successfully",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embeddings/generate", response_model=EmbeddingResponse)
async def generate_embeddings(
    request: GenerateEmbeddingRequest,
    model_manager=Depends(get_model_manager),
):
    """Generate embeddings for code snippets"""
    try:
        embedding_service = EmbeddingService(model_manager)
        embeddings = await embedding_service.generate_embeddings(request.texts)

        return EmbeddingResponse(
            success=True,
            embeddings=embeddings,
            dimension=len(embeddings[0]) if embeddings else 0,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarize/code", response_model=SummaryResponse)
async def summarize_code(
    request: SummarizeCodeRequest,
    model_manager=Depends(get_model_manager),
):
    """Generate summary for code snippets"""
    try:
        analyzer = CodeAnalyzer(model_manager)
        summary = await analyzer.summarize_code(
            request.code,
            request.language,
            request.context,
        )

        return SummaryResponse(
            success=True,
            summary=summary,
            confidence=0.85,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask", response_model=AskQuestionResponse)
async def ask_question(
    request: AskQuestionRequest,
    model_manager=Depends(get_model_manager),
):
    """RAG-style Q&A over a project's embedded code entities."""
    try:
        embedding_service = EmbeddingService(model_manager)
        query_vecs = await embedding_service.generate_embeddings([request.question])
        similar = await embedding_service.search_similar(
            query_vecs[0],
            limit=request.limit,
            threshold=0.3,
        )

        sources: List[Dict[str, Any]] = []
        for item in similar:
            content_type = item["content_type"]
            content_id = item["content_id"]
            if content_type == "function":
                row = await database.fetchrow(
                    """
                    SELECT f.name, f.signature, f.summary, fl.path
                    FROM functions f
                    JOIN files fl ON fl.id = f.file_id
                    WHERE f.id = $1 AND fl.project_id = $2
                    """,
                    content_id,
                    request.project_id,
                )
            elif content_type == "class":
                row = await database.fetchrow(
                    """
                    SELECT c.name, NULL as signature, c.summary, fl.path
                    FROM classes c
                    JOIN files fl ON fl.id = c.file_id
                    WHERE c.id = $1 AND fl.project_id = $2
                    """,
                    content_id,
                    request.project_id,
                )
            else:
                row = None

            if row:
                sources.append(
                    {
                        "content_type": content_type,
                        "name": row["name"],
                        "signature": row["signature"],
                        "summary": row["summary"],
                        "path": row["path"],
                        "similarity": item["similarity"],
                    }
                )

        if not sources:
            answer = (
                "I couldn't find relevant code for that question. "
                "Make sure the project has been analyzed and embeddings generated."
            )
        else:
            lines = [
                f"Based on semantic search across the codebase, here are the most relevant matches for: “{request.question}”",
                "",
            ]
            for src in sources:
                lines.append(
                    f"- `{src['name']}` ({src['content_type']}) in `{src['path']}` "
                    f"(similarity {src['similarity']:.2f})"
                )
                if src.get("summary"):
                    lines.append(f"  Summary: {src['summary']}")
                elif src.get("signature"):
                    lines.append(f"  Signature: {src['signature']}")
            answer = "\n".join(lines)

        return AskQuestionResponse(
            success=True,
            answer=answer,
            sources=sources,
            question=request.question,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/status")
async def get_models_status(model_manager=Depends(get_model_manager)):
    """Get status of loaded models"""
    return {
        "embeddings": model_manager.is_loaded("embeddings"),
        "summarization": model_manager.is_loaded("summarization"),
        "generation": model_manager.is_loaded("generation"),
        "device": str(model_manager.device),
    }
