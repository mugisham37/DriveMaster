package publisher

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"event-service/internal/config"
	"event-service/internal/models"

	"github.com/segmentio/kafka-go"
)

// KafkaPublisher implements the EventPublisher interface for Kafka
type KafkaPublisher struct {
	config *config.Config
	writer *kafka.Writer
}

// NewKafkaPublisher creates a new Kafka publisher
func NewKafkaPublisher(cfg *config.Config) *KafkaPublisher {
	// Configure Kafka writer with high-throughput settings
	writer := &kafka.Writer{
		Addr:         kafka.TCP(cfg.Kafka.Brokers...),
		Balancer:     &kafka.LeastBytes{}, // Use least bytes balancer for better distribution
		BatchSize:    cfg.Kafka.ProducerBatchSize,
		BatchTimeout: cfg.Kafka.ProducerBatchTimeout,
		ReadTimeout:  cfg.Kafka.ProducerTimeout,
		WriteTimeout: cfg.Kafka.ProducerTimeout,
		RequiredAcks: kafka.RequireOne, // Require at least one acknowledgment
		Async:        false,            // Synchronous for reliability
	}

	return &KafkaPublisher{
		config: cfg,
		writer: writer,
	}
}

// PublishAttemptEvent publishes an attempt event to Kafka
func (p *KafkaPublisher) PublishAttemptEvent(ctx context.Context, event *models.AttemptEvent) error {
	// Serialize event to JSON
	eventData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal attempt event: %w", err)
	}

	// Create Kafka message
	message := kafka.Message{
		Topic: p.config.Kafka.TopicAttempts,
		Key:   []byte(event.UserID), // Partition by user ID for ordering
		Value: eventData,
		Time:  event.Timestamp,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte("attempt")},
			{Key: "event_id", Value: []byte(event.EventID)},
			{Key: "user_id", Value: []byte(event.UserID)},
			{Key: "client_attempt_id", Value: []byte(event.ClientAttemptID)},
		},
	}

	// Write message to Kafka
	if err := p.writer.WriteMessages(ctx, message); err != nil {
		return fmt.Errorf("failed to write attempt event to Kafka: %w", err)
	}

	log.Printf("Published attempt event: %s for user: %s", event.EventID, event.UserID)
	return nil
}

// PublishSessionEvent publishes a session event to Kafka
func (p *KafkaPublisher) PublishSessionEvent(ctx context.Context, event *models.SessionEvent) error {
	// Serialize event to JSON
	eventData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal session event: %w", err)
	}

	// Create Kafka message
	message := kafka.Message{
		Topic: p.config.Kafka.TopicSessions,
		Key:   []byte(event.UserID), // Partition by user ID for ordering
		Value: eventData,
		Time:  event.Timestamp,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte("session")},
			{Key: "event_id", Value: []byte(event.EventID)},
			{Key: "user_id", Value: []byte(event.UserID)},
			{Key: "session_id", Value: []byte(event.SessionID)},
		},
	}

	// Write message to Kafka
	if err := p.writer.WriteMessages(ctx, message); err != nil {
		return fmt.Errorf("failed to write session event to Kafka: %w", err)
	}

	log.Printf("Published session event: %s for user: %s", event.EventID, event.UserID)
	return nil
}

// PublishPlacementEvent publishes a placement event to Kafka
func (p *KafkaPublisher) PublishPlacementEvent(ctx context.Context, event *models.PlacementEvent) error {
	// Serialize event to JSON
	eventData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal placement event: %w", err)
	}

	// Create Kafka message
	message := kafka.Message{
		Topic: p.config.Kafka.TopicPlacements,
		Key:   []byte(event.UserID), // Partition by user ID for ordering
		Value: eventData,
		Time:  event.Timestamp,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte("placement")},
			{Key: "event_id", Value: []byte(event.EventID)},
			{Key: "user_id", Value: []byte(event.UserID)},
			{Key: "placement_id", Value: []byte(event.PlacementID)},
		},
	}

	// Write message to Kafka
	if err := p.writer.WriteMessages(ctx, message); err != nil {
		return fmt.Errorf("failed to write placement event to Kafka: %w", err)
	}

	log.Printf("Published placement event: %s for user: %s", event.EventID, event.UserID)
	return nil
}

// PublishBatch publishes a batch of events to Kafka
func (p *KafkaPublisher) PublishBatch(ctx context.Context, events []interface{}) error {
	if len(events) == 0 {
		return nil
	}

	var messages []kafka.Message

	for _, event := range events {
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
			return fmt.Errorf("unsupported event type: %T", event)
		}

		if err != nil {
			return fmt.Errorf("failed to create message for event: %w", err)
		}

		messages = append(messages, message)
	}

	// Write all messages in a single batch
	if err := p.writer.WriteMessages(ctx, messages...); err != nil {
		return fmt.Errorf("failed to write batch events to Kafka: %w", err)
	}

	log.Printf("Published batch of %d events to Kafka", len(events))
	return nil
}

// Close closes the Kafka writer
func (p *KafkaPublisher) Close() error {
	if p.writer != nil {
		return p.writer.Close()
	}
	return nil
}

// Helper methods to create Kafka messages
func (p *KafkaPublisher) createAttemptMessage(event *models.AttemptEvent) (kafka.Message, error) {
	eventData, err := json.Marshal(event)
	if err != nil {
		return kafka.Message{}, err
	}

	return kafka.Message{
		Topic: p.config.Kafka.TopicAttempts,
		Key:   []byte(event.UserID),
		Value: eventData,
		Time:  event.Timestamp,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte("attempt")},
			{Key: "event_id", Value: []byte(event.EventID)},
			{Key: "user_id", Value: []byte(event.UserID)},
			{Key: "client_attempt_id", Value: []byte(event.ClientAttemptID)},
		},
	}, nil
}

func (p *KafkaPublisher) createSessionMessage(event *models.SessionEvent) (kafka.Message, error) {
	eventData, err := json.Marshal(event)
	if err != nil {
		return kafka.Message{}, err
	}

	return kafka.Message{
		Topic: p.config.Kafka.TopicSessions,
		Key:   []byte(event.UserID),
		Value: eventData,
		Time:  event.Timestamp,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte("session")},
			{Key: "event_id", Value: []byte(event.EventID)},
			{Key: "user_id", Value: []byte(event.UserID)},
			{Key: "session_id", Value: []byte(event.SessionID)},
		},
	}, nil
}

func (p *KafkaPublisher) createPlacementMessage(event *models.PlacementEvent) (kafka.Message, error) {
	eventData, err := json.Marshal(event)
	if err != nil {
		return kafka.Message{}, err
	}

	return kafka.Message{
		Topic: p.config.Kafka.TopicPlacements,
		Key:   []byte(event.UserID),
		Value: eventData,
		Time:  event.Timestamp,
		Headers: []kafka.Header{
			{Key: "event_type", Value: []byte("placement")},
			{Key: "event_id", Value: []byte(event.EventID)},
			{Key: "user_id", Value: []byte(event.UserID)},
			{Key: "placement_id", Value: []byte(event.PlacementID)},
		},
	}, nil
}
