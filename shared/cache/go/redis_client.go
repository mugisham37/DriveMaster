package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
)

// RedisConfig holds Redis connection configuration
type RedisConfig struct {
	Addresses    []string      `json:"addresses"`
	Password     string        `json:"password"`
	DB           int           `json:"db"`
	PoolSize     int           `json:"pool_size"`
	MinIdleConns int           `json:"min_idle_conns"`
	MaxRetries   int           `json:"max_retries"`
	DialTimeout  time.Duration `json:"dial_timeout"`
	ReadTimeout  time.Duration `json:"read_timeout"`
	WriteTimeout time.Duration `json:"write_timeout"`
	PoolTimeout  time.Duration `json:"pool_timeout"`
	IdleTimeout  time.Duration `json:"idle_timeout"`
	ClusterMode  bool          `json:"cluster_mode"`
}

// DefaultRedisConfig returns a default Redis configuration
func DefaultRedisConfig() *RedisConfig {
	return &RedisConfig{
		Addresses:    []string{"localhost:6379"},
		Password:     "",
		DB:           0,
		PoolSize:     10,
		MinIdleConns: 5,
		MaxRetries:   3,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolTimeout:  4 * time.Second,
		IdleTimeout:  5 * time.Minute,
		ClusterMode:  false,
	}
}

// RedisClient wraps Redis client with additional functionality
type RedisClient struct {
	client         redis.Cmdable
	config         *RedisConfig
	keyPrefix      string
	metrics        *CacheMetrics
	circuitBreaker *CircuitBreaker
}

// CacheMetrics tracks cache performance metrics
type CacheMetrics struct {
	Hits       int64         `json:"hits"`
	Misses     int64         `json:"misses"`
	Sets       int64         `json:"sets"`
	Deletes    int64         `json:"deletes"`
	Errors     int64         `json:"errors"`
	TotalOps   int64         `json:"total_ops"`
	AvgLatency time.Duration `json:"avg_latency"`
}

// CircuitBreaker implements circuit breaker pattern for Redis operations
type CircuitBreaker struct {
	failureThreshold int
	resetTimeout     time.Duration
	failures         int
	lastFailureTime  time.Time
	state            string // "closed", "open", "half-open"
}

// NewRedisClient creates a new Redis client with connection management
func NewRedisClient(config *RedisConfig, keyPrefix string) (*RedisClient, error) {
	var client redis.Cmdable

	if config.ClusterMode {
		// Redis Cluster client
		client = redis.NewClusterClient(&redis.ClusterOptions{
			Addrs:        config.Addresses,
			Password:     config.Password,
			PoolSize:     config.PoolSize,
			MinIdleConns: config.MinIdleConns,
			MaxRetries:   config.MaxRetries,
			DialTimeout:  config.DialTimeout,
			ReadTimeout:  config.ReadTimeout,
			WriteTimeout: config.WriteTimeout,
			PoolTimeout:  config.PoolTimeout,
			IdleTimeout:  config.IdleTimeout,
		})
	} else {
		// Single Redis instance client
		client = redis.NewClient(&redis.Options{
			Addr:         config.Addresses[0],
			Password:     config.Password,
			DB:           config.DB,
			PoolSize:     config.PoolSize,
			MinIdleConns: config.MinIdleConns,
			MaxRetries:   config.MaxRetries,
			DialTimeout:  config.DialTimeout,
			ReadTimeout:  config.ReadTimeout,
			WriteTimeout: config.WriteTimeout,
			PoolTimeout:  config.PoolTimeout,
			IdleTimeout:  config.IdleTimeout,
		})
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	redisClient := &RedisClient{
		client:    client,
		config:    config,
		keyPrefix: keyPrefix,
		metrics:   &CacheMetrics{},
		circuitBreaker: &CircuitBreaker{
			failureThreshold: 5,
			resetTimeout:     30 * time.Second,
			state:            "closed",
		},
	}

	log.Printf("Redis client connected successfully (cluster: %v, prefix: %s)",
		config.ClusterMode, keyPrefix)

	return redisClient, nil
}

// buildKey constructs a cache key with prefix and namespace
func (r *RedisClient) buildKey(key string) string {
	if r.keyPrefix == "" {
		return key
	}
	return fmt.Sprintf("%s:%s", r.keyPrefix, key)
}

// executeWithCircuitBreaker executes Redis operations with circuit breaker pattern
func (r *RedisClient) executeWithCircuitBreaker(ctx context.Context, operation func() error) error {
	start := time.Now()
	defer func() {
		r.metrics.TotalOps++
		r.metrics.AvgLatency = time.Duration(
			(int64(r.metrics.AvgLatency)*r.metrics.TotalOps + int64(time.Since(start))) /
				(r.metrics.TotalOps + 1),
		)
	}()

	// Check circuit breaker state
	if r.circuitBreaker.state == "open" {
		if time.Since(r.circuitBreaker.lastFailureTime) > r.circuitBreaker.resetTimeout {
			r.circuitBreaker.state = "half-open"
		} else {
			r.metrics.Errors++
			return fmt.Errorf("circuit breaker is open")
		}
	}

	err := operation()
	if err != nil {
		r.metrics.Errors++
		r.circuitBreaker.failures++
		r.circuitBreaker.lastFailureTime = time.Now()

		if r.circuitBreaker.failures >= r.circuitBreaker.failureThreshold {
			r.circuitBreaker.state = "open"
		}
		return err
	}

	// Reset circuit breaker on success
	if r.circuitBreaker.state == "half-open" {
		r.circuitBreaker.state = "closed"
		r.circuitBreaker.failures = 0
	}

	return nil
}

// Get retrieves a value from cache
func (r *RedisClient) Get(ctx context.Context, key string) (string, error) {
	var result string
	var err error

	err = r.executeWithCircuitBreaker(ctx, func() error {
		result, err = r.client.Get(ctx, r.buildKey(key)).Result()
		if err == redis.Nil {
			r.metrics.Misses++
			return ErrCacheMiss
		}
		if err != nil {
			return err
		}
		r.metrics.Hits++
		return nil
	})

	return result, err
}

// GetJSON retrieves and unmarshals JSON data from cache
func (r *RedisClient) GetJSON(ctx context.Context, key string, dest interface{}) error {
	data, err := r.Get(ctx, key)
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(data), dest)
}

// Set stores a value in cache with TTL
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	var data string

	switch v := value.(type) {
	case string:
		data = v
	case []byte:
		data = string(v)
	default:
		jsonData, err := json.Marshal(value)
		if err != nil {
			return fmt.Errorf("failed to marshal value: %w", err)
		}
		data = string(jsonData)
	}

	err := r.executeWithCircuitBreaker(ctx, func() error {
		return r.client.Set(ctx, r.buildKey(key), data, ttl).Err()
	})

	if err == nil {
		r.metrics.Sets++
	}

	return err
}

// SetNX sets a value only if the key doesn't exist (atomic operation)
func (r *RedisClient) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	var data string
	var result bool

	switch v := value.(type) {
	case string:
		data = v
	case []byte:
		data = string(v)
	default:
		jsonData, err := json.Marshal(value)
		if err != nil {
			return false, fmt.Errorf("failed to marshal value: %w", err)
		}
		data = string(jsonData)
	}

	err := r.executeWithCircuitBreaker(ctx, func() error {
		var err error
		result, err = r.client.SetNX(ctx, r.buildKey(key), data, ttl).Result()
		return err
	})

	if err == nil && result {
		r.metrics.Sets++
	}

	return result, err
}

// Delete removes a key from cache
func (r *RedisClient) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}

	// Build prefixed keys
	prefixedKeys := make([]string, len(keys))
	for i, key := range keys {
		prefixedKeys[i] = r.buildKey(key)
	}

	err := r.executeWithCircuitBreaker(ctx, func() error {
		return r.client.Del(ctx, prefixedKeys...).Err()
	})

	if err == nil {
		r.metrics.Deletes += int64(len(keys))
	}

	return err
}

// Exists checks if keys exist in cache
func (r *RedisClient) Exists(ctx context.Context, keys ...string) (int64, error) {
	if len(keys) == 0 {
		return 0, nil
	}

	// Build prefixed keys
	prefixedKeys := make([]string, len(keys))
	for i, key := range keys {
		prefixedKeys[i] = r.buildKey(key)
	}

	var result int64
	err := r.executeWithCircuitBreaker(ctx, func() error {
		var err error
		result, err = r.client.Exists(ctx, prefixedKeys...).Result()
		return err
	})

	return result, err
}

// Expire sets TTL for a key
func (r *RedisClient) Expire(ctx context.Context, key string, ttl time.Duration) error {
	return r.executeWithCircuitBreaker(ctx, func() error {
		return r.client.Expire(ctx, r.buildKey(key), ttl).Err()
	})
}

// TTL returns the remaining TTL for a key
func (r *RedisClient) TTL(ctx context.Context, key string) (time.Duration, error) {
	var result time.Duration
	err := r.executeWithCircuitBreaker(ctx, func() error {
		var err error
		result, err = r.client.TTL(ctx, r.buildKey(key)).Result()
		return err
	})

	return result, err
}

// Increment atomically increments a key's value
func (r *RedisClient) Increment(ctx context.Context, key string) (int64, error) {
	var result int64
	err := r.executeWithCircuitBreaker(ctx, func() error {
		var err error
		result, err = r.client.Incr(ctx, r.buildKey(key)).Result()
		return err
	})

	return result, err
}

// IncrementBy atomically increments a key's value by a specific amount
func (r *RedisClient) IncrementBy(ctx context.Context, key string, value int64) (int64, error) {
	var result int64
	err := r.executeWithCircuitBreaker(ctx, func() error {
		var err error
		result, err = r.client.IncrBy(ctx, r.buildKey(key), value).Result()
		return err
	})

	return result, err
}

// GetMultiple retrieves multiple keys at once
func (r *RedisClient) GetMultiple(ctx context.Context, keys ...string) (map[string]string, error) {
	if len(keys) == 0 {
		return make(map[string]string), nil
	}

	// Build prefixed keys
	prefixedKeys := make([]string, len(keys))
	for i, key := range keys {
		prefixedKeys[i] = r.buildKey(key)
	}

	var values []interface{}
	err := r.executeWithCircuitBreaker(ctx, func() error {
		var err error
		values, err = r.client.MGet(ctx, prefixedKeys...).Result()
		return err
	})

	if err != nil {
		return nil, err
	}

	result := make(map[string]string)
	hits := int64(0)
	misses := int64(0)

	for i, value := range values {
		if value != nil {
			result[keys[i]] = value.(string)
			hits++
		} else {
			misses++
		}
	}

	r.metrics.Hits += hits
	r.metrics.Misses += misses

	return result, nil
}

// SetMultiple sets multiple key-value pairs at once
func (r *RedisClient) SetMultiple(ctx context.Context, pairs map[string]interface{}, ttl time.Duration) error {
	if len(pairs) == 0 {
		return nil
	}

	// Prepare pipeline
	pipe := r.client.Pipeline()

	for key, value := range pairs {
		var data string
		switch v := value.(type) {
		case string:
			data = v
		case []byte:
			data = string(v)
		default:
			jsonData, err := json.Marshal(value)
			if err != nil {
				return fmt.Errorf("failed to marshal value for key %s: %w", key, err)
			}
			data = string(jsonData)
		}

		pipe.Set(ctx, r.buildKey(key), data, ttl)
	}

	err := r.executeWithCircuitBreaker(ctx, func() error {
		_, err := pipe.Exec(ctx)
		return err
	})

	if err == nil {
		r.metrics.Sets += int64(len(pairs))
	}

	return err
}

// InvalidatePattern deletes all keys matching a pattern
func (r *RedisClient) InvalidatePattern(ctx context.Context, pattern string) error {
	fullPattern := r.buildKey(pattern)

	return r.executeWithCircuitBreaker(ctx, func() error {
		// Get all keys matching pattern
		keys, err := r.client.Keys(ctx, fullPattern).Result()
		if err != nil {
			return err
		}

		if len(keys) == 0 {
			return nil
		}

		// Delete all matching keys
		return r.client.Del(ctx, keys...).Err()
	})
}

// GetMetrics returns current cache metrics
func (r *RedisClient) GetMetrics() *CacheMetrics {
	return r.metrics
}

// GetHitRatio calculates cache hit ratio
func (r *RedisClient) GetHitRatio() float64 {
	total := r.metrics.Hits + r.metrics.Misses
	if total == 0 {
		return 0
	}
	return float64(r.metrics.Hits) / float64(total)
}

// Health checks Redis connection health
func (r *RedisClient) Health(ctx context.Context) error {
	return r.executeWithCircuitBreaker(ctx, func() error {
		return r.client.Ping(ctx).Err()
	})
}

// Close closes the Redis connection
func (r *RedisClient) Close() error {
	if closer, ok := r.client.(interface{ Close() error }); ok {
		return closer.Close()
	}
	return nil
}

// Custom errors
var (
	ErrCacheMiss = fmt.Errorf("cache miss")
)

// CacheWarmer handles cache warming strategies
type CacheWarmer struct {
	client *RedisClient
}

// NewCacheWarmer creates a new cache warmer
func NewCacheWarmer(client *RedisClient) *CacheWarmer {
	return &CacheWarmer{client: client}
}

// WarmCache preloads frequently accessed data
func (cw *CacheWarmer) WarmCache(ctx context.Context, warmupData map[string]interface{}, ttl time.Duration) error {
	log.Printf("Starting cache warmup with %d items", len(warmupData))

	// Use pipeline for efficient bulk operations
	pipe := cw.client.client.Pipeline()

	for key, value := range warmupData {
		var data string
		switch v := value.(type) {
		case string:
			data = v
		default:
			jsonData, err := json.Marshal(value)
			if err != nil {
				log.Printf("Failed to marshal warmup data for key %s: %v", key, err)
				continue
			}
			data = string(jsonData)
		}

		pipe.Set(ctx, cw.client.buildKey(key), data, ttl)
	}

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("cache warmup failed: %w", err)
	}

	log.Printf("Cache warmup completed successfully")
	return nil
}
