import json
import time
import logging
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field
from contextlib import asynccontextmanager
import asyncio

import redis.asyncio as redis
from redis.asyncio.cluster import RedisCluster
from redis.exceptions import RedisError, ConnectionError

logger = logging.getLogger(__name__)


@dataclass
class RedisConfig:
    """Redis connection configuration"""
    addresses: List[str] = field(default_factory=lambda: ["localhost:6379"])
    password: Optional[str] = None
    db: int = 0
    pool_size: int = 10
    min_idle_conns: int = 5
    max_retries: int = 3
    dial_timeout: float = 5.0
    read_timeout: float = 3.0
    write_timeout: float = 3.0
    pool_timeout: float = 4.0
    idle_timeout: float = 300.0
    cluster_mode: bool = False
    key_prefix: str = ""


@dataclass
class CacheMetrics:
    """Cache performance metrics"""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    errors: int = 0
    total_ops: int = 0
    avg_latency: float = 0.0


@dataclass
class CircuitBreakerState:
    """Circuit breaker state"""
    state: str = "closed"  # closed, open, half-open
    failures: int = 0
    last_failure_time: Optional[float] = None
    failure_threshold: int = 5
    reset_timeout: float = 30.0


class CacheMissError(Exception):
    """Raised when a cache key is not found"""
    pass


class RedisClient:
    """Redis client with connection management, circuit breaker, and metrics"""
    
    def __init__(self, config: RedisConfig):
        self.config = config
        self.client: Optional[Union[redis.Redis, RedisCluster]] = None
        self.metrics = CacheMetrics()
        self.circuit_breaker = CircuitBreakerState()
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Redis client based on configuration"""
        try:
            if self.config.cluster_mode:
                # Redis Cluster client
                startup_nodes = []
                for addr in self.config.addresses:
                    host, port = addr.split(':')
                    startup_nodes.append({"host": host, "port": int(port)})
                
                self.client = RedisCluster(
                    startup_nodes=startup_nodes,
                    password=self.config.password,
                    socket_timeout=self.config.read_timeout,
                    socket_connect_timeout=self.config.dial_timeout,
                    retry_on_timeout=True,
                    max_connections=self.config.pool_size,
                    decode_responses=True,
                )
            else:
                # Single Redis instance client
                host, port = self.config.addresses[0].split(':')
                self.client = redis.Redis(
                    host=host,
                    port=int(port),
                    password=self.config.password,
                    db=self.config.db,
                    socket_timeout=self.config.read_timeout,
                    socket_connect_timeout=self.config.dial_timeout,
                    retry_on_timeout=True,
                    max_connections=self.config.pool_size,
                    decode_responses=True,
                )
            
            logger.info(f"Redis client initialized (cluster: {self.config.cluster_mode})")
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            raise
    
    def _build_key(self, key: str) -> str:
        """Build cache key with prefix"""
        if self.config.key_prefix:
            return f"{self.config.key_prefix}:{key}"
        return key
    
    async def _execute_with_circuit_breaker(self, operation):
        """Execute Redis operation with circuit breaker pattern"""
        start_time = time.time()
        
        try:
            # Check circuit breaker state
            if self.circuit_breaker.state == "open":
                time_since_failure = time.time() - (self.circuit_breaker.last_failure_time or 0)
                if time_since_failure > self.circuit_breaker.reset_timeout:
                    self.circuit_breaker.state = "half-open"
                else:
                    self.metrics.errors += 1
                    raise ConnectionError("Circuit breaker is open")
            
            result = await operation()
            
            # Reset circuit breaker on success
            if self.circuit_breaker.state == "half-open":
                self.circuit_breaker.state = "closed"
                self.circuit_breaker.failures = 0
            
            return result
            
        except Exception as e:
            self.metrics.errors += 1
            self.circuit_breaker.failures += 1
            self.circuit_breaker.last_failure_time = time.time()
            
            if self.circuit_breaker.failures >= self.circuit_breaker.failure_threshold:
                self.circuit_breaker.state = "open"
            
            raise e
        
        finally:
            self.metrics.total_ops += 1
            latency = time.time() - start_time
            self.metrics.avg_latency = (
                (self.metrics.avg_latency * (self.metrics.total_ops - 1) + latency) /
                self.metrics.total_ops
            )
    
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        async def operation():
            result = await self.client.get(self._build_key(key))
            if result is None:
                self.metrics.misses += 1
                raise CacheMissError(f"Cache miss for key: {key}")
            self.metrics.hits += 1
            return result
        
        try:
            return await self._execute_with_circuit_breaker(operation)
        except CacheMissError:
            return None
    
    async def get_json(self, key: str) -> Optional[Any]:
        """Get and deserialize JSON value from cache"""
        data = await self.get(key)
        if data is None:
            return None
        
        try:
            return json.loads(data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON for key {key}: {e}")
            raise ValueError(f"Invalid JSON data for key {key}")
    
    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL"""
        async def operation():
            if isinstance(value, (str, bytes)):
                data = value
            else:
                data = json.dumps(value)
            
            if ttl_seconds:
                result = await self.client.setex(self._build_key(key), ttl_seconds, data)
            else:
                result = await self.client.set(self._build_key(key), data)
            
            self.metrics.sets += 1
            return result
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def set_nx(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Set value only if key doesn't exist"""
        async def operation():
            if isinstance(value, (str, bytes)):
                data = value
            else:
                data = json.dumps(value)
            
            if ttl_seconds:
                result = await self.client.set(
                    self._build_key(key), data, ex=ttl_seconds, nx=True
                )
            else:
                result = await self.client.setnx(self._build_key(key), data)
            
            success = result is True or result == 1
            if success:
                self.metrics.sets += 1
            
            return success
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def delete(self, *keys: str) -> int:
        """Delete keys from cache"""
        if not keys:
            return 0
        
        async def operation():
            prefixed_keys = [self._build_key(key) for key in keys]
            result = await self.client.delete(*prefixed_keys)
            self.metrics.deletes += result
            return result
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def exists(self, *keys: str) -> int:
        """Check if keys exist in cache"""
        if not keys:
            return 0
        
        async def operation():
            prefixed_keys = [self._build_key(key) for key in keys]
            return await self.client.exists(*prefixed_keys)
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def expire(self, key: str, ttl_seconds: int) -> bool:
        """Set TTL for a key"""
        async def operation():
            result = await self.client.expire(self._build_key(key), ttl_seconds)
            return result == 1
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def ttl(self, key: str) -> int:
        """Get remaining TTL for a key"""
        async def operation():
            return await self.client.ttl(self._build_key(key))
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def increment(self, key: str) -> int:
        """Atomically increment a key's value"""
        async def operation():
            return await self.client.incr(self._build_key(key))
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def increment_by(self, key: str, value: int) -> int:
        """Atomically increment a key's value by a specific amount"""
        async def operation():
            return await self.client.incrby(self._build_key(key), value)
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def get_multiple(self, keys: List[str]) -> Dict[str, Optional[str]]:
        """Get multiple keys at once"""
        if not keys:
            return {}
        
        async def operation():
            prefixed_keys = [self._build_key(key) for key in keys]
            values = await self.client.mget(prefixed_keys)
            
            result = {}
            hits = 0
            misses = 0
            
            for i, key in enumerate(keys):
                value = values[i]
                result[key] = value
                if value is None:
                    misses += 1
                else:
                    hits += 1
            
            self.metrics.hits += hits
            self.metrics.misses += misses
            
            return result
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def set_multiple(self, pairs: Dict[str, Any], ttl_seconds: Optional[int] = None) -> bool:
        """Set multiple key-value pairs at once"""
        if not pairs:
            return True
        
        async def operation():
            # Use pipeline for efficiency
            pipe = self.client.pipeline()
            
            for key, value in pairs.items():
                if isinstance(value, (str, bytes)):
                    data = value
                else:
                    data = json.dumps(value)
                
                if ttl_seconds:
                    pipe.setex(self._build_key(key), ttl_seconds, data)
                else:
                    pipe.set(self._build_key(key), data)
            
            await pipe.execute()
            self.metrics.sets += len(pairs)
            return True
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern"""
        async def operation():
            full_pattern = self._build_key(pattern)
            keys = await self.client.keys(full_pattern)
            
            if not keys:
                return 0
            
            result = await self.client.delete(*keys)
            self.metrics.deletes += result
            return result
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def health(self) -> str:
        """Check Redis connection health"""
        async def operation():
            return await self.client.ping()
        
        return await self._execute_with_circuit_breaker(operation)
    
    def get_metrics(self) -> CacheMetrics:
        """Get current cache metrics"""
        return self.metrics
    
    def get_hit_ratio(self) -> float:
        """Calculate cache hit ratio"""
        total = self.metrics.hits + self.metrics.misses
        return self.metrics.hits / total if total > 0 else 0.0
    
    def get_circuit_breaker_state(self) -> CircuitBreakerState:
        """Get circuit breaker state"""
        return self.circuit_breaker
    
    async def close(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()
            logger.info("Redis client closed")
    
    # Advanced operations
    async def add_to_set(self, key: str, *members: str) -> int:
        """Add members to a set"""
        async def operation():
            return await self.client.sadd(self._build_key(key), *members)
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def get_set_members(self, key: str) -> List[str]:
        """Get all members of a set"""
        async def operation():
            return list(await self.client.smembers(self._build_key(key)))
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def remove_from_set(self, key: str, *members: str) -> int:
        """Remove members from a set"""
        async def operation():
            return await self.client.srem(self._build_key(key), *members)
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def add_to_sorted_set(self, key: str, score: float, member: str) -> int:
        """Add member to sorted set with score"""
        async def operation():
            return await self.client.zadd(self._build_key(key), {member: score})
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def get_sorted_set_range(self, key: str, start: int, stop: int) -> List[str]:
        """Get range from sorted set"""
        async def operation():
            return await self.client.zrange(self._build_key(key), start, stop)
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def get_sorted_set_range_with_scores(
        self, key: str, start: int, stop: int
    ) -> List[tuple]:
        """Get range from sorted set with scores"""
        async def operation():
            return await self.client.zrange(
                self._build_key(key), start, stop, withscores=True
            )
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def publish_message(self, channel: str, message: Any) -> int:
        """Publish message to channel"""
        async def operation():
            if isinstance(message, (str, bytes)):
                data = message
            else:
                data = json.dumps(message)
            
            return await self.client.publish(channel, data)
        
        return await self._execute_with_circuit_breaker(operation)
    
    async def subscribe_to_channel(self, channel: str, callback):
        """Subscribe to channel with callback"""
        pubsub = self.client.pubsub()
        await pubsub.subscribe(channel)
        
        try:
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    try:
                        data = json.loads(message['data'])
                        await callback(data)
                    except json.JSONDecodeError:
                        await callback(message['data'])
        except Exception as e:
            logger.error(f"Error in subscription to {channel}: {e}")
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()


# Context manager for Redis client
@asynccontextmanager
async def redis_client(config: RedisConfig):
    """Context manager for Redis client"""
    client = RedisClient(config)
    try:
        yield client
    finally:
        await client.close()