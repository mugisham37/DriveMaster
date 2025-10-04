"""
Advanced model training utilities for Deep Knowledge Tracing

This module provides comprehensive model training capabilities including
hyperparameter optimization, cross-validation, model comparison, and
automated deployment pipeline.

Requirements: 4.1, 4.2, 4.3
"""

import logging
import json
import os
import tempfile
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from torch.nn.utils.rnn import pad_sequence, pack_padded_sequence, pad_packed_sequence

import mlflow
import mlflow.pytorch
from mlflow.tracking import MlflowClient

import optuna
from optuna.integration import PyTorchLightningPruningCallback
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.metrics import roc_auc_score, log_loss, accuracy_score, f1_score, precision_score, recall_score

import boto3
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """Configuration for DKT model architecture"""
    # Model architecture
    hidden_size: int = 128
    num_layers: int = 2
    dropout: float = 0.2
    embedding_dim: int = 64
    
    # Training parameters
    learning_rate: float = 1e-3
    batch_size: int = 32
    max_epochs: int = 100
    early_stopping_patience: int = 10
    gradient_clip_norm: float = 1.0
    
    # Regularization
    weight_decay: float = 1e-5
    label_smoothing: float = 0.0
    
    # Optimization
    optimizer: str = 'adam'  # adam, adamw, sgd
    scheduler: str = 'cosine'  # cosine, step, plateau
    warmup_epochs: int = 5


@dataclass
class TrainingMetrics:
    """Container for training metrics"""
    epoch: int
    train_loss: float
    val_loss: float
    train_accuracy: float
    val_accuracy: float
    train_auc: float
    val_auc: float
    learning_rate: float
    
    def to_dict(self) -> Dict[str, float]:
        return asdict(self)


class DKTDataset(Dataset):
    """
    Dataset class for Deep Knowledge Tracing
    """
    
    def __init__(
        self,
        sequences: List[Dict[str, Any]],
        max_length: int = 100,
        item_vocab: Dict[str, int] = None,
        create_vocab: bool = True
    ):
        self.sequences = sequences
        self.max_length = max_length
        
        # Create or use existing vocabulary
        if item_vocab is None and create_vocab:
            self.item_vocab = self._create_item_vocabulary()
        else:
            self.item_vocab = item_vocab or {}
        
        self.num_items = len(self.item_vocab)
        
        # Preprocess sequences
        self.processed_sequences = self._preprocess_sequences()
    
    def _create_item_vocabulary(self) -> Dict[str, int]:
        """Create item vocabulary from sequences"""
        all_items = set()
        for seq in self.sequences:
            all_items.update(seq['item_sequence'])
        
        # Reserve 0 for padding, 1 for unknown
        vocab = {'<PAD>': 0, '<UNK>': 1}
        for i, item in enumerate(sorted(all_items), 2):
            vocab[item] = i
        
        logger.info(f"Created item vocabulary with {len(vocab)} items")
        return vocab
    
    def _preprocess_sequences(self) -> List[Dict[str, torch.Tensor]]:
        """Preprocess sequences into tensors"""
        processed = []
        
        for seq in self.sequences:
            # Convert items to indices
            item_seq = [
                self.item_vocab.get(item, self.item_vocab.get('<UNK>', 1))
                for item in seq['item_sequence']
            ]
            
            response_seq = seq['response_sequence']
            
            # Truncate or pad sequences
            seq_len = min(len(item_seq), self.max_length)
            
            # Pad sequences
            items = item_seq[:seq_len] + [0] * (self.max_length - seq_len)
            responses = response_seq[:seq_len] + [0] * (self.max_length - seq_len)
            
            # Create interaction features (item + response)
            interactions = []
            for i, (item, resp) in enumerate(zip(items, responses)):
                if i < seq_len:
                    # Encode interaction as item_id * 2 + response
                    interaction = item * 2 + resp
                else:
                    interaction = 0  # Padding
                interactions.append(interaction)
            
            processed.append({
                'items': torch.tensor(items, dtype=torch.long),
                'responses': torch.tensor(responses, dtype=torch.float),
                'interactions': torch.tensor(interactions, dtype=torch.long),
                'length': seq_len,
                'user_id': seq.get('user_id', ''),
                'sequence_id': seq.get('sequence_id', '')
            })
        
        return processed
    
    def __len__(self) -> int:
        return len(self.processed_sequences)
    
    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        return self.processed_sequences[idx]


class DKTModel(nn.Module):
    """
    Deep Knowledge Tracing model with LSTM/GRU backbone
    """
    
    def __init__(
        self,
        num_items: int,
        config: ModelConfig,
        model_type: str = 'lstm'  # lstm, gru, transformer
    ):
        super().__init__()
        
        self.num_items = num_items
        self.config = config
        self.model_type = model_type
        
        # Interaction embedding (item * 2 for correct/incorrect)
        self.interaction_embedding = nn.Embedding(
            num_items * 2 + 1,  # +1 for padding
            config.embedding_dim,
            padding_idx=0
        )
        
        # Recurrent layers
        if model_type == 'lstm':
            self.rnn = nn.LSTM(
                input_size=config.embedding_dim,
                hidden_size=config.hidden_size,
                num_layers=config.num_layers,
                batch_first=True,
                dropout=config.dropout if config.num_layers > 1 else 0,
                bidirectional=False
            )
        elif model_type == 'gru':
            self.rnn = nn.GRU(
                input_size=config.embedding_dim,
                hidden_size=config.hidden_size,
                num_layers=config.num_layers,
                batch_first=True,
                dropout=config.dropout if config.num_layers > 1 else 0,
                bidirectional=False
            )
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
        
        # Output layers
        self.dropout = nn.Dropout(config.dropout)
        self.output_layer = nn.Linear(config.hidden_size, num_items)
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize model weights"""
        for name, param in self.named_parameters():
            if 'weight' in name:
                if 'rnn' in name:
                    nn.init.orthogonal_(param)
                else:
                    nn.init.xavier_uniform_(param)
            elif 'bias' in name:
                nn.init.constant_(param, 0)
    
    def forward(
        self,
        interactions: torch.Tensor,
        items: torch.Tensor,
        lengths: torch.Tensor
    ) -> torch.Tensor:
        """
        Forward pass
        
        Args:
            interactions: Interaction sequence (batch_size, seq_len)
            items: Item sequence for prediction (batch_size, seq_len)
            lengths: Actual sequence lengths (batch_size,)
            
        Returns:
            Predictions for next items (batch_size, seq_len, num_items)
        """
        batch_size, seq_len = interactions.shape
        
        # Embed interactions
        embedded = self.interaction_embedding(interactions)
        
        # Pack sequences for efficiency
        packed_input = pack_padded_sequence(
            embedded, lengths.cpu(), batch_first=True, enforce_sorted=False
        )
        
        # RNN forward pass
        packed_output, _ = self.rnn(packed_input)
        
        # Unpack sequences
        rnn_output, _ = pad_packed_sequence(packed_output, batch_first=True)
        
        # Apply dropout
        rnn_output = self.dropout(rnn_output)
        
        # Generate predictions for all items
        predictions = self.output_layer(rnn_output)  # (batch_size, seq_len, num_items)
        
        # Apply sigmoid for probability output
        predictions = torch.sigmoid(predictions)
        
        return predictions
    
    def predict_next_item(
        self,
        interactions: torch.Tensor,
        target_items: torch.Tensor,
        lengths: torch.Tensor
    ) -> torch.Tensor:
        """
        Predict probability for specific target items
        
        Args:
            interactions: Interaction history
            target_items: Target items to predict
            lengths: Sequence lengths
            
        Returns:
            Probabilities for target items
        """
        # Get all predictions
        all_predictions = self.forward(interactions, target_items, lengths)
        
        # Extract predictions for target items
        batch_size, seq_len = target_items.shape
        batch_indices = torch.arange(batch_size).unsqueeze(1).expand(-1, seq_len)
        seq_indices = torch.arange(seq_len).unsqueeze(0).expand(batch_size, -1)
        
        # Gather predictions for target items
        target_predictions = all_predictions[batch_indices, seq_indices, target_items]
        
        return target_predictions


class DKTTrainer:
    """
    Trainer class for Deep Knowledge Tracing models
    """
    
    def __init__(
        self,
        model: DKTModel,
        config: ModelConfig,
        device: torch.device = None
    ):
        self.model = model
        self.config = config
        self.device = device or torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Move model to device
        self.model.to(self.device)
        
        # Initialize optimizer
        self.optimizer = self._create_optimizer()
        
        # Initialize scheduler
        self.scheduler = self._create_scheduler()
        
        # Loss function
        self.criterion = nn.BCELoss(reduction='none')
        
        # Training state
        self.best_val_loss = float('inf')
        self.epochs_without_improvement = 0
        self.training_history = []
    
    def _create_optimizer(self) -> torch.optim.Optimizer:
        """Create optimizer"""
        if self.config.optimizer.lower() == 'adam':
            return optim.Adam(
                self.model.parameters(),
                lr=self.config.learning_rate,
                weight_decay=self.config.weight_decay
            )
        elif self.config.optimizer.lower() == 'adamw':
            return optim.AdamW(
                self.model.parameters(),
                lr=self.config.learning_rate,
                weight_decay=self.config.weight_decay
            )
        elif self.config.optimizer.lower() == 'sgd':
            return optim.SGD(
                self.model.parameters(),
                lr=self.config.learning_rate,
                momentum=0.9,
                weight_decay=self.config.weight_decay
            )
        else:
            raise ValueError(f"Unsupported optimizer: {self.config.optimizer}")
    
    def _create_scheduler(self) -> Optional[torch.optim.lr_scheduler._LRScheduler]:
        """Create learning rate scheduler"""
        if self.config.scheduler.lower() == 'cosine':
            return optim.lr_scheduler.CosineAnnealingLR(
                self.optimizer,
                T_max=self.config.max_epochs,
                eta_min=self.config.learning_rate * 0.01
            )
        elif self.config.scheduler.lower() == 'step':
            return optim.lr_scheduler.StepLR(
                self.optimizer,
                step_size=self.config.max_epochs // 3,
                gamma=0.1
            )
        elif self.config.scheduler.lower() == 'plateau':
            return optim.lr_scheduler.ReduceLROnPlateau(
                self.optimizer,
                mode='min',
                factor=0.5,
                patience=5,
                verbose=True
            )
        else:
            return None
    
    def train_epoch(self, train_loader: DataLoader) -> Dict[str, float]:
        """Train for one epoch"""
        self.model.train()
        
        total_loss = 0
        total_correct = 0
        total_predictions = 0
        all_targets = []
        all_predictions = []
        
        for batch in train_loader:
            # Move batch to device
            interactions = batch['interactions'].to(self.device)
            items = batch['items'].to(self.device)
            responses = batch['responses'].to(self.device)
            lengths = batch['length']
            
            # Zero gradients
            self.optimizer.zero_grad()
            
            # Forward pass
            predictions = self.model.predict_next_item(
                interactions[:, :-1],  # Use all but last interaction
                items[:, 1:],          # Predict next items
                lengths - 1            # Adjust lengths
            )
            
            # Prepare targets (shift responses by 1)
            targets = responses[:, 1:].to(self.device)
            
            # Create mask for valid predictions
            batch_size, seq_len = targets.shape
            mask = torch.arange(seq_len).unsqueeze(0).expand(batch_size, -1).to(self.device)
            mask = mask < (lengths - 1).unsqueeze(1)
            
            # Calculate loss only for valid positions
            loss = self.criterion(predictions, targets)
            loss = (loss * mask.float()).sum() / mask.float().sum()
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            if self.config.gradient_clip_norm > 0:
                torch.nn.utils.clip_grad_norm_(
                    self.model.parameters(),
                    self.config.gradient_clip_norm
                )
            
            # Update weights
            self.optimizer.step()
            
            # Accumulate metrics
            total_loss += loss.item()
            
            # Calculate accuracy
            pred_binary = (predictions > 0.5).float()
            correct = ((pred_binary == targets) * mask.float()).sum().item()
            total_correct += correct
            total_predictions += mask.float().sum().item()
            
            # Store for AUC calculation
            valid_preds = predictions[mask].detach().cpu().numpy()
            valid_targets = targets[mask].detach().cpu().numpy()
            
            all_predictions.extend(valid_preds)
            all_targets.extend(valid_targets)
        
        # Calculate metrics
        avg_loss = total_loss / len(train_loader)
        accuracy = total_correct / total_predictions if total_predictions > 0 else 0
        
        try:
            auc = roc_auc_score(all_targets, all_predictions)
        except ValueError:
            auc = 0.5  # Default if all targets are same class
        
        return {
            'loss': avg_loss,
            'accuracy': accuracy,
            'auc': auc
        }
    
    def validate_epoch(self, val_loader: DataLoader) -> Dict[str, float]:
        """Validate for one epoch"""
        self.model.eval()
        
        total_loss = 0
        total_correct = 0
        total_predictions = 0
        all_targets = []
        all_predictions = []
        
        with torch.no_grad():
            for batch in val_loader:
                # Move batch to device
                interactions = batch['interactions'].to(self.device)
                items = batch['items'].to(self.device)
                responses = batch['responses'].to(self.device)
                lengths = batch['length']
                
                # Forward pass
                predictions = self.model.predict_next_item(
                    interactions[:, :-1],
                    items[:, 1:],
                    lengths - 1
                )
                
                # Prepare targets
                targets = responses[:, 1:].to(self.device)
                
                # Create mask
                batch_size, seq_len = targets.shape
                mask = torch.arange(seq_len).unsqueeze(0).expand(batch_size, -1).to(self.device)
                mask = mask < (lengths - 1).unsqueeze(1)
                
                # Calculate loss
                loss = self.criterion(predictions, targets)
                loss = (loss * mask.float()).sum() / mask.float().sum()
                
                # Accumulate metrics
                total_loss += loss.item()
                
                # Calculate accuracy
                pred_binary = (predictions > 0.5).float()
                correct = ((pred_binary == targets) * mask.float()).sum().item()
                total_correct += correct
                total_predictions += mask.float().sum().item()
                
                # Store for AUC calculation
                valid_preds = predictions[mask].detach().cpu().numpy()
                valid_targets = targets[mask].detach().cpu().numpy()
                
                all_predictions.extend(valid_preds)
                all_targets.extend(valid_targets)
        
        # Calculate metrics
        avg_loss = total_loss / len(val_loader)
        accuracy = total_correct / total_predictions if total_predictions > 0 else 0
        
        try:
            auc = roc_auc_score(all_targets, all_predictions)
        except ValueError:
            auc = 0.5
        
        return {
            'loss': avg_loss,
            'accuracy': accuracy,
            'auc': auc
        }
    
    def train(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        mlflow_run_id: str = None
    ) -> List[TrainingMetrics]:
        """
        Full training loop
        
        Args:
            train_loader: Training data loader
            val_loader: Validation data loader
            mlflow_run_id: Optional MLflow run ID for logging
            
        Returns:
            List of training metrics for each epoch
        """
        logger.info(f"Starting training for {self.config.max_epochs} epochs")
        
        for epoch in range(self.config.max_epochs):
            # Training
            train_metrics = self.train_epoch(train_loader)
            
            # Validation
            val_metrics = self.validate_epoch(val_loader)
            
            # Update scheduler
            if self.scheduler:
                if isinstance(self.scheduler, optim.lr_scheduler.ReduceLROnPlateau):
                    self.scheduler.step(val_metrics['loss'])
                else:
                    self.scheduler.step()
            
            # Get current learning rate
            current_lr = self.optimizer.param_groups[0]['lr']
            
            # Create metrics object
            metrics = TrainingMetrics(
                epoch=epoch,
                train_loss=train_metrics['loss'],
                val_loss=val_metrics['loss'],
                train_accuracy=train_metrics['accuracy'],
                val_accuracy=val_metrics['accuracy'],
                train_auc=train_metrics['auc'],
                val_auc=val_metrics['auc'],
                learning_rate=current_lr
            )
            
            self.training_history.append(metrics)
            
            # Log to MLflow if run ID provided
            if mlflow_run_id:
                with mlflow.start_run(run_id=mlflow_run_id):
                    mlflow.log_metrics(metrics.to_dict(), step=epoch)
            
            # Early stopping check
            if val_metrics['loss'] < self.best_val_loss:
                self.best_val_loss = val_metrics['loss']
                self.epochs_without_improvement = 0
                
                # Save best model
                self.save_checkpoint('best_model.pth')
            else:
                self.epochs_without_improvement += 1
            
            # Log progress
            if epoch % 10 == 0 or epoch == self.config.max_epochs - 1:
                logger.info(
                    f"Epoch {epoch}: "
                    f"Train Loss: {train_metrics['loss']:.4f}, "
                    f"Val Loss: {val_metrics['loss']:.4f}, "
                    f"Val AUC: {val_metrics['auc']:.4f}"
                )
            
            # Early stopping
            if self.epochs_without_improvement >= self.config.early_stopping_patience:
                logger.info(f"Early stopping at epoch {epoch}")
                break
        
        logger.info(f"Training completed. Best validation loss: {self.best_val_loss:.4f}")
        return self.training_history
    
    def save_checkpoint(self, filepath: str):
        """Save model checkpoint"""
        checkpoint = {
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'config': asdict(self.config),
            'best_val_loss': self.best_val_loss,
            'training_history': [asdict(m) for m in self.training_history]
        }
        
        torch.save(checkpoint, filepath)
    
    def load_checkpoint(self, filepath: str):
        """Load model checkpoint"""
        checkpoint = torch.load(filepath, map_location=self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.best_val_loss = checkpoint['best_val_loss']
        
        # Restore training history
        self.training_history = [
            TrainingMetrics(**m) for m in checkpoint['training_history']
        ]


class HyperparameterOptimizer:
    """
    Hyperparameter optimization using Optuna
    """
    
    def __init__(
        self,
        train_dataset: DKTDataset,
        val_dataset: DKTDataset,
        n_trials: int = 50,
        device: torch.device = None
    ):
        self.train_dataset = train_dataset
        self.val_dataset = val_dataset
        self.n_trials = n_trials
        self.device = device or torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    def objective(self, trial: optuna.Trial) -> float:
        """
        Objective function for hyperparameter optimization
        
        Args:
            trial: Optuna trial object
            
        Returns:
            Validation loss to minimize
        """
        # Suggest hyperparameters
        config = ModelConfig(
            hidden_size=trial.suggest_categorical('hidden_size', [64, 128, 256, 512]),
            num_layers=trial.suggest_int('num_layers', 1, 3),
            dropout=trial.suggest_float('dropout', 0.1, 0.5),
            embedding_dim=trial.suggest_categorical('embedding_dim', [32, 64, 128]),
            learning_rate=trial.suggest_float('learning_rate', 1e-4, 1e-2, log=True),
            batch_size=trial.suggest_categorical('batch_size', [16, 32, 64, 128]),
            weight_decay=trial.suggest_float('weight_decay', 1e-6, 1e-3, log=True),
            max_epochs=20,  # Reduced for optimization
            early_stopping_patience=5
        )
        
        # Create data loaders
        train_loader = DataLoader(
            self.train_dataset,
            batch_size=config.batch_size,
            shuffle=True,
            num_workers=2
        )
        
        val_loader = DataLoader(
            self.val_dataset,
            batch_size=config.batch_size,
            shuffle=False,
            num_workers=2
        )
        
        # Create model
        model = DKTModel(
            num_items=self.train_dataset.num_items,
            config=config
        )
        
        # Create trainer
        trainer = DKTTrainer(model, config, self.device)
        
        # Train model
        try:
            training_history = trainer.train(train_loader, val_loader)
            
            # Return best validation loss
            best_val_loss = min(m.val_loss for m in training_history)
            return best_val_loss
            
        except Exception as e:
            logger.error(f"Trial failed: {e}")
            return float('inf')
    
    def optimize(self) -> Dict[str, Any]:
        """
        Run hyperparameter optimization
        
        Returns:
            Best hyperparameters and optimization results
        """
        logger.info(f"Starting hyperparameter optimization with {self.n_trials} trials")
        
        # Create study
        study = optuna.create_study(
            direction='minimize',
            pruner=optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=10)
        )
        
        # Optimize
        study.optimize(self.objective, n_trials=self.n_trials)
        
        # Get results
        best_params = study.best_params
        best_value = study.best_value
        
        logger.info(f"Optimization completed. Best validation loss: {best_value:.4f}")
        logger.info(f"Best parameters: {best_params}")
        
        return {
            'best_params': best_params,
            'best_value': best_value,
            'study': study
        }


class ModelEvaluator:
    """
    Comprehensive model evaluation and comparison
    """
    
    def __init__(self, device: torch.device = None):
        self.device = device or torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    def evaluate_model(
        self,
        model: DKTModel,
        test_loader: DataLoader,
        metrics: List[str] = None
    ) -> Dict[str, float]:
        """
        Evaluate model on test data
        
        Args:
            model: Trained DKT model
            test_loader: Test data loader
            metrics: List of metrics to compute
            
        Returns:
            Dictionary of evaluation metrics
        """
        if metrics is None:
            metrics = ['accuracy', 'auc', 'log_loss', 'f1', 'precision', 'recall']
        
        model.eval()
        model.to(self.device)
        
        all_predictions = []
        all_targets = []
        total_loss = 0
        criterion = nn.BCELoss()
        
        with torch.no_grad():
            for batch in test_loader:
                # Move batch to device
                interactions = batch['interactions'].to(self.device)
                items = batch['items'].to(self.device)
                responses = batch['responses'].to(self.device)
                lengths = batch['length']
                
                # Forward pass
                predictions = model.predict_next_item(
                    interactions[:, :-1],
                    items[:, 1:],
                    lengths - 1
                )
                
                # Prepare targets
                targets = responses[:, 1:].to(self.device)
                
                # Create mask
                batch_size, seq_len = targets.shape
                mask = torch.arange(seq_len).unsqueeze(0).expand(batch_size, -1).to(self.device)
                mask = mask < (lengths - 1).unsqueeze(1)
                
                # Calculate loss
                loss = criterion(predictions, targets)
                loss = (loss * mask.float()).sum() / mask.float().sum()
                total_loss += loss.item()
                
                # Collect predictions and targets
                valid_preds = predictions[mask].cpu().numpy()
                valid_targets = targets[mask].cpu().numpy()
                
                all_predictions.extend(valid_preds)
                all_targets.extend(valid_targets)
        
        # Convert to numpy arrays
        all_predictions = np.array(all_predictions)
        all_targets = np.array(all_targets)
        
        # Calculate metrics
        results = {}
        
        if 'loss' in metrics:
            results['loss'] = total_loss / len(test_loader)
        
        if 'accuracy' in metrics:
            pred_binary = (all_predictions > 0.5).astype(int)
            results['accuracy'] = accuracy_score(all_targets, pred_binary)
        
        if 'auc' in metrics:
            try:
                results['auc'] = roc_auc_score(all_targets, all_predictions)
            except ValueError:
                results['auc'] = 0.5
        
        if 'log_loss' in metrics:
            # Clip predictions to avoid log(0)
            clipped_preds = np.clip(all_predictions, 1e-7, 1 - 1e-7)
            results['log_loss'] = log_loss(all_targets, clipped_preds)
        
        if 'f1' in metrics:
            pred_binary = (all_predictions > 0.5).astype(int)
            results['f1'] = f1_score(all_targets, pred_binary)
        
        if 'precision' in metrics:
            pred_binary = (all_predictions > 0.5).astype(int)
            results['precision'] = precision_score(all_targets, pred_binary, zero_division=0)
        
        if 'recall' in metrics:
            pred_binary = (all_predictions > 0.5).astype(int)
            results['recall'] = recall_score(all_targets, pred_binary, zero_division=0)
        
        return results
    
    def cross_validate(
        self,
        dataset: DKTDataset,
        config: ModelConfig,
        k_folds: int = 5,
        stratify: bool = False
    ) -> Dict[str, Any]:
        """
        Perform k-fold cross-validation
        
        Args:
            dataset: Full dataset
            config: Model configuration
            k_folds: Number of folds
            stratify: Whether to stratify folds
            
        Returns:
            Cross-validation results
        """
        logger.info(f"Starting {k_folds}-fold cross-validation")
        
        # Create folds
        if stratify:
            # For stratification, we need to extract labels
            # This is simplified - in practice, you'd need to handle sequences properly
            kfold = StratifiedKFold(n_splits=k_folds, shuffle=True, random_state=42)
            labels = [seq['response_sequence'][0] for seq in dataset.sequences]  # Simplified
            fold_splits = list(kfold.split(range(len(dataset)), labels))
        else:
            kfold = KFold(n_splits=k_folds, shuffle=True, random_state=42)
            fold_splits = list(kfold.split(range(len(dataset))))
        
        fold_results = []
        
        for fold, (train_idx, val_idx) in enumerate(fold_splits):
            logger.info(f"Training fold {fold + 1}/{k_folds}")
            
            # Create fold datasets
            train_sequences = [dataset.sequences[i] for i in train_idx]
            val_sequences = [dataset.sequences[i] for i in val_idx]
            
            train_dataset = DKTDataset(
                train_sequences,
                max_length=dataset.max_length,
                item_vocab=dataset.item_vocab,
                create_vocab=False
            )
            
            val_dataset = DKTDataset(
                val_sequences,
                max_length=dataset.max_length,
                item_vocab=dataset.item_vocab,
                create_vocab=False
            )
            
            # Create data loaders
            train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
            val_loader = DataLoader(val_dataset, batch_size=config.batch_size, shuffle=False)
            
            # Create and train model
            model = DKTModel(num_items=dataset.num_items, config=config)
            trainer = DKTTrainer(model, config, self.device)
            
            # Train
            training_history = trainer.train(train_loader, val_loader)
            
            # Evaluate
            final_metrics = self.evaluate_model(model, val_loader)
            
            fold_results.append({
                'fold': fold,
                'final_metrics': final_metrics,
                'best_val_loss': trainer.best_val_loss,
                'training_history': training_history
            })
        
        # Aggregate results
        metric_names = fold_results[0]['final_metrics'].keys()
        aggregated_metrics = {}
        
        for metric in metric_names:
            values = [fold['final_metrics'][metric] for fold in fold_results]
            aggregated_metrics[metric] = {
                'mean': np.mean(values),
                'std': np.std(values),
                'values': values
            }
        
        logger.info("Cross-validation completed")
        for metric, stats in aggregated_metrics.items():
            logger.info(f"{metric}: {stats['mean']:.4f} ± {stats['std']:.4f}")
        
        return {
            'fold_results': fold_results,
            'aggregated_metrics': aggregated_metrics,
            'config': asdict(config)
        }


def train_dkt_model_with_optimization(
    sequences: List[Dict[str, Any]],
    config: ModelConfig = None,
    optimize_hyperparams: bool = True,
    cross_validate: bool = True,
    mlflow_experiment: str = "dkt_training"
) -> Dict[str, Any]:
    """
    Complete DKT model training pipeline with optimization
    
    Args:
        sequences: List of sequence dictionaries
        config: Model configuration (optional)
        optimize_hyperparams: Whether to optimize hyperparameters
        cross_validate: Whether to perform cross-validation
        mlflow_experiment: MLflow experiment name
        
    Returns:
        Training results dictionary
    """
    # Set up MLflow
    mlflow.set_experiment(mlflow_experiment)
    
    with mlflow.start_run():
        # Create dataset
        dataset = DKTDataset(sequences)
        
        # Split data
        train_size = int(0.7 * len(dataset))
        val_size = int(0.15 * len(dataset))
        test_size = len(dataset) - train_size - val_size
        
        train_dataset, val_dataset, test_dataset = random_split(
            dataset, [train_size, val_size, test_size]
        )
        
        results = {
            'dataset_info': {
                'total_sequences': len(dataset),
                'num_items': dataset.num_items,
                'train_size': train_size,
                'val_size': val_size,
                'test_size': test_size
            }
        }
        
        # Hyperparameter optimization
        if optimize_hyperparams:
            logger.info("Starting hyperparameter optimization")
            optimizer = HyperparameterOptimizer(train_dataset, val_dataset)
            opt_results = optimizer.optimize()
            
            # Use best parameters
            best_config = ModelConfig(**opt_results['best_params'])
            results['optimization'] = opt_results
        else:
            best_config = config or ModelConfig()
        
        # Log configuration
        mlflow.log_params(asdict(best_config))
        
        # Cross-validation
        if cross_validate:
            logger.info("Starting cross-validation")
            evaluator = ModelEvaluator()
            cv_results = evaluator.cross_validate(dataset, best_config)
            results['cross_validation'] = cv_results
            
            # Log CV metrics
            for metric, stats in cv_results['aggregated_metrics'].items():
                mlflow.log_metric(f"cv_{metric}_mean", stats['mean'])
                mlflow.log_metric(f"cv_{metric}_std", stats['std'])
        
        # Final model training
        logger.info("Training final model")
        
        train_loader = DataLoader(train_dataset, batch_size=best_config.batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=best_config.batch_size, shuffle=False)
        test_loader = DataLoader(test_dataset, batch_size=best_config.batch_size, shuffle=False)
        
        # Create and train final model
        final_model = DKTModel(num_items=dataset.num_items, config=best_config)
        trainer = DKTTrainer(final_model, best_config)
        
        training_history = trainer.train(train_loader, val_loader, mlflow.active_run().info.run_id)
        
        # Final evaluation
        evaluator = ModelEvaluator()
        test_metrics = evaluator.evaluate_model(final_model, test_loader)
        
        # Log final metrics
        for metric, value in test_metrics.items():
            mlflow.log_metric(f"test_{metric}", value)
        
        # Save model
        mlflow.pytorch.log_model(final_model, "model")
        
        # Register model if performance is good
        if test_metrics.get('auc', 0) > 0.75:  # Threshold
            model_uri = f"runs:/{mlflow.active_run().info.run_id}/model"
            mlflow.register_model(model_uri, "DKT_Model")
        
        results.update({
            'final_config': asdict(best_config),
            'training_history': [asdict(m) for m in training_history],
            'test_metrics': test_metrics,
            'model_uri': f"runs:/{mlflow.active_run().info.run_id}/model"
        })
        
        logger.info("Model training pipeline completed successfully")
        return results