package database

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"time"

	"scheduler-service/internal/config"
	"scheduler-service/internal/logger"
	"scheduler-service/internal/metrics"

	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

// OptimizedPool provides an optimized database connection pool with performance monitoring
type OptimizedPool struct {
	db      *sql.DB
	config  *config.DatabasePerformanceConfig
	logger  logger.Logger
	metrics metrics.Metrics
	
	// Connection pool statistics
	stats     *PoolStats
	statsMux  sync.RWMutex
	
	// Prepared statements cache
	stmtCache map[string]*sql.Stmt
	stmtMux   sync.RWMutex
}

// PoolStats tracks connection pool performance metrics
type PoolStats struct {
	TotalConnections    int64
	ActiveConnections   int64
	IdleConnections     int64
	WaitCount          int64
	WaitDuration       time.Duration
	MaxOpenConnections int64
	MaxIdleConnections int64
	
	// Query statistics
	QueryCount         int64
	QueryDuration      time.Duration
	SlowQueryCount     int64
	ErrorCount         int64
	
	// Cache statistics
	CacheHits          int64
	CacheMisses        int64
}

// NewOptimizedPool creates a new optimized database connection pool
func NewOptimizedPool(databaseURL string, perfConfig *config.DatabasePerformanceConfig, logger logger.Logger, metrics metrics.Metrics) (*OptimizedPool, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool for optimal performance
	db.SetMaxOpenConns(perfConfig.MaxOpenConns)
	db.SetMaxIdleConns(perfConfig.MaxIdleConns)
	db.SetConnMaxLifetime(perfConfig.ConnMaxLifetime)
	db.SetConnMaxIdleTime(perfConfig.ConnMaxIdleTime)

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	pool := &OptimizedPool{
		db:        db,
		config:    perfConfig,
		logger:    logger,
		metrics:   metrics,
		stats:     &PoolStats{},
		stmtCache: make(map[string]*sql.Stmt),
	}

	// Start monitoring goroutine
	go pool.monitorPool()

	logger.Info("Optimized database pool initialized successfully")
	return pool, nil
}

// GetDB returns the underlying database connection
func (p *OptimizedPool) GetDB() *sql.DB {
	return p.db
}

// QueryContext executes a query with performance monitoring
func (p *OptimizedPool) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	start := time.Now()
	
	// Use prepared statement if enabled
	var rows *sql.Rows
	var err error
	
	if p.config.PreparedStatements {
		stmt, err := p.getOrCreateStmt(query)
		if err != nil {
			p.recordError()
			return nil, fmt.Errorf("failed to prepare statement: %w", err)
		}
		rows, err = stmt.QueryContext(ctx, args...)
	} else {
		rows, err = p.db.QueryContext(ctx, query, args...)
	}
	
	duration := time.Since(start)
	p.recordQuery(duration)
	
	if err != nil {
		p.recordError()
		p.logger.Errorf("Query failed: %v, Duration: %v", err, duration)
		return nil, err
	}
	
	// Log slow queries
	if duration > 1*time.Second {
		p.recordSlowQuery()
		p.logger.Warnf("Slow query detected: %v, Duration: %v", query, duration)
	}
	
	return rows, nil
}

// ExecContext executes a statement with performance monitoring
func (p *OptimizedPool) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	start := time.Now()
	
	var result sql.Result
	var err error
	
	if p.config.PreparedStatements {
		stmt, err := p.getOrCreateStmt(query)
		if err != nil {
			p.recordError()
			return nil, fmt.Errorf("failed to prepare statement: %w", err)
		}
		result, err = stmt.ExecContext(ctx, args...)
	} else {
		result, err = p.db.ExecContext(ctx, query, args...)
	}
	
	duration := time.Since(start)
	p.recordQuery(duration)
	
	if err != nil {
		p.recordError()
		p.logger.Errorf("Exec failed: %v, Duration: %v", err, duration)
		return nil, err
	}
	
	if duration > 1*time.Second {
		p.recordSlowQuery()
		p.logger.Warnf("Slow exec detected: %v, Duration: %v", query, duration)
	}
	
	return result, nil
}

// BatchExec executes multiple statements in a batch for better performance
func (p *OptimizedPool) BatchExec(ctx context.Context, queries []string, argsList [][]interface{}) error {
	if len(queries) != len(argsList) {
		return fmt.Errorf("queries and args length mismatch")
	}
	
	start := time.Now()
	
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		p.recordError()
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	for i, query := range queries {
		if _, err := tx.ExecContext(ctx, query, argsList[i]...); err != nil {
			p.recordError()
			return fmt.Errorf("failed to execute batch query %d: %w", i, err)
		}
	}
	
	if err := tx.Commit(); err != nil {
		p.recordError()
		return fmt.Errorf("failed to commit batch transaction: %w", err)
	}
	
	duration := time.Since(start)
	p.recordQuery(duration)
	
	p.logger.Infof("Batch execution completed: %d queries in %v", len(queries), duration)
	return nil
}

// getOrCreateStmt gets or creates a prepared statement
func (p *OptimizedPool) getOrCreateStmt(query string) (*sql.Stmt, error) {
	p.stmtMux.RLock()
	stmt, exists := p.stmtCache[query]
	p.stmtMux.RUnlock()
	
	if exists {
		p.recordCacheHit()
		return stmt, nil
	}
	
	p.recordCacheMiss()
	
	p.stmtMux.Lock()
	defer p.stmtMux.Unlock()
	
	// Double-check after acquiring write lock
	if stmt, exists := p.stmtCache[query]; exists {
		return stmt, nil
	}
	
	stmt, err := p.db.Prepare(query)
	if err != nil {
		return nil, err
	}
	
	p.stmtCache[query] = stmt
	return stmt, nil
}

// recordQuery records query statistics
func (p *OptimizedPool) recordQuery(duration time.Duration) {
	p.statsMux.Lock()
	defer p.statsMux.Unlock()
	
	p.stats.QueryCount++
	p.stats.QueryDuration += duration
	
	// Update metrics
	p.metrics.RecordQueryDuration(duration.Seconds())
	p.metrics.IncrementQueryCount()
}

// recordError records error statistics
func (p *OptimizedPool) recordError() {
	p.statsMux.Lock()
	defer p.statsMux.Unlock()
	
	p.stats.ErrorCount++
	p.metrics.IncrementErrorCount()
}

// recordSlowQuery records slow query statistics
func (p *OptimizedPool) recordSlowQuery() {
	p.statsMux.Lock()
	defer p.statsMux.Unlock()
	
	p.stats.SlowQueryCount++
	p.metrics.IncrementSlowQueryCount()
}

// recordCacheHit records cache hit statistics
func (p *OptimizedPool) recordCacheHit() {
	p.statsMux.Lock()
	defer p.statsMux.Unlock()
	
	p.stats.CacheHits++
	p.metrics.IncrementCacheHits()
}

// recordCacheMiss records cache miss statistics
func (p *OptimizedPool) recordCacheMiss() {
	p.statsMux.Lock()
	defer p.statsMux.Unlock()
	
	p.stats.CacheMisses++
	p.metrics.IncrementCacheMisses()
}

// monitorPool monitors connection pool statistics
func (p *OptimizedPool) monitorPool() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for range ticker.C {
		stats := p.db.Stats()
		
		p.statsMux.Lock()
		p.stats.TotalConnections = int64(stats.OpenConnections)
		p.stats.ActiveConnections = int64(stats.InUse)
		p.stats.IdleConnections = int64(stats.Idle)
		p.stats.WaitCount = stats.WaitCount
		p.stats.WaitDuration = stats.WaitDuration
		p.stats.MaxOpenConnections = int64(stats.MaxOpenConnections)
		p.stats.MaxIdleConnections = int64(stats.MaxIdleClosed)
		p.statsMux.Unlock()
		
		// Update metrics
		p.metrics.SetGauge("db_open_connections", float64(stats.OpenConnections))
		p.metrics.SetGauge("db_in_use_connections", float64(stats.InUse))
		p.metrics.SetGauge("db_idle_connections", float64(stats.Idle))
		p.metrics.SetGauge("db_wait_count", float64(stats.WaitCount))
		p.metrics.SetGauge("db_wait_duration_seconds", stats.WaitDuration.Seconds())
		
		// Log pool statistics
		p.logger.Debugf("DB Pool Stats - Open: %d, InUse: %d, Idle: %d, Wait: %d, WaitDuration: %v",
			stats.OpenConnections, stats.InUse, stats.Idle, stats.WaitCount, stats.WaitDuration)
	}
}

// GetStats returns current pool statistics
func (p *OptimizedPool) GetStats() *PoolStats {
	p.statsMux.RLock()
	defer p.statsMux.RUnlock()
	
	// Return a copy to avoid race conditions
	statsCopy := *p.stats
	return &statsCopy
}

// Close closes the database connection pool and cleans up resources
func (p *OptimizedPool) Close() error {
	// Close all prepared statements
	p.stmtMux.Lock()
	for _, stmt := range p.stmtCache {
		stmt.Close()
	}
	p.stmtCache = make(map[string]*sql.Stmt)
	p.stmtMux.Unlock()
	
	// Close database connection
	if err := p.db.Close(); err != nil {
		p.logger.Errorf("Error closing database: %v", err)
		return err
	}
	
	p.logger.Info("Optimized database pool closed successfully")
	return nil
}

// HealthCheck performs a health check on the database connection
func (p *OptimizedPool) HealthCheck(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	
	if err := p.db.PingContext(ctx); err != nil {
		return fmt.Errorf("database health check failed: %w", err)
	}
	
	return nil
}