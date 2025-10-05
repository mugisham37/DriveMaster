"""Metrics calculation and aggregation service."""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json
import uuid
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.redis_client import get_redis_client
from app.models.analytics import (
    UserEngagementMetrics,
    LearningProgressMetrics,
    ContentPerformanceMetrics,
    SystemPerformanceMetrics,
    Alert,
    AlertType,
    AlertSeverity,
    TimeSeries,
    MetricDataPoint,
    MetricType,
    UserBehaviorInsight,
    ContentGapAnalysis,
    LearningEffectivenessReport
)

logger = structlog.get_logger(__name__)


class MetricsService:
    """Service for calculating and managing analytics metrics."""
    
    def __init__(self):
        self.cache_ttl = 300  # 5 minutes
    
    async def get_user_engagement_metrics(
        self,
        time_window: timedelta = timedelta(hours=1)
    ) -> UserEngagementMetrics:
        """Calculate user engagement metrics."""
        
        cache_key = f"engagement_metrics:{int(time_window.total_seconds())}"
        
        # Try to get from cache first
        redis = await get_redis_client()
        cached_data = await redis.get(cache_key)
        
        if cached_data:
            data = json.loads(cached_data)
            return UserEngagementMetrics(**data)
        
        # Calculate metrics from database
        async with get_db_session() as db:
            current_time = datetime.utcnow()
            
            # Active users in different time windows
            active_users_1h = await self._get_active_users(db, current_time - timedelta(hours=1))
            active_users_24h = await self._get_active_users(db, current_time - timedelta(hours=24))
            new_users_24h = await self._get_new_users(db, current_time - timedelta(hours=24))
            
            # Session metrics
            sessions_1h = await self._get_sessions_started(db, current_time - timedelta(hours=1))
            avg_session_duration = await self._get_avg_session_duration(db, current_time - timedelta(hours=24))
            bounce_rate = await self._get_bounce_rate(db, current_time - timedelta(hours=24))
            
            # Retention rates
            retention_d1 = await self._get_retention_rate(db, 1)
            retention_d7 = await self._get_retention_rate(db, 7)
            retention_d30 = await self._get_retention_rate(db, 30)
            
            metrics = UserEngagementMetrics(
                timestamp=current_time,
                active_users_1h=active_users_1h,
                active_users_24h=active_users_24h,
                new_users_24h=new_users_24h,
                sessions_started_1h=sessions_1h,
                avg_session_duration_minutes=avg_session_duration,
                bounce_rate=bounce_rate,
                retention_rate_d1=retention_d1,
                retention_rate_d7=retention_d7,
                retention_rate_d30=retention_d30
            )
            
            # Cache the result
            await redis.setex(
                cache_key,
                self.cache_ttl,
                metrics.model_dump_json()
            )
            
            return metrics
    
    async def get_learning_progress_metrics(
        self,
        time_window: timedelta = timedelta(hours=24)
    ) -> LearningProgressMetrics:
        """Calculate learning progress metrics."""
        
        cache_key = f"progress_metrics:{int(time_window.total_seconds())}"
        
        # Try cache first
        redis = await get_redis_client()
        cached_data = await redis.get(cache_key)
        
        if cached_data:
            data = json.loads(cached_data)
            return LearningProgressMetrics(**data)
        
        async with get_db_session() as db:
            current_time = datetime.utcnow()
            start_time = current_time - time_window
            
            # Attempt metrics
            total_attempts = await self._get_total_attempts(db, start_time)
            avg_accuracy = await self._get_avg_accuracy(db, start_time)
            avg_response_time = await self._get_avg_response_time(db, start_time)
            
            # Progress metrics
            mastery_improvements = await self._get_mastery_improvements(db, start_time)
            completion_rate = await self._get_completion_rate(db, start_time)
            
            # Streak metrics
            streak_users = await self._get_streak_users(db)
            avg_streak_length = await self._get_avg_streak_length(db)
            
            # Topic mastery
            topics_mastered = await self._get_topics_mastered(db, start_time)
            difficulty_distribution = await self._get_difficulty_distribution(db, start_time)
            
            metrics = LearningProgressMetrics(
                timestamp=current_time,
                total_attempts_24h=total_attempts,
                avg_accuracy_24h=avg_accuracy,
                mastery_improvements_24h=mastery_improvements,
                avg_response_time_ms=avg_response_time,
                completion_rate=completion_rate,
                streak_users=streak_users,
                avg_streak_length=avg_streak_length,
                topics_mastered_24h=topics_mastered,
                difficulty_distribution=difficulty_distribution
            )
            
            # Cache the result
            await redis.setex(
                cache_key,
                self.cache_ttl,
                metrics.model_dump_json()
            )
            
            return metrics
    
    async def get_content_performance_metrics(
        self,
        time_window: timedelta = timedelta(hours=24)
    ) -> ContentPerformanceMetrics:
        """Calculate content performance metrics."""
        
        cache_key = f"content_metrics:{int(time_window.total_seconds())}"
        
        # Try cache first
        redis = await get_redis_client()
        cached_data = await redis.get(cache_key)
        
        if cached_data:
            data = json.loads(cached_data)
            return ContentPerformanceMetrics(**data)
        
        async with get_db_session() as db:
            current_time = datetime.utcnow()
            start_time = current_time - time_window
            
            # Content metrics
            total_items = await self._get_total_items(db)
            items_attempted = await self._get_items_attempted(db, start_time)
            avg_item_accuracy = await self._get_avg_item_accuracy(db, start_time)
            
            # Performance categories
            low_performing = await self._get_low_performing_items(db, start_time)
            high_performing = await self._get_high_performing_items(db, start_time)
            
            # Timing metrics
            avg_time_per_item = await self._get_avg_time_per_item(db, start_time)
            
            # Distribution metrics
            items_by_topic = await self._get_items_by_topic(db)
            difficulty_calibration = await self._get_difficulty_calibration_accuracy(db, start_time)
            content_gaps = await self._identify_content_gaps(db)
            
            metrics = ContentPerformanceMetrics(
                timestamp=current_time,
                total_items=total_items,
                items_attempted_24h=items_attempted,
                avg_item_accuracy=avg_item_accuracy,
                low_performing_items=low_performing,
                high_performing_items=high_performing,
                avg_time_per_item_ms=avg_time_per_item,
                items_by_topic=items_by_topic,
                difficulty_calibration_accuracy=difficulty_calibration,
                content_gaps=content_gaps
            )
            
            # Cache the result
            await redis.setex(
                cache_key,
                self.cache_ttl,
                metrics.model_dump_json()
            )
            
            return metrics
    
    async def get_system_performance_metrics(self) -> SystemPerformanceMetrics:
        """Calculate system performance metrics."""
        
        cache_key = "system_metrics"
        
        # Try cache first
        redis = await get_redis_client()
        cached_data = await redis.get(cache_key)
        
        if cached_data:
            data = json.loads(cached_data)
            return SystemPerformanceMetrics(**data)
        
        current_time = datetime.utcnow()
        
        # Get system metrics from various sources
        api_response_time = await self._get_api_response_time_p95()
        api_error_rate = await self._get_api_error_rate()
        db_connections = await self._get_database_connections()
        redis_memory = await self._get_redis_memory_usage()
        kafka_lag = await self._get_kafka_consumer_lag()
        
        # System resource metrics (would typically come from monitoring system)
        cpu_usage = await self._get_cpu_usage()
        memory_usage = await self._get_memory_usage()
        disk_usage = await self._get_disk_usage()
        websocket_connections = await self._get_websocket_connections()
        
        metrics = SystemPerformanceMetrics(
            timestamp=current_time,
            api_response_time_p95=api_response_time,
            api_error_rate=api_error_rate,
            database_connections=db_connections,
            redis_memory_usage_mb=redis_memory,
            kafka_consumer_lag=kafka_lag,
            cpu_usage_percent=cpu_usage,
            memory_usage_percent=memory_usage,
            disk_usage_percent=disk_usage,
            active_websocket_connections=websocket_connections
        )
        
        # Cache the result
        await redis.setex(
            cache_key,
            60,  # 1 minute TTL for system metrics
            metrics.model_dump_json()
        )
        
        return metrics
    
    async def check_system_alerts(self) -> List[Alert]:
        """Check for system alerts and anomalies."""
        
        alerts = []
        current_time = datetime.utcnow()
        
        # Get current system metrics
        system_metrics = await self.get_system_performance_metrics()
        
        # Check API error rate
        if system_metrics.api_error_rate > 0.05:  # 5% threshold
            alerts.append(Alert(
                id=str(uuid.uuid4()),
                type=AlertType.SYSTEM_PERFORMANCE,
                severity=AlertSeverity.ERROR if system_metrics.api_error_rate > 0.1 else AlertSeverity.WARNING,
                title="High API Error Rate",
                message=f"API error rate is {system_metrics.api_error_rate:.2%}",
                details={"error_rate": system_metrics.api_error_rate},
                timestamp=current_time
            ))
        
        # Check response time
        if system_metrics.api_response_time_p95 > 1000:  # 1 second threshold
            alerts.append(Alert(
                id=str(uuid.uuid4()),
                type=AlertType.SYSTEM_PERFORMANCE,
                severity=AlertSeverity.WARNING,
                title="High API Response Time",
                message=f"95th percentile response time is {system_metrics.api_response_time_p95:.0f}ms",
                details={"response_time_p95": system_metrics.api_response_time_p95},
                timestamp=current_time
            ))
        
        # Check memory usage
        if system_metrics.memory_usage_percent > 85:  # 85% threshold
            alerts.append(Alert(
                id=str(uuid.uuid4()),
                type=AlertType.SYSTEM_PERFORMANCE,
                severity=AlertSeverity.CRITICAL if system_metrics.memory_usage_percent > 95 else AlertSeverity.WARNING,
                title="High Memory Usage",
                message=f"Memory usage is {system_metrics.memory_usage_percent:.1f}%",
                details={"memory_usage": system_metrics.memory_usage_percent},
                timestamp=current_time
            ))
        
        # Check Kafka consumer lag
        for topic, lag in system_metrics.kafka_consumer_lag.items():
            if lag > 1000:  # 1000 messages threshold
                alerts.append(Alert(
                    id=str(uuid.uuid4()),
                    type=AlertType.SYSTEM_PERFORMANCE,
                    severity=AlertSeverity.WARNING,
                    title="High Kafka Consumer Lag",
                    message=f"Consumer lag for topic {topic} is {lag} messages",
                    details={"topic": topic, "lag": lag},
                    timestamp=current_time
                ))
        
        return alerts
    
    # Helper methods for database queries
    async def _get_active_users(self, db: AsyncSession, since: datetime) -> int:
        """Get count of active users since given time."""
        query = text("""
            SELECT COUNT(DISTINCT user_id) 
            FROM attempts 
            WHERE timestamp >= :since
        """)
        result = await db.execute(query, {"since": since})
        return result.scalar() or 0
    
    async def _get_new_users(self, db: AsyncSession, since: datetime) -> int:
        """Get count of new users since given time."""
        query = text("""
            SELECT COUNT(*) 
            FROM users 
            WHERE created_at >= :since
        """)
        result = await db.execute(query, {"since": since})
        return result.scalar() or 0
    
    async def _get_sessions_started(self, db: AsyncSession, since: datetime) -> int:
        """Get count of sessions started since given time."""
        query = text("""
            SELECT COUNT(DISTINCT session_id) 
            FROM attempts 
            WHERE timestamp >= :since
        """)
        result = await db.execute(query, {"since": since})
        return result.scalar() or 0
    
    async def _get_avg_session_duration(self, db: AsyncSession, since: datetime) -> float:
        """Get average session duration in minutes."""
        query = text("""
            SELECT AVG(EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60.0)
            FROM attempts 
            WHERE timestamp >= :since
            GROUP BY session_id
        """)
        result = await db.execute(query, {"since": since})
        return result.scalar() or 0.0
    
    async def _get_bounce_rate(self, db: AsyncSession, since: datetime) -> float:
        """Get bounce rate (single-item sessions)."""
        query = text("""
            WITH session_counts AS (
                SELECT session_id, COUNT(*) as attempt_count
                FROM attempts 
                WHERE timestamp >= :since
                GROUP BY session_id
            )
            SELECT 
                COUNT(CASE WHEN attempt_count = 1 THEN 1 END)::float / COUNT(*)
            FROM session_counts
        """)
        result = await db.execute(query, {"since": since})
        return result.scalar() or 0.0
    
    async def _get_retention_rate(self, db: AsyncSession, days: int) -> float:
        """Get retention rate for given number of days."""
        query = text("""
            WITH cohort AS (
                SELECT user_id, DATE(created_at) as cohort_date
                FROM users 
                WHERE created_at >= CURRENT_DATE - INTERVAL ':days days' - INTERVAL '1 day'
                AND created_at < CURRENT_DATE - INTERVAL ':days days'
            ),
            retained AS (
                SELECT DISTINCT c.user_id
                FROM cohort c
                JOIN attempts a ON c.user_id = a.user_id
                WHERE DATE(a.timestamp) = c.cohort_date + INTERVAL ':days days'
            )
            SELECT 
                CASE WHEN COUNT(c.user_id) > 0 
                THEN COUNT(r.user_id)::float / COUNT(c.user_id)
                ELSE 0 END
            FROM cohort c
            LEFT JOIN retained r ON c.user_id = r.user_id
        """)
        result = await db.execute(query, {"days": days})
        return result.scalar() or 0.0
    
    async def _get_total_attempts(self, db: AsyncSession, since: datetime) -> int:
        """Get total attempts since given time."""
        query = text("""
            SELECT COUNT(*) 
            FROM attempts 
            WHERE timestamp >= :since
        """)
        result = await db.execute(query, {"since": since})
        return result.scalar() or 0
    
    async def _get_avg_accuracy(self, db: AsyncSession, since: datetime) -> float:
        """Get average accuracy since given time."""
        query = text("""
            SELECT AVG(CASE WHEN correct THEN 1.0 ELSE 0.0 END)
            FROM attempts 
            WHERE timestamp >= :since
        """)
        result = await db.execute(query, {"since": since})
        return result.scalar() or 0.0
    
    async def _get_avg_response_time(self, db: AsyncSession, since: datetime) -> float:
        """Get average response time in milliseconds."""
        query = text("""
            SELECT AVG(time_taken_ms)
            FROM attempts 
            WHERE timestamp >= :since
        """)
        result = await db.execute(query, {"since": since})
        return result.scalar() or 0.0
    
    # Placeholder methods for system metrics (would integrate with monitoring systems)
    async def _get_api_response_time_p95(self) -> float:
        """Get 95th percentile API response time."""
        # Would integrate with monitoring system like Prometheus
        return 250.0  # Placeholder
    
    async def _get_api_error_rate(self) -> float:
        """Get API error rate."""
        # Would integrate with monitoring system
        return 0.02  # Placeholder
    
    async def _get_database_connections(self) -> int:
        """Get active database connections."""
        # Would query database connection pool
        return 15  # Placeholder
    
    async def _get_redis_memory_usage(self) -> float:
        """Get Redis memory usage in MB."""
        redis = await get_redis_client()
        info = await redis.info('memory')
        return info.get('used_memory', 0) / (1024 * 1024)
    
    async def _get_kafka_consumer_lag(self) -> Dict[str, int]:
        """Get Kafka consumer lag by topic."""
        # Would integrate with Kafka monitoring
        return {
            "user.attempts": 50,
            "user.sessions": 25,
            "ml.training_events": 10
        }
    
    async def _get_cpu_usage(self) -> float:
        """Get CPU usage percentage."""
        # Would integrate with system monitoring
        return 45.0  # Placeholder
    
    async def _get_memory_usage(self) -> float:
        """Get memory usage percentage."""
        # Would integrate with system monitoring
        return 65.0  # Placeholder
    
    async def _get_disk_usage(self) -> float:
        """Get disk usage percentage."""
        # Would integrate with system monitoring
        return 30.0  # Placeholder
    
    async def _get_websocket_connections(self) -> int:
        """Get active WebSocket connections."""
        # Would track in application state
        return 25  # Placeholder
    
    # Additional placeholder methods for content metrics
    async def _get_total_items(self, db: AsyncSession) -> int:
        """Get total content items."""
        query = text("SELECT COUNT(*) FROM items WHERE is_active = true")
        result = await db.execute(query)
        return result.scalar() or 0
    
    async def _get_items_attempted(self, db: AsyncSession, since: datetime) -> int:
        """Get unique items attempted since given time."""
        query = text("""
            SELECT COUNT(DISTINCT item_id) 
            FROM attempts 
            WHERE timestamp >= :since
        """)
        result = await db.execute(query, {"since": since})
        return result.scalar() or 0
    
    async def _get_avg_item_accuracy(self, db: AsyncSession, since: datetime) -> float:
        """Get average item accuracy."""
        query = text("""
            SELECT AVG(accuracy) FROM (
                SELECT item_id, AVG(CASE WHEN correct THEN 1.0 ELSE 0.0 END) as accuracy
                FROM attempts 
                WHERE timestamp >= :since
                GROUP BY item_id
            ) item_accuracies
        """)
        result = await db.execute(query, {"since": since})
        return result.scalar() or 0.0
    
    # Additional placeholder methods would be implemented similarly...