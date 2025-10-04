package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"scheduler-service/internal/config"
	"scheduler-service/internal/logger"
	"scheduler-service/internal/metrics"

	"github.com/go-redis/redis/v8"
)

// RedisClient wraps Redis client with additional functionality
type RedisClient struct {
	client  *redis.Client
	metrics *metrics.Metrics
	logger  *logger.Logger
}

// CacheItem represents a cached item with TTL
type CacheItem struct {
	Data      interface{} `json:"data"`
	ExpiresAt time.Time   `json:"expires_at"`
}

// New creates a new Redis client
func New(cfg *config.RedisConfig, metrics *metrics.Metrics, log *logger.Logger) (*RedisClient, error) {
	opt, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	opt.DB = cfg.DB
	opt.MaxRetries = cfg.MaxRetries
	opt.PoolSize = cfg.PoolSize

	client := redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Info("Redis connection established successfully")

	return &RedisClient{
		client:  client,
		metrics: metrics,
		logger:  log,
	}, nil
}

// Close closes the Redis connection
func (r *RedisClient) Close() error {
	return r.client.Close()
}

// Health checks Redis health
func (r *RedisClient) Health(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

// Set stores a value in Redis with TTL
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	err = r.client.Set(ctx, key, data, ttl).Err()
	if err != nil {
		r.metrics.RecordCacheMiss("redis")
		return fmt.Errorf("failed to set cache key %s: %w", key, err)
	}

	return nil
}

// Get retrieves a value from Redis
func (r *RedisClient) Get(ctx context.Context, key string, dest interface{}) error {
	data, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			r.metrics.RecordCacheMiss("redis")
			return ErrCacheMiss
		}
		return fmt.Errorf("failed to get cache key %s: %w", key, err)
	}

	if err := json.Unmarshal([]byte(data), dest); err != nil {
		return fmt.Errorf("failed to unmarshal cached value: %w", err)
	}

	r.metrics.RecordCacheHit("redis")
	return nil
}

// Delete removes a key from Redis
func (r *RedisClient) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}

	err := r.client.Del(ctx, keys...).Err()
	if err != nil {
		return fmt.Errorf("failed to delete cache keys: %w", err)
	}

	return nil
}

// Exists checks if a key exists in Redis
func (r *RedisClient) Exists(ctx context.Context, key string) (bool, error) {
	count, err := r.client.Exists(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check key existence: %w", err)
	}

	return count > 0, nil
}

// SetNX sets a key only if it doesn't exist (atomic operation)
func (r *RedisClient) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return false, fmt.Errorf("failed to marshal value: %w", err)
	}

	success, err := r.client.SetNX(ctx, key, data, ttl).Result()
	if err != nil {
		return false, fmt.Errorf("failed to set cache key %s: %w", key, err)
	}

	return success, nil
}

// Increment atomically increments a counter
func (r *RedisClient) Increment(ctx context.Context, key string) (int64, error) {
	val, err := r.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to increment key %s: %w", key, err)
	}

	return val, nil
}

// HSet sets a field in a hash
func (r *RedisClient) HSet(ctx context.Context, key, field string, value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	err = r.client.HSet(ctx, key, field, data).Err()
	if err != nil {
		return fmt.Errorf("failed to set hash field %s:%s: %w", key, field, err)
	}

	return nil
}

// HGet gets a field from a hash
func (r *RedisClient) HGet(ctx context.Context, key, field string, dest interface{}) error {
	data, err := r.client.HGet(ctx, key, field).Result()
	if err != nil {
		if err == redis.Nil {
			r.metrics.RecordCacheMiss("redis_hash")
			return ErrCacheMiss
		}
		return fmt.Errorf("failed to get hash field %s:%s: %w", key, field, err)
	}

	if err := json.Unmarshal([]byte(data), dest); err != nil {
		return fmt.Errorf("failed to unmarshal cached value: %w", err)
	}

	r.metrics.RecordCacheHit("redis_hash")
	return nil
}

// HGetAll gets all fields from a hash
func (r *RedisClient) HGetAll(ctx context.Context, key string) (map[string]string, error) {
	data, err := r.client.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get hash %s: %w", key, err)
	}

	if len(data) == 0 {
		r.metrics.RecordCacheMiss("redis_hash")
		return nil, ErrCacheMiss
	}

	r.metrics.RecordCacheHit("redis_hash")
	return data, nil
}

// Pipeline creates a Redis pipeline for batch operations
func (r *RedisClient) Pipeline() redis.Pipeliner {
	return r.client.Pipeline()
}

// TxPipeline creates a Redis transaction pipeline
func (r *RedisClient) TxPipeline() redis.Pipeliner {
	return r.client.TxPipeline()
}

// Cache key builders for different data types
func UserSchedulerStateKey(userID string) string {
	return fmt.Sprintf("scheduler:user:%s", userID)
}

func UserSM2StateKey(userID string) string {
	return fmt.Sprintf("scheduler:sm2:%s", userID)
}

func UserBKTStateKey(userID string) string {
	return fmt.Sprintf("scheduler:bkt:%s", userID)
}

func UserIRTStateKey(userID string) string {
	return fmt.Sprintf("scheduler:irt:%s", userID)
}

func ItemDifficultyKey(itemID string) string {
	return fmt.Sprintf("scheduler:item:difficulty:%s", itemID)
}

func SessionStateKey(sessionID string) string {
	return fmt.Sprintf("scheduler:session:%s", sessionID)
}

// Common cache errors
var (
	ErrCacheMiss = fmt.Errorf("cache miss")
)
