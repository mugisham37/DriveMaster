package processor

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"
	"sync"
	"time"

	"event-service/internal/config"
	"event-service/internal/models"
)

// EventFilter handles event filtering and routing logic
type EventFilter struct {
	config  *config.Config
	filters map[string]*FilterRule
	mu      sync.RWMutex
}

// FilterRule represents a filtering rule
type FilterRule struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	EventTypes  []models.EventType `json:"event_types"`
	Conditions  []FilterCondition `json:"conditions"`
	Action      FilterAction      `json:"action"`
	Priority    int               `json:"priority"`
	Enabled     bool              `json:"enabled"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// FilterCondition represents a condition in a filter rule
type FilterCondition struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
	Negate   bool        `json:"negate"`
}

// FilterAction defines what to do when a filter matches
type FilterAction struct {
	Type       string                 `json:"type"` // "allow", "block", "route", "transform"
	Parameters map[string]interface{} `json:"parameters"`
}

// FilterResult contains the result of event filtering
type FilterResult struct {
	ShouldProcess   bool     `json:"should_process"`
	Reason          string   `json:"reason"`
	MatchedFilters  []string `json:"matched_filters"`
	FiltersPassed   []string `json:"filters_passed"`
	Transformations []string `json:"transformations"`
	RoutingHints    []string `json:"routing_hints"`
}

// NewEventFilter creates a new event filter
func NewEventFilter(cfg *config.Config) *EventFilter {
	filter := &EventFilter{
		config:  cfg,
		filters: make(map[string]*FilterRule),
	}

	// Initialize default filters
	filter.initializeDefaultFilters()

	return filter
}

// ShouldProcess determines if an event should be processed based on filter rules
func (f *EventFilter) ShouldProcess(ctx context.Context, event interface{}, eventType models.EventType) (FilterResult, error) {
	result := FilterResult{
		ShouldProcess:   true,
		Reason:          "no_filters_matched",
		MatchedFilters:  []string{},
		FiltersPassed:   []string{},
		Transformations: []string{},
		RoutingHints:    []string{},
	}

	// Get applicable filters for this event type
	applicableFilters := f.getApplicableFilters(eventType)

	// Sort filters by priority (higher priority first)
	f.sortFiltersByPriority(applicableFilters)

	// Apply filters in order
	for _, filter := range applicableFilters {
		if !filter.Enabled {
			continue
		}

		matches, err := f.evaluateFilter(event, eventType, filter)
		if err != nil {
			log.Printf("Error evaluating filter %s: %v", filter.Name, err)
			continue
		}

		if matches {
			result.MatchedFilters = append(result.MatchedFilters, filter.Name)

			switch filter.Action.Type {
			case "block":
				result.ShouldProcess = false
				result.Reason = fmt.Sprintf("blocked_by_filter_%s", filter.Name)
				return result, nil

			case "allow":
				result.FiltersPassed = append(result.FiltersPassed, filter.Name)

			case "route":
				if routes, ok := filter.Action.Parameters["routes"].([]string); ok {
					result.RoutingHints = append(result.RoutingHints, routes...)
				}
				result.FiltersPassed = append(result.FiltersPassed, filter.Name)

			case "transform":
				if transforms, ok := filter.Action.Parameters["transformations"].([]string); ok {
					result.Transformations = append(result.Transformations, transforms...)
				}
				result.FiltersPassed = append(result.FiltersPassed, filter.Name)

			default:
				result.FiltersPassed = append(result.FiltersPassed, filter.Name)
			}
		}
	}

	if len(result.FiltersPassed) > 0 {
		result.Reason = "filters_passed"
	}

	return result, nil
}

// evaluateFilter evaluates a single filter against an event
func (f *EventFilter) evaluateFilter(event interface{}, eventType models.EventType, filter *FilterRule) (bool, error) {
	// Check if filter applies to this event type
	if !f.filterAppliesTo(filter, eventType) {
		return false, nil
	}

	// Evaluate all conditions (AND logic)
	for _, condition := range filter.Conditions {
		matches, err := f.evaluateCondition(event, eventType, condition)
		if err != nil {
			return false, err
		}

		// Apply negation if specified
		if condition.Negate {
			matches = !matches
		}

		// If any condition fails, the filter doesn't match
		if !matches {
			return false, nil
		}
	}

	return true, nil
}

// evaluateCondition evaluates a single condition
func (f *EventFilter) evaluateCondition(event interface{}, eventType models.EventType, condition FilterCondition) (bool, error) {
	// Extract field value from event
	fieldValue := f.extractFieldValue(event, eventType, condition.Field)

	switch condition.Operator {
	case "eq":
		return f.compareEqual(fieldValue, condition.Value), nil

	case "ne":
		return !f.compareEqual(fieldValue, condition.Value), nil

	case "gt":
		return f.compareGreater(fieldValue, condition.Value), nil

	case "gte":
		return f.compareGreaterEqual(fieldValue, condition.Value), nil

	case "lt":
		return f.compareLess(fieldValue, condition.Value), nil

	case "lte":
		return f.compareLessEqual(fieldValue, condition.Value), nil

	case "in":
		return f.compareIn(fieldValue, condition.Value), nil

	case "not_in":
		return !f.compareIn(fieldValue, condition.Value), nil

	case "contains":
		return f.compareContains(fieldValue, condition.Value), nil

	case "not_contains":
		return !f.compareContains(fieldValue, condition.Value), nil

	case "regex":
		return f.compareRegex(fieldValue, condition.Value), nil

	case "exists":
		return fieldValue != nil, nil

	case "not_exists":
		return fieldValue == nil, nil

	case "between":
		return f.compareBetween(fieldValue, condition.Value), nil

	case "starts_with":
		return f.compareStartsWith(fieldValue, condition.Value), nil

	case "ends_with":
		return f.compareEndsWith(fieldValue, condition.Value), nil

	default:
		return false, fmt.Errorf("unsupported operator: %s", condition.Operator)
	}
}

// Comparison methods
func (f *EventFilter) compareEqual(fieldValue, conditionValue interface{}) bool {
	return fieldValue == conditionValue
}

func (f *EventFilter) compareGreater(fieldValue, conditionValue interface{}) bool {
	fieldNum, fieldOk := f.toFloat64(fieldValue)
	conditionNum, conditionOk := f.toFloat64(conditionValue)
	return fieldOk && conditionOk && fieldNum > conditionNum
}

func (f *EventFilter) compareGreaterEqual(fieldValue, conditionValue interface{}) bool {
	fieldNum, fieldOk := f.toFloat64(fieldValue)
	conditionNum, conditionOk := f.toFloat64(conditionValue)
	return fieldOk && conditionOk && fieldNum >= conditionNum
}

func (f *EventFilter) compareLess(fieldValue, conditionValue interface{}) bool {
	fieldNum, fieldOk := f.toFloat64(fieldValue)
	conditionNum, conditionOk := f.toFloat64(conditionValue)
	return fieldOk && conditionOk && fieldNum < conditionNum
}

func (f *EventFilter) compareLessEqual(fieldValue, conditionValue interface{}) bool {
	fieldNum, fieldOk := f.toFloat64(fieldValue)
	conditionNum, conditionOk := f.toFloat64(conditionValue)
	return fieldOk && conditionOk && fieldNum <= conditionNum
}

func (f *EventFilter) compareIn(fieldValue, conditionValue interface{}) bool {
	if conditionSlice, ok := conditionValue.([]interface{}); ok {
		for _, item := range conditionSlice {
			if fieldValue == item {
				return true
			}
		}
	}
	return false
}

func (f *EventFilter) compareContains(fieldValue, conditionValue interface{}) bool {
	fieldStr, fieldOk := fieldValue.(string)
	conditionStr, conditionOk := conditionValue.(string)
	return fieldOk && conditionOk && strings.Contains(fieldStr, conditionStr)
}

func (f *EventFilter) compareRegex(fieldValue, conditionValue interface{}) bool {
	fieldStr, fieldOk := fieldValue.(string)
	conditionStr, conditionOk := conditionValue.(string)
	if !fieldOk || !conditionOk {
		return false
	}

	regex, err := regexp.Compile(conditionStr)
	if err != nil {
		log.Printf("Invalid regex pattern %s: %v", conditionStr, err)
		return false
	}

	return regex.MatchString(fieldStr)
}

func (f *EventFilter) compareBetween(fieldValue, conditionValue interface{}) bool {
	fieldNum, fieldOk := f.toFloat64(fieldValue)
	if !fieldOk {
		return false
	}

	if conditionSlice, ok := conditionValue.([]interface{}); ok && len(conditionSlice) == 2 {
		min, minOk := f.toFloat64(conditionSlice[0])
		max, maxOk := f.toFloat64(conditionSlice[1])
		return minOk && maxOk && fieldNum >= min && fieldNum <= max
	}

	return false
}

func (f *EventFilter) compareStartsWith(fieldValue, conditionValue interface{}) bool {
	fieldStr, fieldOk := fieldValue.(string)
	conditionStr, conditionOk := conditionValue.(string)
	return fieldOk && conditionOk && strings.HasPrefix(fieldStr, conditionStr)
}

func (f *EventFilter) compareEndsWith(fieldValue, conditionValue interface{}) bool {
	fieldStr, fieldOk := fieldValue.(string)
	conditionStr, conditionOk := conditionValue.(string)
	return fieldOk && conditionOk && strings.HasSuffix(fieldStr, conditionStr)
}

// extractFieldValue extracts a field value from an event
func (f *EventFilter) extractFieldValue(event interface{}, eventType models.EventType, field string) interface{} {
	switch eventType {
	case models.EventTypeAttempt:
		if attemptEvent, ok := event.(*models.AttemptEvent); ok {
			return f.extractAttemptField(attemptEvent, field)
		}
	case models.EventTypeSession:
		if sessionEvent, ok := event.(*models.SessionEvent); ok {
			return f.extractSessionField(sessionEvent, field)
		}
	case models.EventTypePlacement:
		if placementEvent, ok := event.(*models.PlacementEvent); ok {
			return f.extractPlacementField(placementEvent, field)
		}
	}
	return nil
}

func (f *EventFilter) extractAttemptField(event *models.AttemptEvent, field string) interface{} {
	switch field {
	case "user_id":
		return event.UserID
	case "item_id":
		return event.ItemID
	case "session_id":
		return event.SessionID
	case "correct":
		return event.Correct
	case "quality":
		return event.Quality
	case "confidence":
		return event.Confidence
	case "time_taken_ms":
		return event.TimeTakenMs
	case "hints_used":
		return event.HintsUsed
	case "device_type":
		return event.DeviceType
	case "app_version":
		return event.AppVersion
	case "ip_address":
		return event.IPAddress
	case "user_agent":
		return event.UserAgent
	case "timestamp":
		return event.Timestamp
	default:
		return nil
	}
}

func (f *EventFilter) extractSessionField(event *models.SessionEvent, field string) interface{} {
	switch field {
	case "user_id":
		return event.UserID
	case "session_id":
		return event.SessionID
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
	case "topics_practiced":
		return event.TopicsPracticed
	case "average_difficulty":
		return event.AverageDifficulty
	case "timestamp":
		return event.Timestamp
	case "start_time":
		return event.StartTime
	case "end_time":
		return event.EndTime
	default:
		return nil
	}
}

func (f *EventFilter) extractPlacementField(event *models.PlacementEvent, field string) interface{} {
	switch field {
	case "user_id":
		return event.UserID
	case "placement_id":
		return event.PlacementID
	case "items_administered":
		return event.ItemsAdministered
	case "overall_accuracy":
		return event.OverallAccuracy
	case "was_completed":
		return event.WasCompleted
	case "end_reason":
		return event.EndReason
	case "device_type":
		return event.DeviceType
	case "app_version":
		return event.AppVersion
	case "timestamp":
		return event.Timestamp
	default:
		return nil
	}
}

// Utility methods
func (f *EventFilter) toFloat64(value interface{}) (float64, bool) {
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

func (f *EventFilter) getApplicableFilters(eventType models.EventType) []*FilterRule {
	f.mu.RLock()
	defer f.mu.RUnlock()

	var applicable []*FilterRule
	for _, filter := range f.filters {
		if f.filterAppliesTo(filter, eventType) {
			applicable = append(applicable, filter)
		}
	}

	return applicable
}

func (f *EventFilter) filterAppliesTo(filter *FilterRule, eventType models.EventType) bool {
	if len(filter.EventTypes) == 0 {
		return true // Apply to all event types
	}

	for _, filterEventType := range filter.EventTypes {
		if filterEventType == eventType {
			return true
		}
	}

	return false
}

func (f *EventFilter) sortFiltersByPriority(filters []*FilterRule) {
	// Simple bubble sort by priority (higher priority first)
	for i := 0; i < len(filters)-1; i++ {
		for j := i + 1; j < len(filters); j++ {
			if filters[i].Priority < filters[j].Priority {
				filters[i], filters[j] = filters[j], filters[i]
			}
		}
	}
}

// initializeDefaultFilters sets up default filtering rules
func (f *EventFilter) initializeDefaultFilters() {
	f.mu.Lock()
	defer f.mu.Unlock()

	now := time.Now()

	// Filter for suspicious rapid-fire attempts
	f.filters["rapid_fire_attempts"] = &FilterRule{
		Name:        "rapid_fire_attempts",
		Description: "Detect suspiciously fast attempts that might indicate cheating",
		EventTypes:  []models.EventType{models.EventTypeAttempt},
		Conditions: []FilterCondition{
			{
				Field:    "time_taken_ms",
				Operator: "lt",
				Value:    1000, // Less than 1 second
				Negate:   false,
			},
		},
		Action: FilterAction{
			Type: "route",
			Parameters: map[string]interface{}{
				"routes": []string{"fraud.suspicious_events"},
			},
		},
		Priority:  100,
		Enabled:   true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Filter for high-value users
	f.filters["high_value_user"] = &FilterRule{
		Name:        "high_value_user",
		Description: "Route events from premium users to special analytics",
		EventTypes:  []models.EventType{models.EventTypeAttempt, models.EventTypeSession},
		Conditions: []FilterCondition{
			{
				Field:    "user_type",
				Operator: "eq",
				Value:    "premium",
				Negate:   false,
			},
		},
		Action: FilterAction{
			Type: "route",
			Parameters: map[string]interface{}{
				"routes": []string{"analytics.premium_users"},
			},
		},
		Priority:  80,
		Enabled:   true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Filter for test environment events
	f.filters["test_environment"] = &FilterRule{
		Name:        "test_environment",
		Description: "Block events from test environment",
		EventTypes:  []models.EventType{models.EventTypeAttempt, models.EventTypeSession, models.EventTypePlacement},
		Conditions: []FilterCondition{
			{
				Field:    "app_version",
				Operator: "contains",
				Value:    "test",
				Negate:   false,
			},
		},
		Action: FilterAction{
			Type: "block",
			Parameters: map[string]interface{}{
				"reason": "test_environment_event",
			},
		},
		Priority:  200,
		Enabled:   false, // Disabled by default
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Filter for bot detection
	f.filters["bot_detection"] = &FilterRule{
		Name:        "bot_detection",
		Description: "Detect potential bot activity based on user agent",
		EventTypes:  []models.EventType{models.EventTypeAttempt, models.EventTypeSession},
		Conditions: []FilterCondition{
			{
				Field:    "user_agent",
				Operator: "regex",
				Value:    "(?i)(bot|crawler|spider|scraper)",
				Negate:   false,
			},
		},
		Action: FilterAction{
			Type: "route",
			Parameters: map[string]interface{}{
				"routes": []string{"fraud.bot_events"},
			},
		},
		Priority:  150,
		Enabled:   true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Filter for perfect scores (potential cheating)
	f.filters["perfect_score_detection"] = &FilterRule{
		Name:        "perfect_score_detection",
		Description: "Flag sessions with suspiciously high accuracy",
		EventTypes:  []models.EventType{models.EventTypeSession},
		Conditions: []FilterCondition{
			{
				Field:    "items_attempted",
				Operator: "gte",
				Value:    10,
				Negate:   false,
			},
			{
				Field:    "correct_count",
				Operator: "eq",
				Value:    "items_attempted", // This would need special handling
				Negate:   false,
			},
		},
		Action: FilterAction{
			Type: "route",
			Parameters: map[string]interface{}{
				"routes": []string{"fraud.perfect_scores"},
			},
		},
		Priority:  90,
		Enabled:   true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Filter for new user events
	f.filters["new_user_events"] = &FilterRule{
		Name:        "new_user_events",
		Description: "Route events from new users for special onboarding analytics",
		EventTypes:  []models.EventType{models.EventTypeAttempt, models.EventTypeSession, models.EventTypePlacement},
		Conditions: []FilterCondition{
			{
				Field:    "is_new_user",
				Operator: "eq",
				Value:    true,
				Negate:   false,
			},
		},
		Action: FilterAction{
			Type: "route",
			Parameters: map[string]interface{}{
				"routes": []string{"analytics.new_users"},
			},
		},
		Priority:  70,
		Enabled:   true,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// AddFilter adds a new filter rule
func (f *EventFilter) AddFilter(filter *FilterRule) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if filter.Name == "" {
		return fmt.Errorf("filter name cannot be empty")
	}

	filter.CreatedAt = time.Now()
	filter.UpdatedAt = time.Now()
	f.filters[filter.Name] = filter

	return nil
}

// UpdateFilter updates an existing filter rule
func (f *EventFilter) UpdateFilter(name string, filter *FilterRule) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if _, exists := f.filters[name]; !exists {
		return fmt.Errorf("filter %s not found", name)
	}

	filter.Name = name
	filter.UpdatedAt = time.Now()
	if filter.CreatedAt.IsZero() {
		filter.CreatedAt = f.filters[name].CreatedAt
	}

	f.filters[name] = filter
	return nil
}

// RemoveFilter removes a filter rule
func (f *EventFilter) RemoveFilter(name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if _, exists := f.filters[name]; !exists {
		return fmt.Errorf("filter %s not found", name)
	}

	delete(f.filters, name)
	return nil
}

// GetFilter retrieves a filter rule by name
func (f *EventFilter) GetFilter(name string) (*FilterRule, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()

	if filter, exists := f.filters[name]; exists {
		return filter, nil
	}

	return nil, fmt.Errorf("filter %s not found", name)
}

// ListFilters returns all filter rules
func (f *EventFilter) ListFilters() map[string]*FilterRule {
	f.mu.RLock()
	defer f.mu.RUnlock()

	// Return a copy to avoid race conditions
	result := make(map[string]*FilterRule)
	for name, filter := range f.filters {
		result[name] = filter
	}

	return result
}

// EnableFilter enables a filter rule
func (f *EventFilter) EnableFilter(name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if filter, exists := f.filters[name]; exists {
		filter.Enabled = true
		filter.UpdatedAt = time.Now()
		return nil
	}

	return fmt.Errorf("filter %s not found", name)
}

// DisableFilter disables a filter rule
func (f *EventFilter) DisableFilter(name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if filter, exists := f.filters[name]; exists {
		filter.Enabled = false
		filter.UpdatedAt = time.Now()
		return nil
	}

	return fmt.Errorf("filter %s not found", name)
}

// GetFilterStats returns statistics about filter usage
func (f *EventFilter) GetFilterStats() map[string]interface{} {
	f.mu.RLock()
	defer f.mu.RUnlock()

	stats := map[string]interface{}{
		"total_filters":   len(f.filters),
		"enabled_filters": 0,
		"filters_by_type": make(map[string]int),
	}

	for _, filter := range f.filters {
		if filter.Enabled {
			stats["enabled_filters"] = stats["enabled_filters"].(int) + 1
		}

		actionType := filter.Action.Type
		if count, exists := stats["filters_by_type"].(map[string]int)[actionType]; exists {
			stats["filters_by_type"].(map[string]int)[actionType] = count + 1
		} else {
			stats["filters_by_type"].(map[string]int)[actionType] = 1
		}
	}

	return stats
}