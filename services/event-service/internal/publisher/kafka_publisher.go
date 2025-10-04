package publisher

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"event-service/internal/config"
	"event-service/internal/models"

	"github.com/klauspost/compress/snappy"
	"github.com/segmentio/kafka-go"
	"github.com/segmentio/kafka-go/compress"
)

// EventPublisher interface defines the contract for event publishing
type EventPublisher interface {
	PublishAttemptEvent(ctx context.Context, event *models.AttemptEvent) error
	PublishSessionEvent(ctx context.Context, event *models.SessionEvent) error
	PublishPlacementEvent(ctx context.Context, event *models.PlacementEvent) error
	PublishBatch(ctx context.Context, events []any) error
	Close() error
}

// KafkaPublisher implements the EventPublisher interface for Kafka
type KafkaPublisher struct {
	config          *config.Config
	writer          *kafka.Writer
	dlqWriter       *kafka.Writer
	metrics         *PublisherMetrics
	mu              sync.RWMutex
	retryPolicy     *RetryPolicy
	compressionType kafka.Compression
}

// PublisherMetrics tracks publishing metrics
type PublisherMetrics struct {
	EventsPublished     int64
	EventsFailed        int64
	EventsRetried       int64
	EventsSentToDLQ     int64
	AverageLatencyMs    float64
	LastPublishTime     time.Time
	CircuitBreakerState string
	mu                  sync.RWMutex
}

// RetryPolicy defines retry behavior
type RetryPolicy struct {
	MaxRetries      int
	InitialDelay    time.Duration
	MaxDelay        time.Duration
	BackoffFactor   float64
	RetryableErrors map[string]bool
}

// NewKafkaPublisher creates a new Kafka publisher
func NewKafkaPublisher(cfg *config.Config) *KafkaPublisher {
	// Determine compression type
	var compression kafka.Compression
	switch cfg.Kafka.CompressionType {
	case "snappy":
		compression = compress.Snappy
	case "gzip":
		compression = compress.Gzip
	case "lz4":
		compression = compress.Lz4
	case "zstd":
		compression = compress.Zstd
	default:
		compression = compress.Snappy // Default to snappy
	}

	// Configure main Kafka writer with high-throughput settings
	writer := &kafka.Writer{
		Addr:         kafka.TCP(cfg.Kafka.Brokers...),
		Balancer:     &kafka.Hash{}, // Use hash balancer for consistent partitioning
		BatchSize:    cfg.Kafka.ProducerBatchSize,
		BatchTimeout: cfg.Kafka.ProducerBatchTimeout,
		ReadTimeout:  cfg.Kafka.ProducerTimeout,
		WriteTimeout: cfg.Kafka.ProducerTimeout,
		RequiredAcks: kafka.RequireOne, // Require at least one acknowledgment
		Async:        false,            // Synchronous for reliability
		Compression:  compression,
		ErrorLogger:  kafka.LoggerFunc(log.Printf),
	}

	// Configure Dead Letter Queue writer
	dlqWriter := &kafka.Writer{
		Addr:         kafka.TCP(cfg.Kafka.Brokers...),
		Topic:        "dlq.events", // Dead letter queue topic
		Balancer:     &kafka.Hash{},
		BatchSize:    10, // Smaller batch size for DLQ
		BatchTimeout: 1 * time.Second,
		ReadTimeout:  cfg.Kafka.ProducerTimeout,
		WriteTimeout: cfg.Kafka.ProducerTimeout,
		RequiredAcks: kafka.RequireOne,
		Async:        false,
		Compression:  compression,
		ErrorLogger:  kafka.LoggerFunc(log.Printf),
	}

	// Initialize retry policy
	retryPolicy := &RetryPolicy{
		MaxRetries:    cfg.Kafka.ProducerRetries,
		InitialDelay:  100 * time.Millisecond,
		MaxDelay:      5 * time.Second,
		BackoffFactor: 2.0,
		RetryableErrors: map[string]bool{
			"kafka: client has run out of available brokers": true,
			"kafka: request timed out":                       true,
			"kafka: broker not available":                    true,
			"kafka: network exception":                       true,
			"kafka: not enough replicas":                     true,
			"kafka: not enough in sync replicas":             true,
			"kafka: leader not available":                    true,
			"context deadline exceeded":                      true,
		},
	}

	return &KafkaPublisher{
		config:          cfg,
		writer:          writer,
		dlqWriter:       dlqWriter,
		retryPolicy:     retryPolicy,
		compressionType: compression,
		metrics: &PublisherMetrics{
			CircuitBreakerState: "CLOSED",
		},
	}
}

// PublishAttemptEvent publishes an attempt event to Kafka with retry logic
func (p *KafkaPublisher) PublishAttemptEvent(ctx context.Context, event *models.AttemptEvent) error {
	startTime := time.Now()

	// Create message with both JSON and Protocol Buffer serialization
	message, err := p.createAttemptMessage(event)
	if err != nil {
		p.updateMetrics(false, time.Since(startTime))
		return fmt.Errorf("failed to create attempt message: %w", err)
	}

	// Publish with retry logic
	err = p.publishWithRetry(ctx, message, "attempt")
	if err != nil {
		p.updateMetrics(false, time.Since(startTime))
		return err
	}

	p.updateMetrics(true, time.Since(startTime))
	log.Printf("Published attempt event: %s for user: %s", event.EventID, event.UserID)
	return nil
}

// PublishSessionEvent publishes a session event to Kafka with retry logic
func (p *KafkaPublisher) PublishSessionEvent(ctx context.Context, event *models.SessionEvent) error {
	startTime := time.Now()

	// Create message with both JSON and Protocol Buffer serialization
	message, err := p.createSessionMessage(event)
	if err != nil {
		p.updateMetrics(false, time.Since(startTime))
		return fmt.Errorf("failed to create session message: %w", err)
	}

	// Publish with retry logic
	err = p.publishWithRetry(ctx, message, "session")
	if err != nil {
		p.updateMetrics(false, time.Since(startTime))
		return err
	}

	p.updateMetrics(true, time.Since(startTime))
	log.Printf("Published session event: %s for user: %s", event.EventID, event.UserID)
	return nil
}

// PublishPlacementEvent publishes a placement event to Kafka with retry logic
func (p *KafkaPublisher) PublishPlacementEvent(ctx context.Context, event *models.PlacementEvent) error {
	startTime := time.Now()

	// Create message with both JSON and Protocol Buffer serialization
	message, err := p.createPlacementMessage(event)
	if err != nil {
		p.updateMetrics(false, time.Since(startTime))
		return fmt.Errorf("failed to create placement message: %w", err)
	}

	// Publish with retry logic
	err = p.publishWithRetry(ctx, message, "placement")
	if err != nil {
		p.updateMetrics(false, time.Since(startTime))
		return err
	}

	p.updateMetrics(true, time.Since(startTime))
	log.Printf("Published placement event: %s for user: %s", event.EventID, event.UserID)
	return nil
}

// PublishBatch publishes a batch of events to Kafka with retry logic
func (p *KafkaPublisher) PublishBatch(ctx context.Context, events []any) error {
	if len(events) == 0 {
		return nil
	}

	startTime := time.Now()
	var messages []kafka.Message

	// Create messages for all events
	for i, event := range events {
		var message kafka.Message
		var err error

		switch e := event.(type) {
		case *models.AttemptEvent:
			message, err = p.createAttemptMessage(e)
		case *models.SessionEvent:
			message, err = p.createSessionMessage(e)
		case *models.PlacementEvent:
			message, err = p.createPlacementMessage(e)
		default:
			p.updateMetrics(false, time.Since(startTime))
			return fmt.Errorf("unsupported event type at index %d: %T", i, event)
		}

		if err != nil {
			p.updateMetrics(false, time.Since(startTime))
			return fmt.Errorf("failed to create message for event at index %d: %w", i, err)
		}

		messages = append(messages, message)
	}

	// Publish batch with retry logic
	err := p.publishBatchWithRetry(ctx, messages)
	if err != nil {
		p.updateMetrics(false, time.Since(startTime))
		return err
	}

	p.updateMetrics(true, time.Since(startTime))
	log.Printf("Published batch of %d events to Kafka", len(events))
	return nil
}

// Close closes the Kafka writers
func (p *KafkaPublisher) Close() error {
	var errs []error

	if p.writer != nil {
		if err := p.writer.Close(); err != nil {
			errs = append(errs, fmt.Errorf("failed to close main writer: %w", err))
		}
	}

	if p.dlqWriter != nil {
		if err := p.dlqWriter.Close(); err != nil {
			errs = append(errs, fmt.Errorf("failed to close DLQ writer: %w", err))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors closing publishers: %v", errs)
	}

	return nil
}

// GetMetrics returns current publisher metrics
func (p *KafkaPublisher) GetMetrics() *PublisherMetrics {
	p.metrics.mu.RLock()
	defer p.metrics.mu.RUnlock()

	// Return a copy to avoid race conditions
	return &PublisherMetrics{
		EventsPublished:     p.metrics.EventsPublished,
		EventsFailed:        p.metrics.EventsFailed,
		EventsRetried:       p.metrics.EventsRetried,
		EventsSentToDLQ:     p.metrics.EventsSentToDLQ,
		AverageLatencyMs:    p.metrics.AverageLatencyMs,
		LastPublishTime:     p.metrics.LastPublishTime,
		CircuitBreakerState: p.metrics.CircuitBreakerState,
	}
}

// publishWithRetry implements retry logic for single message publishing
func (p *KafkaPublisher) publishWithRetry(ctx context.Context, message kafka.Message, eventType string) error {
	var lastErr error

	for attempt := 0; attempt <= p.retryPolicy.MaxRetries; attempt++ {
		if attempt > 0 {
			// Calculate backoff delay
			delay := time.Duration(float64(p.retryPolicy.InitialDelay) *
				float64(attempt) * p.retryPolicy.BackoffFactor)
			if delay > p.retryPolicy.MaxDelay {
				delay = p.retryPolicy.MaxDelay
			}

			log.Printf("Retrying %s event publish (attempt %d/%d) after %v",
				eventType, attempt, p.retryPolicy.MaxRetries, delay)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}

			p.metrics.mu.Lock()
			p.metrics.EventsRetried++
			p.metrics.mu.Unlock()
		}

		// Attempt to publish
		err := p.writer.WriteMessages(ctx, message)
		if err == nil {
			return nil // Success
		}

		lastErr = err

		// Check if error is retryable
		if !p.isRetryableError(err) {
			log.Printf("Non-retryable error for %s event: %v", eventType, err)
			break
		}

		log.Printf("Retryable error for %s event (attempt %d): %v", eventType, attempt+1, err)
	}

	// All retries exhausted, send to DLQ
	log.Printf("Sending %s event to DLQ after %d failed attempts: %v",
		eventType, p.retryPolicy.MaxRetries+1, lastErr)

	if dlqErr := p.sendToDLQ(ctx, message, lastErr.Error()); dlqErr != nil {
		log.Printf("Failed to send %s event to DLQ: %v", eventType, dlqErr)
		return fmt.Errorf("failed to publish %s event and send to DLQ: %w", eventType, lastErr)
	}

	p.metrics.mu.Lock()
	p.metrics.EventsSentToDLQ++
	p.metrics.mu.Unlock()

	return fmt.Errorf("failed to publish %s event after %d attempts, sent to DLQ: %w",
		eventType, p.retryPolicy.MaxRetries+1, lastErr)
}

// publishBatchWithRetry implements retry logic for batch publishing
func (p *KafkaPublisher) publishBatchWithRetry(ctx context.Context, messages []kafka.Message) error {
	var lastErr error

	for attempt := 0; attempt <= p.retryPolicy.MaxRetries; attempt++ {
		if attempt > 0 {
			delay := time.Duration(float64(p.retryPolicy.InitialDelay) *
				float64(attempt) * p.retryPolicy.BackoffFactor)
			if delay > p.retryPolicy.MaxDelay {
				delay = p.retryPolicy.MaxDelay
			}

			log.Printf("Retrying batch publish (attempt %d/%d) after %v",
				attempt, p.retryPolicy.MaxRetries, delay)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}

			p.metrics.mu.Lock()
			p.metrics.EventsRetried += int64(len(messages))
			p.metrics.mu.Unlock()
		}

		// Attempt to publish batch
		err := p.writer.WriteMessages(ctx, messages...)
		if err == nil {
			return nil // Success
		}

		lastErr = err

		// Check if error is retryable
		if !p.isRetryableError(err) {
			log.Printf("Non-retryable error for batch: %v", err)
			break
		}

		log.Printf("Retryable error for batch (attempt %d): %v", attempt+1, err)
	}

	// Send entire batch to DLQ
	log.Printf("Sending batch of %d events to DLQ after %d failed attempts: %v",
		len(messages), p.retryPolicy.MaxRetries+1, lastErr)

	for _, message := range messages {
		if dlqErr := p.sendToDLQ(ctx, message, lastErr.Error()); dlqErr != nil {
			log.Printf("Failed to send message to DLQ: %v", dlqErr)
		}
	}

	p.metrics.mu.Lock()
	p.metrics.EventsSentToDLQ += int64(len(messages))
	p.metrics.mu.Unlock()

	return fmt.Errorf("failed to publish batch after %d attempts, sent to DLQ: %w",
		p.retryPolicy.MaxRetries+1, lastErr)
}

// isRetryableError checks if an error should trigger a retry
func (p *KafkaPublisher) isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	errStr := err.Error()
	for retryableErr := range p.retryPolicy.RetryableErrors {
		if contains(errStr, retryableErr) {
			return true
		}
	}

	return false
}

// sendToDLQ sends a failed message to the dead letter queue
func (p *KafkaPublisher) sendToDLQ(ctx context.Context, originalMessage kafka.Message, errorReason string) error {
	dlqMessage := kafka.Message{
		Key:   originalMessage.Key,
		Value: originalMessage.Value,
		Time:  time.Now(),
		Headers: append(originalMessage.Headers,
			kafka.Header{Key: "dlq_reason", Value: []byte(errorReason)},
			kafka.Header{Key: "dlq_timestamp", Value: []byte(time.Now().Format(time.RFC3339))},
			kafka.Header{Key: "original_topic", Value: []byte(originalMessage.Topic)},
		),
	}

	return p.dlqWriter.WriteMessages(ctx, dlqMessage)
}

// updateMetrics updates publisher metrics
func (p *KafkaPublisher) updateMetrics(success bool, latency time.Duration) {
	p.metrics.mu.Lock()
	defer p.metrics.mu.Unlock()

	if success {
		p.metrics.EventsPublished++
	} else {
		p.metrics.EventsFailed++
	}

	// Update average latency using exponential moving average
	latencyMs := float64(latency.Nanoseconds()) / 1e6
	if p.metrics.AverageLatencyMs == 0 {
		p.metrics.AverageLatencyMs = latencyMs
	} else {
		p.metrics.AverageLatencyMs = 0.9*p.metrics.AverageLatencyMs + 0.1*latencyMs
	}

	p.metrics.LastPublishTime = time.Now()
}

// Helper methods to create Kafka messages with Protocol Buffer support
func (p *KafkaPublisher) createAttemptMessage(event *models.AttemptEvent) (kafka.Message, error) {
	// Serialize to JSON for backward compatibility
	jsonData, err := json.Marshal(event)
	if err != nil {
		return kafka.Message{}, fmt.Errorf("failed to marshal attempt event to JSON: %w", err)
	}

	// Compress JSON data if needed
	var value []byte
	if p.compressionType != kafka.Compression(0) {
		value = jsonData // Let Kafka handle compression
	} else {
		// Manual compression for better control
		value = snappy.Encode(nil, jsonData)
	}

	return kafka.Message{
		Topic: p.config.Kafka.TopicAttempts,
		Key:   []byte(event.UserID), // Partition by user ID for ordering
		Value: value,
		Time:  event.Timestamp,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte("attempt")},
			{Key: "event_id", Value: []byte(event.EventID)},
			{Key: "user_id", Value: []byte(event.UserID)},
			{Key: "client_attempt_id", Value: []byte(event.ClientAttemptID)},
			{Key: "content_type", Value: []byte("application/json")},
			{Key: "compression", Value: []byte("snappy")},
			{Key: "schema_version", Value: []byte("1.0")},
		},
	}, nil
}

func (p *KafkaPublisher) createSessionMessage(event *models.SessionEvent) (kafka.Message, error) {
	// Serialize to JSON for backward compatibility
	jsonData, err := json.Marshal(event)
	if err != nil {
		return kafka.Message{}, fmt.Errorf("failed to marshal session event to JSON: %w", err)
	}

	// Compress JSON data if needed
	var value []byte
	if p.compressionType != kafka.Compression(0) {
		value = jsonData // Let Kafka handle compression
	} else {
		value = snappy.Encode(nil, jsonData)
	}

	return kafka.Message{
		Topic: p.config.Kafka.TopicSessions,
		Key:   []byte(event.UserID), // Partition by user ID for ordering
		Value: value,
		Time:  event.Timestamp,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte("session")},
			{Key: "event_id", Value: []byte(event.EventID)},
			{Key: "user_id", Value: []byte(event.UserID)},
			{Key: "session_id", Value: []byte(event.SessionID)},
			{Key: "content_type", Value: []byte("application/json")},
			{Key: "compression", Value: []byte("snappy")},
			{Key: "schema_version", Value: []byte("1.0")},
		},
	}, nil
}

func (p *KafkaPublisher) createPlacementMessage(event *models.PlacementEvent) (kafka.Message, error) {
	// Serialize to JSON for backward compatibility
	jsonData, err := json.Marshal(event)
	if err != nil {
		return kafka.Message{}, fmt.Errorf("failed to marshal placement event to JSON: %w", err)
	}

	// Compress JSON data if needed
	var value []byte
	if p.compressionType != kafka.Compression(0) {
		value = jsonData // Let Kafka handle compression
	} else {
		value = snappy.Encode(nil, jsonData)
	}

	return kafka.Message{
		Topic: p.config.Kafka.TopicPlacements,
		Key:   []byte(event.UserID), // Partition by user ID for ordering
		Value: value,
		Time:  event.Timestamp,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte("placement")},
			{Key: "event_id", Value: []byte(event.EventID)},
			{Key: "user_id", Value: []byte(event.UserID)},
			{Key: "placement_id", Value: []byte(event.PlacementID)},
			{Key: "content_type", Value: []byte("application/json")},
			{Key: "compression", Value: []byte("snappy")},
			{Key: "schema_version", Value: []byte("1.0")},
		},
	}, nil
}

// contains checks if a string contains a substring
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
