from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Fraud Detection Service",
    description="Fraud detection and anomaly prevention service for adaptive learning platform",
    version="1.0.0"
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
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {"message": "Fraud Detection Service is running!"}

# TODO: Add fraud detection endpoints
# @app.post("/analyze/attempt")
# @app.post("/analyze/session")
# @app.get("/fraud-score/{user_id}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8004))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )