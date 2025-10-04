package algorithms

import (
	"context"
	"testing"
	"time"

	"scheduler-service/internal/logger"
)

// TestContextualBanditIntegration tests the full integration of contextual bandit
// with the unified scoring algorithm
func TestContextualBanditIntegration(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	// Create unified scoring algorithm with contextual bandit
	usa := NewUnifiedScoringAlgorithm(log)

	// Test session strategy selection
	contextFeatures := ContextFeatures{
		UserAbilityMean:     0.6,
		UserAbilityVariance: 0.2,
		UserMasteryMean:     0.7,
		UserMasteryVariance: 0.15,
		UserStreakDays:      3,
		UserTotalSessions:   15,
		TimeOfDay:           14,
		DayOfWeek:           2,
		SessionNumber:       1,
		AvailableTime:       30,
		RecentAccuracy:      0.75,
		RecentDifficulty:    0.6,
		DueItemsCount:       8,
		OverdueItemsCount:   2,
		NewItemsCount:       15,
		MasteryGapSum:       2.5,
		UrgencyScore:        0.6,
		RecentEngagement:    0.8,
		RecentRetention:     0.85,
		RecentProgress:      0.7,
		PredictedFatigue:    0.3,
		MotivationLevel:     0.9,
		Timestamp:           time.Now(),
	}

	// Select a session strategy
	selection, err := usa.SelectSessionStrategy(ctx, contextFeatures)
	if err != nil {
		t.Fatalf("Failed to select session strategy: %v", err)
	}

	if selection == nil {
		t.Fatal("Expected selection to be non-nil")
	}

	if selection.Strategy == "" {
		t.Error("Expected strategy to be selected")
	}

	// Verify the selected strategy exists
	strategies := usa.GetAvailableStrategies()
	if _, exists := strategies[selection.Strategy]; !exists {
		t.Errorf("Selected strategy %s does not exist in available strategies", selection.Strategy)
	}

	// Simulate session completion and update reward
	sessionID := "integration_test_session_1"
	reward := 0.85 // Good session performance

	err = usa.UpdateSessionReward(ctx, selection.Strategy, contextFeatures, reward, sessionID)
	if err != nil {
		t.Fatalf("Failed to update session reward: %v", err)
	}

	// Get performance metrics
	metrics := usa.GetBanditPerformanceMetrics()
	if metrics == nil {
		t.Fatal("Expected metrics to be non-nil")
	}

	// Verify metrics contain expected fields
	expectedFields := []string{"algorithm", "total_strategies", "context_dimension"}
	for _, field := range expectedFields {
		if _, exists := metrics[field]; !exists {
			t.Errorf("Expected metric field %s to be present", field)
		}
	}

	// Test multiple strategy selections to verify bandit learning
	for i := 0; i < 10; i++ {
		// Vary context slightly for each selection
		testContext := contextFeatures
		testContext.AvailableTime = 20 + i*2
		testContext.RecentAccuracy = 0.6 + float64(i)*0.03
		testContext.SessionNumber = i + 1

		selection, err := usa.SelectSessionStrategy(ctx, testContext)
		if err != nil {
			t.Fatalf("Failed to select strategy in iteration %d: %v", i, err)
		}

		// Simulate varying rewards based on strategy effectiveness
		var simulatedReward float64
		switch selection.Strategy {
		case "practice":
			simulatedReward = 0.7 + float64(i)*0.02
		case "review":
			simulatedReward = 0.8 + float64(i)*0.01
		case "mock_test":
			simulatedReward = 0.6 + float64(i)*0.03
		default:
			simulatedReward = 0.65 + float64(i)*0.02
		}

		err = usa.UpdateSessionReward(ctx, selection.Strategy, testContext, simulatedReward,
			"integration_test_session_"+string(rune(i+2)))
		if err != nil {
			t.Fatalf("Failed to update reward in iteration %d: %v", i, err)
		}
	}

	// Verify that the bandit has learned from the feedback
	finalMetrics := usa.GetBanditPerformanceMetrics()
	strategyMetrics, ok := finalMetrics["strategies"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected strategy metrics to be present")
	}

	// Check that at least one strategy has been selected multiple times
	foundActiveStrategy := false
	for strategyName, metrics := range strategyMetrics {
		if strategyMetrics, ok := metrics.(map[string]interface{}); ok {
			if totalSelections, exists := strategyMetrics["total_selections"]; exists {
				if selections, ok := totalSelections.(int); ok && selections > 0 {
					foundActiveStrategy = true
					t.Logf("Strategy %s has %d selections", strategyName, selections)
				}
			}
		}
	}

	if !foundActiveStrategy {
		t.Error("Expected at least one strategy to have been selected")
	}
}

// TestContextualBanditAlgorithmSwitching tests switching between Thompson Sampling and LinUCB
func TestContextualBanditAlgorithmSwitching(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	usa := NewUnifiedScoringAlgorithm(log)

	// Start with Thompson Sampling (default)
	initialMetrics := usa.GetBanditPerformanceMetrics()
	if initialMetrics["algorithm"] != ThompsonSampling {
		t.Errorf("Expected initial algorithm to be Thompson Sampling, got %v", initialMetrics["algorithm"])
	}

	// Switch to LinUCB
	err := usa.SetBanditAlgorithm(LinUCB)
	if err != nil {
		t.Fatalf("Failed to switch to LinUCB: %v", err)
	}

	// Verify algorithm changed
	newMetrics := usa.GetBanditPerformanceMetrics()
	if newMetrics["algorithm"] != LinUCB {
		t.Errorf("Expected algorithm to be LinUCB after switch, got %v", newMetrics["algorithm"])
	}

	// Verify strategies are still available
	strategies := usa.GetAvailableStrategies()
	if len(strategies) == 0 {
		t.Error("Expected strategies to be preserved after algorithm switch")
	}

	// Test strategy selection with new algorithm
	contextFeatures := ContextFeatures{
		AvailableTime:     25,
		RecentAccuracy:    0.7,
		DueItemsCount:     5,
		UserTotalSessions: 10,
		Timestamp:         time.Now(),
	}

	selection, err := usa.SelectSessionStrategy(ctx, contextFeatures)
	if err != nil {
		t.Fatalf("Failed to select strategy with LinUCB: %v", err)
	}

	if selection.Strategy == "" {
		t.Error("Expected strategy to be selected with LinUCB")
	}
}

// TestContextualBanditStrategyManagement tests adding and removing strategies
func TestContextualBanditStrategyManagement(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing

	usa := NewUnifiedScoringAlgorithm(log)

	// Get initial strategy count
	initialStrategies := usa.GetAvailableStrategies()
	initialCount := len(initialStrategies)

	// Add a custom strategy
	customStrategy := &Strategy{
		Name:        "custom_intensive",
		Description: "Custom intensive practice strategy",
		MinDuration: 25,
		MaxDuration: 50,
		Difficulty:  0.8,
		Variety:     0.4,
		Urgency:     0.3,
		Mastery:     0.9,
	}

	err := usa.AddSessionStrategy(customStrategy)
	if err != nil {
		t.Fatalf("Failed to add custom strategy: %v", err)
	}

	// Verify strategy was added
	updatedStrategies := usa.GetAvailableStrategies()
	if len(updatedStrategies) != initialCount+1 {
		t.Errorf("Expected %d strategies after adding, got %d", initialCount+1, len(updatedStrategies))
	}

	// Verify the custom strategy exists and has correct properties
	retrievedStrategy, exists := usa.GetSessionStrategy("custom_intensive")
	if !exists {
		t.Error("Expected custom strategy to exist after adding")
	}

	if retrievedStrategy.Name != customStrategy.Name {
		t.Errorf("Expected strategy name %s, got %s", customStrategy.Name, retrievedStrategy.Name)
	}

	if retrievedStrategy.Difficulty != customStrategy.Difficulty {
		t.Errorf("Expected difficulty %f, got %f", customStrategy.Difficulty, retrievedStrategy.Difficulty)
	}

	// Remove the custom strategy
	err = usa.RemoveSessionStrategy("custom_intensive")
	if err != nil {
		t.Fatalf("Failed to remove custom strategy: %v", err)
	}

	// Verify strategy was removed
	finalStrategies := usa.GetAvailableStrategies()
	if len(finalStrategies) != initialCount {
		t.Errorf("Expected %d strategies after removing, got %d", initialCount, len(finalStrategies))
	}

	// Verify the custom strategy no longer exists
	_, exists = usa.GetSessionStrategy("custom_intensive")
	if exists {
		t.Error("Expected custom strategy to not exist after removal")
	}
}

// TestContextualBanditReset tests resetting the bandit state
func TestContextualBanditReset(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	usa := NewUnifiedScoringAlgorithm(log)

	// Generate some history
	contextFeatures := ContextFeatures{
		AvailableTime:  30,
		RecentAccuracy: 0.7,
		Timestamp:      time.Now(),
	}

	for i := 0; i < 5; i++ {
		selection, err := usa.SelectSessionStrategy(ctx, contextFeatures)
		if err != nil {
			t.Fatalf("Failed to select strategy: %v", err)
		}

		err = usa.UpdateSessionReward(ctx, selection.Strategy, contextFeatures, 0.8,
			"test_session_"+string(rune(i)))
		if err != nil {
			t.Fatalf("Failed to update reward: %v", err)
		}
	}

	// Verify history exists
	metricsBeforeReset := usa.GetBanditPerformanceMetrics()
	strategyMetrics, ok := metricsBeforeReset["strategies"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected strategy metrics before reset")
	}

	hasHistory := false
	for _, metrics := range strategyMetrics {
		if strategyMetrics, ok := metrics.(map[string]interface{}); ok {
			if totalSelections, exists := strategyMetrics["total_selections"]; exists {
				if selections, ok := totalSelections.(int); ok && selections > 0 {
					hasHistory = true
					break
				}
			}
		}
	}

	if !hasHistory {
		t.Error("Expected to have history before reset")
	}

	// Reset the bandit state
	usa.ResetBanditState()

	// Verify history is cleared
	metricsAfterReset := usa.GetBanditPerformanceMetrics()
	strategyMetricsAfter, ok := metricsAfterReset["strategies"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected strategy metrics after reset")
	}

	for strategyName, metrics := range strategyMetricsAfter {
		if strategyMetrics, ok := metrics.(map[string]interface{}); ok {
			if totalSelections, exists := strategyMetrics["total_selections"]; exists {
				if selections, ok := totalSelections.(int); ok && selections > 0 {
					t.Errorf("Expected strategy %s to have 0 selections after reset, got %d",
						strategyName, selections)
				}
			}
		}
	}

	// Verify strategies still exist
	strategies := usa.GetAvailableStrategies()
	if len(strategies) == 0 {
		t.Error("Expected strategies to still exist after reset")
	}
}

// BenchmarkContextualBanditSelection benchmarks strategy selection performance
func BenchmarkContextualBanditSelection(b *testing.B) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	usa := NewUnifiedScoringAlgorithm(log)

	contextFeatures := ContextFeatures{
		UserAbilityMean:     0.6,
		UserAbilityVariance: 0.2,
		UserMasteryMean:     0.7,
		UserMasteryVariance: 0.15,
		UserStreakDays:      3,
		UserTotalSessions:   15,
		TimeOfDay:           14,
		DayOfWeek:           2,
		SessionNumber:       1,
		AvailableTime:       30,
		RecentAccuracy:      0.75,
		RecentDifficulty:    0.6,
		DueItemsCount:       8,
		OverdueItemsCount:   2,
		NewItemsCount:       15,
		MasteryGapSum:       2.5,
		UrgencyScore:        0.6,
		RecentEngagement:    0.8,
		RecentRetention:     0.85,
		RecentProgress:      0.7,
		PredictedFatigue:    0.3,
		MotivationLevel:     0.9,
		Timestamp:           time.Now(),
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_, err := usa.SelectSessionStrategy(ctx, contextFeatures)
		if err != nil {
			b.Fatalf("Strategy selection failed: %v", err)
		}
	}
}

// BenchmarkContextualBanditRewardUpdate benchmarks reward update performance
func BenchmarkContextualBanditRewardUpdate(b *testing.B) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	usa := NewUnifiedScoringAlgorithm(log)

	contextFeatures := ContextFeatures{
		AvailableTime:  30,
		RecentAccuracy: 0.7,
		Timestamp:      time.Now(),
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		err := usa.UpdateSessionReward(ctx, "practice", contextFeatures, 0.8, "benchmark_session")
		if err != nil {
			b.Fatalf("Reward update failed: %v", err)
		}
	}
}
