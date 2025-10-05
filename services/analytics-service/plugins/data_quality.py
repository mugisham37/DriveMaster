"""Data quality validation and monitoring utilities."""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import structlog

logger = structlog.get_logger(__name__)


class ValidationSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationResult:
    """Result of a data quality validation check."""
    check_name: str
    severity: ValidationSeverity
    passed: bool
    message: str
    details: Dict[str, Any]
    timestamp: datetime


@dataclass
class DataQualityReport:
    """Comprehensive data quality report."""
    dataset_name: str
    total_records: int
    validation_results: List[ValidationResult]
    overall_score: float
    passed_checks: int
    failed_checks: int
    timestamp: datetime
    
    @property
    def has_critical_issues(self) -> bool:
        return any(r.severity == ValidationSeverity.CRITICAL and not r.passed 
                  for r in self.validation_results)
    
    @property
    def has_errors(self) -> bool:
        return any(r.severity == ValidationSeverity.ERROR and not r.passed 
                  for r in self.validation_results)


class DataQualityValidator:
    """Validates data quality for analytics datasets."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.max_null_percentage = config.get('max_null_percentage', 0.05)
        self.max_duplicate_percentage = config.get('max_duplicate_percentage', 0.01)
        self.min_record_count = config.get('min_record_count', 100)
        self.anomaly_threshold_std = config.get('anomaly_threshold_std', 3.0)
        
    def validate_dataset(self, df: pd.DataFrame, dataset_name: str) -> DataQualityReport:
        """Run comprehensive data quality validation."""
        
        validation_results = []
        
        # Basic data checks
        validation_results.extend(self._check_basic_data_quality(df))
        
        # Schema validation
        validation_results.extend(self._check_schema_compliance(df, dataset_name))
        
        # Business logic validation
        validation_results.extend(self._check_business_rules(df, dataset_name))
        
        # Anomaly detection
        validation_results.extend(self._check_anomalies(df, dataset_name))
        
        # Calculate overall score
        passed_checks = sum(1 for r in validation_results if r.passed)
        total_checks = len(validation_results)
        overall_score = passed_checks / total_checks if total_checks > 0 else 0.0
        
        report = DataQualityReport(
            dataset_name=dataset_name,
            total_records=len(df),
            validation_results=validation_results,
            overall_score=overall_score,
            passed_checks=passed_checks,
            failed_checks=total_checks - passed_checks,
            timestamp=datetime.utcnow()
        )
        
        logger.info(
            "Data quality validation completed",
            dataset=dataset_name,
            records=len(df),
            score=overall_score,
            passed=passed_checks,
            failed=total_checks - passed_checks
        )
        
        return report
    
    def _check_basic_data_quality(self, df: pd.DataFrame) -> List[ValidationResult]:
        """Check basic data quality metrics."""
        results = []
        
        # Check minimum record count
        min_records_check = ValidationResult(
            check_name="minimum_record_count",
            severity=ValidationSeverity.ERROR,
            passed=len(df) >= self.min_record_count,
            message=f"Dataset has {len(df)} records (minimum: {self.min_record_count})",
            details={"record_count": len(df), "minimum_required": self.min_record_count},
            timestamp=datetime.utcnow()
        )
        results.append(min_records_check)
        
        if df.empty:
            return results
        
        # Check for excessive null values
        null_percentages = df.isnull().sum() / len(df)
        high_null_columns = null_percentages[null_percentages > self.max_null_percentage]
        
        null_check = ValidationResult(
            check_name="null_value_check",
            severity=ValidationSeverity.WARNING,
            passed=len(high_null_columns) == 0,
            message=f"Found {len(high_null_columns)} columns with >{self.max_null_percentage*100}% null values",
            details={"high_null_columns": high_null_columns.to_dict()},
            timestamp=datetime.utcnow()
        )
        results.append(null_check)
        
        # Check for duplicate records
        duplicate_count = df.duplicated().sum()
        duplicate_percentage = duplicate_count / len(df)
        
        duplicate_check = ValidationResult(
            check_name="duplicate_record_check",
            severity=ValidationSeverity.WARNING,
            passed=duplicate_percentage <= self.max_duplicate_percentage,
            message=f"Found {duplicate_count} duplicate records ({duplicate_percentage:.2%})",
            details={"duplicate_count": duplicate_count, "duplicate_percentage": duplicate_percentage},
            timestamp=datetime.utcnow()
        )
        results.append(duplicate_check)
        
        return results
    
    def _check_schema_compliance(self, df: pd.DataFrame, dataset_name: str) -> List[ValidationResult]:
        """Check schema compliance for specific dataset types."""
        results = []
        
        if dataset_name == "user.attempts":
            results.extend(self._validate_attempts_schema(df))
        elif dataset_name == "user.sessions":
            results.extend(self._validate_sessions_schema(df))
        elif dataset_name == "ml.training_events":
            results.extend(self._validate_ml_events_schema(df))
        
        return results
    
    def _validate_attempts_schema(self, df: pd.DataFrame) -> List[ValidationResult]:
        """Validate attempts data schema."""
        results = []
        
        required_columns = [
            'user_id', 'item_id', 'session_id', 'correct', 'time_taken_ms', 'timestamp'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        schema_check = ValidationResult(
            check_name="attempts_schema_check",
            severity=ValidationSeverity.CRITICAL,
            passed=len(missing_columns) == 0,
            message=f"Missing required columns: {missing_columns}" if missing_columns else "All required columns present",
            details={"missing_columns": missing_columns, "required_columns": required_columns},
            timestamp=datetime.utcnow()
        )
        results.append(schema_check)
        
        if 'correct' in df.columns:
            # Check boolean values
            invalid_correct = ~df['correct'].isin([True, False, 0, 1])
            correct_check = ValidationResult(
                check_name="correct_field_validation",
                severity=ValidationSeverity.ERROR,
                passed=invalid_correct.sum() == 0,
                message=f"Found {invalid_correct.sum()} invalid 'correct' values",
                details={"invalid_count": invalid_correct.sum()},
                timestamp=datetime.utcnow()
            )
            results.append(correct_check)
        
        if 'time_taken_ms' in df.columns:
            # Check reasonable response times (1ms to 10 minutes)
            invalid_times = (df['time_taken_ms'] < 1) | (df['time_taken_ms'] > 600000)
            time_check = ValidationResult(
                check_name="response_time_validation",
                severity=ValidationSeverity.WARNING,
                passed=invalid_times.sum() == 0,
                message=f"Found {invalid_times.sum()} unreasonable response times",
                details={"invalid_count": invalid_times.sum()},
                timestamp=datetime.utcnow()
            )
            results.append(time_check)
        
        return results
    
    def _validate_sessions_schema(self, df: pd.DataFrame) -> List[ValidationResult]:
        """Validate sessions data schema."""
        results = []
        
        required_columns = [
            'session_id', 'user_id', 'start_time', 'end_time', 'items_attempted', 'correct_count'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        schema_check = ValidationResult(
            check_name="sessions_schema_check",
            severity=ValidationSeverity.CRITICAL,
            passed=len(missing_columns) == 0,
            message=f"Missing required columns: {missing_columns}" if missing_columns else "All required columns present",
            details={"missing_columns": missing_columns, "required_columns": required_columns},
            timestamp=datetime.utcnow()
        )
        results.append(schema_check)
        
        if 'start_time' in df.columns and 'end_time' in df.columns:
            # Check session duration logic
            invalid_duration = df['end_time'] <= df['start_time']
            duration_check = ValidationResult(
                check_name="session_duration_validation",
                severity=ValidationSeverity.ERROR,
                passed=invalid_duration.sum() == 0,
                message=f"Found {invalid_duration.sum()} sessions with invalid duration",
                details={"invalid_count": invalid_duration.sum()},
                timestamp=datetime.utcnow()
            )
            results.append(duration_check)
        
        return results
    
    def _validate_ml_events_schema(self, df: pd.DataFrame) -> List[ValidationResult]:
        """Validate ML events data schema."""
        results = []
        
        required_columns = ['user_id', 'event_type', 'timestamp']
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        schema_check = ValidationResult(
            check_name="ml_events_schema_check",
            severity=ValidationSeverity.CRITICAL,
            passed=len(missing_columns) == 0,
            message=f"Missing required columns: {missing_columns}" if missing_columns else "All required columns present",
            details={"missing_columns": missing_columns, "required_columns": required_columns},
            timestamp=datetime.utcnow()
        )
        results.append(schema_check)
        
        return results
    
    def _check_business_rules(self, df: pd.DataFrame, dataset_name: str) -> List[ValidationResult]:
        """Check business logic rules."""
        results = []
        
        if dataset_name == "user.attempts" and not df.empty:
            # Check accuracy consistency
            if 'correct_count' in df.columns and 'items_attempted' in df.columns:
                invalid_accuracy = df['correct_count'] > df['items_attempted']
                accuracy_check = ValidationResult(
                    check_name="accuracy_consistency_check",
                    severity=ValidationSeverity.ERROR,
                    passed=invalid_accuracy.sum() == 0,
                    message=f"Found {invalid_accuracy.sum()} records with correct_count > items_attempted",
                    details={"invalid_count": invalid_accuracy.sum()},
                    timestamp=datetime.utcnow()
                )
                results.append(accuracy_check)
        
        return results
    
    def _check_anomalies(self, df: pd.DataFrame, dataset_name: str) -> List[ValidationResult]:
        """Check for statistical anomalies."""
        results = []
        
        if df.empty:
            return results
        
        # Check for outliers in numeric columns
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            if col in ['year', 'month', 'day']:  # Skip partition columns
                continue
                
            series = df[col].dropna()
            if len(series) == 0:
                continue
                
            mean_val = series.mean()
            std_val = series.std()
            
            if std_val == 0:  # No variation
                continue
                
            # Find outliers beyond threshold standard deviations
            outliers = np.abs((series - mean_val) / std_val) > self.anomaly_threshold_std
            outlier_count = outliers.sum()
            outlier_percentage = outlier_count / len(series)
            
            anomaly_check = ValidationResult(
                check_name=f"anomaly_detection_{col}",
                severity=ValidationSeverity.INFO,
                passed=outlier_percentage < 0.01,  # Less than 1% outliers
                message=f"Found {outlier_count} outliers in {col} ({outlier_percentage:.2%})",
                details={
                    "column": col,
                    "outlier_count": outlier_count,
                    "outlier_percentage": outlier_percentage,
                    "mean": mean_val,
                    "std": std_val
                },
                timestamp=datetime.utcnow()
            )
            results.append(anomaly_check)
        
        return results
    
    def generate_quality_metrics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate comprehensive quality metrics."""
        if df.empty:
            return {"record_count": 0}
        
        metrics = {
            "record_count": len(df),
            "column_count": len(df.columns),
            "null_percentage_by_column": (df.isnull().sum() / len(df)).to_dict(),
            "duplicate_count": df.duplicated().sum(),
            "duplicate_percentage": df.duplicated().sum() / len(df),
            "data_types": df.dtypes.astype(str).to_dict(),
            "memory_usage_mb": df.memory_usage(deep=True).sum() / (1024 * 1024)
        }
        
        # Add numeric column statistics
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            metrics["numeric_stats"] = df[numeric_cols].describe().to_dict()
        
        # Add categorical column statistics
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        if len(categorical_cols) > 0:
            metrics["categorical_stats"] = {}
            for col in categorical_cols:
                metrics["categorical_stats"][col] = {
                    "unique_count": df[col].nunique(),
                    "most_common": df[col].value_counts().head(5).to_dict()
                }
        
        return metrics