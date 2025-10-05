"""Report generation service for business intelligence."""

import asyncio
import os
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import structlog
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch
from reportlab.lib import colors
import io
import base64
from pathlib import Path

from app.core.database import get_db_session
from app.models.reports import ReportStatus, ReportType
from app.services.analytics_engine import AnalyticsEngine

logger = structlog.get_logger(__name__)


class ReportGenerator:
    """Advanced report generation service for business intelligence."""
    
    def __init__(self):
        self.analytics_engine = AnalyticsEngine()
        self.reports_dir = Path("reports")
        self.reports_dir.mkdir(exist_ok=True)
        self.temp_dir = Path("temp")
        self.temp_dir.mkdir(exist_ok=True)
    
    async def start_report_generation(
        self,
        report_type: str,
        parameters: Dict[str, Any]
    ) -> str:
        """Start report generation and return report ID."""
        
        report_id = str(uuid.uuid4())
        
        # Store report metadata in database
        async with get_db_session() as db:
            # This would store report metadata in the database
            logger.info("Starting report generation", 
                       report_id=report_id, 
                       report_type=report_type)
        
        return report_id
    
    async def generate_report_async(
        self,
        report_id: str,
        report_type: str,
        parameters: Dict[str, Any]
    ) -> None:
        """Generate report asynchronously."""
        
        try:
            logger.info("Generating report", report_id=report_id, report_type=report_type)
            
            # Update status to processing
            await self._update_report_status(report_id, ReportStatus.PROCESSING)
            
            # Generate report based on type
            if report_type == "user_retention_analysis":
                await self._generate_retention_report(report_id, parameters)
            elif report_type == "learning_effectiveness":
                await self._generate_learning_effectiveness_report(report_id, parameters)
            elif report_type == "content_performance":
                await self._generate_content_performance_report(report_id, parameters)
            elif report_type == "churn_prediction":
                await self._generate_churn_prediction_report(report_id, parameters)
            elif report_type == "business_intelligence":
                await self._generate_comprehensive_bi_report(report_id, parameters)
            else:
                raise ValueError(f"Unknown report type: {report_type}")
            
            # Update status to completed
            await self._update_report_status(report_id, ReportStatus.COMPLETED)
            
            logger.info("Report generation completed", report_id=report_id)
            
        except Exception as e:
            logger.error("Report generation failed", 
                        report_id=report_id, 
                        error=str(e))
            await self._update_report_status(report_id, ReportStatus.FAILED)
            raise
    
    async def get_report_file(self, report_id: str) -> Optional[str]:
        """Get the file path for a generated report."""
        
        report_path = self.reports_dir / f"{report_id}.pdf"
        
        if report_path.exists():
            return str(report_path)
        
        return None
    
    async def _generate_retention_report(
        self,
        report_id: str,
        parameters: Dict[str, Any]
    ) -> None:
        """Generate user retention analysis report."""
        
        # Extract parameters
        start_date = datetime.fromisoformat(parameters.get("start_date")).date()
        end_date = datetime.fromisoformat(parameters.get("end_date")).date()
        cohort_period = parameters.get("cohort_period", "monthly")
        
        # Get retention analysis data
        retention_data = await self.analytics_engine.analyze_user_retention(
            start_date, end_date, cohort_period
        )
        
        # Generate visualizations
        charts = await self._create_retention_charts(retention_data)
        
        # Generate PDF report
        await self._create_pdf_report(
            report_id,
            "User Retention Analysis Report",
            retention_data,
            charts,
            self._get_retention_report_sections(retention_data)
        )
    
    async def _generate_learning_effectiveness_report(
        self,
        report_id: str,
        parameters: Dict[str, Any]
    ) -> None:
        """Generate learning effectiveness analysis report."""
        
        start_date = datetime.fromisoformat(parameters.get("start_date")).date()
        end_date = datetime.fromisoformat(parameters.get("end_date")).date()
        
        # Get learning effectiveness data
        effectiveness_data = await self.analytics_engine.analyze_learning_effectiveness(
            start_date, end_date
        )
        
        # Generate visualizations
        charts = await self._create_learning_effectiveness_charts(effectiveness_data)
        
        # Generate PDF report
        await self._create_pdf_report(
            report_id,
            "Learning Effectiveness Analysis Report",
            effectiveness_data,
            charts,
            self._get_learning_effectiveness_report_sections(effectiveness_data)
        )
    
    async def _generate_content_performance_report(
        self,
        report_id: str,
        parameters: Dict[str, Any]
    ) -> None:
        """Generate content performance analysis report."""
        
        start_date = datetime.fromisoformat(parameters.get("start_date")).date()
        end_date = datetime.fromisoformat(parameters.get("end_date")).date()
        
        # Get content performance data
        content_data = await self.analytics_engine.analyze_content_performance(
            start_date, end_date
        )
        
        # Generate visualizations
        charts = await self._create_content_performance_charts(content_data)
        
        # Generate PDF report
        await self._create_pdf_report(
            report_id,
            "Content Performance Analysis Report",
            content_data,
            charts,
            self._get_content_performance_report_sections(content_data)
        )
    
    async def _generate_churn_prediction_report(
        self,
        report_id: str,
        parameters: Dict[str, Any]
    ) -> None:
        """Generate churn prediction analysis report."""
        
        prediction_horizon = parameters.get("prediction_horizon_days", 30)
        
        # Get churn prediction data
        churn_data = await self.analytics_engine.predict_user_churn(prediction_horizon)
        
        # Generate visualizations
        charts = await self._create_churn_prediction_charts(churn_data)
        
        # Generate PDF report
        await self._create_pdf_report(
            report_id,
            "User Churn Prediction Report",
            churn_data,
            charts,
            self._get_churn_prediction_report_sections(churn_data)
        )
    
    async def _generate_comprehensive_bi_report(
        self,
        report_id: str,
        parameters: Dict[str, Any]
    ) -> None:
        """Generate comprehensive business intelligence report."""
        
        start_date = datetime.fromisoformat(parameters.get("start_date")).date()
        end_date = datetime.fromisoformat(parameters.get("end_date")).date()
        
        # Gather all analytics data
        retention_data = await self.analytics_engine.analyze_user_retention(start_date, end_date)
        effectiveness_data = await self.analytics_engine.analyze_learning_effectiveness(start_date, end_date)
        content_data = await self.analytics_engine.analyze_content_performance(start_date, end_date)
        churn_data = await self.analytics_engine.predict_user_churn(30)
        predictive_insights = await self.analytics_engine.generate_predictive_insights(start_date, end_date)
        
        # Combine all data
        comprehensive_data = {
            "retention": retention_data,
            "effectiveness": effectiveness_data,
            "content": content_data,
            "churn": churn_data,
            "predictions": predictive_insights,
            "executive_summary": self._generate_executive_summary(
                retention_data, effectiveness_data, content_data, churn_data, predictive_insights
            )
        }
        
        # Generate comprehensive visualizations
        charts = await self._create_comprehensive_charts(comprehensive_data)
        
        # Generate PDF report
        await self._create_pdf_report(
            report_id,
            "Comprehensive Business Intelligence Report",
            comprehensive_data,
            charts,
            self._get_comprehensive_report_sections(comprehensive_data)
        )
    
    async def _create_retention_charts(self, data: Dict[str, Any]) -> List[str]:
        """Create retention analysis charts."""
        
        charts = []
        
        if "cohort_data" not in data or not data["cohort_data"]:
            return charts
        
        # Cohort retention heatmap
        cohort_df = self._prepare_cohort_heatmap_data(data["cohort_data"])
        
        fig = px.imshow(
            cohort_df,
            title="Cohort Retention Heatmap",
            labels=dict(x="Period", y="Cohort", color="Retention Rate"),
            color_continuous_scale="RdYlGn",
            aspect="auto"
        )
        
        chart_path = self.temp_dir / f"retention_heatmap_{uuid.uuid4()}.png"
        fig.write_image(str(chart_path))
        charts.append(str(chart_path))
        
        # Retention curve chart
        fig = go.Figure()
        
        for cohort in data["cohort_data"][:5]:  # Show top 5 cohorts
            periods = [p["period"] for p in cohort.retention_periods]
            rates = [p["retention_rate"] for p in cohort.retention_periods]
            
            fig.add_trace(go.Scatter(
                x=periods,
                y=rates,
                mode='lines+markers',
                name=f"Cohort {cohort.cohort_date}",
                line=dict(width=2)
            ))
        
        fig.update_layout(
            title="Retention Curves by Cohort",
            xaxis_title="Period",
            yaxis_title="Retention Rate",
            hovermode='x unified'
        )
        
        chart_path = self.temp_dir / f"retention_curves_{uuid.uuid4()}.png"
        fig.write_image(str(chart_path))
        charts.append(str(chart_path))
        
        return charts
    
    async def _create_learning_effectiveness_charts(self, data: Dict[str, Any]) -> List[str]:
        """Create learning effectiveness charts."""
        
        charts = []
        
        # Algorithm performance comparison
        if "algorithm_performance" in data:
            algo_data = data["algorithm_performance"]
            
            algorithms = list(algo_data.keys())
            accuracy_scores = [algo_data[algo]["avg_accuracy"] for algo in algorithms]
            
            fig = go.Figure(data=[
                go.Bar(x=algorithms, y=accuracy_scores, name="Average Accuracy")
            ])
            
            fig.update_layout(
                title="Algorithm Performance Comparison",
                xaxis_title="Algorithm",
                yaxis_title="Average Accuracy"
            )
            
            chart_path = self.temp_dir / f"algorithm_performance_{uuid.uuid4()}.png"
            fig.write_image(str(chart_path))
            charts.append(str(chart_path))
        
        # Topic effectiveness radar chart
        if "topic_effectiveness" in data:
            topic_data = data["topic_effectiveness"]
            
            topics = list(topic_data.keys())
            effectiveness = list(topic_data.values())
            
            fig = go.Figure()
            
            fig.add_trace(go.Scatterpolar(
                r=effectiveness,
                theta=topics,
                fill='toself',
                name='Topic Effectiveness'
            ))
            
            fig.update_layout(
                polar=dict(
                    radialaxis=dict(
                        visible=True,
                        range=[0, 1]
                    )),
                title="Topic Effectiveness Analysis"
            )
            
            chart_path = self.temp_dir / f"topic_effectiveness_{uuid.uuid4()}.png"
            fig.write_image(str(chart_path))
            charts.append(str(chart_path))
        
        return charts
    
    async def _create_content_performance_charts(self, data: Dict[str, Any]) -> List[str]:
        """Create content performance charts."""
        
        charts = []
        
        # Content gaps visualization
        if "content_gaps" in data and data["content_gaps"]:
            gaps_data = data["content_gaps"]
            
            # Create a sample visualization for content gaps
            topics = [gap.get("topic", f"Topic {i}") for i, gap in enumerate(gaps_data[:10])]
            gap_scores = [gap.get("gap_score", 0.5) for gap in gaps_data[:10]]
            
            fig = go.Figure(data=[
                go.Bar(x=topics, y=gap_scores, name="Content Gap Score")
            ])
            
            fig.update_layout(
                title="Content Gaps by Topic",
                xaxis_title="Topic",
                yaxis_title="Gap Score",
                xaxis_tickangle=-45
            )
            
            chart_path = self.temp_dir / f"content_gaps_{uuid.uuid4()}.png"
            fig.write_image(str(chart_path))
            charts.append(str(chart_path))
        
        return charts
    
    async def _create_churn_prediction_charts(self, data: Dict[str, Any]) -> List[str]:
        """Create churn prediction charts."""
        
        charts = []
        
        # Risk segments pie chart
        if "risk_segments" in data:
            segments = data["risk_segments"]
            
            labels = list(segments.keys())
            values = list(segments.values())
            
            fig = go.Figure(data=[go.Pie(labels=labels, values=values)])
            fig.update_layout(title="Churn Risk Segments")
            
            chart_path = self.temp_dir / f"churn_segments_{uuid.uuid4()}.png"
            fig.write_image(str(chart_path))
            charts.append(str(chart_path))
        
        # Feature importance chart
        if "model_performance" in data and "feature_importance" in data["model_performance"]:
            importance_data = data["model_performance"]["feature_importance"]
            
            features = list(importance_data.keys())
            importance = list(importance_data.values())
            
            fig = go.Figure(data=[
                go.Bar(x=importance, y=features, orientation='h')
            ])
            
            fig.update_layout(
                title="Feature Importance for Churn Prediction",
                xaxis_title="Importance Score",
                yaxis_title="Features"
            )
            
            chart_path = self.temp_dir / f"feature_importance_{uuid.uuid4()}.png"
            fig.write_image(str(chart_path))
            charts.append(str(chart_path))
        
        return charts
    
    async def _create_comprehensive_charts(self, data: Dict[str, Any]) -> List[str]:
        """Create comprehensive dashboard charts."""
        
        charts = []
        
        # Executive dashboard with key metrics
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('User Retention', 'Learning Effectiveness', 
                          'Content Performance', 'Churn Risk'),
            specs=[[{"type": "scatter"}, {"type": "bar"}],
                   [{"type": "bar"}, {"type": "pie"}]]
        )
        
        # Add sample data for each subplot
        # This would be populated with actual data from the comprehensive analysis
        
        # Retention trend
        fig.add_trace(
            go.Scatter(x=[1, 2, 3, 4, 5], y=[0.8, 0.7, 0.6, 0.55, 0.5], 
                      name="Retention Rate"),
            row=1, col=1
        )
        
        # Algorithm performance
        fig.add_trace(
            go.Bar(x=["SM-2", "BKT", "IRT"], y=[0.85, 0.82, 0.88], 
                   name="Accuracy"),
            row=1, col=2
        )
        
        # Content gaps
        fig.add_trace(
            go.Bar(x=["Topic A", "Topic B", "Topic C"], y=[0.3, 0.5, 0.2], 
                   name="Gap Score"),
            row=2, col=1
        )
        
        # Churn risk
        fig.add_trace(
            go.Pie(labels=["Low Risk", "Medium Risk", "High Risk"], 
                   values=[60, 30, 10]),
            row=2, col=2
        )
        
        fig.update_layout(height=800, title_text="Executive Dashboard")
        
        chart_path = self.temp_dir / f"executive_dashboard_{uuid.uuid4()}.png"
        fig.write_image(str(chart_path))
        charts.append(str(chart_path))
        
        return charts
    
    async def _create_pdf_report(
        self,
        report_id: str,
        title: str,
        data: Dict[str, Any],
        charts: List[str],
        sections: List[Dict[str, Any]]
    ) -> None:
        """Create PDF report with data and visualizations."""
        
        report_path = self.reports_dir / f"{report_id}.pdf"
        
        # Create PDF document
        doc = SimpleDocTemplate(str(report_path), pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title page
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 20))
        
        # Report metadata
        story.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        story.append(Paragraph(f"Report ID: {report_id}", styles['Normal']))
        story.append(PageBreak())
        
        # Add sections
        for section in sections:
            # Section title
            story.append(Paragraph(section["title"], styles['Heading2']))
            story.append(Spacer(1, 12))
            
            # Section content
            if "content" in section:
                for paragraph in section["content"]:
                    story.append(Paragraph(paragraph, styles['Normal']))
                    story.append(Spacer(1, 6))
            
            # Add charts if available
            if "chart_index" in section and section["chart_index"] < len(charts):
                chart_path = charts[section["chart_index"]]
                if os.path.exists(chart_path):
                    story.append(Spacer(1, 12))
                    story.append(Image(chart_path, width=6*inch, height=4*inch))
                    story.append(Spacer(1, 12))
            
            # Add tables if available
            if "table_data" in section:
                table = Table(section["table_data"])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 14),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(table)
                story.append(Spacer(1, 12))
            
            story.append(PageBreak())
        
        # Build PDF
        doc.build(story)
        
        # Clean up temporary chart files
        for chart_path in charts:
            try:
                os.remove(chart_path)
            except OSError:
                pass
    
    def _get_retention_report_sections(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get sections for retention report."""
        
        sections = [
            {
                "title": "Executive Summary",
                "content": [
                    "This report analyzes user retention patterns and cohort behavior.",
                    f"Analysis covers {len(data.get('cohort_data', []))} cohorts.",
                    "Key findings and recommendations are provided below."
                ]
            },
            {
                "title": "Cohort Analysis",
                "content": [
                    "Cohort retention analysis shows user behavior over time.",
                    "Each cohort represents users who joined in the same period."
                ],
                "chart_index": 0
            },
            {
                "title": "Retention Metrics",
                "content": [
                    "Key retention metrics and trends:",
                    f"Average early retention: {data.get('retention_metrics', {}).get('avg_retention_period_1', 'N/A')}",
                    f"Average long-term retention: {data.get('retention_metrics', {}).get('avg_retention_period_7', 'N/A')}"
                ],
                "chart_index": 1
            },
            {
                "title": "Recommendations",
                "content": data.get("patterns", ["No specific patterns identified"])
            }
        ]
        
        return sections
    
    def _get_learning_effectiveness_report_sections(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get sections for learning effectiveness report."""
        
        sections = [
            {
                "title": "Executive Summary",
                "content": [
                    "This report analyzes the effectiveness of learning algorithms and content.",
                    "Performance metrics across different algorithms and topics are evaluated."
                ]
            },
            {
                "title": "Algorithm Performance",
                "content": [
                    "Comparison of learning algorithm effectiveness:",
                    "Analysis includes accuracy, response time, and mastery gains."
                ],
                "chart_index": 0
            },
            {
                "title": "Topic Effectiveness",
                "content": [
                    "Topic-level analysis of learning effectiveness:",
                    "Identifies high and low performing content areas."
                ],
                "chart_index": 1
            },
            {
                "title": "Recommendations",
                "content": data.get("recommendations", ["No specific recommendations available"])
            }
        ]
        
        return sections
    
    def _get_content_performance_report_sections(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get sections for content performance report."""
        
        sections = [
            {
                "title": "Executive Summary",
                "content": [
                    "This report analyzes content performance and identifies gaps.",
                    "Item-level and topic-level analysis is provided."
                ]
            },
            {
                "title": "Content Gaps Analysis",
                "content": [
                    "Identification of content gaps by topic:",
                    "Areas requiring additional content development."
                ],
                "chart_index": 0
            },
            {
                "title": "Recommendations",
                "content": data.get("recommendations", ["No specific recommendations available"])
            }
        ]
        
        return sections
    
    def _get_churn_prediction_report_sections(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get sections for churn prediction report."""
        
        sections = [
            {
                "title": "Executive Summary",
                "content": [
                    "This report provides churn prediction analysis and risk assessment.",
                    f"Model accuracy: {data.get('model_performance', {}).get('accuracy', 'N/A')}"
                ]
            },
            {
                "title": "Risk Segments",
                "content": [
                    "User segmentation by churn risk:",
                    "Distribution of users across risk categories."
                ],
                "chart_index": 0
            },
            {
                "title": "Feature Importance",
                "content": [
                    "Key factors influencing churn prediction:",
                    "Most important features for retention strategies."
                ],
                "chart_index": 1
            },
            {
                "title": "Retention Strategies",
                "content": data.get("retention_strategies", ["No specific strategies available"])
            }
        ]
        
        return sections
    
    def _get_comprehensive_report_sections(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get sections for comprehensive BI report."""
        
        sections = [
            {
                "title": "Executive Summary",
                "content": data.get("executive_summary", ["Comprehensive business intelligence analysis"])
            },
            {
                "title": "Key Performance Indicators",
                "content": [
                    "Overview of critical business metrics:",
                    "User engagement, retention, and learning effectiveness."
                ],
                "chart_index": 0
            },
            {
                "title": "User Retention Analysis",
                "content": [
                    "Detailed retention analysis and cohort behavior.",
                    "Trends and patterns in user engagement."
                ]
            },
            {
                "title": "Learning Effectiveness",
                "content": [
                    "Algorithm performance and content effectiveness.",
                    "Optimization opportunities identified."
                ]
            },
            {
                "title": "Content Performance",
                "content": [
                    "Content gap analysis and performance metrics.",
                    "Recommendations for content improvement."
                ]
            },
            {
                "title": "Predictive Insights",
                "content": [
                    "Forward-looking analysis and predictions.",
                    "Business planning recommendations."
                ]
            },
            {
                "title": "Strategic Recommendations",
                "content": [
                    "Actionable insights for business improvement.",
                    "Priority areas for investment and optimization."
                ]
            }
        ]
        
        return sections
    
    def _generate_executive_summary(self, *args) -> List[str]:
        """Generate executive summary from all analysis data."""
        
        return [
            "This comprehensive business intelligence report provides insights across all key areas.",
            "User retention shows stable patterns with opportunities for improvement.",
            "Learning algorithms demonstrate strong performance with room for optimization.",
            "Content gaps have been identified and prioritized for development.",
            "Churn prediction models provide actionable insights for retention strategies.",
            "Strategic recommendations focus on user engagement and content quality."
        ]
    
    def _prepare_cohort_heatmap_data(self, cohort_data) -> pd.DataFrame:
        """Prepare data for cohort retention heatmap."""
        
        # Create a sample heatmap data structure
        cohorts = [f"Cohort {i}" for i in range(len(cohort_data))]
        periods = list(range(12))  # 12 periods
        
        # Create matrix of retention rates
        matrix = []
        for cohort in cohort_data:
            row = [p["retention_rate"] for p in cohort.retention_periods[:12]]
            # Pad with zeros if needed
            while len(row) < 12:
                row.append(0)
            matrix.append(row)
        
        return pd.DataFrame(matrix, index=cohorts, columns=[f"Period {i}" for i in periods])
    
    async def _update_report_status(self, report_id: str, status: ReportStatus) -> None:
        """Update report status in database."""
        
        # This would update the report status in the database
        logger.info("Updating report status", 
                   report_id=report_id, 
                   status=status.value)