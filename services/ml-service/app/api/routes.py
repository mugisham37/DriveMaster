"""API routes for ML inference service."""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import Response
from typing import List, Dict, Any
import asyncio
import time
import uuid
from datetime import datetime

from app.models.schemas import (
    PredictionRequest,
    PredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    HealthStatus,
    ModelInfo,
    ExplanationRequest,
    ExplanationResponse
)
from app.core.model_manager import model_manager
from app.core.cache import prediction_cache
from app.core.monitoring import performance_monitor, RequestTimer, CONTENT_TYPE_LATEST
from app.core.logging import get_logger, MLMetrics
from app.services.inference import InferenceService
from app.services.explanation import ExplanationService

logger = get_logger(__name__)
metrics = MLMetrics()

# Create API router
router = APIRouter()

# Initialize services (will be done in startup)
inference_service: InferenceService = None
explanation_service: ExplanationService = None


async def get_inference_service() -> InferenceService:
    """Dependency to get inference service."""
    global inference_service
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Inference service not initialized")
    return inference_service


async def get_explanation_service() -> ExplanationService:
    """Dependency to get explanation service."""
    global explanation_service
    if explanation_service is None:
        raise HTTPException(status_code=503, detail="Explanation service not initialized")
    return explanation_service


@router.get("/health", response_model=HealthStatus)
async def health_check():
    """Health check endpoint."""
    try:
        # Check model status
        active_model = model_manager.get_active_model_info()
        model_status = {
            "active_model": active_model.model_name if active_model else "none",
            "model_version": active_model.version if active_model else "none",
            "status": "healthy" if active_model else "no_model"
        }
        
        # Check cache status
        cache_stats = await prediction_cache.get_cache_stats()
        cache_status = cache_stats.get("status", "unknown")
        
        # Get system metrics
        memory_usage = model_manager.get_memory_usage()
        metrics_summary = performance_monitor.get_metrics_summary()
        
        return HealthStatus(
            status="healthy" if active_model else "degraded",
            service="ml-inference-service",
            version="1.0.0",
            model_status=model_status,
            cache_status=cache_status,
            uptime_seconds=metrics_summary["uptime_seconds"],
            memory_usage_mb=memory_usage["system_memory_mb"]
        )
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=500, detail="Health check failed")


@router.post("/predict", response_model=PredictionResponse)
async def predict_single(
    request: PredictionRequest,
    inference_svc: InferenceService = Depends(get_inference_service)
):
    """Single prediction endpoint."""
    start_time = time.time()
    
    try:
        with RequestTimer(performance_monitor, "single_prediction"):
            # Check cache first
            cached_result = await prediction_cache.get_prediction(
                user_id=request.user_id,
                candidate_items=request.candidate_items,
                attempt_history=[attempt.dict() for attempt in request.attempt_history],
                model_version=request.model_version or "active"
            )
            
            if cached_result:
                cached_result["cached"] = True
                performance_monitor.record_cache_operation("get", "hit")
                
                metrics.log_prediction(
                    user_id=request.user_id,
                    model_version=cached_result["model_version"],
                    inference_time_ms=0,
                    batch_size=len(request.candidate_items),
                    cached=True
                )
                
                return PredictionResponse(**cached_result)
            
            performance_monitor.record_cache_operation("get", "miss")
            
            # Perform inference
            result = await inference_svc.predict_single(request)
            
            # Cache result
            await prediction_cache.set_prediction(
                user_id=request.user_id,
                candidate_items=request.candidate_items,
                attempt_history=[attempt.dict() for attempt in request.attempt_history],
                model_version=result.model_version,
                prediction_data=result.dict()
            )
            
            performance_monitor.record_cache_operation("set", "success")
            
            # Record metrics
            inference_time = (time.time() - start_time) * 1000
            performance_monitor.record_prediction_request(
                model_version=result.model_version,
                batch_size=len(request.candidate_items),
                inference_time=inference_time / 1000,
                cached=False
            )
            
            metrics.log_prediction(
                user_id=request.user_id,
                model_version=result.model_version,
                inference_time_ms=inference_time,
                batch_size=len(request.candidate_items),
                cached=False
            )
            
            return result
            
    except Exception as e:
        logger.error("Prediction failed", error=str(e), user_id=request.user_id)
        performance_monitor.record_error("prediction_error")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(
    request: BatchPredictionRequest,
    background_tasks: BackgroundTasks,
    inference_svc: InferenceService = Depends(get_inference_service)
):
    """Batch prediction endpoint."""
    start_time = time.time()
    batch_id = str(uuid.uuid4())
    
    try:
        with RequestTimer(performance_monitor, "batch_prediction"):
            # Process batch
            results = await inference_svc.predict_batch(request.requests)
            
            # Record metrics for each prediction
            total_items = sum(len(req.candidate_items) for req in request.requests)
            inference_time = (time.time() - start_time) * 1000
            
            for result in results:
                performance_monitor.record_prediction_request(
                    model_version=result.model_version,
                    batch_size=len(request.requests),
                    inference_time=inference_time / 1000 / len(results),
                    cached=result.cached
                )
            
            logger.info(
                "Batch prediction completed",
                batch_id=batch_id,
                batch_size=len(request.requests),
                total_items=total_items,
                inference_time_ms=inference_time
            )
            
            return BatchPredictionResponse(
                batch_id=batch_id,
                responses=results,
                total_inference_time_ms=inference_time,
                items_processed=total_items
            )
            
    except Exception as e:
        logger.error("Batch prediction failed", error=str(e), batch_id=batch_id)
        performance_monitor.record_error("batch_prediction_error")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@router.post("/explain", response_model=ExplanationResponse)
async def explain_prediction(
    request: ExplanationRequest,
    explanation_svc: ExplanationService = Depends(get_explanation_service)
):
    """Prediction explanation endpoint."""
    try:
        with RequestTimer(performance_monitor, "explanation"):
            result = await explanation_svc.explain_prediction(request)
            return result
            
    except Exception as e:
        logger.error("Explanation failed", error=str(e), user_id=request.user_id, item_id=request.item_id)
        performance_monitor.record_error("explanation_error")
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")


@router.get("/models", response_model=List[ModelInfo])
async def list_models():
    """List loaded models."""
    try:
        models = model_manager.get_loaded_models()
        return models
        
    except Exception as e:
        logger.error("Failed to list models", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to list models")


@router.post("/models/{model_name}/load")
async def load_model(model_name: str, version: str = "latest"):
    """Load a model version."""
    try:
        success = await model_manager.load_model(model_name, version)
        if success:
            return {"message": f"Model {model_name}:{version} loaded successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to load model")
            
    except Exception as e:
        logger.error("Failed to load model", error=str(e), model_name=model_name, version=version)
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")


@router.post("/models/{model_name}/unload")
async def unload_model(model_name: str, version: str):
    """Unload a model version."""
    try:
        success = await model_manager.unload_model(model_name, version)
        if success:
            return {"message": f"Model {model_name}:{version} unloaded successfully"}
        else:
            raise HTTPException(status_code=400, detail="Model not found or failed to unload")
            
    except Exception as e:
        logger.error("Failed to unload model", error=str(e), model_name=model_name, version=version)
        raise HTTPException(status_code=500, detail=f"Failed to unload model: {str(e)}")


@router.post("/models/{model_name}/activate")
async def activate_model(model_name: str, version: str):
    """Set a model as active."""
    try:
        success = await model_manager.switch_active_model(model_name, version)
        if success:
            return {"message": f"Model {model_name}:{version} activated successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to activate model")
            
    except Exception as e:
        logger.error("Failed to activate model", error=str(e), model_name=model_name, version=version)
        raise HTTPException(status_code=500, detail=f"Failed to activate model: {str(e)}")


@router.delete("/cache/user/{user_id}")
async def invalidate_user_cache(user_id: str):
    """Invalidate cache for a specific user."""
    try:
        await prediction_cache.invalidate_user_cache(user_id)
        return {"message": f"Cache invalidated for user {user_id}"}
        
    except Exception as e:
        logger.error("Failed to invalidate cache", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Failed to invalidate cache")


@router.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint."""
    try:
        # Update system metrics
        loaded_models = len(model_manager.get_loaded_models())
        performance_monitor.update_system_metrics(loaded_models)
        
        # Return Prometheus metrics
        metrics_data = performance_monitor.get_prometheus_metrics()
        return Response(content=metrics_data, media_type=CONTENT_TYPE_LATEST)
        
    except Exception as e:
        logger.error("Failed to get metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get metrics")


@router.get("/stats")
async def get_stats():
    """Get service statistics."""
    try:
        metrics_summary = performance_monitor.get_metrics_summary()
        memory_usage = model_manager.get_memory_usage()
        cache_stats = await prediction_cache.get_cache_stats()
        
        # Get batch processor stats
        from app.serving.batch_processor import batch_processor
        batch_stats = {}
        if batch_processor:
            batch_stats = await batch_processor.get_queue_stats()
        
        # Get fallback stats
        from app.serving.fallback import fallback_manager
        fallback_stats = fallback_manager.get_fallback_stats()
        
        return {
            "performance": metrics_summary,
            "memory": memory_usage,
            "cache": cache_stats,
            "batch_processing": batch_stats,
            "fallback": fallback_stats,
            "models": {
                "loaded": len(model_manager.get_loaded_models()),
                "active": model_manager.active_model
            }
        }
        
    except Exception as e:
        logger.error("Failed to get stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get stats")


@router.post("/batch/submit")
async def submit_batch_job(
    request: BatchPredictionRequest,
    background_tasks: BackgroundTasks
):
    """Submit a batch prediction job."""
    try:
        from app.serving.batch_processor import batch_processor
        
        if not batch_processor:
            raise HTTPException(status_code=503, detail="Batch processor not available")
        
        job_id = await batch_processor.submit_batch(
            requests=request.requests,
            priority=request.priority,
            callback_url=request.callback_url
        )
        
        return {
            "job_id": job_id,
            "status": "submitted",
            "message": f"Batch job submitted with {len(request.requests)} requests"
        }
        
    except Exception as e:
        logger.error("Failed to submit batch job", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to submit batch job: {str(e)}")


@router.get("/batch/{job_id}/status")
async def get_batch_job_status(job_id: str):
    """Get the status of a batch job."""
    try:
        from app.serving.batch_processor import batch_processor
        
        if not batch_processor:
            raise HTTPException(status_code=503, detail="Batch processor not available")
        
        job = await batch_processor.get_job_status(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "job_id": job.id,
            "status": job.status.value,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "num_requests": len(job.requests),
            "num_results": len(job.results),
            "processing_time": job.processing_time,
            "queue_time": job.queue_time,
            "error_message": job.error_message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get batch job status", error=str(e), job_id=job_id)
        raise HTTPException(status_code=500, detail="Failed to get job status")


@router.get("/batch/{job_id}/results")
async def get_batch_job_results(job_id: str):
    """Get the results of a completed batch job."""
    try:
        from app.serving.batch_processor import batch_processor
        
        if not batch_processor:
            raise HTTPException(status_code=503, detail="Batch processor not available")
        
        job = await batch_processor.get_job_status(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.status.value != "completed":
            raise HTTPException(status_code=400, detail=f"Job is not completed (status: {job.status.value})")
        
        return BatchPredictionResponse(
            batch_id=job.id,
            responses=job.results,
            total_inference_time_ms=job.processing_time * 1000 if job.processing_time else 0,
            items_processed=sum(len(req.candidate_items) for req in job.requests)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get batch job results", error=str(e), job_id=job_id)
        raise HTTPException(status_code=500, detail="Failed to get job results")


@router.get("/experiments")
async def list_ab_experiments():
    """List all A/B testing experiments."""
    try:
        from app.serving.ab_testing import ab_testing_manager
        
        experiments = []
        for exp_id, experiment in ab_testing_manager.experiments.items():
            experiments.append({
                "id": exp_id,
                "name": experiment.name,
                "status": experiment.status.value,
                "num_variants": len(experiment.variants),
                "total_users": experiment.total_users,
                "start_date": experiment.start_date.isoformat() if experiment.start_date else None,
                "end_date": experiment.end_date.isoformat() if experiment.end_date else None
            })
        
        return {
            "experiments": experiments,
            "active_experiment": ab_testing_manager.active_experiment
        }
        
    except Exception as e:
        logger.error("Failed to list experiments", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to list experiments")


@router.get("/experiments/{experiment_id}/results")
async def get_experiment_results(experiment_id: str):
    """Get results for an A/B testing experiment."""
    try:
        from app.serving.ab_testing import ab_testing_manager
        
        results = ab_testing_manager.get_experiment_results(experiment_id)
        return results
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Failed to get experiment results", error=str(e), experiment_id=experiment_id)
        raise HTTPException(status_code=500, detail="Failed to get experiment results")


@router.post("/experiments/{experiment_id}/start")
async def start_experiment(experiment_id: str):
    """Start an A/B testing experiment."""
    try:
        from app.serving.ab_testing import ab_testing_manager
        
        ab_testing_manager.start_experiment(experiment_id)
        return {"message": f"Experiment {experiment_id} started successfully"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Failed to start experiment", error=str(e), experiment_id=experiment_id)
        raise HTTPException(status_code=500, detail="Failed to start experiment")


@router.post("/experiments/{experiment_id}/stop")
async def stop_experiment(experiment_id: str):
    """Stop an A/B testing experiment."""
    try:
        from app.serving.ab_testing import ab_testing_manager
        
        ab_testing_manager.stop_experiment(experiment_id)
        return {"message": f"Experiment {experiment_id} stopped successfully"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Failed to stop experiment", error=str(e), experiment_id=experiment_id)
        raise HTTPException(status_code=500, detail="Failed to stop experiment")


@router.get("/insights/{user_id}")
async def get_user_insights(
    user_id: str,
    explanation_svc: ExplanationService = Depends(get_explanation_service)
):
    """Get personalized insights for a user."""
    try:
        # This would typically get attempt history from database
        # For now, return a placeholder response
        attempt_history = []  # Would be loaded from database
        topic_mastery = {}    # Would be loaded from user service
        item_metadata = {}    # Would be loaded from content service
        
        insights = await explanation_svc.generate_user_insights(
            user_id=user_id,
            attempt_history=attempt_history,
            topic_mastery=topic_mastery,
            item_metadata=item_metadata
        )
        
        return insights
        
    except Exception as e:
        logger.error("Failed to generate user insights", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Failed to generate insights")


@router.post("/bias/detect")
async def detect_bias(
    request: Dict[str, Any],
    explanation_svc: ExplanationService = Depends(get_explanation_service)
):
    """Detect bias in model predictions."""
    try:
        predictions = request.get("predictions", [])
        targets = request.get("targets", [])
        protected_attributes = request.get("protected_attributes", {})
        metrics = request.get("metrics", None)
        
        if not predictions or not targets:
            raise HTTPException(status_code=400, detail="Predictions and targets are required")
        
        if len(predictions) != len(targets):
            raise HTTPException(status_code=400, detail="Predictions and targets must have same length")
        
        bias_report = await explanation_svc.detect_model_bias(
            predictions=predictions,
            targets=targets,
            protected_attributes=protected_attributes,
            metrics=metrics
        )
        
        return bias_report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Bias detection failed", error=str(e))
        raise HTTPException(status_code=500, detail="Bias detection failed")


@router.get("/model/{model_version}/behavior")
async def explain_model_behavior(
    model_version: str,
    explanation_svc: ExplanationService = Depends(get_explanation_service)
):
    """Get model behavior explanation and patterns."""
    try:
        # This would typically analyze recent predictions from the model
        # For now, return a placeholder analysis
        sample_predictions = []  # Would be loaded from recent predictions
        feature_importance = {}  # Would be computed from model
        
        behavior_analysis = await explanation_svc.explain_model_behavior(
            model_version=model_version,
            sample_predictions=sample_predictions,
            feature_importance_global=feature_importance
        )
        
        return behavior_analysis
        
    except Exception as e:
        logger.error("Model behavior explanation failed", error=str(e), model_version=model_version)
        raise HTTPException(status_code=500, detail="Failed to explain model behavior")


@router.delete("/insights/{user_id}/cache")
async def clear_user_insights_cache(
    user_id: str,
    explanation_svc: ExplanationService = Depends(get_explanation_service)
):
    """Clear insights cache for a specific user."""
    try:
        explanation_svc.clear_insights_cache(user_id)
        return {"message": f"Insights cache cleared for user {user_id}"}
        
    except Exception as e:
        logger.error("Failed to clear insights cache", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Failed to clear cache")


@router.delete("/insights/cache")
async def clear_all_insights_cache(
    explanation_svc: ExplanationService = Depends(get_explanation_service)
):
    """Clear all insights cache."""
    try:
        explanation_svc.clear_insights_cache()
        return {"message": "All insights cache cleared"}
        
    except Exception as e:
        logger.error("Failed to clear all insights cache", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to clear cache")