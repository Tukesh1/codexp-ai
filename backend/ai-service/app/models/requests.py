from typing import List, Optional
from pydantic import BaseModel, Field


class AnalyzeRepositoryRequest(BaseModel):
    repository_path: str = Field(..., description="Local path to the cloned repository")
    project_id: str = Field(..., description="UUID of the project being analyzed")
    languages: Optional[List[str]] = Field(
        default=None,
        description="Optional language filter (python, javascript, typescript, go, cpp)",
    )


class GenerateEmbeddingRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, description="Texts to embed")


class SummarizeCodeRequest(BaseModel):
    code: str = Field(..., description="Source code to summarize")
    language: str = Field(default="python", description="Programming language")
    context: Optional[str] = Field(default=None, description="Optional extra context")


class AskQuestionRequest(BaseModel):
    project_id: str = Field(..., description="Project UUID to search within")
    question: str = Field(..., min_length=1, description="Natural language question")
    limit: int = Field(default=5, ge=1, le=20, description="Max code snippets to retrieve")


class SearchCodeRequest(BaseModel):
    project_id: str
    query: str
    limit: int = Field(default=10, ge=1, le=50)
