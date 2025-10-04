package algorithms

import (
	"context"
	"testing"
	"time"

	"scheduler-service/internal/config"
	"scheduler-service/internal/logger"
)

func TestNewUnifiedScoringAlgorithm(t *testing.T) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	// Test default weights sum to 1.0
	totalWeight := usa.WeightUrgency + usa.WeightMastery + usa.WeightDifficulty + usa.WeightExploration
	if totalWeight < 0.99 || totalWeight > 1.01 {
		t.Errorf("Expected weights to sum to 1.0, got %.3f", totalWeight)
	}

	// Test default strategies are initialized
	if len(usa.ScoringStrategies) == 0 {
		t.Error("Expected scoring strategies to be initialized")
	}

	// Test default strategy exists
	if _, exists := usa.ScoringStrategies[usa.DefaultStrategy]; !exists {
		t.Errorf("Default strategy %s not found", usa.DefaultStrategy)
	}
}

func TestComputeUnifiedScore(t *testing.T) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	// Create test data
	candidate := &ItemCandidate{
		ItemID:         "test_item_1",
		Topics:         []string{"traffic_signs"},
		Difficulty:     0.5,
		Discrimination: 1.0,
		Guessing:       0.0,
		EstimatedTime:  60 * time.Second,
		AttemptCount:   2,
	}

	sm2State := &SM2State{
		EasinessFactor: 2.5,
		Interval:       7,
		Repetition:     2,
		NextDue:        time.Now().Add(-24 * time.Hour), // Overdue by 1 day
		LastReviewed:   time.Now().Add(-8 * 24 * time.Hour),
	}

	bktStates := map[string]*BKTState{
		"traffic_signs": {
			ProbKnowledge: 0.6,
			ProbGuess:     0.25,
			ProbSlip:      0.1,
			ProbLearn:     0.15,
			AttemptsCount: 5,
			CorrectCount:  3,
			LastUpdated:   time.Now().Add(-24 * time.Hour),
			Confidence:    0.7,
		},
	}

	irtStates := map[string]*IRTState{
		"traffic_signs": {
			Theta:         0.2,
			ThetaVariance: 0.5,
			Confidence:    0.8,
			AttemptsCount: 5,
			CorrectCount:  3,
			LastUpdated:   time.Now().Add(-24 * time.Hour),
		},
	}

	sessionContext := &SessionContext{
		SessionID:         "test_session",
		SessionType:       "practice",
		ElapsedTime:       10 * time.Minute,
		ItemsCompleted:    3,
		CorrectCount:      2,
		TopicsPracticed:   []string{"road_rules"},
		RecentItems:       []string{"item_1", "item_2"},
		AverageDifficulty: 0.4,
		TargetItemCount:   10,
		TimeRemaining:     20 * time.Minute,
	}

	ctx := context.Background()
	result, err := usa.ComputeUnifiedScore(ctx, candidate, sm2State, bktStates, irtStates, sessionContext, "balanced")

	if err != nil {
		t.Fatalf("ComputeUnifiedScore failed: %v", err)
	}

	// Test result structure
	if result.ItemID != candidate.ItemID {
		t.Errorf("Expected ItemID %s, got %s", candidate.ItemID, result.ItemID)
	}

	if result.Strategy != "balanced" {
		t.Errorf("Expected strategy 'balanced', got %s", result.Strategy)
	}

	// Test score is within bounds
	if result.UnifiedScore < 0.0 || result.UnifiedScore > 1.0 {
		t.Errorf("Unified score should be between 0 and 1, got %.3f", result.UnifiedScore)
	}

	// Test component scores are calculated
	if result.ComponentScores.UrgencyScore == 0.0 {
		t.Error("Expected non-zero urgency score for overdue item")
	}

	if result.ComponentScores.MasteryGapScore == 0.0 {
		t.Error("Expected non-zero mastery gap score")
	}

	if result.ComponentScores.DifficultyScore == 0.0 {
		t.Error("Expected non-zero difficulty score")
	}

	// Test constraints are checked
	if !result.Constraints.TimeConstraint {
		t.Error("Expected time constraint to be satisfied")
	}

	if !result.Constraints.RecentItemsOK {
		t.Error("Expected recent items constraint to be satisfied")
	}
}

func TestCalculateUrgencyScore(t *testing.T) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	currentTime := time.Now()

	tests := []struct {
		name     string
		sm2State *SM2State
		expected float64
		minScore float64
		maxScore float64
	}{
		{
			name:     "nil state",
			sm2State: nil,
			expected: 0.5,
			minScore: 0.4,
			maxScore: 0.6,
		},
		{
			name: "overdue item",
			sm2State: &SM2State{
				EasinessFactor: 2.5,
				Interval:       7,
				Repetition:     2,
				NextDue:        currentTime.Add(-24 * time.Hour),
				LastReviewed:   currentTime.Add(-8 * 24 * time.Hour),
			},
			minScore: 0.4,
			maxScore: 1.0,
		},
		{
			name: "not due item",
			sm2State: &SM2State{
				EasinessFactor: 2.5,
				Interval:       7,
				Repetition:     2,
				NextDue:        currentTime.Add(24 * time.Hour),
				LastReviewed:   currentTime.Add(-6 * 24 * time.Hour),
			},
			minScore: 0.0,
			maxScore: 0.4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := usa.calculateUrgencyScore(tt.sm2State, currentTime)

			if tt.expected != 0 {
				if score < tt.expected-0.1 || score > tt.expected+0.1 {
					t.Errorf("Expected score around %.2f, got %.3f", tt.expected, score)
				}
			} else {
				if score < tt.minScore || score > tt.maxScore {
					t.Errorf("Expected score between %.2f and %.2f, got %.3f", tt.minScore, tt.maxScore, score)
				}
			}
		})
	}
}

func TestCalculateMasteryGapScore(t *testing.T) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	tests := []struct {
		name      string
		topics    []string
		bktStates map[string]*BKTState
		minScore  float64
		maxScore  float64
	}{
		{
			name:     "no topics",
			topics:   []string{},
			minScore: 0.4,
			maxScore: 0.6,
		},
		{
			name:   "high mastery topic",
			topics: []string{"topic1"},
			bktStates: map[string]*BKTState{
				"topic1": {
					ProbKnowledge: 0.9,
					Confidence:    0.8,
				},
			},
			minScore: 0.0,
			maxScore: 0.3,
		},
		{
			name:   "low mastery topic",
			topics: []string{"topic1"},
			bktStates: map[string]*BKTState{
				"topic1": {
					ProbKnowledge: 0.2,
					Confidence:    0.7,
				},
			},
			minScore: 0.4,
			maxScore: 1.0,
		},
		{
			name:      "unknown topic",
			topics:    []string{"unknown_topic"},
			bktStates: map[string]*BKTState{},
			minScore:  0.3,
			maxScore:  0.5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := usa.calculateMasteryGapScore(tt.topics, tt.bktStates)

			if score < tt.minScore || score > tt.maxScore {
				t.Errorf("Expected score between %.2f and %.2f, got %.3f", tt.minScore, tt.maxScore, score)
			}
		})
	}
}

func TestCalculateDifficultyScore(t *testing.T) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	candidate := &ItemCandidate{
		Topics:         []string{"topic1"},
		Difficulty:     0.0, // Neutral difficulty
		Discrimination: 1.0,
	}

	tests := []struct {
		name      string
		irtStates map[string]*IRTState
		tolerance float64
		minScore  float64
		maxScore  float64
	}{
		{
			name: "optimal match",
			irtStates: map[string]*IRTState{
				"topic1": {
					Theta:      0.0, // Matches item difficulty
					Confidence: 0.8,
				},
			},
			tolerance: 0.3,
			minScore:  0.6,
			maxScore:  1.0,
		},
		{
			name: "poor match",
			irtStates: map[string]*IRTState{
				"topic1": {
					Theta:      2.0, // Much higher than item difficulty
					Confidence: 0.8,
				},
			},
			tolerance: 0.3,
			minScore:  0.0,
			maxScore:  0.9,
		},
		{
			name:      "unknown topic",
			irtStates: map[string]*IRTState{},
			tolerance: 0.3,
			minScore:  0.4,
			maxScore:  0.6,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := usa.calculateDifficultyScore(candidate, tt.irtStates, tt.tolerance)

			if score < tt.minScore || score > tt.maxScore {
				t.Errorf("Expected score between %.2f and %.2f, got %.3f", tt.minScore, tt.maxScore, score)
			}
		})
	}
}

func TestSessionConstraints(t *testing.T) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	sessionContext := &SessionContext{
		SessionID:         "test_session",
		ItemsCompleted:    5,
		TopicsPracticed:   []string{"topic1", "topic1", "topic2"},
		RecentItems:       []string{"item1", "item2", "item3"},
		TimeRemaining:     5 * time.Minute,
		AverageDifficulty: 0.5,
	}

	tests := []struct {
		name        string
		candidate   *ItemCandidate
		shouldPass  bool
		description string
	}{
		{
			name: "valid candidate",
			candidate: &ItemCandidate{
				ItemID:        "new_item",
				Topics:        []string{"topic3"},
				EstimatedTime: 2 * time.Minute,
			},
			shouldPass:  true,
			description: "should pass all constraints",
		},
		{
			name: "insufficient time",
			candidate: &ItemCandidate{
				ItemID:        "long_item",
				Topics:        []string{"topic3"},
				EstimatedTime: 10 * time.Minute,
			},
			shouldPass:  false,
			description: "should fail time constraint",
		},
		{
			name: "recent item",
			candidate: &ItemCandidate{
				ItemID:        "item2",
				Topics:        []string{"topic3"},
				EstimatedTime: 2 * time.Minute,
			},
			shouldPass:  false,
			description: "should fail recent items constraint",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			constraints := &ConstraintResults{}
			passed := usa.checkSessionConstraints(tt.candidate, sessionContext, constraints)

			if passed != tt.shouldPass {
				t.Errorf("Expected constraint check to return %v, got %v: %s", tt.shouldPass, passed, tt.description)
			}

			if !passed && constraints.ConstraintViolation == "" {
				t.Error("Expected constraint violation message when constraints fail")
			}
		})
	}
}

func TestScoringStrategies(t *testing.T) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	// Test getting existing strategy
	strategy, exists := usa.GetScoringStrategy("balanced")
	if !exists {
		t.Error("Expected 'balanced' strategy to exist")
	}

	if strategy.Name != "balanced" {
		t.Errorf("Expected strategy name 'balanced', got %s", strategy.Name)
	}

	// Test getting non-existent strategy
	_, exists = usa.GetScoringStrategy("nonexistent")
	if exists {
		t.Error("Expected 'nonexistent' strategy to not exist")
	}

	// Test adding new strategy
	newStrategy := ScoringStrategy{
		Name:        "test_strategy",
		Description: "Test strategy",
		Weights: ScoringWeights{
			Urgency:     0.25,
			Mastery:     0.25,
			Difficulty:  0.25,
			Exploration: 0.25,
		},
		Parameters: ScoringParameters{
			ExplorationRate:     0.2,
			NoveltyWeight:       0.1,
			VarietyWeight:       0.1,
			DifficultyTolerance: 0.3,
		},
	}

	err := usa.AddScoringStrategy(newStrategy)
	if err != nil {
		t.Errorf("Failed to add new strategy: %v", err)
	}

	// Verify strategy was added
	retrievedStrategy, exists := usa.GetScoringStrategy("test_strategy")
	if !exists {
		t.Error("Expected newly added strategy to exist")
	}

	if retrievedStrategy.Name != "test_strategy" {
		t.Errorf("Expected strategy name 'test_strategy', got %s", retrievedStrategy.Name)
	}

	// Test adding strategy with invalid weights
	invalidStrategy := ScoringStrategy{
		Name: "invalid_strategy",
		Weights: ScoringWeights{
			Urgency:     0.5,
			Mastery:     0.5,
			Difficulty:  0.5,
			Exploration: 0.5, // Total = 2.0, should fail
		},
	}

	err = usa.AddScoringStrategy(invalidStrategy)
	if err == nil {
		t.Error("Expected error when adding strategy with invalid weights")
	}
}

func TestUpdateWeights(t *testing.T) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	// Test valid weights
	validWeights := ScoringWeights{
		Urgency:     0.4,
		Mastery:     0.3,
		Difficulty:  0.2,
		Exploration: 0.1,
	}

	err := usa.UpdateWeights(validWeights)
	if err != nil {
		t.Errorf("Failed to update valid weights: %v", err)
	}

	if usa.WeightUrgency != 0.4 {
		t.Errorf("Expected urgency weight 0.4, got %.2f", usa.WeightUrgency)
	}

	// Test invalid weights
	invalidWeights := ScoringWeights{
		Urgency:     0.5,
		Mastery:     0.5,
		Difficulty:  0.5,
		Exploration: 0.5, // Total = 2.0
	}

	err = usa.UpdateWeights(invalidWeights)
	if err == nil {
		t.Error("Expected error when updating with invalid weights")
	}
}

func TestValidateConfiguration(t *testing.T) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	// Test valid configuration
	err := usa.ValidateConfiguration()
	if err != nil {
		t.Errorf("Valid configuration should pass validation: %v", err)
	}

	// Test invalid weights
	usa.WeightUrgency = 0.5
	usa.WeightMastery = 0.5
	usa.WeightDifficulty = 0.5
	usa.WeightExploration = 0.5 // Total = 2.0

	err = usa.ValidateConfiguration()
	if err == nil {
		t.Error("Expected validation error for invalid weights")
	}

	// Reset to valid weights
	usa.WeightUrgency = 0.3
	usa.WeightMastery = 0.35
	usa.WeightDifficulty = 0.25
	usa.WeightExploration = 0.1

	// Test invalid exploration rates
	usa.MinExplorationRate = 0.3
	usa.MaxExplorationRate = 0.2

	err = usa.ValidateConfiguration()
	if err == nil {
		t.Error("Expected validation error for invalid exploration rates")
	}

	// Reset to valid exploration rates
	usa.MinExplorationRate = 0.05
	usa.MaxExplorationRate = 0.25

	// Test invalid session time
	usa.MaxSessionTime = -1 * time.Minute

	err = usa.ValidateConfiguration()
	if err == nil {
		t.Error("Expected validation error for negative session time")
	}
}

func TestGetUnifiedScoringAnalytics(t *testing.T) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	analytics := usa.GetAnalytics()

	// Test that analytics contains expected keys
	expectedKeys := []string{"weights", "constraints", "exploration", "ab_testing"}
	for _, key := range expectedKeys {
		if _, exists := analytics[key]; !exists {
			t.Errorf("Expected analytics to contain key '%s'", key)
		}
	}

	// Test weights section
	weights, ok := analytics["weights"].(map[string]float64)
	if !ok {
		t.Error("Expected weights to be map[string]float64")
	}

	if len(weights) != 4 {
		t.Errorf("Expected 4 weight values, got %d", len(weights))
	}

	// Test constraints section
	constraints, ok := analytics["constraints"].(map[string]interface{})
	if !ok {
		t.Error("Expected constraints to be map[string]interface{}")
	}

	if len(constraints) == 0 {
		t.Error("Expected constraints to contain values")
	}
}

func BenchmarkComputeUnifiedScore(b *testing.B) {
	cfg := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(cfg)
	usa := NewUnifiedScoringAlgorithm(log)

	candidate := &ItemCandidate{
		ItemID:         "bench_item",
		Topics:         []string{"topic1", "topic2"},
		Difficulty:     0.5,
		Discrimination: 1.0,
		EstimatedTime:  60 * time.Second,
		AttemptCount:   3,
	}

	sm2State := &SM2State{
		EasinessFactor: 2.5,
		Interval:       7,
		Repetition:     2,
		NextDue:        time.Now().Add(-24 * time.Hour),
		LastReviewed:   time.Now().Add(-8 * 24 * time.Hour),
	}

	bktStates := map[string]*BKTState{
		"topic1": {ProbKnowledge: 0.6, Confidence: 0.7},
		"topic2": {ProbKnowledge: 0.4, Confidence: 0.6},
	}

	irtStates := map[string]*IRTState{
		"topic1": {Theta: 0.2, Confidence: 0.8},
		"topic2": {Theta: -0.1, Confidence: 0.7},
	}

	sessionContext := &SessionContext{
		SessionID:       "bench_session",
		SessionType:     "practice",
		ItemsCompleted:  5,
		TimeRemaining:   20 * time.Minute,
		TargetItemCount: 15,
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := usa.ComputeUnifiedScore(ctx, candidate, sm2State, bktStates, irtStates, sessionContext, "balanced")
		if err != nil {
			b.Fatalf("ComputeUnifiedScore failed: %v", err)
		}
	}
}
