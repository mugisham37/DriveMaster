package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Simple test to verify the event service is working
func main() {
	baseURL := "http://localhost:8083"

	// Test health endpoint
	fmt.Println("Testing health endpoint...")
	resp, err := http.Get(baseURL + "/health")
	if err != nil {
		fmt.Printf("Health check failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Health response: %s\n", string(body))

	// Test attempt event
	fmt.Println("\nTesting attempt event...")
	attemptEvent := map[string]interface{}{
		"user_id":           "550e8400-e29b-41d4-a716-446655440000",
		"item_id":           "550e8400-e29b-41d4-a716-446655440001",
		"session_id":        "550e8400-e29b-41d4-a716-446655440002",
		"client_attempt_id": "550e8400-e29b-41d4-a716-446655440003",
		"selected":          "option_a",
		"correct":           true,
		"quality":           4,
		"confidence":        3,
		"time_taken_ms":     5000,
		"hints_used":        0,
		"device_type":       "mobile",
		"app_version":       "1.0.0",
	}

	jsonData, _ := json.Marshal(attemptEvent)
	resp, err = http.Post(baseURL+"/api/v1/events/attempt", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("Attempt event failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ = io.ReadAll(resp.Body)
	fmt.Printf("Attempt event response (%d): %s\n", resp.StatusCode, string(body))

	// Test session event
	fmt.Println("\nTesting session event...")
	sessionEvent := map[string]interface{}{
		"session_id":         "550e8400-e29b-41d4-a716-446655440002",
		"user_id":            "550e8400-e29b-41d4-a716-446655440000",
		"start_time":         time.Now().Add(-30 * time.Minute).Format(time.RFC3339),
		"end_time":           time.Now().Format(time.RFC3339),
		"items_attempted":    20,
		"correct_count":      16,
		"total_time_ms":      1800000,
		"session_type":       "practice",
		"topics_practiced":   []string{"traffic_signs", "right_of_way"},
		"average_difficulty": 0.65,
	}

	jsonData, _ = json.Marshal(sessionEvent)
	resp, err = http.Post(baseURL+"/api/v1/events/session", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("Session event failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ = io.ReadAll(resp.Body)
	fmt.Printf("Session event response (%d): %s\n", resp.StatusCode, string(body))

	// Test metrics endpoint
	fmt.Println("\nTesting metrics endpoint...")
	resp, err = http.Get(baseURL + "/metrics")
	if err != nil {
		fmt.Printf("Metrics check failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ = io.ReadAll(resp.Body)
	fmt.Printf("Metrics response: %s\n", string(body))

	fmt.Println("\nAll tests completed!")
}
