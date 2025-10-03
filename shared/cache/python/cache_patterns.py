from typing import Any, Dict, List, Optional
from .redis_client import RedisClient


class CachePatterns:
    """Cache patterns and key strategies for the adaptive learning platform"""
    
    # Key pattern constants
    USER_KEY = "user:{user_id}"
    USER_PREFERENCES_KEY = "user:preferences:{user_id}"
    USER_SESSION_KEY = "user:session:{session_id}"
    USER_ACTIVITY_KEY = "user:activity:{user_id}:{date}"

    SCHEDULER_STATE_KEY = "scheduler:{user_id}"
    SCHEDULER_HOT_KEY = "scheduler:hot:{user_id}"
    SM2_STATE_KEY = "sm2:{user_id}:{item_id}"
    BKT_STATE_KEY = "bkt:{user_id}:{topic}"
    IRT_ABILITY_KEY = "irt:ability:{user_id}"

    ITEM_KEY = "item:{item_id}"
    ITEMS_BY_JURISDICTION_KEY = "items:jurisdiction:{country_code}"
    ITEMS_BY_TOPIC_KEY = "items:topic:{topic}"
    ITEM_DIFFICULTY_KEY = "item:difficulty:{item_id}"

    PREDICTION_KEY = "prediction:{user_id}:{item_id}"
    PREDICTION_BATCH_KEY = "prediction:batch:{user_id}:{hash}"
    MODEL_VERSION_KEY = "ml:model:version"

    SESSION_KEY = "session:{session_id}"
    RATE_LIMIT_USER_KEY = "rate_limit:user:{user_id}:{endpoint}"
    RATE_LIMIT_IP_KEY = "rate_limit:ip:{ip_address}:{endpoint}"

    FEATURE_FLAGS_KEY = "feature_flags"
    FEATURE_FLAGS_USER_KEY = "feature_flags:user:{user_id}"
    CONFIG_KEY = "config:{service_name}"

    METRICS_KEY = "metrics:{service}:{metric_name}"
    ANALYTICS_KEY = "analytics:{user_id}:{date}"

    # TTL constants (in seconds)
    class TTL:
        PREDICTION = 15 * 60  # 15 minutes
        SESSION = 30 * 60  # 30 minutes
        RATE_LIMIT = 60 * 60  # 1 hour
        SCHEDULER_STATE = 30 * 60  # 30 minutes
        SCHEDULER_HOT = 15 * 60  # 15 minutes
        USER_DATA = 60 * 60  # 1 hour
        ITEM_DATA = 4 * 60 * 60  # 4 hours
        CONTENT_LIST = 6 * 60 * 60  # 6 hours
        FEATURE_FLAGS = 5 * 60  # 5 minutes
        CONFIG = 60 * 60  # 1 hour
        ANALYTICS = 24 * 60 * 60  # 24 hours
        METRICS = 60 * 60  # 1 hour

    def __init__(self, client: RedisClient):
        self.client = client

    def _build_key(self, pattern: str, **kwargs) -> str:
        """Build cache key from pattern and parameters"""
        return pattern.format(**kwargs)

    # User operations
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data from cache"""
        key = self._build_key(self.USER_KEY, user_id=user_id)
        return await self.client.get_json(key)

    async def set_user(self, user_id: str, user: Dict[str, Any]) -> bool:
        """Set user data in cache"""
        key = self._build_key(self.USER_KEY, user_id=user_id)
        return await self.client.set(key, user, self.TTL.USER_DATA)

    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user preferences from cache"""
        key = self._build_key(self.USER_PREFERENCES_KEY, user_id=user_id)
        return await self.client.get_json(key)

    async def set_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """Set user preferences in cache"""
        key = self._build_key(self.USER_PREFERENCES_KEY, user_id=user_id)
        return await self.client.set(key, preferences, self.TTL.USER_DATA)

    # Scheduler state operations
    async def get_scheduler_state(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get scheduler state from cache"""
        key = self._build_key(self.SCHEDULER_STATE_KEY, user_id=user_id)
        return await self.client.get_json(key)

    async def set_scheduler_state(self, user_id: str, state: Dict[str, Any]) -> bool:
        """Set scheduler state in cache"""
        key = self._build_key(self.SCHEDULER_STATE_KEY, user_id=user_id)
        return await self.client.set(key, state, self.TTL.SCHEDULER_STATE)

    async def get_scheduler_hot_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get scheduler hot data from cache"""
        key = self._build_key(self.SCHEDULER_HOT_KEY, user_id=user_id)
        return await self.client.get_json(key)

    async def set_scheduler_hot_data(self, user_id: str, hot_data: Dict[str, Any]) -> bool:
        """Set scheduler hot data in cache"""
        key = self._build_key(self.SCHEDULER_HOT_KEY, user_id=user_id)
        return await self.client.set(key, hot_data, self.TTL.SCHEDULER_HOT)

    # Content operations
    async def get_item(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Get item from cache"""
        key = self._build_key(self.ITEM_KEY, item_id=item_id)
        return await self.client.get_json(key)

    async def set_item(self, item_id: str, item: Dict[str, Any]) -> bool:
        """Set item in cache"""
        key = self._build_key(self.ITEM_KEY, item_id=item_id)
        return await self.client.set(key, item, self.TTL.ITEM_DATA)

    async def get_items_by_jurisdiction(self, country_code: str) -> List[str]:
        """Get items by jurisdiction from cache"""
        key = self._build_key(self.ITEMS_BY_JURISDICTION_KEY, country_code=country_code)
        result = await self.client.get_json(key)
        return result or []

    async def set_items_by_jurisdiction(self, country_code: str, item_ids: List[str]) -> bool:
        """Set items by jurisdiction in cache"""
        key = self._build_key(self.ITEMS_BY_JURISDICTION_KEY, country_code=country_code)
        return await self.client.set(key, item_ids, self.TTL.CONTENT_LIST)

    async def get_items_by_topic(self, topic: str) -> List[str]:
        """Get items by topic from cache"""
        key = self._build_key(self.ITEMS_BY_TOPIC_KEY, topic=topic)
        result = await self.client.get_json(key)
        return result or []

    async def set_items_by_topic(self, topic: str, item_ids: List[str]) -> bool:
        """Set items by topic in cache"""
        key = self._build_key(self.ITEMS_BY_TOPIC_KEY, topic=topic)
        return await self.client.set(key, item_ids, self.TTL.CONTENT_LIST)

    # ML prediction operations
    async def get_prediction(self, user_id: str, item_id: str) -> Optional[float]:
        """Get prediction from cache"""
        key = self._build_key(self.PREDICTION_KEY, user_id=user_id, item_id=item_id)
        return await self.client.get_json(key)

    async def set_prediction(self, user_id: str, item_id: str, prediction: float) -> bool:
        """Set prediction in cache"""
        key = self._build_key(self.PREDICTION_KEY, user_id=user_id, item_id=item_id)
        return await self.client.set(key, prediction, self.TTL.PREDICTION)

    async def get_batch_predictions(self, user_id: str, hash_key: str) -> Optional[Dict[str, float]]:
        """Get batch predictions from cache"""
        key = self._build_key(self.PREDICTION_BATCH_KEY, user_id=user_id, hash=hash_key)
        return await self.client.get_json(key)

    async def set_batch_predictions(self, user_id: str, hash_key: str, predictions: Dict[str, float]) -> bool:
        """Set batch predictions in cache"""
        key = self._build_key(self.PREDICTION_BATCH_KEY, user_id=user_id, hash=hash_key)
        return await self.client.set(key, predictions, self.TTL.PREDICTION)

    # Session management
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session from cache"""
        key = self._build_key(self.SESSION_KEY, session_id=session_id)
        return await self.client.get_json(key)

    async def set_session(self, session_id: str, session: Dict[str, Any]) -> bool:
        """Set session in cache"""
        key = self._build_key(self.SESSION_KEY, session_id=session_id)
        return await self.client.set(key, session, self.TTL.SESSION)

    async def extend_session(self, session_id: str) -> bool:
        """Extend session TTL"""
        key = self._build_key(self.SESSION_KEY, session_id=session_id)
        return await self.client.expire(key, self.TTL.SESSION)

    # Rate limiting
    async def check_rate_limit(self, user_id: str, endpoint: str, limit: int) -> bool:
        """Check user rate limit"""
        key = self._build_key(self.RATE_LIMIT_USER_KEY, user_id=user_id, endpoint=endpoint)
        current = await self.client.increment(key)
        
        if current == 1:
            await self.client.expire(key, self.TTL.RATE_LIMIT)
        
        return current <= limit

    async def check_ip_rate_limit(self, ip_address: str, endpoint: str, limit: int) -> bool:
        """Check IP rate limit"""
        key = self._build_key(self.RATE_LIMIT_IP_KEY, ip_address=ip_address, endpoint=endpoint)
        current = await self.client.increment(key)
        
        if current == 1:
            await self.client.expire(key, self.TTL.RATE_LIMIT)
        
        return current <= limit

    # Feature flags
    async def get_feature_flags(self) -> Optional[Dict[str, Any]]:
        """Get feature flags from cache"""
        return await self.client.get_json(self.FEATURE_FLAGS_KEY)

    async def set_feature_flags(self, flags: Dict[str, Any]) -> bool:
        """Set feature flags in cache"""
        return await self.client.set(self.FEATURE_FLAGS_KEY, flags, self.TTL.FEATURE_FLAGS)

    async def get_user_feature_flags(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user-specific feature flags from cache"""
        key = self._build_key(self.FEATURE_FLAGS_USER_KEY, user_id=user_id)
        return await self.client.get_json(key)

    async def set_user_feature_flags(self, user_id: str, flags: Dict[str, Any]) -> bool:
        """Set user-specific feature flags in cache"""
        key = self._build_key(self.FEATURE_FLAGS_USER_KEY, user_id=user_id)
        return await self.client.set(key, flags, self.TTL.FEATURE_FLAGS)

    # Cache invalidation
    async def invalidate_user(self, user_id: str) -> int:
        """Invalidate all user-related cache entries"""
        patterns = [
            self._build_key(self.USER_KEY, user_id=user_id),
            self._build_key(self.USER_PREFERENCES_KEY, user_id=user_id),
            self._build_key(self.SCHEDULER_STATE_KEY, user_id=user_id),
            self._build_key(self.SCHEDULER_HOT_KEY, user_id=user_id),
            f"prediction:{user_id}:*",
            self._build_key(self.FEATURE_FLAGS_USER_KEY, user_id=user_id),
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = await self.client.invalidate_pattern(pattern)
            total_deleted += deleted
        
        return total_deleted

    async def invalidate_content(self, item_id: str) -> int:
        """Invalidate content-related cache entries"""
        patterns = [
            self._build_key(self.ITEM_KEY, item_id=item_id),
            f"prediction:*:{item_id}",
            "items:jurisdiction:*",
            "items:topic:*",
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = await self.client.invalidate_pattern(pattern)
            total_deleted += deleted
        
        return total_deleted

    async def invalidate_jurisdiction(self, country_code: str) -> int:
        """Invalidate jurisdiction-specific cache entries"""
        pattern = self._build_key(self.ITEMS_BY_JURISDICTION_KEY, country_code=country_code)
        return await self.client.invalidate_pattern(pattern)

    async def invalidate_topic(self, topic: str) -> int:
        """Invalidate topic-specific cache entries"""
        pattern = self._build_key(self.ITEMS_BY_TOPIC_KEY, topic=topic)
        return await self.client.invalidate_pattern(pattern)

    # Bulk operations
    async def get_multiple_items(self, item_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Get multiple items from cache"""
        if not item_ids:
            return {}

        keys = [self._build_key(self.ITEM_KEY, item_id=item_id) for item_id in item_ids]
        results = await self.client.get_multiple(keys)
        
        items = {}
        for i, item_id in enumerate(item_ids):
            key = keys[i]
            data = results.get(key)
            if data:
                try:
                    items[item_id] = await self.client.get_json(key)
                except (ValueError, TypeError):
                    # Skip invalid JSON
                    continue
        
        return items

    async def set_multiple_items(self, items: Dict[str, Dict[str, Any]]) -> bool:
        """Set multiple items in cache"""
        if not items:
            return True

        pairs = {}
        for item_id, item in items.items():
            key = self._build_key(self.ITEM_KEY, item_id=item_id)
            pairs[key] = item

        return await self.client.set_multiple(pairs, self.TTL.ITEM_DATA)

    # Analytics and metrics
    async def set_metric(self, service: str, metric_name: str, value: Any) -> bool:
        """Set metric in cache"""
        key = self._build_key(self.METRICS_KEY, service=service, metric_name=metric_name)
        return await self.client.set(key, value, self.TTL.METRICS)

    async def get_metric(self, service: str, metric_name: str) -> Optional[Any]:
        """Get metric from cache"""
        key = self._build_key(self.METRICS_KEY, service=service, metric_name=metric_name)
        return await self.client.get_json(key)

    async def set_analytics(self, user_id: str, date: str, analytics: Dict[str, Any]) -> bool:
        """Set analytics data in cache"""
        key = self._build_key(self.ANALYTICS_KEY, user_id=user_id, date=date)
        return await self.client.set(key, analytics, self.TTL.ANALYTICS)

    async def get_analytics(self, user_id: str, date: str) -> Optional[Dict[str, Any]]:
        """Get analytics data from cache"""
        key = self._build_key(self.ANALYTICS_KEY, user_id=user_id, date=date)
        return await self.client.get_json(key)

    # Configuration
    async def get_config(self, service_name: str) -> Optional[Dict[str, Any]]:
        """Get service configuration from cache"""
        key = self._build_key(self.CONFIG_KEY, service_name=service_name)
        return await self.client.get_json(key)

    async def set_config(self, service_name: str, config: Dict[str, Any]) -> bool:
        """Set service configuration in cache"""
        key = self._build_key(self.CONFIG_KEY, service_name=service_name)
        return await self.client.set(key, config, self.TTL.CONFIG)

    # Model versioning
    async def get_model_version(self) -> Optional[str]:
        """Get current ML model version"""
        return await self.client.get(self.MODEL_VERSION_KEY)

    async def set_model_version(self, version: str) -> bool:
        """Set current ML model version"""
        return await self.client.set(self.MODEL_VERSION_KEY, version, self.TTL.CONFIG)