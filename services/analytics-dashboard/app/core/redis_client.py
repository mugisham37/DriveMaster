"""Redis client configuration and connection management."""

import aioredis
from typing import Optional
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Global Redis connection pool
_redis_pool: Optional[aioredis.ConnectionPool] = None
_redis_client: Optional[aioredis.Redis] = None


async def init_redis():
    """Initialize Redis connection pool."""
    global _redis_pool, _redis_client
    
    try:
        # Create connection pool
        _redis_pool = aioredis.ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_POOL_SIZE,
            retry_on_timeout=True,
            decode_responses=True
        )
        
        # Create Redis client
        _redis_client = aioredis.Redis(connection_pool=_redis_pool)
        
        # Test connection
        await _redis_client.ping()
        
        logger.info("Redis connection initialized successfully")
        
    except Exception as e:
        logger.error("Failed to initialize Redis connection", error=str(e))
        raise


async def close_redis():
    """Close Redis connections."""
    global _redis_pool, _redis_client
    
    try:
        if _redis_client:
            await _redis_client.close()
            _redis_client = None
        
        if _redis_pool:
            await _redis_pool.disconnect()
            _redis_pool = None
        
        logger.info("Redis connections closed")
        
    except Exception as e:
        logger.error("Failed to close Redis connections", error=str(e))


async def get_redis_client() -> aioredis.Redis:
    """Get Redis client instance."""
    global _redis_client
    
    if _redis_client is None:
        await init_redis()
    
    return _redis_client


class RedisCache:
    """Redis cache utility class."""
    
    def __init__(self):
        self.client: Optional[aioredis.Redis] = None
    
    async def _get_client(self) -> aioredis.Redis:
        """Get Redis client."""
        if self.client is None:
            self.client = await get_redis_client()
        return self.client
    
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache."""
        try:
            client = await self._get_client()
            return await client.get(key)
        except Exception as e:
            logger.warning("Failed to get from cache", key=key, error=str(e))
            return None
    
    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        """Set value in cache."""
        try:
            client = await self._get_client()
            if ttl:
                return await client.setex(key, ttl, value)
            else:
                return await client.set(key, value)
        except Exception as e:
            logger.warning("Failed to set cache", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            client = await self._get_client()
            return bool(await client.delete(key))
        except Exception as e:
            logger.warning("Failed to delete from cache", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            client = await self._get_client()
            return bool(await client.exists(key))
        except Exception as e:
            logger.warning("Failed to check cache existence", key=key, error=str(e))
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter in cache."""
        try:
            client = await self._get_client()
            return await client.incrby(key, amount)
        except Exception as e:
            logger.warning("Failed to increment cache", key=key, error=str(e))
            return None
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration for key."""
        try:
            client = await self._get_client()
            return await client.expire(key, ttl)
        except Exception as e:
            logger.warning("Failed to set expiration", key=key, error=str(e))
            return False
    
    async def get_hash(self, key: str, field: str) -> Optional[str]:
        """Get hash field value."""
        try:
            client = await self._get_client()
            return await client.hget(key, field)
        except Exception as e:
            logger.warning("Failed to get hash field", key=key, field=field, error=str(e))
            return None
    
    async def set_hash(self, key: str, field: str, value: str) -> bool:
        """Set hash field value."""
        try:
            client = await self._get_client()
            return await client.hset(key, field, value)
        except Exception as e:
            logger.warning("Failed to set hash field", key=key, field=field, error=str(e))
            return False
    
    async def get_all_hash(self, key: str) -> dict:
        """Get all hash fields."""
        try:
            client = await self._get_client()
            return await client.hgetall(key)
        except Exception as e:
            logger.warning("Failed to get all hash fields", key=key, error=str(e))
            return {}
    
    async def add_to_set(self, key: str, *values: str) -> int:
        """Add values to set."""
        try:
            client = await self._get_client()
            return await client.sadd(key, *values)
        except Exception as e:
            logger.warning("Failed to add to set", key=key, error=str(e))
            return 0
    
    async def get_set_members(self, key: str) -> set:
        """Get all set members."""
        try:
            client = await self._get_client()
            return await client.smembers(key)
        except Exception as e:
            logger.warning("Failed to get set members", key=key, error=str(e))
            return set()
    
    async def is_set_member(self, key: str, value: str) -> bool:
        """Check if value is in set."""
        try:
            client = await self._get_client()
            return await client.sismember(key, value)
        except Exception as e:
            logger.warning("Failed to check set membership", key=key, value=value, error=str(e))
            return False
    
    async def push_to_list(self, key: str, *values: str) -> int:
        """Push values to list (left push)."""
        try:
            client = await self._get_client()
            return await client.lpush(key, *values)
        except Exception as e:
            logger.warning("Failed to push to list", key=key, error=str(e))
            return 0
    
    async def pop_from_list(self, key: str) -> Optional[str]:
        """Pop value from list (right pop)."""
        try:
            client = await self._get_client()
            return await client.rpop(key)
        except Exception as e:
            logger.warning("Failed to pop from list", key=key, error=str(e))
            return None
    
    async def get_list_range(self, key: str, start: int = 0, end: int = -1) -> list:
        """Get range of list values."""
        try:
            client = await self._get_client()
            return await client.lrange(key, start, end)
        except Exception as e:
            logger.warning("Failed to get list range", key=key, error=str(e))
            return []


# Global cache instance
cache = RedisCache()