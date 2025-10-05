"""Business Intelligence Reporting Service."""

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime
import structlog

from app.core.config import settings
from app.core.database import init_database, close_database
from app.services.report_generator import ReportGenerator
from app.services.analytics_engine import AnalyticsEngine
from app.services.scheduler import ReportScheduler
from app.api.routes import reports, analytics, insights
from app.models.reports import ReportStatus, ReportResponse

logger = structlog.get_logger(__name__)

# Global services
report_generator = ReportGenerator()
analytics_engine = AnalyticsEngine()
report_scheduler = ReportScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    logger.info("Starting BI Reporting service")
    
    # Initialize database
    await init_database()
    
    # Start background tasks
    asyncio.create_task(report_scheduler.start())
    
    yield
    
    # Shutdown
    logger.info("Shutting down BI Reporting service")
    await report_scheduler.stop()
    await close_database()

app = FastAPI(
    title="Business Intelligence Reporting API",
    description="Advanced analytics and reporting for Adaptive Learning Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(insights.router, prefix="/api/v1/insights", tags=["insights"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "BI Reporting",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "healthy",
                "redis": "healthy",
                "report_generator": "healthy",
                "analytics_engine": "healthy"
            }
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Service unhealthy")


@app.post("/api/v1/reports/generate")
async def generate_report(
    report_type: str,
    parameters: dict,
    background_tasks: BackgroundTasks
):
    """Generate a report asynchronously."""
    try:
        # Start report generation in background
        report_id = await report_generator.start_report_generation(
            report_type, parameters
        )
        
        # Add background task
        background_tasks.add_task(
            report_generator.generate_report_async,
            report_id, report_type, parameters
        )
        
        return {
            "report_id": report_id,
            "status": ReportStatus.PENDING,
            "message": "Report generation started",
            "estimated_completion": "5-10 minutes"
        }
        
    except Exception as e:
        logger.error("Failed to start report generation", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to start report generation")


@app.get("/api/v1/reports/{report_id}/download")
async def download_report(report_id: str):
    """Download a generated report."""
    try:
        file_path = await report_generator.get_report_file(report_id)
        
        if not file_path:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return FileResponse(
            path=file_path,
            filename=f"report_{report_id}.pdf",
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to download report", report_id=report_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to download report")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )