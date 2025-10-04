package metrics

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics holds all Prometheus metrics for the scheduler service
type Metrics struct {
	// Request metrics
	RequestDuration *prometheus.HistogramVec
	RequestTotal    *prometheus.CounterVec
	RequestErrors   *prometheus.CounterVec

	// Algorithm metrics
	SM2Updates        prometheus.Counter
	BKTUpdates        prometheus.Counter
	IRTUpdates        prometheus.Counter
	ScoringDuration   prometheus.Histogram
	ItemSelectionTime prometheus.Histogram

	// Cache metrics
	CacheHits   *prometheus.CounterVec
	CacheMisses *prometheus.CounterVec

	// Database metrics
	DBConnections prometheus.Gauge
	DBQueries     *prometheus.CounterVec
	DBDuration    *prometheus.HistogramVec

	// Business metrics
	ActiveUsers      prometheus.Gauge
	SessionsStarted  prometheus.Counter
	ItemsRecommended prometheus.Counter
	MasteryUpdates   prometheus.Counter
}

// New creates a new metrics instance
func New() *Metrics {
	return &Metrics{
		RequestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "scheduler_request_duration_seconds",
				Help:    "Duration of gRPC requests",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"method", "status"},
		),
		RequestTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "scheduler_requests_total",
				Help: "Total number of gRPC requests",
			},
			[]string{"method", "status"},
		),
		RequestErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "scheduler_request_errors_total",
				Help: "Total number of request errors",
			},
			[]string{"method", "error_type"},
		),
		SM2Updates: promauto.NewCounter(
			prometheus.CounterOpts{
				Name: "scheduler_sm2_updates_total",
				Help: "Total number of SM-2 state updates",
			},
		),
		BKTUpdates: promauto.NewCounter(
			prometheus.CounterOpts{
				Name: "scheduler_bkt_updates_total",
				Help: "Total number of BKT state updates",
			},
		),
		IRTUpdates: promauto.NewCounter(
			prometheus.CounterOpts{
				Name: "scheduler_irt_updates_total",
				Help: "Total number of IRT ability updates",
			},
		),
		ScoringDuration: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "scheduler_scoring_duration_seconds",
				Help:    "Duration of unified scoring calculations",
				Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0},
			},
		),
		ItemSelectionTime: promauto.NewHistogram(
			prometheus.HistogramOpts{
				Name:    "scheduler_item_selection_duration_seconds",
				Help:    "Duration of item selection process",
				Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0},
			},
		),
		CacheHits: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "scheduler_cache_hits_total",
				Help: "Total number of cache hits",
			},
			[]string{"cache_type"},
		),
		CacheMisses: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "scheduler_cache_misses_total",
				Help: "Total number of cache misses",
			},
			[]string{"cache_type"},
		),
		DBConnections: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "scheduler_db_connections",
				Help: "Current number of database connections",
			},
		),
		DBQueries: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "scheduler_db_queries_total",
				Help: "Total number of database queries",
			},
			[]string{"operation", "status"},
		),
		DBDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "scheduler_db_duration_seconds",
				Help:    "Duration of database operations",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"operation"},
		),
		ActiveUsers: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "scheduler_active_users",
				Help: "Current number of active users",
			},
		),
		SessionsStarted: promauto.NewCounter(
			prometheus.CounterOpts{
				Name: "scheduler_sessions_started_total",
				Help: "Total number of learning sessions started",
			},
		),
		ItemsRecommended: promauto.NewCounter(
			prometheus.CounterOpts{
				Name: "scheduler_items_recommended_total",
				Help: "Total number of items recommended",
			},
		),
		MasteryUpdates: promauto.NewCounter(
			prometheus.CounterOpts{
				Name: "scheduler_mastery_updates_total",
				Help: "Total number of mastery level updates",
			},
		),
	}
}

// RecordRequest records request metrics
func (m *Metrics) RecordRequest(method, status string, duration time.Duration) {
	m.RequestDuration.WithLabelValues(method, status).Observe(duration.Seconds())
	m.RequestTotal.WithLabelValues(method, status).Inc()
}

// RecordError records error metrics
func (m *Metrics) RecordError(method, errorType string) {
	m.RequestErrors.WithLabelValues(method, errorType).Inc()
}

// RecordCacheHit records cache hit
func (m *Metrics) RecordCacheHit(cacheType string) {
	m.CacheHits.WithLabelValues(cacheType).Inc()
}

// RecordCacheMiss records cache miss
func (m *Metrics) RecordCacheMiss(cacheType string) {
	m.CacheMisses.WithLabelValues(cacheType).Inc()
}

// RecordDBOperation records database operation metrics
func (m *Metrics) RecordDBOperation(operation, status string, duration time.Duration) {
	m.DBQueries.WithLabelValues(operation, status).Inc()
	m.DBDuration.WithLabelValues(operation).Observe(duration.Seconds())
}

// Timer helps measure operation duration
type Timer struct {
	start time.Time
}

// NewTimer creates a new timer
func NewTimer() *Timer {
	return &Timer{start: time.Now()}
}

// Duration returns elapsed time since timer creation
func (t *Timer) Duration() time.Duration {
	return time.Since(t.start)
}
