package cache

import (
	"context"
	"fmt"
	"time"
)

// CachePatterns defines common caching patterns and key strategies
type CachePatterns struct {
	client *RedisClient
}

// NewCachePatterns creates a new cache patterns helper
func NewCachePatterns(client *RedisClient) *CachePatterns {
	return &CachePatterns{client: client}
}

// Key pattern constants for the adaptive learning platform
const (
	// User-related keys
	UserKeyPattern            = "user:%s"             // user:user_id
	UserPreferencesKeyPattern = "user:preferences:%s" // user:preferences:user_id
	UserSessionKeyPattern     = "user:session:%s"     // user:session:session_id
	UserActivityKeyPattern    = "user:activity:%s:%s" // user:activity:user_id:date

	// Scheduler-related keys
	SchedulerStateKeyPattern = "scheduler:%s"     // scheduler:user_id
	SchedulerHotKeyPattern   = "scheduler:hot:%s" // scheduler:hot:user_id
	SM2StateKeyPattern       = "sm2:%s:%s"        // sm2:user_id:item_id
	BKTStateKeyPattern       = "bkt:%s:%s"        // bkt:user_id:topic
	IRTAbilityKeyPattern     = "irt:ability:%s"   // irt:ability:user_id

	// Content-related keys
	ItemKeyPattern             = "item:%s"               // item:item_id
	ItemsByJurisdictionPattern = "items:jurisdiction:%s" // items:jurisdiction:country_code
	ItemsByTopicPattern        = "items:topic:%s"        // items:topic:topic_name
	ItemDifficultyKeyPattern   = "item:difficulty:%s"    // item:difficulty:item_id

	// ML prediction keys
	PredictionKeyPattern      = "prediction:%s:%s"       // prediction:user_id:item_id
	PredictionBatchKeyPattern = "prediction:batch:%s:%s" // prediction:batch:user_id:hash
	ModelVersionKeyPattern    = "ml:model:version"       // ml:model:version

	// Session and rate limiting keys
	SessionKeyPattern       = "session:%s"            // session:session_id
	RateLimitUserKeyPattern = "rate_limit:user:%s:%s" // rate_limit:user:user_id:endpoint
	RateLimitIPKeyPattern   = "rate_limit:ip:%s:%s"   // rate_limit:ip:ip_address:endpoint

	// Feature flags and configuration
	FeatureFlagsKeyPattern     = "feature_flags"         // feature_flags
	FeatureFlagsUserKeyPattern = "feature_flags:user:%s" // feature_flags:user:user_id
	ConfigKeyPattern           = "config:%s"             // config:service_name

	// Analytics and metrics
	MetricsKeyPattern   = "metrics:%s:%s"   // metrics:service:metric_name
	AnalyticsKeyPattern = "analytics:%s:%s" // analytics:user_id:date
)

// TTL constants for different data types
const (
	// Short-lived data (5-15 minutes)
	PredictionTTL = 15 * time.Minute
	SessionTTL    = 30 * time.Minute
	RateLimitTTL  = 1 * time.Hour

	// Medium-lived data (1-4 hours)
	SchedulerStateTTL = 30 * time.Minute
	SchedulerHotTTL   = 15 * time.Minute
	UserDataTTL       = 1 * time.Hour
	ItemDataTTL       = 4 * time.Hour

	// Long-lived data (4-24 hours)
	ContentListTTL  = 6 * time.Hour
	FeatureFlagsTTL = 5 * time.Minute
	ConfigTTL       = 1 * time.Hour

	// Very long-lived data (1-7 days)
	AnalyticsTTL = 24 * time.Hour
	MetricsTTL   = 1 * time.Hour
)

// User cache operations
func (cp *CachePatterns) GetUser(ctx context.Context, userID string) (map[string]interface{}, error) {
	key := fmt.Sprintf(UserKeyPattern, userID)
	var user map[string]interface{}
	err := cp.client.GetJSON(ctx, key, &user)
	return user, err
}

func (cp *CachePatterns) SetUser(ctx context.Context, userID string, user map[string]interface{}) error {
	key := fmt.Sprintf(UserKeyPattern, userID)
	return cp.client.Set(ctx, key, user, UserDataTTL)
}

func (cp *CachePatterns) GetUserPreferences(ctx context.Context, userID string) (map[string]interface{}, error) {
	key := fmt.Sprintf(UserPreferencesKeyPattern, userID)
	var preferences map[string]interface{}
	err := cp.client.GetJSON(ctx, key, &preferences)
	return preferences, err
}

func (cp *CachePatterns) SetUserPreferences(ctx context.Context, userID string, preferences map[string]interface{}) error {
	key := fmt.Sprintf(UserPreferencesKeyPattern, userID)
	return cp.client.Set(ctx, key, preferences, UserDataTTL)
}

// Scheduler state cache operations
func (cp *CachePatterns) GetSchedulerState(ctx context.Context, userID string) (map[string]interface{}, error) {
	key := fmt.Sprintf(SchedulerStateKeyPattern, userID)
	var state map[string]interface{}
	err := cp.client.GetJSON(ctx, key, &state)
	return state, err
}

func (cp *CachePatterns) SetSchedulerState(ctx context.Context, userID string, state map[string]interface{}) error {
	key := fmt.Sprintf(SchedulerStateKeyPattern, userID)
	return cp.client.Set(ctx, key, state, SchedulerStateTTL)
}

func (cp *CachePatterns) GetSchedulerHotData(ctx context.Context, userID string) (map[string]interface{}, error) {
	key := fmt.Sprintf(SchedulerHotKeyPattern, userID)
	var hotData map[string]interface{}
	err := cp.client.GetJSON(ctx, key, &hotData)
	return hotData, err
}

func (cp *CachePatterns) SetSchedulerHotData(ctx context.Context, userID string, hotData map[string]interface{}) error {
	key := fmt.Sprintf(SchedulerHotKeyPattern, userID)
	return cp.client.Set(ctx, key, hotData, SchedulerHotTTL)
}

// Content cache operations
func (cp *CachePatterns) GetItem(ctx context.Context, itemID string) (map[string]interface{}, error) {
	key := fmt.Sprintf(ItemKeyPattern, itemID)
	var item map[string]interface{}
	err := cp.client.GetJSON(ctx, key, &item)
	return item, err
}

func (cp *CachePatterns) SetItem(ctx context.Context, itemID string, item map[string]interface{}) error {
	key := fmt.Sprintf(ItemKeyPattern, itemID)
	return cp.client.Set(ctx, key, item, ItemDataTTL)
}

func (cp *CachePatterns) GetItemsByJurisdiction(ctx context.Context, countryCode string) ([]string, error) {
	key := fmt.Sprintf(ItemsByJurisdictionPattern, countryCode)
	var itemIDs []string
	err := cp.client.GetJSON(ctx, key, &itemIDs)
	return itemIDs, err
}

func (cp *CachePatterns) SetItemsByJurisdiction(ctx context.Context, countryCode string, itemIDs []string) error {
	key := fmt.Sprintf(ItemsByJurisdictionPattern, countryCode)
	return cp.client.Set(ctx, key, itemIDs, ContentListTTL)
}

func (cp *CachePatterns) GetItemsByTopic(ctx context.Context, topic string) ([]string, error) {
	key := fmt.Sprintf(ItemsByTopicPattern, topic)
	var itemIDs []string
	err := cp.client.GetJSON(ctx, key, &itemIDs)
	return itemIDs, err
}

func (cp *CachePatterns) SetItemsByTopic(ctx context.Context, topic string, itemIDs []string) error {
	key := fmt.Sprintf(ItemsByTopicPattern, topic)
	return cp.client.Set(ctx, key, itemIDs, ContentListTTL)
}

// ML prediction cache operations
func (cp *CachePatterns) GetPrediction(ctx context.Context, userID, itemID string) (float64, error) {
	key := fmt.Sprintf(PredictionKeyPattern, userID, itemID)
	result, err := cp.client.Get(ctx, key)
	if err != nil {
		return 0, err
	}

	var prediction float64
	if err := cp.client.GetJSON(ctx, key, &prediction); err != nil {
		return 0, err
	}

	return prediction, nil
}

func (cp *CachePatterns) SetPrediction(ctx context.Context, userID, itemID string, prediction float64) error {
	key := fmt.Sprintf(PredictionKeyPattern, userID, itemID)
	return cp.client.Set(ctx, key, prediction, PredictionTTL)
}

func (cp *CachePatterns) GetBatchPredictions(ctx context.Context, userID, hash string) (map[string]float64, error) {
	key := fmt.Sprintf(PredictionBatchKeyPattern, userID, hash)
	var predictions map[string]float64
	err := cp.client.GetJSON(ctx, key, &predictions)
	return predictions, err
}

func (cp *CachePatterns) SetBatchPredictions(ctx context.Context, userID, hash string, predictions map[string]float64) error {
	key := fmt.Sprintf(PredictionBatchKeyPattern, userID, hash)
	return cp.client.Set(ctx, key, predictions, PredictionTTL)
}

// Session management
func (cp *CachePatterns) GetSession(ctx context.Context, sessionID string) (map[string]interface{}, error) {
	key := fmt.Sprintf(SessionKeyPattern, sessionID)
	var session map[string]interface{}
	err := cp.client.GetJSON(ctx, key, &session)
	return session, err
}

func (cp *CachePatterns) SetSession(ctx context.Context, sessionID string, session map[string]interface{}) error {
	key := fmt.Sprintf(SessionKeyPattern, sessionID)
	return cp.client.Set(ctx, key, session, SessionTTL)
}

func (cp *CachePatterns) ExtendSession(ctx context.Context, sessionID string) error {
	key := fmt.Sprintf(SessionKeyPattern, sessionID)
	return cp.client.Expire(ctx, key, SessionTTL)
}

// Rate limiting
func (cp *CachePatterns) CheckRateLimit(ctx context.Context, userID, endpoint string, limit int64) (bool, error) {
	key := fmt.Sprintf(RateLimitUserKeyPattern, userID, endpoint)

	current, err := cp.client.Increment(ctx, key)
	if err != nil {
		return false, err
	}

	// Set TTL on first increment
	if current == 1 {
		if err := cp.client.Expire(ctx, key, RateLimitTTL); err != nil {
			return false, err
		}
	}

	return current <= limit, nil
}

func (cp *CachePatterns) CheckIPRateLimit(ctx context.Context, ipAddress, endpoint string, limit int64) (bool, error) {
	key := fmt.Sprintf(RateLimitIPKeyPattern, ipAddress, endpoint)

	current, err := cp.client.Increment(ctx, key)
	if err != nil {
		return false, err
	}

	// Set TTL on first increment
	if current == 1 {
		if err := cp.client.Expire(ctx, key, RateLimitTTL); err != nil {
			return false, err
		}
	}

	return current <= limit, nil
}

// Feature flags
func (cp *CachePatterns) GetFeatureFlags(ctx context.Context) (map[string]interface{}, error) {
	key := FeatureFlagsKeyPattern
	var flags map[string]interface{}
	err := cp.client.GetJSON(ctx, key, &flags)
	return flags, err
}

func (cp *CachePatterns) SetFeatureFlags(ctx context.Context, flags map[string]interface{}) error {
	key := FeatureFlagsKeyPattern
	return cp.client.Set(ctx, key, flags, FeatureFlagsTTL)
}

func (cp *CachePatterns) GetUserFeatureFlags(ctx context.Context, userID string) (map[string]interface{}, error) {
	key := fmt.Sprintf(FeatureFlagsUserKeyPattern, userID)
	var flags map[string]interface{}
	err := cp.client.GetJSON(ctx, key, &flags)
	return flags, err
}

func (cp *CachePatterns) SetUserFeatureFlags(ctx context.Context, userID string, flags map[string]interface{}) error {
	key := fmt.Sprintf(FeatureFlagsUserKeyPattern, userID)
	return cp.client.Set(ctx, key, flags, FeatureFlagsTTL)
}

// Cache invalidation patterns
func (cp *CachePatterns) InvalidateUser(ctx context.Context, userID string) error {
	patterns := []string{
		fmt.Sprintf(UserKeyPattern, userID),
		fmt.Sprintf(UserPreferencesKeyPattern, userID),
		fmt.Sprintf(SchedulerStateKeyPattern, userID),
		fmt.Sprintf(SchedulerHotKeyPattern, userID),
		fmt.Sprintf("prediction:%s:*", userID),
		fmt.Sprintf(FeatureFlagsUserKeyPattern, userID),
	}

	for _, pattern := range patterns {
		if err := cp.client.InvalidatePattern(ctx, pattern); err != nil {
			return fmt.Errorf("failed to invalidate pattern %s: %w", pattern, err)
		}
	}

	return nil
}

func (cp *CachePatterns) InvalidateContent(ctx context.Context, itemID string) error {
	patterns := []string{
		fmt.Sprintf(ItemKeyPattern, itemID),
		fmt.Sprintf("prediction:*:%s", itemID),
		"items:jurisdiction:*",
		"items:topic:*",
	}

	for _, pattern := range patterns {
		if err := cp.client.InvalidatePattern(ctx, pattern); err != nil {
			return fmt.Errorf("failed to invalidate pattern %s: %w", pattern, err)
		}
	}

	return nil
}

func (cp *CachePatterns) InvalidateJurisdiction(ctx context.Context, countryCode string) error {
	pattern := fmt.Sprintf(ItemsByJurisdictionPattern, countryCode)
	return cp.client.InvalidatePattern(ctx, pattern)
}

func (cp *CachePatterns) InvalidateTopic(ctx context.Context, topic string) error {
	pattern := fmt.Sprintf(ItemsByTopicPattern, topic)
	return cp.client.InvalidatePattern(ctx, pattern)
}

// Bulk operations for efficiency
func (cp *CachePatterns) GetMultipleItems(ctx context.Context, itemIDs []string) (map[string]map[string]interface{}, error) {
	if len(itemIDs) == 0 {
		return make(map[string]map[string]interface{}), nil
	}

	keys := make([]string, len(itemIDs))
	for i, itemID := range itemIDs {
		keys[i] = fmt.Sprintf(ItemKeyPattern, itemID)
	}

	results, err := cp.client.GetMultiple(ctx, keys...)
	if err != nil {
		return nil, err
	}

	items := make(map[string]map[string]interface{})
	for i, itemID := range itemIDs {
		key := keys[i]
		if data, exists := results[key]; exists {
			var item map[string]interface{}
			if err := cp.client.GetJSON(ctx, key, &item); err == nil {
				items[itemID] = item
			}
		}
	}

	return items, nil
}

func (cp *CachePatterns) SetMultipleItems(ctx context.Context, items map[string]map[string]interface{}) error {
	if len(items) == 0 {
		return nil
	}

	pairs := make(map[string]interface{})
	for itemID, item := range items {
		key := fmt.Sprintf(ItemKeyPattern, itemID)
		pairs[key] = item
	}

	return cp.client.SetMultiple(ctx, pairs, ItemDataTTL)
}
