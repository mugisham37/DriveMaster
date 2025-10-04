"""
Monitoring and alerting utilities for ML training pipeline

This module provides comprehensive monitoring capabilities for the ML training
pipeline, including performance tracking, resource monitoring, and alerting.

Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
"""

import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
import psutil
import GPUtil
import mlflow
from prometheus_client import CollectorRegistry, Gauge, Counter, Histogram, push_to_gateway
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import requests
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class AlertConfig:
    """Configuration for alerting system"""
    email_enabled: bool = True
    slack_enabled: bool = False
    webhook_enabled: bool = False
    
    # Email configuration
    smtp_server: str = "localhost"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    from_email: str = "ml-pipeline@company.com"
    to_emails: List[str] = None
    
    # Slack configuration
    slack_webhook_url: str = ""
    slack_channel: str = "#ml-alerts"
    
    # Generic webhook configuration
    webhook_url: str = ""
    webhook_headers: Dict[str, str] = None
    
    def __post_init__(self):
        if self.to_emails is None:
            self.to_emails = []
        if self.webhook_headers is None:
            self.webhook_headers = {}


@dataclass
class MetricThresholds:
    """Thresholds for monitoring metrics"""
    # Resource thresholds
    max_cpu_usage: float = 90.0  # percentage
    max_memory_usage: float = 85.0  # percentage
    max_gpu_memory_usage: float = 90.0  # percentage
    min_disk_space_gb: float = 10.0
    
    # Training thresholds
    max_training_time_hours: float = 24.0
    min_validation_improvement: float = 0.001
    max_validation_loss: float = 1.0
    min_training_accuracy: float = 0.5
    
    # Data quality thresholds
    min_data_completeness: float = 0.95
    max_null_percentage: float = 5.0
    min_records_per_user: int = 5
    
    # Performance thresholds
    max_inference_time_ms: float = 100.0
    min_throughput_rps: float = 10.0


class SystemMonitor:
    """
    Monitors system resources and performance metrics
    """
    
    def __init__(self, thresholds: MetricThresholds):
        self.thresholds = thresholds
        self.registry = CollectorRegistry()
        self._setup_metrics()
    
    def _setup_metrics(self):
        """Setup Prometheus metrics"""
        self.cpu_usage = Gauge('ml_pipeline_cpu_usage_percent', 'CPU usage percentage', registry=self.registry)
        self.memory_usage = Gauge('ml_pipeline_memory_usage_percent', 'Memory usage percentage', registry=self.registry)
        self.disk_usage = Gauge('ml_pipeline_disk_usage_percent', 'Disk usage percentage', registry=self.registry)
        self.gpu_usage = Gauge('ml_pipeline_gpu_usage_percent', 'GPU usage percentage', ['gpu_id'], registry=self.registry)
        self.gpu_memory = Gauge('ml_pipeline_gpu_memory_usage_percent', 'GPU memory usage percentage', ['gpu_id'], registry=self.registry)
        
        self.training_duration = Histogram('ml_pipeline_training_duration_seconds', 'Training duration in seconds', registry=self.registry)
        self.data_processing_duration = Histogram('ml_pipeline_data_processing_duration_seconds', 'Data processing duration', registry=self.registry)
        
        self.training_loss = Gauge('ml_pipeline_training_loss', 'Current training loss', registry=self.registry)
        self.validation_loss = Gauge('ml_pipeline_validation_loss', 'Current validation loss', registry=self.registry)
        self.model_accuracy = Gauge('ml_pipeline_model_accuracy', 'Current model accuracy', registry=self.registry)
        
        self.pipeline_errors = Counter('ml_pipeline_errors_total', 'Total pipeline errors', ['error_type'], registry=self.registry)
        self.data_quality_score = Gauge('ml_pipeline_data_quality_score', 'Data quality score (0-1)', registry=self.registry)
    
    def collect_system_metrics(self) -> Dict[str, Any]:
        """
        Collect current system metrics
        
        Returns:
            Dictionary of system metrics
        """
        metrics = {
            'timestamp': datetime.utcnow().isoformat(),
            'cpu': {},
            'memory': {},
            'disk': {},
            'gpu': []
        }
        
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
        
        metrics['cpu'] = {
            'usage_percent': cpu_percent,
            'count': cpu_count,
            'load_avg_1m': load_avg[0],
            'load_avg_5m': load_avg[1],
            'load_avg_15m': load_avg[2]
        }
        
        self.cpu_usage.set(cpu_percent)
        
        # Memory metrics
        memory = psutil.virtual_memory()
        metrics['memory'] = {
            'total_gb': memory.total / (1024**3),
            'available_gb': memory.available / (1024**3),
            'used_gb': memory.used / (1024**3),
            'usage_percent': memory.percent
        }
        
        self.memory_usage.set(memory.percent)
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        metrics['disk'] = {
            'total_gb': disk.total / (1024**3),
            'free_gb': disk.free / (1024**3),
            'used_gb': disk.used / (1024**3),
            'usage_percent': (disk.used / disk.total) * 100
        }
        
        self.disk_usage.set(metrics['disk']['usage_percent'])
        
        # GPU metrics
        try:
            gpus = GPUtil.getGPUs()
            for i, gpu in enumerate(gpus):
                gpu_metrics = {
                    'id': i,
                    'name': gpu.name,
                    'usage_percent': gpu.load * 100,
                    'memory_usage_percent': gpu.memoryUtil * 100,
                    'memory_total_mb': gpu.memoryTotal,
                    'memory_used_mb': gpu.memoryUsed,
                    'memory_free_mb': gpu.memoryFree,
                    'temperature_c': gpu.temperature
                }
                metrics['gpu'].append(gpu_metrics)
                
                self.gpu_usage.labels(gpu_id=str(i)).set(gpu_metrics['usage_percent'])
                self.gpu_memory.labels(gpu_id=str(i)).set(gpu_metrics['memory_usage_percent'])
                
        except Exception as e:
            logger.warning(f"Error collecting GPU metrics: {e}")
        
        return metrics
    
    def check_resource_thresholds(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Check if any resource metrics exceed thresholds
        
        Args:
            metrics: System metrics dictionary
            
        Returns:
            List of threshold violations
        """
        violations = []
        
        # CPU threshold
        if metrics['cpu']['usage_percent'] > self.thresholds.max_cpu_usage:
            violations.append({
                'type': 'cpu_usage',
                'current': metrics['cpu']['usage_percent'],
                'threshold': self.thresholds.max_cpu_usage,
                'severity': 'warning'
            })
        
        # Memory threshold
        if metrics['memory']['usage_percent'] > self.thresholds.max_memory_usage:
            violations.append({
                'type': 'memory_usage',
                'current': metrics['memory']['usage_percent'],
                'threshold': self.thresholds.max_memory_usage,
                'severity': 'warning'
            })
        
        # Disk space threshold
        if metrics['disk']['free_gb'] < self.thresholds.min_disk_space_gb:
            violations.append({
                'type': 'disk_space',
                'current': metrics['disk']['free_gb'],
                'threshold': self.thresholds.min_disk_space_gb,
                'severity': 'critical'
            })
        
        # GPU thresholds
        for gpu in metrics['gpu']:
            if gpu['memory_usage_percent'] > self.thresholds.max_gpu_memory_usage:
                violations.append({
                    'type': 'gpu_memory_usage',
                    'gpu_id': gpu['id'],
                    'current': gpu['memory_usage_percent'],
                    'threshold': self.thresholds.max_gpu_memory_usage,
                    'severity': 'warning'
                })
        
        return violations
    
    def push_metrics_to_prometheus(self, gateway_url: str, job_name: str = 'ml_pipeline'):
        """
        Push metrics to Prometheus pushgateway
        
        Args:
            gateway_url: Prometheus pushgateway URL
            job_name: Job name for metrics
        """
        try:
            push_to_gateway(gateway_url, job=job_name, registry=self.registry)
            logger.info(f"Metrics pushed to Prometheus gateway: {gateway_url}")
        except Exception as e:
            logger.error(f"Error pushing metrics to Prometheus: {e}")


class TrainingMonitor:
    """
    Monitors ML training progress and performance
    """
    
    def __init__(self, thresholds: MetricThresholds, mlflow_tracking_uri: str):
        self.thresholds = thresholds
        mlflow.set_tracking_uri(mlflow_tracking_uri)
        self.training_start_time = None
        self.best_validation_loss = float('inf')
        self.epochs_without_improvement = 0
    
    def start_training_monitoring(self, run_id: str):
        """
        Start monitoring a training run
        
        Args:
            run_id: MLflow run ID
        """
        self.training_start_time = datetime.utcnow()
        self.run_id = run_id
        logger.info(f"Started monitoring training run: {run_id}")
    
    def log_training_metrics(self, epoch: int, metrics: Dict[str, float]):
        """
        Log training metrics and check for issues
        
        Args:
            epoch: Current epoch number
            metrics: Training metrics dictionary
        """
        # Log to MLflow
        with mlflow.start_run(run_id=self.run_id):
            mlflow.log_metrics(metrics, step=epoch)
        
        # Check for training issues
        issues = self._check_training_issues(epoch, metrics)
        
        if issues:
            logger.warning(f"Training issues detected at epoch {epoch}: {issues}")
        
        # Update best validation loss
        val_loss = metrics.get('validation_loss')
        if val_loss is not None:
            if val_loss < self.best_validation_loss - self.thresholds.min_validation_improvement:
                self.best_validation_loss = val_loss
                self.epochs_without_improvement = 0
            else:
                self.epochs_without_improvement += 1
    
    def _check_training_issues(self, epoch: int, metrics: Dict[str, float]) -> List[str]:
        """
        Check for training issues based on metrics
        
        Args:
            epoch: Current epoch
            metrics: Training metrics
            
        Returns:
            List of detected issues
        """
        issues = []
        
        # Check training time
        if self.training_start_time:
            elapsed_hours = (datetime.utcnow() - self.training_start_time).total_seconds() / 3600
            if elapsed_hours > self.thresholds.max_training_time_hours:
                issues.append(f"Training time exceeded {self.thresholds.max_training_time_hours} hours")
        
        # Check validation loss
        val_loss = metrics.get('validation_loss')
        if val_loss and val_loss > self.thresholds.max_validation_loss:
            issues.append(f"Validation loss too high: {val_loss}")
        
        # Check training accuracy
        train_acc = metrics.get('training_accuracy')
        if train_acc and train_acc < self.thresholds.min_training_accuracy:
            issues.append(f"Training accuracy too low: {train_acc}")
        
        # Check for lack of improvement
        if self.epochs_without_improvement > 10:  # Configurable threshold
            issues.append(f"No improvement for {self.epochs_without_improvement} epochs")
        
        # Check for NaN or infinite values
        for metric_name, value in metrics.items():
            if not isinstance(value, (int, float)) or value != value or abs(value) == float('inf'):
                issues.append(f"Invalid value for {metric_name}: {value}")
        
        return issues
    
    def get_training_summary(self) -> Dict[str, Any]:
        """
        Get summary of current training progress
        
        Returns:
            Training summary dictionary
        """
        summary = {
            'run_id': getattr(self, 'run_id', None),
            'start_time': self.training_start_time.isoformat() if self.training_start_time else None,
            'elapsed_time_hours': None,
            'best_validation_loss': self.best_validation_loss,
            'epochs_without_improvement': self.epochs_without_improvement
        }
        
        if self.training_start_time:
            elapsed = datetime.utcnow() - self.training_start_time
            summary['elapsed_time_hours'] = elapsed.total_seconds() / 3600
        
        return summary


class DataQualityMonitor:
    """
    Monitors data quality throughout the pipeline
    """
    
    def __init__(self, thresholds: MetricThresholds):
        self.thresholds = thresholds
    
    def assess_data_quality(self, data_stats: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess data quality based on statistics
        
        Args:
            data_stats: Data statistics dictionary
            
        Returns:
            Data quality assessment
        """
        assessment = {
            'overall_score': 1.0,
            'issues': [],
            'metrics': {}
        }
        
        # Check data completeness
        total_records = data_stats.get('total_records', 0)
        null_count = data_stats.get('null_count', 0)
        
        if total_records > 0:
            completeness = 1 - (null_count / total_records)
            assessment['metrics']['completeness'] = completeness
            
            if completeness < self.thresholds.min_data_completeness:
                assessment['issues'].append(f"Low data completeness: {completeness:.3f}")
                assessment['overall_score'] *= 0.8
        
        # Check null percentage
        null_percentage = data_stats.get('null_percentage', 0)
        assessment['metrics']['null_percentage'] = null_percentage
        
        if null_percentage > self.thresholds.max_null_percentage:
            assessment['issues'].append(f"High null percentage: {null_percentage:.1f}%")
            assessment['overall_score'] *= 0.7
        
        # Check user coverage
        unique_users = data_stats.get('unique_users', 0)
        records_per_user = total_records / unique_users if unique_users > 0 else 0
        assessment['metrics']['records_per_user'] = records_per_user
        
        if records_per_user < self.thresholds.min_records_per_user:
            assessment['issues'].append(f"Low records per user: {records_per_user:.1f}")
            assessment['overall_score'] *= 0.9
        
        # Check temporal distribution
        time_range_days = data_stats.get('time_range_days', 0)
        assessment['metrics']['time_range_days'] = time_range_days
        
        if time_range_days < 1:
            assessment['issues'].append("Insufficient temporal coverage")
            assessment['overall_score'] *= 0.8
        
        return assessment


class AlertManager:
    """
    Manages alerts and notifications for the ML pipeline
    """
    
    def __init__(self, config: AlertConfig):
        self.config = config
    
    def send_alert(
        self,
        title: str,
        message: str,
        severity: str = 'warning',
        context: Dict[str, Any] = None
    ):
        """
        Send alert through configured channels
        
        Args:
            title: Alert title
            message: Alert message
            severity: Alert severity (info, warning, critical)
            context: Additional context information
        """
        alert_data = {
            'title': title,
            'message': message,
            'severity': severity,
            'timestamp': datetime.utcnow().isoformat(),
            'context': context or {}
        }
        
        logger.info(f"Sending alert: {title} ({severity})")
        
        if self.config.email_enabled:
            self._send_email_alert(alert_data)
        
        if self.config.slack_enabled:
            self._send_slack_alert(alert_data)
        
        if self.config.webhook_enabled:
            self._send_webhook_alert(alert_data)
    
    def _send_email_alert(self, alert_data: Dict[str, Any]):
        """Send alert via email"""
        try:
            msg = MimeMultipart()
            msg['From'] = self.config.from_email
            msg['To'] = ', '.join(self.config.to_emails)
            msg['Subject'] = f"[ML Pipeline Alert] {alert_data['title']}"
            
            body = f"""
            Alert: {alert_data['title']}
            Severity: {alert_data['severity']}
            Time: {alert_data['timestamp']}
            
            Message:
            {alert_data['message']}
            
            Context:
            {json.dumps(alert_data['context'], indent=2)}
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            server = smtplib.SMTP(self.config.smtp_server, self.config.smtp_port)
            if self.config.smtp_username:
                server.starttls()
                server.login(self.config.smtp_username, self.config.smtp_password)
            
            server.send_message(msg)
            server.quit()
            
            logger.info("Email alert sent successfully")
            
        except Exception as e:
            logger.error(f"Error sending email alert: {e}")
    
    def _send_slack_alert(self, alert_data: Dict[str, Any]):
        """Send alert via Slack webhook"""
        try:
            color_map = {
                'info': '#36a64f',
                'warning': '#ff9500',
                'critical': '#ff0000'
            }
            
            payload = {
                'channel': self.config.slack_channel,
                'attachments': [{
                    'color': color_map.get(alert_data['severity'], '#36a64f'),
                    'title': alert_data['title'],
                    'text': alert_data['message'],
                    'fields': [
                        {
                            'title': 'Severity',
                            'value': alert_data['severity'],
                            'short': True
                        },
                        {
                            'title': 'Time',
                            'value': alert_data['timestamp'],
                            'short': True
                        }
                    ],
                    'footer': 'ML Pipeline Monitor',
                    'ts': int(time.time())
                }]
            }
            
            response = requests.post(
                self.config.slack_webhook_url,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            
            logger.info("Slack alert sent successfully")
            
        except Exception as e:
            logger.error(f"Error sending Slack alert: {e}")
    
    def _send_webhook_alert(self, alert_data: Dict[str, Any]):
        """Send alert via generic webhook"""
        try:
            headers = {'Content-Type': 'application/json'}
            headers.update(self.config.webhook_headers)
            
            response = requests.post(
                self.config.webhook_url,
                json=alert_data,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            logger.info("Webhook alert sent successfully")
            
        except Exception as e:
            logger.error(f"Error sending webhook alert: {e}")


class PipelineMonitor:
    """
    Main monitoring orchestrator for the ML pipeline
    """
    
    def __init__(
        self,
        thresholds: MetricThresholds,
        alert_config: AlertConfig,
        mlflow_tracking_uri: str,
        prometheus_gateway_url: str = None
    ):
        self.system_monitor = SystemMonitor(thresholds)
        self.training_monitor = TrainingMonitor(thresholds, mlflow_tracking_uri)
        self.data_quality_monitor = DataQualityMonitor(thresholds)
        self.alert_manager = AlertManager(alert_config)
        self.prometheus_gateway_url = prometheus_gateway_url
        
        self.monitoring_active = False
        self.monitoring_interval = 60  # seconds
    
    def start_monitoring(self):
        """Start continuous monitoring"""
        self.monitoring_active = True
        logger.info("Pipeline monitoring started")
    
    def stop_monitoring(self):
        """Stop continuous monitoring"""
        self.monitoring_active = False
        logger.info("Pipeline monitoring stopped")
    
    def run_monitoring_cycle(self) -> Dict[str, Any]:
        """
        Run a single monitoring cycle
        
        Returns:
            Monitoring results
        """
        results = {
            'timestamp': datetime.utcnow().isoformat(),
            'system_metrics': None,
            'violations': [],
            'alerts_sent': 0
        }
        
        try:
            # Collect system metrics
            system_metrics = self.system_monitor.collect_system_metrics()
            results['system_metrics'] = system_metrics
            
            # Check for threshold violations
            violations = self.system_monitor.check_resource_thresholds(system_metrics)
            results['violations'] = violations
            
            # Send alerts for violations
            for violation in violations:
                self._handle_violation(violation)
                results['alerts_sent'] += 1
            
            # Push metrics to Prometheus if configured
            if self.prometheus_gateway_url:
                self.system_monitor.push_metrics_to_prometheus(self.prometheus_gateway_url)
            
        except Exception as e:
            logger.error(f"Error in monitoring cycle: {e}")
            results['error'] = str(e)
        
        return results
    
    def _handle_violation(self, violation: Dict[str, Any]):
        """Handle a threshold violation"""
        title = f"Resource Threshold Violation: {violation['type']}"
        message = f"Current value: {violation['current']}, Threshold: {violation['threshold']}"
        
        self.alert_manager.send_alert(
            title=title,
            message=message,
            severity=violation['severity'],
            context=violation
        )
    
    def monitor_training_run(self, run_id: str, monitoring_callback: Callable = None):
        """
        Monitor a specific training run
        
        Args:
            run_id: MLflow run ID
            monitoring_callback: Optional callback for custom monitoring logic
        """
        self.training_monitor.start_training_monitoring(run_id)
        
        if monitoring_callback:
            monitoring_callback(self.training_monitor)
    
    def assess_pipeline_health(self) -> Dict[str, Any]:
        """
        Assess overall pipeline health
        
        Returns:
            Pipeline health assessment
        """
        health = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'components': {}
        }
        
        # Check system resources
        system_metrics = self.system_monitor.collect_system_metrics()
        violations = self.system_monitor.check_resource_thresholds(system_metrics)
        
        health['components']['system'] = {
            'status': 'healthy' if not violations else 'degraded',
            'violations': len(violations)
        }
        
        # Check training status
        training_summary = self.training_monitor.get_training_summary()
        health['components']['training'] = {
            'status': 'active' if training_summary['run_id'] else 'idle',
            'summary': training_summary
        }
        
        # Overall status
        if violations:
            health['status'] = 'degraded'
        
        return health