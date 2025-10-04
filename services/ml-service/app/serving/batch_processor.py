"""Batch prediction processing with request queuing."""

import asyncio
import time
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import uuid
from enum import Enum

from app.models.schemas import PredictionRequest, PredictionResponse
from app.core.logging import get_logger
from app.config import settings

logger = get_logger(__name__)


class BatchStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class BatchJob:
    """Represents a batch prediction job."""
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    requests: List[PredictionRequest] = field(default_factory=list)
    priority: str = "normal"  # low, normal, high
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: BatchStatus = BatchStatus.QUEUED
    results: List[PredictionResponse] = field(default_factory=list)
    error_message: Optional[str] = None
    callback_url: Optional[str] = None
    
    @property
    def processing_time(self) -> Optional[float]:
        """Get processing time in seconds."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    @property
    def queue_time(self) -> Optional[float]:
        """Get queue time in seconds."""
        if self.started_at:
            return (self.started_at - self.created_at).total_seconds()
        return None


class BatchProcessor:
    """Handles batch prediction processing with queuing and prioritization."""
    
    def __init__(
        self,
        inference_function: Callable,
        max_batch_size: int = 32,
        max_queue_size: int = 1000,
        batch_timeout: float = 5.0,
        max_workers: int = 4
    ):
        self.inference_function = inference_function
        self.max_batch_size = max_batch_size
        self.max_queue_size = max_queue_size
        self.batch_timeout = batch_timeout
        self.max_workers = max_workers
        
        # Queues for different priorities
        self.high_priority_queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self.normal_priority_queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self.low_priority_queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        
        # Job tracking
        self.active_jobs: Dict[str, BatchJob] = {}
        self.completed_jobs: Dict[str, BatchJob] = {}
        self.job_history_limit = 10000
        
        # Worker management
        self.workers: List[asyncio.Task] = []
        self.is_running = False
        
        # Metrics
        self.total_jobs_processed = 0
        self.total_requests_processed = 0
        self.total_processing_time = 0.0
        
        # Semaphore for controlling concurrent workers
        self.worker_semaphore = asyncio.Semaphore(max_workers)
    
    async def start(self) -> None:
        """Start the batch processor workers."""
        if self.is_running:
            return
        
        self.is_running = True
        
        # Start worker tasks
        for i in range(self.max_workers):
            worker_task = asyncio.create_task(self._worker(f"worker-{i}"))
            self.workers.append(worker_task)
        
        logger.info(
            "Batch processor started",
            max_workers=self.max_workers,
            max_batch_size=self.max_batch_size,
            batch_timeout=self.batch_timeout
        )
    
    async def stop(self) -> None:
        """Stop the batch processor workers."""
        if not self.is_running:
            return
        
        self.is_running = False
        
        # Cancel all workers
        for worker in self.workers:
            worker.cancel()
        
        # Wait for workers to finish
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()
        
        logger.info("Batch processor stopped")
    
    async def submit_batch(
        self,
        requests: List[PredictionRequest],
        priority: str = "normal",
        callback_url: Optional[str] = None
    ) -> str:
        """Submit a batch job for processing."""
        
        if not self.is_running:
            raise RuntimeError("Batch processor is not running")
        
        if len(requests) == 0:
            raise ValueError("Empty request list")
        
        # Create batch job
        job = BatchJob(
            requests=requests,
            priority=priority,
            callback_url=callback_url
        )
        
        # Add to appropriate queue
        try:
            if priority == "high":
                await self.high_priority_queue.put(job)
            elif priority == "low":
                await self.low_priority_queue.put(job)
            else:
                await self.normal_priority_queue.put(job)
            
            self.active_jobs[job.id] = job
            
            logger.info(
                "Batch job submitted",
                job_id=job.id,
                num_requests=len(requests),
                priority=priority
            )
            
            return job.id
            
        except asyncio.QueueFull:
            raise RuntimeError("Batch queue is full")
    
    async def get_job_status(self, job_id: str) -> Optional[BatchJob]:
        """Get the status of a batch job."""
        
        # Check active jobs first
        if job_id in self.active_jobs:
            return self.active_jobs[job_id]
        
        # Check completed jobs
        if job_id in self.completed_jobs:
            return self.completed_jobs[job_id]
        
        return None
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get current queue statistics."""
        
        return {
            "is_running": self.is_running,
            "active_workers": len([w for w in self.workers if not w.done()]),
            "queue_sizes": {
                "high_priority": self.high_priority_queue.qsize(),
                "normal_priority": self.normal_priority_queue.qsize(),
                "low_priority": self.low_priority_queue.qsize()
            },
            "active_jobs": len(self.active_jobs),
            "completed_jobs": len(self.completed_jobs),
            "metrics": {
                "total_jobs_processed": self.total_jobs_processed,
                "total_requests_processed": self.total_requests_processed,
                "average_processing_time": (
                    self.total_processing_time / max(self.total_jobs_processed, 1)
                )
            }
        }
    
    async def _worker(self, worker_name: str) -> None:
        """Worker coroutine that processes batch jobs."""
        
        logger.info("Batch worker started", worker=worker_name)
        
        while self.is_running:
            try:
                # Get next job with priority ordering
                job = await self._get_next_job()
                
                if job is None:
                    continue
                
                async with self.worker_semaphore:
                    await self._process_job(job, worker_name)
                
            except asyncio.CancelledError:
                logger.info("Batch worker cancelled", worker=worker_name)
                break
            except Exception as e:
                logger.error("Batch worker error", worker=worker_name, error=str(e))
                await asyncio.sleep(1)  # Brief pause before retrying
        
        logger.info("Batch worker stopped", worker=worker_name)
    
    async def _get_next_job(self) -> Optional[BatchJob]:
        """Get the next job from queues with priority ordering."""
        
        # Try high priority first
        try:
            return self.high_priority_queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
        
        # Try normal priority
        try:
            return self.normal_priority_queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
        
        # Try low priority
        try:
            return self.low_priority_queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
        
        # Wait for any job with timeout
        try:
            # Use asyncio.wait_for with a timeout to avoid blocking indefinitely
            done, pending = await asyncio.wait(
                [
                    asyncio.create_task(self.high_priority_queue.get()),
                    asyncio.create_task(self.normal_priority_queue.get()),
                    asyncio.create_task(self.low_priority_queue.get())
                ],
                timeout=1.0,
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel pending tasks
            for task in pending:
                task.cancel()
            
            if done:
                return await done.pop()
            
        except asyncio.TimeoutError:
            pass
        
        return None
    
    async def _process_job(self, job: BatchJob, worker_name: str) -> None:
        """Process a single batch job."""
        
        job.status = BatchStatus.PROCESSING
        job.started_at = datetime.now()
        
        logger.info(
            "Processing batch job",
            job_id=job.id,
            worker=worker_name,
            num_requests=len(job.requests),
            priority=job.priority
        )
        
        try:
            # Process requests in smaller batches if needed
            all_results = []
            
            for i in range(0, len(job.requests), self.max_batch_size):
                batch_requests = job.requests[i:i + self.max_batch_size]
                
                # Call inference function
                batch_results = await self.inference_function(batch_requests)
                all_results.extend(batch_results)
            
            # Update job with results
            job.results = all_results
            job.status = BatchStatus.COMPLETED
            job.completed_at = datetime.now()
            
            # Update metrics
            self.total_jobs_processed += 1
            self.total_requests_processed += len(job.requests)
            if job.processing_time:
                self.total_processing_time += job.processing_time
            
            logger.info(
                "Batch job completed",
                job_id=job.id,
                worker=worker_name,
                processing_time=job.processing_time,
                queue_time=job.queue_time
            )
            
            # Send callback if configured
            if job.callback_url:
                await self._send_callback(job)
            
        except Exception as e:
            job.status = BatchStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.now()
            
            logger.error(
                "Batch job failed",
                job_id=job.id,
                worker=worker_name,
                error=str(e)
            )
        
        finally:
            # Move job to completed jobs
            if job.id in self.active_jobs:
                del self.active_jobs[job.id]
            
            self.completed_jobs[job.id] = job
            
            # Limit completed job history
            if len(self.completed_jobs) > self.job_history_limit:
                # Remove oldest jobs
                oldest_jobs = sorted(
                    self.completed_jobs.items(),
                    key=lambda x: x[1].completed_at or datetime.min
                )
                
                for job_id, _ in oldest_jobs[:len(self.completed_jobs) - self.job_history_limit]:
                    del self.completed_jobs[job_id]
    
    async def _send_callback(self, job: BatchJob) -> None:
        """Send callback notification for completed job."""
        
        try:
            import aiohttp
            
            callback_data = {
                "job_id": job.id,
                "status": job.status.value,
                "num_requests": len(job.requests),
                "num_results": len(job.results),
                "processing_time": job.processing_time,
                "queue_time": job.queue_time,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                "error_message": job.error_message
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    job.callback_url,
                    json=callback_data,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        logger.info("Callback sent successfully", job_id=job.id, url=job.callback_url)
                    else:
                        logger.warning(
                            "Callback failed",
                            job_id=job.id,
                            url=job.callback_url,
                            status=response.status
                        )
        
        except Exception as e:
            logger.error("Callback error", job_id=job.id, url=job.callback_url, error=str(e))


# Global batch processor instance
batch_processor: Optional[BatchProcessor] = None


async def initialize_batch_processor(inference_function: Callable) -> None:
    """Initialize the global batch processor."""
    global batch_processor
    
    if batch_processor is None:
        batch_processor = BatchProcessor(
            inference_function=inference_function,
            max_batch_size=settings.batch_size,
            batch_timeout=settings.batch_timeout,
            max_workers=settings.max_workers
        )
        
        await batch_processor.start()
        logger.info("Global batch processor initialized")


async def shutdown_batch_processor() -> None:
    """Shutdown the global batch processor."""
    global batch_processor
    
    if batch_processor is not None:
        await batch_processor.stop()
        batch_processor = None
        logger.info("Global batch processor shutdown")