"""Main application entry point for ML Inference Service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

from app.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.model_manager import model_manager
from app.core.cache import prediction_cache
from app.api.routes import router
from app.services.inference import InferenceService
from app.services.explanation import ExplanationService

# Load environment variables
load_dotenv()

# Configure logging
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting ML Inference Service")
    
    try:
        # Initialize core components
        await prediction_cache.connect()
        await model_manager.initialize()
        
        # Initialize services
        inference_service = InferenceService()
        await inference_service.initialize()
        
        explanation_service = ExplanationService(inference_service)
        await explanation_service.initialize()
        
        # Initialize serving components
        from app.serving.batch_processor import initialize_batch_processor
        from app.serving.fallback import fallback_manager
        from app.serving.ab_testing import ab_testing_manager
        
        # Set up fallback manager
        fallback_manager.set_primary_inference_function(inference_service.predict_single)
        ab_testing_manager.set_default_inference_function(inference_service.predict_single)
        
        # Initialize batch processor with fallback-enabled inference
        await initialize_batch_processor(fallback_manager.predict_with_fallback)
        
        # Store services in app state for dependency injection
        app.state.inference_service = inference_service
        app.state.explanation_service = explanation_service
        
        # Update route dependencies
        from app.api import routes
        routes.inference_service = inference_service
        routes.explanation_service = explanation_service
        
        logger.info("ML Inference Service started successfully")
        
        yield
        
    except Exception as e:
        logger.error("Failed to start ML Inference Service", error=str(e))
        raise
    finally:
        # Cleanup
        logger.info("Shutting down ML Inference Service")
        
        # Shutdown serving components
        from app.serving.batch_processor import shutdown_batch_processor
        await shutdown_batch_processor()
        
        await prediction_cache.disconnect()


# Create FastAPI application
app = FastAPI(
    title="ML Inference Service",
    description="Machine Learning inference service for adaptive learning platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api/v1")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "ML Inference Service is running!",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=(settings.environment == "development"),
        log_level=settings.log_level.lower()
    )