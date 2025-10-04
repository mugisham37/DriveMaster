package server

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"event-service/internal/config"
	"event-service/internal/handlers"
	"event-service/internal/middleware"
	"event-service/internal/publisher"

	"github.com/gin-gonic/gin"
)

// Server represents the HTTP server
type Server struct {
	config              *config.Config
	httpServer          *http.Server
	handler             *handlers.EventHandler
	publisher           *publisher.KafkaPublisher
	router              *publisher.EventRouter
	metricsHandler      *publisher.MetricsHandler
	rateLimiter         *middleware.RateLimiter
	circuitBreaker      *middleware.CircuitBreaker
	backpressureManager *BackpressureManager
}

// NewServer creates a new server instance
func NewServer(cfg *config.Config) *Server {
	// Create Kafka publisher with enhanced features
	kafkaPublisher := publisher.NewKafkaPublisher(cfg)

	// Create event router with intelligent routing
	eventRouter := publisher.NewEventRouter(cfg, kafkaPublisher)

	// Create metrics handler for publisher monitoring
	metricsHandler := publisher.NewMetricsHandler(kafkaPublisher)

	// Create event handler with router
	eventHandler := handlers.NewEventHandler(cfg, kafkaPublisher)

	// Create rate limiter
	rateLimiter := middleware.NewRateLimiter(
		cfg.RateLimit.RequestsPerMinute/60, // requests per second
		cfg.RateLimit.BurstSize,
		cfg.RateLimit.CleanupInterval,
	)

	// Create circuit breaker
	circuitBreaker := middleware.NewCircuitBreaker(middleware.CircuitBreakerConfig{
		Name:        "event-ingestion",
		MaxRequests: uint32(cfg.CircuitBreaker.MaxRequests),
		Interval:    cfg.CircuitBreaker.Interval,
		Timeout:     cfg.CircuitBreaker.Timeout,
		ReadyToTrip: func(counts middleware.Counts) bool {
			return counts.ConsecutiveFailures > uint32(cfg.CircuitBreaker.Threshold)
		},
		OnStateChange: func(name string, from middleware.State, to middleware.State) {
			log.Printf("Circuit breaker '%s' changed state from %s to %s", name, from, to)
		},
	})

	// Create backpressure manager
	backpressureManager := NewBackpressureManager(1000) // Max 1000 queued requests

	return &Server{
		config:              cfg,
		handler:             eventHandler,
		publisher:           kafkaPublisher,
		router:              eventRouter,
		metricsHandler:      metricsHandler,
		rateLimiter:         rateLimiter,
		circuitBreaker:      circuitBreaker,
		backpressureManager: backpressureManager,
	}
}

// Start starts the HTTP server
func (s *Server) Start() error {
	// Set Gin mode based on environment
	if s.config.Server.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create Gin router
	router := gin.New()

	// Add middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(s.corsMiddleware())
	router.Use(s.requestIDMiddleware())
	router.Use(middleware.RateLimitMiddleware(s.rateLimiter))
	router.Use(s.circuitBreakerMiddleware())

	// Health and metrics endpoints (no rate limiting)
	router.GET("/health", s.handler.GetHealth)
	router.GET("/metrics", s.handler.GetMetrics)

	// Publisher-specific metrics endpoints
	router.GET("/metrics/publisher", s.metricsHandler.GetMetrics)
	router.GET("/metrics/publisher/health", s.metricsHandler.GetHealthStatus)
	router.GET("/metrics/prometheus", s.metricsHandler.GetPrometheusMetrics)

	// Event processor endpoints
	router.GET("/metrics/processor", s.handler.GetProcessorMetrics)
	router.GET("/processor/status", s.handler.GetProcessorStatus)
	router.GET("/processor/enrichment", s.handler.GetEnrichmentStats)
	router.GET("/processor/filters", s.handler.GetFilterStats)
	router.GET("/processor/aggregation", s.handler.GetAggregationData)

	// Event ingestion endpoints with backpressure protection
	v1 := router.Group("/api/v1")
	v1.Use(s.backpressureMiddleware())
	{
		v1.POST("/events/attempt", s.handler.HandleAttemptEvent)
		v1.POST("/events/session", s.handler.HandleSessionEvent)
		v1.POST("/events/placement", s.handler.HandlePlacementEvent)
		v1.POST("/events/batch", s.handler.HandleBatchEvents)
	}

	// Create HTTP server
	s.httpServer = &http.Server{
		Addr:         ":" + s.config.Server.Port,
		Handler:      router,
		ReadTimeout:  s.config.Server.ReadTimeout,
		WriteTimeout: s.config.Server.WriteTimeout,
		IdleTimeout:  s.config.Server.IdleTimeout,
	}

	log.Printf("Starting event service on port %s", s.config.Server.Port)
	return s.httpServer.ListenAndServe()
}

// Stop gracefully stops the server
func (s *Server) Stop(ctx context.Context) error {
	log.Println("Shutting down event service...")

	// Stop rate limiter cleanup
	if s.rateLimiter != nil {
		s.rateLimiter.Stop()
	}

	// Close Kafka publisher (this will flush any pending messages)
	if s.publisher != nil {
		log.Println("Closing Kafka publisher...")
		if err := s.publisher.Close(); err != nil {
			log.Printf("Error closing Kafka publisher: %v", err)
		} else {
			log.Println("Kafka publisher closed successfully")
		}
	}

	// Shutdown HTTP server
	log.Println("Shutting down HTTP server...")
	return s.httpServer.Shutdown(ctx)
}

// Middleware implementations

// corsMiddleware adds CORS headers
func (s *Server) corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-User-ID, X-Request-ID")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// requestIDMiddleware adds a unique request ID to each request
func (s *Server) requestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}

// circuitBreakerMiddleware wraps requests in circuit breaker
func (s *Server) circuitBreakerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip circuit breaker for health and metrics endpoints
		if c.Request.URL.Path == "/health" || c.Request.URL.Path == "/metrics" {
			c.Next()
			return
		}

		err := s.circuitBreaker.Call(func() error {
			c.Next()

			// Check if the request was successful
			if c.Writer.Status() >= 500 {
				return fmt.Errorf("server error: %d", c.Writer.Status())
			}
			return nil
		})

		if err != nil {
			// Circuit breaker is open or half-open with too many requests
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error":       "service_unavailable",
				"message":     "Service is temporarily unavailable due to high error rate",
				"retry_after": 30,
			})
			c.Abort()
		}
	}
}

// backpressureMiddleware implements backpressure protection
func (s *Server) backpressureMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if we should reject due to backpressure
		if s.backpressureManager.ShouldReject() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "backpressure_limit_exceeded",
				"message":     "Service is under high load, please retry later",
				"retry_after": 5,
			})
			c.Abort()
			return
		}

		// Increment queue size
		s.backpressureManager.IncrementQueue()
		defer s.backpressureManager.DecrementQueue()

		c.Next()
	}
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), time.Now().Nanosecond())
}

// BackpressureManager handles backpressure scenarios
type BackpressureManager struct {
	maxQueueSize     int
	currentQueueSize int
	rejectionRate    float64
}

// NewBackpressureManager creates a new backpressure manager
func NewBackpressureManager(maxQueueSize int) *BackpressureManager {
	return &BackpressureManager{
		maxQueueSize: maxQueueSize,
	}
}

// ShouldReject determines if a request should be rejected due to backpressure
func (bm *BackpressureManager) ShouldReject() bool {
	if bm.currentQueueSize >= bm.maxQueueSize {
		return true
	}

	// Implement probabilistic rejection as queue fills up
	loadFactor := float64(bm.currentQueueSize) / float64(bm.maxQueueSize)
	if loadFactor > 0.8 {
		// Start rejecting requests probabilistically when 80% full
		bm.rejectionRate = (loadFactor - 0.8) / 0.2 // 0 to 1 as load goes from 80% to 100%
		return time.Now().UnixNano()%100 < int64(bm.rejectionRate*100)
	}

	return false
}

// IncrementQueue increments the current queue size
func (bm *BackpressureManager) IncrementQueue() {
	bm.currentQueueSize++
}

// DecrementQueue decrements the current queue size
func (bm *BackpressureManager) DecrementQueue() {
	if bm.currentQueueSize > 0 {
		bm.currentQueueSize--
	}
}
