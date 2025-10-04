package server

import (
	"context"
	"testing"

	"scheduler-service/internal/config"
	"scheduler-service/internal/logger"
	"scheduler-service/internal/metrics"
	pb "scheduler-service/proto"
)

func TestSchedulerService_Health(t *testing.T) {
	// Create test configuration
	cfg := &config.Config{
		Logging: config.LoggingConfig{
			Level:  "info",
			Format: "text",
		},
	}

	// Create logger and metrics
	log := logger.New(&cfg.Logging)
	metricsInstance := &metrics.Metrics{} // Use empty struct for testing

	// Create scheduler service (without database/cache for unit test)
	service := &SchedulerService{
		config:  cfg,
		logger:  log,
		metrics: metricsInstance,
		db:      nil, // Mock or skip for unit test
		cache:   nil, // Mock or skip for unit test
	}

	// Test health check
	req := &pb.HealthRequest{}
	resp, err := service.Health(context.Background(), req)

	if err != nil {
		t.Fatalf("Health check failed: %v", err)
	}

	if resp == nil {
		t.Fatal("Health response is nil")
	}

	// The health check should return unhealthy since we don't have real DB/Redis
	if resp.GetStatus() != "unhealthy" {
		t.Errorf("Expected unhealthy status, got: %s", resp.GetStatus())
	}

	if resp.GetChecks() == nil {
		t.Error("Health checks map is nil")
	}

	if resp.GetTimestamp() == nil {
		t.Error("Health timestamp is nil")
	}
}

func TestSchedulerService_GetNextItems_Validation(t *testing.T) {
	// Create test configuration
	cfg := &config.Config{
		Logging: config.LoggingConfig{
			Level:  "info",
			Format: "text",
		},
	}

	// Create logger and reuse metrics from previous test
	log := logger.New(&cfg.Logging)
	metricsInstance := &metrics.Metrics{} // Use empty struct for testing

	// Create scheduler service
	service := &SchedulerService{
		config:  cfg,
		logger:  log,
		metrics: metricsInstance,
		db:      nil,
		cache:   nil,
	}

	// Test with empty user ID (should fail validation)
	req := &pb.NextItemsRequest{
		UserId:      "",
		SessionId:   "test-session",
		SessionType: pb.SessionType_PRACTICE,
		Count:       5,
	}

	_, err := service.GetNextItems(context.Background(), req)
	if err == nil {
		t.Error("Expected validation error for empty user ID")
	}

	// Test with invalid count (should fail validation)
	req = &pb.NextItemsRequest{
		UserId:      "test-user",
		SessionId:   "test-session",
		SessionType: pb.SessionType_PRACTICE,
		Count:       0,
	}

	_, err = service.GetNextItems(context.Background(), req)
	if err == nil {
		t.Error("Expected validation error for invalid count")
	}

	// Test with valid request (should succeed with placeholder data)
	req = &pb.NextItemsRequest{
		UserId:      "test-user",
		SessionId:   "test-session",
		SessionType: pb.SessionType_PRACTICE,
		Count:       5,
	}

	resp, err := service.GetNextItems(context.Background(), req)
	if err != nil {
		t.Fatalf("Unexpected error for valid request: %v", err)
	}

	if resp == nil {
		t.Fatal("Response is nil")
	}

	if len(resp.GetItems()) == 0 {
		t.Error("Expected at least one recommended item")
	}

	if resp.GetStrategy() == "" {
		t.Error("Expected strategy to be set")
	}
}
