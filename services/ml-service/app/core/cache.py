"""Redis caching layer for ML predictions."""

import redis.asyncio as redis
import json
import hashlib
from typing import Optional, Dict, Any, List
from app.config import settings
from app.core.logging import get_logger, MLMetrics

logger = get_logger(__name__)
metrics = MLMetrics()


class PredictionCache:
    """Redis-based caching for ML predictions."""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.ttl = settings.prediction_cache_ttl
    
    async def connect(self) -> None:
        """Initialize Redis connection."""
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                db=settings.redis_db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30,
            )
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.error("Failed to connect to Redis", error=str(e))
            self.redis_client = None
    
    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")
    
    def _generate_cache_key(
        self,
        user_id: str,
        candidate_items: List[str],
        attempt_history_hash: str,
        model_version: str
    ) -> str:
        """Generate cache key for prediction request."""
        # Create deterministic hash of request parameters
        key_data = {
            "user_id": user_id,
            "items": sorted(candidate_items),  # Sort for consistency
            "history_hash": attempt_history_hash,
            "model_version": model_version
        }
        key_string = json.dumps(key_data, sort_keys=True)
        key_hash = hashlib.sha256(key_string.encode()).hexdigest()[:16]
        return f"prediction:{user_id}:{key_hash}"
    
    def _hash_attempt_history(self, attempt_history: List[Dict[str, Any]]) -> str:
        """Create hash of attempt history for cache key."""
        # Use only relevant fields that affect predictions
        relevant_data = []
        for attempt in attempt_history:
            relevant_data.append({
                "item_id": attempt.get("item_id"),
                "correct": attempt.get("correct"),
                "quality": attempt.get("quality"),
                "timestamp": attempt.get("timestamp")
            })
        
        history_string = json.dumps(relevant_data, sort_keys=True, default=str)
        return hashlib.sha256(history_string.encode()).hexdigest()[:16]
    
    async def get_prediction(
        self,
        user_id: str,
        candidate_items: List[str],
        attempt_history: List[Dict[str, Any]],
        model_version: str
    ) -> Optional[Dict[str, Any]]:
        """Retrieve cached prediction if available."""
        if not self.redis_client:
            return None
        
        try:
            history_hash = self._hash_attempt_history(attempt_history)
            cache_key = self._generate_cache_key(
                user_id, candidate_items, history_hash, model_version
            )
            
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                metrics.log_cache_hit(cache_key, True)
                return json.loads(cached_data)
            else:
                metrics.log_cache_hit(cache_key, False)
                return None
                
        except Exception as e:
            logger.error("Cache retrieval failed", error=str(e), cache_key=cache_key)
            return None
    
    async def set_prediction(
        self,
        user_id: str,
        candidate_items: List[str],
        attempt_history: List[Dict[str, Any]],
        model_version: str,
        prediction_data: Dict[str, Any]
    ) -> None:
        """Cache prediction result."""
        if not self.redis_client:
            return
        
        try:
            history_hash = self._hash_attempt_history(attempt_history)
            cache_key = self._generate_cache_key(
                user_id, candidate_items, history_hash, model_version
            )
            
            # Add metadata to cached data
            from datetime import datetime
            cache_data = {
                **prediction_data,
                "cached_at": datetime.now().isoformat(),
                "cache_key": cache_key
            }
            
            await self.redis_client.setex(
                cache_key,
                self.ttl,
                json.dumps(cache_data, default=str)
            )
            
            logger.debug("Prediction cached", cache_key=cache_key, ttl=self.ttl)
            
        except Exception as e:
            logger.error("Cache storage failed", error=str(e), cache_key=cache_key)
    
    async def invalidate_user_cache(self, user_id: str) -> None:
        """Invalidate all cached predictions for a user."""
        if not self.redis_client:
            return
        
        try:
            pattern = f"prediction:{user_id}:*"
            keys = await self.redis_client.keys(pattern)
            if keys:
                await self.redis_client.delete(*keys)
                logger.info("User cache invalidated", user_id=user_id, keys_deleted=len(keys))
        except Exception as e:
            logger.error("Cache invalidation failed", error=str(e), user_id=user_id)
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        if not self.redis_client:
            return {"status": "disconnected"}
        
        try:
            info = await self.redis_client.info()
            return {
                "status": "connected",
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": (
                    info.get("keyspace_hits", 0) / 
                    max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1)
                )
            }
        except Exception as e:
            logger.error("Failed to get cache stats", error=str(e))
            return {"status": "error", "error": str(e)}


# Global cache instance
prediction_cache = PredictionCache()