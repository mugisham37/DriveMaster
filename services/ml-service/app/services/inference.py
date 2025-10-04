"""ML inference service for predictions."""

import torch
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import asyncio
import time
from datetime import datetime

from app.models.schemas import (
    PredictionRequest,
    PredictionResponse,
    AttemptRecord
)
from app.core.model_manager import model_manager
from app.core.logging import get_logger
from app.config import settings

logger = get_logger(__name__)


class InferenceService:
    """Service for ML model inference."""
    
    def __init__(self):
        self.max_sequence_length = settings.max_sequence_length
        self.batch_size = settings.batch_size
        
        # Item and topic mappings (will be loaded from database)
        self.item_to_id: Dict[str, int] = {}
        self.topic_to_id: Dict[str, int] = {}
        self.id_to_item: Dict[int, str] = {}
        self.id_to_topic: Dict[int, str] = {}
        
        # Item metadata cache
        self.item_topics: Dict[str, List[str]] = {}
        self.item_difficulty: Dict[str, float] = {}
    
    async def initialize(self) -> None:
        """Initialize the inference service."""
        try:
            # Load item and topic mappings from database
            await self._load_mappings()
            logger.info("Inference service initialized")
            
        except Exception as e:
            logger.error("Failed to initialize inference service", error=str(e))
            raise
    
    async def predict_single(self, request: PredictionRequest) -> PredictionResponse:
        """Perform single prediction."""
        start_time = time.time()
        
        try:
            # Get active model
            model = model_manager.get_active_model()
            if not model:
                raise ValueError("No active model available")
            
            model_info = model_manager.get_active_model_info()
            
            # Prepare input data
            input_data = self._prepare_input_data(
                request.attempt_history,
                request.candidate_items
            )
            
            # Run inference
            with torch.no_grad():
                predictions, topic_mastery = await self._run_inference(
                    model, input_data, request.candidate_items
                )
            
            # Calculate confidence scores
            confidence_scores = self._calculate_confidence_scores(predictions)
            
            # Prepare response
            inference_time = (time.time() - start_time) * 1000
            
            return PredictionResponse(
                predictions=predictions,
                confidence_scores=confidence_scores,
                topic_mastery=topic_mastery,
                model_version=model_info.version,
                inference_time_ms=inference_time,
                cached=False
            )
            
        except Exception as e:
            logger.error("Single prediction failed", error=str(e), user_id=request.user_id)
            raise
    
    async def predict_batch(self, requests: List[PredictionRequest]) -> List[PredictionResponse]:
        """Perform batch predictions with optimized processing."""
        try:
            # Group requests by similar characteristics for batch optimization
            batched_requests = self._group_requests_for_batching(requests)
            all_responses = []
            
            for batch in batched_requests:
                # Process each batch
                batch_responses = await self._process_request_batch(batch)
                all_responses.extend(batch_responses)
            
            # Ensure responses are in the same order as input requests
            response_map = {resp.user_id if hasattr(resp, 'user_id') else i: resp 
                          for i, resp in enumerate(all_responses)}
            
            ordered_responses = []
            for i, request in enumerate(requests):
                response = response_map.get(request.user_id, response_map.get(i))
                if response is None:
                    # Create error response for missing predictions
                    response = PredictionResponse(
                        predictions={},
                        confidence_scores={},
                        topic_mastery={},
                        model_version="error",
                        inference_time_ms=0,
                        cached=False
                    )
                ordered_responses.append(response)
            
            return ordered_responses
            
        except Exception as e:
            logger.error("Batch prediction failed", error=str(e))
            raise
    
    def _group_requests_for_batching(self, requests: List[PredictionRequest]) -> List[List[PredictionRequest]]:
        """Group requests for optimal batch processing."""
        # Simple batching by max batch size
        batches = []
        for i in range(0, len(requests), settings.batch_size):
            batch = requests[i:i + settings.batch_size]
            batches.append(batch)
        return batches
    
    async def _process_request_batch(self, requests: List[PredictionRequest]) -> List[PredictionResponse]:
        """Process a batch of requests together for efficiency."""
        try:
            # For now, process individually but could be optimized for true batch inference
            semaphore = asyncio.Semaphore(settings.max_workers)
            
            async def process_request(request):
                async with semaphore:
                    return await self.predict_single(request)
            
            tasks = [process_request(req) for req in requests]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle exceptions in results
            responses = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(
                        "Batch prediction item failed",
                        error=str(result),
                        request_index=i,
                        user_id=requests[i].user_id if i < len(requests) else "unknown"
                    )
                    # Create error response
                    responses.append(PredictionResponse(
                        predictions={},
                        confidence_scores={},
                        topic_mastery={},
                        model_version="error",
                        inference_time_ms=0,
                        cached=False
                    ))
                else:
                    responses.append(result)
            
            return responses
            
        except Exception as e:
            logger.error("Batch processing failed", error=str(e))
            raise
    
    def _prepare_input_data(
        self,
        attempt_history: List[AttemptRecord],
        candidate_items: List[str]
    ) -> Dict[str, torch.Tensor]:
        """Prepare input data for model inference."""
        try:
            # Sort attempts by timestamp
            sorted_attempts = sorted(attempt_history, key=lambda x: x.timestamp)
            
            # Limit sequence length
            if len(sorted_attempts) > self.max_sequence_length:
                sorted_attempts = sorted_attempts[-self.max_sequence_length:]
            
            # Convert to model inputs
            item_ids = []
            topic_ids = []
            responses = []
            
            for attempt in sorted_attempts:
                # Map item to ID
                item_id = self.item_to_id.get(attempt.item_id, 0)  # 0 for unknown
                item_ids.append(item_id)
                
                # Get primary topic for this item
                item_topics = self.item_topics.get(attempt.item_id, ["unknown"])
                primary_topic = item_topics[0] if item_topics else "unknown"
                topic_id = self.topic_to_id.get(primary_topic, 0)
                topic_ids.append(topic_id)
                
                # Response (1 for correct, 0 for incorrect)
                responses.append(1 if attempt.correct else 0)
            
            # Pad sequences if necessary
            seq_len = len(item_ids)
            if seq_len < self.max_sequence_length:
                padding_length = self.max_sequence_length - seq_len
                item_ids.extend([0] * padding_length)
                topic_ids.extend([0] * padding_length)
                responses.extend([0] * padding_length)
            
            # Convert to tensors
            input_data = {
                "item_ids": torch.tensor([item_ids], dtype=torch.long),
                "topic_ids": torch.tensor([topic_ids], dtype=torch.long),
                "responses": torch.tensor([responses], dtype=torch.long),
                "lengths": torch.tensor([seq_len], dtype=torch.long),
                "candidate_items": candidate_items
            }
            
            return input_data
            
        except Exception as e:
            logger.error("Failed to prepare input data", error=str(e))
            raise
    
    async def _run_inference(
        self,
        model: torch.nn.Module,
        input_data: Dict[str, torch.Tensor],
        candidate_items: List[str]
    ) -> Tuple[Dict[str, float], Dict[str, float]]:
        """Run model inference."""
        try:
            # Move tensors to model device
            device = next(model.parameters()).device
            item_ids = input_data["item_ids"].to(device)
            topic_ids = input_data["topic_ids"].to(device)
            responses = input_data["responses"].to(device)
            lengths = input_data["lengths"].to(device)
            
            # Forward pass
            next_correct_prob, topic_mastery_logits = model(
                item_ids, topic_ids, responses, lengths
            )
            
            # Get predictions for candidate items
            predictions = {}
            for item_id in candidate_items:
                # For simplicity, use the last prediction from the sequence
                # In a real implementation, you'd want to predict specifically for each candidate item
                item_idx = self.item_to_id.get(item_id, 0)
                if item_idx < next_correct_prob.size(-1):
                    prob = next_correct_prob[0, -1, item_idx].item()
                else:
                    # Fallback prediction for unknown items
                    prob = next_correct_prob[0, -1, 0].item()
                
                predictions[item_id] = float(prob)
            
            # Extract topic mastery
            topic_mastery = {}
            if topic_mastery_logits is not None:
                topic_probs = torch.sigmoid(topic_mastery_logits[0, -1])  # Last timestep
                for topic_name, topic_id in self.topic_to_id.items():
                    if topic_id < topic_probs.size(0):
                        mastery = topic_probs[topic_id].item()
                        topic_mastery[topic_name] = float(mastery)
            
            return predictions, topic_mastery
            
        except Exception as e:
            logger.error("Model inference failed", error=str(e))
            raise
    
    def _calculate_confidence_scores(self, predictions: Dict[str, float]) -> Dict[str, float]:
        """Calculate confidence scores for predictions."""
        confidence_scores = {}
        
        for item_id, prob in predictions.items():
            # Simple confidence based on distance from 0.5
            # Higher confidence when probability is closer to 0 or 1
            confidence = 2 * abs(prob - 0.5)
            confidence_scores[item_id] = float(confidence)
        
        return confidence_scores
    
    async def _load_mappings(self) -> None:
        """Load item and topic mappings from database."""
        # This is a placeholder - in a real implementation, you would load from database
        # For now, create dummy mappings
        
        # Create dummy item mappings
        for i in range(1000):  # Assume 1000 items
            item_id = f"item_{i}"
            self.item_to_id[item_id] = i + 1  # Start from 1, 0 reserved for unknown
            self.id_to_item[i + 1] = item_id
            
            # Assign random topics
            topic_names = [f"topic_{(i % 20) + 1}", f"topic_{((i + 5) % 20) + 1}"]
            self.item_topics[item_id] = topic_names
            self.item_difficulty[item_id] = np.random.normal(0, 1)  # Random difficulty
        
        # Create topic mappings
        for i in range(20):  # Assume 20 topics
            topic_name = f"topic_{i + 1}"
            self.topic_to_id[topic_name] = i + 1
            self.id_to_topic[i + 1] = topic_name
        
        # Add unknown mappings
        self.item_to_id["unknown"] = 0
        self.topic_to_id["unknown"] = 0
        self.id_to_item[0] = "unknown"
        self.id_to_topic[0] = "unknown"
        
        logger.info(
            "Mappings loaded",
            num_items=len(self.item_to_id),
            num_topics=len(self.topic_to_id)
        )