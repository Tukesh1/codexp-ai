"""Background job worker that consumes Redis analysis queues."""

import asyncio
import json
import logging
import os
import shutil
import tempfile
from typing import Any, Dict, Optional

from app.core.database import database
from app.core.redis_client import redis_client
from app.services.code_analyzer import CodeAnalyzer
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import (
    LLMService,
    build_project_context,
    load_user_credentials_for_project,
    store_analysis,
    get_latest_analysis,
)

logger = logging.getLogger(__name__)

QUEUE_NAME = "jobs:repository_analysis"
DOCS_QUEUE = "jobs:docs_generation"


class JobWorker:
    """Polls Redis for repository analysis and docs jobs."""

    def __init__(self, model_manager):
        self.model_manager = model_manager
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("Job worker started")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Job worker stopped")

    async def _loop(self):
        while self._running:
            try:
                raw = await redis_client.rpop(QUEUE_NAME)
                if raw:
                    payload = json.loads(raw) if isinstance(raw, str) else raw
                    await self._process_analysis_job(payload)
                    continue

                raw_docs = await redis_client.rpop(DOCS_QUEUE)
                if raw_docs:
                    payload = json.loads(raw_docs) if isinstance(raw_docs, str) else raw_docs
                    await self._process_docs_job(payload)
                    continue

                await asyncio.sleep(2)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.exception("Job worker loop error: %s", e)
                await asyncio.sleep(3)

    async def _process_analysis_job(self, payload: Dict[str, Any]):
        job_id = payload.get("id")
        project_id = str(payload.get("project_id"))
        data = payload.get("data") or {}
        repo_url = data.get("repo_url")

        logger.info("Processing analysis job %s for project %s", job_id, project_id)

        if not job_id or not project_id or not repo_url:
            logger.error("Invalid job payload: %s", payload)
            return

        await self._update_job(job_id, "running", 5)
        await self._update_project_status(project_id, "analyzing")

        tmp_dir = None
        try:
            # Require user API key up front
            creds = await load_user_credentials_for_project(project_id)
            llm = LLMService(creds["api_key"], creds["model"], creds.get("provider", "openai"))

            tmp_dir = tempfile.mkdtemp(prefix="codeexp-")
            repo_path = os.path.join(tmp_dir, "repo")

            await self._update_job(job_id, "running", 15)
            await self._clone_repo(repo_url, repo_path)

            await self._update_job(job_id, "running", 35)
            # Capture previous symbol snapshot before re-analyze for changelog
            prev_snapshot = await get_latest_analysis(project_id, "symbol_snapshot")
            analyzer = CodeAnalyzer(self.model_manager)
            result = await analyzer.analyze_repository(repo_path, project_id)

            await self._update_job(job_id, "running", 55)
            await self._generate_embeddings_for_project(project_id)

            await self._update_job(job_id, "running", 70)
            context = await build_project_context(project_id)
            overview = await llm.generate_overview(
                creds["project_name"], creds["repo_url"] or repo_url, context
            )
            await store_analysis(
                project_id,
                "overview",
                {"content": overview, "format": "markdown"},
            )

            await self._update_job(job_id, "running", 85)
            diagram = await llm.generate_diagram(creds["project_name"], context)
            await store_analysis(
                project_id,
                "diagram",
                {"format": "mermaid", "content": diagram},
            )

            await self._update_job(job_id, "running", 92)
            current_snapshot = await self._build_symbol_snapshot(project_id)
            await store_analysis(project_id, "symbol_snapshot", current_snapshot)
            if prev_snapshot:
                changelog = await self._build_changelog(
                    llm, prev_snapshot, current_snapshot
                )
                await store_analysis(project_id, "changelog", changelog)

            await self._update_job(job_id, "running", 95)
            await store_analysis(
                project_id,
                "summary",
                {
                    **result,
                    "message": overview[:500],
                    "overview_generated": True,
                    "diagram_generated": True,
                },
            )

            # Save symbol snapshot for changelog feature
            await self._save_symbol_snapshot(project_id)

            await self._update_project_status(project_id, "completed")
            await self._update_job(job_id, "completed", 100)
            logger.info("Analysis job %s completed", job_id)

        except Exception as e:
            logger.exception("Analysis job %s failed: %s", job_id, e)
            await self._update_project_status(project_id, "failed")
            await self._update_job(job_id, "failed", 0, str(e))
        finally:
            if tmp_dir and os.path.isdir(tmp_dir):
                shutil.rmtree(tmp_dir, ignore_errors=True)

    async def _process_docs_job(self, payload: Dict[str, Any]):
        job_id = payload.get("id")
        project_id = str(payload.get("project_id"))
        logger.info("Processing docs job %s for project %s", job_id, project_id)

        if not job_id or not project_id:
            return

        await self._update_job(job_id, "running", 10)
        try:
            creds = await load_user_credentials_for_project(project_id)
            llm = LLMService(creds["api_key"], creds["model"], creds.get("provider", "openai"))
            context = await build_project_context(project_id, max_symbols=120)
            await self._update_job(job_id, "running", 40)
            docs = await llm.generate_docs(
                creds["project_name"], creds["repo_url"], context
            )
            await store_analysis(
                project_id,
                "docs",
                {"format": "markdown", "content": docs},
            )
            await self._update_job(job_id, "completed", 100)
            logger.info("Docs job %s completed", job_id)
        except Exception as e:
            logger.exception("Docs job %s failed: %s", job_id, e)
            await self._update_job(job_id, "failed", 0, str(e))

    async def _clone_repo(self, repo_url: str, destination: str):
        url = repo_url.strip()
        if not url.startswith("http") and not url.startswith("git@"):
            url = f"https://github.com/{url}.git"

        process = await asyncio.create_subprocess_exec(
            "git",
            "clone",
            "--depth=1",
            url,
            destination,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(f"git clone failed: {stderr.decode().strip()}")

    async def _generate_embeddings_for_project(self, project_id: str):
        embedding_service = EmbeddingService(self.model_manager)

        functions = await database.fetch(
            """
            SELECT f.id, f.name, f.signature, fl.language, fl.path
            FROM functions f
            JOIN files fl ON fl.id = f.file_id
            WHERE fl.project_id = $1
            LIMIT 500
            """,
            project_id,
        )

        items = []
        for row in functions:
            text = embedding_service.preprocess_code_for_embedding(
                row["signature"] or row["name"],
                row["language"] or "unknown",
                row["name"],
            )
            items.append(
                {
                    "content_type": "function",
                    "content_id": str(row["id"]),
                    "text": text,
                }
            )

        classes = await database.fetch(
            """
            SELECT c.id, c.name, fl.language
            FROM classes c
            JOIN files fl ON fl.id = c.file_id
            WHERE fl.project_id = $1
            LIMIT 200
            """,
            project_id,
        )
        for row in classes:
            text = f"{row['language'] or 'code'} class {row['name']}"
            items.append(
                {
                    "content_type": "class",
                    "content_id": str(row["id"]),
                    "text": text,
                }
            )

        if items:
            await embedding_service.generate_and_store_embeddings(items)

    async def _update_project_status(self, project_id: str, status: str):
        await database.execute(
            """
            UPDATE projects
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            """,
            status,
            project_id,
        )

    async def _save_symbol_snapshot(self, project_id: str):
        """Save current symbol set as a snapshot for changelog computation."""
        try:
            rows = await database.fetch(
                """
                SELECT entity_type || ':' || name || ':' || path as symbol_key FROM (
                    SELECT 'function' as entity_type, f.name, fl.path
                    FROM functions f
                    JOIN files fl ON fl.id = f.file_id
                    WHERE fl.project_id = $1
                    UNION ALL
                    SELECT 'class' as entity_type, c.name, fl.path
                    FROM classes c
                    JOIN files fl ON fl.id = c.file_id
                    WHERE fl.project_id = $1
                ) symbols
                """,
                project_id,
            )
            snapshot = {row["symbol_key"]: True for row in rows}
            await store_analysis(project_id, "symbol_snapshot", snapshot)
            logger.info("Saved symbol snapshot for project %s with %d symbols", project_id, len(snapshot))
        except Exception as e:
            logger.warning("Failed to save symbol snapshot: %s", e)

    async def _update_job(
        self,
        job_id: str,
        status: str,
        progress: int,
        error_message: Optional[str] = None,
    ):
        status_key = f"job_status:{job_id}"
        existing = await redis_client.get(status_key, parse_json=True)
        if not isinstance(existing, dict):
            existing = {"id": job_id}

        existing["status"] = status
        existing["progress"] = progress
        existing["error_message"] = error_message
        await redis_client.set(status_key, existing, ex=86400)

        try:
            await database.execute(
                """
                UPDATE jobs
                SET status = $2, progress = $3, error_message = $4, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1::uuid
                """,
                job_id,
                status,
                progress,
                error_message,
            )
        except Exception as e:
            logger.warning("Failed to sync job to DB: %s", e)

    async def _build_symbol_snapshot(self, project_id: str) -> Dict[str, Any]:
        fns = await database.fetch(
            """
            SELECT f.name || '@' || fl.path AS key
            FROM functions f JOIN files fl ON fl.id = f.file_id
            WHERE fl.project_id = $1 ORDER BY 1
            """,
            project_id,
        )
        cls = await database.fetch(
            """
            SELECT c.name || '@' || fl.path AS key
            FROM classes c JOIN files fl ON fl.id = c.file_id
            WHERE fl.project_id = $1 ORDER BY 1
            """,
            project_id,
        )
        functions = [r["key"] for r in fns]
        classes = [r["key"] for r in cls]
        return {
            "functions": functions,
            "classes": classes,
            "stats": {"functions": len(functions), "classes": len(classes)},
        }

    async def _build_changelog(
        self,
        llm: LLMService,
        prev: Dict[str, Any],
        current: Dict[str, Any],
    ) -> Dict[str, Any]:
        prev_f = set(prev.get("functions") or [])
        prev_c = set(prev.get("classes") or [])
        cur_f = set(current.get("functions") or [])
        cur_c = set(current.get("classes") or [])
        added_f = sorted(cur_f - prev_f)
        removed_f = sorted(prev_f - cur_f)
        added_c = sorted(cur_c - prev_c)
        removed_c = sorted(prev_c - cur_c)

        briefing = ""
        try:
            prompt = (
                "Write a short markdown changelog briefing (max 8 bullets) for this symbol diff. "
                "Focus on what a developer should re-learn.\n"
                f"Added functions: {', '.join(added_f[:30]) or '(none)'}\n"
                f"Removed functions: {', '.join(removed_f[:30]) or '(none)'}\n"
                f"Added classes: {', '.join(added_c[:20]) or '(none)'}\n"
                f"Removed classes: {', '.join(removed_c[:20]) or '(none)'}"
            )
            briefing = await llm.answer_question(prompt, "Symbol-level re-analysis diff.")
        except Exception as e:
            logger.warning("Changelog briefing failed: %s", e)

        return {
            "baseline": False,
            "added_functions": added_f,
            "removed_functions": removed_f,
            "added_classes": added_c,
            "removed_classes": removed_c,
            "stats": {
                "added_functions": len(added_f),
                "removed_functions": len(removed_f),
                "added_classes": len(added_c),
                "removed_classes": len(removed_c),
            },
            "briefing": briefing,
            "message": "Diff vs previous symbol snapshot from re-analyze.",
        }
