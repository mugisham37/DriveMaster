package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// TokenBucket implements a token bucket rate limiter
type TokenBucket struct {
	capacity   int
	tokens     int
	refillRate int // tokens per second
	lastRefill time.Time
	mutex      sync.Mutex
}

// NewTokenBucket creates a new token bucket
func NewTokenBucket(capacity, refillRate int) *TokenBucket {
	return &TokenBucket{
		capacity:   capacity,
		tokens:     capacity,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

// Allow checks if a request should be allowed
func (tb *TokenBucket) Allow() bool {
	tb.mutex.Lock()
	defer tb.mutex.Unlock()

	now := time.Now()
	elapsed := now.Sub(tb.lastRefill)

	// Refill tokens based on elapsed time
	tokensToAdd := int(elapsed.Seconds()) * tb.refillRate
	if tokensToAdd > 0 {
		tb.tokens = min(tb.capacity, tb.tokens+tokensToAdd)
		tb.lastRefill = now
	}

	// Check if we have tokens available
	if tb.tokens > 0 {
		tb.tokens--
		return true
	}

	return false
}

// RateLimiter manages rate limiting for different clients
type RateLimiter struct {
	buckets         map[string]*TokenBucket
	capacity        int
	refillRate      int
	cleanupInterval time.Duration
	mutex           sync.RWMutex
	stopCleanup     chan struct{}
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(capacity, refillRate int, cleanupInterval time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets:         make(map[string]*TokenBucket),
		capacity:        capacity,
		refillRate:      refillRate,
		cleanupInterval: cleanupInterval,
		stopCleanup:     make(chan struct{}),
	}

	// Start cleanup goroutine
	go rl.cleanup()

	return rl
}

// Allow checks if a request from the given client should be allowed
func (rl *RateLimiter) Allow(clientID string) bool {
	rl.mutex.RLock()
	bucket, exists := rl.buckets[clientID]
	rl.mutex.RUnlock()

	if !exists {
		rl.mutex.Lock()
		// Double-check after acquiring write lock
		if bucket, exists = rl.buckets[clientID]; !exists {
			bucket = NewTokenBucket(rl.capacity, rl.refillRate)
			rl.buckets[clientID] = bucket
		}
		rl.mutex.Unlock()
	}

	return bucket.Allow()
}

// cleanup removes old buckets periodically
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rl.mutex.Lock()
			now := time.Now()
			for clientID, bucket := range rl.buckets {
				bucket.mutex.Lock()
				// Remove buckets that haven't been used for 2x cleanup interval
				if now.Sub(bucket.lastRefill) > 2*rl.cleanupInterval {
					delete(rl.buckets, clientID)
				}
				bucket.mutex.Unlock()
			}
			rl.mutex.Unlock()
		case <-rl.stopCleanup:
			return
		}
	}
}

// Stop stops the cleanup goroutine
func (rl *RateLimiter) Stop() {
	close(rl.stopCleanup)
}

// RateLimitMiddleware creates a Gin middleware for rate limiting
func RateLimitMiddleware(rateLimiter *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Use IP address as client identifier
		clientID := c.ClientIP()

		// For authenticated requests, use user ID if available
		if userID := c.GetHeader("X-User-ID"); userID != "" {
			clientID = userID
		}

		if !rateLimiter.Allow(clientID) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "rate_limit_exceeded",
				"message":     "Too many requests. Please try again later.",
				"retry_after": 60, // seconds
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
