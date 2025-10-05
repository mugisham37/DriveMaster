"""Report scheduling service."""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import structlog
from croniter import croniter

from app.core.database import get_db_session
from app.models.reports import ReportSchedule, ReportStatus
from app.services.report_generator import ReportGenerator

logger = structlog.get_logger(__name__)


class ReportScheduler:
    """Service for scheduling and managing recurring reports."""
    
    def __init__(self):
        self.report_generator = ReportGenerator()
        self.running = False
        self.schedules: Dict[str, ReportSchedule] = {}
        self.check_interval = 60  # Check every minute
    
    async def start(self):
        """Start the report scheduler."""
        self.running = True
        logger.info("Report scheduler started")
        
        # Load existing schedules from database
        await self._load_schedules()
        
        # Start the scheduler loop
        asyncio.create_task(self._scheduler_loop())
    
    async def stop(self):
        """Stop the report scheduler."""
        self.running = False
        logger.info("Report scheduler stopped")
    
    async def add_schedule(self, schedule: ReportSchedule) -> str:
        """Add a new report schedule."""
        try:
            # Validate cron expression
            if not croniter.is_valid(schedule.cron_expression):
                raise ValueError(f"Invalid cron expression: {schedule.cron_expression}")
            
            # Calculate next run time
            cron = croniter(schedule.cron_expression, datetime.utcnow())
            schedule.next_run = cron.get_next(datetime)
            
            # Store in database
            async with get_db_session() as db:
                # This would store the schedule in the database
                # For now, just store in memory
                self.schedules[schedule.schedule_id] = schedule
            
            logger.info("Report schedule added", 
                       schedule_id=schedule.schedule_id,
                       next_run=schedule.next_run)
            
            return schedule.schedule_id
            
        except Exception as e:
            logger.error("Failed to add report schedule", error=str(e))
            raise
    
    async def remove_schedule(self, schedule_id: str) -> bool:
        """Remove a report schedule."""
        try:
            if schedule_id in self.schedules:
                del self.schedules[schedule_id]
                
                # Remove from database
                async with get_db_session() as db:
                    # This would remove the schedule from the database
                    pass
                
                logger.info("Report schedule removed", schedule_id=schedule_id)
                return True
            
            return False
            
        except Exception as e:
            logger.error("Failed to remove report schedule", 
                        schedule_id=schedule_id, 
                        error=str(e))
            return False
    
    async def update_schedule(self, schedule_id: str, updates: Dict) -> bool:
        """Update a report schedule."""
        try:
            if schedule_id not in self.schedules:
                return False
            
            schedule = self.schedules[schedule_id]
            
            # Update fields
            for key, value in updates.items():
                if hasattr(schedule, key):
                    setattr(schedule, key, value)
            
            # Recalculate next run if cron expression changed
            if 'cron_expression' in updates:
                if not croniter.is_valid(schedule.cron_expression):
                    raise ValueError(f"Invalid cron expression: {schedule.cron_expression}")
                
                cron = croniter(schedule.cron_expression, datetime.utcnow())
                schedule.next_run = cron.get_next(datetime)
            
            # Update in database
            async with get_db_session() as db:
                # This would update the schedule in the database
                pass
            
            logger.info("Report schedule updated", schedule_id=schedule_id)
            return True
            
        except Exception as e:
            logger.error("Failed to update report schedule", 
                        schedule_id=schedule_id, 
                        error=str(e))
            return False
    
    async def get_schedules(self, active_only: bool = True) -> List[ReportSchedule]:
        """Get all report schedules."""
        schedules = list(self.schedules.values())
        
        if active_only:
            schedules = [s for s in schedules if s.is_active]
        
        return schedules
    
    async def get_schedule(self, schedule_id: str) -> Optional[ReportSchedule]:
        """Get a specific report schedule."""
        return self.schedules.get(schedule_id)
    
    async def trigger_schedule(self, schedule_id: str) -> bool:
        """Manually trigger a scheduled report."""
        try:
            if schedule_id not in self.schedules:
                return False
            
            schedule = self.schedules[schedule_id]
            await self._execute_schedule(schedule)
            
            logger.info("Report schedule triggered manually", schedule_id=schedule_id)
            return True
            
        except Exception as e:
            logger.error("Failed to trigger report schedule", 
                        schedule_id=schedule_id, 
                        error=str(e))
            return False
    
    async def _scheduler_loop(self):
        """Main scheduler loop."""
        while self.running:
            try:
                await self._check_and_execute_schedules()
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                logger.error("Error in scheduler loop", error=str(e))
                await asyncio.sleep(self.check_interval)
    
    async def _check_and_execute_schedules(self):
        """Check for schedules that need to be executed."""
        now = datetime.utcnow()
        
        for schedule in self.schedules.values():
            if not schedule.is_active:
                continue
            
            if schedule.next_run and schedule.next_run <= now:
                try:
                    await self._execute_schedule(schedule)
                    
                    # Calculate next run time
                    cron = croniter(schedule.cron_expression, now)
                    schedule.next_run = cron.get_next(datetime)
                    schedule.last_run = now
                    
                    # Update in database
                    async with get_db_session() as db:
                        # This would update the schedule in the database
                        pass
                    
                except Exception as e:
                    logger.error("Failed to execute scheduled report", 
                                schedule_id=schedule.schedule_id, 
                                error=str(e))
    
    async def _execute_schedule(self, schedule: ReportSchedule):
        """Execute a scheduled report."""
        logger.info("Executing scheduled report", 
                   schedule_id=schedule.schedule_id,
                   report_type=schedule.report_type)
        
        try:
            # Resolve parameter templates
            resolved_parameters = await self._resolve_parameter_templates(schedule.parameters)
            
            # Generate the report
            report_id = await self.report_generator.start_report_generation(
                schedule.report_type, resolved_parameters
            )
            
            # Generate report in background
            asyncio.create_task(
                self.report_generator.generate_report_async(
                    report_id, schedule.report_type, resolved_parameters
                )
            )
            
            # Send email notification if recipients specified
            if schedule.email_recipients:
                asyncio.create_task(
                    self._send_report_notification(
                        schedule, report_id, resolved_parameters
                    )
                )
            
        except Exception as e:
            logger.error("Failed to execute scheduled report", 
                        schedule_id=schedule.schedule_id, 
                        error=str(e))
            raise
    
    async def _resolve_parameter_templates(self, parameters: Dict) -> Dict:
        """Resolve parameter templates like {{last_week_start}}."""
        resolved = {}
        now = datetime.utcnow()
        
        for key, value in parameters.items():
            if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
                template = value[2:-2]  # Remove {{ and }}
                
                if template == "last_week_start":
                    # Start of last week (Monday)
                    days_since_monday = now.weekday()
                    last_monday = now - timedelta(days=days_since_monday + 7)
                    resolved[key] = last_monday.date().isoformat()
                    
                elif template == "last_week_end":
                    # End of last week (Sunday)
                    days_since_monday = now.weekday()
                    last_sunday = now - timedelta(days=days_since_monday + 1)
                    resolved[key] = last_sunday.date().isoformat()
                    
                elif template == "last_month_start":
                    # Start of last month
                    if now.month == 1:
                        last_month_start = now.replace(year=now.year-1, month=12, day=1)
                    else:
                        last_month_start = now.replace(month=now.month-1, day=1)
                    resolved[key] = last_month_start.date().isoformat()
                    
                elif template == "last_month_end":
                    # End of last month
                    first_of_this_month = now.replace(day=1)
                    last_month_end = first_of_this_month - timedelta(days=1)
                    resolved[key] = last_month_end.date().isoformat()
                    
                elif template == "last_quarter_start":
                    # Start of last quarter
                    current_quarter = (now.month - 1) // 3 + 1
                    if current_quarter == 1:
                        last_quarter_start = now.replace(year=now.year-1, month=10, day=1)
                    else:
                        quarter_start_month = (current_quarter - 2) * 3 + 1
                        last_quarter_start = now.replace(month=quarter_start_month, day=1)
                    resolved[key] = last_quarter_start.date().isoformat()
                    
                elif template == "last_quarter_end":
                    # End of last quarter
                    current_quarter = (now.month - 1) // 3 + 1
                    if current_quarter == 1:
                        last_quarter_end = now.replace(year=now.year-1, month=12, day=31)
                    else:
                        quarter_end_month = (current_quarter - 1) * 3
                        # Get last day of the month
                        if quarter_end_month in [1, 3, 5, 7, 8, 10, 12]:
                            last_day = 31
                        elif quarter_end_month in [4, 6, 9, 11]:
                            last_day = 30
                        else:  # February
                            last_day = 29 if now.year % 4 == 0 else 28
                        last_quarter_end = now.replace(month=quarter_end_month, day=last_day)
                    resolved[key] = last_quarter_end.date().isoformat()
                    
                else:
                    # Unknown template, keep as is
                    resolved[key] = value
            else:
                resolved[key] = value
        
        return resolved
    
    async def _send_report_notification(
        self, 
        schedule: ReportSchedule, 
        report_id: str, 
        parameters: Dict
    ):
        """Send email notification about generated report."""
        try:
            # This would implement email sending logic
            # For now, just log the notification
            logger.info("Report notification sent", 
                       schedule_id=schedule.schedule_id,
                       report_id=report_id,
                       recipients=schedule.email_recipients)
            
        except Exception as e:
            logger.error("Failed to send report notification", 
                        schedule_id=schedule.schedule_id,
                        report_id=report_id,
                        error=str(e))
    
    async def _load_schedules(self):
        """Load existing schedules from database."""
        try:
            async with get_db_session() as db:
                # This would load schedules from the database
                # For now, create some sample schedules
                
                sample_schedules = [
                    ReportSchedule(
                        report_type="user_retention_analysis",
                        title="Weekly Retention Report",
                        parameters={
                            "start_date": "{{last_week_start}}",
                            "end_date": "{{last_week_end}}",
                            "cohort_period": "weekly"
                        },
                        cron_expression="0 9 * * MON",  # Every Monday at 9 AM
                        email_recipients=["analytics@company.com"],
                        created_by="system"
                    ),
                    ReportSchedule(
                        report_type="business_intelligence",
                        title="Monthly Executive Summary",
                        parameters={
                            "start_date": "{{last_month_start}}",
                            "end_date": "{{last_month_end}}"
                        },
                        cron_expression="0 8 1 * *",  # First day of month at 8 AM
                        email_recipients=["executives@company.com"],
                        created_by="system"
                    )
                ]
                
                for schedule in sample_schedules:
                    # Calculate next run time
                    cron = croniter(schedule.cron_expression, datetime.utcnow())
                    schedule.next_run = cron.get_next(datetime)
                    
                    self.schedules[schedule.schedule_id] = schedule
            
            logger.info("Loaded report schedules", count=len(self.schedules))
            
        except Exception as e:
            logger.error("Failed to load report schedules", error=str(e))