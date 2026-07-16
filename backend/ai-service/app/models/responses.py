from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AnalysisResponse(BaseModel):
    success: bool
    data: Dict[str, Any] = Field(default_factory=dict)
    message: str = ""


class EmbeddingResponse(BaseModel):
    success: bool
    embeddings: List[List[float]] = Field(default_factory=list)
    dimension: int = 0


class SummaryResponse(BaseModel):
    success: bool
    summary: str
    confidence: float = 0.0


class AskQuestionResponse(BaseModel):
    success: bool
    answer: str
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    question: str


class SearchCodeResponse(BaseModel):
    success: bool
    results: List[Dict[str, Any]] = Field(default_factory=list)
