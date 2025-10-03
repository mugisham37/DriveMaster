package events

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"user-service/internal/config"
	"user-service/internal/logger"
	"user-service/internal/models"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
)

// EventType represents the type of event
type EventType string

const (
	EventTypeUserCreated            EventType = "user.created"
	EventTypeUserUpdated            EventType = "user.updated"
	EventTypeUserDeactivated        EventType = "user.deactivated"
	EventTypeUserActivated          EventType = "user.activated"
	EventTypeUserPreferencesUpdated EventType = "user.preferences.updated"
	EventTypeUserActivity           EventType = "user.activity"
	EventTypeUserLastActiveUpdated  EventType = "user.last_active.updated"
)

// BaseEvent represents the common fields for all events
type BaseEvent struct {
	ID        string    `json:"id"`
	Type      EventType `json:"type"`
	Source    string    `json:"source"`
	UserID    string    `json:"user_id"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
}

// UserCreatedEvent represents a user creation event
type UserCreatedEvent struct {
	BaseEvent
	Data UserCreatedData `json:"data"`
}

type UserCreatedData struct {
	Email       string                 `json:"email"`
	CountryCode string                 `json:"country_code"`
	Timezone    string                 `json:"timezone"`
	Language    string                 `json:"language"`
	UserRole    string                 `json:"user_role"`
	Preferences map[string]interface{} `json:"preferences"`
	CreatedAt   time.Time              `json:"created_at"`
}

// UserUpdatedEvent represents a user update event
type UserUpdatedEvent struct {
	BaseEvent
	Data UserUpdatedData `json:"data"`
}

type UserUpdatedData struct {
	Changes         map[string]interface{} `json:"changes"`
	PreviousVersion int                    `json:"previous_version"`
	NewVersion      int                    `json:"new_version"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

// UserDeactivatedEvent represents a user deactivation event
type UserDeactivatedEvent struct {
	BaseEvent
	Data UserDeactivatedData `json:"data"`
}

type UserDeactivatedData struct {
	Reason        string    `json:"reason"`
	DeactivatedAt time.Time `json:"deactivated_at"`
}

// UserActivatedEvent represents a user activation event
type UserActivatedEvent struct {
	BaseEvent
	Data UserActivatedData `json:"data"`
}

type UserActivatedData struct {
	ActivatedAt time.Time `json:"activated_at"`
}

// UserPreferencesUpdatedEvent represents a preferences update event
type UserPreferencesUpdatedEvent struct {
	BaseEvent
	Data UserPreferencesUpdatedData `json:"data"`
}

type UserPreferencesUpdatedData struct {
	OldPreferences map[string]interface{} `json:"old_preferences"`
	NewPreferences map[string]interface{} `json:"new_preferences"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

// UserActivityEvent represents a user activity event
type UserActivityEvent struct {
	BaseEvent
	Data UserActivityData `json:"data"`
}

type UserActivityData struct {
	ActivityType string                 `json:"activity_type"`
	Metadata     map[string]interface{} `json:"metadata"`
	SessionID    string                 `json:"session_id,omitempty"`
	DeviceType   string                 `json:"device_type,omitempty"`
	AppVersion   string                 `json:"app_version,omitempty"`
}

// UserLastActiveUpdatedEvent represents a last active update event
type UserLastActiveUpdatedEvent struct {
	BaseEvent
	Data UserLastActiveUpdatedData `json:"data"`
}

type UserLastActiveUpdatedData struct {
	LastActiveAt time.Time `json:"last_active_at"`
}

// EventPublisher interface for publishing events
type EventPublisher interface {
	PublishUserCreated(ctx context.Context, user *models.User) error
	PublishUserUpdated(ctx context.Context, userID uuid.UUID, changes map[string]interface{}, oldVersion, newVersion int) error
	PublishUserDeactivated(ctx context.Context, userID uuid.UUID, reason string) error
	PublishUserActivated(ctx context.Context, userID uuid.UUID) error
	PublishUserPreferencesUpdated(ctx context.Context, userID uuid.UUID, oldPrefs, newPrefs map[string]interface{}) error
	PublishUserActivity(ctx context.Context, userID uuid.UUID, activityType string, metadata map[string]interface{}, sessionID, deviceType, appVersion string) error
	PublishUserLastActiveUpdated(ctx context.Context, userID uuid.UUID, lastActiveAt time.Time) error
	Close() error
}

// KafkaEventPublisher implements EventPublisher using Kafka
type KafkaEventPublisher struct {
	writers map[string]*kafka.Writer
	config  *config.Config
}

// NewKafkaEventPublisher creates a new Kafka event publisher
func NewKafkaEventPublisher(cfg *config.Config) *KafkaEventPublisher {
	writers := make(map[string]*kafka.Writer)

	// Create writers for different topics
	writers["user.events"] = &kafka.Writer{
		Addr:         kafka.TCP(cfg.KafkaBrokers...),
		Topic:        "user.events",
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        false,
		Compression:  kafka.Snappy,
		BatchTimeout: 10 * time.Millisecond,
		BatchSize:    100,
	}

	writers["user.activities"] = &kafka.Writer{
		Addr:         kafka.TCP(cfg.KafkaBrokers...),
		Topic:        cfg.KafkaTopicActivities,
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
		Async:        false,
		Compression:  kafka.Snappy,
		BatchTimeout: 10 * time.Millisecond,
		BatchSize:    100,
	}

	return &KafkaEventPublisher{
		writers: writers,
		config:  cfg,
	}
}

// PublishUserCreated publishes a user created event
func (p *KafkaEventPublisher) PublishUserCreated(ctx context.Context, user *models.User) error {
	event := UserCreatedEvent{
		BaseEvent: BaseEvent{
			ID:        uuid.New().String(),
			Type:      EventTypeUserCreated,
			Source:    "user-service",
			UserID:    user.ID.String(),
			Timestamp: time.Now(),
			Version:   "1.0",
		},
		Data: UserCreatedData{
			Email:       user.Email,
			CountryCode: user.CountryCode,
			Timezone:    user.Timezone,
			Language:    user.Language,
			UserRole:    user.UserRole,
			Preferences: user.Preferences,
			CreatedAt:   user.CreatedAt,
		},
	}

	return p.publishEvent(ctx, "user.events", user.ID.String(), event)
}

// PublishUserUpdated publishes a user updated event
func (p *KafkaEventPublisher) PublishUserUpdated(ctx context.Context, userID uuid.UUID, changes map[string]interface{}, oldVersion, newVersion int) error {
	event := UserUpdatedEvent{
		BaseEvent: BaseEvent{
			ID:        uuid.New().String(),
			Type:      EventTypeUserUpdated,
			Source:    "user-service",
			UserID:    userID.String(),
			Timestamp: time.Now(),
			Version:   "1.0",
		},
		Data: UserUpdatedData{
			Changes:         changes,
			PreviousVersion: oldVersion,
			NewVersion:      newVersion,
			UpdatedAt:       time.Now(),
		},
	}

	return p.publishEvent(ctx, "user.events", userID.String(), event)
}

// PublishUserDeactivated publishes a user deactivated event
func (p *KafkaEventPublisher) PublishUserDeactivated(ctx context.Context, userID uuid.UUID, reason string) error {
	event := UserDeactivatedEvent{
		BaseEvent: BaseEvent{
			ID:        uuid.New().String(),
			Type:      EventTypeUserDeactivated,
			Source:    "user-service",
			UserID:    userID.String(),
			Timestamp: time.Now(),
			Version:   "1.0",
		},
		Data: UserDeactivatedData{
			Reason:        reason,
			DeactivatedAt: time.Now(),
		},
	}

	return p.publishEvent(ctx, "user.events", userID.String(), event)
}

// PublishUserActivated publishes a user activated event
func (p *KafkaEventPublisher) PublishUserActivated(ctx context.Context, userID uuid.UUID) error {
	event := UserActivatedEvent{
		BaseEvent: BaseEvent{
			ID:        uuid.New().String(),
			Type:      EventTypeUserActivated,
			Source:    "user-service",
			UserID:    userID.String(),
			Timestamp: time.Now(),
			Version:   "1.0",
		},
		Data: UserActivatedData{
			ActivatedAt: time.Now(),
		},
	}

	return p.publishEvent(ctx, "user.events", userID.String(), event)
}

// PublishUserPreferencesUpdated publishes a user preferences updated event
func (p *KafkaEventPublisher) PublishUserPreferencesUpdated(ctx context.Context, userID uuid.UUID, oldPrefs, newPrefs map[string]interface{}) error {
	event := UserPreferencesUpdatedEvent{
		BaseEvent: BaseEvent{
			ID:        uuid.New().String(),
			Type:      EventTypeUserPreferencesUpdated,
			Source:    "user-service",
			UserID:    userID.String(),
			Timestamp: time.Now(),
			Version:   "1.0",
		},
		Data: UserPreferencesUpdatedData{
			OldPreferences: oldPrefs,
			NewPreferences: newPrefs,
			UpdatedAt:      time.Now(),
		},
	}

	return p.publishEvent(ctx, "user.events", userID.String(), event)
}

// PublishUserActivity publishes a user activity event
func (p *KafkaEventPublisher) PublishUserActivity(ctx context.Context, userID uuid.UUID, activityType string, metadata map[string]interface{}, sessionID, deviceType, appVersion string) error {
	event := UserActivityEvent{
		BaseEvent: BaseEvent{
			ID:        uuid.New().String(),
			Type:      EventTypeUserActivity,
			Source:    "user-service",
			UserID:    userID.String(),
			Timestamp: time.Now(),
			Version:   "1.0",
		},
		Data: UserActivityData{
			ActivityType: activityType,
			Metadata:     metadata,
			SessionID:    sessionID,
			DeviceType:   deviceType,
			AppVersion:   appVersion,
		},
	}

	return p.publishEvent(ctx, "user.activities", userID.String(), event)
}

// PublishUserLastActiveUpdated publishes a user last active updated event
func (p *KafkaEventPublisher) PublishUserLastActiveUpdated(ctx context.Context, userID uuid.UUID, lastActiveAt time.Time) error {
	event := UserLastActiveUpdatedEvent{
		BaseEvent: BaseEvent{
			ID:        uuid.New().String(),
			Type:      EventTypeUserLastActiveUpdated,
			Source:    "user-service",
			UserID:    userID.String(),
			Timestamp: time.Now(),
			Version:   "1.0",
		},
		Data: UserLastActiveUpdatedData{
			LastActiveAt: lastActiveAt,
		},
	}

	return p.publishEvent(ctx, "user.events", userID.String(), event)
}

// publishEvent publishes an event to the specified topic
func (p *KafkaEventPublisher) publishEvent(ctx context.Context, topic, key string, event interface{}) error {
	log := logger.WithContext(ctx).WithField("topic", topic).WithField("key", key)

	writer, exists := p.writers[topic]
	if !exists {
		return fmt.Errorf("no writer configured for topic: %s", topic)
	}

	// Serialize event to JSON
	eventData, err := json.Marshal(event)
	if err != nil {
		log.WithError(err).Error("Failed to marshal event")
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// Create Kafka message
	message := kafka.Message{
		Key:   []byte(key),
		Value: eventData,
		Headers: []kafka.Header{
			{Key: "content-type", Value: []byte("application/json")},
			{Key: "source", Value: []byte("user-service")},
			{Key: "event-id", Value: []byte(uuid.New().String())},
		},
		Time: time.Now(),
	}

	// Publish message with retry logic
	maxRetries := 3
	for attempt := 1; attempt <= maxRetries; attempt++ {
		err = writer.WriteMessages(ctx, message)
		if err == nil {
			log.WithField("attempt", attempt).Debug("Event published successfully")
			return nil
		}

		log.WithError(err).WithField("attempt", attempt).Warn("Failed to publish event")

		if attempt < maxRetries {
			// Exponential backoff
			backoff := time.Duration(attempt*attempt) * 100 * time.Millisecond
			time.Sleep(backoff)
		}
	}

	log.WithError(err).Error("Failed to publish event after all retries")
	return fmt.Errorf("failed to publish event after %d attempts: %w", maxRetries, err)
}

// Close closes all Kafka writers
func (p *KafkaEventPublisher) Close() error {
	var lastErr error
	for topic, writer := range p.writers {
		if err := writer.Close(); err != nil {
			logger.GetLogger().WithError(err).WithField("topic", topic).Error("Failed to close Kafka writer")
			lastErr = err
		}
	}
	return lastErr
}

// NoOpEventPublisher is a no-op implementation for testing
type NoOpEventPublisher struct{}

func NewNoOpEventPublisher() *NoOpEventPublisher {
	return &NoOpEventPublisher{}
}

func (p *NoOpEventPublisher) PublishUserCreated(ctx context.Context, user *models.User) error {
	return nil
}

func (p *NoOpEventPublisher) PublishUserUpdated(ctx context.Context, userID uuid.UUID, changes map[string]interface{}, oldVersion, newVersion int) error {
	return nil
}

func (p *NoOpEventPublisher) PublishUserDeactivated(ctx context.Context, userID uuid.UUID, reason string) error {
	return nil
}

func (p *NoOpEventPublisher) PublishUserActivated(ctx context.Context, userID uuid.UUID) error {
	return nil
}

func (p *NoOpEventPublisher) PublishUserPreferencesUpdated(ctx context.Context, userID uuid.UUID, oldPrefs, newPrefs map[string]interface{}) error {
	return nil
}

func (p *NoOpEventPublisher) PublishUserActivity(ctx context.Context, userID uuid.UUID, activityType string, metadata map[string]interface{}, sessionID, deviceType, appVersion string) error {
	return nil
}

func (p *NoOpEventPublisher) PublishUserLastActiveUpdated(ctx context.Context, userID uuid.UUID, lastActiveAt time.Time) error {
	return nil
}

func (p *NoOpEventPublisher) Close() error {
	return nil
}
