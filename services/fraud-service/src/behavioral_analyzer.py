import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, deque
import logging
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

from .models import UserBehaviorProfile, FraudFlag, AnomalyDetectionResult
from .database import DatabaseManager

logger = logging.getLogger(__name__)

class BehavioralAnalyzer:
    """Advanced behavioral analysis for fraud detection"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.user_behavior_cache = {}
        self.behavioral_clusters = None
        self.cluster_model = None
        self.scaler = StandardScaler()
        
    async def analyze_user_behavior(self, user_id: str, recent_attempts: List[Dict[str, Any]]) -> Tuple[float, List[FraudFlag]]:
        """Analyze user behavior patterns for anomalies"""
        flags = []
        
        if len(recent_attempts) < 5:
            return 0.0, flags
        
        # Extract behavioral features
        features = self._extract_behavioral_features(recent_attempts)
        
        # Check for behavioral anomalies
        anomaly_score = await self._detect_behavioral_anomalies(user_id, features)
        
        # Check for specific behavioral patterns
        pattern_flags = await self._check_behavioral_patterns(user_id, recent_attempts)
        flags.extend(pattern_flags)
        
        # Check for collusion indicators
        collusion_flags = await self._check_collusion_indicators(user_id, recent_attempts)
        flags.extend(collusion_flags)
        
        return anomaly_score, flags
    
    def _extract_behavioral_features(self, attempts: List[Dict[str, Any]]) -> Dict[str, float]:
        """Extract behavioral features from user attempts"""
        if not attempts:
            return {}
        
        # Response time features
        response_times = [attempt.get('time_taken_ms', 0) for attempt in attempts]
        
        # Accuracy features
        accuracies = [attempt.get('correct', False) for attempt in attempts]
        accuracy_rate = sum(accuracies) / len(accuracies)
        
        # Timing patterns
        timestamps = [attempt.get('timestamp', datetime.utcnow()) for attempt in attempts]
        if isinstance(timestamps[0], str):
            timestamps = [datetime.fromisoformat(ts.replace('Z', '+00:00')) for ts in timestamps]
        
        # Calculate inter-attempt intervals
        intervals = []
        for i in range(1, len(timestamps)):
            interval = (timestamps[i] - timestamps[i-1]).total_seconds()
            intervals.append(interval)
        
        # Device consistency
        devices = [attempt.get('device_type', 'unknown') for attempt in attempts]
        device_consistency = len(set(devices)) / len(devices) if devices else 1.0
        
        # Time of day patterns
        hours = [ts.hour for ts in timestamps]
        hour_variance = np.var(hours) if hours else 0
        
        features = {
            'avg_response_time': np.mean(response_times) if response_times else 0,
            'response_time_std': np.std(response_times) if len(response_times) > 1 else 0,
            'response_time_cv': np.std(response_times) / max(np.mean(response_times), 1) if response_times else 0,
            'accuracy_rate': accuracy_rate,
            'avg_interval': np.mean(intervals) if intervals else 0,
            'interval_std': np.std(intervals) if len(intervals) > 1 else 0,
            'device_consistency': device_consistency,
            'hour_variance': hour_variance,
            'session_length': len(attempts),
            'rapid_responses': sum(1 for rt in response_times if rt < 1000) / len(response_times) if response_times else 0
        }
        
        return features
    
    async def _detect_behavioral_anomalies(self, user_id: str, features: Dict[str, float]) -> float:
        """Detect behavioral anomalies using clustering and statistical methods"""
        try:
            # Get user's historical behavior profile
            profile = await self.db.get_user_behavior_profile(user_id)
            
            if not profile:
                # No historical data, create baseline
                await self._create_baseline_profile(user_id, features)
                return 0.0
            
            # Compare current behavior with historical profile
            anomaly_score = 0.0
            
            # Response time anomaly
            if profile.response_time_std > 0:
                rt_z_score = abs(features.get('avg_response_time', 0) - profile.avg_response_time) / profile.response_time_std
                if rt_z_score > 3:  # 3 standard deviations
                    anomaly_score += 0.3
            
            # Accuracy anomaly
            accuracy_diff = abs(features.get('accuracy_rate', 0) - profile.accuracy_rate)
            if accuracy_diff > 0.3:  # 30% accuracy change
                anomaly_score += 0.4
            
            # Device consistency anomaly
            device_consistency = features.get('device_consistency', 1.0)
            if device_consistency < 0.5:  # Using many different devices
                anomaly_score += 0.2
            
            # Update profile with new data
            await self._update_behavior_profile(user_id, features, profile)
            
            return min(anomaly_score, 1.0)
            
        except Exception as e:
            logger.error(f"Error in behavioral anomaly detection: {e}")
            return 0.0
    
    async def _check_behavioral_patterns(self, user_id: str, attempts: List[Dict[str, Any]]) -> List[FraudFlag]:
        """Check for specific suspicious behavioral patterns"""
        flags = []
        
        if len(attempts) < 5:
            return flags
        
        # Check for mechanical timing patterns
        response_times = [attempt.get('time_taken_ms', 0) for attempt in attempts]
        if len(set(response_times)) < 3 and len(response_times) >= 10:
            flags.append(FraudFlag.MECHANICAL_TIMING)
        
        # Check for impossible accuracy improvements
        if len(attempts) >= 20:
            first_half = attempts[:len(attempts)//2]
            second_half = attempts[len(attempts)//2:]
            
            first_accuracy = sum(a.get('correct', False) for a in first_half) / len(first_half)
            second_accuracy = sum(a.get('correct', False) for a in second_half) / len(second_half)
            
            if second_accuracy - first_accuracy > 0.4:  # 40% improvement
                flags.append(FraudFlag.ACCURACY_SPIKE)
        
        # Check for bot-like response patterns
        response_times = [attempt.get('time_taken_ms', 0) for attempt in attempts[-10:]]
        if response_times:
            cv = np.std(response_times) / max(np.mean(response_times), 1)
            if cv < 0.1 and np.mean(response_times) < 2000:  # Very consistent and fast
                flags.append(FraudFlag.BOT_BEHAVIOR)
        
        return flags
    
    async def _check_collusion_indicators(self, user_id: str, attempts: List[Dict[str, Any]]) -> List[FraudFlag]:
        """Check for indicators of collusion or account sharing"""
        flags = []
        
        # Check for multiple device types in short time
        recent_attempts = attempts[-20:] if len(attempts) >= 20 else attempts
        devices = [attempt.get('device_type') for attempt in recent_attempts if attempt.get('device_type')]
        
        if len(set(devices)) > 3:  # More than 3 different devices recently
            flags.append(FraudFlag.SUSPICIOUS_DEVICE)
        
        # Check for IP address changes (if available)
        ip_addresses = [attempt.get('ip_address') for attempt in recent_attempts if attempt.get('ip_address')]
        if len(set(ip_addresses)) > 5:  # Many different IP addresses
            flags.append(FraudFlag.SUSPICIOUS_DEVICE)
        
        # Check for simultaneous sessions (would need session data)
        # This is a placeholder for more sophisticated collusion detection
        
        return flags
    
    async def _create_baseline_profile(self, user_id: str, features: Dict[str, float]):
        """Create initial behavior profile for new user"""
        profile = UserBehaviorProfile(
            user_id=user_id,
            avg_response_time=features.get('avg_response_time', 0),
            response_time_std=features.get('response_time_std', 0),
            accuracy_rate=features.get('accuracy_rate', 0),
            session_frequency=1.0,  # Will be updated over time
            typical_session_duration=features.get('session_length', 0),
            common_devices=[],
            common_times=[],
            last_updated=datetime.utcnow(),
            sample_size=1
        )
        
        await self.db.save_user_behavior_profile(profile)
    
    async def _update_behavior_profile(self, user_id: str, features: Dict[str, float], 
                                     existing_profile: UserBehaviorProfile):
        """Update user behavior profile with new data"""
        # Use exponential moving average for updates
        alpha = 0.1  # Learning rate
        
        updated_profile = UserBehaviorProfile(
            user_id=user_id,
            avg_response_time=(1 - alpha) * existing_profile.avg_response_time + 
                             alpha * features.get('avg_response_time', 0),
            response_time_std=(1 - alpha) * existing_profile.response_time_std + 
                             alpha * features.get('response_time_std', 0),
            accuracy_rate=(1 - alpha) * existing_profile.accuracy_rate + 
                         alpha * features.get('accuracy_rate', 0),
            session_frequency=existing_profile.session_frequency,  # Updated separately
            typical_session_duration=(1 - alpha) * existing_profile.typical_session_duration + 
                                    alpha * features.get('session_length', 0),
            common_devices=existing_profile.common_devices,  # Updated separately
            common_times=existing_profile.common_times,  # Updated separately
            last_updated=datetime.utcnow(),
            sample_size=existing_profile.sample_size + 1
        )
        
        await self.db.save_user_behavior_profile(updated_profile)
    
    async def detect_network_anomalies(self, user_connections: List[Dict[str, Any]]) -> Tuple[float, List[str]]:
        """Detect network-based anomalies and potential collusion"""
        anomalies = []
        score = 0.0
        
        if not user_connections:
            return score, anomalies
        
        # Group by IP address
        ip_groups = defaultdict(list)
        for conn in user_connections:
            ip = conn.get('ip_address')
            if ip:
                ip_groups[ip].append(conn)
        
        # Check for suspicious IP sharing
        for ip, connections in ip_groups.items():
            unique_users = set(conn.get('user_id') for conn in connections)
            if len(unique_users) > 10:  # Too many users from same IP
                anomalies.append(f"Suspicious IP sharing: {ip} ({len(unique_users)} users)")
                score += 0.3
        
        # Check for coordinated behavior patterns
        # This would involve more sophisticated network analysis
        
        return min(score, 1.0), anomalies
    
    def build_user_similarity_graph(self, user_behaviors: Dict[str, Dict[str, float]]) -> Dict[str, List[str]]:
        """Build similarity graph for collusion detection"""
        similarity_graph = defaultdict(list)
        
        users = list(user_behaviors.keys())
        
        for i, user1 in enumerate(users):
            for user2 in users[i+1:]:
                similarity = self._calculate_behavior_similarity(
                    user_behaviors[user1], 
                    user_behaviors[user2]
                )
                
                if similarity > 0.8:  # High similarity threshold
                    similarity_graph[user1].append(user2)
                    similarity_graph[user2].append(user1)
        
        return dict(similarity_graph)
    
    def _calculate_behavior_similarity(self, behavior1: Dict[str, float], 
                                     behavior2: Dict[str, float]) -> float:
        """Calculate similarity between two user behavior profiles"""
        common_features = set(behavior1.keys()) & set(behavior2.keys())
        
        if not common_features:
            return 0.0
        
        # Calculate cosine similarity
        vec1 = np.array([behavior1[f] for f in common_features])
        vec2 = np.array([behavior2[f] for f in common_features])
        
        # Normalize vectors
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = np.dot(vec1, vec2) / (norm1 * norm2)
        return max(0.0, similarity)  # Ensure non-negative