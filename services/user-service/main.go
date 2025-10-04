package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"user-service/internal/cache"
	"user-service/internal/config"
	"user-service/internal/database"
	"user-service/internal/events"
	"user-service/internal/handlers"
	"user-service/internal/logger"
	"user-service/internal/metrics"
	"user-service/internal/repository"
	"user-service/internal/service"
	pb "user-service/proto"

	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Load configuration
	cfg := config.Load()

	// Initialize logger
	logger.Init(cfg.LogLevel, cfg.LogFormat)
	log := logger.GetLogger()

	log.Info("Starting User Service...")

	// Initialize database connection
	db, err := database.NewConnection(cfg.DatabaseURL)
	if err != nil {
		log.WithError(err).Fatal("Failed to connect to database")
	}
	defer db.Close()

	// Initialize Redis cache
	redisClient, err := cache.NewRedisClient(cfg.RedisURL, cfg.RedisDB)
	if err != nil {
		log.WithError(err).Fatal("Failed to connect to Redis")
	}
	defer redisClient.Close()

	// Initialize event publisher
	eventPublisher := events.NewNoOpEventPublisher() // Use NoOp for now

	// Initialize repository
	userRepo := repository.NewUserRepository(db.Pool)
	progressRepo := repository.NewProgressRepository(db.Pool)
	schedulerStateRepo := repository.NewSchedulerStateRepository(db.Pool)

	// Initialize services
	userService := service.NewUserService(userRepo, redisClient, cfg, eventPublisher)
	progressService := service.NewProgressService(progressRepo, redisClient, cfg, log)
	schedulerStateService := service.NewSchedulerStateService(schedulerStateRepo, redisClient, cfg, eventPublisher)

	// Initialize handlers
	userHandler := handlers.NewUserHandler(userService, progressService)
	schedulerStateHandler := handlers.NewSchedulerStateHandler(schedulerStateService)

	// Create gRPC server with interceptors
	grpcServer := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			logger.UnaryServerInterceptor(),
			metrics.UnaryServerInterceptor(),
		),
	)

	// Register services
	pb.RegisterUserServiceServer(grpcServer, userHandler)
	pb.RegisterSchedulerStateServiceServer(grpcServer, schedulerStateHandler)

	// Enable reflection for development
	if cfg.Environment == "development" {
		reflection.Register(grpcServer)
	}

	// Start metrics server
	go func() {
		http.Handle("/metrics", promhttp.Handler())
		http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		})

		log.WithField("port", cfg.HTTPPort).Info("Starting metrics server")
		if err := http.ListenAndServe(":"+cfg.HTTPPort, nil); err != nil {
			log.WithError(err).Error("Metrics server failed")
		}
	}()

	// Start gRPC server
	lis, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		log.WithError(err).Fatal("Failed to listen")
	}

	go func() {
		log.WithField("port", cfg.GRPCPort).Info("Starting gRPC server")
		if err := grpcServer.Serve(lis); err != nil {
			log.WithError(err).Fatal("Failed to serve gRPC")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down User Service...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Stop gRPC server
	grpcServer.GracefulStop()

	// Use context for any cleanup if needed
	_ = ctx

	log.Info("User Service stopped")
}
