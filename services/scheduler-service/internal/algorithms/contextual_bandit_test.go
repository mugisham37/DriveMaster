package algorithms

import (
	"context"
	"testing"
	"time"

	"scheduler-service/internal/logger"
)

// mockLogger is a simple mock logger for testing
type mockLogger struct{}

func (m *mockLogger) WithContext(ctx context.Context) *logger.Logger { return &logger.Logger{} }
func (m *mockLogger) WithFields(fields map[string]interface{}) *logger.Logger {
	return &logger.Logger{}
}
func (m *mockLogger) WithError(err error) *logger.Logger                     { return &logger.Logger{} }
func (m *mockLogger) WithField(key string, value interface{}) *logger.Logger { return &logger.Logger{} }
func (m *mockLogger) Debug(args ...interface{})                              {}
func (m *mockLogger) Info(args ...interface{})                               {}
func (m *mockLogger) Warn(args ...interface{})                               {}
func (m *mockLogger) Error(args ...interface{})                              {}

func newMockLogger() *logger.Logger {
	return &logger.Logger{}
}

func TestNewContextualBandit(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing

	tests := []struct {
		name      string
		algorithm BanditAlgorithm
	}{
		{
			name:      "Thompson Sampling",
			algorithm: ThompsonSampling,
		},
		{
			name:      "LinUCB",
			algorithm: LinUCB,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bandit := NewContextualBandit(tt.algorithm, log)

			if bandit.Algorithm != tt.algorithm {
				t.Errorf("Expected algorithm %s, got %s", tt.algorithm, bandit.Algorithm)
			}

			if len(bandit.Strategies) == 0 {
				t.Error("Expected default strategies to be initialized")
			}

			// Check that default strategies are present
			expectedStrategies := []string{"practice", "review", "mock_test", "exploration", "intensive"}
			for _, strategy := range expectedStrategies {
				if _, exists := bandit.Strategies[strategy]; !exists {
					t.Errorf("Expected default strategy %s to be present", strategy)
				}
			}

			// Check algorithm-specific state initialization
			switch tt.algorithm {
			case ThompsonSampling:
				if len(bandit.ThompsonState) != len(bandit.Strategies) {
					t.Error("Thompson sampling state not initialized for all strategies")
				}
			case LinUCB:
				if len(bandit.LinUCBState) != len(bandit.Strategies) {
					t.Error("LinUCB state not initialized for all strategies")
				}
			}
		})
	}
}

func TestSelectStrategy(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	tests := []struct {
		name      string
		algorithm BanditAlgorithm
		context   ContextFeatures
	}{
		{
			name:      "Thompson Sampling with sufficient time",
			algorithm: ThompsonSampling,
			context: ContextFeatures{
				AvailableTime:     30,
				RecentAccuracy:    0.7,
				DueItemsCount:     5,
				MasteryGapSum:     2.0,
				TimeOfDay:         14,
				DayOfWeek:         2,
				UserTotalSessions: 20,
				Timestamp:         time.Now(),
			},
		},
		{
			name:      "LinUCB with limited time",
			algorithm: LinUCB,
			context: ContextFeatures{
				AvailableTime:     15,
				RecentAccuracy:    0.5,
				DueItemsCount:     10,
				MasteryGapSum:     3.5,
				TimeOfDay:         9,
				DayOfWeek:         1,
				UserTotalSessions: 5,
				Timestamp:         time.Now(),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bandit := NewContextualBandit(tt.algorithm, log)

			selection, err := bandit.SelectStrategy(ctx, tt.context)
			if err != nil {
				t.Fatalf("SelectStrategy failed: %v", err)
			}

			if selection == nil {
				t.Fatal("Expected selection to be non-nil")
			}

			if selection.Strategy == "" {
				t.Error("Expected strategy to be selected")
			}

			if _, exists := bandit.Strategies[selection.Strategy]; !exists {
				t.Errorf("Selected strategy %s does not exist", selection.Strategy)
			}

			if selection.ExpectedReward < 0 || selection.ExpectedReward > 1 {
				t.Errorf("Expected reward should be between 0 and 1, got %f", selection.ExpectedReward)
			}

			if selection.Confidence < 0 || selection.Confidence > 1 {
				t.Errorf("Confidence should be between 0 and 1, got %f", selection.Confidence)
			}

			if selection.Reason == "" {
				t.Error("Expected reason to be provided")
			}
		})
	}
}

func TestSelectStrategyWithTimeConstraints(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	bandit := NewContextualBandit(ThompsonSampling, log)

	// Test with very limited time (should only allow short strategies)
	context := ContextFeatures{
		AvailableTime:  5, // Very short time
		RecentAccuracy: 0.7,
		Timestamp:      time.Now(),
	}

	_, err := bandit.SelectStrategy(ctx, context)
	if err == nil {
		t.Error("Expected error when no strategy fits time constraints")
	}
}

func TestUpdateReward(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	tests := []struct {
		name      string
		algorithm BanditAlgorithm
	}{
		{
			name:      "Thompson Sampling reward update",
			algorithm: ThompsonSampling,
		},
		{
			name:      "LinUCB reward update",
			algorithm: LinUCB,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bandit := NewContextualBandit(tt.algorithm, log)

			contextFeatures := ContextFeatures{
				AvailableTime:     30,
				RecentAccuracy:    0.7,
				DueItemsCount:     5,
				UserTotalSessions: 10,
				Timestamp:         time.Now(),
			}

			strategyName := "practice"
			reward := 0.8
			sessionID := "test_session_1"

			err := bandit.UpdateReward(ctx, strategyName, contextFeatures, reward, sessionID)
			if err != nil {
				t.Fatalf("UpdateReward failed: %v", err)
			}

			// Check that reward was recorded
			if len(bandit.RewardHistory[strategyName]) == 0 {
				t.Error("Expected reward to be recorded in history")
			}

			observation := bandit.RewardHistory[strategyName][0]
			if observation.Reward != reward {
				t.Errorf("Expected reward %f, got %f", reward, observation.Reward)
			}

			if observation.SessionID != sessionID {
				t.Errorf("Expected session ID %s, got %s", sessionID, observation.SessionID)
			}

			// Check algorithm-specific state updates
			switch tt.algorithm {
			case ThompsonSampling:
				state := bandit.ThompsonState[strategyName]
				if state.Count != 1 {
					t.Errorf("Expected count to be 1, got %d", state.Count)
				}
				if state.SuccessSum != reward {
					t.Errorf("Expected success sum %f, got %f", reward, state.SuccessSum)
				}
			case LinUCB:
				state := bandit.LinUCBState[strategyName]
				if state.Count != 1 {
					t.Errorf("Expected count to be 1, got %d", state.Count)
				}
			}
		})
	}
}

func TestUpdateRewardInvalidStrategy(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	bandit := NewContextualBandit(ThompsonSampling, log)

	contextFeatures := ContextFeatures{
		AvailableTime: 30,
		Timestamp:     time.Now(),
	}

	err := bandit.UpdateReward(ctx, "invalid_strategy", contextFeatures, 0.8, "session_1")
	if err == nil {
		t.Error("Expected error for invalid strategy")
	}
}

func TestGetExplorationBonus(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing

	bandit := NewContextualBandit(ThompsonSampling, log)

	item := &ItemCandidate{
		ItemID:     "test_item",
		Topics:     []string{"traffic_signs"},
		Difficulty: 0.5,
	}

	sessionContext := &SessionContext{
		SessionID:      "test_session",
		SessionType:    "practice",
		ItemsCompleted: 5,
		CorrectCount:   3,
		TimeRemaining:  30 * time.Minute,
	}

	bonus := bandit.GetExplorationBonus(item, sessionContext)

	if bonus < 0 || bonus > 1 {
		t.Errorf("Exploration bonus should be between 0 and 1, got %f", bonus)
	}
}

func TestGetPerformanceMetrics(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	bandit := NewContextualBandit(ThompsonSampling, log)

	// Add some reward history
	contextFeatures := ContextFeatures{
		AvailableTime: 30,
		Timestamp:     time.Now(),
	}

	_ = bandit.UpdateReward(ctx, "practice", contextFeatures, 0.8, "session_1")
	_ = bandit.UpdateReward(ctx, "review", contextFeatures, 0.6, "session_2")

	metrics := bandit.GetPerformanceMetrics()

	if metrics == nil {
		t.Fatal("Expected metrics to be non-nil")
	}

	if metrics["algorithm"] != ThompsonSampling {
		t.Errorf("Expected algorithm %s, got %v", ThompsonSampling, metrics["algorithm"])
	}

	if metrics["total_strategies"] != len(bandit.Strategies) {
		t.Errorf("Expected %d strategies, got %v", len(bandit.Strategies), metrics["total_strategies"])
	}

	strategyMetrics, ok := metrics["strategies"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected strategy metrics to be present")
	}

	practiceMetrics, ok := strategyMetrics["practice"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected practice strategy metrics")
	}

	if practiceMetrics["total_selections"] != 1 {
		t.Errorf("Expected 1 selection for practice, got %v", practiceMetrics["total_selections"])
	}
}

func TestAddRemoveStrategy(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing

	bandit := NewContextualBandit(ThompsonSampling, log)

	// Test adding a new strategy
	newStrategy := &Strategy{
		Name:        "custom_strategy",
		Description: "Custom test strategy",
		MinDuration: 20,
		MaxDuration: 40,
		Difficulty:  0.6,
		Variety:     0.5,
		Urgency:     0.4,
		Mastery:     0.7,
	}

	err := bandit.AddStrategy(newStrategy)
	if err != nil {
		t.Fatalf("AddStrategy failed: %v", err)
	}

	if _, exists := bandit.Strategies["custom_strategy"]; !exists {
		t.Error("Expected new strategy to be added")
	}

	// Test adding duplicate strategy
	err = bandit.AddStrategy(newStrategy)
	if err == nil {
		t.Error("Expected error when adding duplicate strategy")
	}

	// Test removing strategy
	err = bandit.RemoveStrategy("custom_strategy")
	if err != nil {
		t.Fatalf("RemoveStrategy failed: %v", err)
	}

	if _, exists := bandit.Strategies["custom_strategy"]; exists {
		t.Error("Expected strategy to be removed")
	}

	// Test removing non-existent strategy
	err = bandit.RemoveStrategy("non_existent")
	if err == nil {
		t.Error("Expected error when removing non-existent strategy")
	}
}

func TestGetStrategy(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing

	bandit := NewContextualBandit(ThompsonSampling, log)

	// Test getting existing strategy
	strategy, exists := bandit.GetStrategy("practice")
	if !exists {
		t.Error("Expected practice strategy to exist")
	}

	if strategy.Name != "practice" {
		t.Errorf("Expected strategy name 'practice', got %s", strategy.Name)
	}

	// Test getting non-existent strategy
	_, exists = bandit.GetStrategy("non_existent")
	if exists {
		t.Error("Expected non-existent strategy to not exist")
	}
}

func TestListStrategies(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing

	bandit := NewContextualBandit(ThompsonSampling, log)

	strategies := bandit.ListStrategies()

	if len(strategies) != len(bandit.Strategies) {
		t.Errorf("Expected %d strategies, got %d", len(bandit.Strategies), len(strategies))
	}

	for name := range bandit.Strategies {
		if _, exists := strategies[name]; !exists {
			t.Errorf("Expected strategy %s to be in list", name)
		}
	}
}

func TestReset(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	bandit := NewContextualBandit(ThompsonSampling, log)

	// Add some history
	contextFeatures := ContextFeatures{
		AvailableTime: 30,
		Timestamp:     time.Now(),
	}

	_ = bandit.UpdateReward(ctx, "practice", contextFeatures, 0.8, "session_1")

	// Verify history exists
	if len(bandit.RewardHistory["practice"]) == 0 {
		t.Error("Expected reward history to exist before reset")
	}

	// Reset
	bandit.Reset()

	// Verify history is cleared
	if len(bandit.RewardHistory["practice"]) != 0 {
		t.Error("Expected reward history to be cleared after reset")
	}

	if len(bandit.ContextHistory) != 0 {
		t.Error("Expected context history to be cleared after reset")
	}

	// Verify states are reinitialized
	if len(bandit.ThompsonState) != len(bandit.Strategies) {
		t.Error("Expected Thompson state to be reinitialized for all strategies")
	}
}

func TestContextToVector(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing

	bandit := NewContextualBandit(LinUCB, log)

	context := ContextFeatures{
		UserAbilityMean:     0.7,
		UserAbilityVariance: 0.2,
		UserMasteryMean:     0.8,
		UserMasteryVariance: 0.1,
		UserStreakDays:      5,
		UserTotalSessions:   25,
		TimeOfDay:           14,
		DayOfWeek:           2,
		SessionNumber:       2,
		AvailableTime:       30,
		RecentAccuracy:      0.75,
		RecentDifficulty:    0.6,
		DueItemsCount:       8,
		OverdueItemsCount:   3,
		MasteryGapSum:       2.5,
	}

	vector := bandit.contextToVector(context)

	if len(vector) != bandit.ContextDimension {
		t.Errorf("Expected vector length %d, got %d", bandit.ContextDimension, len(vector))
	}

	// Check that values are normalized appropriately
	for i, val := range vector {
		if val < 0 || val > 2 { // Allow some flexibility for normalization
			t.Errorf("Vector element %d should be normalized, got %f", i, val)
		}
	}
}

func TestCalculateContextAdjustment(t *testing.T) {
	var log *logger.Logger // Use nil logger for testing

	bandit := NewContextualBandit(ThompsonSampling, log)

	strategy := bandit.Strategies["practice"]

	tests := []struct {
		name     string
		context  ContextFeatures
		expected string // "low", "medium", "high" for relative adjustment
	}{
		{
			name: "Insufficient time",
			context: ContextFeatures{
				AvailableTime: 5, // Less than strategy minimum
			},
			expected: "zero", // Should return 0
		},
		{
			name: "Perfect fit",
			context: ContextFeatures{
				AvailableTime:  30,
				RecentAccuracy: 0.7,
				DueItemsCount:  5,
			},
			expected: "medium",
		},
		{
			name: "High fatigue",
			context: ContextFeatures{
				AvailableTime:    30,
				PredictedFatigue: 0.8,
			},
			expected: "low", // Should prefer easier strategies
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adjustment := bandit.calculateContextAdjustment(tt.context, strategy)

			switch tt.expected {
			case "zero":
				if adjustment != 0.0 {
					t.Errorf("Expected zero adjustment, got %f", adjustment)
				}
			case "low":
				if adjustment >= 1.0 {
					t.Errorf("Expected low adjustment (< 1.0), got %f", adjustment)
				}
			case "medium":
				if adjustment < 0.8 || adjustment > 1.2 {
					t.Errorf("Expected medium adjustment (0.8-1.2), got %f", adjustment)
				}
			case "high":
				if adjustment <= 1.0 {
					t.Errorf("Expected high adjustment (> 1.0), got %f", adjustment)
				}
			}
		})
	}
}

func BenchmarkSelectStrategy(b *testing.B) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	bandit := NewContextualBandit(ThompsonSampling, log)

	contextFeatures := ContextFeatures{
		AvailableTime:     30,
		RecentAccuracy:    0.7,
		DueItemsCount:     5,
		UserTotalSessions: 20,
		Timestamp:         time.Now(),
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_, err := bandit.SelectStrategy(ctx, contextFeatures)
		if err != nil {
			b.Fatalf("SelectStrategy failed: %v", err)
		}
	}
}

func BenchmarkUpdateReward(b *testing.B) {
	var log *logger.Logger // Use nil logger for testing
	ctx := context.Background()

	bandit := NewContextualBandit(LinUCB, log)

	contextFeatures := ContextFeatures{
		AvailableTime: 30,
		Timestamp:     time.Now(),
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		err := bandit.UpdateReward(ctx, "practice", contextFeatures, 0.8, "session")
		if err != nil {
			b.Fatalf("UpdateReward failed: %v", err)
		}
	}
}
