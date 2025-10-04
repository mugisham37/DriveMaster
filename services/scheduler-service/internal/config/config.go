package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the scheduler service
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	ML       MLConfig
	SM2      SM2Config
	BKT      BKTConfig
	IRT      IRTConfig
	Scoring  ScoringConfig
	Logging  LoggingConfig
}

type ServerConfig struct {
	Port     string
	GRPCPort string
	HTTPPort string
	Env      string
}

type DatabaseConfig struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

type RedisConfig struct {
	URL        string
	DB         int
	MaxRetries int
	PoolSize   int
}

type MLConfig struct {
	ServiceURL string
	Timeout    time.Duration
}

type SM2Config struct {
	InitialEasiness float64
	MinEasiness     float64
}

type BKTConfig struct {
	InitialKnowledge float64
	GuessProbability float64
	SlipProbability  float64
	LearnProbability float64
}

type IRTConfig struct {
	InitialAbility float64
}

type ScoringConfig struct {
	WeightUrgency     float64
	WeightMastery     float64
	WeightDifficulty  float64
	WeightExploration float64
}

type LoggingConfig struct {
	Level  string
	Format string
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:     getEnv("PORT", "50052"),
			GRPCPort: getEnv("GRPC_PORT", "50052"),
			HTTPPort: getEnv("HTTP_PORT", "8082"),
			Env:      getEnv("GO_ENV", "development"),
		},
		Database: DatabaseConfig{
			URL:             getEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/adaptive_learning"),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: time.Duration(getEnvInt("DB_CONN_MAX_LIFETIME", 300)) * time.Second,
		},
		Redis: RedisConfig{
			URL:        getEnv("REDIS_URL", "redis://localhost:6379"),
			DB:         getEnvInt("REDIS_DB", 1),
			MaxRetries: getEnvInt("REDIS_MAX_RETRIES", 3),
			PoolSize:   getEnvInt("REDIS_POOL_SIZE", 10),
		},
		ML: MLConfig{
			ServiceURL: getEnv("ML_SERVICE_URL", "http://localhost:8000"),
			Timeout:    time.Duration(getEnvInt("ML_TIMEOUT_SECONDS", 30)) * time.Second,
		},
		SM2: SM2Config{
			InitialEasiness: getEnvFloat("SM2_INITIAL_EASINESS", 2.5),
			MinEasiness:     getEnvFloat("SM2_MIN_EASINESS", 1.3),
		},
		BKT: BKTConfig{
			InitialKnowledge: getEnvFloat("BKT_INITIAL_KNOWLEDGE", 0.1),
			GuessProbability: getEnvFloat("BKT_GUESS_PROBABILITY", 0.25),
			SlipProbability:  getEnvFloat("BKT_SLIP_PROBABILITY", 0.1),
			LearnProbability: getEnvFloat("BKT_LEARN_PROBABILITY", 0.3),
		},
		IRT: IRTConfig{
			InitialAbility: getEnvFloat("IRT_INITIAL_ABILITY", 0.0),
		},
		Scoring: ScoringConfig{
			WeightUrgency:     getEnvFloat("WEIGHT_URGENCY", 0.3),
			WeightMastery:     getEnvFloat("WEIGHT_MASTERY", 0.3),
			WeightDifficulty:  getEnvFloat("WEIGHT_DIFFICULTY", 0.25),
			WeightExploration: getEnvFloat("WEIGHT_EXPLORATION", 0.15),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		}
	}
	return defaultValue
}
