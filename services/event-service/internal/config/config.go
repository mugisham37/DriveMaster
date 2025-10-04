package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the event service
type Config struct {
	Server         ServerConfig
	Kafka          KafkaConfig
	Redis          RedisConfig
	EventProcessor EventProcessorConfig
	RateLimit      RateLimitConfig
	CircuitBreaker CircuitBreakerConfig
	Logging        LoggingConfig
}

type ServerConfig struct {
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
	Environment  string
}

type KafkaConfig struct {
	Brokers              []string
	TopicAttempts        string
	TopicSessions        string
	TopicPlacements      string
	TopicActivities      string
	TopicMLTraining      string
	ProducerTimeout      time.Duration
	ProducerRetries      int
	ProducerBatchSize    int
	ProducerBatchTimeout time.Duration
	CompressionType      string
}

type RateLimitConfig struct {
	RequestsPerMinute int
	BurstSize         int
	CleanupInterval   time.Duration
}

type CircuitBreakerConfig struct {
	Threshold   int
	Timeout     time.Duration
	MaxRequests int
	Interval    time.Duration
	ReadyToTrip func(counts Counts) bool
}

type Counts struct {
	Requests             uint32
	TotalSuccesses       uint32
	TotalFailures        uint32
	ConsecutiveSuccesses uint32
	ConsecutiveFailures  uint32
}

type RedisConfig struct {
	Address         string
	Password        string
	PoolSize        int
	MinIdleConns    int
	MaxRetries      int
	DialTimeout     time.Duration
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	EnrichmentDB    int
	AggregationDB   int
	DeduplicationDB int
}

type EventProcessorConfig struct {
	Workers    int
	BufferSize int
	Enabled    bool
}

type LoggingConfig struct {
	Level  string
	Format string
}

// LoadConfig loads configuration from environment variables
func LoadConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port:         getEnv("PORT", "8083"),
			ReadTimeout:  getDurationEnv("SERVER_READ_TIMEOUT", 30*time.Second),
			WriteTimeout: getDurationEnv("SERVER_WRITE_TIMEOUT", 30*time.Second),
			IdleTimeout:  getDurationEnv("SERVER_IDLE_TIMEOUT", 120*time.Second),
			Environment:  getEnv("GO_ENV", "development"),
		},
		Kafka: KafkaConfig{
			Brokers:              getBrokersEnv("KAFKA_BROKERS", []string{"localhost:9092"}),
			TopicAttempts:        getEnv("KAFKA_TOPIC_ATTEMPTS", "user.attempts"),
			TopicSessions:        getEnv("KAFKA_TOPIC_SESSIONS", "user.sessions"),
			TopicPlacements:      getEnv("KAFKA_TOPIC_PLACEMENTS", "user.placements"),
			TopicActivities:      getEnv("KAFKA_TOPIC_ACTIVITIES", "user.activities"),
			TopicMLTraining:      getEnv("KAFKA_TOPIC_ML_TRAINING", "ml.training_events"),
			ProducerTimeout:      getDurationEnv("KAFKA_PRODUCER_TIMEOUT", 10*time.Second),
			ProducerRetries:      getIntEnv("KAFKA_PRODUCER_RETRIES", 3),
			ProducerBatchSize:    getIntEnv("KAFKA_PRODUCER_BATCH_SIZE", 100),
			ProducerBatchTimeout: getDurationEnv("KAFKA_PRODUCER_BATCH_TIMEOUT", 10*time.Millisecond),
			CompressionType:      getEnv("KAFKA_COMPRESSION_TYPE", "snappy"),
		},
		RateLimit: RateLimitConfig{
			RequestsPerMinute: getIntEnv("RATE_LIMIT_REQUESTS_PER_MINUTE", 1000),
			BurstSize:         getIntEnv("RATE_LIMIT_BURST", 100),
			CleanupInterval:   getDurationEnv("RATE_LIMIT_CLEANUP_INTERVAL", 1*time.Minute),
		},
		CircuitBreaker: CircuitBreakerConfig{
			Threshold:   getIntEnv("CIRCUIT_BREAKER_THRESHOLD", 10),
			Timeout:     getDurationEnv("CIRCUIT_BREAKER_TIMEOUT", 30*time.Second),
			MaxRequests: getIntEnv("CIRCUIT_BREAKER_MAX_REQUESTS", 5),
			Interval:    getDurationEnv("CIRCUIT_BREAKER_INTERVAL", 60*time.Second),
		},
		Redis: RedisConfig{
			Address:         getEnv("REDIS_ADDRESS", "localhost:6379"),
			Password:        getEnv("REDIS_PASSWORD", ""),
			PoolSize:        getIntEnv("REDIS_POOL_SIZE", 10),
			MinIdleConns:    getIntEnv("REDIS_MIN_IDLE_CONNS", 2),
			MaxRetries:      getIntEnv("REDIS_MAX_RETRIES", 3),
			DialTimeout:     getDurationEnv("REDIS_DIAL_TIMEOUT", 5*time.Second),
			ReadTimeout:     getDurationEnv("REDIS_READ_TIMEOUT", 3*time.Second),
			WriteTimeout:    getDurationEnv("REDIS_WRITE_TIMEOUT", 3*time.Second),
			EnrichmentDB:    getIntEnv("REDIS_ENRICHMENT_DB", 1),
			AggregationDB:   getIntEnv("REDIS_AGGREGATION_DB", 2),
			DeduplicationDB: getIntEnv("REDIS_DEDUPLICATION_DB", 3),
		},
		EventProcessor: EventProcessorConfig{
			Workers:    getIntEnv("EVENT_PROCESSOR_WORKERS", 4),
			BufferSize: getIntEnv("EVENT_PROCESSOR_BUFFER_SIZE", 1000),
			Enabled:    getBoolEnv("EVENT_PROCESSOR_ENABLED", true),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
	}
}

// Helper functions for environment variable parsing
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getBrokersEnv(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Simple comma-separated parsing
		brokers := []string{}
		for _, broker := range []string{value} {
			if broker != "" {
				brokers = append(brokers, broker)
			}
		}
		if len(brokers) > 0 {
			return brokers
		}
	}
	return defaultValue
}
