"""Model evaluation metrics and validation."""

import torch
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from sklearn.metrics import (
    roc_auc_score, accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

from app.models.dkt_model import DKTModel
from app.core.logging import get_logger

logger = get_logger(__name__)


class ModelEvaluator:
    """Comprehensive model evaluation and validation."""
    
    def __init__(self, model: DKTModel, device: str = None):
        self.model = model
        self.device = torch.device(device if device else "cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.model.eval()
    
    def evaluate_comprehensive(
        self,
        data_loader,
        save_results: bool = True,
        output_dir: str = "./evaluation_results"
    ) -> Dict[str, float]:
        """Perform comprehensive model evaluation."""
        
        logger.info("Starting comprehensive evaluation")
        
        # Collect predictions and targets
        all_predictions = []
        all_targets = []
        all_topic_predictions = []
        all_topic_targets = []
        user_level_metrics = {}
        
        with torch.no_grad():
            for batch_idx, batch in enumerate(data_loader):
                # Move to device
                item_ids = batch['item_ids'].to(self.device)
                topic_ids = batch['topic_ids'].to(self.device)
                responses = batch['responses'].to(self.device)
                targets = batch['targets'].to(self.device)
                lengths = batch['length'].to(self.device)
                user_ids = batch['user_id']
                
                # Forward pass
                next_correct_prob, topic_mastery = self.model(
                    item_ids, topic_ids, responses, lengths
                )
                
                # Create mask for valid positions
                mask = self._create_mask(lengths, item_ids.size(1))
                
                # Collect predictions
                valid_predictions = next_correct_prob.squeeze(-1)[mask.bool()]
                valid_targets = targets[mask.bool()]
                
                all_predictions.extend(valid_predictions.cpu().numpy())
                all_targets.extend(valid_targets.cpu().numpy())
                
                # Collect topic mastery predictions (simplified)
                if topic_mastery is not None:
                    valid_topic_preds = topic_mastery[mask.bool()]
                    # Generate pseudo targets for topics
                    topic_targets = self._generate_topic_targets(
                        topic_ids, responses, lengths, mask
                    )
                    
                    all_topic_predictions.extend(valid_topic_preds.cpu().numpy())
                    all_topic_targets.extend(topic_targets.cpu().numpy())
                
                # User-level metrics
                for i, user_id in enumerate(user_ids):
                    user_mask = mask[i].bool()
                    if user_mask.sum() > 0:
                        user_preds = next_correct_prob[i].squeeze(-1)[user_mask].cpu().numpy()
                        user_targets = targets[i][user_mask].cpu().numpy()
                        
                        if user_id not in user_level_metrics:
                            user_level_metrics[user_id] = {
                                'predictions': [],
                                'targets': []
                            }
                        
                        user_level_metrics[user_id]['predictions'].extend(user_preds)
                        user_level_metrics[user_id]['targets'].extend(user_targets)
        
        # Calculate overall metrics
        overall_metrics = self._calculate_metrics(all_predictions, all_targets)
        
        # Calculate topic-level metrics
        topic_metrics = {}
        if all_topic_predictions:
            topic_metrics = self._calculate_topic_metrics(
                all_topic_predictions, all_topic_targets
            )
        
        # Calculate user-level metrics
        user_metrics = self._calculate_user_metrics(user_level_metrics)
        
        # Combine all metrics
        evaluation_results = {
            **overall_metrics,
            'topic_metrics': topic_metrics,
            'user_metrics': user_metrics,
            'num_predictions': len(all_predictions),
            'num_users': len(user_level_metrics)
        }
        
        # Save results if requested
        if save_results:
            self._save_evaluation_results(
                evaluation_results,
                all_predictions,
                all_targets,
                output_dir
            )
        
        logger.info("Evaluation completed", **{k: v for k, v in overall_metrics.items() if isinstance(v, (int, float))})
        
        return evaluation_results
    
    def evaluate_prediction_calibration(
        self,
        data_loader,
        num_bins: int = 10
    ) -> Dict[str, float]:
        """Evaluate prediction calibration."""
        
        all_predictions = []
        all_targets = []
        
        with torch.no_grad():
            for batch in data_loader:
                item_ids = batch['item_ids'].to(self.device)
                topic_ids = batch['topic_ids'].to(self.device)
                responses = batch['responses'].to(self.device)
                targets = batch['targets'].to(self.device)
                lengths = batch['length'].to(self.device)
                
                next_correct_prob, _ = self.model(
                    item_ids, topic_ids, responses, lengths
                )
                
                mask = self._create_mask(lengths, item_ids.size(1))
                
                valid_predictions = next_correct_prob.squeeze(-1)[mask.bool()]
                valid_targets = targets[mask.bool()]
                
                all_predictions.extend(valid_predictions.cpu().numpy())
                all_targets.extend(valid_targets.cpu().numpy())
        
        # Calculate calibration metrics
        predictions = np.array(all_predictions)
        targets = np.array(all_targets)
        
        # Bin predictions
        bin_boundaries = np.linspace(0, 1, num_bins + 1)
        bin_lowers = bin_boundaries[:-1]
        bin_uppers = bin_boundaries[1:]
        
        ece = 0  # Expected Calibration Error
        mce = 0  # Maximum Calibration Error
        
        for bin_lower, bin_upper in zip(bin_lowers, bin_uppers):
            in_bin = (predictions > bin_lower) & (predictions <= bin_upper)
            prop_in_bin = in_bin.mean()
            
            if prop_in_bin > 0:
                accuracy_in_bin = targets[in_bin].mean()
                avg_confidence_in_bin = predictions[in_bin].mean()
                
                calibration_error = abs(avg_confidence_in_bin - accuracy_in_bin)
                ece += prop_in_bin * calibration_error
                mce = max(mce, calibration_error)
        
        return {
            'expected_calibration_error': ece,
            'maximum_calibration_error': mce,
            'num_predictions': len(predictions)
        }
    
    def evaluate_fairness(
        self,
        data_loader,
        user_demographics: Dict[str, Dict] = None
    ) -> Dict[str, float]:
        """Evaluate model fairness across different user groups."""
        
        if user_demographics is None:
            logger.warning("No demographic data provided for fairness evaluation")
            return {}
        
        group_metrics = {}
        
        with torch.no_grad():
            for batch in data_loader:
                item_ids = batch['item_ids'].to(self.device)
                topic_ids = batch['topic_ids'].to(self.device)
                responses = batch['responses'].to(self.device)
                targets = batch['targets'].to(self.device)
                lengths = batch['length'].to(self.device)
                user_ids = batch['user_id']
                
                next_correct_prob, _ = self.model(
                    item_ids, topic_ids, responses, lengths
                )
                
                mask = self._create_mask(lengths, item_ids.size(1))
                
                # Group by demographics
                for i, user_id in enumerate(user_ids):
                    if user_id in user_demographics:
                        user_demo = user_demographics[user_id]
                        
                        for demo_key, demo_value in user_demo.items():
                            group_key = f"{demo_key}_{demo_value}"
                            
                            if group_key not in group_metrics:
                                group_metrics[group_key] = {
                                    'predictions': [],
                                    'targets': []
                                }
                            
                            user_mask = mask[i].bool()
                            if user_mask.sum() > 0:
                                user_preds = next_correct_prob[i].squeeze(-1)[user_mask].cpu().numpy()
                                user_targets = targets[i][user_mask].cpu().numpy()
                                
                                group_metrics[group_key]['predictions'].extend(user_preds)
                                group_metrics[group_key]['targets'].extend(user_targets)
        
        # Calculate metrics for each group
        fairness_results = {}
        group_aucs = {}
        
        for group_key, group_data in group_metrics.items():
            if len(group_data['predictions']) > 10:  # Minimum samples for reliable metrics
                group_auc = roc_auc_score(group_data['targets'], group_data['predictions'])
                group_aucs[group_key] = group_auc
                
                fairness_results[f"{group_key}_auc"] = group_auc
                fairness_results[f"{group_key}_count"] = len(group_data['predictions'])
        
        # Calculate fairness metrics
        if len(group_aucs) > 1:
            auc_values = list(group_aucs.values())
            fairness_results['auc_std'] = np.std(auc_values)
            fairness_results['auc_range'] = max(auc_values) - min(auc_values)
            fairness_results['demographic_parity'] = fairness_results['auc_range']
        
        return fairness_results
    
    def _calculate_metrics(self, predictions: List[float], targets: List[float]) -> Dict[str, float]:
        """Calculate comprehensive prediction metrics."""
        
        predictions = np.array(predictions)
        targets = np.array(targets)
        
        # Binary predictions for classification metrics
        binary_predictions = (predictions > 0.5).astype(int)
        
        metrics = {
            'auc': roc_auc_score(targets, predictions),
            'accuracy': accuracy_score(targets, binary_predictions),
            'precision': precision_score(targets, binary_predictions, zero_division=0),
            'recall': recall_score(targets, binary_predictions, zero_division=0),
            'f1_score': f1_score(targets, binary_predictions, zero_division=0),
            'log_loss': -np.mean(targets * np.log(predictions + 1e-15) + 
                               (1 - targets) * np.log(1 - predictions + 1e-15)),
            'mean_prediction': np.mean(predictions),
            'mean_target': np.mean(targets),
            'prediction_std': np.std(predictions),
            'target_std': np.std(targets)
        }
        
        return metrics
    
    def _calculate_topic_metrics(
        self,
        topic_predictions: List[np.ndarray],
        topic_targets: List[np.ndarray]
    ) -> Dict[str, float]:
        """Calculate topic-level mastery metrics."""
        
        topic_predictions = np.array(topic_predictions)
        topic_targets = np.array(topic_targets)
        
        # Average across all topics
        topic_mse = np.mean((topic_predictions - topic_targets) ** 2)
        topic_mae = np.mean(np.abs(topic_predictions - topic_targets))
        
        return {
            'topic_mse': topic_mse,
            'topic_mae': topic_mae,
            'topic_correlation': np.corrcoef(
                topic_predictions.flatten(),
                topic_targets.flatten()
            )[0, 1] if topic_predictions.size > 0 else 0.0
        }
    
    def _calculate_user_metrics(self, user_level_metrics: Dict) -> Dict[str, float]:
        """Calculate user-level aggregated metrics."""
        
        user_aucs = []
        user_accuracies = []
        
        for user_id, user_data in user_level_metrics.items():
            if len(user_data['predictions']) > 5:  # Minimum predictions per user
                try:
                    user_auc = roc_auc_score(user_data['targets'], user_data['predictions'])
                    user_aucs.append(user_auc)
                except:
                    pass  # Skip if AUC can't be calculated
                
                binary_preds = (np.array(user_data['predictions']) > 0.5).astype(int)
                user_acc = accuracy_score(user_data['targets'], binary_preds)
                user_accuracies.append(user_acc)
        
        return {
            'mean_user_auc': np.mean(user_aucs) if user_aucs else 0.0,
            'std_user_auc': np.std(user_aucs) if user_aucs else 0.0,
            'mean_user_accuracy': np.mean(user_accuracies) if user_accuracies else 0.0,
            'std_user_accuracy': np.std(user_accuracies) if user_accuracies else 0.0,
            'users_with_sufficient_data': len(user_aucs)
        }
    
    def _create_mask(self, lengths: torch.Tensor, max_len: int) -> torch.Tensor:
        """Create padding mask from sequence lengths."""
        batch_size = lengths.size(0)
        mask = torch.arange(max_len, device=lengths.device).expand(
            batch_size, max_len
        ) < lengths.unsqueeze(1)
        return mask.float()
    
    def _generate_topic_targets(
        self,
        topic_ids: torch.Tensor,
        responses: torch.Tensor,
        lengths: torch.Tensor,
        mask: torch.Tensor
    ) -> torch.Tensor:
        """Generate pseudo ground truth for topic mastery evaluation."""
        
        batch_size, seq_len = topic_ids.shape
        num_topics = self.model.num_topics
        
        topic_targets = torch.zeros(batch_size, seq_len, num_topics, device=topic_ids.device)
        
        for b in range(batch_size):
            length = lengths[b].item()
            for t in range(length):
                for topic_id in range(1, num_topics + 1):
                    topic_mask = (topic_ids[b, :t+1] == topic_id)
                    if topic_mask.sum() > 0:
                        recent_performance = responses[b, :t+1][topic_mask].float().mean()
                        topic_targets[b, t, topic_id-1] = recent_performance
                    else:
                        topic_targets[b, t, topic_id-1] = 0.5
        
        # Apply mask and return valid targets
        valid_targets = topic_targets[mask.bool()]
        return valid_targets
    
    def _save_evaluation_results(
        self,
        results: Dict,
        predictions: List[float],
        targets: List[float],
        output_dir: str
    ) -> None:
        """Save evaluation results to files."""
        
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        # Save metrics to JSON
        import json
        metrics_file = os.path.join(output_dir, 'evaluation_metrics.json')
        
        # Convert numpy types to native Python types for JSON serialization
        serializable_results = {}
        for key, value in results.items():
            if isinstance(value, dict):
                serializable_results[key] = {k: float(v) if isinstance(v, (np.floating, np.integer)) else v 
                                           for k, v in value.items()}
            elif isinstance(value, (np.floating, np.integer)):
                serializable_results[key] = float(value)
            else:
                serializable_results[key] = value
        
        with open(metrics_file, 'w') as f:
            json.dump(serializable_results, f, indent=2)
        
        # Save predictions and targets
        predictions_df = pd.DataFrame({
            'predictions': predictions,
            'targets': targets,
            'timestamp': datetime.now()
        })
        predictions_file = os.path.join(output_dir, 'predictions.csv')
        predictions_df.to_csv(predictions_file, index=False)
        
        logger.info("Evaluation results saved", output_dir=output_dir)