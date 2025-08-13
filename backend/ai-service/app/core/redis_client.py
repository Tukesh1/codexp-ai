import redis.asyncio as redis
import json
import logging
from typing import Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

class RedisClient:
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self.is_connected = False
    
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            
            # Test connection
            await self.client.ping()
            self.is_connected = True
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def close(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()
            self.is_connected = False
            logger.info("Redis connection closed")
    
    async def set(self, key: str, value: Any, ex: Optional[int] = None):
        """Set a key-value pair"""
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        return await self.client.set(key, value, ex=ex)
    
    async def get(self, key: str, parse_json: bool = False):
        """Get a value by key"""
        value = await self.client.get(key)
        if value and parse_json:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return value
    
    async def delete(self, key: str):
        """Delete a key"""
        return await self.client.delete(key)
    
    async def exists(self, key: str):
        """Check if key exists"""
        return await self.client.exists(key)
    
    async def lpush(self, key: str, *values):
        """Push values to the left of a list"""
        return await self.client.lpush(key, *values)
    
    async def rpop(self, key: str):
        """Pop value from the right of a list"""
        return await self.client.rpop(key)
    
    async def llen(self, key: str):
        """Get length of a list"""
        return await self.client.llen(key)

# Global Redis client instance
redis_client = RedisClient()
