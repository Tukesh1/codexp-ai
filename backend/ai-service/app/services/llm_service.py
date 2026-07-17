"""LLM generation for overview, diagrams, docs, and Q&A (OpenAI + Gemini)."""

import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.core.database import database

logger = logging.getLogger(__name__)

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class LLMService:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini", provider: str = "openai"):
        self.api_key = api_key
        self.provider = (provider or "openai").lower()
        self.model = model or ("gemini-2.0-flash" if self.provider == "gemini" else "gpt-4o-mini")

    async def _chat(self, system: str, user: str, temperature: float = 0.3) -> str:
        if self.provider == "gemini":
            return await self._chat_gemini(system, user, temperature)
        return await self._chat_openai(system, user, temperature)

    async def _chat_openai(self, system: str, user: str, temperature: float) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(OPENAI_URL, headers=headers, json=payload)
            if resp.status_code >= 400:
                raise RuntimeError(f"OpenAI error {resp.status_code}: {resp.text[:400]}")
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()

    async def _chat_gemini(self, system: str, user: str, temperature: float) -> str:
        url = GEMINI_URL.format(model=self.model)
        payload = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"temperature": temperature},
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                url,
                params={"key": self.api_key},
                headers={"Content-Type": "application/json"},
                json=payload,
            )
            if resp.status_code >= 400:
                raise RuntimeError(f"Gemini error {resp.status_code}: {resp.text[:400]}")
            data = resp.json()
            try:
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except (KeyError, IndexError, TypeError) as e:
                raise RuntimeError(f"Unexpected Gemini response: {data}") from e

    async def generate_overview(self, project_name: str, repo_url: str, context: str) -> str:
        system = (
            "You are CodeExp AI, an expert software architect. "
            "Write a clear, structured repository overview for developers. "
            "Use markdown with sections: Purpose, Architecture, Key modules, Notable patterns, Getting started."
        )
        user = (
            f"Project: {project_name}\nRepo: {repo_url}\n\n"
            f"Codebase signals (files, languages, symbols):\n{context}\n\n"
            "Write the overview now."
        )
        return await self._chat(system, user)

    async def generate_diagram(self, project_name: str, context: str) -> str:
        system = (
            "You are CodeExp AI. Output ONLY a Mermaid flowchart that maps the architecture. "
            "Rules:\n"
            "- Start with `flowchart TB` (top to bottom).\n"
            "- Use 3–6 subgraphs for layers (e.g. Client, API, Services, Data, External).\n"
            "- Keep node labels short (2–4 words). Prefer module/package names over file paths.\n"
            "- Show the main dependency edges between layers and key components.\n"
            "- Max ~18 nodes. No style/classDef lines. No prose outside the mermaid block.\n"
            "- Use subgraph id[\"Label\"] syntax for multi-word subgraph titles."
        )
        user = (
            f"Project: {project_name}\n\nStructure signals:\n{context}\n\n"
            "Return a clean Mermaid architecture flowchart."
        )
        text = await self._chat(system, user, temperature=0.2)
        return extract_mermaid(text)

    async def generate_docs(self, project_name: str, repo_url: str, context: str) -> str:
        system = (
            "You are CodeExp AI. Generate developer documentation in markdown: "
            "Overview, Project structure, Core components, APIs/interfaces if detectable, "
            "How to run/develop, and Notes/limitations. Be accurate to the provided signals."
        )
        user = (
            f"Project: {project_name}\nRepo: {repo_url}\n\n"
            f"Signals:\n{context}\n\nGenerate documentation."
        )
        return await self._chat(system, user)

    async def answer_question(self, question: str, context: str, lens: Optional[str] = None) -> str:
        lens_key = (lens or "").strip().lower()
        lens_prompts = {
            "security": (
                "Adopt a security engineer lens: call out authz/authn gaps, injection, secrets, "
                "unsafe deserialization, and trust boundaries. Prioritize actionable risks."
            ),
            "reviewer": (
                "Adopt a senior code-reviewer lens: correctness, edge cases, API contracts, "
                "naming, and maintainability. Be direct about what to change."
            ),
            "beginner": (
                "Adopt a patient teacher lens for a junior developer: plain language, "
                "define jargon, walk through control flow step by step."
            ),
            "performance": (
                "Adopt a performance engineer lens: hotspots, complexity, I/O, allocations, "
                "caching, and concurrency hazards."
            ),
            "architect": (
                "Adopt a software architect lens: module boundaries, coupling, data flow, "
                "extension points, and how this fits the larger system."
            ),
        }
        system = (
            "You are CodeExp AI helping a developer understand a codebase quickly. "
            "If SELECTED CODE is present, focus on that selection first: what it does, "
            "how it works, important inputs/outputs, edge cases, and how it fits nearby code. "
            "If MULTIPLE FILES are present, compare and relate them explicitly. "
            "Use only the provided context. Cite file paths and symbol names when possible. "
            "Be clear and concrete — prefer short sections over fluff."
        )
        if lens_key in lens_prompts:
            system = system + " " + lens_prompts[lens_key]
        user = f"Question: {question}\n\nRelevant code context:\n{context}"
        return await self._chat(system, user, temperature=0.2)


def extract_mermaid(text: str) -> str:
    text = text.strip()
    if "```mermaid" in text:
        start = text.find("```mermaid") + len("```mermaid")
        end = text.find("```", start)
        if end != -1:
            return text[start:end].strip()
    if "```" in text:
        start = text.find("```") + 3
        newline = text.find("\n", start)
        if newline != -1:
            start = newline + 1
        end = text.find("```", start)
        if end != -1:
            return text[start:end].strip()
    return text


async def load_user_credentials_for_project(project_id: str) -> Dict[str, str]:
    row = await database.fetchrow(
        """
        SELECT COALESCE(u.ai_provider, 'openai') AS ai_provider,
               COALESCE(u.ai_model, 'gpt-4o-mini') AS ai_model,
               u.openai_api_key,
               u.gemini_api_key,
               p.name, p.repo_url, p.user_id
        FROM projects p
        JOIN users u ON u.id = p.user_id
        WHERE p.id = $1
        """,
        project_id,
    )
    if not row:
        raise RuntimeError("project not found")

    provider = (row["ai_provider"] or "openai").lower()
    model = row["ai_model"] or "gpt-4o-mini"

    if provider == "gemini":
        if not row["gemini_api_key"]:
            raise RuntimeError("Gemini API key not configured in user settings")
        if not model or model.startswith("gpt-"):
            model = "gemini-2.0-flash"
        api_key = row["gemini_api_key"]
    else:
        if not row["openai_api_key"]:
            raise RuntimeError("OpenAI API key not configured in user settings")
        if not model or model.startswith("gemini-"):
            model = "gpt-4o-mini"
        api_key = row["openai_api_key"]
        provider = "openai"

    return {
        "provider": provider,
        "api_key": api_key,
        "model": model,
        "project_name": row["name"],
        "repo_url": row["repo_url"] or "",
        "user_id": str(row["user_id"]),
    }


async def build_project_context(project_id: str, max_symbols: int = 80) -> str:
    langs = await database.fetch(
        """
        SELECT COALESCE(language, 'unknown') AS language, COUNT(*) AS count
        FROM files WHERE project_id = $1
        GROUP BY language ORDER BY count DESC
        """,
        project_id,
    )
    files = await database.fetch(
        """
        SELECT path, language, size_bytes FROM files
        WHERE project_id = $1 ORDER BY path LIMIT 60
        """,
        project_id,
    )
    symbols = await database.fetch(
        """
        SELECT name, entity_type, path, signature FROM (
            SELECT f.name, 'function' AS entity_type, fl.path, f.signature
            FROM functions f JOIN files fl ON fl.id = f.file_id
            WHERE fl.project_id = $1
            UNION ALL
            SELECT c.name, 'class' AS entity_type, fl.path, NULL AS signature
            FROM classes c JOIN files fl ON fl.id = c.file_id
            WHERE fl.project_id = $1
        ) s
        ORDER BY name LIMIT $2
        """,
        project_id,
        max_symbols,
    )

    parts: List[str] = []
    if langs:
        parts.append("Languages: " + ", ".join(f"{r['language']}({r['count']})" for r in langs))
    parts.append(f"File count sample: {len(files)}")
    if files:
        parts.append("Files:\n" + "\n".join(f"- {r['path']} [{r['language']}]" for r in files[:40]))
    if symbols:
        lines = []
        for r in symbols:
            sig = f" — {r['signature']}" if r["signature"] else ""
            lines.append(f"- {r['entity_type']} `{r['name']}` in `{r['path']}`{sig}")
        parts.append("Symbols:\n" + "\n".join(lines))
    return "\n\n".join(parts)


async def store_analysis(project_id: str, analysis_type: str, results: Dict[str, Any]):
    await database.execute(
        """
        INSERT INTO analyses (project_id, type, results)
        VALUES ($1, $2, $3::jsonb)
        """,
        project_id,
        analysis_type,
        json.dumps(results),
    )


async def get_latest_analysis(project_id: str, analysis_type: str) -> Optional[Dict[str, Any]]:
    row = await database.fetchrow(
        """
        SELECT results FROM analyses
        WHERE project_id = $1 AND type = $2
        ORDER BY created_at DESC LIMIT 1
        """,
        project_id,
        analysis_type,
    )
    if not row:
        return None
    results = row["results"]
    if isinstance(results, str):
        return json.loads(results)
    return dict(results)
