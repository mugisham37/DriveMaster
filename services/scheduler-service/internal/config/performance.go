package config

import (
	"time"
)

// PerformanceConfig holds performance-related configuration
type PerformanceConfig struct {
	// Database connection pooling
	Database DatabasePerformanceConfig
	
	// Redis caching configuration
	Cache CachePerformanceConfig
	
	// HTTP client configuration
	HTTP HTTPPerformanceConfig
	
	// Algorithm performance settings
	Algorithm AlgorithmPerformanceConfig
	
	// Concurrency settings
	Concurrency ConcurrencyConfig
}

type DatabasePerformanceConfig struct {
	// Connection pool settings
	MaxOpenConns        int           `json:"max_open_conns"`
	MaxIdleConns        int           `json:"max_idle_conns"`
	ConnMaxLifetime     time.Duration `json:"conn_max_lifetime"`
	ConnMaxIdleTime     time.Duration `json:"conn_max_idle_time"`
	
	// Query performance settings
	QueryTimeout        time.Duration `json:"query_timeout"`
	PreparedStatements  bool          `json:"prepared_statements"`
	
	// Batch processing settings
	BatchSize           int           `json:"batch_size"`
	BatchTimeout        time.Duration `json:"batch_timeout"`
}

type CachePerformanceConfig struct {
	// Connection pool settings
	PoolSize            int           `json:"pool_size"`
	MinIdleConns        int           `json:"min_idle_conns"`
	MaxConnAge          time.Duration `json:"max_conn_age"`
	PoolTimeout         time.Duration `json:"pool_timeout"`
	IdleTimeout         time.Duration `json:"idle_timeout"`
	IdleCheckFrequency  time.Duration `json:"idle_check_frequency"`
	
	// Cache behavior settings
	DefaultTTL          time.Duration `json:"default_ttl"`
	MaxRetries          int           `json:"max_retries"`
	RetryDelay          time.Duration `json:"retry_delay"`
	
	// Pipeline settings
	PipelineSize        int           `json:"pipeline_size"`
	PipelineTimeout     time.Duration `json:"pipeline_timeout"`
}

type HTTPPerformanceConfig struct {
	// Client timeout settings
	Timeout             time.Duration `json:"timeout"`
	DialTimeout         time.Duration `json:"dial_timeout"`
	KeepAlive           time.Duration `json:"keep_alive"`
	TLSHandshakeTimeout time.Duration `json:"tls_handshake_timeout"`
	
	// Connection pooling
	MaxIdleConns        int           `json:"max_idle_conns"`
	MaxIdleConnsPerHost int           `json:"max_idle_conns_per_host"`
	MaxConnsPerHost     int           `json:"max_conns_per_host"`
	
	// Request settings
	MaxRetries          int           `json:"max_retries"`
	RetryDelay          time.Duration `json:"retry_delay"`
}

type AlgorithmPerformanceConfig struct {
	// Scoring algorithm settings
	MaxCandidateItems   int           `json:"max_candidate_items"`
	ScoringTimeout      time.Duration `json:"scoring_timeout"`
	CacheScores         bool          `json:"cache_scores"`
	ScoreCacheTTL       time.Duration `json:"score_cache_ttl"`
	
	// Batch processing
	BatchProcessing     bool          `json:"batch_processing"`
	BatchSize           int           `json:"batch_size"`
	BatchTimeout        time.Duration `json:"batch_timeout"`
	
	// Parallel processing
	MaxGoroutines       int           `json:"max_goroutines"`
	WorkerPoolSize      int           `json:"worker_pool_size"`
}

type ConcurrencyConfig struct {
	// Worker pool settings
	WorkerPoolSize      int           `json:"worker_pool_size"`
	QueueSize           int           `json:"queue_size"`
	WorkerTimeout       time.Duration `json:"worker_timeout"`
	
	// Rate limiting
	RateLimit           int           `json:"rate_limit"`
	RateLimitWindow     time.Duration `json:"rate_limit_window"`
	
	// Circuit breaker settings
	CircuitBreakerEnabled    bool          `json:"circuit_breaker_enabled"`
	FailureThreshold         int           `json:"failure_threshold"`
	RecoveryTimeout          time.Duration `json:"recovery_timeout"`
	HalfOpenMaxRequests      int           `json:"half_open_max_requests"`
}

// LoadPerformanceConfig loads performance configuration with optimized defaults
func LoadPerformanceConfig() *PerformanceConfig {
	return &PerformanceConfig{
		Database: DatabasePerformanceConfig{
			MaxOpenConns:       getEnvInt("DB_MAX_OPEN_CONNS", 50),
			MaxIdleConns:       getEnvInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime:    time.Duration(getEnvInt("DB_CONN_MAX_LIFETIME", 3600)) * time.Second,
			ConnMaxIdleTime:    time.Duration(getEnvInt("DB_CONN_MAX_IDLE_TIME", 600)) * time.Second,
			QueryTimeout:       time.Duration(getEnvInt("DB_QUERY_TIMEOUT", 30)) * time.Second,
			PreparedStatements: getEnvBool("DB_PREPARED_STATEMENTS", true),
			BatchSize:          getEnvInt("DB_BATCH_SIZE", 100),
			BatchTimeout:       time.Duration(getEnvInt("DB_BATCH_TIMEOUT", 5)) * time.Second,
		},
		Cache: CachePerformanceConfig{
			PoolSize:           getEnvInt("REDIS_POOL_SIZE", 20),
			MinIdleConns:       getEnvInt("REDIS_MIN_IDLE_CONNS", 5),
			MaxConnAge:         time.Duration(getEnvInt("REDIS_MAX_CONN_AGE", 3600)) * time.Second,
			PoolTimeout:        time.Duration(getEnvInt("REDIS_POOL_TIMEOUT", 5)) * time.Second,
			IdleTimeout:        time.Duration(getEnvInt("REDIS_IDLE_TIMEOUT", 300)) * time.Second,
			IdleCheckFrequency: time.Duration(getEnvInt("REDIS_IDLE_CHECK_FREQ", 60)) * time.Second,
			DefaultTTL:         time.Duration(getEnvInt("REDIS_DEFAULT_TTL", 3600)) * time.Second,
			MaxRetries:         getEnvInt("REDIS_MAX_RETRIES", 3),
			RetryDelay:         time.Duration(getEnvInt("REDIS_RETRY_DELAY", 100)) * time.Millisecond,
			PipelineSize:       getEnvInt("REDIS_PIPELINE_SIZE", 100),
			PipelineTimeout:    time.Duration(getEnvInt("REDIS_PIPELINE_TIMEOUT", 1)) * time.Second,
		},
		HTTP: HTTPPerformanceConfig{
			Timeout:             time.Duration(getEnvInt("HTTP_TIMEOUT", 30)) * time.Second,
			DialTimeout:         time.Duration(getEnvInt("HTTP_DIAL_TIMEOUT", 10)) * time.Second,
			KeepAlive:           time.Duration(getEnvInt("HTTP_KEEP_ALIVE", 30)) * time.Second,
			TLSHandshakeTimeout: time.Duration(getEnvInt("HTTP_TLS_TIMEOUT", 10)) * time.Second,
			MaxIdleConns:        getEnvInt("HTTP_MAX_IDLE_CONNS", 100),
			MaxIdleConnsPerHost: getEnvInt("HTTP_MAX_IDLE_CONNS_PER_HOST", 10),
			MaxConnsPerHost:     getEnvInt("HTTP_MAX_CONNS_PER_HOST", 50),
			MaxRetries:          getEnvInt("HTTP_MAX_RETRIES", 3),
			RetryDelay:          time.Duration(getEnvInt("HTTP_RETRY_DELAY", 1000)) * time.Millisecond,
		},
		Algorithm: AlgorithmPerformanceConfig{
			MaxCandidateItems: getEnvInt("ALGO_MAX_CANDIDATE_ITEMS", 1000),
			ScoringTimeout:    time.Duration(getEnvInt("ALGO_SCORING_TIMEOUT", 300)) * time.Millisecond,
			CacheScores:       getEnvBool("ALGO_CACHE_SCORES", true),
			ScoreCacheTTL:     time.Duration(getEnvInt("ALGO_SCORE_CACHE_TTL", 900)) * time.Second,
			BatchProcessing:   getEnvBool("ALGO_BATCH_PROCESSING", true),
			BatchSize:         getEnvInt("ALGO_BATCH_SIZE", 50),
			BatchTimeout:      time.Duration(getEnvInt("ALGO_BATCH_TIMEOUT", 100)) * time.Millisecond,
			MaxGoroutines:     getEnvInt("ALGO_MAX_GOROUTINES", 10),
			WorkerPoolSize:    getEnvInt("ALGO_WORKER_POOL_SIZE", 5),
		},
		Concurrency: ConcurrencyConfig{
			WorkerPoolSize:          getEnvInt("WORKER_POOL_SIZE", 10),
			QueueSize:               getEnvInt("QUEUE_SIZE", 1000),
			WorkerTimeout:           time.Duration(getEnvInt("WORKER_TIMEOUT", 30)) * time.Second,
			RateLimit:               getEnvInt("RATE_LIMIT", 1000),
			RateLimitWindow:         time.Duration(getEnvInt("RATE_LIMIT_WINDOW", 60)) * time.Second,
			CircuitBreakerEnabled:   getEnvBool("CIRCUIT_BREAKER_ENABLED", true),
			FailureThreshold:        getEnvInt("CIRCUIT_BREAKER_FAILURE_THRESHOLD", 5),
			RecoveryTimeout:         time.Duration(getEnvInt("CIRCUIT_BREAKER_RECOVERY_TIMEOUT", 30)) * time.Second,
			HalfOpenMaxRequests:     getEnvInt("CIRCUIT_BREAKER_HALF_OPEN_MAX_REQUESTS", 3),
		},
	}
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := getEnv(key, ""); value != "" {
		return value == "true" || value == "1"
	}
	return defaultValue
}