"""Deep Knowledge Tracing (DKT) model implementation."""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional
import math

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class DKTModel(nn.Module):
    """Deep Knowledge Tracing model with LSTM/Transformer architecture."""
    
    def __init__(
        self,
        num_items: int,
        num_topics: int,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2,
        architecture: str = "lstm"  # "lstm" or "transformer"
    ):
        super().__init__()
        
        self.num_items = num_items
        self.num_topics = num_topics
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.architecture = architecture
        
        # Embedding layers
        self.item_embedding = nn.Embedding(
            num_items + 1,  # +1 for padding/unknown
            hidden_size // 2,
            padding_idx=0
        )
        self.topic_embedding = nn.Embedding(
            num_topics + 1,  # +1 for padding/unknown
            hidden_size // 4,
            padding_idx=0
        )
        self.response_embedding = nn.Embedding(
            2,  # correct/incorrect
            hidden_size // 4
        )
        
        # Input projection
        input_size = hidden_size // 2 + hidden_size // 4 + hidden_size // 4
        self.input_projection = nn.Linear(input_size, hidden_size)
        
        # Sequence modeling
        if architecture == "lstm":
            self.sequence_model = nn.LSTM(
                input_size=hidden_size,
                hidden_size=hidden_size,
                num_layers=num_layers,
                batch_first=True,
                dropout=dropout if num_layers > 1 else 0,
                bidirectional=False
            )
        elif architecture == "transformer":
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=hidden_size,
                nhead=8,
                dim_feedforward=hidden_size * 4,
                dropout=dropout,
                activation="gelu",
                batch_first=True
            )
            self.sequence_model = nn.TransformerEncoder(
                encoder_layer,
                num_layers=num_layers
            )
            self.positional_encoding = PositionalEncoding(hidden_size, dropout)
        else:
            raise ValueError(f"Unsupported architecture: {architecture}")
        
        # Output heads
        self.prediction_head = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, 1)
        )
        
        self.mastery_head = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, num_topics)
        )
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize model weights."""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
            elif isinstance(module, nn.Embedding):
                nn.init.normal_(module.weight, mean=0, std=0.1)
                if module.padding_idx is not None:
                    nn.init.zeros_(module.weight[module.padding_idx])
    
    def forward(
        self,
        item_ids: torch.Tensor,
        topic_ids: torch.Tensor,
        responses: torch.Tensor,
        lengths: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass of the DKT model.
        
        Args:
            item_ids: (batch_size, seq_len) - Item IDs
            topic_ids: (batch_size, seq_len) - Topic IDs  
            responses: (batch_size, seq_len) - Response correctness (0/1)
            lengths: (batch_size,) - Actual sequence lengths
            mask: (batch_size, seq_len) - Optional attention mask
            
        Returns:
            next_correct_prob: (batch_size, seq_len, 1) - Probability of next response being correct
            topic_mastery: (batch_size, seq_len, num_topics) - Topic mastery probabilities
        """
        batch_size, seq_len = item_ids.shape
        
        # Create embeddings
        item_emb = self.item_embedding(item_ids)  # (batch_size, seq_len, hidden_size//2)
        topic_emb = self.topic_embedding(topic_ids)  # (batch_size, seq_len, hidden_size//4)
        response_emb = self.response_embedding(responses)  # (batch_size, seq_len, hidden_size//4)
        
        # Concatenate embeddings
        combined_emb = torch.cat([item_emb, topic_emb, response_emb], dim=-1)
        
        # Project to hidden size
        hidden_states = self.input_projection(combined_emb)  # (batch_size, seq_len, hidden_size)
        
        # Create attention mask if not provided
        if mask is None:
            mask = self._create_padding_mask(lengths, seq_len, hidden_states.device)
        
        # Sequence modeling
        if self.architecture == "lstm":
            # Pack padded sequences for LSTM
            packed_input = nn.utils.rnn.pack_padded_sequence(
                hidden_states, lengths.cpu(), batch_first=True, enforce_sorted=False
            )
            packed_output, _ = self.sequence_model(packed_input)
            sequence_output, _ = nn.utils.rnn.pad_packed_sequence(
                packed_output, batch_first=True
            )
        else:  # transformer
            # Add positional encoding
            hidden_states = self.positional_encoding(hidden_states)
            
            # Apply transformer with attention mask
            # Convert padding mask to attention mask (True = ignore)
            attn_mask = ~mask.bool()  # Invert mask for transformer
            sequence_output = self.sequence_model(
                hidden_states,
                src_key_padding_mask=attn_mask
            )
        
        # Apply mask to outputs
        sequence_output = sequence_output * mask.unsqueeze(-1)
        
        # Generate predictions
        next_correct_prob = torch.sigmoid(self.prediction_head(sequence_output))
        topic_mastery = torch.sigmoid(self.mastery_head(sequence_output))
        
        return next_correct_prob, topic_mastery
    
    def _create_padding_mask(
        self,
        lengths: torch.Tensor,
        max_len: int,
        device: torch.device
    ) -> torch.Tensor:
        """Create padding mask from sequence lengths."""
        batch_size = lengths.size(0)
        mask = torch.arange(max_len, device=device).expand(
            batch_size, max_len
        ) < lengths.unsqueeze(1)
        return mask.float()
    
    def predict_next_performance(
        self,
        item_ids: torch.Tensor,
        topic_ids: torch.Tensor,
        responses: torch.Tensor,
        lengths: torch.Tensor,
        target_items: torch.Tensor,
        target_topics: torch.Tensor
    ) -> torch.Tensor:
        """
        Predict performance on target items given history.
        
        Args:
            item_ids, topic_ids, responses, lengths: History sequences
            target_items: (batch_size, num_targets) - Target item IDs
            target_topics: (batch_size, num_targets) - Target topic IDs
            
        Returns:
            predictions: (batch_size, num_targets) - Predicted probabilities
        """
        # Get sequence representations
        next_correct_prob, topic_mastery = self.forward(
            item_ids, topic_ids, responses, lengths
        )
        
        # Use the last valid timestep for each sequence
        batch_indices = torch.arange(lengths.size(0), device=lengths.device)
        last_indices = lengths - 1
        
        last_hidden = next_correct_prob[batch_indices, last_indices]  # (batch_size, 1)
        last_mastery = topic_mastery[batch_indices, last_indices]  # (batch_size, num_topics)
        
        # For simplicity, use topic mastery to predict target performance
        batch_size, num_targets = target_items.shape
        predictions = torch.zeros(batch_size, num_targets, device=target_items.device)
        
        for i in range(num_targets):
            topic_ids_for_target = target_topics[:, i]  # (batch_size,)
            
            # Gather mastery for target topics
            target_mastery = last_mastery.gather(1, topic_ids_for_target.unsqueeze(1))
            predictions[:, i] = target_mastery.squeeze(1)
        
        return predictions
    
    def get_knowledge_state(
        self,
        item_ids: torch.Tensor,
        topic_ids: torch.Tensor,
        responses: torch.Tensor,
        lengths: torch.Tensor
    ) -> torch.Tensor:
        """
        Get current knowledge state (topic mastery) for users.
        
        Returns:
            knowledge_state: (batch_size, num_topics) - Current mastery per topic
        """
        _, topic_mastery = self.forward(item_ids, topic_ids, responses, lengths)
        
        # Get last valid timestep for each sequence
        batch_indices = torch.arange(lengths.size(0), device=lengths.device)
        last_indices = lengths - 1
        
        knowledge_state = topic_mastery[batch_indices, last_indices]
        return knowledge_state


class PositionalEncoding(nn.Module):
    """Positional encoding for transformer architecture."""
    
    def __init__(self, d_model: int, dropout: float = 0.1, max_len: int = 5000):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * 
                           (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)
        
        self.register_buffer('pe', pe)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.pe[:x.size(1), :].transpose(0, 1)
        return self.dropout(x)


def create_dkt_model(
    num_items: int = None,
    num_topics: int = None,
    architecture: str = "lstm"
) -> DKTModel:
    """Factory function to create DKT model with default settings."""
    
    num_items = num_items or settings.num_items
    num_topics = num_topics or settings.num_topics
    
    model = DKTModel(
        num_items=num_items,
        num_topics=num_topics,
        hidden_size=settings.hidden_size,
        num_layers=settings.num_layers,
        architecture=architecture
    )
    
    logger.info(
        "DKT model created",
        num_items=num_items,
        num_topics=num_topics,
        hidden_size=settings.hidden_size,
        num_layers=settings.num_layers,
        architecture=architecture,
        total_params=sum(p.numel() for p in model.parameters())
    )
    
    return model