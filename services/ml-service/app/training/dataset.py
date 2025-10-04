"""Dataset classes for DKT model training."""

import torch
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import json

from app.core.logging import get_logger

logger = get_logger(__name__)


class DKTDataset(Dataset):
    """Dataset for Deep Knowledge Tracing model training."""
    
    def __init__(
        self,
        data_path: str = None,
        data_df: pd.DataFrame = None,
        max_sequence_length: int = 100,
        item_to_id: Dict[str, int] = None,
        topic_to_id: Dict[str, int] = None,
        min_sequence_length: int = 5
    ):
        """
        Initialize DKT dataset.
        
        Args:
            data_path: Path to CSV file with attempt data
            data_df: Pre-loaded DataFrame with attempt data
            max_sequence_length: Maximum sequence length for padding/truncation
            item_to_id: Mapping from item IDs to integer indices
            topic_to_id: Mapping from topic names to integer indices
            min_sequence_length: Minimum sequence length to include
        """
        self.max_sequence_length = max_sequence_length
        self.min_sequence_length = min_sequence_length
        
        # Load data
        if data_df is not None:
            self.df = data_df
        elif data_path:
            self.df = pd.read_csv(data_path)
        else:
            raise ValueError("Either data_path or data_df must be provided")
        
        # Create mappings if not provided
        if item_to_id is None:
            unique_items = self.df['item_id'].unique()
            self.item_to_id = {item: i + 1 for i, item in enumerate(unique_items)}
            self.item_to_id['<UNK>'] = 0
        else:
            self.item_to_id = item_to_id
        
        if topic_to_id is None:
            # Extract topics from item metadata or use a default mapping
            unique_topics = set()
            for topics_str in self.df['topics'].fillna('[]'):
                try:
                    topics = json.loads(topics_str) if isinstance(topics_str, str) else []
                    unique_topics.update(topics)
                except:
                    pass
            
            self.topic_to_id = {topic: i + 1 for i, topic in enumerate(unique_topics)}
            self.topic_to_id['<UNK>'] = 0
        else:
            self.topic_to_id = topic_to_id
        
        # Process sequences
        self.sequences = self._process_sequences()
        
        logger.info(
            "DKT dataset initialized",
            num_sequences=len(self.sequences),
            num_items=len(self.item_to_id),
            num_topics=len(self.topic_to_id),
            max_seq_len=max_sequence_length
        )
    
    def _process_sequences(self) -> List[Dict]:
        """Process raw data into sequences for training."""
        sequences = []
        
        # Group by user
        user_groups = self.df.groupby('user_id')
        
        for user_id, user_data in user_groups:
            # Sort by timestamp
            user_data = user_data.sort_values('timestamp')
            
            # Skip if sequence too short
            if len(user_data) < self.min_sequence_length:
                continue
            
            # Extract sequence data
            item_ids = []
            topic_ids = []
            responses = []
            timestamps = []
            
            for _, row in user_data.iterrows():
                # Map item to ID
                item_id = self.item_to_id.get(row['item_id'], 0)
                item_ids.append(item_id)
                
                # Get primary topic for this item
                try:
                    topics = json.loads(row['topics']) if pd.notna(row['topics']) else []
                    primary_topic = topics[0] if topics else '<UNK>'
                except:
                    primary_topic = '<UNK>'
                
                topic_id = self.topic_to_id.get(primary_topic, 0)
                topic_ids.append(topic_id)
                
                # Response (1 for correct, 0 for incorrect)
                responses.append(1 if row['correct'] else 0)
                timestamps.append(row['timestamp'])
            
            # Create sliding windows if sequence is too long
            if len(item_ids) > self.max_sequence_length:
                # Create overlapping windows
                window_size = self.max_sequence_length
                step_size = window_size // 2
                
                for start_idx in range(0, len(item_ids) - window_size + 1, step_size):
                    end_idx = start_idx + window_size
                    
                    sequences.append({
                        'user_id': user_id,
                        'item_ids': item_ids[start_idx:end_idx],
                        'topic_ids': topic_ids[start_idx:end_idx],
                        'responses': responses[start_idx:end_idx],
                        'length': window_size,
                        'timestamps': timestamps[start_idx:end_idx]
                    })
            else:
                sequences.append({
                    'user_id': user_id,
                    'item_ids': item_ids,
                    'topic_ids': topic_ids,
                    'responses': responses,
                    'length': len(item_ids),
                    'timestamps': timestamps
                })
        
        return sequences
    
    def __len__(self) -> int:
        return len(self.sequences)
    
    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        """Get a training sample."""
        sequence = self.sequences[idx]
        
        # Get sequence data
        item_ids = sequence['item_ids']
        topic_ids = sequence['topic_ids']
        responses = sequence['responses']
        length = sequence['length']
        
        # Pad sequences to max length
        padded_item_ids = item_ids + [0] * (self.max_sequence_length - len(item_ids))
        padded_topic_ids = topic_ids + [0] * (self.max_sequence_length - len(topic_ids))
        padded_responses = responses + [0] * (self.max_sequence_length - len(responses))
        
        # Create input and target sequences
        # Input: all but last element
        # Target: all but first element (shifted by 1)
        input_items = padded_item_ids[:-1] + [0]  # Pad to maintain length
        input_topics = padded_topic_ids[:-1] + [0]
        input_responses = padded_responses[:-1] + [0]
        
        target_responses = [0] + padded_responses[:-1]  # Shift right
        
        return {
            'item_ids': torch.tensor(input_items, dtype=torch.long),
            'topic_ids': torch.tensor(input_topics, dtype=torch.long),
            'responses': torch.tensor(input_responses, dtype=torch.long),
            'targets': torch.tensor(target_responses, dtype=torch.float),
            'length': torch.tensor(length - 1, dtype=torch.long),  # -1 because we shift
            'user_id': sequence['user_id']
        }


def create_data_loaders(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame = None,
    batch_size: int = 32,
    max_sequence_length: int = 100,
    num_workers: int = 4
) -> Tuple[DataLoader, DataLoader, Optional[DataLoader]]:
    """Create data loaders for training, validation, and testing."""
    
    # Create datasets
    train_dataset = DKTDataset(
        data_df=train_df,
        max_sequence_length=max_sequence_length
    )
    
    # Use same mappings for validation and test
    val_dataset = DKTDataset(
        data_df=val_df,
        max_sequence_length=max_sequence_length,
        item_to_id=train_dataset.item_to_id,
        topic_to_id=train_dataset.topic_to_id
    )
    
    test_dataset = None
    if test_df is not None:
        test_dataset = DKTDataset(
            data_df=test_df,
            max_sequence_length=max_sequence_length,
            item_to_id=train_dataset.item_to_id,
            topic_to_id=train_dataset.topic_to_id
        )
    
    # Create data loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True
    )
    
    test_loader = None
    if test_dataset:
        test_loader = DataLoader(
            test_dataset,
            batch_size=batch_size,
            shuffle=False,
            num_workers=num_workers,
            pin_memory=True
        )
    
    return train_loader, val_loader, test_loader


def generate_synthetic_data(
    num_users: int = 1000,
    num_items: int = 500,
    num_topics: int = 20,
    avg_sequence_length: int = 50,
    output_path: str = None
) -> pd.DataFrame:
    """Generate synthetic training data for testing."""
    
    np.random.seed(42)
    
    data = []
    
    # Create item-topic mappings
    item_topics = {}
    for item_id in range(num_items):
        # Each item belongs to 1-3 topics
        num_item_topics = np.random.randint(1, 4)
        topics = np.random.choice(num_topics, num_item_topics, replace=False)
        item_topics[f"item_{item_id}"] = [f"topic_{t}" for t in topics]
    
    for user_id in range(num_users):
        # Generate user ability per topic
        user_abilities = np.random.normal(0, 1, num_topics)
        
        # Generate sequence length
        seq_length = max(5, int(np.random.normal(avg_sequence_length, 15)))
        
        # Generate attempts
        for attempt_idx in range(seq_length):
            # Select random item
            item_idx = np.random.randint(num_items)
            item_id = f"item_{item_idx}"
            
            # Get item topics and difficulty
            topics = item_topics[item_id]
            item_difficulty = np.random.normal(0, 1)
            
            # Calculate probability of correct response
            # Based on user ability for primary topic and item difficulty
            primary_topic_idx = int(topics[0].split('_')[1])
            user_ability = user_abilities[primary_topic_idx]
            
            # IRT-like probability
            prob_correct = 1 / (1 + np.exp(-(user_ability - item_difficulty)))
            
            # Add learning effect (ability increases over time)
            learning_boost = attempt_idx * 0.01
            prob_correct = min(0.95, prob_correct + learning_boost)
            
            # Generate response
            correct = np.random.random() < prob_correct
            
            # Generate timestamp
            base_time = datetime(2024, 1, 1)
            timestamp = base_time.timestamp() + user_id * 86400 + attempt_idx * 3600
            
            data.append({
                'user_id': f"user_{user_id}",
                'item_id': item_id,
                'topics': json.dumps(topics),
                'correct': correct,
                'quality': np.random.randint(1, 6) if correct else np.random.randint(1, 3),
                'time_taken_ms': int(np.random.lognormal(8, 0.5)),  # Log-normal response time
                'timestamp': timestamp,
                'difficulty': item_difficulty
            })
    
    df = pd.DataFrame(data)
    
    if output_path:
        df.to_csv(output_path, index=False)
        logger.info("Synthetic data saved", path=output_path, num_records=len(df))
    
    return df