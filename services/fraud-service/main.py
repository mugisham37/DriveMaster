from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List
import uvicorn
import os
import asyncio
from dotenv import load_dotenv

from src.fraud_detector import FraudDetector
from src.kafka_consumer import KafkaConsumerService
from src.models import AttemptAnalysisRequest, SessionAnalysisRequest, FraudAnalysisResponse
from src.database import DatabaseManager
from src.config import get_settings

# Load environment variables
load_dotenv()

# Global services
fraud_detector = None
kafka_consumer = None
db_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global fraud_detector, kafka_consumer, db_manager
    settings = get_settings()
    
    # Initialize database
    db_manager = DatabaseManager(settings.database_url)
    await db_manager.initialize()
    
    # Initialize fraud detector
    fraud_detector = FraudDetector(db_manager, settings)
    await fraud_detector.initialize()
    
    # Initialize Kafka consumer
    kafka_consumer = KafkaConsumerService(fraud_detector, settings)
    
    # Start Kafka consumer in background
    asyncio.create_task(kafka_consumer.start_consuming())
    
    yield
    
    # Shutdown
    if kafka_consumer:
        await kafka_consumer.stop()
    if db_manager:
        await db_manager.close()

app = FastAPI(
    title="Fraud Detection Service",
    description="Fraud detection and anomaly prevention service for adaptive learning platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "fraud-service",
        "version": "1.0.0",
        "kafka_consumer_status": "running" if kafka_consumer and kafka_consumer.is_running else "stopped"
    }

@app.get("/")
async def root():
    return {"message": "Fraud Detection Service is running!"}

@app.post("/analyze/attempt", response_model=FraudAnalysisResponse)
async def analyze_attempt(request: AttemptAnalysisRequest):
    """Analyze a single attempt for fraud indicators"""
    if not fraud_detector:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    
    try:
        result = await fraud_detector.analyze_attempt(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/analyze/session", response_model=FraudAnalysisResponse)
async def analyze_session(request: SessionAnalysisRequest):
    """Analyze a session for fraud indicators"""
    if not fraud_detector:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    
    try:
        result = await fraud_detector.analyze_session(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/fraud-score/{user_id}", response_model=dict)
async def get_fraud_score(user_id: str):
    """Get current fraud score for a user"""
    if not fraud_detector:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    
    try:
        score = await fraud_detector.get_user_fraud_score(user_id)
        return {
            "user_id": user_id,
            "fraud_score": score.score,
            "confidence": score.confidence,
            "risk_level": score.risk_level,
            "last_updated": score.last_updated,
            "flags": score.active_flags
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get fraud score: {str(e)}")

@app.get("/alerts")
async def get_fraud_alerts(limit: int = 50, offset: int = 0):
    """Get recent fraud alerts for admin review"""
    if not fraud_detector:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    
    try:
        alerts = await fraud_detector.get_fraud_alerts(limit, offset)
        return {"alerts": alerts, "total": len(alerts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")

@app.post("/alerts/{alert_id}/review")
async def review_fraud_alert(alert_id: str, action: str, reviewer_id: str, notes: str = ""):
    """Review and take action on a fraud alert"""
    if not fraud_detector:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    
    if action not in ["dismiss", "confirm", "investigate"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    try:
        result = await fraud_detector.review_alert(alert_id, action, reviewer_id, notes)
        return {"success": True, "alert_id": alert_id, "action": action}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to review alert: {str(e)}")

@app.post("/analyze/network")
async def analyze_network_patterns(user_id: str, ip_address: str, device_info: dict = {}):
    """Analyze network patterns for collusion detection"""
    if not fraud_detector:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    
    try:
        score, flags = await fraud_detector.analyze_network_patterns(user_id, ip_address, device_info)
        return {
            "user_id": user_id,
            "network_fraud_score": score,
            "flags": [flag.value for flag in flags],
            "ip_address": ip_address
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Network analysis failed: {str(e)}")

@app.post("/analyze/collusion")
async def detect_collusion(user_ids: List[str]):
    """Detect coordinated behavior across multiple users"""
    if not fraud_detector:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    
    try:
        result = await fraud_detector.detect_coordinated_behavior(user_ids)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Collusion detection failed: {str(e)}")

@app.post("/admin/update-thresholds")
async def update_adaptive_thresholds(feedback_data: List[dict]):
    """Update adaptive thresholds based on feedback"""
    if not fraud_detector:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    
    try:
        await fraud_detector.update_adaptive_thresholds(feedback_data)
        return {"success": True, "message": "Thresholds updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update thresholds: {str(e)}")

@app.post("/admin/retrain-model")
async def retrain_ml_model(training_data: List[dict]):
    """Retrain ML model with new labeled data"""
    if not fraud_detector:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    
    try:
        await fraud_detector.retrain_ml_model(training_data)
        return {"success": True, "message": "Model retrained successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrain model: {str(e)}")

@app.get("/admin/model-insights")
async def get_model_insights():
    """Get insights from the ML model and current system state"""
    if not fraud_detector:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    
    try:
        insights = await fraud_detector.get_model_insights()
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get insights: {str(e)}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8004))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )