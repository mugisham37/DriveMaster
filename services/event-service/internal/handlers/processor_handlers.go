package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GetProcessorMetrics returns detailed processor metrics
func (h *EventHandler) GetProcessorMetrics(c *gin.Context) {
	if h.processor == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "processor_disabled",
			"message": "Event processor is not enabled",
		})
		return
	}

	metrics := h.processor.GetMetrics()
	c.JSON(http.StatusOK, gin.H{
		"processor_metrics": metrics,
		"timestamp":         time.Now().UTC(),
	})
}

// GetProcessorStatus returns the current status of the event processor
func (h *EventHandler) GetProcessorStatus(c *gin.Context) {
	if h.processor == nil {
		c.JSON(http.StatusOK, gin.H{
			"enabled":   false,
			"status":    "disabled",
			"message":   "Event processor is not enabled",
			"timestamp": time.Now().UTC(),
		})
		return
	}

	metrics := h.processor.GetMetrics()

	status := "healthy"
	if metrics.ErrorCount > 0 && metrics.EventsProcessed > 0 {
		errorRate := float64(metrics.ErrorCount) / float64(metrics.EventsProcessed)
		if errorRate > 0.1 { // More than 10% error rate
			status = "degraded"
		}
		if errorRate > 0.5 { // More than 50% error rate
			status = "unhealthy"
		}
	}

	if metrics.WorkerUtilization > 90 {
		status = "overloaded"
	}

	c.JSON(http.StatusOK, gin.H{
		"enabled":            true,
		"status":             status,
		"worker_utilization": metrics.WorkerUtilization,
		"queue_depth":        metrics.QueueDepth,
		"events_processed":   metrics.EventsProcessed,
		"error_rate":         float64(metrics.ErrorCount) / max(float64(metrics.EventsProcessed), 1),
		"last_processed":     metrics.LastProcessedTime,
		"timestamp":          time.Now().UTC(),
	})
}

// GetEnrichmentStats returns enrichment statistics
func (h *EventHandler) GetEnrichmentStats(c *gin.Context) {
	if h.processor == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "processor_disabled",
			"message": "Event processor is not enabled",
		})
		return
	}

	metrics := h.processor.GetMetrics()

	enrichmentRate := float64(0)
	if metrics.EventsProcessed > 0 {
		enrichmentRate = float64(metrics.EventsEnriched) / float64(metrics.EventsProcessed)
	}

	aggregationRate := float64(0)
	if metrics.EventsProcessed > 0 {
		aggregationRate = float64(metrics.EventsAggregated) / float64(metrics.EventsProcessed)
	}

	c.JSON(http.StatusOK, gin.H{
		"enrichment_stats": gin.H{
			"events_enriched":     metrics.EventsEnriched,
			"events_aggregated":   metrics.EventsAggregated,
			"events_filtered":     metrics.EventsFiltered,
			"events_deduplicated": metrics.EventsDeduplicated,
			"enrichment_rate":     enrichmentRate,
			"aggregation_rate":    aggregationRate,
		},
		"timestamp": time.Now().UTC(),
	})
}

// GetFilterStats returns filter statistics
func (h *EventHandler) GetFilterStats(c *gin.Context) {
	if h.processor == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "processor_disabled",
			"message": "Event processor is not enabled",
		})
		return
	}

	// This would typically get stats from the filter component
	// For now, return basic information
	c.JSON(http.StatusOK, gin.H{
		"filter_stats": gin.H{
			"message": "Filter statistics endpoint - implementation depends on specific filter requirements",
		},
		"timestamp": time.Now().UTC(),
	})
}

// GetAggregationData returns aggregation data for a specific key and time range
func (h *EventHandler) GetAggregationData(c *gin.Context) {
	if h.processor == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "processor_disabled",
			"message": "Event processor is not enabled",
		})
		return
	}

	aggregatorName := c.Query("aggregator")
	key := c.Query("key")

	if aggregatorName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "missing_aggregator",
			"message": "aggregator parameter is required",
		})
		return
	}

	if key == "" {
		key = "global" // Default to global aggregation
	}

	// Parse time range (simplified - in production you'd want better parsing)
	startTime := time.Now().Add(-24 * time.Hour) // Default to last 24 hours
	endTime := time.Now()

	// This would call the aggregator to get data
	c.JSON(http.StatusOK, gin.H{
		"aggregation_data": gin.H{
			"aggregator": aggregatorName,
			"key":        key,
			"start_time": startTime,
			"end_time":   endTime,
			"message":    "Aggregation data retrieval - implementation depends on specific aggregation requirements",
		},
		"timestamp": time.Now().UTC(),
	})
}
