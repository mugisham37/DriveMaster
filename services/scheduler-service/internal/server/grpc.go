package server

import (
	"context"
	"fmt"
	"net"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"

	"scheduler-service/internal/config"
	"scheduler-service/internal/logger"
	"scheduler-service/internal/metrics"
	pb "scheduler-service/proto"
)

// GRPCServer wraps the gRPC server with dependencies
type GRPCServer struct {
	server   *grpc.Server
	listener net.Listener
	config   *config.Config
	logger   *logger.Logger
	metrics  *metrics.Metrics
	service  *SchedulerService
}

// NewGRPCServer creates a new gRPC server
func NewGRPCServer(
	cfg *config.Config,
	log *logger.Logger,
	metrics *metrics.Metrics,
	service *SchedulerService,
) (*GRPCServer, error) {
	// Create listener
	listener, err := net.Listen("tcp", ":"+cfg.Server.GRPCPort)
	if err != nil {
		return nil, fmt.Errorf("failed to listen on port %s: %w", cfg.Server.GRPCPort, err)
	}

	// Create gRPC server with interceptors
	server := grpc.NewServer(
		grpc.UnaryInterceptor(chainUnaryInterceptors(
			loggingInterceptor(log),
			metricsInterceptor(metrics),
			recoveryInterceptor(log),
		)),
	)

	// Register services
	pb.RegisterSchedulerServiceServer(server, service)

	// Register health service
	healthServer := health.NewServer()
	healthServer.SetServingStatus("scheduler", grpc_health_v1.HealthCheckResponse_SERVING)
	grpc_health_v1.RegisterHealthServer(server, healthServer)

	// Enable reflection for development
	if cfg.Server.Env == "development" {
		reflection.Register(server)
	}

	return &GRPCServer{
		server:   server,
		listener: listener,
		config:   cfg,
		logger:   log,
		metrics:  metrics,
		service:  service,
	}, nil
}

// Start starts the gRPC server
func (s *GRPCServer) Start() error {
	s.logger.Infof("Starting gRPC server on port %s", s.config.Server.GRPCPort)
	return s.server.Serve(s.listener)
}

// Stop gracefully stops the gRPC server
func (s *GRPCServer) Stop() {
	s.logger.Info("Stopping gRPC server...")
	s.server.GracefulStop()
}

// Interceptor chain helper
func chainUnaryInterceptors(interceptors ...grpc.UnaryServerInterceptor) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		chain := handler
		for i := len(interceptors) - 1; i >= 0; i-- {
			interceptor := interceptors[i]
			next := chain
			chain = func(currentCtx context.Context, currentReq interface{}) (interface{}, error) {
				return interceptor(currentCtx, currentReq, info, next)
			}
		}
		return chain(ctx, req)
	}
}

// Logging interceptor
func loggingInterceptor(log *logger.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()

		// Add trace ID to context if not present
		traceID := logger.GetTraceID(ctx)
		if traceID == "" {
			traceID = generateTraceID()
			ctx = logger.WithTraceID(ctx, traceID)
		}

		log.WithContext(ctx).WithField("method", info.FullMethod).Info("gRPC request started")

		resp, err := handler(ctx, req)

		duration := time.Since(start)
		entry := log.WithContext(ctx).WithFields(map[string]interface{}{
			"method":   info.FullMethod,
			"duration": duration.String(),
		})

		if err != nil {
			entry.WithError(err).Error("gRPC request failed")
		} else {
			entry.Info("gRPC request completed")
		}

		return resp, err
	}
}

// Metrics interceptor
func metricsInterceptor(metrics *metrics.Metrics) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()

		resp, err := handler(ctx, req)

		duration := time.Since(start)
		status := "success"
		if err != nil {
			status = "error"
		}

		metrics.RecordRequest(info.FullMethod, status, duration)

		return resp, err
	}
}

// Recovery interceptor
func recoveryInterceptor(log *logger.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp interface{}, err error) {
		defer func() {
			if r := recover(); r != nil {
				log.WithContext(ctx).WithFields(map[string]interface{}{
					"method": info.FullMethod,
					"panic":  r,
				}).Error("gRPC handler panicked")

				err = status.Errorf(codes.Internal, "internal server error")
			}
		}()

		return handler(ctx, req)
	}
}

// Generate a simple trace ID (in production, use proper distributed tracing)
func generateTraceID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
