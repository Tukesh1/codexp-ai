import asyncpg
import logging
import os
import ssl
from typing import Optional, Union
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from app.core.config import settings

logger = logging.getLogger(__name__)


def _normalize_database_url(url: str) -> tuple[str, Union[bool, ssl.SSLContext]]:
    """Strip libpq sslmode from URL and return asyncpg-compatible ssl setting."""
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    sslmode = (query.pop("sslmode", [None])[0] or os.getenv("PGSSLMODE") or "").lower()

    # Rebuild URL without sslmode (asyncpg rejects it in DSN)
    new_query = urlencode({k: v[0] for k, v in query.items()})
    clean = urlunparse(parsed._replace(query=new_query))

    # Prefer SSL in production / when Railway/Neon require it
    if sslmode in ("disable", "false", "0"):
        return clean, False
    if sslmode in ("require", "verify-ca", "verify-full", "prefer", "true", "1"):
        ctx = ssl.create_default_context()
        if sslmode == "require":
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        return clean, ctx
    if settings.PYTHON_ENV == "production" or "railway" in (parsed.hostname or "").lower() or "neon.tech" in (parsed.hostname or "").lower():
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return clean, ctx
    return clean, False


class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.is_connected = False

    async def connect(self):
        """Create database connection pool"""
        try:
            dsn, ssl_opt = _normalize_database_url(settings.DATABASE_URL)
            self.pool = await asyncpg.create_pool(
                dsn,
                min_size=2,
                max_size=10,
                command_timeout=60,
                ssl=ssl_opt,
            )
            self.is_connected = True
            logger.info("Database connection pool created")
        except Exception as e:
            logger.error(f"Failed to create database pool: {e}")
            raise

    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            self.is_connected = False
            logger.info("Database connection pool closed")

    async def execute(self, query: str, *args):
        """Execute a query that doesn't return data"""
        async with self.pool.acquire() as connection:
            return await connection.execute(query, *args)

    async def fetch(self, query: str, *args):
        """Fetch multiple rows"""
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, *args)

    async def fetchrow(self, query: str, *args):
        """Fetch a single row"""
        async with self.pool.acquire() as connection:
            return await connection.fetchrow(query, *args)

    async def fetchval(self, query: str, *args):
        """Fetch a single value"""
        async with self.pool.acquire() as connection:
            return await connection.fetchval(query, *args)


# Global database instance
database = Database()
