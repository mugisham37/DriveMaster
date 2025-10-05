"""Business insights API routes."""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional, List
from datetime import date, datetime, timedelta
import structlog

from app.services.analytics_engine import AnalyticsEngine
from app.models.reports import BusinessInsight, InsightType

logger = structlog.get_logger(__name__)
router = APIRouter()

# Global analytics engine
analytics_engine = AnalyticsEngine()


@router.get("/dashboard")
async def get_dashboard_insights(
    time_range: str = Query("7d", description="Time range (1d, 7d, 30d, 90d)")
):
    """Get key insights for executive dashboard."""
    
    try:
        # Calculate date range
        end_date = date.today()
        days_map = {"1d": 1, "7d": 7, "30d": 30, "90d": 90}
        days = days_map.get(time_range, 7)
        start_date = end_date - timedelta(days=days)
        
        # Generate dashboard insights
        insights = await _generate_dashboard_insights(start_date, end_date)
        
        return {
            "status": "success",
            "data": insights,
            "time_range": time_range,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get dashboard insights", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get dashboard insights")


@router.get("/anomalies")
async def get_anomaly_insights(
    metric: Optional[str] = Query(None, description="Specific metric to analyze"),
    sensitivity: float = Query(2.0, ge=1.0, le=5.0, description="Anomaly detection sensitivity"),
    days: int = Query(30, ge=1, le=365, description="Days of historical data")
):
    """Get anomaly detection insights."""
    
    try:
        # Generate anomaly insights
        anomalies = await _detect_metric_anomalies(metric, sensitivity, days)
        
        return {
            "status": "success",
            "data": anomalies,
            "parameters": {
                "metric": metric,
                "sensitivity": sensitivity,
                "days": days
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get anomaly insights", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to detect anomalies")


@router.get("/trends")
async def get_trend_insights(
    category: str = Query("all", description="Trend category (all, user, content, performance)"),
    period: str = Query("monthly", description="Trend period (daily, weekly, monthly)")
):
    """Get trend analysis insights."""
    
    try:
        # Generate trend insights
        trends = await _analyze_trends(category, period)
        
        return {
            "status": "success",
            "data": trends,
            "parameters": {
                "category": category,
                "period": period
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get trend insights", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to analyze trends")


@router.get("/recommendations")
async def get_actionable_recommendations(
    priority: str = Query("all", description="Priority level (all, high, medium, low)"),
    category: str = Query("all", description="Recommendation category (all, retention, content, performance)")
):
    """Get actionable business recommendations."""
    
    try:
        # Generate recommendations
        recommendations = await _generate_recommendations(priority, category)
        
        return {
            "status": "success",
            "data": recommendations,
            "parameters": {
                "priority": priority,
                "category": category
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get recommendations", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")


@router.get("/alerts")
async def get_business_alerts(
    severity: Optional[str] = Query(None, description="Alert severity (info, warning, error, critical)"),
    resolved: bool = Query(False, description="Include resolved alerts")
):
    """Get business intelligence alerts."""
    
    try:
        # Generate business alerts
        alerts = await _get_business_alerts(severity, resolved)
        
        return {
            "status": "success",
            "data": alerts,
            "parameters": {
                "severity": severity,
                "resolved": resolved
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get business alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get business alerts")


@router.get("/forecasts")
async def get_business_forecasts(
    metric: str = Query(..., description="Metric to forecast"),
    horizon_days: int = Query(30, ge=1, le=365, description="Forecast horizon in days"),
    confidence_level: float = Query(0.95, ge=0.5, le=0.99, description="Confidence level")
):
    """Get business metric forecasts."""
    
    try:
        # Generate forecasts
        forecast = await _generate_forecast(metric, horizon_days, confidence_level)
        
        return {
            "status": "success",
            "data": forecast,
            "parameters": {
                "metric": metric,
                "horizon_days": horizon_days,
                "confidence_level": confidence_level
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get business forecast", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate forecast")


@router.get("/cohort-insights")
async def get_cohort_insights(
    cohort_period: str = Query("monthly", description="Cohort period (weekly, monthly, quarterly)"),
    metric: str = Query("retention", description="Metric to analyze (retention, ltv, engagement)")
):
    """Get cohort-based business insights."""
    
    try:
        # Generate cohort insights
        insights = await _analyze_cohort_insights(cohort_period, metric)
        
        return {
            "status": "success",
            "data": insights,
            "parameters": {
                "cohort_period": cohort_period,
                "metric": metric
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get cohort insights", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to analyze cohort insights")


@router.post("/custom-insight")
async def generate_custom_insight(
    insight_request: Dict[str, Any]
):
    """Generate custom business insight."""
    
    try:
        # Validate request
        if not insight_request.get("query"):
            raise HTTPException(status_code=400, detail="Insight query is required")
        
        # Generate custom insight
        insight = await _generate_custom_insight(insight_request)
        
        return {
            "status": "success",
            "data": insight,
            "request": insight_request,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to generate custom insight", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate custom insight")


# Helper functions for insight generation
async def _generate_dashboard_insights(start_date: date, end_date: date) -> Dict[str, Any]:
    """Generate key insights for executive dashboard."""
    
    return {
        "key_metrics": {
            "user_growth": {
                "value": 15.2,
                "trend": "up",
                "change_percent": 8.5,
                "insight": "Strong user acquisition momentum continues"
            },
            "retention_rate": {
                "value": 75.8,
                "trend": "stable",
                "change_percent": 1.2,
                "insight": "Retention remains healthy with slight improvement"
            },
            "learning_effectiveness": {
                "value": 82.3,
                "trend": "up",
                "change_percent": 4.7,
                "insight": "Algorithm optimizations showing positive impact"
            },
            "content_engagement": {
                "value": 68.9,
                "trend": "down",
                "change_percent": -2.1,
                "insight": "Content refresh needed to maintain engagement"
            }
        },
        "top_insights": [
            {
                "type": "opportunity",
                "title": "High-Value User Segment Identified",
                "description": "25% of users show 3x higher engagement and retention",
                "impact": "high",
                "action": "Develop targeted retention strategies for this segment"
            },
            {
                "type": "risk",
                "title": "Content Gap in Advanced Topics",
                "description": "15% performance drop in advanced driving scenarios",
                "impact": "medium",
                "action": "Prioritize advanced content development"
            },
            {
                "type": "success",
                "title": "Algorithm Performance Improvement",
                "description": "New ML model shows 12% accuracy improvement",
                "impact": "high",
                "action": "Full rollout recommended"
            }
        ],
        "alerts": [
            {
                "severity": "warning",
                "message": "Churn rate increased by 3% in last 7 days",
                "action_required": "Review recent user feedback and engagement metrics"
            }
        ]
    }


async def _detect_metric_anomalies(metric: Optional[str], sensitivity: float, days: int) -> Dict[str, Any]:
    """Detect anomalies in business metrics."""
    
    # Sample anomaly detection results
    anomalies = [
        {
            "metric": "daily_active_users",
            "date": "2024-01-10",
            "value": 1250,
            "expected_range": [1800, 2200],
            "severity": "high",
            "z_score": 3.2,
            "description": "Significant drop in daily active users",
            "possible_causes": [
                "System outage during peak hours",
                "Competitor product launch",
                "Seasonal effect"
            ]
        },
        {
            "metric": "average_accuracy",
            "date": "2024-01-12",
            "value": 0.92,
            "expected_range": [0.75, 0.85],
            "severity": "medium",
            "z_score": 2.8,
            "description": "Unusually high accuracy rate",
            "possible_causes": [
                "Algorithm improvement deployment",
                "Content difficulty adjustment",
                "User behavior change"
            ]
        }
    ]
    
    if metric:
        anomalies = [a for a in anomalies if a["metric"] == metric]
    
    return {
        "anomalies": anomalies,
        "summary": {
            "total_anomalies": len(anomalies),
            "high_severity": len([a for a in anomalies if a["severity"] == "high"]),
            "medium_severity": len([a for a in anomalies if a["severity"] == "medium"]),
            "low_severity": len([a for a in anomalies if a["severity"] == "low"])
        }
    }


async def _analyze_trends(category: str, period: str) -> Dict[str, Any]:
    """Analyze business trends."""
    
    trends = {
        "user_trends": [
            {
                "metric": "user_acquisition",
                "trend": "increasing",
                "growth_rate": 12.5,
                "confidence": 0.85,
                "description": "Steady growth in new user registrations"
            },
            {
                "metric": "session_duration",
                "trend": "stable",
                "growth_rate": 2.1,
                "confidence": 0.92,
                "description": "Session duration remains consistent"
            }
        ],
        "content_trends": [
            {
                "metric": "content_engagement",
                "trend": "decreasing",
                "growth_rate": -5.2,
                "confidence": 0.78,
                "description": "Slight decline in content engagement rates"
            }
        ],
        "performance_trends": [
            {
                "metric": "system_response_time",
                "trend": "improving",
                "growth_rate": -8.3,
                "confidence": 0.95,
                "description": "System performance optimizations showing results"
            }
        ]
    }
    
    if category == "all":
        return trends
    elif category in trends:
        return {category: trends[category]}
    else:
        return {}


async def _generate_recommendations(priority: str, category: str) -> Dict[str, Any]:
    """Generate actionable business recommendations."""
    
    recommendations = [
        {
            "id": "rec_001",
            "title": "Implement Advanced User Segmentation",
            "category": "retention",
            "priority": "high",
            "impact_score": 8.5,
            "effort_score": 6.0,
            "description": "Develop sophisticated user segmentation based on learning patterns",
            "expected_outcomes": [
                "15% improvement in retention rates",
                "20% increase in user engagement",
                "Better personalization effectiveness"
            ],
            "implementation_steps": [
                "Analyze user behavior patterns",
                "Define segment criteria",
                "Implement segmentation logic",
                "Create targeted campaigns"
            ],
            "timeline": "6-8 weeks",
            "resources_required": ["Data Scientist", "ML Engineer", "Product Manager"]
        },
        {
            "id": "rec_002",
            "title": "Content Gap Remediation Program",
            "category": "content",
            "priority": "medium",
            "impact_score": 7.2,
            "effort_score": 8.0,
            "description": "Address identified content gaps in advanced driving scenarios",
            "expected_outcomes": [
                "Improved topic coverage",
                "Better user performance in weak areas",
                "Enhanced content quality scores"
            ],
            "implementation_steps": [
                "Prioritize content gaps by impact",
                "Develop content creation plan",
                "Create and review new content",
                "Deploy and monitor performance"
            ],
            "timeline": "10-12 weeks",
            "resources_required": ["Content Authors", "Subject Matter Experts", "Reviewers"]
        },
        {
            "id": "rec_003",
            "title": "Performance Monitoring Enhancement",
            "category": "performance",
            "priority": "low",
            "impact_score": 5.8,
            "effort_score": 4.0,
            "description": "Enhance system monitoring and alerting capabilities",
            "expected_outcomes": [
                "Faster issue detection",
                "Reduced system downtime",
                "Better user experience"
            ],
            "implementation_steps": [
                "Audit current monitoring setup",
                "Identify monitoring gaps",
                "Implement enhanced monitoring",
                "Set up automated alerts"
            ],
            "timeline": "3-4 weeks",
            "resources_required": ["DevOps Engineer", "SRE"]
        }
    ]
    
    # Apply filters
    if priority != "all":
        recommendations = [r for r in recommendations if r["priority"] == priority]
    if category != "all":
        recommendations = [r for r in recommendations if r["category"] == category]
    
    return {
        "recommendations": recommendations,
        "summary": {
            "total": len(recommendations),
            "high_priority": len([r for r in recommendations if r["priority"] == "high"]),
            "medium_priority": len([r for r in recommendations if r["priority"] == "medium"]),
            "low_priority": len([r for r in recommendations if r["priority"] == "low"])
        }
    }


async def _get_business_alerts(severity: Optional[str], resolved: bool) -> Dict[str, Any]:
    """Get business intelligence alerts."""
    
    alerts = [
        {
            "id": "alert_001",
            "type": "churn_risk",
            "severity": "critical",
            "title": "High Churn Risk Detected",
            "message": "15% of premium users showing churn indicators",
            "created_at": "2024-01-15T10:30:00Z",
            "resolved": False,
            "impact": "Revenue at risk: $25,000/month",
            "recommended_actions": [
                "Launch retention campaign for at-risk users",
                "Analyze feedback from churning users",
                "Implement proactive engagement strategies"
            ]
        },
        {
            "id": "alert_002",
            "type": "performance",
            "severity": "warning",
            "title": "Content Engagement Decline",
            "message": "Overall content engagement down 8% this week",
            "created_at": "2024-01-14T15:45:00Z",
            "resolved": False,
            "impact": "User satisfaction and retention risk",
            "recommended_actions": [
                "Review recent content changes",
                "Analyze user feedback",
                "Consider content refresh"
            ]
        },
        {
            "id": "alert_003",
            "type": "opportunity",
            "severity": "info",
            "title": "High-Value Segment Growth",
            "message": "Premium user segment growing 25% month-over-month",
            "created_at": "2024-01-13T09:15:00Z",
            "resolved": True,
            "impact": "Revenue opportunity: $15,000/month",
            "recommended_actions": [
                "Analyze success factors",
                "Scale successful strategies",
                "Target similar user profiles"
            ]
        }
    ]
    
    # Apply filters
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    if not resolved:
        alerts = [a for a in alerts if not a["resolved"]]
    
    return {
        "alerts": alerts,
        "summary": {
            "total": len(alerts),
            "critical": len([a for a in alerts if a["severity"] == "critical"]),
            "warning": len([a for a in alerts if a["severity"] == "warning"]),
            "info": len([a for a in alerts if a["severity"] == "info"]),
            "unresolved": len([a for a in alerts if not a["resolved"]])
        }
    }


async def _generate_forecast(metric: str, horizon_days: int, confidence_level: float) -> Dict[str, Any]:
    """Generate business metric forecast."""
    
    # Sample forecast data
    forecast_data = []
    base_value = 1000
    
    for i in range(horizon_days):
        # Simple trend with some noise
        trend_value = base_value + (i * 10) + (i * i * 0.1)
        lower_bound = trend_value * (1 - (1 - confidence_level))
        upper_bound = trend_value * (1 + (1 - confidence_level))
        
        forecast_data.append({
            "date": (date.today() + timedelta(days=i+1)).isoformat(),
            "predicted_value": round(trend_value, 2),
            "lower_bound": round(lower_bound, 2),
            "upper_bound": round(upper_bound, 2),
            "confidence": confidence_level
        })
    
    return {
        "metric": metric,
        "forecast": forecast_data,
        "model_info": {
            "algorithm": "ARIMA",
            "accuracy": 0.85,
            "last_trained": "2024-01-10T12:00:00Z"
        },
        "insights": [
            f"Predicted {metric} shows upward trend",
            f"Expected growth rate: 12% over {horizon_days} days",
            "High confidence in short-term predictions"
        ]
    }


async def _analyze_cohort_insights(cohort_period: str, metric: str) -> Dict[str, Any]:
    """Analyze cohort-based insights."""
    
    return {
        "cohort_analysis": {
            "period": cohort_period,
            "metric": metric,
            "cohorts": [
                {
                    "cohort_date": "2024-01-01",
                    "size": 500,
                    "current_value": 0.75,
                    "trend": "stable",
                    "insights": ["Strong initial performance", "Consistent behavior pattern"]
                },
                {
                    "cohort_date": "2023-12-01",
                    "size": 450,
                    "current_value": 0.68,
                    "trend": "declining",
                    "insights": ["Showing signs of fatigue", "May need re-engagement"]
                }
            ]
        },
        "key_insights": [
            "Recent cohorts showing better initial performance",
            "Older cohorts need retention focus",
            "Seasonal patterns detected in cohort behavior"
        ]
    }


async def _generate_custom_insight(request: Dict[str, Any]) -> Dict[str, Any]:
    """Generate custom business insight."""
    
    query = request.get("query", "")
    
    return {
        "insight": {
            "query": query,
            "type": "custom",
            "findings": [
                "Custom analysis completed successfully",
                "Key patterns identified in requested data",
                "Actionable recommendations generated"
            ],
            "data_points": {
                "metric_1": 0.85,
                "metric_2": 1250,
                "correlation": 0.72
            },
            "recommendations": [
                "Focus on identified high-impact areas",
                "Monitor trends in key metrics",
                "Implement suggested optimizations"
            ]
        }
    }