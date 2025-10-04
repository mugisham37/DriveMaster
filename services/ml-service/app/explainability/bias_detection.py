"""Model bias detection and fairness metrics."""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import torch
from sklearn.metrics import roc_auc_score, accuracy_score

from app.core.logging import get_logger

logger = get_logger(__name__)


class BiasMetric(Enum):
    DEMOGRAPHIC_PARITY = "demographic_parity"
    EQUALIZED_ODDS = "equalized_odds"
    EQUALITY_OF_OPPORTUNITY = "equality_of_opportunity"
    CALIBRATION = "calibration"
    INDIVIDUAL_FAIRNESS = "individual_fairness"


@dataclass
class BiasResult:
    """Result of bias detection analysis."""
    
    metric: BiasMetric
    groups: Dict[str, str]  # group_name -> group_value
    scores: Dict[str, float]  # group_name -> metric_score
    overall_score: float
    bias_detected: bool
    threshold: float
    interpretation: str
    recommendations: List[str]


class BiasDetector:
    """Detects bias and fairness issues in ML model predictions."""
    
    def __init__(
        self,
        fairness_threshold: float = 0.1,
        min_group_size: int = 50
    ):
        self.fairness_threshold = fairness_threshold
        self.min_group_size = min_group_size
    
    def detect_bias(
        self,
        predictions: np.ndarray,
        targets: np.ndarray,
        protected_attributes: Dict[str, np.ndarray],
        metrics: List[BiasMetric] = None
    ) -> List[BiasResult]:
        """
        Detect bias across multiple fairness metrics.
        
        Args:
            predictions: Model predictions (probabilities)
            targets: True labels
            protected_attributes: Dict of attribute_name -> attribute_values
            metrics: List of bias metrics to compute
            
        Returns:
            List of BiasResult objects
        """
        
        if metrics is None:
            metrics = [
                BiasMetric.DEMOGRAPHIC_PARITY,
                BiasMetric.EQUALIZED_ODDS,
                BiasMetric.EQUALITY_OF_OPPORTUNITY,
                BiasMetric.CALIBRATION
            ]
        
        results = []
        
        for metric in metrics:
            try:
                if metric == BiasMetric.DEMOGRAPHIC_PARITY:
                    result = self._demographic_parity(predictions, targets, protected_attributes)
                elif metric == BiasMetric.EQUALIZED_ODDS:
                    result = self._equalized_odds(predictions, targets, protected_attributes)
                elif metric == BiasMetric.EQUALITY_OF_OPPORTUNITY:
                    result = self._equality_of_opportunity(predictions, targets, protected_attributes)
                elif metric == BiasMetric.CALIBRATION:
                    result = self._calibration_bias(predictions, targets, protected_attributes)
                elif metric == BiasMetric.INDIVIDUAL_FAIRNESS:
                    result = self._individual_fairness(predictions, targets, protected_attributes)
                else:
                    continue
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"Failed to compute {metric.value}", error=str(e))
                continue
        
        return results
    
    def _demographic_parity(
        self,
        predictions: np.ndarray,
        targets: np.ndarray,
        protected_attributes: Dict[str, np.ndarray]
    ) -> BiasResult:
        """Compute demographic parity (statistical parity)."""
        
        binary_predictions = (predictions > 0.5).astype(int)
        
        group_scores = {}
        group_info = {}
        
        for attr_name, attr_values in protected_attributes.items():
            unique_values = np.unique(attr_values)
            
            for value in unique_values:
                group_mask = attr_values == value
                group_size = np.sum(group_mask)
                
                if group_size < self.min_group_size:
                    continue
                
                group_name = f"{attr_name}_{value}"
                group_positive_rate = np.mean(binary_predictions[group_mask])
                
                group_scores[group_name] = group_positive_rate
                group_info[group_name] = str(value)
        
        # Calculate overall bias score (max difference between groups)
        if len(group_scores) < 2:
            overall_score = 0.0
            bias_detected = False
        else:
            score_values = list(group_scores.values())
            overall_score = max(score_values) - min(score_values)
            bias_detected = overall_score > self.fairness_threshold
        
        # Generate interpretation and recommendations
        interpretation = self._interpret_demographic_parity(group_scores, overall_score)
        recommendations = self._recommend_demographic_parity(group_scores, bias_detected)
        
        return BiasResult(
            metric=BiasMetric.DEMOGRAPHIC_PARITY,
            groups=group_info,
            scores=group_scores,
            overall_score=overall_score,
            bias_detected=bias_detected,
            threshold=self.fairness_threshold,
            interpretation=interpretation,
            recommendations=recommendations
        )
    
    def _equalized_odds(
        self,
        predictions: np.ndarray,
        targets: np.ndarray,
        protected_attributes: Dict[str, np.ndarray]
    ) -> BiasResult:
        """Compute equalized odds (equal TPR and FPR across groups)."""
        
        binary_predictions = (predictions > 0.5).astype(int)
        
        group_scores = {}
        group_info = {}
        
        for attr_name, attr_values in protected_attributes.items():
            unique_values = np.unique(attr_values)
            
            for value in unique_values:
                group_mask = attr_values == value
                group_size = np.sum(group_mask)
                
                if group_size < self.min_group_size:
                    continue
                
                group_name = f"{attr_name}_{value}"
                
                # Calculate TPR and FPR for this group
                group_targets = targets[group_mask]
                group_preds = binary_predictions[group_mask]
                
                # True Positive Rate
                positive_mask = group_targets == 1
                if np.sum(positive_mask) > 0:
                    tpr = np.mean(group_preds[positive_mask])
                else:
                    tpr = 0.0
                
                # False Positive Rate
                negative_mask = group_targets == 0
                if np.sum(negative_mask) > 0:
                    fpr = np.mean(group_preds[negative_mask])
                else:
                    fpr = 0.0
                
                # Combined score (could be improved)
                group_scores[group_name] = (tpr + (1 - fpr)) / 2
                group_info[group_name] = str(value)
        
        # Calculate overall bias
        if len(group_scores) < 2:
            overall_score = 0.0
            bias_detected = False
        else:
            score_values = list(group_scores.values())
            overall_score = max(score_values) - min(score_values)
            bias_detected = overall_score > self.fairness_threshold
        
        interpretation = f"Equalized odds difference: {overall_score:.3f}"
        recommendations = ["Consider rebalancing training data", "Apply fairness constraints during training"]
        
        return BiasResult(
            metric=BiasMetric.EQUALIZED_ODDS,
            groups=group_info,
            scores=group_scores,
            overall_score=overall_score,
            bias_detected=bias_detected,
            threshold=self.fairness_threshold,
            interpretation=interpretation,
            recommendations=recommendations
        )
    
    def _equality_of_opportunity(
        self,
        predictions: np.ndarray,
        targets: np.ndarray,
        protected_attributes: Dict[str, np.ndarray]
    ) -> BiasResult:
        """Compute equality of opportunity (equal TPR across groups)."""
        
        binary_predictions = (predictions > 0.5).astype(int)
        
        group_scores = {}
        group_info = {}
        
        for attr_name, attr_values in protected_attributes.items():
            unique_values = np.unique(attr_values)
            
            for value in unique_values:
                group_mask = attr_values == value
                group_size = np.sum(group_mask)
                
                if group_size < self.min_group_size:
                    continue
                
                group_name = f"{attr_name}_{value}"
                
                # Calculate TPR for this group
                group_targets = targets[group_mask]
                group_preds = binary_predictions[group_mask]
                
                positive_mask = group_targets == 1
                if np.sum(positive_mask) > 0:
                    tpr = np.mean(group_preds[positive_mask])
                    group_scores[group_name] = tpr
                    group_info[group_name] = str(value)
        
        # Calculate overall bias
        if len(group_scores) < 2:
            overall_score = 0.0
            bias_detected = False
        else:
            score_values = list(group_scores.values())
            overall_score = max(score_values) - min(score_values)
            bias_detected = overall_score > self.fairness_threshold
        
        interpretation = f"True positive rate difference: {overall_score:.3f}"
        recommendations = ["Focus on improving recall for underperforming groups"]
        
        return BiasResult(
            metric=BiasMetric.EQUALITY_OF_OPPORTUNITY,
            groups=group_info,
            scores=group_scores,
            overall_score=overall_score,
            bias_detected=bias_detected,
            threshold=self.fairness_threshold,
            interpretation=interpretation,
            recommendations=recommendations
        )
    
    def _calibration_bias(
        self,
        predictions: np.ndarray,
        targets: np.ndarray,
        protected_attributes: Dict[str, np.ndarray]
    ) -> BiasResult:
        """Compute calibration bias across groups."""
        
        group_scores = {}
        group_info = {}
        
        for attr_name, attr_values in protected_attributes.items():
            unique_values = np.unique(attr_values)
            
            for value in unique_values:
                group_mask = attr_values == value
                group_size = np.sum(group_mask)
                
                if group_size < self.min_group_size:
                    continue
                
                group_name = f"{attr_name}_{value}"
                
                # Calculate calibration for this group
                group_preds = predictions[group_mask]
                group_targets = targets[group_mask]
                
                # Bin predictions and calculate calibration error
                calibration_error = self._calculate_calibration_error(group_preds, group_targets)
                
                group_scores[group_name] = calibration_error
                group_info[group_name] = str(value)
        
        # Calculate overall bias
        if len(group_scores) < 2:
            overall_score = 0.0
            bias_detected = False
        else:
            score_values = list(group_scores.values())
            overall_score = max(score_values) - min(score_values)
            bias_detected = overall_score > self.fairness_threshold
        
        interpretation = f"Calibration error difference: {overall_score:.3f}"
        recommendations = ["Apply calibration techniques", "Use group-specific calibration"]
        
        return BiasResult(
            metric=BiasMetric.CALIBRATION,
            groups=group_info,
            scores=group_scores,
            overall_score=overall_score,
            bias_detected=bias_detected,
            threshold=self.fairness_threshold,
            interpretation=interpretation,
            recommendations=recommendations
        )
    
    def _individual_fairness(
        self,
        predictions: np.ndarray,
        targets: np.ndarray,
        protected_attributes: Dict[str, np.ndarray]
    ) -> BiasResult:
        """Compute individual fairness (similar individuals get similar predictions)."""
        
        # This is a simplified version - in practice, you'd need similarity metrics
        # For now, we'll use variance within groups as a proxy
        
        group_scores = {}
        group_info = {}
        
        for attr_name, attr_values in protected_attributes.items():
            unique_values = np.unique(attr_values)
            
            for value in unique_values:
                group_mask = attr_values == value
                group_size = np.sum(group_mask)
                
                if group_size < self.min_group_size:
                    continue
                
                group_name = f"{attr_name}_{value}"
                
                # Calculate prediction variance within group
                group_preds = predictions[group_mask]
                prediction_variance = np.var(group_preds)
                
                group_scores[group_name] = prediction_variance
                group_info[group_name] = str(value)
        
        # Calculate overall score (average variance)
        if len(group_scores) == 0:
            overall_score = 0.0
            bias_detected = False
        else:
            overall_score = np.mean(list(group_scores.values()))
            bias_detected = overall_score > 0.1  # Threshold for variance
        
        interpretation = f"Average prediction variance: {overall_score:.3f}"
        recommendations = ["Ensure consistent feature representation", "Apply individual fairness constraints"]
        
        return BiasResult(
            metric=BiasMetric.INDIVIDUAL_FAIRNESS,
            groups=group_info,
            scores=group_scores,
            overall_score=overall_score,
            bias_detected=bias_detected,
            threshold=0.1,
            interpretation=interpretation,
            recommendations=recommendations
        )
    
    def _calculate_calibration_error(
        self,
        predictions: np.ndarray,
        targets: np.ndarray,
        num_bins: int = 10
    ) -> float:
        """Calculate expected calibration error."""
        
        bin_boundaries = np.linspace(0, 1, num_bins + 1)
        bin_lowers = bin_boundaries[:-1]
        bin_uppers = bin_boundaries[1:]
        
        ece = 0
        for bin_lower, bin_upper in zip(bin_lowers, bin_uppers):
            in_bin = (predictions > bin_lower) & (predictions <= bin_upper)
            prop_in_bin = in_bin.mean()
            
            if prop_in_bin > 0:
                accuracy_in_bin = targets[in_bin].mean()
                avg_confidence_in_bin = predictions[in_bin].mean()
                ece += prop_in_bin * abs(avg_confidence_in_bin - accuracy_in_bin)
        
        return ece
    
    def _interpret_demographic_parity(
        self,
        group_scores: Dict[str, float],
        overall_score: float
    ) -> str:
        """Generate interpretation for demographic parity results."""
        
        if len(group_scores) < 2:
            return "Insufficient groups for demographic parity analysis"
        
        max_group = max(group_scores.items(), key=lambda x: x[1])
        min_group = min(group_scores.items(), key=lambda x: x[1])
        
        return (
            f"Positive prediction rate varies from {min_group[1]:.3f} ({min_group[0]}) "
            f"to {max_group[1]:.3f} ({max_group[0]}). "
            f"Difference: {overall_score:.3f}"
        )
    
    def _recommend_demographic_parity(
        self,
        group_scores: Dict[str, float],
        bias_detected: bool
    ) -> List[str]:
        """Generate recommendations for demographic parity bias."""
        
        recommendations = []
        
        if bias_detected:
            recommendations.extend([
                "Consider rebalancing training data across groups",
                "Apply fairness constraints during model training",
                "Use post-processing techniques to equalize positive rates",
                "Collect more data for underrepresented groups"
            ])
        else:
            recommendations.append("Demographic parity appears satisfactory")
        
        return recommendations
    
    def generate_bias_report(
        self,
        bias_results: List[BiasResult]
    ) -> Dict[str, Any]:
        """Generate a comprehensive bias detection report."""
        
        report = {
            "summary": {
                "total_metrics_evaluated": len(bias_results),
                "bias_detected_count": sum(1 for r in bias_results if r.bias_detected),
                "overall_bias_detected": any(r.bias_detected for r in bias_results)
            },
            "metrics": [],
            "recommendations": set(),
            "risk_level": "low"
        }
        
        high_bias_count = 0
        
        for result in bias_results:
            metric_info = {
                "metric": result.metric.value,
                "bias_detected": result.bias_detected,
                "overall_score": result.overall_score,
                "threshold": result.threshold,
                "interpretation": result.interpretation,
                "groups": result.groups,
                "scores": result.scores
            }
            
            report["metrics"].append(metric_info)
            report["recommendations"].update(result.recommendations)
            
            # Determine risk level
            if result.bias_detected and result.overall_score > result.threshold * 2:
                high_bias_count += 1
        
        # Convert recommendations set to list
        report["recommendations"] = list(report["recommendations"])
        
        # Determine overall risk level
        if high_bias_count >= 2:
            report["risk_level"] = "high"
        elif report["summary"]["bias_detected_count"] > 0:
            report["risk_level"] = "medium"
        else:
            report["risk_level"] = "low"
        
        return report