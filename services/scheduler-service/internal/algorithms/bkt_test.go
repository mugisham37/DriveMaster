package algorithms

import (
	"math"
	"testing"
	"time"
)

func TestNewBKTAlgorithm(t *testing.T) {
	bkt := NewBKTAlgorithm()

	if bkt.DefaultProbGuess != 0.25 {
		t.Errorf("Expected DefaultProbGuess to be 0.25, got %f", bkt.DefaultProbGuess)
	}
	if bkt.DefaultProbSlip != 0.10 {
		t.Errorf("Expected DefaultProbSlip to be 0.10, got %f", bkt.DefaultProbSlip)
	}
	if bkt.DefaultProbLearn != 0.15 {
		t.Errorf("Expected DefaultProbLearn to be 0.15, got %f", bkt.DefaultProbLearn)
	}
	if bkt.MasteryThreshold != 0.85 {
		t.Errorf("Expected MasteryThreshold to be 0.85, got %f", bkt.MasteryThreshold)
	}
}

func TestBKTInitializeState(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	if state.ProbKnowledge != bkt.DefaultProbInit {
		t.Errorf("Expected ProbKnowledge to be %f, got %f", bkt.DefaultProbInit, state.ProbKnowledge)
	}
	if state.ProbGuess != bkt.DefaultProbGuess {
		t.Errorf("Expected ProbGuess to be %f, got %f", bkt.DefaultProbGuess, state.ProbGuess)
	}
	if state.AttemptsCount != 0 {
		t.Errorf("Expected AttemptsCount to be 0, got %d", state.AttemptsCount)
	}
	if state.CorrectCount != 0 {
		t.Errorf("Expected CorrectCount to be 0, got %d", state.CorrectCount)
	}
}

func TestBKTUpdateStateCorrectResponse(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")
	initialKnowledge := state.ProbKnowledge

	// Test correct response
	newState := bkt.UpdateState(state, true)

	if newState.AttemptsCount != 1 {
		t.Errorf("Expected AttemptsCount to be 1, got %d", newState.AttemptsCount)
	}
	if newState.CorrectCount != 1 {
		t.Errorf("Expected CorrectCount to be 1, got %d", newState.CorrectCount)
	}
	if newState.ProbKnowledge <= initialKnowledge {
		t.Errorf("Expected knowledge probability to increase after correct response")
	}
	if newState.ProbKnowledge < 0 || newState.ProbKnowledge > 1 {
		t.Errorf("Knowledge probability should be between 0 and 1, got %f", newState.ProbKnowledge)
	}
}

func TestBKTUpdateStateIncorrectResponse(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Set higher initial knowledge for testing
	state.ProbKnowledge = 0.7
	initialKnowledge := state.ProbKnowledge

	// Test incorrect response
	newState := bkt.UpdateState(state, false)

	if newState.AttemptsCount != 1 {
		t.Errorf("Expected AttemptsCount to be 1, got %d", newState.AttemptsCount)
	}
	if newState.CorrectCount != 0 {
		t.Errorf("Expected CorrectCount to be 0, got %d", newState.CorrectCount)
	}
	if newState.ProbKnowledge >= initialKnowledge {
		t.Errorf("Expected knowledge probability to decrease after incorrect response")
	}
	if newState.ProbKnowledge < 0 || newState.ProbKnowledge > 1 {
		t.Errorf("Knowledge probability should be between 0 and 1, got %f", newState.ProbKnowledge)
	}
}

func TestBKTLearningEffect(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Multiple correct responses should increase knowledge
	for i := 0; i < 5; i++ {
		state = bkt.UpdateState(state, true)
	}

	if state.ProbKnowledge <= bkt.DefaultProbInit {
		t.Errorf("Expected knowledge to increase after multiple correct responses")
	}
	if state.AttemptsCount != 5 {
		t.Errorf("Expected AttemptsCount to be 5, got %d", state.AttemptsCount)
	}
	if state.CorrectCount != 5 {
		t.Errorf("Expected CorrectCount to be 5, got %d", state.CorrectCount)
	}
}

func TestBKTMasteryDetection(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Set high knowledge and confidence
	state.ProbKnowledge = 0.9
	state.Confidence = 0.8

	if !bkt.IsMastered(state) {
		t.Errorf("Expected topic to be mastered with high knowledge and confidence")
	}

	// Test with low confidence
	state.Confidence = 0.5
	if bkt.IsMastered(state) {
		t.Errorf("Expected topic not to be mastered with low confidence")
	}
}

func TestBKTMasteryGap(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Test with low knowledge
	state.ProbKnowledge = 0.2
	state.Confidence = 0.8
	gap := bkt.GetMasteryGap(state)

	if gap <= 0 || gap > 1 {
		t.Errorf("Expected mastery gap to be between 0 and 1, got %f", gap)
	}

	// Test with mastered state
	state.ProbKnowledge = 0.9
	state.Confidence = 0.8
	gap = bkt.GetMasteryGap(state)

	if gap != 0 {
		t.Errorf("Expected mastery gap to be 0 for mastered topic, got %f", gap)
	}
}

func TestBKTPredictedCorrectness(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	predicted := bkt.GetPredictedCorrectness(state)

	// Should be between guess probability and 1-slip probability
	if predicted < state.ProbGuess || predicted > (1-state.ProbSlip) {
		t.Errorf("Predicted correctness %f should be between %f and %f",
			predicted, state.ProbGuess, 1-state.ProbSlip)
	}

	// Test with high knowledge
	state.ProbKnowledge = 0.9
	predicted = bkt.GetPredictedCorrectness(state)

	if predicted <= bkt.GetPredictedCorrectness(bkt.InitializeState("test")) {
		t.Errorf("Higher knowledge should lead to higher predicted correctness")
	}
}

func TestBKTTimeDecay(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Set some knowledge and update time to past
	state.ProbKnowledge = 0.7
	state.Confidence = 0.8
	state.LastUpdated = time.Now().AddDate(0, 0, -7) // 7 days ago

	originalKnowledge := state.ProbKnowledge
	originalConfidence := state.Confidence

	decayedState := bkt.ApplyTimeDecay(state, time.Now())

	if decayedState.ProbKnowledge >= originalKnowledge {
		t.Errorf("Expected knowledge to decay over time")
	}
	if decayedState.Confidence >= originalConfidence {
		t.Errorf("Expected confidence to decay over time")
	}
	if decayedState.ProbKnowledge < 0 || decayedState.ProbKnowledge > 1 {
		t.Errorf("Decayed knowledge should be between 0 and 1, got %f", decayedState.ProbKnowledge)
	}
}

func TestBKTConfidenceCalculation(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Test with no attempts
	confidence := bkt.calculateConfidence(state)
	if confidence != 0.1 {
		t.Errorf("Expected low confidence with no attempts, got %f", confidence)
	}

	// Test with consistent correct responses
	state.AttemptsCount = 10
	state.CorrectCount = 9
	state.ProbKnowledge = 0.8

	confidence = bkt.calculateConfidence(state)
	if confidence <= 0.1 {
		t.Errorf("Expected higher confidence with consistent responses, got %f", confidence)
	}
}

func TestBKTMasteryThresholdDetection(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Test with mastered state
	state.ProbKnowledge = 0.9
	state.Confidence = 0.8

	hasAlert, message := bkt.DetectMasteryThreshold(state)
	if !hasAlert {
		t.Errorf("Expected mastery alert for mastered topic")
	}
	if message == "" {
		t.Errorf("Expected non-empty message for mastery alert")
	}

	// Test with low knowledge
	state.ProbKnowledge = 0.3
	state.Confidence = 0.5

	hasAlert, _ = bkt.DetectMasteryThreshold(state)
	if hasAlert {
		t.Errorf("Expected no mastery alert for low knowledge topic")
	}
}

func TestBKTParameterCalibration(t *testing.T) {
	bkt := NewBKTAlgorithm()

	// Create some test states and responses
	states := []*BKTState{
		{ProbKnowledge: 0.1, ProbGuess: 0.25, ProbSlip: 0.1, ProbLearn: 0.15},
		{ProbKnowledge: 0.3, ProbGuess: 0.25, ProbSlip: 0.1, ProbLearn: 0.15},
		{ProbKnowledge: 0.5, ProbGuess: 0.25, ProbSlip: 0.1, ProbLearn: 0.15},
	}
	responses := []bool{true, false, true}

	originalGuess := bkt.DefaultProbGuess
	originalSlip := bkt.DefaultProbSlip
	originalLearn := bkt.DefaultProbLearn

	bkt.CalibrateParameters(states, responses)

	// Parameters should stay within bounds
	if bkt.DefaultProbGuess < 0.05 || bkt.DefaultProbGuess > 0.5 {
		t.Errorf("Calibrated guess probability out of bounds: %f", bkt.DefaultProbGuess)
	}
	if bkt.DefaultProbSlip < 0.01 || bkt.DefaultProbSlip > 0.3 {
		t.Errorf("Calibrated slip probability out of bounds: %f", bkt.DefaultProbSlip)
	}
	if bkt.DefaultProbLearn < 0.01 || bkt.DefaultProbLearn > 0.5 {
		t.Errorf("Calibrated learn probability out of bounds: %f", bkt.DefaultProbLearn)
	}

	// Test that calibration actually changed something (with sufficient data)
	// Note: With only 3 data points, changes might be minimal
	t.Logf("Original guess: %f, calibrated: %f", originalGuess, bkt.DefaultProbGuess)
	t.Logf("Original slip: %f, calibrated: %f", originalSlip, bkt.DefaultProbSlip)
	t.Logf("Original learn: %f, calibrated: %f", originalLearn, bkt.DefaultProbLearn)
}

func TestBKTVisualizationData(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Add some attempts
	state.AttemptsCount = 10
	state.CorrectCount = 7
	state.ProbKnowledge = 0.6
	state.Confidence = 0.7

	vizData := bkt.GetVisualizationData(state)

	// Check required fields
	if _, ok := vizData["knowledge_probability"]; !ok {
		t.Errorf("Visualization data missing knowledge_probability")
	}
	if _, ok := vizData["confidence_level"]; !ok {
		t.Errorf("Visualization data missing confidence_level")
	}
	if _, ok := vizData["mastery_threshold"]; !ok {
		t.Errorf("Visualization data missing mastery_threshold")
	}
	if _, ok := vizData["mastery_progress"]; !ok {
		t.Errorf("Visualization data missing mastery_progress")
	}

	// Check values are reasonable
	progress := vizData["mastery_progress"].(float64)
	if progress < 0 || progress > 1 {
		t.Errorf("Mastery progress should be between 0 and 1, got %f", progress)
	}
}

func TestBKTAnalytics(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Add some attempts
	state.AttemptsCount = 10
	state.CorrectCount = 7
	state.ProbKnowledge = 0.6

	analytics := bkt.GetAnalytics(state)

	// Check required fields
	requiredFields := []string{
		"prob_knowledge", "prob_guess", "prob_slip", "prob_learn",
		"attempts_count", "correct_count", "accuracy", "confidence",
		"mastery_gap", "predicted_correctness", "is_mastered",
	}

	for _, field := range requiredFields {
		if _, ok := analytics[field]; !ok {
			t.Errorf("Analytics missing required field: %s", field)
		}
	}

	// Check accuracy calculation
	accuracy := analytics["accuracy"].(float64)
	expectedAccuracy := float64(state.CorrectCount) / float64(state.AttemptsCount)
	if math.Abs(accuracy-expectedAccuracy) > 0.001 {
		t.Errorf("Expected accuracy %f, got %f", expectedAccuracy, accuracy)
	}
}

func TestBKTProtoConversion(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Add some data
	state.AttemptsCount = 5
	state.CorrectCount = 3
	state.ProbKnowledge = 0.6

	// Convert to proto and back
	pbState := bkt.ConvertToProto(state)
	convertedState := bkt.ConvertFromProto(pbState)

	// Check key fields are preserved
	if math.Abs(convertedState.ProbKnowledge-state.ProbKnowledge) > 0.001 {
		t.Errorf("Knowledge probability not preserved in proto conversion")
	}
	if convertedState.AttemptsCount != state.AttemptsCount {
		t.Errorf("Attempts count not preserved in proto conversion")
	}
	if convertedState.CorrectCount != state.CorrectCount {
		t.Errorf("Correct count not preserved in proto conversion")
	}
}

func TestBKTBoundaryConditions(t *testing.T) {
	bkt := NewBKTAlgorithm()
	state := bkt.InitializeState("traffic_signs")

	// Test with extreme probabilities
	state.ProbKnowledge = 0.0
	newState := bkt.UpdateState(state, true)
	if newState.ProbKnowledge < 0 || newState.ProbKnowledge > 1 {
		t.Errorf("Knowledge probability out of bounds after update from 0")
	}

	state.ProbKnowledge = 1.0
	newState = bkt.UpdateState(state, false)
	if newState.ProbKnowledge < 0 || newState.ProbKnowledge > 1 {
		t.Errorf("Knowledge probability out of bounds after update from 1")
	}

	// Test with zero probabilities (edge case)
	state.ProbGuess = 0.0
	state.ProbSlip = 0.0
	newState = bkt.UpdateState(state, true)
	if newState.ProbKnowledge < 0 || newState.ProbKnowledge > 1 {
		t.Errorf("Knowledge probability out of bounds with zero guess/slip")
	}
}
