"""Training pipeline for DKT model."""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import time
from datetime import datetime
import os
from pathlib import Path
import mlflow
import mlflow.pytorch

from app.models.dkt_model import DKTModel
from app.training.dataset import create_data_loaders, generate_synthetic_data
from app.core.logging import get_logger
from app.config import settings

logger = get_logger(__name__)


class DKTTrainer:
    """Trainer for Deep Knowledge Tracing model."""
    
    def __init__(
        self,
        model: DKTModel,
        train_loader: DataLoader,
        val_loader: DataLoader,
        test_loader: Optional[DataLoader] = None,
        learning_rate: float = 0.001,
        weight_decay: float = 1e-5,
        device: str = None
    ):
        self.model = model
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.test_loader = test_loader
        
        # Setup device
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
        
        self.model.to(self.device)
        
        # Setup optimizer and loss
        self.optimizer = optim.AdamW(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay
        )
        
        self.criterion = nn.BCELoss(reduction='none')  # Binary cross-entropy
        self.topic_criterion = nn.BCELoss(reduction='none')  # For topic mastery
        
        # Training state
        self.current_epoch = 0
        self.best_val_auc = 0.0
        self.train_losses = []
        self.val_losses = []
        self.val_aucs = []
        
        # Checkpointing
        self.checkpoint_dir = Path("./checkpoints")
        self.checkpoint_dir.mkdir(exist_ok=True)
    
    def train_epoch(self) -> Dict[str, float]:
        """Train for one epoch."""
        self.model.train()
        
        total_loss = 0.0
        total_prediction_loss = 0.0
        total_mastery_loss = 0.0
        num_batches = 0
        num_samples = 0
        
        for batch_idx, batch in enumerate(self.train_loader):
            # Move batch to device
            item_ids = batch['item_ids'].to(self.device)
            topic_ids = batch['topic_ids'].to(self.device)
            responses = batch['responses'].to(self.device)
            targets = batch['targets'].to(self.device)
            lengths = batch['length'].to(self.device)
            
            batch_size = item_ids.size(0)
            
            # Forward pass
            self.optimizer.zero_grad()
            
            next_correct_prob, topic_mastery = self.model(
                item_ids, topic_ids, responses, lengths
            )
            
            # Create mask for valid positions
            mask = self._create_mask(lengths, item_ids.size(1))
            
            # Calculate prediction loss
            prediction_loss = self.criterion(
                next_correct_prob.squeeze(-1), targets
            )
            prediction_loss = (prediction_loss * mask).sum() / mask.sum()
            
            # Calculate topic mastery loss (simplified)
            # In practice, you'd need ground truth topic mastery labels
            mastery_targets = self._generate_mastery_targets(
                topic_ids, responses, lengths
            )
            mastery_loss = self.topic_criterion(topic_mastery, mastery_targets)
            mastery_loss = (mastery_loss * mask.unsqueeze(-1)).sum() / (mask.sum() * topic_mastery.size(-1))
            
            # Combined loss
            total_batch_loss = prediction_loss + 0.1 * mastery_loss
            
            # Backward pass
            total_batch_loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            
            self.optimizer.step()
            
            # Update metrics
            total_loss += total_batch_loss.item()
            total_prediction_loss += prediction_loss.item()
            total_mastery_loss += mastery_loss.item()
            num_batches += 1
            num_samples += batch_size
            
            # Log progress
            if batch_idx % 100 == 0:
                logger.info(
                    "Training progress",
                    epoch=self.current_epoch,
                    batch=batch_idx,
                    total_batches=len(self.train_loader),
                    loss=total_batch_loss.item(),
                    prediction_loss=prediction_loss.item(),
                    mastery_loss=mastery_loss.item()
                )
        
        return {
            'total_loss': total_loss / num_batches,
            'prediction_loss': total_prediction_loss / num_batches,
            'mastery_loss': total_mastery_loss / num_batches,
            'num_samples': num_samples
        }
    
    def validate(self) -> Dict[str, float]:
        """Validate the model."""
        self.model.eval()
        
        total_loss = 0.0
        all_predictions = []
        all_targets = []
        num_batches = 0
        
        with torch.no_grad():
            for batch in self.val_loader:
                # Move batch to device
                item_ids = batch['item_ids'].to(self.device)
                topic_ids = batch['topic_ids'].to(self.device)
                responses = batch['responses'].to(self.device)
                targets = batch['targets'].to(self.device)
                lengths = batch['length'].to(self.device)
                
                # Forward pass
                next_correct_prob, topic_mastery = self.model(
                    item_ids, topic_ids, responses, lengths
                )
                
                # Create mask for valid positions
                mask = self._create_mask(lengths, item_ids.size(1))
                
                # Calculate loss
                prediction_loss = self.criterion(
                    next_correct_prob.squeeze(-1), targets
                )
                prediction_loss = (prediction_loss * mask).sum() / mask.sum()
                
                total_loss += prediction_loss.item()
                num_batches += 1
                
                # Collect predictions and targets for AUC calculation
                valid_predictions = next_correct_prob.squeeze(-1)[mask.bool()]
                valid_targets = targets[mask.bool()]
                
                all_predictions.extend(valid_predictions.cpu().numpy())
                all_targets.extend(valid_targets.cpu().numpy())
        
        # Calculate AUC
        auc = self._calculate_auc(all_predictions, all_targets)
        
        return {
            'val_loss': total_loss / num_batches,
            'val_auc': auc,
            'num_predictions': len(all_predictions)
        }
    
    def train(
        self,
        num_epochs: int,
        save_best: bool = True,
        early_stopping_patience: int = 10,
        log_interval: int = 1
    ) -> Dict[str, List[float]]:
        """Train the model for multiple epochs."""
        
        logger.info(
            "Starting training",
            num_epochs=num_epochs,
            device=str(self.device),
            model_params=sum(p.numel() for p in self.model.parameters())
        )
        
        best_val_auc = 0.0
        patience_counter = 0
        
        # Start MLflow run
        with mlflow.start_run():
            # Log hyperparameters
            mlflow.log_params({
                'num_epochs': num_epochs,
                'learning_rate': self.optimizer.param_groups[0]['lr'],
                'batch_size': self.train_loader.batch_size,
                'model_architecture': self.model.architecture,
                'hidden_size': self.model.hidden_size,
                'num_layers': self.model.num_layers,
                'num_items': self.model.num_items,
                'num_topics': self.model.num_topics
            })
            
            for epoch in range(num_epochs):
                self.current_epoch = epoch
                epoch_start_time = time.time()
                
                # Training
                train_metrics = self.train_epoch()
                
                # Validation
                val_metrics = self.validate()
                
                epoch_time = time.time() - epoch_start_time
                
                # Update tracking
                self.train_losses.append(train_metrics['total_loss'])
                self.val_losses.append(val_metrics['val_loss'])
                self.val_aucs.append(val_metrics['val_auc'])
                
                # Log metrics
                if epoch % log_interval == 0:
                    logger.info(
                        "Epoch completed",
                        epoch=epoch,
                        train_loss=train_metrics['total_loss'],
                        val_loss=val_metrics['val_loss'],
                        val_auc=val_metrics['val_auc'],
                        epoch_time=epoch_time,
                        samples_per_sec=train_metrics['num_samples'] / epoch_time
                    )
                
                # MLflow logging
                mlflow.log_metrics({
                    'train_loss': train_metrics['total_loss'],
                    'train_prediction_loss': train_metrics['prediction_loss'],
                    'train_mastery_loss': train_metrics['mastery_loss'],
                    'val_loss': val_metrics['val_loss'],
                    'val_auc': val_metrics['val_auc'],
                    'epoch_time': epoch_time
                }, step=epoch)
                
                # Save best model
                if val_metrics['val_auc'] > best_val_auc:
                    best_val_auc = val_metrics['val_auc']
                    patience_counter = 0
                    
                    if save_best:
                        self.save_checkpoint(f'best_model_epoch_{epoch}.pt', is_best=True)
                        
                        # Log model to MLflow
                        mlflow.pytorch.log_model(
                            self.model,
                            "model",
                            registered_model_name="dkt_model"
                        )
                else:
                    patience_counter += 1
                
                # Early stopping
                if patience_counter >= early_stopping_patience:
                    logger.info(
                        "Early stopping triggered",
                        epoch=epoch,
                        patience=early_stopping_patience,
                        best_val_auc=best_val_auc
                    )
                    break
                
                # Save regular checkpoint
                if epoch % 10 == 0:
                    self.save_checkpoint(f'checkpoint_epoch_{epoch}.pt')
            
            # Final evaluation
            if self.test_loader:
                test_metrics = self.evaluate(self.test_loader)
                logger.info("Test evaluation", **test_metrics)
                mlflow.log_metrics({f'test_{k}': v for k, v in test_metrics.items()})
        
        return {
            'train_losses': self.train_losses,
            'val_losses': self.val_losses,
            'val_aucs': self.val_aucs
        }
    
    def evaluate(self, data_loader: DataLoader) -> Dict[str, float]:
        """Evaluate model on a dataset."""
        self.model.eval()
        
        total_loss = 0.0
        all_predictions = []
        all_targets = []
        num_batches = 0
        
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
                
                prediction_loss = self.criterion(
                    next_correct_prob.squeeze(-1), targets
                )
                prediction_loss = (prediction_loss * mask).sum() / mask.sum()
                
                total_loss += prediction_loss.item()
                num_batches += 1
                
                valid_predictions = next_correct_prob.squeeze(-1)[mask.bool()]
                valid_targets = targets[mask.bool()]
                
                all_predictions.extend(valid_predictions.cpu().numpy())
                all_targets.extend(valid_targets.cpu().numpy())
        
        auc = self._calculate_auc(all_predictions, all_targets)
        accuracy = self._calculate_accuracy(all_predictions, all_targets)
        
        return {
            'loss': total_loss / num_batches,
            'auc': auc,
            'accuracy': accuracy,
            'num_predictions': len(all_predictions)
        }
    
    def save_checkpoint(self, filename: str, is_best: bool = False) -> None:
        """Save model checkpoint."""
        checkpoint = {
            'epoch': self.current_epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'best_val_auc': self.best_val_auc,
            'train_losses': self.train_losses,
            'val_losses': self.val_losses,
            'val_aucs': self.val_aucs,
            'model_config': {
                'num_items': self.model.num_items,
                'num_topics': self.model.num_topics,
                'hidden_size': self.model.hidden_size,
                'num_layers': self.model.num_layers,
                'architecture': self.model.architecture
            }
        }
        
        filepath = self.checkpoint_dir / filename
        torch.save(checkpoint, filepath)
        
        if is_best:
            best_path = self.checkpoint_dir / 'best_model.pt'
            torch.save(checkpoint, best_path)
        
        logger.info("Checkpoint saved", path=str(filepath), is_best=is_best)
    
    def load_checkpoint(self, filepath: str) -> None:
        """Load model checkpoint."""
        checkpoint = torch.load(filepath, map_location=self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.current_epoch = checkpoint['epoch']
        self.best_val_auc = checkpoint['best_val_auc']
        self.train_losses = checkpoint.get('train_losses', [])
        self.val_losses = checkpoint.get('val_losses', [])
        self.val_aucs = checkpoint.get('val_aucs', [])
        
        logger.info("Checkpoint loaded", path=filepath, epoch=self.current_epoch)
    
    def _create_mask(self, lengths: torch.Tensor, max_len: int) -> torch.Tensor:
        """Create padding mask from sequence lengths."""
        batch_size = lengths.size(0)
        mask = torch.arange(max_len, device=lengths.device).expand(
            batch_size, max_len
        ) < lengths.unsqueeze(1)
        return mask.float()
    
    def _generate_mastery_targets(
        self,
        topic_ids: torch.Tensor,
        responses: torch.Tensor,
        lengths: torch.Tensor
    ) -> torch.Tensor:
        """Generate pseudo ground truth for topic mastery."""
        batch_size, seq_len = topic_ids.shape
        num_topics = self.model.num_topics
        
        # Simple heuristic: topic mastery based on recent performance
        mastery_targets = torch.zeros(batch_size, seq_len, num_topics, device=topic_ids.device)
        
        for b in range(batch_size):
            length = lengths[b].item()
            for t in range(length):
                # For each topic, calculate recent performance
                for topic_id in range(1, num_topics + 1):  # Skip 0 (padding)
                    # Find recent attempts for this topic
                    topic_mask = (topic_ids[b, :t+1] == topic_id)
                    if topic_mask.sum() > 0:
                        recent_performance = responses[b, :t+1][topic_mask].float().mean()
                        mastery_targets[b, t, topic_id-1] = recent_performance
                    else:
                        mastery_targets[b, t, topic_id-1] = 0.5  # Default
        
        return mastery_targets
    
    def _calculate_auc(self, predictions: List[float], targets: List[float]) -> float:
        """Calculate AUC score."""
        try:
            from sklearn.metrics import roc_auc_score
            return roc_auc_score(targets, predictions)
        except:
            # Fallback calculation if sklearn not available
            return 0.5
    
    def _calculate_accuracy(self, predictions: List[float], targets: List[float]) -> float:
        """Calculate accuracy score."""
        predictions_binary = [1 if p > 0.5 else 0 for p in predictions]
        correct = sum(1 for p, t in zip(predictions_binary, targets) if p == t)
        return correct / len(targets) if targets else 0.0


def train_dkt_model(
    data_path: str = None,
    num_epochs: int = 50,
    batch_size: int = 32,
    learning_rate: float = 0.001,
    use_synthetic_data: bool = True
) -> DKTTrainer:
    """Train a DKT model with the specified configuration."""
    
    # Load or generate data
    if use_synthetic_data or data_path is None:
        logger.info("Generating synthetic training data")
        df = generate_synthetic_data(
            num_users=2000,
            num_items=1000,
            num_topics=50,
            avg_sequence_length=30
        )
    else:
        logger.info("Loading training data", path=data_path)
        df = pd.read_csv(data_path)
    
    # Split data
    users = df['user_id'].unique()
    np.random.shuffle(users)
    
    train_users = users[:int(0.7 * len(users))]
    val_users = users[int(0.7 * len(users)):int(0.85 * len(users))]
    test_users = users[int(0.85 * len(users)):]
    
    train_df = df[df['user_id'].isin(train_users)]
    val_df = df[df['user_id'].isin(val_users)]
    test_df = df[df['user_id'].isin(test_users)]
    
    # Create data loaders
    train_loader, val_loader, test_loader = create_data_loaders(
        train_df, val_df, test_df, batch_size=batch_size
    )
    
    # Get dataset info for model creation
    num_items = len(train_loader.dataset.item_to_id)
    num_topics = len(train_loader.dataset.topic_to_id)
    
    # Create model
    from app.models.dkt_model import create_dkt_model
    model = create_dkt_model(num_items=num_items, num_topics=num_topics)
    
    # Create trainer
    trainer = DKTTrainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        test_loader=test_loader,
        learning_rate=learning_rate
    )
    
    # Train model
    training_history = trainer.train(num_epochs=num_epochs)
    
    logger.info(
        "Training completed",
        final_train_loss=training_history['train_losses'][-1],
        final_val_loss=training_history['val_losses'][-1],
        best_val_auc=max(training_history['val_aucs'])
    )
    
    return trainer