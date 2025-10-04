package models

import (
	"time"

	"github.com/google/uuid"
)

// EventType represents the type of event
type EventType string

const (
	EventTypeAttempt   EventType = "attempt"
	EventTypeSession   EventType = "session"
	EventTypePlacement EventType = "placement"
	EventTypeActivity  EventType = "activity"
)

// BaseEvent contains common fields for all events
type BaseEvent struct {
	EventID   string                 `json:"event_id" binding:"required"`
	EventType EventType              `json:"event_type" binding:"required"`
	UserID    string                 `json:"user_id" binding:"required"`
	Timestamp time.Time              `json:"timestamp" binding:"required"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// AttemptEvent represents a user's attempt at answering a question
type AttemptEvent struct {
	BaseEvent
	ItemID           string                 `json:"item_id" binding:"required"`
	SessionID        string                 `json:"session_id" binding:"required"`
	ClientAttemptID  string                 `json:"client_attempt_id" binding:"required"`
	Selected         interface{}            `json:"selected" binding:"required"`
	Correct          bool                   `json:"correct" binding:"required"`
	Quality          int                    `json:"quality" binding:"min=0,max=5"`
	Confidence       int                    `json:"confidence,omitempty" binding:"min=1,max=5"`
	TimeTakenMs      int64                  `json:"time_taken_ms" binding:"required,min=1"`
	HintsUsed        int                    `json:"hints_used,omitempty" binding:"min=0"`
	DeviceType       string                 `json:"device_type,omitempty"`
	AppVersion       string                 `json:"app_version,omitempty"`
	IPAddress        string                 `json:"ip_address,omitempty"`
	UserAgent        string                 `json:"user_agent,omitempty"`
	SM2StateBefore   map[string]interface{} `json:"sm2_state_before,omitempty"`
	SM2StateAfter    map[string]interface{} `json:"sm2_state_after,omitempty"`
	BKTStateBefore   map[string]interface{} `json:"bkt_state_before,omitempty"`
	BKTStateAfter    map[string]interface{} `json:"bkt_state_after,omitempty"`
	IRTAbilityBefore map[string]interface{} `json:"irt_ability_before,omitempty"`
	IRTAbilityAfter  map[string]interface{} `json:"irt_ability_after,omitempty"`
}

// SessionEvent represents a complete learning session
type SessionEvent struct {
	BaseEvent
	SessionID         string    `json:"session_id" binding:"required"`
	StartTime         time.Time `json:"start_time" binding:"required"`
	EndTime           time.Time `json:"end_time" binding:"required"`
	ItemsAttempted    int       `json:"items_attempted" binding:"required,min=0"`
	CorrectCount      int       `json:"correct_count" binding:"required,min=0"`
	TotalTimeMs       int64     `json:"total_time_ms" binding:"required,min=1"`
	SessionType       string    `json:"session_type" binding:"required"`
	DeviceType        string    `json:"device_type,omitempty"`
	AppVersion        string    `json:"app_version,omitempty"`
	TopicsPracticed   []string  `json:"topics_practiced,omitempty"`
	AverageDifficulty float64   `json:"average_difficulty,omitempty"`
}

// PlacementEvent represents a placement test session and results
type PlacementEvent struct {
	BaseEvent
	PlacementID       string                 `json:"placement_id" binding:"required"`
	ItemsAdministered int                    `json:"items_administered,omitempty"`
	OverallAccuracy   float64                `json:"overall_accuracy,omitempty" binding:"min=0,max=1"`
	WasCompleted      bool                   `json:"was_completed"`
	EndReason         string                 `json:"end_reason,omitempty"`
	Results           map[string]interface{} `json:"results,omitempty"`
	DeviceType        string                 `json:"device_type,omitempty"`
	AppVersion        string                 `json:"app_version,omitempty"`
}

// BatchEventRequest represents a batch of events
type BatchEventRequest struct {
	Events []map[string]interface{} `json:"events" binding:"required,min=1,max=100"`
}

// EventResponse represents the response after processing an event
type EventResponse struct {
	Success     bool      `json:"success"`
	EventID     string    `json:"event_id"`
	Message     string    `json:"message,omitempty"`
	ProcessedAt time.Time `json:"processed_at"`
}

// BatchEventResponse represents the response after processing a batch of events
type BatchEventResponse struct {
	Success        bool            `json:"success"`
	ProcessedCount int             `json:"processed_count"`
	FailedCount    int             `json:"failed_count"`
	Results        []EventResponse `json:"results"`
	ProcessedAt    time.Time       `json:"processed_at"`
}

// HealthStatus represents the health status of the service
type HealthStatus struct {
	Status    string            `json:"status"`
	Service   string            `json:"service"`
	Version   string            `json:"version"`
	Timestamp time.Time         `json:"timestamp"`
	Checks    map[string]string `json:"checks"`
	Uptime    string            `json:"uptime"`
}

// MetricsResponse represents service metrics
type MetricsResponse struct {
	EventsProcessed     int64     `json:"events_processed"`
	EventsPerSecond     float64   `json:"events_per_second"`
	AverageLatencyMs    float64   `json:"average_latency_ms"`
	ErrorRate           float64   `json:"error_rate"`
	KafkaLag            int64     `json:"kafka_lag"`
	CircuitBreakerState string    `json:"circuit_breaker_state"`
	Timestamp           time.Time `json:"timestamp"`
}

// NewEventID generates a new UUID for events
func NewEventID() string {
	return uuid.New().String()
}

// ValidateEventType checks if the event type is valid
func ValidateEventType(eventType string) bool {
	switch EventType(eventType) {
	case EventTypeAttempt, EventTypeSession, EventTypePlacement, EventTypeActivity:
		return true
	default:
		return false
	}
}
