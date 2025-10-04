package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"user-service/internal/logger"
	"user-service/internal/metrics"

	"github.com/go-redis/redis/v8"
)

type RedisClient struct {
	client *redis.Client
}

func NewRedisClient(redisURL string, db int) (*RedisClient, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	opt.DB = db
	opt.PoolSize = 20
	opt.MinIdleConns = 5
	opt.MaxRetries = 3

	client := redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	logger.GetLogger().Info("Redis connection established successfully")
	return &RedisClient{client: client}, nil
}

func (r *RedisClient) Close() error {
	if r.client != nil {
		err := r.client.Close()
		logger.GetLogger().Info("Redis connection closed")
		return err
	}
	return nil
}

// Get retrieves a value from cache
func (r *RedisClient) Get(ctx context.Context, key string, dest interface{}) error {
	val, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			metrics.RecordCacheMiss("redis")
			return ErrCacheMiss
		}
		return fmt.Errorf("failed to get from cache: %w", err)
	}

	metrics.RecordCacheHit("redis")
	return json.Unmarshal([]byte(val), dest)
}

// Set stores a value in cache with TTL
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	return r.client.Set(ctx, key, data, ttl).Err()
}

// Delete removes a key from cache
func (r *RedisClient) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

// SetNX sets a key only if it doesn't exist (for locking)
func (r *RedisClient) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return false, fmt.Errorf("failed to marshal value: %w", err)
	}

	return r.client.SetNX(ctx, key, data, ttl).Result()
}

// Increment atomically increments a counter
func (r *RedisClient) Increment(ctx context.Context, key string) (int64, error) {
	return r.client.Incr(ctx, key).Result()
}

// Expire sets TTL on an existing key
func (r *RedisClient) Expire(ctx context.Context, key string, ttl time.Duration) error {
	return r.client.Expire(ctx, key, ttl).Err()
}

// Pipeline creates a new pipeline for batch operations
func (r *RedisClient) Pipeline() redis.Pipeliner {
	return r.client.Pipeline()
}

// Cache key generators
func UserKey(userID string) string {
	return fmt.Sprintf("user:%s", userID)
}

func UserPreferencesKey(userID string) string {
	return fmt.Sprintf("user:preferences:%s", userID)
}

func MasteryKey(userID string) string {
	return fmt.Sprintf("mastery:%s", userID)
}

func SchedulerKey(userID string) string {
	return fmt.Sprintf("scheduler:%s", userID)
}

func SchedulerHotKey(userID string) string {
	return fmt.Sprintf("scheduler:hot:%s", userID)
}

func SchedulerStateKey(userID string) string {
	return fmt.Sprintf("scheduler:state:%s", userID)
}

func SessionKey(sessionID string) string {
	return fmt.Sprintf("session:%s", sessionID)
}

func UserSessionKey(userID string) string {
	return fmt.Sprintf("session:user:%s", userID)
}

// Custom errors
var (
	ErrCacheMiss = fmt.Errorf("cache miss")
)
