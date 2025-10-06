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

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
	
	"	"shared/security"
	userSecurity "user-service/internal/security""
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

	// Initialize security manager
	securityManager, err := security.InitializeSecurity(log)
	if err != nil {
		log.WithError(err).Fatal("Failed to initialize security manager")
	}
	defer securityManager.Shutdown(context.Background())

	// Validate service security configuration
	if err := securityManager.ValidateServiceConfiguration("user-service"); err != nil {
		log.WithError(err).Fatal("Security configuration validation failed")
	}

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
	eventPublisher := events.NewKafkaEventPublisher(cfg)

	// Initialize repository
	userRepo := repository.NewUserRepository(db.Pool)
	progressRepo := repository.NewProgressRepository(db.Pool)
	schedulerStateRepo := repository.NewSchedulerStateRepository(db.Pool)
	activityRepo := repository.NewActivityRepository(db.Pool)

	// Initialize services with security manager
	userService := service.NewUserService(userRepo, redisClient, cfg, eventPublisher, securityManager)
	progressService := service.NewProgressService(progressRepo, redisClient, cfg, log, securityManager)
	schedulerStateService := service.NewSchedulerStateService(schedulerStateRepo, redisClient, cfg, eventPublisher, securityManager)
	activityService := service.NewActivityService(activityRepo, redisClient, eventPublisher, cfg, log, securityManager)

	// Initialize handlers
	userHandler := handlers.NewUserHandler(userService, progressService)
	schedulerStateHandler := handlers.NewSchedulerStateHandler(schedulerStateService)
	activityHandler := handlers.NewActivityHandler(activityService, log)
	gdprHandler := handlers.NewGDPRHandler(userService, securityManager, log)

	// Initialize security interceptor
	securityInterceptor := userSecurity.NewSecurityInterceptor(securityManager, log)

	// Create gRPC server with interceptors
	grpcServer := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			securityInterceptor.UnaryServerInterceptor(),
			logger.UnaryServerInterceptor(),
			metrics.UnaryServerInterceptor(),
		),
		grpc.ChainStreamInterceptor(
			securityInterceptor.StreamServerInterceptor(),
		),
	)

	// Register services
	pb.RegisterUserServiceServer(grpcServer, userHandler)
	pb.RegisterSchedulerStateServiceServer(grpcServer, schedulerStateHandler)

	// Enable reflection for development
	if cfg.Environment == "development" {
		reflection.Register(grpcServer)
	}

	// Start HTTP server with GDPR endpoints
	go func() {
		// Create Gin router
		router := gin.New()
		
		// Add security middleware
		for _, middleware := range securityManager.GetSecurityMiddleware() {
			if ginMiddleware, ok := middleware.(gin.HandlerFunc); ok {
				router.Use(ginMiddleware)
			}
		}
		
		// Setup API routes
		api := router.Group("/api/v1")
		gdprHandler.SetupGDPRRoutes(api)
		
		// Add metrics and health endpoints
		router.GET("/metrics", gin.WrapH(promhttp.Handler()))
		router.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

		log.WithField("port", cfg.HTTPPort).Info("Starting HTTP server")
		if err := router.Run(":" + cfg.HTTPPort); err != nil {
			log.WithError(err).Error("HTTP server failed")
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
