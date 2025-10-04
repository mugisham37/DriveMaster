"""
Feature engineering utilities for ML training pipeline

This module provides comprehensive feature engineering capabilities for the adaptive
learning platform, including user behavior features, item difficulty features,
temporal features, and sequence modeling features for DKT.

Requirements: 11.5
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler
from sklearn.feature_extraction.text import TfidfVectorizer
import featuretools as ft
from tsfresh import extract_features, select_features
from tsfresh.utilities.dataframe_functions import impute
import json
import pickle
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class FeatureConfig:
    """Configuration for feature engineering"""
    # User behavior features
    user_window_days: int = 30
    min_attempts_per_user: int = 5
    
    # Item difficulty features
    min_attempts_per_item: int = 10
    difficulty_smoothing_factor: float = 0.1
    
    # Temporal features
    time_bins: int = 24  # Hours in a day
    day_bins: int = 7    # Days in a week
    
    # Sequence features
    max_sequence_length: int = 100
    min_sequence_length: int = 3
    sequence_overlap: float = 0.5
    
    # Feature selection
    correlation_threshold: float = 0.95
    variance_threshold: float = 0.01
    feature_importance_threshold: float = 0.001


class UserBehaviorFeatureExtractor:
    """
    Extracts user behavior features from attempt data
    """
    
    def __init__(self, config: FeatureConfig):
        self.config = config
    
    def extract_user_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract comprehensive user behavior features
        
        Args:
            attempts_df: DataFrame with user attempts
            
        Returns:
            DataFrame with user features
        """
        logger.info(f"Extracting user features from {len(attempts_df)} attempts")
        
        # Ensure timestamp is datetime
        attempts_df['timestamp'] = pd.to_datetime(attempts_df['timestamp'])
        
        # Filter users with minimum attempts
        user_counts = attempts_df['user_id'].value_counts()
        valid_users = user_counts[user_counts >= self.config.min_attempts_per_user].index
        attempts_df = attempts_df[attempts_df['user_id'].isin(valid_users)]
        
        logger.info(f"Processing {len(valid_users)} users with sufficient attempts")
        
        # Basic aggregation features
        user_features = self._extract_basic_features(attempts_df)
        
        # Temporal features
        temporal_features = self._extract_temporal_features(attempts_df)
        user_features = user_features.merge(temporal_features, on='user_id', how='left')
        
        # Performance trend features
        trend_features = self._extract_trend_features(attempts_df)
        user_features = user_features.merge(trend_features, on='user_id', how='left')
        
        # Session-based features
        session_features = self._extract_session_features(attempts_df)
        user_features = user_features.merge(session_features, on='user_id', how='left')
        
        # Topic-specific features
        topic_features = self._extract_topic_features(attempts_df)
        user_features = user_features.merge(topic_features, on='user_id', how='left')
        
        logger.info(f"Generated {len(user_features.columns)} user features for {len(user_features)} users")
        return user_features
    
    def _extract_basic_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """Extract basic aggregation features"""
        features = attempts_df.groupby('user_id').agg({
            'correct': ['count', 'sum', 'mean', 'std'],
            'time_taken_ms': ['mean', 'std', 'median', 'min', 'max'],
            'quality': ['mean', 'std', 'min', 'max'],
            'hints_used': ['mean', 'sum', 'std'],
            'timestamp': ['min', 'max', 'count']
        }).round(4)
        
        # Flatten column names
        features.columns = ['_'.join(col).strip() for col in features.columns]
        features = features.reset_index()
        
        # Calculate derived features
        features['accuracy'] = features['correct_sum'] / features['correct_count']
        features['total_study_time_hours'] = (
            (features['timestamp_max'] - features['timestamp_min']).dt.total_seconds() / 3600
        )
        features['attempts_per_day'] = features['correct_count'] / (
            features['total_study_time_hours'] / 24
        ).clip(lower=1)
        
        return features
    
    def _extract_temporal_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """Extract temporal behavior features"""
        # Add time-based columns
        attempts_df['hour'] = attempts_df['timestamp'].dt.hour
        attempts_df['day_of_week'] = attempts_df['timestamp'].dt.dayofweek
        attempts_df['is_weekend'] = attempts_df['day_of_week'].isin([5, 6])
        
        temporal_features = []
        
        for user_id in attempts_df['user_id'].unique():
            user_data = attempts_df[attempts_df['user_id'] == user_id]
            
            # Hour distribution
            hour_dist = user_data['hour'].value_counts(normalize=True)
            hour_entropy = -sum(p * np.log2(p) for p in hour_dist if p > 0)
            
            # Day of week distribution
            dow_dist = user_data['day_of_week'].value_counts(normalize=True)
            dow_entropy = -sum(p * np.log2(p) for p in dow_dist if p > 0)
            
            # Study patterns
            weekend_ratio = user_data['is_weekend'].mean()
            
            # Peak hours
            peak_hour = hour_dist.idxmax() if len(hour_dist) > 0 else 12
            
            # Session gaps (time between attempts)
            user_data_sorted = user_data.sort_values('timestamp')
            gaps = user_data_sorted['timestamp'].diff().dt.total_seconds() / 3600  # hours
            gaps = gaps.dropna()
            
            temporal_features.append({
                'user_id': user_id,
                'hour_entropy': hour_entropy,
                'dow_entropy': dow_entropy,
                'weekend_ratio': weekend_ratio,
                'peak_hour': peak_hour,
                'avg_session_gap_hours': gaps.mean() if len(gaps) > 0 else 0,
                'std_session_gap_hours': gaps.std() if len(gaps) > 0 else 0,
                'max_session_gap_hours': gaps.max() if len(gaps) > 0 else 0
            })
        
        return pd.DataFrame(temporal_features)
    
    def _extract_trend_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """Extract performance trend features"""
        trend_features = []
        
        for user_id in attempts_df['user_id'].unique():
            user_data = attempts_df[attempts_df['user_id'] == user_id].sort_values('timestamp')
            
            if len(user_data) < 5:  # Need minimum attempts for trend analysis
                continue
            
            # Split into early and late periods
            mid_point = len(user_data) // 2
            early_data = user_data.iloc[:mid_point]
            late_data = user_data.iloc[mid_point:]
            
            # Performance improvement
            early_accuracy = early_data['correct'].mean()
            late_accuracy = late_data['correct'].mean()
            accuracy_improvement = late_accuracy - early_accuracy
            
            # Speed improvement
            early_speed = early_data['time_taken_ms'].mean()
            late_speed = late_data['time_taken_ms'].mean()
            speed_improvement = (early_speed - late_speed) / early_speed if early_speed > 0 else 0
            
            # Quality improvement
            early_quality = early_data['quality'].mean()
            late_quality = late_data['quality'].mean()
            quality_improvement = late_quality - early_quality
            
            # Consistency (coefficient of variation)
            accuracy_cv = user_data['correct'].std() / user_data['correct'].mean() if user_data['correct'].mean() > 0 else 0
            
            # Learning curve slope (simple linear regression)
            x = np.arange(len(user_data))
            y = user_data['correct'].values
            if len(x) > 1:
                slope = np.polyfit(x, y, 1)[0]
            else:
                slope = 0
            
            trend_features.append({
                'user_id': user_id,
                'accuracy_improvement': accuracy_improvement,
                'speed_improvement': speed_improvement,
                'quality_improvement': quality_improvement,
                'accuracy_cv': accuracy_cv,
                'learning_slope': slope
            })
        
        return pd.DataFrame(trend_features)
    
    def _extract_session_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """Extract session-based features"""
        # Define sessions based on time gaps (> 30 minutes = new session)
        session_gap_threshold = 30 * 60 * 1000  # 30 minutes in milliseconds
        
        session_features = []
        
        for user_id in attempts_df['user_id'].unique():
            user_data = attempts_df[attempts_df['user_id'] == user_id].sort_values('timestamp')
            
            # Identify sessions
            time_diffs = user_data['timestamp'].diff().dt.total_seconds() * 1000
            session_breaks = time_diffs > session_gap_threshold
            user_data['session_id'] = session_breaks.cumsum()
            
            # Session statistics
            session_stats = user_data.groupby('session_id').agg({
                'correct': ['count', 'mean'],
                'time_taken_ms': 'sum',
                'timestamp': ['min', 'max']
            })
            
            session_stats.columns = ['_'.join(col) for col in session_stats.columns]
            session_stats['session_duration_minutes'] = (
                (session_stats['timestamp_max'] - session_stats['timestamp_min']).dt.total_seconds() / 60
            )
            
            # Aggregate session features
            num_sessions = len(session_stats)
            avg_session_length = session_stats['correct_count'].mean()
            avg_session_accuracy = session_stats['correct_mean'].mean()
            avg_session_duration = session_stats['session_duration_minutes'].mean()
            
            session_features.append({
                'user_id': user_id,
                'num_sessions': num_sessions,
                'avg_session_length': avg_session_length,
                'avg_session_accuracy': avg_session_accuracy,
                'avg_session_duration_minutes': avg_session_duration
            })
        
        return pd.DataFrame(session_features)
    
    def _extract_topic_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """Extract topic-specific performance features"""
        if 'topics' not in attempts_df.columns:
            logger.warning("No topics column found, skipping topic features")
            return pd.DataFrame({'user_id': attempts_df['user_id'].unique()})
        
        topic_features = []
        
        for user_id in attempts_df['user_id'].unique():
            user_data = attempts_df[attempts_df['user_id'] == user_id]
            
            # Expand topics (assuming JSON array format)
            topic_rows = []
            for _, row in user_data.iterrows():
                try:
                    topics = json.loads(row['topics']) if isinstance(row['topics'], str) else row['topics']
                    for topic in topics:
                        topic_row = row.copy()
                        topic_row['topic'] = topic
                        topic_rows.append(topic_row)
                except:
                    continue
            
            if not topic_rows:
                continue
            
            topic_df = pd.DataFrame(topic_rows)
            
            # Topic performance
            topic_performance = topic_df.groupby('topic')['correct'].agg(['count', 'mean']).reset_index()
            
            # Topic diversity
            num_topics = len(topic_performance)
            topic_entropy = -sum(
                (count / topic_performance['count'].sum()) * np.log2(count / topic_performance['count'].sum())
                for count in topic_performance['count']
                if count > 0
            )
            
            # Best and worst topics
            best_topic_accuracy = topic_performance['mean'].max() if len(topic_performance) > 0 else 0
            worst_topic_accuracy = topic_performance['mean'].min() if len(topic_performance) > 0 else 0
            topic_accuracy_range = best_topic_accuracy - worst_topic_accuracy
            
            topic_features.append({
                'user_id': user_id,
                'num_topics_attempted': num_topics,
                'topic_entropy': topic_entropy,
                'best_topic_accuracy': best_topic_accuracy,
                'worst_topic_accuracy': worst_topic_accuracy,
                'topic_accuracy_range': topic_accuracy_range
            })
        
        return pd.DataFrame(topic_features)


class ItemDifficultyFeatureExtractor:
    """
    Extracts item difficulty and topic features
    """
    
    def __init__(self, config: FeatureConfig):
        self.config = config
    
    def extract_item_features(self, attempts_df: pd.DataFrame, items_df: pd.DataFrame = None) -> pd.DataFrame:
        """
        Extract item difficulty and performance features
        
        Args:
            attempts_df: DataFrame with attempts
            items_df: Optional DataFrame with item metadata
            
        Returns:
            DataFrame with item features
        """
        logger.info(f"Extracting item features from {len(attempts_df)} attempts")
        
        # Filter items with minimum attempts
        item_counts = attempts_df['item_id'].value_counts()
        valid_items = item_counts[item_counts >= self.config.min_attempts_per_item].index
        attempts_df = attempts_df[attempts_df['item_id'].isin(valid_items)]
        
        logger.info(f"Processing {len(valid_items)} items with sufficient attempts")
        
        # Basic item statistics
        item_features = self._extract_basic_item_features(attempts_df)
        
        # IRT-based difficulty estimation
        irt_features = self._extract_irt_features(attempts_df)
        item_features = item_features.merge(irt_features, on='item_id', how='left')
        
        # Response time features
        time_features = self._extract_time_features(attempts_df)
        item_features = item_features.merge(time_features, on='item_id', how='left')
        
        # User diversity features
        diversity_features = self._extract_diversity_features(attempts_df)
        item_features = item_features.merge(diversity_features, on='item_id', how='left')
        
        # Add item metadata if available
        if items_df is not None:
            item_features = item_features.merge(
                items_df[['item_id', 'difficulty', 'topics', 'item_type']],
                on='item_id',
                how='left'
            )
        
        logger.info(f"Generated {len(item_features.columns)} item features for {len(item_features)} items")
        return item_features
    
    def _extract_basic_item_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """Extract basic item performance features"""
        features = attempts_df.groupby('item_id').agg({
            'correct': ['count', 'sum', 'mean', 'std'],
            'time_taken_ms': ['mean', 'std', 'median'],
            'quality': ['mean', 'std'],
            'hints_used': ['mean', 'sum'],
            'user_id': 'nunique'
        }).round(4)
        
        features.columns = ['_'.join(col).strip() for col in features.columns]
        features = features.reset_index()
        
        # Calculate derived features
        features['difficulty_score'] = 1 - features['correct_mean']  # Higher score = more difficult
        features['discrimination'] = features['correct_std']  # How well item discriminates
        
        return features
    
    def _extract_irt_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """Extract IRT-based difficulty parameters"""
        irt_features = []
        
        for item_id in attempts_df['item_id'].unique():
            item_data = attempts_df[attempts_df['item_id'] == item_id]
            
            # Simple IRT 1PL model estimation
            p_correct = item_data['correct'].mean()
            
            # Convert to logit scale (difficulty parameter)
            if p_correct > 0.001 and p_correct < 0.999:
                difficulty_logit = -np.log(p_correct / (1 - p_correct))
            else:
                difficulty_logit = 0
            
            # Discrimination based on variance
            discrimination = item_data['correct'].var() * 4  # Scale factor
            
            # Guessing parameter (minimum performance)
            guessing = max(0, min(item_data['correct']) if len(item_data) > 5 else 0.25)
            
            irt_features.append({
                'item_id': item_id,
                'irt_difficulty': difficulty_logit,
                'irt_discrimination': discrimination,
                'irt_guessing': guessing
            })
        
        return pd.DataFrame(irt_features)
    
    def _extract_time_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """Extract response time features"""
        time_features = attempts_df.groupby('item_id').agg({
            'time_taken_ms': ['mean', 'std', 'median', 'min', 'max', 'skew']
        }).round(4)
        
        time_features.columns = ['time_' + '_'.join(col).strip() for col in time_features.columns]
        time_features = time_features.reset_index()
        
        # Time-difficulty correlation
        for item_id in attempts_df['item_id'].unique():
            item_data = attempts_df[attempts_df['item_id'] == item_id]
            if len(item_data) > 3:
                time_difficulty_corr = item_data['time_taken_ms'].corr(1 - item_data['correct'])
                time_features.loc[time_features['item_id'] == item_id, 'time_difficulty_corr'] = time_difficulty_corr
        
        return time_features
    
    def _extract_diversity_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """Extract user diversity features for items"""
        diversity_features = []
        
        for item_id in attempts_df['item_id'].unique():
            item_data = attempts_df[attempts_df['item_id'] == item_id]
            
            # User performance distribution
            user_performance = item_data.groupby('user_id')['correct'].mean()
            
            # Diversity metrics
            performance_entropy = -sum(
                p * np.log2(p) for p in [user_performance.mean(), 1 - user_performance.mean()]
                if p > 0
            )
            
            diversity_features.append({
                'item_id': item_id,
                'user_performance_std': user_performance.std(),
                'user_performance_range': user_performance.max() - user_performance.min(),
                'performance_entropy': performance_entropy
            })
        
        return pd.DataFrame(diversity_features)


class SequenceFeatureExtractor:
    """
    Extracts sequence features for Deep Knowledge Tracing
    """
    
    def __init__(self, config: FeatureConfig):
        self.config = config
    
    def extract_sequence_features(self, attempts_df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract sequence features for DKT training
        
        Args:
            attempts_df: DataFrame with attempts
            
        Returns:
            DataFrame with sequence features
        """
        logger.info(f"Extracting sequence features from {len(attempts_df)} attempts")
        
        # Sort by user and timestamp
        attempts_df = attempts_df.sort_values(['user_id', 'timestamp'])
        
        sequences = []
        
        for user_id in attempts_df['user_id'].unique():
            user_data = attempts_df[attempts_df['user_id'] == user_id]
            
            if len(user_data) < self.config.min_sequence_length:
                continue
            
            # Create overlapping sequences if data is long enough
            if len(user_data) > self.config.max_sequence_length:
                sequences.extend(self._create_overlapping_sequences(user_data))
            else:
                sequences.append(self._create_single_sequence(user_data))
        
        sequence_df = pd.DataFrame(sequences)
        
        # Add sequence-level features
        sequence_df = self._add_sequence_level_features(sequence_df)
        
        logger.info(f"Generated {len(sequence_df)} sequences for DKT training")
        return sequence_df
    
    def _create_overlapping_sequences(self, user_data: pd.DataFrame) -> List[Dict[str, Any]]:
        """Create overlapping sequences from long user data"""
        sequences = []
        step_size = int(self.config.max_sequence_length * (1 - self.config.sequence_overlap))
        
        for start_idx in range(0, len(user_data) - self.config.min_sequence_length + 1, step_size):
            end_idx = min(start_idx + self.config.max_sequence_length, len(user_data))
            
            if end_idx - start_idx >= self.config.min_sequence_length:
                sequence_data = user_data.iloc[start_idx:end_idx]
                sequences.append(self._create_single_sequence(sequence_data))
        
        return sequences
    
    def _create_single_sequence(self, sequence_data: pd.DataFrame) -> Dict[str, Any]:
        """Create a single sequence from user data"""
        return {
            'user_id': sequence_data['user_id'].iloc[0],
            'sequence_id': f"{sequence_data['user_id'].iloc[0]}_{sequence_data.index[0]}_{sequence_data.index[-1]}",
            'item_sequence': sequence_data['item_id'].tolist(),
            'response_sequence': sequence_data['correct'].astype(int).tolist(),
            'time_sequence': sequence_data['time_taken_ms'].tolist(),
            'quality_sequence': sequence_data['quality'].tolist(),
            'timestamp_sequence': sequence_data['timestamp'].tolist(),
            'sequence_length': len(sequence_data),
            'start_time': sequence_data['timestamp'].iloc[0],
            'end_time': sequence_data['timestamp'].iloc[-1]
        }
    
    def _add_sequence_level_features(self, sequence_df: pd.DataFrame) -> pd.DataFrame:
        """Add sequence-level aggregated features"""
        
        # Calculate sequence statistics
        sequence_df['accuracy'] = sequence_df['response_sequence'].apply(lambda x: np.mean(x))
        sequence_df['avg_time'] = sequence_df['time_sequence'].apply(lambda x: np.mean(x))
        sequence_df['avg_quality'] = sequence_df['quality_sequence'].apply(lambda x: np.mean(x))
        
        # Sequence diversity
        sequence_df['unique_items'] = sequence_df['item_sequence'].apply(lambda x: len(set(x)))
        sequence_df['item_diversity'] = sequence_df['unique_items'] / sequence_df['sequence_length']
        
        # Performance trends within sequence
        sequence_df['accuracy_trend'] = sequence_df['response_sequence'].apply(self._calculate_trend)
        sequence_df['time_trend'] = sequence_df['time_sequence'].apply(self._calculate_trend)
        
        # Sequence duration
        sequence_df['duration_minutes'] = (
            pd.to_datetime(sequence_df['end_time']) - pd.to_datetime(sequence_df['start_time'])
        ).dt.total_seconds() / 60
        
        return sequence_df
    
    def _calculate_trend(self, sequence: List[float]) -> float:
        """Calculate linear trend in a sequence"""
        if len(sequence) < 2:
            return 0
        
        x = np.arange(len(sequence))
        y = np.array(sequence)
        
        try:
            slope = np.polyfit(x, y, 1)[0]
            return slope
        except:
            return 0


class FeatureStore:
    """
    Manages feature storage, retrieval, and caching
    """
    
    def __init__(self, storage_path: str, cache_ttl_hours: int = 24):
        self.storage_path = storage_path
        self.cache_ttl_hours = cache_ttl_hours
        self.feature_cache = {}
    
    def save_features(self, features: pd.DataFrame, feature_type: str, timestamp: datetime = None):
        """
        Save features to storage with versioning
        
        Args:
            features: Feature DataFrame
            feature_type: Type of features (user, item, sequence)
            timestamp: Optional timestamp for versioning
        """
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Create versioned filename
        filename = f"{feature_type}_features_{timestamp.strftime('%Y%m%d_%H%M%S')}.parquet"
        filepath = f"{self.storage_path}/{filename}"
        
        # Save features
        features.to_parquet(filepath)
        
        # Update cache
        cache_key = f"{feature_type}_latest"
        self.feature_cache[cache_key] = {
            'features': features,
            'timestamp': timestamp,
            'filepath': filepath
        }
        
        logger.info(f"Saved {len(features)} {feature_type} features to {filepath}")
    
    def load_features(self, feature_type: str, timestamp: datetime = None) -> Optional[pd.DataFrame]:
        """
        Load features from storage or cache
        
        Args:
            feature_type: Type of features to load
            timestamp: Optional specific timestamp to load
            
        Returns:
            Feature DataFrame or None if not found
        """
        cache_key = f"{feature_type}_latest"
        
        # Check cache first
        if timestamp is None and cache_key in self.feature_cache:
            cached_data = self.feature_cache[cache_key]
            cache_age = datetime.utcnow() - cached_data['timestamp']
            
            if cache_age.total_seconds() / 3600 < self.cache_ttl_hours:
                logger.info(f"Loaded {feature_type} features from cache")
                return cached_data['features']
        
        # Load from storage
        if timestamp:
            filename = f"{feature_type}_features_{timestamp.strftime('%Y%m%d_%H%M%S')}.parquet"
        else:
            # Find latest file
            import glob
            pattern = f"{self.storage_path}/{feature_type}_features_*.parquet"
            files = glob.glob(pattern)
            if not files:
                logger.warning(f"No {feature_type} features found in storage")
                return None
            filename = max(files)  # Latest by filename
        
        filepath = f"{self.storage_path}/{filename}"
        
        try:
            features = pd.read_parquet(filepath)
            logger.info(f"Loaded {len(features)} {feature_type} features from {filepath}")
            return features
        except Exception as e:
            logger.error(f"Error loading features from {filepath}: {e}")
            return None
    
    def get_feature_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about available features
        
        Returns:
            Dictionary with feature metadata
        """
        import glob
        
        metadata = {}
        
        for feature_type in ['user', 'item', 'sequence']:
            pattern = f"{self.storage_path}/{feature_type}_features_*.parquet"
            files = glob.glob(pattern)
            
            if files:
                latest_file = max(files)
                try:
                    df = pd.read_parquet(latest_file)
                    metadata[feature_type] = {
                        'count': len(df),
                        'columns': list(df.columns),
                        'latest_file': latest_file,
                        'file_count': len(files)
                    }
                except Exception as e:
                    metadata[feature_type] = {'error': str(e)}
            else:
                metadata[feature_type] = {'count': 0, 'files': 0}
        
        return metadata


def engineer_all_features(
    attempts_df: pd.DataFrame,
    items_df: pd.DataFrame = None,
    config: FeatureConfig = None,
    feature_store: FeatureStore = None
) -> Dict[str, pd.DataFrame]:
    """
    Main function to engineer all types of features
    
    Args:
        attempts_df: DataFrame with user attempts
        items_df: Optional DataFrame with item metadata
        config: Feature engineering configuration
        feature_store: Optional feature store for caching
        
    Returns:
        Dictionary with all feature DataFrames
    """
    if config is None:
        config = FeatureConfig()
    
    logger.info("Starting comprehensive feature engineering")
    
    # Initialize extractors
    user_extractor = UserBehaviorFeatureExtractor(config)
    item_extractor = ItemDifficultyFeatureExtractor(config)
    sequence_extractor = SequenceFeatureExtractor(config)
    
    # Extract features
    features = {}
    
    # User behavior features
    logger.info("Extracting user behavior features")
    features['user'] = user_extractor.extract_user_features(attempts_df)
    
    # Item difficulty features
    logger.info("Extracting item difficulty features")
    features['item'] = item_extractor.extract_item_features(attempts_df, items_df)
    
    # Sequence features for DKT
    logger.info("Extracting sequence features")
    features['sequence'] = sequence_extractor.extract_sequence_features(attempts_df)
    
    # Save to feature store if provided
    if feature_store:
        timestamp = datetime.utcnow()
        for feature_type, feature_df in features.items():
            feature_store.save_features(feature_df, feature_type, timestamp)
    
    logger.info("Feature engineering completed successfully")
    return features