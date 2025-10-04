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

// EventEnricher handles event enrichment with user and item context
type EventEnricher struct {
	config      *config.Config
	redisClient *redis.Client
	cache       *EnrichmentCache
	mu          sync.RWMutex
}

// EnrichmentCache provides caching for enrichment data
type EnrichmentCache struct {
	userCache map[string]*UserContext
	itemCache map[string]*ItemContext
	mu        sync.RWMutex
	ttl       time.Duration
}

// UserContext contains enrichment data about a user
type UserContext struct {
	UserID           string                 `json:"user_id"`
	CountryCode      string                 `json:"country_code"`
	UserType         string                 `json:"user_type"`
	RegistrationDate time.Time              `json:"registration_date"`
	LastActiveDate   time.Time              `json:"last_active_date"`
	TotalSessions    int64                  `json:"total_sessions"`
	TotalAttempts    int64                  `json:"total_attempts"`
	AverageAccuracy  float64                `json:"average_accuracy"`
	PreferredTopics  []string               `json:"preferred_topics"`
	StudyStreak      int                    `json:"study_streak"`
	Timezone         string                 `json:"timezone"`
	DeviceTypes      []string               `json:"device_types"`
	Preferences      map[string]interface{} `json:"preferences"`
	CachedAt         time.Time              `json:"cached_at"`
}

// ItemContext contains enrichment data about a content item
type ItemContext struct {
	ItemID          string    `json:"item_id"`
	Topics          []string  `json:"topics"`
	Jurisdictions   []string  `json:"jurisdictions"`
	Difficulty      float64   `json:"difficulty"`
	ItemType        string    `json:"item_type"`
	CognitiveLevel  string    `json:"cognitive_level"`
	EstimatedTime   int       `json:"estimated_time"`
	CreatedDate     time.Time `json:"created_date"`
	LastUpdated     time.Time `json:"last_updated"`
	TotalAttempts   int64     `json:"total_attempts"`
	AverageAccuracy float64   `json:"average_accuracy"`
	AverageTimeMs   int64     `json:"average_time_ms"`
	PopularityScore float64   `json:"popularity_score"`
	CachedAt        time.Time `json:"cached_at"`
}

// NewEventEnricher creates a new event enricher
func NewEventEnricher(cfg *config.Config) *EventEnricher {
	// Initialize Redis client for enrichment data
	redisClient := redis.NewClient(&redis.Options{
		Addr:         cfg.Redis.Address,
		Password:     cfg.Redis.Password,
		DB:           cfg.Redis.EnrichmentDB,
		PoolSize:     cfg.Redis.PoolSize,
		MinIdleConns: cfg.Redis.MinIdleConns,
		MaxRetries:   cfg.Redis.MaxRetries,
		DialTimeout:  cfg.Redis.DialTimeout,
		ReadTimeout:  cfg.Redis.ReadTimeout,
		WriteTimeout: cfg.Redis.WriteTimeout,
	})

	cache := &EnrichmentCache{
		userCache: make(map[string]*UserContext),
		itemCache: make(map[string]*ItemContext),
		ttl:       15 * time.Minute, // Cache TTL
	}

	return &EventEnricher{
		config:      cfg,
		redisClient: redisClient,
		cache:       cache,
	}
}

// EnrichEvent enriches an event with user and item context
func (e *EventEnricher) EnrichEvent(ctx context.Context, event interface{}, eventType models.EventType) (map[string]interface{}, error) {
	enrichedData := make(map[string]interface{})

	switch eventType {
	case models.EventTypeAttempt:
		return e.enrichAttemptEvent(ctx, event.(*models.AttemptEvent))
	case models.EventTypeSession:
		return e.enrichSessionEvent(ctx, event.(*models.SessionEvent))
	case models.EventTypePlacement:
		return e.enrichPlacementEvent(ctx, event.(*models.PlacementEvent))
	default:
		return enrichedData, nil
	}
}

// enrichAttemptEvent enriches an attempt event
func (e *EventEnricher) enrichAttemptEvent(ctx context.Context, event *models.AttemptEvent) (map[string]interface{}, error) {
	enrichedData := make(map[string]interface{})

	// Enrich with user context
	userContext, err := e.getUserContext(ctx, event.UserID)
	if err != nil {
		log.Printf("Failed to get user context for user %s: %v", event.UserID, err)
	} else {
		enrichedData["user_context"] = userContext
		enrichedData["user_type"] = userContext.UserType
		enrichedData["country_code"] = userContext.CountryCode
		enrichedData["jurisdiction"] = userContext.CountryCode
		enrichedData["user_study_streak"] = userContext.StudyStreak
		enrichedData["user_average_accuracy"] = userContext.AverageAccuracy
		enrichedData["user_timezone"] = userContext.Timezone
		enrichedData["user_total_attempts"] = userContext.TotalAttempts
	}

	// Enrich with item context
	itemContext, err := e.getItemContext(ctx, event.ItemID)
	if err != nil {
		log.Printf("Failed to get item context for item %s: %v", event.ItemID, err)
	} else {
		enrichedData["item_context"] = itemContext
		enrichedData["item_topics"] = itemContext.Topics
		enrichedData["item_difficulty"] = itemContext.Difficulty
		enrichedData["item_type"] = itemContext.ItemType
		enrichedData["item_cognitive_level"] = itemContext.CognitiveLevel
		enrichedData["item_average_accuracy"] = itemContext.AverageAccuracy
		enrichedData["item_average_time_ms"] = itemContext.AverageTimeMs
		enrichedData["item_popularity"] = itemContext.PopularityScore
	}

	// Add derived enrichments
	enrichedData["is_correct"] = event.Correct
	enrichedData["response_time_category"] = e.categorizeResponseTime(event.TimeTakenMs, itemContext)
	enrichedData["difficulty_match"] = e.calculateDifficultyMatch(userContext, itemContext)
	enrichedData["time_of_day"] = e.getTimeOfDay(event.Timestamp, userContext)
	enrichedData["session_position"] = e.getSessionPosition(ctx, event.SessionID, event.Timestamp)

	// Add performance indicators
	if userContext != nil && itemContext != nil {
		enrichedData["expected_accuracy"] = e.calculateExpectedAccuracy(userContext, itemContext)
		enrichedData["performance_vs_expected"] = e.calculatePerformanceVsExpected(event, userContext, itemContext)
	}

	return enrichedData, nil
}

// enrichSessionEvent enriches a session event
func (e *EventEnricher) enrichSessionEvent(ctx context.Context, event *models.SessionEvent) (map[string]interface{}, error) {
	enrichedData := make(map[string]interface{})

	// Enrich with user context
	userContext, err := e.getUserContext(ctx, event.UserID)
	if err != nil {
		log.Printf("Failed to get user context for user %s: %v", event.UserID, err)
	} else {
		enrichedData["user_context"] = userContext
		enrichedData["user_type"] = userContext.UserType
		enrichedData["country_code"] = userContext.CountryCode
		enrichedData["jurisdiction"] = userContext.CountryCode
		enrichedData["user_study_streak"] = userContext.StudyStreak
		enrichedData["user_timezone"] = userContext.Timezone
		enrichedData["user_total_sessions"] = userContext.TotalSessions
	}

	// Add session-specific enrichments
	sessionDuration := event.EndTime.Sub(event.StartTime)
	enrichedData["session_duration_minutes"] = sessionDuration.Minutes()
	enrichedData["session_accuracy"] = float64(event.CorrectCount) / float64(event.ItemsAttempted)
	enrichedData["average_time_per_item"] = float64(event.TotalTimeMs) / float64(event.ItemsAttempted)
	enrichedData["time_of_day"] = e.getTimeOfDay(event.StartTime, userContext)
	enrichedData["day_of_week"] = event.StartTime.Weekday().String()

	// Categorize session performance
	if userContext != nil {
		enrichedData["session_performance"] = e.categorizeSessionPerformance(event, userContext)
		enrichedData["session_vs_average"] = e.compareSessionToAverage(event, userContext)
	}

	return enrichedData, nil
}

// enrichPlacementEvent enriches a placement event
func (e *EventEnricher) enrichPlacementEvent(ctx context.Context, event *models.PlacementEvent) (map[string]interface{}, error) {
	enrichedData := make(map[string]interface{})

	// Enrich with user context
	userContext, err := e.getUserContext(ctx, event.UserID)
	if err != nil {
		log.Printf("Failed to get user context for user %s: %v", event.UserID, err)
	} else {
		enrichedData["user_context"] = userContext
		enrichedData["user_type"] = userContext.UserType
		enrichedData["country_code"] = userContext.CountryCode
		enrichedData["jurisdiction"] = userContext.CountryCode
		enrichedData["user_timezone"] = userContext.Timezone
		enrichedData["is_new_user"] = userContext.TotalSessions == 0
	}

	// Add placement-specific enrichments
	enrichedData["placement_completed"] = event.WasCompleted
	enrichedData["placement_accuracy"] = event.OverallAccuracy
	enrichedData["time_of_day"] = e.getTimeOfDay(event.Timestamp, userContext)

	if event.WasCompleted {
		enrichedData["placement_performance"] = e.categorizePlacementPerformance(event.OverallAccuracy)
	}

	return enrichedData, nil
}

// getUserContext retrieves user context with caching
func (e *EventEnricher) getUserContext(ctx context.Context, userID string) (*UserContext, error) {
	// Check local cache first
	e.cache.mu.RLock()
	if cached, exists := e.cache.userCache[userID]; exists {
		if time.Since(cached.CachedAt) < e.cache.ttl {
			e.cache.mu.RUnlock()
			return cached, nil
		}
	}
	e.cache.mu.RUnlock()

	// Try Redis cache
	cacheKey := fmt.Sprintf("user_context:%s", userID)
	cachedData, err := e.redisClient.Get(ctx, cacheKey).Result()
	if err == nil {
		var userContext UserContext
		if err := json.Unmarshal([]byte(cachedData), &userContext); err == nil {
			// Update local cache
			e.cache.mu.Lock()
			e.cache.userCache[userID] = &userContext
			e.cache.mu.Unlock()
			return &userContext, nil
		}
	}

	// Fetch from database (simulated - in real implementation, this would call user service)
	userContext, err := e.fetchUserContextFromDB(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Cache in Redis and local cache
	userContext.CachedAt = time.Now()
	if data, err := json.Marshal(userContext); err == nil {
		e.redisClient.Set(ctx, cacheKey, data, e.cache.ttl)
	}

	e.cache.mu.Lock()
	e.cache.userCache[userID] = userContext
	e.cache.mu.Unlock()

	return userContext, nil
}

// getItemContext retrieves item context with caching
func (e *EventEnricher) getItemContext(ctx context.Context, itemID string) (*ItemContext, error) {
	// Check local cache first
	e.cache.mu.RLock()
	if cached, exists := e.cache.itemCache[itemID]; exists {
		if time.Since(cached.CachedAt) < e.cache.ttl {
			e.cache.mu.RUnlock()
			return cached, nil
		}
	}
	e.cache.mu.RUnlock()

	// Try Redis cache
	cacheKey := fmt.Sprintf("item_context:%s", itemID)
	cachedData, err := e.redisClient.Get(ctx, cacheKey).Result()
	if err == nil {
		var itemContext ItemContext
		if err := json.Unmarshal([]byte(cachedData), &itemContext); err == nil {
			// Update local cache
			e.cache.mu.Lock()
			e.cache.itemCache[itemID] = &itemContext
			e.cache.mu.Unlock()
			return &itemContext, nil
		}
	}

	// Fetch from database (simulated - in real implementation, this would call content service)
	itemContext, err := e.fetchItemContextFromDB(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Cache in Redis and local cache
	itemContext.CachedAt = time.Now()
	if data, err := json.Marshal(itemContext); err == nil {
		e.redisClient.Set(ctx, cacheKey, data, e.cache.ttl)
	}

	e.cache.mu.Lock()
	e.cache.itemCache[itemID] = itemContext
	e.cache.mu.Unlock()

	return itemContext, nil
}

// Helper methods for enrichment calculations
func (e *EventEnricher) categorizeResponseTime(timeMs int64, itemContext *ItemContext) string {
	if itemContext == nil {
		return "unknown"
	}

	avgTime := itemContext.AverageTimeMs
	if avgTime == 0 {
		return "unknown"
	}

	ratio := float64(timeMs) / float64(avgTime)
	switch {
	case ratio < 0.5:
		return "very_fast"
	case ratio < 0.8:
		return "fast"
	case ratio < 1.2:
		return "normal"
	case ratio < 2.0:
		return "slow"
	default:
		return "very_slow"
	}
}

func (e *EventEnricher) calculateDifficultyMatch(userContext *UserContext, itemContext *ItemContext) string {
	if userContext == nil || itemContext == nil {
		return "unknown"
	}

	userAbility := userContext.AverageAccuracy
	itemDifficulty := 1.0 - itemContext.AverageAccuracy // Invert accuracy to get difficulty

	diff := userAbility - itemDifficulty
	switch {
	case diff > 0.3:
		return "too_easy"
	case diff > 0.1:
		return "slightly_easy"
	case diff > -0.1:
		return "well_matched"
	case diff > -0.3:
		return "slightly_hard"
	default:
		return "too_hard"
	}
}

func (e *EventEnricher) getTimeOfDay(timestamp time.Time, userContext *UserContext) string {
	// Convert to user's timezone if available
	if userContext != nil && userContext.Timezone != "" {
		if loc, err := time.LoadLocation(userContext.Timezone); err == nil {
			timestamp = timestamp.In(loc)
		}
	}

	hour := timestamp.Hour()
	switch {
	case hour < 6:
		return "night"
	case hour < 12:
		return "morning"
	case hour < 18:
		return "afternoon"
	default:
		return "evening"
	}
}

func (e *EventEnricher) getSessionPosition(ctx context.Context, sessionID string, timestamp time.Time) int {
	// This would typically query the database to find the position of this attempt in the session
	// For now, return a placeholder
	return 1
}

func (e *EventEnricher) calculateExpectedAccuracy(userContext *UserContext, itemContext *ItemContext) float64 {
	if userContext == nil || itemContext == nil {
		return 0.5 // Default 50%
	}

	// Simple model: blend user's average accuracy with item's average accuracy
	userWeight := 0.7
	itemWeight := 0.3

	return userWeight*userContext.AverageAccuracy + itemWeight*itemContext.AverageAccuracy
}

func (e *EventEnricher) calculatePerformanceVsExpected(event *models.AttemptEvent, userContext *UserContext, itemContext *ItemContext) string {
	expected := e.calculateExpectedAccuracy(userContext, itemContext)
	actual := 0.0
	if event.Correct {
		actual = 1.0
	}

	diff := actual - expected
	switch {
	case diff > 0.3:
		return "much_better"
	case diff > 0.1:
		return "better"
	case diff > -0.1:
		return "as_expected"
	case diff > -0.3:
		return "worse"
	default:
		return "much_worse"
	}
}

func (e *EventEnricher) categorizeSessionPerformance(event *models.SessionEvent, userContext *UserContext) string {
	accuracy := float64(event.CorrectCount) / float64(event.ItemsAttempted)

	if userContext == nil {
		// Use general thresholds
		switch {
		case accuracy >= 0.9:
			return "excellent"
		case accuracy >= 0.8:
			return "good"
		case accuracy >= 0.7:
			return "average"
		case accuracy >= 0.6:
			return "below_average"
		default:
			return "poor"
		}
	}

	// Compare to user's average
	diff := accuracy - userContext.AverageAccuracy
	switch {
	case diff > 0.2:
		return "much_better_than_usual"
	case diff > 0.1:
		return "better_than_usual"
	case diff > -0.1:
		return "typical"
	case diff > -0.2:
		return "worse_than_usual"
	default:
		return "much_worse_than_usual"
	}
}

func (e *EventEnricher) compareSessionToAverage(event *models.SessionEvent, userContext *UserContext) map[string]interface{} {
	comparison := make(map[string]interface{})

	if userContext == nil {
		return comparison
	}

	sessionAccuracy := float64(event.CorrectCount) / float64(event.ItemsAttempted)
	comparison["accuracy_vs_average"] = sessionAccuracy - userContext.AverageAccuracy

	// Add more comparisons as needed
	return comparison
}

func (e *EventEnricher) categorizePlacementPerformance(accuracy float64) string {
	switch {
	case accuracy >= 0.9:
		return "excellent"
	case accuracy >= 0.8:
		return "good"
	case accuracy >= 0.7:
		return "average"
	case accuracy >= 0.6:
		return "below_average"
	default:
		return "poor"
	}
}

// Simulated database fetch methods (in real implementation, these would call actual services)
func (e *EventEnricher) fetchUserContextFromDB(ctx context.Context, userID string) (*UserContext, error) {
	// This is a placeholder - in real implementation, this would call the user service
	return &UserContext{
		UserID:           userID,
		CountryCode:      "US",
		UserType:         "free",
		RegistrationDate: time.Now().AddDate(0, -1, 0),
		LastActiveDate:   time.Now().AddDate(0, 0, -1),
		TotalSessions:    10,
		TotalAttempts:    100,
		AverageAccuracy:  0.75,
		PreferredTopics:  []string{"traffic_signs", "road_rules"},
		StudyStreak:      5,
		Timezone:         "America/New_York",
		DeviceTypes:      []string{"mobile"},
		Preferences:      make(map[string]interface{}),
		CachedAt:         time.Now(),
	}, nil
}

func (e *EventEnricher) fetchItemContextFromDB(ctx context.Context, itemID string) (*ItemContext, error) {
	// This is a placeholder - in real implementation, this would call the content service
	return &ItemContext{
		ItemID:          itemID,
		Topics:          []string{"traffic_signs"},
		Jurisdictions:   []string{"US"},
		Difficulty:      0.6,
		ItemType:        "multiple_choice",
		CognitiveLevel:  "knowledge",
		EstimatedTime:   30,
		CreatedDate:     time.Now().AddDate(0, -6, 0),
		LastUpdated:     time.Now().AddDate(0, -1, 0),
		TotalAttempts:   1000,
		AverageAccuracy: 0.7,
		AverageTimeMs:   25000,
		PopularityScore: 0.8,
		CachedAt:        time.Now(),
	}, nil
}

// Close closes the enricher and its resources
func (e *EventEnricher) Close() error {
	return e.redisClient.Close()
}
