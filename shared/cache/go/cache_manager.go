package cache

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

// CacheManager orchestrates multiple cache operations and provides high-level caching functionality
type CacheManager struct {
	client      *RedisClient
	patterns    *CachePatterns
	warmer      *CacheWarmer
	invalidator *CacheInvalidator
	metrics     *CacheMetrics
	config      *CacheManagerConfig
	mu          sync.RWMutex
}

// CacheManagerConfig holds configuration for the cache manager
type CacheManagerConfig struct {
	EnableMetrics       bool          `json:"enable_metrics"`
	MetricsInterval     time.Duration `json:"metrics_interval"`
	EnableWarmup        bool          `json:"enable_warmup"`
	WarmupInterval      time.Duration `json:"warmup_interval"`
	EnableInvalidation  bool          `json:"enable_invalidation"`
	MaxRetries          int           `json:"max_retries"`
	RetryDelay          time.Duration `json:"retry_delay"`
	HealthCheckInterval time.Duration `json:"health_check_interval"`
}

// DefaultCacheManagerConfig returns default configuration
func DefaultCacheManagerConfig() *CacheManagerConfig {
	return &CacheManagerConfig{
		EnableMetrics:       true,
		MetricsInterval:     1 * time.Minute,
		EnableWarmup:        true,
		WarmupInterval:      5 * time.Minute,
		EnableInvalidation:  true,
		MaxRetries:          3,
		RetryDelay:          100 * time.Millisecond,
		HealthCheckInterval: 30 * time.Second,
	}
}

// CacheInvalidator handles cache invalidation strategies
type CacheInvalidator struct {
	client    *RedisClient
	patterns  *CachePatterns
	listeners map[string][]InvalidationListener
	mu        sync.RWMutex
}

// InvalidationListener defines callback for cache invalidation events
type InvalidationListener func(ctx context.Context, key string, reason string) error

// NewCacheManager creates a new cache manager with all components
func NewCacheManager(client *RedisClient, config *CacheManagerConfig) *CacheManager {
	if config == nil {
		config = DefaultCacheManagerConfig()
	}

	patterns := NewCachePatterns(client)
	warmer := NewCacheWarmer(client)
	invalidator := &CacheInvalidator{
		client:    client,
		patterns:  patterns,
		listeners: make(map[string][]InvalidationListener),
	}

	manager := &CacheManager{
		client:      client,
		patterns:    patterns,
		warmer:      warmer,
		invalidator: invalidator,
		metrics:     client.GetMetrics(),
		config:      config,
	}

	// Start background processes
	if config.EnableMetrics {
		go manager.startMetricsCollection()
	}

	if config.EnableWarmup {
		go manager.startCacheWarmup()
	}

	go manager.startHealthCheck()

	log.Printf("Cache manager initialized with config: %+v", config)
	return manager
}

// GetClient returns the underlying Redis client
func (cm *CacheManager) GetClient() *RedisClient {
	return cm.client
}

// GetPatterns returns the cache patterns helper
func (cm *CacheManager) GetPatterns() *CachePatterns {
	return cm.patterns
}

// GetWarmer returns the cache warmer
func (cm *CacheManager) GetWarmer() *CacheWarmer {
	return cm.warmer
}

// GetInvalidator returns the cache invalidator
func (cm *CacheManager) GetInvalidator() *CacheInvalidator {
	return cm.invalidator
}

// WithRetry executes a cache operation with retry logic
func (cm *CacheManager) WithRetry(ctx context.Context, operation func() error) error {
	var lastErr error

	for attempt := 0; attempt <= cm.config.MaxRetries; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(cm.config.RetryDelay * time.Duration(attempt)):
				// Exponential backoff
			}
		}

		if err := operation(); err != nil {
			lastErr = err
			log.Printf("Cache operation failed (attempt %d/%d): %v",
				attempt+1, cm.config.MaxRetries+1, err)
			continue
		}

		return nil
	}

	return fmt.Errorf("cache operation failed after %d attempts: %w",
		cm.config.MaxRetries+1, lastErr)
}

// GetWithFallback attempts to get from cache, falls back to provided function if miss
func (cm *CacheManager) GetWithFallback(
	ctx context.Context,
	key string,
	ttl time.Duration,
	fallback func() (any, error),
) (any, error) {
	// Try to get from cache first
	var result any
	err := cm.WithRetry(ctx, func() error {
		return cm.client.GetJSON(ctx, key, &result)
	})

	if err == nil {
		return result, nil
	}

	if err != ErrCacheMiss {
		log.Printf("Cache error for key %s: %v", key, err)
	}

	// Cache miss or error, use fallback
	data, err := fallback()
	if err != nil {
		return nil, fmt.Errorf("fallback function failed: %w", err)
	}

	// Store in cache for next time (fire and forget)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := cm.client.Set(ctx, key, data, ttl); err != nil {
			log.Printf("Failed to cache data for key %s: %v", key, err)
		}
	}()

	return data, nil
}

// SetWithTags sets a value with associated tags for group invalidation
func (cm *CacheManager) SetWithTags(ctx context.Context, key string, value any, ttl time.Duration, tags ...string) error {
	// Set the main value
	if err := cm.client.Set(ctx, key, value, ttl); err != nil {
		return err
	}

	// Associate with tags for group invalidation
	for _, tag := range tags {
		tagKey := fmt.Sprintf("tag:%s", tag)
		if err := cm.client.client.SAdd(ctx, tagKey, key).Err(); err != nil {
			log.Printf("Failed to add key %s to tag %s: %v", key, tag, err)
		}
		// Set TTL for tag set (slightly longer than data TTL)
		if err := cm.client.Expire(ctx, tagKey, ttl+time.Hour); err != nil {
			log.Printf("Failed to set TTL for tag %s: %v", tag, err)
		}
	}

	return nil
}

// InvalidateByTag invalidates all keys associated with a tag
func (cm *CacheManager) InvalidateByTag(ctx context.Context, tag string) error {
	tagKey := fmt.Sprintf("tag:%s", tag)

	// Get all keys associated with this tag
	keys, err := cm.client.client.SMembers(ctx, tagKey).Result()
	if err != nil {
		return fmt.Errorf("failed to get keys for tag %s: %w", tag, err)
	}

	if len(keys) == 0 {
		return nil
	}

	// Delete all associated keys
	if err := cm.client.Delete(ctx, keys...); err != nil {
		return fmt.Errorf("failed to delete keys for tag %s: %w", tag, err)
	}

	// Delete the tag set itself
	if err := cm.client.Delete(ctx, tagKey); err != nil {
		log.Printf("Failed to delete tag set %s: %v", tagKey, err)
	}

	log.Printf("Invalidated %d keys for tag %s", len(keys), tag)
	return nil
}

// RegisterInvalidationListener registers a callback for cache invalidation events
func (cm *CacheManager) RegisterInvalidationListener(pattern string, listener InvalidationListener) {
	cm.invalidator.mu.Lock()
	defer cm.invalidator.mu.Unlock()

	if cm.invalidator.listeners[pattern] == nil {
		cm.invalidator.listeners[pattern] = make([]InvalidationListener, 0)
	}

	cm.invalidator.listeners[pattern] = append(cm.invalidator.listeners[pattern], listener)
}

// NotifyInvalidation notifies all registered listeners about cache invalidation
func (cm *CacheManager) NotifyInvalidation(ctx context.Context, key, reason string) {
	cm.invalidator.mu.RLock()
	defer cm.invalidator.mu.RUnlock()

	for pattern, listeners := range cm.invalidator.listeners {
		// Simple pattern matching (could be enhanced with regex)
		if matchesPattern(key, pattern) {
			for _, listener := range listeners {
				go func(l InvalidationListener) {
					if err := l(ctx, key, reason); err != nil {
						log.Printf("Invalidation listener error for key %s: %v", key, err)
					}
				}(listener)
			}
		}
	}
}

// GetStats returns comprehensive cache statistics
func (cm *CacheManager) GetStats() map[string]any {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	metrics := cm.client.GetMetrics()

	return map[string]any{
		"hits":                     metrics.Hits,
		"misses":                   metrics.Misses,
		"sets":                     metrics.Sets,
		"deletes":                  metrics.Deletes,
		"errors":                   metrics.Errors,
		"total_ops":                metrics.TotalOps,
		"hit_ratio":                cm.client.GetHitRatio(),
		"avg_latency":              metrics.AvgLatency.String(),
		"circuit_breaker_state":    cm.client.circuitBreaker.state,
		"circuit_breaker_failures": cm.client.circuitBreaker.failures,
	}
}

// startMetricsCollection runs periodic metrics collection
func (cm *CacheManager) startMetricsCollection() {
	ticker := time.NewTicker(cm.config.MetricsInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			stats := cm.GetStats()
			log.Printf("Cache metrics: %+v", stats)

			// Store metrics in cache for monitoring
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			metricsKey := fmt.Sprintf("metrics:cache:%d", time.Now().Unix())
			if err := cm.client.Set(ctx, metricsKey, stats, MetricsTTL); err != nil {
				log.Printf("Failed to store cache metrics: %v", err)
			}
			cancel()
		}
	}
}

// startCacheWarmup runs periodic cache warmup
func (cm *CacheManager) startCacheWarmup() {
	ticker := time.NewTicker(cm.config.WarmupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)

			// Example warmup data - in practice, this would be loaded from database
			warmupData := map[string]any{
				"feature_flags": map[string]bool{
					"new_algorithm": true,
					"beta_features": false,
				},
				"config:global": map[string]any{
					"max_session_time":   3600,
					"default_difficulty": 0.5,
				},
			}

			if err := cm.warmer.WarmCache(ctx, warmupData, FeatureFlagsTTL); err != nil {
				log.Printf("Cache warmup failed: %v", err)
			}

			cancel()
		}
	}
}

// startHealthCheck runs periodic health checks
func (cm *CacheManager) startHealthCheck() {
	ticker := time.NewTicker(cm.config.HealthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)

			if err := cm.client.Health(ctx); err != nil {
				log.Printf("Cache health check failed: %v", err)
			}

			cancel()
		}
	}
}

// Close gracefully shuts down the cache manager
func (cm *CacheManager) Close() error {
	log.Printf("Shutting down cache manager...")
	return cm.client.Close()
}

// Helper function for simple pattern matching
func matchesPattern(key, pattern string) bool {
	// Simple wildcard matching - could be enhanced
	if pattern == "*" {
		return true
	}

	if len(pattern) > 0 && pattern[len(pattern)-1] == '*' {
		prefix := pattern[:len(pattern)-1]
		return len(key) >= len(prefix) && key[:len(prefix)] == prefix
	}

	return key == pattern
}

// CacheMiddleware provides HTTP middleware for caching
type CacheMiddleware struct {
	manager *CacheManager
}

// NewCacheMiddleware creates a new cache middleware
func NewCacheMiddleware(manager *CacheManager) *CacheMiddleware {
	return &CacheMiddleware{manager: manager}
}

// CacheResponse caches HTTP responses based on request characteristics
func (cm *CacheMiddleware) CacheResponse(
	ctx context.Context,
	cacheKey string,
	ttl time.Duration,
	generator func() (any, error),
) (any, error) {
	return cm.manager.GetWithFallback(ctx, cacheKey, ttl, generator)
}
