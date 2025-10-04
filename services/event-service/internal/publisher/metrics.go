package publisher

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// MetricsHandler provides HTTP endpoints for publisher metrics
type MetricsHandler struct {
	publisher *KafkaPublisher
}

// NewMetricsHandler creates a new metrics handler
func NewMetricsHandler(publisher *KafkaPublisher) *MetricsHandler {
	return &MetricsHandler{
		publisher: publisher,
	}
}

// GetMetrics returns current publisher metrics
func (h *MetricsHandler) GetMetrics(c *gin.Context) {
	metrics := h.publisher.GetMetrics()

	response := map[string]interface{}{
		"events_published":      metrics.EventsPublished,
		"events_failed":         metrics.EventsFailed,
		"events_retried":        metrics.EventsRetried,
		"events_sent_to_dlq":    metrics.EventsSentToDLQ,
		"average_latency_ms":    metrics.AverageLatencyMs,
		"last_publish_time":     metrics.LastPublishTime.Format(time.RFC3339),
		"circuit_breaker_state": metrics.CircuitBreakerState,
		"success_rate":          h.calculateSuccessRate(metrics),
		"error_rate":            h.calculateErrorRate(metrics),
		"dlq_rate":              h.calculateDLQRate(metrics),
		"timestamp":             time.Now().Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, response)
}

// GetHealthStatus returns publisher health status
func (h *MetricsHandler) GetHealthStatus(c *gin.Context) {
	metrics := h.publisher.GetMetrics()

	status := "healthy"
	checks := make(map[string]string)

	// Check if publisher is actively publishing
	timeSinceLastPublish := time.Since(metrics.LastPublishTime)
	if timeSinceLastPublish > 5*time.Minute && metrics.EventsPublished > 0 {
		status = "degraded"
		checks["last_publish"] = "warning: no recent activity"
	} else {
		checks["last_publish"] = "ok"
	}

	// Check error rate
	errorRate := h.calculateErrorRate(metrics)
	if errorRate > 0.1 { // More than 10% error rate
		status = "unhealthy"
		checks["error_rate"] = "critical: high error rate"
	} else if errorRate > 0.05 { // More than 5% error rate
		if status == "healthy" {
			status = "degraded"
		}
		checks["error_rate"] = "warning: elevated error rate"
	} else {
		checks["error_rate"] = "ok"
	}

	// Check DLQ rate
	dlqRate := h.calculateDLQRate(metrics)
	if dlqRate > 0.05 { // More than 5% going to DLQ
		status = "unhealthy"
		checks["dlq_rate"] = "critical: high DLQ rate"
	} else if dlqRate > 0.01 { // More than 1% going to DLQ
		if status == "healthy" {
			status = "degraded"
		}
		checks["dlq_rate"] = "warning: elevated DLQ rate"
	} else {
		checks["dlq_rate"] = "ok"
	}

	// Check circuit breaker state
	if metrics.CircuitBreakerState == "OPEN" {
		status = "unhealthy"
		checks["circuit_breaker"] = "critical: circuit breaker open"
	} else if metrics.CircuitBreakerState == "HALF_OPEN" {
		if status == "healthy" {
			status = "degraded"
		}
		checks["circuit_breaker"] = "warning: circuit breaker half-open"
	} else {
		checks["circuit_breaker"] = "ok"
	}

	response := map[string]interface{}{
		"status":    status,
		"service":   "event-publisher",
		"version":   "1.0.0",
		"timestamp": time.Now().Format(time.RFC3339),
		"checks":    checks,
		"metrics": map[string]interface{}{
			"events_published":   metrics.EventsPublished,
			"events_failed":      metrics.EventsFailed,
			"events_sent_to_dlq": metrics.EventsSentToDLQ,
			"success_rate":       h.calculateSuccessRate(metrics),
			"error_rate":         errorRate,
			"dlq_rate":           dlqRate,
		},
	}

	statusCode := http.StatusOK
	if status == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	} else if status == "degraded" {
		statusCode = http.StatusOK // Still return 200 for degraded
	}

	c.JSON(statusCode, response)
}

// GetPrometheusMetrics returns metrics in Prometheus format
func (h *MetricsHandler) GetPrometheusMetrics(c *gin.Context) {
	metrics := h.publisher.GetMetrics()

	prometheusMetrics := []string{
		"# HELP kafka_events_published_total Total number of events published to Kafka",
		"# TYPE kafka_events_published_total counter",
		"kafka_events_published_total " + formatInt64(metrics.EventsPublished),
		"",
		"# HELP kafka_events_failed_total Total number of events that failed to publish",
		"# TYPE kafka_events_failed_total counter",
		"kafka_events_failed_total " + formatInt64(metrics.EventsFailed),
		"",
		"# HELP kafka_events_retried_total Total number of event publish retries",
		"# TYPE kafka_events_retried_total counter",
		"kafka_events_retried_total " + formatInt64(metrics.EventsRetried),
		"",
		"# HELP kafka_events_dlq_total Total number of events sent to dead letter queue",
		"# TYPE kafka_events_dlq_total counter",
		"kafka_events_dlq_total " + formatInt64(metrics.EventsSentToDLQ),
		"",
		"# HELP kafka_publish_latency_ms Average publish latency in milliseconds",
		"# TYPE kafka_publish_latency_ms gauge",
		"kafka_publish_latency_ms " + formatFloat64(metrics.AverageLatencyMs),
		"",
		"# HELP kafka_success_rate Success rate of event publishing",
		"# TYPE kafka_success_rate gauge",
		"kafka_success_rate " + formatFloat64(h.calculateSuccessRate(metrics)),
		"",
		"# HELP kafka_error_rate Error rate of event publishing",
		"# TYPE kafka_error_rate gauge",
		"kafka_error_rate " + formatFloat64(h.calculateErrorRate(metrics)),
		"",
		"# HELP kafka_dlq_rate Rate of events sent to dead letter queue",
		"# TYPE kafka_dlq_rate gauge",
		"kafka_dlq_rate " + formatFloat64(h.calculateDLQRate(metrics)),
	}

	c.Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	c.String(http.StatusOK, joinStrings(prometheusMetrics, "\n"))
}

// Helper methods for calculations
func (h *MetricsHandler) calculateSuccessRate(metrics *PublisherMetrics) float64 {
	total := metrics.EventsPublished + metrics.EventsFailed
	if total == 0 {
		return 1.0 // No events processed yet, assume healthy
	}
	return float64(metrics.EventsPublished) / float64(total)
}

func (h *MetricsHandler) calculateErrorRate(metrics *PublisherMetrics) float64 {
	total := metrics.EventsPublished + metrics.EventsFailed
	if total == 0 {
		return 0.0
	}
	return float64(metrics.EventsFailed) / float64(total)
}

func (h *MetricsHandler) calculateDLQRate(metrics *PublisherMetrics) float64 {
	total := metrics.EventsPublished + metrics.EventsFailed
	if total == 0 {
		return 0.0
	}
	return float64(metrics.EventsSentToDLQ) / float64(total)
}

// Utility functions
func formatInt64(value int64) string {
	return string(rune(value + '0'))
}

func formatFloat64(value float64) string {
	bytes, _ := json.Marshal(value)
	return string(bytes)
}

func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	if len(strs) == 1 {
		return strs[0]
	}

	totalLen := len(sep) * (len(strs) - 1)
	for _, s := range strs {
		totalLen += len(s)
	}

	result := make([]byte, 0, totalLen)
	result = append(result, strs[0]...)
	for _, s := range strs[1:] {
		result = append(result, sep...)
		result = append(result, s...)
	}
	return string(result)
}
