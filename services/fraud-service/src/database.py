import asyncpg
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import uuid
from .models import FraudAlert, FraudScore, UserBehaviorProfile, RiskLevel, FraudFlag

class DatabaseManager:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool = None
    
    async def initialize(self):
        """Initialize database connection pool and create tables"""
        self.pool = await asyncpg.create_pool(self.database_url, min_size=5, max_size=20)
        await self._create_tables()
    
    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
    
    async def _create_tables(self):
        """Create fraud detection tables"""
        async with self.pool.acquire() as conn:
            # Fraud alerts table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS fraud_alerts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL,
                    alert_type VARCHAR(100) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    fraud_score FLOAT NOT NULL,
                    description TEXT NOT NULL,
                    details JSONB DEFAULT '{}',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    reviewed_at TIMESTAMPTZ,
                    reviewer_id UUID,
                    status VARCHAR(20) DEFAULT 'pending',
                    notes TEXT
                );
            """)
            
            # User fraud scores table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_fraud_scores (
                    user_id UUID PRIMARY KEY,
                    score FLOAT NOT NULL DEFAULT 0.0,
                    confidence FLOAT NOT NULL DEFAULT 0.0,
                    risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
                    active_flags JSONB DEFAULT '[]',
                    last_updated TIMESTAMPTZ DEFAULT NOW(),
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            
            # User behavior profiles table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_behavior_profiles (
                    user_id UUID PRIMARY KEY,
                    avg_response_time FLOAT NOT NULL,
                    response_time_std FLOAT NOT NULL,
                    accuracy_rate FLOAT NOT NULL,
                    session_frequency FLOAT NOT NULL,
                    typical_session_duration FLOAT NOT NULL,
                    common_devices JSONB DEFAULT '[]',
                    common_times JSONB DEFAULT '[]',
                    last_updated TIMESTAMPTZ DEFAULT NOW(),
                    sample_size INTEGER DEFAULT 0,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            
            # Fraud detection events log
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS fraud_detection_events (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL,
                    event_type VARCHAR(50) NOT NULL,
                    event_data JSONB NOT NULL,
                    fraud_score FLOAT,
                    flags JSONB DEFAULT '[]',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            
            # Create indexes
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud_alerts(user_id);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created_at ON fraud_alerts(created_at);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_fraud_events_user_id ON fraud_detection_events(user_id);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_fraud_events_created_at ON fraud_detection_events(created_at);")
    
    async def save_fraud_alert(self, alert: FraudAlert) -> str:
        """Save a fraud alert to database"""
        async with self.pool.acquire() as conn:
            alert_id = str(uuid.uuid4())
            await conn.execute("""
                INSERT INTO fraud_alerts (id, user_id, alert_type, severity, fraud_score, 
                                        description, details, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, alert_id, alert.user_id, alert.alert_type, alert.severity.value,
                alert.fraud_score, alert.description, json.dumps(alert.details),
                alert.created_at)
            return alert_id
    
    async def get_fraud_alerts(self, limit: int = 50, offset: int = 0) -> List[FraudAlert]:
        """Get fraud alerts with pagination"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, user_id, alert_type, severity, fraud_score, description,
                       details, created_at, reviewed_at, reviewer_id, status, notes
                FROM fraud_alerts
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
            """, limit, offset)
            
            alerts = []
            for row in rows:
                alert = FraudAlert(
                    id=str(row['id']),
                    user_id=str(row['user_id']),
                    alert_type=row['alert_type'],
                    severity=RiskLevel(row['severity']),
                    fraud_score=row['fraud_score'],
                    description=row['description'],
                    details=row['details'] or {},
                    created_at=row['created_at'],
                    reviewed_at=row['reviewed_at'],
                    reviewer_id=str(row['reviewer_id']) if row['reviewer_id'] else None,
                    status=row['status'],
                    notes=row['notes']
                )
                alerts.append(alert)
            return alerts
    
    async def update_fraud_alert(self, alert_id: str, status: str, reviewer_id: str, notes: str = ""):
        """Update fraud alert status"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                UPDATE fraud_alerts 
                SET status = $1, reviewer_id = $2, notes = $3, reviewed_at = NOW()
                WHERE id = $4
            """, status, reviewer_id, notes, alert_id)
    
    async def save_user_fraud_score(self, user_id: str, score: FraudScore):
        """Save or update user fraud score"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO user_fraud_scores (user_id, score, confidence, risk_level, active_flags, last_updated)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id) DO UPDATE SET
                    score = EXCLUDED.score,
                    confidence = EXCLUDED.confidence,
                    risk_level = EXCLUDED.risk_level,
                    active_flags = EXCLUDED.active_flags,
                    last_updated = EXCLUDED.last_updated
            """, user_id, score.score, score.confidence, score.risk_level.value,
                json.dumps([flag.value for flag in score.active_flags]), score.last_updated)
    
    async def get_user_fraud_score(self, user_id: str) -> Optional[FraudScore]:
        """Get user fraud score"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT score, confidence, risk_level, active_flags, last_updated
                FROM user_fraud_scores
                WHERE user_id = $1
            """, user_id)
            
            if not row:
                return None
            
            return FraudScore(
                score=row['score'],
                confidence=row['confidence'],
                risk_level=RiskLevel(row['risk_level']),
                active_flags=[FraudFlag(flag) for flag in row['active_flags']],
                last_updated=row['last_updated']
            )
    
    async def save_user_behavior_profile(self, profile: UserBehaviorProfile):
        """Save or update user behavior profile"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO user_behavior_profiles 
                (user_id, avg_response_time, response_time_std, accuracy_rate, 
                 session_frequency, typical_session_duration, common_devices, 
                 common_times, last_updated, sample_size)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (user_id) DO UPDATE SET
                    avg_response_time = EXCLUDED.avg_response_time,
                    response_time_std = EXCLUDED.response_time_std,
                    accuracy_rate = EXCLUDED.accuracy_rate,
                    session_frequency = EXCLUDED.session_frequency,
                    typical_session_duration = EXCLUDED.typical_session_duration,
                    common_devices = EXCLUDED.common_devices,
                    common_times = EXCLUDED.common_times,
                    last_updated = EXCLUDED.last_updated,
                    sample_size = EXCLUDED.sample_size
            """, profile.user_id, profile.avg_response_time, profile.response_time_std,
                profile.accuracy_rate, profile.session_frequency, profile.typical_session_duration,
                json.dumps(profile.common_devices), json.dumps(profile.common_times),
                profile.last_updated, profile.sample_size)
    
    async def get_user_behavior_profile(self, user_id: str) -> Optional[UserBehaviorProfile]:
        """Get user behavior profile"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT user_id, avg_response_time, response_time_std, accuracy_rate,
                       session_frequency, typical_session_duration, common_devices,
                       common_times, last_updated, sample_size
                FROM user_behavior_profiles
                WHERE user_id = $1
            """, user_id)
            
            if not row:
                return None
            
            return UserBehaviorProfile(
                user_id=row['user_id'],
                avg_response_time=row['avg_response_time'],
                response_time_std=row['response_time_std'],
                accuracy_rate=row['accuracy_rate'],
                session_frequency=row['session_frequency'],
                typical_session_duration=row['typical_session_duration'],
                common_devices=row['common_devices'] or [],
                common_times=row['common_times'] or [],
                last_updated=row['last_updated'],
                sample_size=row['sample_size']
            )
    
    async def log_fraud_event(self, user_id: str, event_type: str, event_data: Dict[str, Any], 
                             fraud_score: float = None, flags: List[str] = None):
        """Log fraud detection event"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO fraud_detection_events (user_id, event_type, event_data, fraud_score, flags)
                VALUES ($1, $2, $3, $4, $5)
            """, user_id, event_type, json.dumps(event_data), fraud_score, 
                json.dumps(flags or []))
    
    async def get_user_recent_attempts(self, user_id: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get user's recent attempts for analysis"""
        async with self.pool.acquire() as conn:
            # This would typically query the main attempts table
            # For now, we'll query our fraud events log
            rows = await conn.fetch("""
                SELECT event_data, created_at
                FROM fraud_detection_events
                WHERE user_id = $1 AND event_type = 'attempt' 
                AND created_at > NOW() - INTERVAL '%s hours'
                ORDER BY created_at DESC
            """ % hours, user_id)
            
            return [dict(row) for row in rows]