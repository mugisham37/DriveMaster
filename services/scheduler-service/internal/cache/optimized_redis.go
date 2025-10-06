package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"scheduler-service/internal/config"
	"scheduler-service/internal/logger"
	"scheduler-service/internal/metrics"

	"github.com/go-redis/redis/v8"
)

// OptimizedRedisClient provides an optimized Redis client with performance monitoring
type OptimizedRedisClient struct {
	client  redis.UniversalClient
	config  *config.CachePerformanceConfig
	logger  logger.Logger
	metrics metrics.Metrics
	
	// Performance statistics
	stats    *CacheStats
	statsMux sync.RWMutex
	
	// Pipeline for batch operations
	pipelineChan chan *PipelineOperation
	pipelineWG   sync.WaitGroup
}

// CacheStats tracks cache performance metrics
type CacheStats struct {
	Hits              int64
	Misses            int64
	Sets              int64
	Deletes           int64
	Errors            int64
	TotalOperations   int64
	AverageLatency    time.Duration
	PipelineOps       int64
	ConnectionErrors  int64
}

// PipelineOperation represents a batched Redis operation
type PipelineOperation struct {
	Operation string
	Key       string
	Value     interface{}
	TTL       time.Duration
	Result    chan error
}

// NewOptimizedRedisClient creates a new optimized Redis client
func NewOptimizedRedisClient(redisURL string, perfConfig *config.CachePerformanceConfig, logger logger.Logger, metrics metrics.Metrics) (*OptimizedRedisClient, error) {
	// Parse Redis URL and create options
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}
	
	// Configure connection pool for optimal performance
	opt.PoolSize = perfConfig.PoolSize
	opt.MinIdleConns = perfConfig.MinIdleConns
	opt.MaxConnAge = perfConfig.MaxConnAge
	opt.PoolTimeout = perfConfig.PoolTimeout
	opt.IdleTimeout = perfConfig.IdleTimeout
	opt.IdleCheckFrequency = perfConfig.IdleCheckFrequency
	opt.MaxRetries = perfConfig.MaxRetries
	opt.RetryDelayFunc = func(retry int, err error) time.Duration {
		return perfConfig.RetryDelay * time.Duration(retry+1)
	}
	
	// Create Redis client
	client := redis.NewClient(opt)
	
	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}
	
	redisClient := &OptimizedRedisClient{
		client:       client,
		config:       perfConfig,
		logger:       logger,
		metrics:      metrics,
		stats:        &CacheStats{},
		pipelineChan: make(chan *PipelineOperation, perfConfig.PipelineSize),
	}
	
	// Start pipeline processor
	go redisClient.processPipeline()
	
	// Start monitoring
	go redisClient.monitorCache()
	
	logger.Info("Optimized Redis client initialized successfully")
	return redisClient, nil
}

// Get retrieves a value from cache with performance monitoring
func (r *OptimizedRedisClient) Get(ctx context.Context, key string) (string, error) {
	start := time.Now()
	
	result, err := r.client.Get(ctx, key).Result()
	
	duration := time.Since(start)
	r.recordOperation(duration)
	
	if err == redis.Nil {
		r.recordMiss()
		return "", ErrCacheMiss
	} else if err != nil {
		r.recordError()
		r.logger.Errorf("Redis GET failed for key %s: %v", key, err)
		return "", err
	}
	
	r.recordHit()
	r.metrics.RecordCacheLatency("get", duration.Seconds())
	return result, nil
}

// GetJSON retrieves and unmarshals a JSON value from cache
func (r *OptimizedRedisClient) GetJSON(ctx context.Context, key string, dest interface{}) error {
	value, err := r.Get(ctx, key)
	if err != nil {
		return err
	}
	
	if err := json.Unmarshal([]byte(value), dest); err != nil {
		r.recordError()
		return fmt.Errorf("failed to unmarshal JSON for key %s: %w", key, err)
	}
	
	return nil
}

// Set stores a value in cache with performance monitoring
func (r *OptimizedRedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	start := time.Now()
	
	if ttl == 0 {
		ttl = r.config.DefaultTTL
	}
	
	err := r.client.Set(ctx, key, value, ttl).Err()
	
	duration := time.Since(start)
	r.recordOperation(duration)
	
	if err != nil {
		r.recordError()
		r.logger.Errorf("Redis SET failed for key %s: %v", key, err)
		return err
	}
	
	r.recordSet()
	r.metrics.RecordCacheLatency("set", duration.Seconds())
	return nil
}

// SetJSON marshals and stores a JSON value in cache
func (r *OptimizedRedisClient) SetJSON(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	jsonData, err := json.Marshal(value)
	if err != nil {
		r.recordError()
		return fmt.Errorf("failed to marshal JSON for key %s: %w", key, err)
	}
	
	return r.Set(ctx, key, jsonData, ttl)
}

// Delete removes a value from cache
func (r *OptimizedRedisClient) Delete(ctx context.Context, key string) error {
	start := time.Now()
	
	err := r.client.Del(ctx, key).Err()
	
	duration := time.Since(start)
	r.recordOperation(duration)
	
	if err != nil {
		r.recordError()
		r.logger.Errorf("Redis DEL failed for key %s: %v", key, err)
		return err
	}
	
	r.recordDelete()
	r.metrics.RecordCacheLatency("delete", duration.Seconds())
	return nil
}

// MGet retrieves multiple values in a single operation
func (r *OptimizedRedisClient) MGet(ctx context.Context, keys ...string) ([]interface{}, error) {
	start := time.Now()
	
	result, err := r.client.MGet(ctx, keys...).Result()
	
	duration := time.Since(start)
	r.recordOperation(duration)
	
	if err != nil {
		r.recordError()
		r.logger.Errorf("Redis MGET failed: %v", err)
		return nil, err
	}
	
	// Count hits and misses
	for _, val := range result {
		if val == nil {
			r.recordMiss()
		} else {
			r.recordHit()
		}
	}
	
	r.metrics.RecordCacheLatency("mget", duration.Seconds())
	return result, nil
}

// MSet stores multiple values in a single operation
func (r *OptimizedRedisClient) MSet(ctx context.Context, pairs map[string]interface{}, ttl time.Duration) error {
	start := time.Now()
	
	pipe := r.client.Pipeline()
	
	for key, value := range pairs {
		if ttl == 0 {
			ttl = r.config.DefaultTTL
		}
		pipe.Set(ctx, key, value, ttl)
	}
	
	_, err := pipe.Exec(ctx)
	
	duration := time.Since(start)
	r.recordOperation(duration)
	
	if err != nil {
		r.recordError()
		r.logger.Errorf("Redis MSET failed: %v", err)
		return err
	}
	
	r.statsMux.Lock()
	r.stats.Sets += int64(len(pairs))
	r.statsMux.Unlock()
	
	r.metrics.RecordCacheLatency("mset", duration.Seconds())
	return nil
}

// SetAsync stores a value asynchronously using pipeline
func (r *OptimizedRedisClient) SetAsync(key string, value interface{}, ttl time.Duration) <-chan error {
	result := make(chan error, 1)
	
	op := &PipelineOperation{
		Operation: "SET",
		Key:       key,
		Value:     value,
		TTL:       ttl,
		Result:    result,
	}
	
	select {
	case r.pipelineChan <- op:
		return result
	default:
		// Pipeline is full, execute synchronously
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			result <- r.Set(ctx, key, value, ttl)
		}()
		return result
	}
}

// processPipeline processes batched operations for better performance
func (r *OptimizedRedisClient) processPipeline() {
	ticker := time.NewTicker(r.config.PipelineTimeout)
	defer ticker.Stop()
	
	var operations []*PipelineOperation
	
	for {
		select {
		case op := <-r.pipelineChan:
			operations = append(operations, op)
			
			// Execute when batch is full
			if len(operations) >= r.config.PipelineSize {
				r.executePipeline(operations)
				operations = operations[:0]
			}
			
		case <-ticker.C:
			// Execute pending operations on timeout
			if len(operations) > 0 {
				r.executePipeline(operations)
				operations = operations[:0]
			}
		}
	}
}

// executePipeline executes a batch of operations
func (r *OptimizedRedisClient) executePipeline(operations []*PipelineOperation) {
	if len(operations) == 0 {
		return
	}
	
	start := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), r.config.PipelineTimeout)
	defer cancel()
	
	pipe := r.client.Pipeline()
	
	for _, op := range operations {
		switch op.Operation {
		case "SET":
			ttl := op.TTL
			if ttl == 0 {
				ttl = r.config.DefaultTTL
			}
			pipe.Set(ctx, op.Key, op.Value, ttl)
		}
	}
	
	_, err := pipe.Exec(ctx)
	duration := time.Since(start)
	
	// Send results back to callers
	for _, op := range operations {
		op.Result <- err
		close(op.Result)
	}
	
	r.statsMux.Lock()
	r.stats.PipelineOps += int64(len(operations))
	r.statsMux.Unlock()
	
	if err != nil {
		r.recordError()
		r.logger.Errorf("Pipeline execution failed: %v", err)
	} else {
		r.logger.Debugf("Pipeline executed %d operations in %v", len(operations), duration)
	}
	
	r.metrics.RecordCacheLatency("pipeline", duration.Seconds())
}

// recordOperation records operation statistics
func (r *OptimizedRedisClient) recordOperation(duration time.Duration) {
	r.statsMux.Lock()
	defer r.statsMux.Unlock()
	
	r.stats.TotalOperations++
	r.stats.AverageLatency = time.Duration(
		(int64(r.stats.AverageLatency)*r.stats.TotalOperations + int64(duration)) /
		(r.stats.TotalOperations + 1),
	)
}

// recordHit records cache hit statistics
func (r *OptimizedRedisClient) recordHit() {
	r.statsMux.Lock()
	defer r.statsMux.Unlock()
	
	r.stats.Hits++
	r.metrics.IncrementCacheHits()
}

// recordMiss records cache miss statistics
func (r *OptimizedRedisClient) recordMiss() {
	r.statsMux.Lock()
	defer r.statsMux.Unlock()
	
	r.stats.Misses++
	r.metrics.IncrementCacheMisses()
}

// recordSet records cache set statistics
func (r *OptimizedRedisClient) recordSet() {
	r.statsMux.Lock()
	defer r.statsMux.Unlock()
	
	r.stats.Sets++
}

// recordDelete records cache delete statistics
func (r *OptimizedRedisClient) recordDelete() {
	r.statsMux.Lock()
	defer r.statsMux.Unlock()
	
	r.stats.Deletes++
}

// recordError records error statistics
func (r *OptimizedRedisClient) recordError() {
	r.statsMux.Lock()
	defer r.statsMux.Unlock()
	
	r.stats.Errors++
	r.metrics.IncrementCacheErrors()
}

// monitorCache monitors cache performance
func (r *OptimizedRedisClient) monitorCache() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for range ticker.C {
		r.statsMux.RLock()
		stats := *r.stats
		r.statsMux.RUnlock()
		
		// Calculate hit ratio
		totalRequests := stats.Hits + stats.Misses
		var hitRatio float64
		if totalRequests > 0 {
			hitRatio = float64(stats.Hits) / float64(totalRequests)
		}
		
		// Update metrics
		r.metrics.SetGauge("cache_hit_ratio", hitRatio)
		r.metrics.SetGauge("cache_total_operations", float64(stats.TotalOperations))
		r.metrics.SetGauge("cache_average_latency_seconds", stats.AverageLatency.Seconds())
		r.metrics.SetGauge("cache_pipeline_operations", float64(stats.PipelineOps))
		
		// Log statistics
		r.logger.Debugf("Cache Stats - Hits: %d, Misses: %d, Hit Ratio: %.2f%%, Avg Latency: %v",
			stats.Hits, stats.Misses, hitRatio*100, stats.AverageLatency)
	}
}

// GetStats returns current cache statistics
func (r *OptimizedRedisClient) GetStats() *CacheStats {
	r.statsMux.RLock()
	defer r.statsMux.RUnlock()
	
	statsCopy := *r.stats
	return &statsCopy
}

// HealthCheck performs a health check on the Redis connection
func (r *OptimizedRedisClient) HealthCheck(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	
	if err := r.client.Ping(ctx).Err(); err != nil {
		r.recordError()
		return fmt.Errorf("Redis health check failed: %w", err)
	}
	
	return nil
}

// Close closes the Redis client and cleans up resources
func (r *OptimizedRedisClient) Close() error {
	close(r.pipelineChan)
	r.pipelineWG.Wait()
	
	if err := r.client.Close(); err != nil {
		r.logger.Errorf("Error closing Redis client: %v", err)
		return err
	}
	
	r.logger.Info("Optimized Redis client closed successfully")
	return nil
}

// ErrCacheMiss is returned when a key is not found in cache
var ErrCacheMiss = fmt.Errorf("cache miss")