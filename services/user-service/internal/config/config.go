package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Server configuration
	GRPCPort string
	HTTPPort string

	// Database configuration
	DatabaseURL string

	// Redis configuration
	RedisURL string
	RedisDB  int

	// Kafka configuration
	KafkaBrokers         []string
	KafkaTopicAttempts   string
	KafkaTopicSessions   string
	KafkaTopicActivities string

	// Environment
	Environment string
	LogLevel    string
	LogFormat   string

	// Cache configuration
	CacheTTL struct {
		User      time.Duration
		Mastery   time.Duration
		Scheduler time.Duration
	}
}

func Load() *Config {
	cfg := &Config{
		GRPCPort:    getEnv("GRPC_PORT", "50051"),
		HTTPPort:    getEnv("HTTP_PORT", "8081"),
		DatabaseURL: getEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/adaptive_learning"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		RedisDB:     getEnvAsInt("REDIS_DB", 0),
		KafkaBrokers: []string{
			getEnv("KAFKA_BROKERS", "localhost:9092"),
		},
		KafkaTopicAttempts:   getEnv("KAFKA_TOPIC_ATTEMPTS", "user.attempts"),
		KafkaTopicSessions:   getEnv("KAFKA_TOPIC_SESSIONS", "user.sessions"),
		KafkaTopicActivities: getEnv("KAFKA_TOPIC_ACTIVITIES", "user.activities"),
		Environment:          getEnv("GO_ENV", "development"),
		LogLevel:             getEnv("LOG_LEVEL", "info"),
		LogFormat:            getEnv("LOG_FORMAT", "json"),
	}

	// Set cache TTL values
	cfg.CacheTTL.User = time.Hour
	cfg.CacheTTL.Mastery = 30 * time.Minute
	cfg.CacheTTL.Scheduler = 15 * time.Minute

	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
