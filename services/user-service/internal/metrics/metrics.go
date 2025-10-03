package metrics

import (
	"context"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/status"
)

var (
	// gRPC metrics
	grpcRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "grpc_requests_total",
			Help: "Total number of gRPC requests",
		},
		[]string{"method", "status"},
	)

	grpcRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "grpc_request_duration_seconds",
			Help:    "Duration of gRPC requests",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method"},
	)

	// Database metrics
	dbConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_active",
			Help: "Number of active database connections",
		},
	)

	dbQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "db_query_duration_seconds",
			Help:    "Duration of database queries",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"operation"},
	)

	// Cache metrics
	cacheHitsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "Total number of cache hits",
		},
		[]string{"cache_type"},
	)

	cacheMissesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "Total number of cache misses",
		},
		[]string{"cache_type"},
	)

	// Business metrics
	usersActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "users_active_total",
			Help: "Number of active users",
		},
	)

	masteryUpdatesTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "mastery_updates_total",
			Help: "Total number of mastery updates",
		},
	)
)

// UnaryServerInterceptor adds metrics collection to gRPC unary calls
func UnaryServerInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()

		resp, err := handler(ctx, req)

		duration := time.Since(start)
		method := info.FullMethod
		statusCode := "OK"

		if err != nil {
			if st, ok := status.FromError(err); ok {
				statusCode = st.Code().String()
			} else {
				statusCode = "Unknown"
			}
		}

		grpcRequestsTotal.WithLabelValues(method, statusCode).Inc()
		grpcRequestDuration.WithLabelValues(method).Observe(duration.Seconds())

		return resp, err
	}
}

// RecordDBQuery records database query metrics
func RecordDBQuery(operation string, duration time.Duration) {
	dbQueryDuration.WithLabelValues(operation).Observe(duration.Seconds())
}

// RecordCacheHit records cache hit metrics
func RecordCacheHit(cacheType string) {
	cacheHitsTotal.WithLabelValues(cacheType).Inc()
}

// RecordCacheMiss records cache miss metrics
func RecordCacheMiss(cacheType string) {
	cacheMissesTotal.WithLabelValues(cacheType).Inc()
}

// SetActiveConnections sets the number of active database connections
func SetActiveConnections(count int) {
	dbConnectionsActive.Set(float64(count))
}

// SetActiveUsers sets the number of active users
func SetActiveUsers(count int) {
	usersActive.Set(float64(count))
}

// IncrementMasteryUpdates increments the mastery updates counter
func IncrementMasteryUpdates() {
	masteryUpdatesTotal.Inc()
}
