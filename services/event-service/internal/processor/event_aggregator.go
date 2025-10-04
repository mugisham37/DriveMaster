package processor

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"event-service/internal/config"
	"event-service/internal/models"

	"github.com/go-redis/redis/v8"
)

// EventAggregator handles real-time event aggregation for analytics
type EventAggregator struct {
	config      *config.Config
	redisClient *redis.Client
	aggregators map[string]*Aggregator
	mu          sync.RWMutex
}

// Aggregator represents a specific aggregation configuration
type Aggregator struct {
	Name           string        `json:"name"`
	KeyPattern     string        `json:"key_pattern"`
	WindowSize     time.Duration `json:"window_size"`
	AggregateFunc  string        `json:"aggregate_func"`
	Fields         []string      `json:"fields"`
	GroupBy        []string      `json:"group_by"`
	Filters        []Filter      `json:"filters"`
	RetentionHours int           `json:"retention_hours"`
}

// Filter represents a filter condition for aggregation
type Filter struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

// AggregationResult represents the result of an aggregation
type AggregationResult struct {
	Key         string                 `json:"key"`
	WindowStart time.Time              `json:"window_start"`
	WindowEnd   time.Time              `json:"window_end"`
	Count       int64                  `json:"count"`
	Sum         map[string]float64     `json:"sum"`
	Average     map[string]float64     `json:"average"`
	Min         map[string]float64     `json:"min"`
	Max         map[string]float64     `json:"max"`
	Distinct    map[string]int64       `json:"distinct"`
	Custom      map[string]interface{} `json:"custom"`
	LastUpdated time.Time              `json:"last_updated"`
}

// NewEventAggregator creates a new event aggregator
func NewEventAggregator(cfg *config.Config) *EventAggregator {
	// Initialize Redis client for aggregation data
	redisClient := redis.NewClient(&redis.Options{
		Addr:         cfg.Redis.Address,
		Password:     cfg.Redis.Password,
		DB:           cfg.Redis.AggregationDB,
		PoolSize:     cfg.Redis.PoolSize,
		MinIdleConns: cfg.Redis.MinIdleConns,
		MaxRetries:   cfg.Redis.MaxRetries,
		DialTimeout:  cfg.Redis.DialTimeout,
		ReadTimeout:  cfg.Redis.ReadTimeout,
		WriteTimeout: cfg.Redis.WriteTimeout,
	})

	aggregator := &EventAggregator{
		config:      cfg,
		redisClient: redisClient,
		aggregators: make(map[string]*Aggregator),
	}

	// Initialize default aggregators
	aggregator.initializeDefaultAggregators()

	return aggregator
}

// AggregateEvent aggregates an event based on configured aggregators
func (a *EventAggregator) AggregateEvent(ctx context.Context, event interface{}, eventType models.EventType, enrichedData map[string]interface{}) (map[string]interface{}, error) {
	aggregatedData := make(map[string]interface{})

	// Get applicable aggregators for this event type
	applicableAggregators := a.getApplicableAggregators(eventType)

	for _, aggregator := range applicableAggregators {
		result, err := a.processAggregation(ctx, event, eventType, enrichedData, aggregator)
		if err != nil {
			log.Printf("Failed to process aggregation %s: %v", aggregator.Name, err)
			continue
		}

		if result != nil {
			aggregatedData[aggregator.Name] = result
		}
	}

	return aggregatedData, nil
}

// processAggregation processes a single aggregation
func (a *EventAggregator) processAggregation(ctx context.Context, event interface{}, eventType models.EventType, enrichedData map[string]interface{}, aggregator *Aggregator) (*AggregationResult, error) {
	// Check if event passes filters
	if !a.passesFilters(event, eventType, enrichedData, aggregator.Filters) {
		return nil, nil
	}

	// Generate aggregation key
	key, err := a.generateAggregationKey(event, eventType, enrichedData, aggregator)
	if err != nil {
		return nil, fmt.Errorf("failed to generate aggregation key: %w", err)
	}

	// Get current window
	windowStart, windowEnd := a.getCurrentWindow(time.Now(), aggregator.WindowSize)

	// Update aggregation in Redis
	result, err := a.updateAggregation(ctx, key, windowStart, windowEnd, event, eventType, enrichedData, aggregator)
	if err != nil {
		return nil, fmt.Errorf("failed to update aggregation: %w", err)
	}

	return result, nil
}

// updateAggregation updates the aggregation data in Redis
func (a *EventAggregator) updateAggregation(ctx context.Context, key string, windowStart, windowEnd time.Time, event interface{}, eventType models.EventType, enrichedData map[string]interface{}, aggregator *Aggregator) (*AggregationResult, error) {
	// Create Redis key for this aggregation window
	redisKey := fmt.Sprintf("agg:%s:%s:%d", aggregator.Name, key, windowStart.Unix())

	// Get current aggregation data
	currentData, err := a.redisClient.Get(ctx, redisKey).Result()
	var result *AggregationResult

	if err == redis.Nil {
		// Create new aggregation
		result = &AggregationResult{
			Key:         key,
			WindowStart: windowStart,
			WindowEnd:   windowEnd,
			Count:       0,
			Sum:         make(map[string]float64),
			Average:     make(map[string]float64),
			Min:         make(map[string]float64),
			Max:         make(map[string]float64),
			Distinct:    make(map[string]int64),
			Custom:      make(map[string]interface{}),
			LastUpdated: time.Now(),
		}
	} else if err != nil {
		return nil, fmt.Errorf("failed to get current aggregation: %w", err)
	} else {
		// Parse existing aggregation
		if err := json.Unmarshal([]byte(currentData), &result); err != nil {
			return nil, fmt.Errorf("failed to unmarshal aggregation data: %w", err)
		}
	}

	// Update aggregation based on event
	a.updateAggregationValues(result, event, eventType, enrichedData, aggregator)

	// Save updated aggregation
	updatedData, err := json.Marshal(result)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal updated aggregation: %w", err)
	}

	// Set with expiration
	expiration := time.Duration(aggregator.RetentionHours) * time.Hour
	if err := a.redisClient.Set(ctx, redisKey, updatedData, expiration).Err(); err != nil {
		return nil, fmt.Errorf("failed to save aggregation: %w", err)
	}

	return result, nil
}

// updateAggregationValues updates the aggregation values based on the event
func (a *EventAggregator) updateAggregationValues(result *AggregationResult, event interface{}, eventType models.EventType, enrichedData map[string]interface{}, aggregator *Aggregator) {
	result.Count++
	result.LastUpdated = time.Now()

	// Process each field specified in the aggregator
	for _, field := range aggregator.Fields {
		value := a.extractFieldValue(event, eventType, enrichedData, field)
		if value == nil {
			continue
		}

		switch aggregator.AggregateFunc {
		case "sum", "average":
			if numValue, ok := a.toFloat64(value); ok {
				result.Sum[field] += numValue
				result.Average[field] = result.Sum[field] / float64(result.Count)
			}

		case "min":
			if numValue, ok := a.toFloat64(value); ok {
				if _, exists := result.Min[field]; !exists {
					result.Min[field] = numValue
				} else {
					result.Min[field] = min(result.Min[field], numValue)
				}
			}

		case "max":
			if numValue, ok := a.toFloat64(value); ok {
				if _, exists := result.Max[field]; !exists {
					result.Max[field] = numValue
				} else {
					result.Max[field] = max(result.Max[field], numValue)
				}
			}

		case "distinct":
			// For distinct count, we'd need to maintain a set (simplified here)
			result.Distinct[field]++

		case "custom":
			// Handle custom aggregation functions
			a.processCustomAggregation(result, field, value, aggregator)
		}
	}

	// Add event-specific custom aggregations
	switch eventType {
	case models.EventTypeAttempt:
		a.processAttemptAggregation(result, event.(*models.AttemptEvent), enrichedData)
	case models.EventTypeSession:
		a.processSessionAggregation(result, event.(*models.SessionEvent), enrichedData)
	case models.EventTypePlacement:
		a.processPlacementAggregation(result, event.(*models.PlacementEvent), enrichedData)
	}
}

// processAttemptAggregation handles attempt-specific aggregations
func (a *EventAggregator) processAttemptAggregation(result *AggregationResult, event *models.AttemptEvent, enrichedData map[string]interface{}) {
	// Track accuracy
	if event.Correct {
		result.Custom["correct_count"] = a.incrementCustomValue(result.Custom["correct_count"])
	}
	result.Custom["accuracy"] = a.getCustomFloat64(result.Custom["correct_count"]) / float64(result.Count)

	// Track response times
	responseTime := float64(event.TimeTakenMs)
	result.Custom["total_response_time"] = a.getCustomFloat64(result.Custom["total_response_time"]) + responseTime
	result.Custom["average_response_time"] = a.getCustomFloat64(result.Custom["total_response_time"]) / float64(result.Count)

	// Track quality scores
	if event.Quality > 0 {
		result.Custom["total_quality"] = a.getCustomFloat64(result.Custom["total_quality"]) + float64(event.Quality)
		result.Custom["average_quality"] = a.getCustomFloat64(result.Custom["total_quality"]) / float64(result.Count)
	}

	// Track hints usage
	if event.HintsUsed > 0 {
		result.Custom["hints_used_count"] = a.incrementCustomValue(result.Custom["hints_used_count"])
		result.Custom["total_hints"] = a.getCustomFloat64(result.Custom["total_hints"]) + float64(event.HintsUsed)
	}
}

// processSessionAggregation handles session-specific aggregations
func (a *EventAggregator) processSessionAggregation(result *AggregationResult, event *models.SessionEvent, enrichedData map[string]interface{}) {
	// Track session duration
	sessionDuration := event.EndTime.Sub(event.StartTime).Minutes()
	result.Custom["total_session_duration"] = a.getCustomFloat64(result.Custom["total_session_duration"]) + sessionDuration
	result.Custom["average_session_duration"] = a.getCustomFloat64(result.Custom["total_session_duration"]) / float64(result.Count)

	// Track session accuracy
	sessionAccuracy := float64(event.CorrectCount) / float64(event.ItemsAttempted)
	result.Custom["total_session_accuracy"] = a.getCustomFloat64(result.Custom["total_session_accuracy"]) + sessionAccuracy
	result.Custom["average_session_accuracy"] = a.getCustomFloat64(result.Custom["total_session_accuracy"]) / float64(result.Count)

	// Track items per session
	result.Custom["total_items_attempted"] = a.getCustomFloat64(result.Custom["total_items_attempted"]) + float64(event.ItemsAttempted)
	result.Custom["average_items_per_session"] = a.getCustomFloat64(result.Custom["total_items_attempted"]) / float64(result.Count)
}

// processPlacementAggregation handles placement-specific aggregations
func (a *EventAggregator) processPlacementAggregation(result *AggregationResult, event *models.PlacementEvent, enrichedData map[string]interface{}) {
	// Track completion rate
	if event.WasCompleted {
		result.Custom["completed_count"] = a.incrementCustomValue(result.Custom["completed_count"])
	}
	result.Custom["completion_rate"] = a.getCustomFloat64(result.Custom["completed_count"]) / float64(result.Count)

	// Track placement accuracy
	if event.WasCompleted && event.OverallAccuracy > 0 {
		result.Custom["total_placement_accuracy"] = a.getCustomFloat64(result.Custom["total_placement_accuracy"]) + event.OverallAccuracy
		completedCount := a.getCustomFloat64(result.Custom["completed_count"])
		if completedCount > 0 {
			result.Custom["average_placement_accuracy"] = a.getCustomFloat64(result.Custom["total_placement_accuracy"]) / completedCount
		}
	}
}

// Helper methods
func (a *EventAggregator) passesFilters(event interface{}, eventType models.EventType, enrichedData map[string]interface{}, filters []Filter) bool {
	for _, filter := range filters {
		value := a.extractFieldValue(event, eventType, enrichedData, filter.Field)
		if !a.evaluateFilter(value, filter) {
			return false
		}
	}
	return true
}

func (a *EventAggregator) evaluateFilter(value interface{}, filter Filter) bool {
	switch filter.Operator {
	case "eq":
		return value == filter.Value
	case "ne":
		return value != filter.Value
	case "gt":
		if numValue, ok := a.toFloat64(value); ok {
			if filterValue, ok := a.toFloat64(filter.Value); ok {
				return numValue > filterValue
			}
		}
	case "gte":
		if numValue, ok := a.toFloat64(value); ok {
			if filterValue, ok := a.toFloat64(filter.Value); ok {
				return numValue >= filterValue
			}
		}
	case "lt":
		if numValue, ok := a.toFloat64(value); ok {
			if filterValue, ok := a.toFloat64(filter.Value); ok {
				return numValue < filterValue
			}
		}
	case "lte":
		if numValue, ok := a.toFloat64(value); ok {
			if filterValue, ok := a.toFloat64(filter.Value); ok {
				return numValue <= filterValue
			}
		}
	case "in":
		if filterSlice, ok := filter.Value.([]interface{}); ok {
			for _, filterItem := range filterSlice {
				if value == filterItem {
					return true
				}
			}
		}
		return false
	case "contains":
		if strValue, ok := value.(string); ok {
			if filterStr, ok := filter.Value.(string); ok {
				return contains(strValue, filterStr)
			}
		}
	}
	return false
}

func (a *EventAggregator) extractFieldValue(event interface{}, eventType models.EventType, enrichedData map[string]interface{}, field string) interface{} {
	// First check enriched data
	if value, exists := enrichedData[field]; exists {
		return value
	}

	// Then check event data
	switch eventType {
	case models.EventTypeAttempt:
		if attemptEvent, ok := event.(*models.AttemptEvent); ok {
			return a.extractAttemptField(attemptEvent, field)
		}
	case models.EventTypeSession:
		if sessionEvent, ok := event.(*models.SessionEvent); ok {
			return a.extractSessionField(sessionEvent, field)
		}
	case models.EventTypePlacement:
		if placementEvent, ok := event.(*models.PlacementEvent); ok {
			return a.extractPlacementField(placementEvent, field)
		}
	}

	return nil
}

func (a *EventAggregator) extractAttemptField(event *models.AttemptEvent, field string) interface{} {
	switch field {
	case "user_id":
		return event.UserID
	case "item_id":
		return event.ItemID
	case "correct":
		return event.Correct
	case "quality":
		return event.Quality
	case "time_taken_ms":
		return event.TimeTakenMs
	case "hints_used":
		return event.HintsUsed
	case "device_type":
		return event.DeviceType
	case "app_version":
		return event.AppVersion
	default:
		return nil
	}
}

func (a *EventAggregator) extractSessionField(event *models.SessionEvent, field string) interface{} {
	switch field {
	case "user_id":
		return event.UserID
	case "session_type":
		return event.SessionType
	case "items_attempted":
		return event.ItemsAttempted
	case "correct_count":
		return event.CorrectCount
	case "total_time_ms":
		return event.TotalTimeMs
	case "device_type":
		return event.DeviceType
	case "app_version":
		return event.AppVersion
	default:
		return nil
	}
}

func (a *EventAggregator) extractPlacementField(event *models.PlacementEvent, field string) interface{} {
	switch field {
	case "user_id":
		return event.UserID
	case "was_completed":
		return event.WasCompleted
	case "overall_accuracy":
		return event.OverallAccuracy
	case "items_administered":
		return event.ItemsAdministered
	case "device_type":
		return event.DeviceType
	case "app_version":
		return event.AppVersion
	default:
		return nil
	}
}

func (a *EventAggregator) generateAggregationKey(event interface{}, eventType models.EventType, enrichedData map[string]interface{}, aggregator *Aggregator) (string, error) {
	keyParts := []string{}

	for _, groupByField := range aggregator.GroupBy {
		value := a.extractFieldValue(event, eventType, enrichedData, groupByField)
		if value != nil {
			keyParts = append(keyParts, fmt.Sprintf("%s:%v", groupByField, value))
		}
	}

	if len(keyParts) == 0 {
		return "global", nil
	}

	return fmt.Sprintf("%s", keyParts), nil
}

func (a *EventAggregator) getCurrentWindow(timestamp time.Time, windowSize time.Duration) (time.Time, time.Time) {
	windowStart := timestamp.Truncate(windowSize)
	windowEnd := windowStart.Add(windowSize)
	return windowStart, windowEnd
}

func (a *EventAggregator) getApplicableAggregators(eventType models.EventType) []*Aggregator {
	a.mu.RLock()
	defer a.mu.RUnlock()

	var applicable []*Aggregator
	for _, aggregator := range a.aggregators {
		// Check if aggregator applies to this event type
		if a.aggregatorAppliesTo(aggregator, eventType) {
			applicable = append(applicable, aggregator)
		}
	}

	return applicable
}

func (a *EventAggregator) aggregatorAppliesTo(aggregator *Aggregator, eventType models.EventType) bool {
	// For now, apply all aggregators to all event types
	// In a real implementation, you might have event type filters
	return true
}

func (a *EventAggregator) processCustomAggregation(result *AggregationResult, field string, value interface{}, aggregator *Aggregator) {
	// Implement custom aggregation logic here
	// This is a placeholder for custom aggregation functions
}

// Utility methods
func (a *EventAggregator) toFloat64(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int32:
		return float64(v), true
	case int64:
		return float64(v), true
	case bool:
		if v {
			return 1.0, true
		}
		return 0.0, true
	default:
		return 0, false
	}
}

func (a *EventAggregator) incrementCustomValue(value interface{}) float64 {
	if current, ok := a.toFloat64(value); ok {
		return current + 1
	}
	return 1
}

func (a *EventAggregator) getCustomFloat64(value interface{}) float64 {
	if current, ok := a.toFloat64(value); ok {
		return current
	}
	return 0
}

// initializeDefaultAggregators sets up default aggregation configurations
func (a *EventAggregator) initializeDefaultAggregators() {
	a.mu.Lock()
	defer a.mu.Unlock()

	// User activity aggregations
	a.aggregators["user_hourly_attempts"] = &Aggregator{
		Name:           "user_hourly_attempts",
		KeyPattern:     "user:{user_id}:hour",
		WindowSize:     time.Hour,
		AggregateFunc:  "sum",
		Fields:         []string{"correct", "time_taken_ms"},
		GroupBy:        []string{"user_id"},
		RetentionHours: 168, // 7 days
	}

	a.aggregators["user_daily_sessions"] = &Aggregator{
		Name:           "user_daily_sessions",
		KeyPattern:     "user:{user_id}:day",
		WindowSize:     24 * time.Hour,
		AggregateFunc:  "sum",
		Fields:         []string{"items_attempted", "correct_count", "total_time_ms"},
		GroupBy:        []string{"user_id"},
		RetentionHours: 720, // 30 days
	}

	// Item performance aggregations
	a.aggregators["item_hourly_performance"] = &Aggregator{
		Name:           "item_hourly_performance",
		KeyPattern:     "item:{item_id}:hour",
		WindowSize:     time.Hour,
		AggregateFunc:  "average",
		Fields:         []string{"correct", "time_taken_ms", "quality"},
		GroupBy:        []string{"item_id"},
		RetentionHours: 168, // 7 days
	}

	// Global system aggregations
	a.aggregators["system_5min_metrics"] = &Aggregator{
		Name:           "system_5min_metrics",
		KeyPattern:     "system:5min",
		WindowSize:     5 * time.Minute,
		AggregateFunc:  "sum",
		Fields:         []string{"correct", "time_taken_ms"},
		GroupBy:        []string{},
		RetentionHours: 24, // 1 day
	}

	// Jurisdiction-based aggregations
	a.aggregators["jurisdiction_daily_stats"] = &Aggregator{
		Name:           "jurisdiction_daily_stats",
		KeyPattern:     "jurisdiction:{jurisdiction}:day",
		WindowSize:     24 * time.Hour,
		AggregateFunc:  "average",
		Fields:         []string{"correct", "time_taken_ms"},
		GroupBy:        []string{"jurisdiction"},
		RetentionHours: 720, // 30 days
	}
}

// GetAggregationData retrieves aggregation data for a specific key and time range
func (a *EventAggregator) GetAggregationData(ctx context.Context, aggregatorName, key string, startTime, endTime time.Time) ([]*AggregationResult, error) {
	aggregator, exists := a.aggregators[aggregatorName]
	if !exists {
		return nil, fmt.Errorf("aggregator %s not found", aggregatorName)
	}

	var results []*AggregationResult
	current := startTime.Truncate(aggregator.WindowSize)

	for current.Before(endTime) {
		redisKey := fmt.Sprintf("agg:%s:%s:%d", aggregatorName, key, current.Unix())
		
		data, err := a.redisClient.Get(ctx, redisKey).Result()
		if err == redis.Nil {
			// No data for this window, skip
			current = current.Add(aggregator.WindowSize)
			continue
		} else if err != nil {
			return nil, fmt.Errorf("failed to get aggregation data: %w", err)
		}

		var result AggregationResult
		if err := json.Unmarshal([]byte(data), &result); err != nil {
			return nil, fmt.Errorf("failed to unmarshal aggregation data: %w", err)
		}

		results = append(results, &result)
		current = current.Add(aggregator.WindowSize)
	}

	return results, nil
}

// Close closes the aggregator and its resources
func (a *EventAggregator) Close() error {
	return a.redisClient.Close()
}

// contains checks if a string contains a substring (helper function)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr ||
		(len(s) > len(substr) &&
			(s[:len(substr)] == substr ||
				s[len(s)-len(substr):] == substr ||
				containsSubstring(s, substr))))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}