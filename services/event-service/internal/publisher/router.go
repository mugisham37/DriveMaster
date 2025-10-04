package publisher

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"event-service/internal/config"
	"event-service/internal/models"
)

// EventRouter handles routing of events to appropriate topics and publishers
type EventRouter struct {
	config     *config.Config
	publishers map[string]EventPublisher
	rules      []RoutingRule
	metrics    *RouterMetrics
	mu         sync.RWMutex
}

// RoutingRule defines how events should be routed
type RoutingRule struct {
	EventType models.EventType
	Condition func(event interface{}) bool
	Topic     string
	Publisher string
	Priority  int
	Enabled   bool
}

// RouterMetrics tracks routing metrics
type RouterMetrics struct {
	EventsRouted     map[string]int64 // topic -> count
	EventsFiltered   int64
	RoutingErrors    int64
	AverageLatencyMs float64
	LastRouteTime    time.Time
	mu               sync.RWMutex
}

// NewEventRouter creates a new event router
func NewEventRouter(cfg *config.Config, mainPublisher EventPublisher) *EventRouter {
	router := &EventRouter{
		config:     cfg,
		publishers: make(map[string]EventPublisher),
		metrics: &RouterMetrics{
			EventsRouted: make(map[string]int64),
		},
	}

	// Register main publisher
	router.publishers["main"] = mainPublisher

	// Initialize default routing rules
	router.initializeDefaultRules()

	return router
}

// initializeDefaultRules sets up default routing rules
func (r *EventRouter) initializeDefaultRules() {
	r.rules = []RoutingRule{
		// Attempt events routing
		{
			EventType: models.EventTypeAttempt,
			Condition: func(event interface{}) bool {
				if attemptEvent, ok := event.(*models.AttemptEvent); ok {
					// Route high-quality attempts to ML training topic
					return attemptEvent.Quality >= 4
				}
				return false
			},
			Topic:     r.config.Kafka.TopicMLTraining,
			Publisher: "main",
			Priority:  1,
			Enabled:   true,
		},
		{
			EventType: models.EventTypeAttempt,
			Condition: func(event interface{}) bool {
				return true // Default route for all attempt events
			},
			Topic:     r.config.Kafka.TopicAttempts,
			Publisher: "main",
			Priority:  2,
			Enabled:   true,
		},

		// Session events routing
		{
			EventType: models.EventTypeSession,
			Condition: func(event interface{}) bool {
				if sessionEvent, ok := event.(*models.SessionEvent); ok {
					// Route completed sessions to analytics
					return sessionEvent.ItemsAttempted > 0
				}
				return false
			},
			Topic:     r.config.Kafka.TopicSessions,
			Publisher: "main",
			Priority:  1,
			Enabled:   true,
		},

		// Placement events routing
		{
			EventType: models.EventTypePlacement,
			Condition: func(event interface{}) bool {
				if placementEvent, ok := event.(*models.PlacementEvent); ok {
					// Route completed placements to ML training
					return placementEvent.WasCompleted
				}
				return false
			},
			Topic:     r.config.Kafka.TopicMLTraining,
			Publisher: "main",
			Priority:  1,
			Enabled:   true,
		},
		{
			EventType: models.EventTypePlacement,
			Condition: func(event interface{}) bool {
				return true // Default route for all placement events
			},
			Topic:     r.config.Kafka.TopicPlacements,
			Publisher: "main",
			Priority:  2,
			Enabled:   true,
		},

		// Activity events routing
		{
			EventType: models.EventTypeActivity,
			Condition: func(event interface{}) bool {
				return true // Route all activity events
			},
			Topic:     r.config.Kafka.TopicActivities,
			Publisher: "main",
			Priority:  1,
			Enabled:   true,
		},
	}
}

// RouteEvent routes a single event based on routing rules
func (r *EventRouter) RouteEvent(ctx context.Context, event interface{}) error {
	startTime := time.Now()

	// Determine event type
	eventType, err := r.getEventType(event)
	if err != nil {
		r.updateMetrics("", false, time.Since(startTime))
		return fmt.Errorf("failed to determine event type: %w", err)
	}

	// Find matching routing rules
	matchingRules := r.findMatchingRules(eventType, event)
	if len(matchingRules) == 0 {
		log.Printf("No routing rules found for event type: %s", eventType)
		r.metrics.mu.Lock()
		r.metrics.EventsFiltered++
		r.metrics.mu.Unlock()
		return fmt.Errorf("no routing rules found for event type: %s", eventType)
	}

	// Route to all matching destinations
	var routingErrors []error
	for _, rule := range matchingRules {
		if !rule.Enabled {
			continue
		}

		publisher, exists := r.publishers[rule.Publisher]
		if !exists {
			err := fmt.Errorf("publisher %s not found", rule.Publisher)
			routingErrors = append(routingErrors, err)
			continue
		}

		// Route based on event type
		var routeErr error
		switch eventType {
		case models.EventTypeAttempt:
			if attemptEvent, ok := event.(*models.AttemptEvent); ok {
				routeErr = publisher.PublishAttemptEvent(ctx, attemptEvent)
			}
		case models.EventTypeSession:
			if sessionEvent, ok := event.(*models.SessionEvent); ok {
				routeErr = publisher.PublishSessionEvent(ctx, sessionEvent)
			}
		case models.EventTypePlacement:
			if placementEvent, ok := event.(*models.PlacementEvent); ok {
				routeErr = publisher.PublishPlacementEvent(ctx, placementEvent)
			}
		default:
			routeErr = fmt.Errorf("unsupported event type for routing: %s", eventType)
		}

		if routeErr != nil {
			log.Printf("Failed to route %s event to topic %s: %v", eventType, rule.Topic, routeErr)
			routingErrors = append(routingErrors, routeErr)
		} else {
			r.updateMetrics(rule.Topic, true, time.Since(startTime))
			log.Printf("Successfully routed %s event to topic %s", eventType, rule.Topic)
		}
	}

	// Return error if all routing attempts failed
	if len(routingErrors) == len(matchingRules) {
		r.updateMetrics("", false, time.Since(startTime))
		return fmt.Errorf("all routing attempts failed: %v", routingErrors)
	}

	return nil
}

// RouteBatch routes a batch of events
func (r *EventRouter) RouteBatch(ctx context.Context, events []interface{}) error {
	if len(events) == 0 {
		return nil
	}

	// Group events by routing destination
	routingGroups := make(map[string][]interface{})

	for _, event := range events {
		eventType, err := r.getEventType(event)
		if err != nil {
			log.Printf("Failed to determine event type for batch item: %v", err)
			continue
		}

		matchingRules := r.findMatchingRules(eventType, event)
		for _, rule := range matchingRules {
			if !rule.Enabled {
				continue
			}

			key := fmt.Sprintf("%s:%s", rule.Publisher, rule.Topic)
			routingGroups[key] = append(routingGroups[key], event)
		}
	}

	// Route each group
	var routingErrors []error
	for key, groupEvents := range routingGroups {
		parts := strings.Split(key, ":")
		if len(parts) != 2 {
			continue
		}

		publisherName := parts[0]
		publisher, exists := r.publishers[publisherName]
		if !exists {
			routingErrors = append(routingErrors, fmt.Errorf("publisher %s not found", publisherName))
			continue
		}

		// Convert to any slice for publisher interface
		anyEvents := make([]any, len(groupEvents))
		for i, event := range groupEvents {
			anyEvents[i] = event
		}

		if err := publisher.PublishBatch(ctx, anyEvents); err != nil {
			log.Printf("Failed to route batch to %s: %v", key, err)
			routingErrors = append(routingErrors, err)
		} else {
			log.Printf("Successfully routed batch of %d events to %s", len(groupEvents), key)
		}
	}

	if len(routingErrors) > 0 {
		return fmt.Errorf("batch routing errors: %v", routingErrors)
	}

	return nil
}

// AddRoutingRule adds a new routing rule
func (r *EventRouter) AddRoutingRule(rule RoutingRule) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.rules = append(r.rules, rule)

	// Sort rules by priority (lower number = higher priority)
	for i := len(r.rules) - 1; i > 0; i-- {
		if r.rules[i].Priority < r.rules[i-1].Priority {
			r.rules[i], r.rules[i-1] = r.rules[i-1], r.rules[i]
		} else {
			break
		}
	}
}

// RemoveRoutingRule removes a routing rule by index
func (r *EventRouter) RemoveRoutingRule(index int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if index < 0 || index >= len(r.rules) {
		return fmt.Errorf("invalid rule index: %d", index)
	}

	r.rules = append(r.rules[:index], r.rules[index+1:]...)
	return nil
}

// GetRoutingRules returns a copy of current routing rules
func (r *EventRouter) GetRoutingRules() []RoutingRule {
	r.mu.RLock()
	defer r.mu.RUnlock()

	rules := make([]RoutingRule, len(r.rules))
	copy(rules, r.rules)
	return rules
}

// GetMetrics returns current router metrics
func (r *EventRouter) GetMetrics() *RouterMetrics {
	r.metrics.mu.RLock()
	defer r.metrics.mu.RUnlock()

	// Return a copy to avoid race conditions
	eventsRouted := make(map[string]int64)
	for k, v := range r.metrics.EventsRouted {
		eventsRouted[k] = v
	}

	return &RouterMetrics{
		EventsRouted:     eventsRouted,
		EventsFiltered:   r.metrics.EventsFiltered,
		RoutingErrors:    r.metrics.RoutingErrors,
		AverageLatencyMs: r.metrics.AverageLatencyMs,
		LastRouteTime:    r.metrics.LastRouteTime,
	}
}

// Helper methods
func (r *EventRouter) getEventType(event interface{}) (models.EventType, error) {
	switch event.(type) {
	case *models.AttemptEvent:
		return models.EventTypeAttempt, nil
	case *models.SessionEvent:
		return models.EventTypeSession, nil
	case *models.PlacementEvent:
		return models.EventTypePlacement, nil
	default:
		return "", fmt.Errorf("unknown event type: %T", event)
	}
}

func (r *EventRouter) findMatchingRules(eventType models.EventType, event interface{}) []RoutingRule {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var matchingRules []RoutingRule

	for _, rule := range r.rules {
		if rule.EventType == eventType && rule.Condition(event) {
			matchingRules = append(matchingRules, rule)
		}
	}

	return matchingRules
}

func (r *EventRouter) updateMetrics(topic string, success bool, latency time.Duration) {
	r.metrics.mu.Lock()
	defer r.metrics.mu.Unlock()

	if success && topic != "" {
		r.metrics.EventsRouted[topic]++
	} else if !success {
		r.metrics.RoutingErrors++
	}

	// Update average latency using exponential moving average
	latencyMs := float64(latency.Nanoseconds()) / 1e6
	if r.metrics.AverageLatencyMs == 0 {
		r.metrics.AverageLatencyMs = latencyMs
	} else {
		r.metrics.AverageLatencyMs = 0.9*r.metrics.AverageLatencyMs + 0.1*latencyMs
	}

	r.metrics.LastRouteTime = time.Now()
}
