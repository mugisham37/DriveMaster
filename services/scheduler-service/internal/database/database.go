package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"scheduler-service/internal/config"
	applogger "scheduler-service/internal/logger"
	"scheduler-service/internal/metrics"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB wraps the database connection with additional functionality
type DB struct {
	*gorm.DB
	metrics *metrics.Metrics
	logger  *applogger.Logger
}

// New creates a new database connection
func New(cfg *config.DatabaseConfig, metrics *metrics.Metrics, log *applogger.Logger) (*DB, error) {
	// Configure GORM logger
	gormLogger := logger.New(
		log,
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)

	// Open database connection
	db, err := gorm.Open(postgres.Open(cfg.URL), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying sql.DB for connection pool configuration
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info("Database connection established successfully")

	return &DB{
		DB:      db,
		metrics: metrics,
		logger:  log,
	}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Health checks database health
func (db *DB) Health(ctx context.Context) error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return sqlDB.PingContext(ctx)
}

// Stats returns database statistics
func (db *DB) Stats() sql.DBStats {
	sqlDB, _ := db.DB.DB()
	stats := sqlDB.Stats()

	// Update metrics
	db.metrics.DBConnections.Set(float64(stats.OpenConnections))

	return stats
}

// WithMetrics wraps database operations with metrics
func (db *DB) WithMetrics(operation string) *gorm.DB {
	// Return a session that can be used for operations
	// Metrics will be recorded manually when needed
	return db.DB.Session(&gorm.Session{})
}

// RecordOperation records metrics for a database operation
func (db *DB) RecordOperation(operation string, duration time.Duration, err error) {
	status := "success"
	if err != nil {
		status = "error"
	}
	db.metrics.RecordDBOperation(operation, status, duration)
}
