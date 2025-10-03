package database

import (
	"context"
	"fmt"
	"time"

	"user-service/internal/logger"
	"user-service/internal/metrics"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func NewConnection(databaseURL string) (*DB, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	// Configure connection pool
	config.MaxConns = 30
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = time.Minute * 30
	config.HealthCheckPeriod = time.Minute

	// Create connection pool
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	db := &DB{Pool: pool}

	// Start metrics collection
	go db.collectMetrics()

	logger.GetLogger().Info("Database connection established successfully")
	return db, nil
}

func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
		logger.GetLogger().Info("Database connection closed")
	}
}

func (db *DB) collectMetrics() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if db.Pool != nil {
			stat := db.Pool.Stat()
			metrics.SetActiveConnections(int(stat.TotalConns()))
		}
	}
}

// QueryWithMetrics executes a query and records metrics
func (db *DB) QueryWithMetrics(ctx context.Context, operation, query string, args ...interface{}) error {
	start := time.Now()
	defer func() {
		metrics.RecordDBQuery(operation, time.Since(start))
	}()

	_, err := db.Pool.Exec(ctx, query, args...)
	return err
}
