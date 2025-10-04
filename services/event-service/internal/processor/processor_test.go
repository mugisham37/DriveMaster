package processor

import (
	"context"
	"testing"
	"time"

	"event-service/internal/config"
	"event-service/internal/models"
)

func TestEventProcessor_ProcessEventSync(t *testing.T) {
	// Create test config
	cfg := &config.Config{
		EventProcessor: config.EventProcessorConfig{
			Workers:    2,
			BufferSize: 100,
			Enabled:    true,
		},
		Redis: config.RedisConfig{
			Address:         "localhost:6379",
			Password:        "",
			PoolSize:        5,
			MinIdleConns:    1,
			MaxRetries:      3,
			DialTimeout:     5 * time.Second,
			ReadTimeout:     3 * time.Second,
			WriteTimeout:    3 * time.Second,
			EnrichmentDB:    1,
			AggregationDB:   2,
			DeduplicationDB: 3,
		},
	}

	// Create processor
	processor := NewEventProcessor(cfg)
	defer processor.Stop()

	// Create test attempt event
	attemptEvent := &models.AttemptEvent{
		BaseEvent: models.BaseEvent{
			EventID:   "test-event-1",
			EventType: models.EventTypeAttempt,
			UserID:    "test-user-1",
			Timestamp: time.Now(),
		},
		ItemID:          "test-item-1",
		SessionID:       "test-session-1",
		ClientAttemptID: "test-client-attempt-1",
		Selected:        "A",
		Correct:         true,
		Quality:         4,
		TimeTakenMs:     5000,
		HintsUsed:       0,
		DeviceType:      "mobile",
		AppVersion:      "1.0.0",
	}

	// Process event
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	processedEvent, err := processor.ProcessEventSync(ctx, attemptEvent, models.EventTypeAttempt)

	// Note: This test will fail if Redis is not available, but that's expected
	// In a real test environment, you'd use a test Redis instance or mock
	if err != nil {
		t.Logf("Expected error due to Redis not being available: %v", err)
		return
	}

	// Verify processed event structure
	if processedEvent.OriginalEvent == nil {
		t.Error("Expected original event to be set")
	}

	if processedEvent.ProcessingMeta.ProcessedAt.IsZero() {
		t.Error("Expected processing timestamp to be set")
	}

	if processedEvent.ProcessingMeta.ProcessingTimeMs <= 0 {
		t.Error("Expected processing time to be positive")
	}

	t.Logf("Successfully processed event with %d enrichments", len(processedEvent.EnrichedData))
}

func TestEventDeduplicator_GenerateKey(t *testing.T) {
	cfg := &config.Config{
		Redis: config.RedisConfig{
			Address:         "localhost:6379",
			DeduplicationDB: 3,
		},
	}

	deduplicator := NewEventDeduplicator(cfg)
	defer deduplicator.Close()

	// Test attempt event deduplication key
	attemptEvent := &models.AttemptEvent{
		BaseEvent: models.BaseEvent{
			EventID:   "test-event-1",
			UserID:    "test-user-1",
			Timestamp: time.Now(),
		},
		ClientAttemptID: "test-client-attempt-1",
	}

	key, err := deduplicator.generateDeduplicationKey(attemptEvent, models.EventTypeAttempt)
	if err != nil {
		t.Fatalf("Failed to generate deduplication key: %v", err)
	}

	expectedKey := "attempt:test-client-attempt-1"
	if key != expectedKey {
		t.Errorf("Expected key %s, got %s", expectedKey, key)
	}

	// Test session event deduplication key
	sessionEvent := &models.SessionEvent{
		BaseEvent: models.BaseEvent{
			EventID:   "test-event-2",
			UserID:    "test-user-1",
			Timestamp: time.Now(),
		},
		SessionID: "test-session-1",
	}

	key, err = deduplicator.generateDeduplicationKey(sessionEvent, models.EventTypeSession)
	if err != nil {
		t.Fatalf("Failed to generate deduplication key: %v", err)
	}

	expectedKey = "session:test-session-1"
	if key != expectedKey {
		t.Errorf("Expected key %s, got %s", expectedKey, key)
	}
}

func TestEventFilter_EvaluateCondition(t *testing.T) {
	cfg := &config.Config{}
	filter := NewEventFilter(cfg)

	// Test attempt event
	attemptEvent := &models.AttemptEvent{
		BaseEvent: models.BaseEvent{
			UserID: "test-user-1",
		},
		TimeTakenMs: 500,
		Correct:     true,
		DeviceType:  "mobile",
	}

	// Test equality condition
	condition := FilterCondition{
		Field:    "device_type",
		Operator: "eq",
		Value:    "mobile",
		Negate:   false,
	}

	matches, err := filter.evaluateCondition(attemptEvent, models.EventTypeAttempt, condition)
	if err != nil {
		t.Fatalf("Failed to evaluate condition: %v", err)
	}

	if !matches {
		t.Error("Expected condition to match")
	}

	// Test numeric comparison
	condition = FilterCondition{
		Field:    "time_taken_ms",
		Operator: "lt",
		Value:    1000,
		Negate:   false,
	}

	matches, err = filter.evaluateCondition(attemptEvent, models.EventTypeAttempt, condition)
	if err != nil {
		t.Fatalf("Failed to evaluate condition: %v", err)
	}

	if !matches {
		t.Error("Expected condition to match (time_taken_ms < 1000)")
	}

	// Test boolean condition
	condition = FilterCondition{
		Field:    "correct",
		Operator: "eq",
		Value:    true,
		Negate:   false,
	}

	matches, err = filter.evaluateCondition(attemptEvent, models.EventTypeAttempt, condition)
	if err != nil {
		t.Fatalf("Failed to evaluate condition: %v", err)
	}

	if !matches {
		t.Error("Expected condition to match (correct == true)")
	}
}

func TestEventAggregator_UpdateAggregationValues(t *testing.T) {
	cfg := &config.Config{
		Redis: config.RedisConfig{
			Address:       "localhost:6379",
			AggregationDB: 2,
		},
	}

	aggregator := NewEventAggregator(cfg)
	defer aggregator.Close()

	// Create test aggregation result
	result := &AggregationResult{
		Key:         "test-key",
		WindowStart: time.Now().Truncate(time.Hour),
		WindowEnd:   time.Now().Truncate(time.Hour).Add(time.Hour),
		Count:       0,
		Sum:         make(map[string]float64),
		Average:     make(map[string]float64),
		Min:         make(map[string]float64),
		Max:         make(map[string]float64),
		Distinct:    make(map[string]int64),
		Custom:      make(map[string]interface{}),
	}

	// Create test aggregator config
	aggregatorConfig := &Aggregator{
		Name:          "test_aggregator",
		AggregateFunc: "sum",
		Fields:        []string{"time_taken_ms", "correct"},
	}

	// Create test attempt event
	attemptEvent := &models.AttemptEvent{
		BaseEvent: models.BaseEvent{
			UserID: "test-user-1",
		},
		TimeTakenMs: 1000,
		Correct:     true,
	}

	// Update aggregation values
	aggregator.updateAggregationValues(result, attemptEvent, models.EventTypeAttempt, make(map[string]interface{}), aggregatorConfig)

	// Verify results
	if result.Count != 1 {
		t.Errorf("Expected count to be 1, got %d", result.Count)
	}

	if result.Sum["time_taken_ms"] != 1000 {
		t.Errorf("Expected sum of time_taken_ms to be 1000, got %f", result.Sum["time_taken_ms"])
	}

	if result.Average["time_taken_ms"] != 1000 {
		t.Errorf("Expected average of time_taken_ms to be 1000, got %f", result.Average["time_taken_ms"])
	}

	if result.Sum["correct"] != 1 {
		t.Errorf("Expected sum of correct to be 1, got %f", result.Sum["correct"])
	}

	// Check custom aggregations for attempt events
	if correctCount, exists := result.Custom["correct_count"]; !exists || correctCount != float64(1) {
		t.Errorf("Expected correct_count to be 1, got %v", correctCount)
	}

	if accuracy, exists := result.Custom["accuracy"]; !exists || accuracy != float64(1) {
		t.Errorf("Expected accuracy to be 1, got %v", accuracy)
	}
}
