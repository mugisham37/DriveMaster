package algorithms

import (
	"math"
	"testing"
	"time"
)

func TestNewIRTAlgorithm(t *testing.T) {
	irt := NewIRTAlgorithm()

	if irt.Model != "2PL" {
		t.Errorf("Expected model to be 2PL, got %s", irt.Model)
	}

	if irt.DefaultDiscrimination != 1.0 {
		t.Errorf("Expected default discrimination to be 1.0, got %f", irt.DefaultDiscrimination)
	}

	if irt.PriorMean != 0.0 {
		t.Errorf("Expected prior mean to be 0.0, got %f", irt.PriorMean)
	}

	if irt.PriorVariance != 1.0 {
		t.Errorf("Expected prior variance to be 1.0, got %f", irt.PriorVariance)
	}
}

func TestIRTInitializeState(t *testing.T) {
	irt := NewIRTAlgorithm()
	state := irt.InitializeState("driving_rules")

	if state.Theta != 0.0 {
		t.Errorf("Expected initial theta to be 0.0, got %f", state.Theta)
	}

	if state.ThetaVariance != 1.0 {
		t.Errorf("Expected initial theta variance to be 1.0, got %f", state.ThetaVariance)
	}

	if state.AttemptsCount != 0 {
		t.Errorf("Expected initial attempts count to be 0, got %d", state.AttemptsCount)
	}

	if state.CorrectCount != 0 {
		t.Errorf("Expected initial correct count to be 0, got %d", state.CorrectCount)
	}

	if state.Confidence < irt.MinConfidence {
		t.Errorf("Expected confidence to be at least %f, got %f", irt.MinConfidence, state.Confidence)
	}
}

func TestCalculate1PL(t *testing.T) {
	irt := NewIRTAlgorithm()

	// Test cases: theta, difficulty, expected probability (approximately)
	testCases := []struct {
		theta      float64
		difficulty float64
		expected   float64
		tolerance  float64
	}{
		{0.0, 0.0, 0.5, 0.01},    // Equal ability and difficulty should give 50%
		{1.0, 0.0, 0.731, 0.01},  // Higher ability should give higher probability
		{0.0, 1.0, 0.269, 0.01},  // Higher difficulty should give lower probability
		{-1.0, 0.0, 0.269, 0.01}, // Lower ability should give lower probability
	}

	for _, tc := range testCases {
		prob := irt.calculate1PL(tc.theta, tc.difficulty)
		if math.Abs(prob-tc.expected) > tc.tolerance {
			t.Errorf("1PL: theta=%f, difficulty=%f, expected=%f, got=%f",
				tc.theta, tc.difficulty, tc.expected, prob)
		}
	}
}

func TestCalculate2PL(t *testing.T) {
	irt := NewIRTAlgorithm()

	// Test with discrimination = 1.0 (should match 1PL)
	prob1PL := irt.calculate1PL(1.0, 0.0)
	prob2PL := irt.calculate2PL(1.0, 0.0, 1.0)

	if math.Abs(prob1PL-prob2PL) > 0.001 {
		t.Errorf("2PL with discrimination=1.0 should match 1PL: %f vs %f", prob1PL, prob2PL)
	}

	// Test discrimination effect
	probLowDisc := irt.calculate2PL(1.0, 0.0, 0.5)  // Lower discrimination
	probHighDisc := irt.calculate2PL(1.0, 0.0, 2.0) // Higher discrimination

	// Higher discrimination should amplify the difference from 0.5
	if math.Abs(probHighDisc-0.5) <= math.Abs(probLowDisc-0.5) {
		t.Errorf("Higher discrimination should amplify probability difference")
	}
}

func TestCalculate3PL(t *testing.T) {
	irt := NewIRTAlgorithm()

	// Test with guessing = 0.0 (should match 2PL)
	prob2PL := irt.calculate2PL(1.0, 0.0, 1.0)
	prob3PL := irt.calculate3PL(1.0, 0.0, 1.0, 0.0)

	if math.Abs(prob2PL-prob3PL) > 0.001 {
		t.Errorf("3PL with guessing=0.0 should match 2PL: %f vs %f", prob2PL, prob3PL)
	}

	// Test guessing effect - even with very low ability, probability should be at least guessing level
	probWithGuessing := irt.calculate3PL(-5.0, 0.0, 1.0, 0.25)
	if probWithGuessing < 0.25 {
		t.Errorf("Probability with guessing should be at least 0.25, got %f", probWithGuessing)
	}
}

func TestCalculateInformation(t *testing.T) {
	irt := NewIRTAlgorithm()
	itemParams := &ItemParameters{
		Difficulty:     0.0,
		Discrimination: 1.0,
		Guessing:       0.0,
	}

	// Information should be maximized when theta equals difficulty
	infoAtDifficulty := irt.calculateInformation(0.0, itemParams)
	infoAwayFromDifficulty := irt.calculateInformation(2.0, itemParams)

	if infoAtDifficulty <= infoAwayFromDifficulty {
		t.Errorf("Information should be maximized at difficulty level")
	}

	// Information should be positive
	if infoAtDifficulty <= 0 {
		t.Errorf("Information should be positive, got %f", infoAtDifficulty)
	}
}

func TestUpdateAbility(t *testing.T) {
	irt := NewIRTAlgorithm()
	state := irt.InitializeState("test_topic")

	itemParams := &ItemParameters{
		Difficulty:     0.0,
		Discrimination: 1.0,
		Guessing:       0.0,
	}

	// Test correct response - should increase ability
	newState := irt.UpdateAbility(state, itemParams, true)

	if newState.Theta <= state.Theta {
		t.Errorf("Correct response should increase ability: %f -> %f", state.Theta, newState.Theta)
	}

	if newState.AttemptsCount != 1 {
		t.Errorf("Attempts count should be 1, got %d", newState.AttemptsCount)
	}

	if newState.CorrectCount != 1 {
		t.Errorf("Correct count should be 1, got %d", newState.CorrectCount)
	}

	// Test incorrect response - should decrease ability
	incorrectState := irt.UpdateAbility(state, itemParams, false)

	if incorrectState.Theta >= state.Theta {
		t.Errorf("Incorrect response should decrease ability: %f -> %f", state.Theta, incorrectState.Theta)
	}

	if incorrectState.CorrectCount != 0 {
		t.Errorf("Correct count should remain 0, got %d", incorrectState.CorrectCount)
	}
}

func TestGetDifficultyMatch(t *testing.T) {
	irt := NewIRTAlgorithm()
	state := &IRTState{
		Theta:         1.0,
		ThetaVariance: 0.5,
		Confidence:    0.8,
	}

	// Item at optimal difficulty should have high match
	optimalItem := &ItemParameters{
		Difficulty:     irt.GetOptimalDifficulty(state, 1.0),
		Discrimination: 1.0,
		Guessing:       0.0,
	}

	optimalMatch := irt.GetDifficultyMatch(state, optimalItem)

	// Item far from optimal difficulty should have lower match
	hardItem := &ItemParameters{
		Difficulty:     3.0,
		Discrimination: 1.0,
		Guessing:       0.0,
	}

	hardMatch := irt.GetDifficultyMatch(state, hardItem)

	if optimalMatch <= hardMatch {
		t.Errorf("Optimal difficulty should have better match than hard item: %f vs %f",
			optimalMatch, hardMatch)
	}
}

func TestGetOptimalDifficulty(t *testing.T) {
	irt := NewIRTAlgorithm()
	state := &IRTState{
		Theta:         1.5,
		ThetaVariance: 0.5,
		Confidence:    0.8,
	}

	optimalDifficulty := irt.GetOptimalDifficulty(state, 1.0)

	// Calculate probability at optimal difficulty
	itemParams := &ItemParameters{
		Difficulty:     optimalDifficulty,
		Discrimination: 1.0,
		Guessing:       0.0,
	}

	prob := irt.calculateProbability(state.Theta, itemParams)

	// Should be close to target correctness (0.75)
	if math.Abs(prob-irt.OptimalCorrectness) > 0.05 {
		t.Errorf("Optimal difficulty should give target correctness %f, got %f",
			irt.OptimalCorrectness, prob)
	}
}

func TestEstimateAbilityFromPlacement(t *testing.T) {
	irt := NewIRTAlgorithm()

	// Create placement test with known items
	responses := []bool{true, true, false, true, false}
	itemParams := []*ItemParameters{
		{Difficulty: -1.0, Discrimination: 1.0, Guessing: 0.0},
		{Difficulty: 0.0, Discrimination: 1.0, Guessing: 0.0},
		{Difficulty: 1.0, Discrimination: 1.0, Guessing: 0.0},
		{Difficulty: 0.5, Discrimination: 1.0, Guessing: 0.0},
		{Difficulty: 1.5, Discrimination: 1.0, Guessing: 0.0},
	}

	state, err := irt.EstimateAbilityFromPlacement(responses, itemParams)
	if err != nil {
		t.Fatalf("Failed to estimate ability from placement: %v", err)
	}

	// Should have reasonable ability estimate (not at extremes)
	if state.Theta < -3.0 || state.Theta > 3.0 {
		t.Errorf("Ability estimate seems extreme: %f", state.Theta)
	}

	// Should have correct counts
	if state.AttemptsCount != 5 {
		t.Errorf("Expected 5 attempts, got %d", state.AttemptsCount)
	}

	if state.CorrectCount != 3 {
		t.Errorf("Expected 3 correct, got %d", state.CorrectCount)
	}

	// Confidence should be reasonable
	if state.Confidence < 0.1 || state.Confidence > 0.95 {
		t.Errorf("Confidence seems unreasonable: %f", state.Confidence)
	}
}

func TestApplyTimeDecay(t *testing.T) {
	irt := NewIRTAlgorithm()

	// Create state from 10 days ago
	pastTime := time.Now().AddDate(0, 0, -10)
	state := &IRTState{
		Theta:         1.0,
		ThetaVariance: 0.5,
		Confidence:    0.8,
		LastUpdated:   pastTime,
	}

	decayedState := irt.ApplyTimeDecay(state, time.Now())

	// Confidence should have decayed
	if decayedState.Confidence >= state.Confidence {
		t.Errorf("Confidence should decay over time: %f -> %f",
			state.Confidence, decayedState.Confidence)
	}

	// Variance should have increased (less certainty)
	if decayedState.ThetaVariance <= state.ThetaVariance {
		t.Errorf("Variance should increase over time: %f -> %f",
			state.ThetaVariance, decayedState.ThetaVariance)
	}

	// Theta should remain the same
	if decayedState.Theta != state.Theta {
		t.Errorf("Theta should not change with time decay: %f -> %f",
			state.Theta, decayedState.Theta)
	}
}

func TestCalibrateItemParameters(t *testing.T) {
	irt := NewIRTAlgorithm()

	// Create synthetic data where higher ability leads to more correct responses
	responses := []bool{false, false, true, true, true}
	abilities := []float64{-1.0, -0.5, 0.0, 0.5, 1.0}

	params := irt.CalibrateItemParameters(responses, abilities)

	// Should have reasonable parameters
	if params.Difficulty < -3.0 || params.Difficulty > 3.0 {
		t.Errorf("Calibrated difficulty seems extreme: %f", params.Difficulty)
	}

	if params.Discrimination <= 0 {
		t.Errorf("Discrimination should be positive: %f", params.Discrimination)
	}

	if params.AttemptsCount != 5 {
		t.Errorf("Expected 5 attempts, got %d", params.AttemptsCount)
	}

	if params.CorrectCount != 3 {
		t.Errorf("Expected 3 correct, got %d", params.CorrectCount)
	}
}

func TestGetConfidenceInterval(t *testing.T) {
	irt := NewIRTAlgorithm()
	state := &IRTState{
		Theta:         1.0,
		ThetaVariance: 0.25, // Standard error = 0.5
		Confidence:    0.8,
	}

	lower, upper := irt.GetConfidenceInterval(state, 0.95)

	// Should be centered around theta
	center := (lower + upper) / 2
	if math.Abs(center-state.Theta) > 0.01 {
		t.Errorf("Confidence interval should be centered around theta: %f vs %f",
			center, state.Theta)
	}

	// Should have reasonable width (approximately 1.96 * 0.5 * 2 = 1.96)
	width := upper - lower
	expectedWidth := 1.96 * math.Sqrt(state.ThetaVariance) * 2
	if math.Abs(width-expectedWidth) > 0.1 {
		t.Errorf("Confidence interval width unexpected: %f vs %f", width, expectedWidth)
	}
}

func TestGetRecommendationScore(t *testing.T) {
	irt := NewIRTAlgorithm()
	state := &IRTState{
		Theta:         1.0,
		ThetaVariance: 0.5,
		Confidence:    0.8,
	}

	// Optimal item should have high score
	optimalItem := &ItemParameters{
		Difficulty:     irt.GetOptimalDifficulty(state, 1.0),
		Discrimination: 1.0,
		Guessing:       0.0,
	}

	optimalScore := irt.GetRecommendationScore(state, optimalItem)

	// Very easy item should have lower score
	easyItem := &ItemParameters{
		Difficulty:     -2.0,
		Discrimination: 1.0,
		Guessing:       0.0,
	}

	easyScore := irt.GetRecommendationScore(state, easyItem)

	if optimalScore <= easyScore {
		t.Errorf("Optimal item should have higher recommendation score: %f vs %f",
			optimalScore, easyScore)
	}

	// Scores should be in [0, 1] range
	if optimalScore < 0 || optimalScore > 1 {
		t.Errorf("Recommendation score should be in [0,1]: %f", optimalScore)
	}
}

func TestIRTGetAnalytics(t *testing.T) {
	irt := NewIRTAlgorithm()
	state := &IRTState{
		Theta:         1.5,
		ThetaVariance: 0.25,
		Confidence:    0.85,
		AttemptsCount: 20,
		CorrectCount:  15,
		LastUpdated:   time.Now().AddDate(0, 0, -2),
		UpdateHistory: []float64{0.1, 0.05, -0.02, 0.03},
	}

	analytics := irt.GetAnalytics(state)

	// Check required fields
	requiredFields := []string{
		"theta", "theta_variance", "confidence", "attempts_count",
		"correct_count", "accuracy", "confidence_interval_95",
		"learning_trend", "days_since_update", "optimal_difficulty",
		"ability_percentile",
	}

	for _, field := range requiredFields {
		if _, exists := analytics[field]; !exists {
			t.Errorf("Analytics missing required field: %s", field)
		}
	}

	// Check accuracy calculation
	expectedAccuracy := 15.0 / 20.0
	if analytics["accuracy"] != expectedAccuracy {
		t.Errorf("Expected accuracy %f, got %v", expectedAccuracy, analytics["accuracy"])
	}

	// Check ability percentile is reasonable
	percentile := analytics["ability_percentile"].(float64)
	if percentile < 0 || percentile > 1 {
		t.Errorf("Ability percentile should be in [0,1]: %f", percentile)
	}
}
