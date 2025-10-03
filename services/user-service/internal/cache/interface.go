package cache

import (
	"context"
	"time"
)

// CacheInterface defines the cache operations
type CacheInterface interface {
	Get(ctx context.Context, key string, dest interface{}) error
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error)
	Increment(ctx context.Context, key string) (int64, error)
	Expire(ctx context.Context, key string, ttl time.Duration) error
	Close() error
}

// Ensure RedisClient implements CacheInterface
var _ CacheInterface = (*RedisClient)(nil)
