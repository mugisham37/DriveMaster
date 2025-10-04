package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"

	"scheduler-service/internal/cache"
	"scheduler-service/internal/config"
	"scheduler-service/internal/database"
	"scheduler-service/internal/logger"
	"scheduler-service/internal/metrics"
	"scheduler-service/internal/server"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize logger
	log := logger.New(&cfg.Logging)
	log.Info("Starting Scheduler Service")

	// Initialize metrics
	metricsInstance := metrics.New()

	// Initialize database
	db, err := database.New(&cfg.Database, metricsInstance, log)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize Redis cache
	redisClient, err := cache.New(&cfg.Redis, metricsInstance, log)
	if err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}
	defer redisClient.Close()

	// Initialize scheduler service
	schedulerService := server.NewSchedulerService(cfg, log, metricsInstance, db, redisClient)

	// Initialize gRPC server
	grpcServer, err := server.NewGRPCServer(cfg, log, metricsInstance, schedulerService)
	if err != nil {
		log.Fatalf("Failed to initialize gRPC server: %v", err)
	}

	// Start metrics HTTP server
	go func() {
		mux := http.NewServeMux()
		mux.Handle("/metrics", promhttp.Handler())
		mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		})

		log.Infof("Starting metrics server on port %s", cfg.Server.HTTPPort)
		if err := http.ListenAndServe(":"+cfg.Server.HTTPPort, mux); err != nil {
			log.Errorf("Metrics server error: %v", err)
		}
	}()

	// Start gRPC server in a goroutine
	go func() {
		if err := grpcServer.Start(); err != nil {
			log.Fatalf("Failed to start gRPC server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	// Graceful shutdown with timeout
	_, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Stop gRPC server
	grpcServer.Stop()

	// Close database connections
	if err := db.Close(); err != nil {
		log.Errorf("Error closing database: %v", err)
	}

	// Close Redis connections
	if err := redisClient.Close(); err != nil {
		log.Errorf("Error closing Redis: %v", err)
	}

	log.Info("Server shutdown complete")
}
