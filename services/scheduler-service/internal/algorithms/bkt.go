package algorithms

import (
	"math"
	"time"

	pb "scheduler-service/proto"
)

// BKTAlgorithm implements Bayesian Knowledge Tracing for topic-based mastery tracking
type BKTAlgorithm struct {
	// Default BKT parameters (can be calibrated per topic)
	DefaultProbGuess float64 // P(G) - probability of guessing correctly when not knowing
	DefaultProbSlip  float64 // P(S) - probability of slipping when knowing
	DefaultProbLearn float64 // P(T) - probability of learning from an attempt
	DefaultProbInit  float64 // P(L0) - initial probability of knowing
	MasteryThreshold float64 // Threshold for considering a topic mastered
	ConfidenceDecay  float64 // Rate at which confidence decays over time
}

// NewBKTAlgorithm creates a new BKT algorithm instance with default parameters
func NewBKTAlgorithm() *BKTAlgorithm {
	return &BKTAlgorithm{
		DefaultProbGuess: 0.25, // 25% chance of guessing correctly (4-option multiple choice)
		DefaultProbSlip:  0.10, // 10% chance of slipping when knowing
		DefaultProbLearn: 0.15, // 15% chance of learning from each attempt
		DefaultProbInit:  0.10, // 10% initial probability of knowing
		MasteryThreshold: 0.85, // 85% probability threshold for mastery
		ConfidenceDecay:  0.95, // 5% confidence decay per day
	}
}

// BKTState represents the knowledge state for a specific topic
type BKTState struct {
	ProbKnowledge float64   `json:"prob_knowledge"` // P(L) - current probability of knowing
	ProbGuess     float64   `json:"prob_guess"`     // P(G) - probability of guessing
	ProbSlip      float64   `json:"prob_slip"`      // P(S) - probability of slipping
	ProbLearn     float64   `json:"prob_learn"`     // P(T) - probability of learning
	AttemptsCount int       `json:"attempts_count"` // Total attempts for this topic
	CorrectCount  int       `json:"correct_count"`  // Correct attempts for this topic
	LastUpdated   time.Time `json:"last_updated"`   // Last time this state was updated
	Confidence    float64   `json:"confidence"`     // Confidence in the probability estimate
}

// InitializeState creates initial BKT state for a new topic
func (bkt *BKTAlgorithm) InitializeState(topic string) *BKTState {
	return &BKTState{
		ProbKnowledge: bkt.DefaultProbInit,
		ProbGuess:     bkt.DefaultProbGuess,
		ProbSlip:      bkt.DefaultProbSlip,
		ProbLearn:     bkt.DefaultProbLearn,
		AttemptsCount: 0,
		CorrectCount:  0,
		LastUpdated:   time.Now(),
		Confidence:    0.1, // Low initial confidence
	}
}

// UpdateState updates BKT state based on user response
func (bkt *BKTAlgorithm) UpdateState(state *BKTState, correct bool) *BKTState {
	newState := &BKTState{
		ProbGuess:     state.ProbGuess,
		ProbSlip:      state.ProbSlip,
		ProbLearn:     state.ProbLearn,
		AttemptsCount: state.AttemptsCount + 1,
		CorrectCount:  state.CorrectCount,
		LastUpdated:   time.Now(),
	}

	if correct {
		newState.CorrectCount = state.CorrectCount + 1
	}

	// Apply Bayesian update based on response
	if correct {
		// P(correct) = P(L) * (1 - P(S)) + (1 - P(L)) * P(G)
		probCorrect := state.ProbKnowledge*(1-state.ProbSlip) + (1-state.ProbKnowledge)*state.ProbGuess

		// Avoid division by zero
		if probCorrect > 0 {
			// Update P(L) using Bayes' rule: P(L|correct) = P(correct|L) * P(L) / P(correct)
			newState.ProbKnowledge = (state.ProbKnowledge * (1 - state.ProbSlip)) / probCorrect
		} else {
			newState.ProbKnowledge = state.ProbKnowledge
		}
	} else {
		// P(incorrect) = P(L) * P(S) + (1 - P(L)) * (1 - P(G))
		probIncorrect := state.ProbKnowledge*state.ProbSlip + (1-state.ProbKnowledge)*(1-state.ProbGuess)

		// Avoid division by zero
		if probIncorrect > 0 {
			// Update P(L) using Bayes' rule: P(L|incorrect) = P(incorrect|L) * P(L) / P(incorrect)
			newState.ProbKnowledge = (state.ProbKnowledge * state.ProbSlip) / probIncorrect
		} else {
			newState.ProbKnowledge = state.ProbKnowledge
		}
	}

	// Apply learning: P(L_new) = P(L_old) + (1 - P(L_old)) * P(T)
	newState.ProbKnowledge = newState.ProbKnowledge + (1-newState.ProbKnowledge)*state.ProbLearn

	// Ensure probability stays within bounds [0, 1]
	newState.ProbKnowledge = math.Max(0.0, math.Min(1.0, newState.ProbKnowledge))

	// Update confidence based on number of attempts and consistency
	newState.Confidence = bkt.calculateConfidence(newState)

	return newState
}

// calculateConfidence estimates confidence in the knowledge probability
func (bkt *BKTAlgorithm) calculateConfidence(state *BKTState) float64 {
	if state.AttemptsCount == 0 {
		return 0.1 // Low confidence with no data
	}

	// Base confidence increases with number of attempts (logarithmic growth)
	baseConfidence := 1.0 - math.Exp(-float64(state.AttemptsCount)/10.0)

	// Adjust confidence based on consistency of responses
	if state.AttemptsCount > 0 {
		accuracy := float64(state.CorrectCount) / float64(state.AttemptsCount)

		// Higher confidence when accuracy aligns with predicted probability
		expectedAccuracy := state.ProbKnowledge*(1-state.ProbSlip) + (1-state.ProbKnowledge)*state.ProbGuess
		consistencyFactor := 1.0 - math.Abs(accuracy-expectedAccuracy)

		baseConfidence *= consistencyFactor
	}

	return math.Max(0.1, math.Min(0.95, baseConfidence))
}

// ApplyTimeDecay applies time-based decay to knowledge probability
func (bkt *BKTAlgorithm) ApplyTimeDecay(state *BKTState, currentTime time.Time) *BKTState {
	if state.LastUpdated.IsZero() {
		return state
	}

	daysSinceUpdate := currentTime.Sub(state.LastUpdated).Hours() / 24.0

	// Apply exponential decay to knowledge probability
	decayFactor := math.Pow(bkt.ConfidenceDecay, daysSinceUpdate)

	newState := &BKTState{
		ProbKnowledge: state.ProbKnowledge * decayFactor,
		ProbGuess:     state.ProbGuess,
		ProbSlip:      state.ProbSlip,
		ProbLearn:     state.ProbLearn,
		AttemptsCount: state.AttemptsCount,
		CorrectCount:  state.CorrectCount,
		LastUpdated:   state.LastUpdated,              // Keep original update time
		Confidence:    state.Confidence * decayFactor, // Decay confidence too
	}

	// Ensure bounds
	newState.ProbKnowledge = math.Max(0.0, math.Min(1.0, newState.ProbKnowledge))
	newState.Confidence = math.Max(0.1, math.Min(0.95, newState.Confidence))

	return newState
}

// IsMastered checks if a topic is considered mastered
func (bkt *BKTAlgorithm) IsMastered(state *BKTState) bool {
	return state.ProbKnowledge >= bkt.MasteryThreshold && state.Confidence >= 0.7
}

// GetMasteryGap calculates how far the user is from mastery (0 = mastered, 1 = no knowledge)
func (bkt *BKTAlgorithm) GetMasteryGap(state *BKTState) float64 {
	if bkt.IsMastered(state) {
		return 0.0
	}

	// Weight by confidence - less confident estimates contribute more to gap
	confidenceWeight := 1.0 - state.Confidence
	gap := (1.0 - state.ProbKnowledge) * (1.0 + confidenceWeight)

	return math.Min(1.0, gap)
}

// GetPredictedCorrectness predicts probability of correct response
func (bkt *BKTAlgorithm) GetPredictedCorrectness(state *BKTState) float64 {
	// P(correct) = P(L) * (1 - P(S)) + (1 - P(L)) * P(G)
	return state.ProbKnowledge*(1-state.ProbSlip) + (1-state.ProbKnowledge)*state.ProbGuess
}

// CalibrateParameters adjusts BKT parameters based on observed data
func (bkt *BKTAlgorithm) CalibrateParameters(states []*BKTState, responses []bool) {
	if len(states) != len(responses) || len(states) == 0 {
		return
	}

	// Use Expectation-Maximization algorithm for parameter estimation
	// This is a simplified version - in production, you'd use more sophisticated methods

	var totalGuess, totalSlip, totalLearn float64
	var guessCount, slipCount, learnCount int

	for i, state := range states {
		if i == 0 {
			continue // Skip first state as we need transitions
		}

		prevState := states[i-1]
		correct := responses[i-1]

		// Estimate parameters based on observed transitions
		if correct && prevState.ProbKnowledge < 0.5 {
			// Likely guessing
			totalGuess += 1.0
			guessCount++
		}

		if !correct && prevState.ProbKnowledge > 0.5 {
			// Likely slipping
			totalSlip += 1.0
			slipCount++
		}

		// Estimate learning from knowledge probability increases
		knowledgeIncrease := state.ProbKnowledge - prevState.ProbKnowledge
		if knowledgeIncrease > 0 {
			totalLearn += knowledgeIncrease
			learnCount++
		}
	}

	// Update parameters with smoothing
	alpha := 0.1 // Learning rate for parameter updates

	if guessCount > 0 {
		newGuess := totalGuess / float64(guessCount)
		bkt.DefaultProbGuess = (1-alpha)*bkt.DefaultProbGuess + alpha*newGuess
	}

	if slipCount > 0 {
		newSlip := totalSlip / float64(slipCount)
		bkt.DefaultProbSlip = (1-alpha)*bkt.DefaultProbSlip + alpha*newSlip
	}

	if learnCount > 0 {
		newLearn := totalLearn / float64(learnCount)
		bkt.DefaultProbLearn = (1-alpha)*bkt.DefaultProbLearn + alpha*newLearn
	}

	// Ensure parameters stay within reasonable bounds
	bkt.DefaultProbGuess = math.Max(0.05, math.Min(0.5, bkt.DefaultProbGuess))
	bkt.DefaultProbSlip = math.Max(0.01, math.Min(0.3, bkt.DefaultProbSlip))
	bkt.DefaultProbLearn = math.Max(0.01, math.Min(0.5, bkt.DefaultProbLearn))
}

// DetectMasteryThreshold analyzes when mastery alerts should be triggered
func (bkt *BKTAlgorithm) DetectMasteryThreshold(state *BKTState) (bool, string) {
	if bkt.IsMastered(state) {
		return true, "Topic mastered - high confidence in knowledge"
	}

	if state.ProbKnowledge >= bkt.MasteryThreshold && state.Confidence < 0.7 {
		return true, "Potential mastery - needs more practice for confidence"
	}

	if state.ProbKnowledge >= 0.7 && state.AttemptsCount >= 10 {
		return true, "Good progress - approaching mastery"
	}

	return false, ""
}

// ConvertToProto converts internal BKTState to protobuf BKTState
func (bkt *BKTAlgorithm) ConvertToProto(state *BKTState) *pb.BKTState {
	return &pb.BKTState{
		ProbKnowledge: state.ProbKnowledge,
		ProbGuess:     state.ProbGuess,
		ProbSlip:      state.ProbSlip,
		ProbLearn:     state.ProbLearn,
		AttemptsCount: int32(state.AttemptsCount),
		CorrectCount:  int32(state.CorrectCount),
	}
}

// ConvertFromProto converts protobuf BKTState to internal BKTState
func (bkt *BKTAlgorithm) ConvertFromProto(pbState *pb.BKTState) *BKTState {
	return &BKTState{
		ProbKnowledge: pbState.ProbKnowledge,
		ProbGuess:     pbState.ProbGuess,
		ProbSlip:      pbState.ProbSlip,
		ProbLearn:     pbState.ProbLearn,
		AttemptsCount: int(pbState.AttemptsCount),
		CorrectCount:  int(pbState.CorrectCount),
		LastUpdated:   time.Now(), // Set to current time when loading from proto
		Confidence:    0.5,        // Default confidence when loading from proto
	}
}

// GetAnalytics returns analytics data for the BKT state
func (bkt *BKTAlgorithm) GetAnalytics(state *BKTState) map[string]any {
	accuracy := 0.0
	if state.AttemptsCount > 0 {
		accuracy = float64(state.CorrectCount) / float64(state.AttemptsCount)
	}

	masteryAlert, masteryMessage := bkt.DetectMasteryThreshold(state)

	return map[string]any{
		"prob_knowledge":        state.ProbKnowledge,
		"prob_guess":            state.ProbGuess,
		"prob_slip":             state.ProbSlip,
		"prob_learn":            state.ProbLearn,
		"attempts_count":        state.AttemptsCount,
		"correct_count":         state.CorrectCount,
		"accuracy":              accuracy,
		"confidence":            state.Confidence,
		"mastery_gap":           bkt.GetMasteryGap(state),
		"predicted_correctness": bkt.GetPredictedCorrectness(state),
		"is_mastered":           bkt.IsMastered(state),
		"mastery_alert":         masteryAlert,
		"mastery_message":       masteryMessage,
		"days_since_update":     time.Since(state.LastUpdated).Hours() / 24.0,
	}
}

// GetVisualizationData returns data suitable for BKT visualization
func (bkt *BKTAlgorithm) GetVisualizationData(state *BKTState) map[string]any {
	return map[string]any{
		"knowledge_probability": state.ProbKnowledge,
		"confidence_level":      state.Confidence,
		"mastery_threshold":     bkt.MasteryThreshold,
		"attempts_count":        state.AttemptsCount,
		"accuracy_rate":         float64(state.CorrectCount) / math.Max(1, float64(state.AttemptsCount)),
		"mastery_progress":      state.ProbKnowledge / bkt.MasteryThreshold,
		"learning_velocity":     bkt.calculateLearningVelocity(state),
		"time_to_mastery":       bkt.estimateTimeToMastery(state),
	}
}

// calculateLearningVelocity estimates how quickly the user is learning
func (bkt *BKTAlgorithm) calculateLearningVelocity(state *BKTState) float64 {
	if state.AttemptsCount < 2 {
		return 0.0
	}

	// Estimate velocity based on learning rate and current progress
	progressRate := state.ProbKnowledge / float64(state.AttemptsCount)
	return progressRate * state.ProbLearn
}

// estimateTimeToMastery estimates attempts needed to reach mastery
func (bkt *BKTAlgorithm) estimateTimeToMastery(state *BKTState) int {
	if bkt.IsMastered(state) {
		return 0
	}

	// Simple estimation based on current learning rate
	remainingGap := bkt.MasteryThreshold - state.ProbKnowledge
	if state.ProbLearn <= 0 {
		return -1 // Cannot estimate
	}

	// Estimate attempts needed (simplified model)
	estimatedAttempts := int(remainingGap / state.ProbLearn)
	return estimatedAttempts
}
