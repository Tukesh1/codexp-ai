from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Any, Dict, List

from app.services.code_analyzer import CodeAnalyzer
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import (
    LLMService,
    build_project_context,
    get_latest_analysis,
    load_user_credentials_for_project,
    store_analysis,
)
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
from pydantic import BaseModel

router = APIRouter()


class GenerateDocsBody(BaseModel):
    project_id: str
    force: bool = False


def get_model_manager(request: Request):
    if not hasattr(request.app.state, "model_manager"):
        raise HTTPException(status_code=503, detail="Models not loaded")
    return request.app.state.model_manager


@router.post("/analyze/repository", response_model=AnalysisResponse)
async def analyze_repository(
    request: AnalyzeRepositoryRequest,
    model_manager=Depends(get_model_manager),
):
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
    try:
        analyzer = CodeAnalyzer(model_manager)
        summary = await analyzer.summarize_code(
            request.code,
            request.language,
            request.context,
        )
        return SummaryResponse(success=True, summary=summary, confidence=0.85)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask", response_model=AskQuestionResponse)
async def ask_question(
    request: AskQuestionRequest,
    model_manager=Depends(get_model_manager),
):
    """RAG + user OpenAI key Q&A."""
    try:
        creds = await load_user_credentials_for_project(request.project_id)
        embedding_service = EmbeddingService(model_manager)
        query_vecs = await embedding_service.generate_embeddings([request.question])
        similar = await embedding_service.search_similar(
            query_vecs[0],
            limit=request.limit,
            threshold=0.25,
        )

        sources: List[Dict[str, Any]] = []
        context_bits: List[str] = []
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
            else:
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
                context_bits.append(
                    f"{content_type} `{row['name']}` in `{row['path']}`: "
                    f"{row['signature'] or row['summary'] or ''}"
                )

        if not context_bits:
            context_bits.append(await build_project_context(request.project_id, max_symbols=40))

        llm = LLMService(creds["api_key"], creds["model"], creds.get("provider", "openai"))
        answer = await llm.answer_question(request.question, "\n".join(context_bits))

        return AskQuestionResponse(
            success=True,
            answer=answer,
            sources=sources,
            question=request.question,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/docs/generate")
async def generate_docs(body: GenerateDocsBody):
    """Synchronously generate docs with the user's OpenAI key."""
    try:
        existing = await get_latest_analysis(body.project_id, "docs")
        if existing and not body.force:
            return {"success": True, "format": "markdown", "content": existing.get("content", ""), "cached": True}

        creds = await load_user_credentials_for_project(body.project_id)
        llm = LLMService(creds["api_key"], creds["model"], creds.get("provider", "openai"))
        context = await build_project_context(body.project_id, max_symbols=120)
        docs = await llm.generate_docs(creds["project_name"], creds["repo_url"], context)
        await store_analysis(body.project_id, "docs", {"format": "markdown", "content": docs})
        return {"success": True, "format": "markdown", "content": docs, "cached": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/status")
async def get_models_status(model_manager=Depends(get_model_manager)):
    return {
        "embeddings": model_manager.is_loaded("embeddings"),
        "summarization": model_manager.is_loaded("summarization"),
        "generation": model_manager.is_loaded("generation"),
        "device": str(model_manager.device),
    }
