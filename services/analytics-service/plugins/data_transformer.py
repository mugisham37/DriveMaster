"""Data transformation utilities for analytics pipeline."""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
import json
import structlog

logger = structlog.get_logger(__name__)


class DataTransformer:
    """Handles data transformation and aggregation for analytics."""
    
    def __init__(self):
        self.transformations = {
            'user.attempts': self._transform_attempts,
            'user.sessions': self._transform_sessions,
            'ml.training_events': self._transform_ml_events
        }
    
    def transform_topic_data(self, topic: str, df: pd.DataFrame) -> pd.DataFrame:
        """Transform data for a specific topic."""
        if topic not in self.transformations:
            logger.warning("No transformation defined for topic", topic=topic)
            return df
            
        try:
            transformed_df = self.transformations[topic](df)
            logger.info(
                "Transformed topic data",
                topic=topic,
                input_records=len(df),
                output_records=len(transformed_df)
            )
            return transformed_df
            
        except Exception as e:
            logger.error("Failed to transform data", topic=topic, error=str(e))
            raise
    
    def _transform_attempts(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform user attempts data."""
        if df.empty:
            return df
            
        # Parse JSON fields
        df = df.copy()
        
        # Extract selected answer details
        df['selected_answer'] = df['selected'].apply(
            lambda x: x.get('answer_id') if isinstance(x, dict) else None
        )
        df['selected_text'] = df['selected'].apply(
            lambda x: x.get('text') if isinstance(x, dict) else None
        )
        
        # Parse state snapshots for ML features
        df = self._parse_algorithm_states(df)
        
        # Add derived features
        df['response_time_seconds'] = df['time_taken_ms'] / 1000.0
        df['is_fast_response'] = df['response_time_seconds'] < 5.0
        df['is_slow_response'] = df['response_time_seconds'] > 60.0
        
        # Categorize response times
        df['response_time_category'] = pd.cut(
            df['response_time_seconds'],
            bins=[0, 5, 15, 30, 60, float('inf')],
            labels=['very_fast', 'fast', 'normal', 'slow', 'very_slow']
        )
        
        # Add time-based features
        df['hour_of_day'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6])
        
        # Quality score normalization (0-5 to 0-1)
        df['quality_normalized'] = df['quality'] / 5.0
        
        # Add partitioning columns
        df['year'] = df['timestamp'].dt.year
        df['month'] = df['timestamp'].dt.month
        df['day'] = df['timestamp'].dt.day
        
        return df
    
    def _transform_sessions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform user sessions data."""
        if df.empty:
            return df
            
        df = df.copy()
        
        # Calculate session metrics
        df['duration_minutes'] = df['total_time_ms'] / (1000 * 60)
        df['accuracy'] = df['correct_count'] / df['items_attempted'].replace(0, np.nan)
        df['items_per_minute'] = df['items_attempted'] / df['duration_minutes'].replace(0, np.nan)
        
        # Session quality indicators
        df['is_short_session'] = df['duration_minutes'] < 5
        df['is_long_session'] = df['duration_minutes'] > 60
        df['is_high_accuracy'] = df['accuracy'] > 0.8
        df['is_low_accuracy'] = df['accuracy'] < 0.5
        
        # Parse topics practiced
        df['topics_count'] = df['topics_practiced'].apply(
            lambda x: len(x) if isinstance(x, list) else 0
        )
        
        # Add time-based features
        df['start_hour'] = pd.to_datetime(df['start_time'], unit='ms').dt.hour
        df['end_hour'] = pd.to_datetime(df['end_time'], unit='ms').dt.hour
        df['session_date'] = pd.to_datetime(df['start_time'], unit='ms').dt.date
        
        # Add partitioning columns
        session_timestamp = pd.to_datetime(df['start_time'], unit='ms')
        df['year'] = session_timestamp.dt.year
        df['month'] = session_timestamp.dt.month
        df['day'] = session_timestamp.dt.day
        
        return df
    
    def _transform_ml_events(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform ML training events data."""
        if df.empty:
            return df
            
        df = df.copy()
        
        # Parse event-specific data based on event type
        df['event_data'] = df.apply(self._parse_ml_event_data, axis=1)
        
        # Add partitioning columns
        df['year'] = df['timestamp'].dt.year
        df['month'] = df['timestamp'].dt.month
        df['day'] = df['timestamp'].dt.day
        
        return df
    
    def _parse_algorithm_states(self, df: pd.DataFrame) -> pd.DataFrame:
        """Parse algorithm state snapshots from attempts."""
        
        # Parse SM-2 states
        df = self._parse_sm2_states(df)
        
        # Parse BKT states  
        df = self._parse_bkt_states(df)
        
        # Parse IRT ability states
        df = self._parse_irt_states(df)
        
        return df
    
    def _parse_sm2_states(self, df: pd.DataFrame) -> pd.DataFrame:
        """Parse SM-2 algorithm states."""
        
        def extract_sm2_features(state_json):
            if not state_json or not isinstance(state_json, dict):
                return {}
            
            return {
                'sm2_easiness_factor': state_json.get('easiness_factor'),
                'sm2_interval': state_json.get('interval'),
                'sm2_repetition': state_json.get('repetition'),
                'sm2_days_since_due': (
                    (datetime.now() - pd.to_datetime(state_json.get('next_due'))).days
                    if state_json.get('next_due') else None
                )
            }
        
        # Extract SM-2 before state
        sm2_before_features = df['sm2_state_before'].apply(extract_sm2_features)
        for key in ['sm2_easiness_factor', 'sm2_interval', 'sm2_repetition', 'sm2_days_since_due']:
            df[f'{key}_before'] = sm2_before_features.apply(lambda x: x.get(key))
        
        # Extract SM-2 after state
        sm2_after_features = df['sm2_state_after'].apply(extract_sm2_features)
        for key in ['sm2_easiness_factor', 'sm2_interval', 'sm2_repetition', 'sm2_days_since_due']:
            df[f'{key}_after'] = sm2_after_features.apply(lambda x: x.get(key))
        
        return df
    
    def _parse_bkt_states(self, df: pd.DataFrame) -> pd.DataFrame:
        """Parse Bayesian Knowledge Tracing states."""
        
        def extract_bkt_features(state_json):
            if not state_json or not isinstance(state_json, dict):
                return {}
            
            return {
                'bkt_prob_knowledge': state_json.get('prob_knowledge'),
                'bkt_prob_guess': state_json.get('prob_guess'),
                'bkt_prob_slip': state_json.get('prob_slip'),
                'bkt_prob_learn': state_json.get('prob_learn')
            }
        
        # Extract BKT before state
        bkt_before_features = df['bkt_state_before'].apply(extract_bkt_features)
        for key in ['bkt_prob_knowledge', 'bkt_prob_guess', 'bkt_prob_slip', 'bkt_prob_learn']:
            df[f'{key}_before'] = bkt_before_features.apply(lambda x: x.get(key))
        
        # Extract BKT after state
        bkt_after_features = df['bkt_state_after'].apply(extract_bkt_features)
        for key in ['bkt_prob_knowledge', 'bkt_prob_guess', 'bkt_prob_slip', 'bkt_prob_learn']:
            df[f'{key}_after'] = bkt_after_features.apply(lambda x: x.get(key))
        
        return df
    
    def _parse_irt_states(self, df: pd.DataFrame) -> pd.DataFrame:
        """Parse Item Response Theory ability states."""
        
        def extract_irt_features(state_json):
            if not state_json or not isinstance(state_json, dict):
                return {}
            
            # IRT ability is typically stored per topic
            abilities = {}
            if isinstance(state_json, dict):
                for topic, ability in state_json.items():
                    if isinstance(ability, (int, float)):
                        abilities[f'irt_ability_{topic}'] = ability
            
            return abilities
        
        # Extract IRT before state
        irt_before_features = df['irt_ability_before'].apply(extract_irt_features)
        
        # Get all unique IRT ability columns
        all_irt_columns = set()
        for features in irt_before_features:
            all_irt_columns.update(features.keys())
        
        # Add IRT before columns
        for col in all_irt_columns:
            df[f'{col}_before'] = irt_before_features.apply(lambda x: x.get(col))
        
        # Extract IRT after state
        irt_after_features = df['irt_ability_after'].apply(extract_irt_features)
        
        # Add IRT after columns
        for col in all_irt_columns:
            df[f'{col}_after'] = irt_after_features.apply(lambda x: x.get(col))
        
        return df
    
    def _parse_ml_event_data(self, row) -> Dict[str, Any]:
        """Parse ML event-specific data."""
        event_type = row.get('event_type', 'unknown')
        
        if event_type == 'model_prediction':
            return {
                'model_name': row.get('model_name'),
                'model_version': row.get('model_version'),
                'prediction_score': row.get('prediction_score'),
                'confidence': row.get('confidence'),
                'inference_time_ms': row.get('inference_time_ms')
            }
        elif event_type == 'model_training':
            return {
                'model_name': row.get('model_name'),
                'training_accuracy': row.get('training_accuracy'),
                'validation_accuracy': row.get('validation_accuracy'),
                'training_time_minutes': row.get('training_time_minutes'),
                'hyperparameters': row.get('hyperparameters')
            }
        
        return {}
    
    def create_daily_aggregations(self, df: pd.DataFrame, topic: str) -> pd.DataFrame:
        """Create daily aggregated metrics."""
        if df.empty:
            return df
            
        if topic == 'user.attempts':
            return self._aggregate_daily_attempts(df)
        elif topic == 'user.sessions':
            return self._aggregate_daily_sessions(df)
        
        return df
    
    def _aggregate_daily_attempts(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create daily aggregations for attempts data."""
        
        daily_agg = df.groupby(['user_id', 'year', 'month', 'day']).agg({
            'correct': ['count', 'sum', 'mean'],
            'time_taken_ms': ['mean', 'median', 'std'],
            'quality': ['mean', 'std'],
            'hints_used': ['sum', 'mean'],
            'item_id': 'nunique'  # unique items attempted
        }).round(4)
        
        # Flatten column names
        daily_agg.columns = [f"{col[0]}_{col[1]}" for col in daily_agg.columns]
        daily_agg = daily_agg.reset_index()
        
        # Rename columns for clarity
        daily_agg = daily_agg.rename(columns={
            'correct_count': 'total_attempts',
            'correct_sum': 'correct_attempts',
            'correct_mean': 'accuracy',
            'time_taken_ms_mean': 'avg_response_time_ms',
            'time_taken_ms_median': 'median_response_time_ms',
            'time_taken_ms_std': 'response_time_std_ms',
            'quality_mean': 'avg_quality',
            'quality_std': 'quality_std',
            'hints_used_sum': 'total_hints',
            'hints_used_mean': 'avg_hints_per_attempt',
            'item_id_nunique': 'unique_items_attempted'
        })
        
        return daily_agg
    
    def _aggregate_daily_sessions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create daily aggregations for sessions data."""
        
        daily_agg = df.groupby(['user_id', 'year', 'month', 'day']).agg({
            'session_id': 'count',
            'duration_minutes': ['sum', 'mean', 'median'],
            'items_attempted': ['sum', 'mean'],
            'accuracy': ['mean', 'std'],
            'topics_count': ['sum', 'mean']
        }).round(4)
        
        # Flatten column names
        daily_agg.columns = [f"{col[0]}_{col[1]}" for col in daily_agg.columns]
        daily_agg = daily_agg.reset_index()
        
        # Rename columns for clarity
        daily_agg = daily_agg.rename(columns={
            'session_id_count': 'total_sessions',
            'duration_minutes_sum': 'total_study_time_minutes',
            'duration_minutes_mean': 'avg_session_duration_minutes',
            'duration_minutes_median': 'median_session_duration_minutes',
            'items_attempted_sum': 'total_items_attempted',
            'items_attempted_mean': 'avg_items_per_session',
            'accuracy_mean': 'avg_accuracy',
            'accuracy_std': 'accuracy_std',
            'topics_count_sum': 'total_topics_practiced',
            'topics_count_mean': 'avg_topics_per_session'
        })
        
        return daily_agg