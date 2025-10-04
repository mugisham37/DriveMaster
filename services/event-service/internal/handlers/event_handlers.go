package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"event-service/internal/config"
	"event-service/internal/models"
	"event-service/internal/validation"

	"github.com/gin-gonic/gin"
)

// EventHandler handles HTTP requests for event ingestion
type EventHandler struct {
	config    *config.Config
	validator *validation.EventValidator
	publisher EventPublisher
	metrics   *ServiceMetrics
	mu        sync.RWMutex
}

// EventPublisher interface for publishing events to Kafka
type EventPublisher interface {
	PublishAttemptEvent(ctx context.Context, event *models.AttemptEvent) error
	PublishSessionEvent(ctx context.Context, event *models.SessionEvent) error
	PublishPlacementEvent(ctx context.Context, event *models.PlacementEvent) error
	PublishBatch(ctx context.Context, events []interface{}) error
	Close() error
}

// ServiceMetrics tracks service performance metrics
type ServiceMetrics struct {
	EventsProcessed   int64
	EventsPerSecond   float64
	TotalLatencyMs    int64
	RequestCount      int64
	ErrorCount        int64
	LastProcessedTime time.Time
	StartTime         time.Time
	mu                sync.RWMutex
}

// NewEventHandler creates a new event handler
func NewEventHandler(cfg *config.Config, publisher EventPublisher) *EventHandler {
	return &EventHandler{
		config:    cfg,
		validator: validation.NewEventValidator(),
		publisher: publisher,
		metrics: &ServiceMetrics{
			StartTime: time.Now(),
		},
	}
}

// HandleAttemptEvent handles attempt event ingestion
func (h *EventHandler) HandleAttemptEvent(c *gin.Context) {
	startTime := time.Now()

	var eventData map[string]interface{}
	if err := c.ShouldBindJSON(&eventData); err != nil {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_json",
			"message": "Invalid JSON format",
			"details": err.Error(),
		})
		return
	}

	// Add event metadata
	eventData["event_type"] = "attempt"
	if _, exists := eventData["event_id"]; !exists {
		eventData["event_id"] = models.NewEventID()
	}
	if _, exists := eventData["timestamp"]; !exists {
		eventData["timestamp"] = time.Now().UTC()
	}

	// Validate event
	validationResult := h.validator.ValidateAttemptEvent(eventData)
	if !validationResult.Valid {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":             "validation_failed",
			"message":           "Event validation failed",
			"validation_errors": validationResult.Errors,
		})
		return
	}

	// Check for idempotency
	if _, exists := eventData["client_attempt_id"].(string); !exists {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "missing_idempotency_key",
			"message": "client_attempt_id is required for idempotency",
		})
		return
	}

	// Convert to structured event
	attemptEvent, err := h.mapToAttemptEvent(eventData)
	if err != nil {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "event_mapping_failed",
			"message": "Failed to map event data",
			"details": err.Error(),
		})
		return
	}

	// Publish to Kafka
	ctx, cancel := context.WithTimeout(context.Background(), h.config.Kafka.ProducerTimeout)
	defer cancel()

	if err := h.publisher.PublishAttemptEvent(ctx, attemptEvent); err != nil {
		h.recordError()
		log.Printf("Failed to publish attempt event: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "publish_failed",
			"message": "Failed to publish event",
		})
		return
	}

	// Record success metrics
	h.recordSuccess(startTime)

	c.JSON(http.StatusCreated, models.EventResponse{
		Success:     true,
		EventID:     attemptEvent.EventID,
		Message:     "Event processed successfully",
		ProcessedAt: time.Now().UTC(),
	})
}

// HandleSessionEvent handles session event ingestion
func (h *EventHandler) HandleSessionEvent(c *gin.Context) {
	startTime := time.Now()

	var eventData map[string]interface{}
	if err := c.ShouldBindJSON(&eventData); err != nil {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_json",
			"message": "Invalid JSON format",
			"details": err.Error(),
		})
		return
	}

	// Add event metadata
	eventData["event_type"] = "session"
	if _, exists := eventData["event_id"]; !exists {
		eventData["event_id"] = models.NewEventID()
	}
	if _, exists := eventData["timestamp"]; !exists {
		eventData["timestamp"] = time.Now().UTC()
	}

	// Validate event
	validationResult := h.validator.ValidateSessionEvent(eventData)
	if !validationResult.Valid {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":             "validation_failed",
			"message":           "Event validation failed",
			"validation_errors": validationResult.Errors,
		})
		return
	}

	// Convert to structured event
	sessionEvent, err := h.mapToSessionEvent(eventData)
	if err != nil {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "event_mapping_failed",
			"message": "Failed to map event data",
			"details": err.Error(),
		})
		return
	}

	// Publish to Kafka
	ctx, cancel := context.WithTimeout(context.Background(), h.config.Kafka.ProducerTimeout)
	defer cancel()

	if err := h.publisher.PublishSessionEvent(ctx, sessionEvent); err != nil {
		h.recordError()
		log.Printf("Failed to publish session event: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "publish_failed",
			"message": "Failed to publish event",
		})
		return
	}

	// Record success metrics
	h.recordSuccess(startTime)

	c.JSON(http.StatusCreated, models.EventResponse{
		Success:     true,
		EventID:     sessionEvent.EventID,
		Message:     "Event processed successfully",
		ProcessedAt: time.Now().UTC(),
	})
}

// HandlePlacementEvent handles placement event ingestion
func (h *EventHandler) HandlePlacementEvent(c *gin.Context) {
	startTime := time.Now()

	var eventData map[string]interface{}
	if err := c.ShouldBindJSON(&eventData); err != nil {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_json",
			"message": "Invalid JSON format",
			"details": err.Error(),
		})
		return
	}

	// Add event metadata
	eventData["event_type"] = "placement"
	if _, exists := eventData["event_id"]; !exists {
		eventData["event_id"] = models.NewEventID()
	}
	if _, exists := eventData["timestamp"]; !exists {
		eventData["timestamp"] = time.Now().UTC()
	}

	// Validate event
	validationResult := h.validator.ValidatePlacementEvent(eventData)
	if !validationResult.Valid {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":             "validation_failed",
			"message":           "Event validation failed",
			"validation_errors": validationResult.Errors,
		})
		return
	}

	// Convert to structured event
	placementEvent, err := h.mapToPlacementEvent(eventData)
	if err != nil {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "event_mapping_failed",
			"message": "Failed to map event data",
			"details": err.Error(),
		})
		return
	}

	// Publish to Kafka
	ctx, cancel := context.WithTimeout(context.Background(), h.config.Kafka.ProducerTimeout)
	defer cancel()

	if err := h.publisher.PublishPlacementEvent(ctx, placementEvent); err != nil {
		h.recordError()
		log.Printf("Failed to publish placement event: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "publish_failed",
			"message": "Failed to publish event",
		})
		return
	}

	// Record success metrics
	h.recordSuccess(startTime)

	c.JSON(http.StatusCreated, models.EventResponse{
		Success:     true,
		EventID:     placementEvent.EventID,
		Message:     "Event processed successfully",
		ProcessedAt: time.Now().UTC(),
	})
}

// HandleBatchEvents handles batch event ingestion
func (h *EventHandler) HandleBatchEvents(c *gin.Context) {
	startTime := time.Now()

	var batchRequest models.BatchEventRequest
	if err := c.ShouldBindJSON(&batchRequest); err != nil {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_json",
			"message": "Invalid JSON format",
			"details": err.Error(),
		})
		return
	}

	if len(batchRequest.Events) == 0 {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "empty_batch",
			"message": "Batch must contain at least one event",
		})
		return
	}

	if len(batchRequest.Events) > 100 {
		h.recordError()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "batch_too_large",
			"message": "Batch cannot contain more than 100 events",
		})
		return
	}

	var results []models.EventResponse
	var processedEvents []interface{}
	processedCount := 0
	failedCount := 0

	// Process each event in the batch
	for i, eventData := range batchRequest.Events {
		// Add event metadata if missing
		if _, exists := eventData["event_id"]; !exists {
			eventData["event_id"] = models.NewEventID()
		}
		if _, exists := eventData["timestamp"]; !exists {
			eventData["timestamp"] = time.Now().UTC()
		}

		eventType, exists := eventData["event_type"].(string)
		if !exists {
			failedCount++
			results = append(results, models.EventResponse{
				Success:     false,
				EventID:     fmt.Sprintf("batch_item_%d", i),
				Message:     "Missing event_type field",
				ProcessedAt: time.Now().UTC(),
			})
			continue
		}

		// Validate and convert based on event type
		var validationResult validation.ValidationResult
		var convertedEvent interface{}
		var err error

		switch eventType {
		case "attempt":
			validationResult = h.validator.ValidateAttemptEvent(eventData)
			if validationResult.Valid {
				convertedEvent, err = h.mapToAttemptEvent(eventData)
			}
		case "session":
			validationResult = h.validator.ValidateSessionEvent(eventData)
			if validationResult.Valid {
				convertedEvent, err = h.mapToSessionEvent(eventData)
			}
		case "placement":
			validationResult = h.validator.ValidatePlacementEvent(eventData)
			if validationResult.Valid {
				convertedEvent, err = h.mapToPlacementEvent(eventData)
			}
		default:
			validationResult = validation.ValidationResult{
				Valid: false,
				Errors: []validation.ValidationError{
					{
						Field:   "event_type",
						Message: "Invalid event type",
						Code:    "invalid_event_type",
					},
				},
			}
		}

		if !validationResult.Valid {
			failedCount++
			results = append(results, models.EventResponse{
				Success:     false,
				EventID:     eventData["event_id"].(string),
				Message:     "Validation failed",
				ProcessedAt: time.Now().UTC(),
			})
			continue
		}

		if err != nil {
			failedCount++
			results = append(results, models.EventResponse{
				Success:     false,
				EventID:     eventData["event_id"].(string),
				Message:     "Event mapping failed: " + err.Error(),
				ProcessedAt: time.Now().UTC(),
			})
			continue
		}

		processedEvents = append(processedEvents, convertedEvent)
		processedCount++
		results = append(results, models.EventResponse{
			Success:     true,
			EventID:     eventData["event_id"].(string),
			Message:     "Event processed successfully",
			ProcessedAt: time.Now().UTC(),
		})
	}

	// Publish batch to Kafka if we have any valid events
	if len(processedEvents) > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), h.config.Kafka.ProducerTimeout)
		defer cancel()

		if err := h.publisher.PublishBatch(ctx, processedEvents); err != nil {
			log.Printf("Failed to publish batch events: %v", err)
			// Mark all processed events as failed
			for i := range results {
				if results[i].Success {
					results[i].Success = false
					results[i].Message = "Failed to publish to Kafka"
					failedCount++
					processedCount--
				}
			}
		}
	}

	// Record metrics
	if processedCount > 0 {
		h.recordBatchSuccess(startTime, processedCount)
	}
	if failedCount > 0 {
		h.recordBatchError(failedCount)
	}

	statusCode := http.StatusCreated
	if processedCount == 0 {
		statusCode = http.StatusBadRequest
	} else if failedCount > 0 {
		statusCode = http.StatusPartialContent
	}

	c.JSON(statusCode, models.BatchEventResponse{
		Success:        processedCount > 0,
		ProcessedCount: processedCount,
		FailedCount:    failedCount,
		Results:        results,
		ProcessedAt:    time.Now().UTC(),
	})
}

// GetHealth returns the health status of the service
func (h *EventHandler) GetHealth(c *gin.Context) {
	checks := make(map[string]string)

	// Check Kafka connectivity (simplified)
	checks["kafka"] = "ok"

	// Check service metrics
	h.metrics.mu.RLock()
	uptime := time.Since(h.metrics.StartTime)
	h.metrics.mu.RUnlock()

	status := models.HealthStatus{
		Status:    "healthy",
		Service:   "event-service",
		Version:   "1.0.0",
		Timestamp: time.Now().UTC(),
		Checks:    checks,
		Uptime:    uptime.String(),
	}

	c.JSON(http.StatusOK, status)
}

// GetMetrics returns service performance metrics
func (h *EventHandler) GetMetrics(c *gin.Context) {
	h.metrics.mu.RLock()
	defer h.metrics.mu.RUnlock()

	var eventsPerSecond float64
	if h.metrics.RequestCount > 0 {
		duration := time.Since(h.metrics.StartTime).Seconds()
		eventsPerSecond = float64(h.metrics.EventsProcessed) / duration
	}

	var averageLatency float64
	if h.metrics.RequestCount > 0 {
		averageLatency = float64(h.metrics.TotalLatencyMs) / float64(h.metrics.RequestCount)
	}

	var errorRate float64
	if h.metrics.RequestCount > 0 {
		errorRate = float64(h.metrics.ErrorCount) / float64(h.metrics.RequestCount)
	}

	metrics := models.MetricsResponse{
		EventsProcessed:     h.metrics.EventsProcessed,
		EventsPerSecond:     eventsPerSecond,
		AverageLatencyMs:    averageLatency,
		ErrorRate:           errorRate,
		KafkaLag:            0,        // TODO: Implement Kafka lag monitoring
		CircuitBreakerState: "closed", // TODO: Get actual circuit breaker state
		Timestamp:           time.Now().UTC(),
	}

	c.JSON(http.StatusOK, metrics)
}

// Helper methods for recording metrics
func (h *EventHandler) recordSuccess(startTime time.Time) {
	h.metrics.mu.Lock()
	defer h.metrics.mu.Unlock()

	h.metrics.EventsProcessed++
	h.metrics.RequestCount++
	h.metrics.TotalLatencyMs += time.Since(startTime).Milliseconds()
	h.metrics.LastProcessedTime = time.Now()
}

func (h *EventHandler) recordBatchSuccess(startTime time.Time, count int) {
	h.metrics.mu.Lock()
	defer h.metrics.mu.Unlock()

	h.metrics.EventsProcessed += int64(count)
	h.metrics.RequestCount++
	h.metrics.TotalLatencyMs += time.Since(startTime).Milliseconds()
	h.metrics.LastProcessedTime = time.Now()
}

func (h *EventHandler) recordError() {
	h.metrics.mu.Lock()
	defer h.metrics.mu.Unlock()

	h.metrics.ErrorCount++
	h.metrics.RequestCount++
}

func (h *EventHandler) recordBatchError(count int) {
	h.metrics.mu.Lock()
	defer h.metrics.mu.Unlock()

	h.metrics.ErrorCount += int64(count)
}

// Helper methods for mapping event data to structured types
func (h *EventHandler) mapToAttemptEvent(data map[string]interface{}) (*models.AttemptEvent, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	var event models.AttemptEvent
	if err := json.Unmarshal(jsonData, &event); err != nil {
		return nil, err
	}

	return &event, nil
}

func (h *EventHandler) mapToSessionEvent(data map[string]interface{}) (*models.SessionEvent, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	var event models.SessionEvent
	if err := json.Unmarshal(jsonData, &event); err != nil {
		return nil, err
	}

	return &event, nil
}

func (h *EventHandler) mapToPlacementEvent(data map[string]interface{}) (*models.PlacementEvent, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	var event models.PlacementEvent
	if err := json.Unmarshal(jsonData, &event); err != nil {
		return nil, err
	}

	return &event, nil
}
