package processor

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"event-service/internal/config"
	"event-service/internal/models"

	"github.com/go-redis/redis/v8"
)

// EventDeduplicator handles event deduplication and ordering
type EventDeduplicator struct {
	config      *config.Config
	redisClient *redis.Client
	localCache  *DeduplicationCache
	mu          sync.RWMutex
}

// DeduplicationCache provides local caching for deduplication keys
type DeduplicationCache struct {
	cache map[string]*DeduplicationEntry
	mu    sync.RWMutex
	ttl   time.Duration
}

// DeduplicationEntry represents a cached deduplication entry
type DeduplicationEntry struct {
	Key       string    `json:"key"`
	EventID   string    `json:"event_id"`
	UserID    string    `json:"user_id"`
	Timestamp time.Time `json:"timestamp"`
	CachedAt  time.Time `json:"cached_at"`
}

// DeduplicationResult contains the result of deduplication check
type DeduplicationResult struct {
	IsDuplicate     bool      `json:"is_duplicate"`
	OriginalEventID string    `json:"original_event_id,omitempty"`
	OriginalTime    time.Time `json:"original_time,omitempty"`
	DuplicateKey    string    `json:"duplicate_key"`
}

// NewEventDeduplicator creates a new event deduplicator
func NewEventDeduplicator(cfg *config.Config) *EventDeduplicator {
	// Initialize Redis client for deduplication data
	redisClient := redis.NewClient(&redis.Options{
		Addr:         cfg.Redis.Address,
		Password:     cfg.Redis.Password,
		DB:           cfg.Redis.DeduplicationDB,
		PoolSize:     cfg.Redis.PoolSize,
		MinIdleConns: cfg.Redis.MinIdleConns,
		MaxRetries:   cfg.Redis.MaxRetries,
		DialTimeout:  cfg.Redis.DialTimeout,
		ReadTimeout:  cfg.Redis.ReadTimeout,
		WriteTimeout: cfg.Redis.WriteTimeout,
	})

	cache := &DeduplicationCache{
		cache: make(map[string]*DeduplicationEntry),
		ttl:   5 * time.Minute, // Local cache TTL
	}

	return &EventDeduplicator{
		config:      cfg,
		redisClient: redisClient,
		localCache:  cache,
	}
}

// IsDuplicate checks if an event is a duplicate
func (d *EventDeduplicator) IsDuplicate(ctx context.Context, event interface{}, eventType models.EventType) (bool, error) {
	// Generate deduplication key
	dedupKey, err := d.generateDeduplicationKey(event, eventType)
	if err != nil {
		return false, fmt.Errorf("failed to generate deduplication key: %w", err)
	}

	// Check local cache first
	d.localCache.mu.RLock()
	if entry, exists := d.localCache.cache[dedupKey]; exists {
		if time.Since(entry.CachedAt) < d.localCache.ttl {
			d.localCache.mu.RUnlock()
			log.Printf("Duplicate detected in local cache: %s", dedupKey)
			return true, nil
		}
		// Entry expired, remove it
		delete(d.localCache.cache, dedupKey)
	}
	d.localCache.mu.RUnlock()

	// Check Redis
	redisKey := fmt.Sprintf("dedup:%s", dedupKey)
	exists, err := d.redisClient.Exists(ctx, redisKey).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check Redis for duplicate: %w", err)
	}

	if exists > 0 {
		// Get the original event info
		data, err := d.redisClient.Get(ctx, redisKey).Result()
		if err != nil {
			log.Printf("Failed to get duplicate event data: %v", err)
		} else {
			var entry DeduplicationEntry
			if err := json.Unmarshal([]byte(data), &entry); err == nil {
				// Update local cache
				d.localCache.mu.Lock()
				d.localCache.cache[dedupKey] = &entry
				d.localCache.mu.Unlock()
			}
		}

		log.Printf("Duplicate detected in Redis: %s", dedupKey)
		return true, nil
	}

	return false, nil
}

// RecordEvent records an event for deduplication tracking
func (d *EventDeduplicator) RecordEvent(ctx context.Context, event interface{}, eventType models.EventType) error {
	// Generate deduplication key
	dedupKey, err := d.generateDeduplicationKey(event, eventType)
	if err != nil {
		return fmt.Errorf("failed to generate deduplication key: %w", err)
	}

	// Extract event metadata
	eventID, userID, timestamp := d.extractEventMetadata(event, eventType)

	// Create deduplication entry
	entry := &DeduplicationEntry{
		Key:       dedupKey,
		EventID:   eventID,
		UserID:    userID,
		Timestamp: timestamp,
		CachedAt:  time.Now(),
	}

	// Store in Redis with TTL
	redisKey := fmt.Sprintf("dedup:%s", dedupKey)
	data, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("failed to marshal deduplication entry: %w", err)
	}

	// Set TTL based on event type
	ttl := d.getDeduplicationTTL(eventType)
	if err := d.redisClient.Set(ctx, redisKey, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to store deduplication entry: %w", err)
	}

	// Update local cache
	d.localCache.mu.Lock()
	d.localCache.cache[dedupKey] = entry
	d.localCache.mu.Unlock()

	return nil
}

// generateDeduplicationKey generates a unique key for deduplication
func (d *EventDeduplicator) generateDeduplicationKey(event interface{}, eventType models.EventType) (string, error) {
	switch eventType {
	case models.EventTypeAttempt:
		return d.generateAttemptDeduplicationKey(event.(*models.AttemptEvent))
	case models.EventTypeSession:
		return d.generateSessionDeduplicationKey(event.(*models.SessionEvent))
	case models.EventTypePlacement:
		return d.generatePlacementDeduplicationKey(event.(*models.PlacementEvent))
	default:
		return "", fmt.Errorf("unsupported event type for deduplication: %s", eventType)
	}
}

// generateAttemptDeduplicationKey generates deduplication key for attempt events
func (d *EventDeduplicator) generateAttemptDeduplicationKey(event *models.AttemptEvent) (string, error) {
	// Use client_attempt_id as the primary deduplication key for attempts
	if event.ClientAttemptID != "" {
		return fmt.Sprintf("attempt:%s", event.ClientAttemptID), nil
	}

	// Fallback to content-based deduplication
	keyData := fmt.Sprintf("attempt:%s:%s:%s:%d:%v",
		event.UserID,
		event.ItemID,
		event.SessionID,
		event.TimeTakenMs,
		event.Selected,
	)

	hash := sha256.Sum256([]byte(keyData))
	return fmt.Sprintf("attempt:hash:%s", hex.EncodeToString(hash[:])), nil
}

// generateSessionDeduplicationKey generates deduplication key for session events
func (d *EventDeduplicator) generateSessionDeduplicationKey(event *models.SessionEvent) (string, error) {
	// Use session_id as the primary deduplication key
	return fmt.Sprintf("session:%s", event.SessionID), nil
}

// generatePlacementDeduplicationKey generates deduplication key for placement events
func (d *EventDeduplicator) generatePlacementDeduplicationKey(event *models.PlacementEvent) (string, error) {
	// Use placement_id as the primary deduplication key
	return fmt.Sprintf("placement:%s", event.PlacementID), nil
}

// extractEventMetadata extracts common metadata from events
func (d *EventDeduplicator) extractEventMetadata(event interface{}, eventType models.EventType) (eventID, userID string, timestamp time.Time) {
	switch eventType {
	case models.EventTypeAttempt:
		if e, ok := event.(*models.AttemptEvent); ok {
			return e.EventID, e.UserID, e.Timestamp
		}
	case models.EventTypeSession:
		if e, ok := event.(*models.SessionEvent); ok {
			return e.EventID, e.UserID, e.Timestamp
		}
	case models.EventTypePlacement:
		if e, ok := event.(*models.PlacementEvent); ok {
			return e.EventID, e.UserID, e.Timestamp
		}
	}
	return "", "", time.Time{}
}

// getDeduplicationTTL returns the TTL for deduplication based on event type
func (d *EventDeduplicator) getDeduplicationTTL(eventType models.EventType) time.Duration {
	switch eventType {
	case models.EventTypeAttempt:
		return 24 * time.Hour // Attempts can be deduplicated for 24 hours
	case models.EventTypeSession:
		return 12 * time.Hour // Sessions can be deduplicated for 12 hours
	case models.EventTypePlacement:
		return 7 * 24 * time.Hour // Placements can be deduplicated for 7 days
	default:
		return 1 * time.Hour // Default 1 hour
	}
}

// GetDuplicateInfo retrieves information about a duplicate event
func (d *EventDeduplicator) GetDuplicateInfo(ctx context.Context, event interface{}, eventType models.EventType) (*DeduplicationResult, error) {
	dedupKey, err := d.generateDeduplicationKey(event, eventType)
	if err != nil {
		return nil, fmt.Errorf("failed to generate deduplication key: %w", err)
	}

	// Check local cache first
	d.localCache.mu.RLock()
	if entry, exists := d.localCache.cache[dedupKey]; exists {
		if time.Since(entry.CachedAt) < d.localCache.ttl {
			d.localCache.mu.RUnlock()
			return &DeduplicationResult{
				IsDuplicate:     true,
				OriginalEventID: entry.EventID,
				OriginalTime:    entry.Timestamp,
				DuplicateKey:    dedupKey,
			}, nil
		}
	}
	d.localCache.mu.RUnlock()

	// Check Redis
	redisKey := fmt.Sprintf("dedup:%s", dedupKey)
	data, err := d.redisClient.Get(ctx, redisKey).Result()
	if err == redis.Nil {
		return &DeduplicationResult{
			IsDuplicate:  false,
			DuplicateKey: dedupKey,
		}, nil
	} else if err != nil {
		return nil, fmt.Errorf("failed to get duplicate info from Redis: %w", err)
	}

	var entry DeduplicationEntry
	if err := json.Unmarshal([]byte(data), &entry); err != nil {
		return nil, fmt.Errorf("failed to unmarshal duplicate entry: %w", err)
	}

	// Update local cache
	d.localCache.mu.Lock()
	d.localCache.cache[dedupKey] = &entry
	d.localCache.mu.Unlock()

	return &DeduplicationResult{
		IsDuplicate:     true,
		OriginalEventID: entry.EventID,
		OriginalTime:    entry.Timestamp,
		DuplicateKey:    dedupKey,
	}, nil
}

// CleanupExpiredEntries removes expired entries from local cache
func (d *EventDeduplicator) CleanupExpiredEntries() {
	d.localCache.mu.Lock()
	defer d.localCache.mu.Unlock()

	now := time.Now()
	for key, entry := range d.localCache.cache {
		if now.Sub(entry.CachedAt) > d.localCache.ttl {
			delete(d.localCache.cache, key)
		}
	}
}

// GetCacheStats returns statistics about the deduplication cache
func (d *EventDeduplicator) GetCacheStats() map[string]interface{} {
	d.localCache.mu.RLock()
	defer d.localCache.mu.RUnlock()

	stats := map[string]interface{}{
		"local_cache_size": len(d.localCache.cache),
		"local_cache_ttl":  d.localCache.ttl.String(),
	}

	// Add Redis stats if available
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if info, err := d.redisClient.Info(ctx, "memory").Result(); err == nil {
		stats["redis_info"] = info
	}

	return stats
}

// StartCleanupWorker starts a background worker to clean up expired cache entries
func (d *EventDeduplicator) StartCleanupWorker(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			d.CleanupExpiredEntries()
		}
	}()
}

// Close closes the deduplicator and its resources
func (d *EventDeduplicator) Close() error {
	return d.redisClient.Close()
}

// OrderEvents orders events by timestamp for processing
func (d *EventDeduplicator) OrderEvents(events []interface{}, eventTypes []models.EventType) ([]interface{}, []models.EventType, error) {
	if len(events) != len(eventTypes) {
		return nil, nil, fmt.Errorf("events and eventTypes slices must have the same length")
	}

	// Create a slice of indices to sort
	indices := make([]int, len(events))
	for i := range indices {
		indices[i] = i
	}

	// Sort indices based on event timestamps
	for i := 0; i < len(indices)-1; i++ {
		for j := i + 1; j < len(indices); j++ {
			timestamp1 := d.getEventTimestamp(events[indices[i]], eventTypes[indices[i]])
			timestamp2 := d.getEventTimestamp(events[indices[j]], eventTypes[indices[j]])
			
			if timestamp1.After(timestamp2) {
				indices[i], indices[j] = indices[j], indices[i]
			}
		}
	}

	// Create ordered slices
	orderedEvents := make([]interface{}, len(events))
	orderedTypes := make([]models.EventType, len(eventTypes))
	
	for i, idx := range indices {
		orderedEvents[i] = events[idx]
		orderedTypes[i] = eventTypes[idx]
	}

	return orderedEvents, orderedTypes, nil
}

// getEventTimestamp extracts timestamp from an event
func (d *EventDeduplicator) getEventTimestamp(event interface{}, eventType models.EventType) time.Time {
	switch eventType {
	case models.EventTypeAttempt:
		if e, ok := event.(*models.AttemptEvent); ok {
			return e.Timestamp
		}
	case models.EventTypeSession:
		if e, ok := event.(*models.SessionEvent); ok {
			return e.Timestamp
		}
	case models.EventTypePlacement:
		if e, ok := event.(*models.PlacementEvent); ok {
			return e.Timestamp
		}
	}
	return time.Time{}
}

// ValidateEventOrder validates that events are in chronological order
func (d *EventDeduplicator) ValidateEventOrder(events []interface{}, eventTypes []models.EventType) error {
	if len(events) <= 1 {
		return nil
	}

	for i := 1; i < len(events); i++ {
		prevTimestamp := d.getEventTimestamp(events[i-1], eventTypes[i-1])
		currTimestamp := d.getEventTimestamp(events[i], eventTypes[i])
		
		if currTimestamp.Before(prevTimestamp) {
			return fmt.Errorf("events are not in chronological order at index %d", i)
		}
	}

	return nil
}