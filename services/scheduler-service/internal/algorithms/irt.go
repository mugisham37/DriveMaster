package algorithms

import (
	"fmt"
	"math"
	"time"
)

// IRTAlgorithm implements Item Response Theory for ability estimation and difficulty matching
type IRTAlgorithm struct {
	// Model parameters
	Model                 string  // "1PL", "2PL", or "3PL"
	DefaultDiscrimination float64 // Default discrimination parameter (a)
	DefaultGuessing       float64 // Default guessing parameter (c) for 3PL

	// Bayesian updating parameters
	PriorMean     float64 // Prior mean for ability (theta)
	PriorVariance float64 // Prior variance for ability
	UpdateRate    float64 // Learning rate for Bayesian updates

	// Confidence parameters
	MinConfidence   float64 // Minimum confidence level
	MaxConfidence   float64 // Maximum confidence level
	ConfidenceDecay float64 // Daily confidence decay rate

	// Optimization parameters
	MaxIterations      int     // Maximum iterations for ability estimation
	Tolerance          float64 // Convergence tolerance
	OptimalCorrectness float64 // Target probability for optimal challenge
}

// NewIRTAlgorithm creates a new IRT algorithm instance with default parameters
func NewIRTAlgorithm() *IRTAlgorithm {
	return &IRTAlgorithm{
		Model:                 "2PL", // 2-Parameter Logistic Model
		DefaultDiscrimination: 1.0,
		DefaultGuessing:       0.0, // No guessing for 2PL

		PriorMean:     0.0, // Standard normal prior
		PriorVariance: 1.0,
		UpdateRate:    0.1, // Conservative update rate

		MinConfidence:   0.1,
		MaxConfidence:   0.95,
		ConfidenceDecay: 0.98, // 2% daily decay

		MaxIterations:      50,
		Tolerance:          1e-6,
		OptimalCorrectness: 0.75, // 75% target correctness for optimal challenge
	}
}

// IRTState represents the IRT ability state for a user in a specific topic
type IRTState struct {
	Theta         float64   `json:"theta"`          // Ability parameter
	ThetaVariance float64   `json:"theta_variance"` // Uncertainty in theta estimate
	Confidence    float64   `json:"confidence"`     // Confidence in ability estimate
	AttemptsCount int       `json:"attempts_count"` // Total attempts for this topic
	CorrectCount  int       `json:"correct_count"`  // Correct attempts
	LastUpdated   time.Time `json:"last_updated"`   // Last update timestamp
	UpdateHistory []float64 `json:"update_history"` // History of theta updates for trend analysis
}

// ItemParameters represents IRT parameters for an item
type ItemParameters struct {
	Difficulty     float64 `json:"difficulty"`     // Difficulty parameter (b)
	Discrimination float64 `json:"discrimination"` // Discrimination parameter (a)
	Guessing       float64 `json:"guessing"`       // Guessing parameter (c)
	AttemptsCount  int     `json:"attempts_count"` // Number of attempts on this item
	CorrectCount   int     `json:"correct_count"`  // Number of correct attempts
}

// InitializeState creates initial IRT state for a new user-topic combination
func (irt *IRTAlgorithm) InitializeState(topic string) *IRTState {
	return &IRTState{
		Theta:         irt.PriorMean,
		ThetaVariance: irt.PriorVariance,
		Confidence:    irt.MinConfidence,
		AttemptsCount: 0,
		CorrectCount:  0,
		LastUpdated:   time.Now(),
		UpdateHistory: make([]float64, 0, 100), // Pre-allocate for efficiency
	}
}

// UpdateAbility updates user ability using Bayesian updating after an attempt
func (irt *IRTAlgorithm) UpdateAbility(state *IRTState, itemParams *ItemParameters, correct bool) *IRTState {
	newState := &IRTState{
		Theta:         state.Theta,
		ThetaVariance: state.ThetaVariance,
		Confidence:    state.Confidence,
		AttemptsCount: state.AttemptsCount + 1,
		CorrectCount:  state.CorrectCount,
		LastUpdated:   time.Now(),
		UpdateHistory: make([]float64, len(state.UpdateHistory)),
	}

	// Copy update history
	copy(newState.UpdateHistory, state.UpdateHistory)

	if correct {
		newState.CorrectCount = state.CorrectCount + 1
	}

	// Calculate information (Fisher information)
	information := irt.calculateInformation(state.Theta, itemParams)

	// Bayesian update using Newton-Raphson method
	oldTheta := state.Theta
	newTheta := irt.bayesianUpdate(state.Theta, state.ThetaVariance, itemParams, correct, information)

	// Update theta and variance
	newState.Theta = newTheta
	newState.ThetaVariance = irt.updateVariance(state.ThetaVariance, information)

	// Update confidence based on information gained and consistency
	newState.Confidence = irt.updateConfidence(state, information, math.Abs(newTheta-oldTheta))

	// Add to update history (keep last 100 updates)
	if len(newState.UpdateHistory) >= 100 {
		newState.UpdateHistory = newState.UpdateHistory[1:]
	}
	newState.UpdateHistory = append(newState.UpdateHistory, newTheta-oldTheta)

	return newState
}

// bayesianUpdate performs Bayesian update of ability parameter
func (irt *IRTAlgorithm) bayesianUpdate(theta, thetaVariance float64, itemParams *ItemParameters, correct bool, information float64) float64 {
	// Calculate expected response probability
	probCorrect := irt.calculateProbability(theta, itemParams)

	// Calculate residual (observed - expected)
	var residual float64
	if correct {
		residual = 1.0 - probCorrect
	} else {
		residual = 0.0 - probCorrect
	}

	// Calculate posterior variance
	posteriorVariance := 1.0 / (1.0/thetaVariance + information)

	// Calculate update step
	updateStep := posteriorVariance * residual * itemParams.Discrimination

	// Apply learning rate to make updates more conservative
	updateStep *= irt.UpdateRate

	// Return updated theta
	return theta + updateStep
}

// updateVariance updates the variance (uncertainty) in theta estimate
func (irt *IRTAlgorithm) updateVariance(currentVariance, information float64) float64 {
	// Bayesian update of variance
	newVariance := 1.0 / (1.0/currentVariance + information)

	// Ensure variance doesn't become too small (maintain some uncertainty)
	minVariance := 0.01
	if newVariance < minVariance {
		newVariance = minVariance
	}

	return newVariance
}

// updateConfidence updates confidence based on information and consistency
func (irt *IRTAlgorithm) updateConfidence(state *IRTState, information, thetaChange float64) float64 {
	// Base confidence increases with information (inverse of variance)
	informationConfidence := 1.0 / (1.0 + state.ThetaVariance)

	// Consistency bonus: smaller theta changes indicate more stable estimates
	consistencyBonus := math.Exp(-thetaChange * 5.0) // Exponential decay with theta change

	// Attempt count bonus: more attempts increase confidence
	attemptBonus := 1.0 - math.Exp(-float64(state.AttemptsCount)/20.0)

	// Combine factors
	newConfidence := informationConfidence * consistencyBonus * attemptBonus

	// Apply bounds
	if newConfidence < irt.MinConfidence {
		newConfidence = irt.MinConfidence
	}
	if newConfidence > irt.MaxConfidence {
		newConfidence = irt.MaxConfidence
	}

	return newConfidence
}

// calculateProbability calculates probability of correct response using IRT model
func (irt *IRTAlgorithm) calculateProbability(theta float64, itemParams *ItemParameters) float64 {
	switch irt.Model {
	case "1PL":
		return irt.calculate1PL(theta, itemParams.Difficulty)
	case "2PL":
		return irt.calculate2PL(theta, itemParams.Difficulty, itemParams.Discrimination)
	case "3PL":
		return irt.calculate3PL(theta, itemParams.Difficulty, itemParams.Discrimination, itemParams.Guessing)
	default:
		return irt.calculate2PL(theta, itemParams.Difficulty, itemParams.Discrimination)
	}
}

// calculate1PL implements 1-Parameter Logistic Model (Rasch model)
func (irt *IRTAlgorithm) calculate1PL(theta, difficulty float64) float64 {
	exponent := theta - difficulty
	return 1.0 / (1.0 + math.Exp(-exponent))
}

// calculate2PL implements 2-Parameter Logistic Model
func (irt *IRTAlgorithm) calculate2PL(theta, difficulty, discrimination float64) float64 {
	exponent := discrimination * (theta - difficulty)
	return 1.0 / (1.0 + math.Exp(-exponent))
}

// calculate3PL implements 3-Parameter Logistic Model
func (irt *IRTAlgorithm) calculate3PL(theta, difficulty, discrimination, guessing float64) float64 {
	prob2PL := irt.calculate2PL(theta, difficulty, discrimination)
	return guessing + (1.0-guessing)*prob2PL
}

// calculateInformation calculates Fisher information for ability estimation
func (irt *IRTAlgorithm) calculateInformation(theta float64, itemParams *ItemParameters) float64 {
	prob := irt.calculateProbability(theta, itemParams)

	switch irt.Model {
	case "1PL":
		return prob * (1.0 - prob)
	case "2PL":
		discrimination := itemParams.Discrimination
		return discrimination * discrimination * prob * (1.0 - prob)
	case "3PL":
		discrimination := itemParams.Discrimination
		guessing := itemParams.Guessing
		numerator := discrimination * discrimination * (prob - guessing) * (prob - guessing)
		denominator := prob * (1.0 - prob) * (1.0 - guessing) * (1.0 - guessing)
		if denominator == 0 {
			return 0
		}
		return numerator / denominator
	default:
		discrimination := itemParams.Discrimination
		return discrimination * discrimination * prob * (1.0 - prob)
	}
}

// GetDifficultyMatch calculates how well an item's difficulty matches user ability
func (irt *IRTAlgorithm) GetDifficultyMatch(state *IRTState, itemParams *ItemParameters) float64 {
	// Calculate probability of correct response
	probCorrect := irt.calculateProbability(state.Theta, itemParams)

	// Calculate distance from optimal correctness probability
	distance := math.Abs(probCorrect - irt.OptimalCorrectness)

	// Convert to match score (higher is better)
	// Use Gaussian function centered at optimal correctness
	variance := 0.1 // Controls how strict the matching is
	matchScore := math.Exp(-distance * distance / (2 * variance))

	return matchScore
}

// GetOptimalDifficulty calculates the optimal difficulty for a user's current ability
func (irt *IRTAlgorithm) GetOptimalDifficulty(state *IRTState, discrimination float64) float64 {
	// For 2PL model, solve for difficulty that gives target correctness probability
	// P(correct) = 1 / (1 + exp(-a(θ - b)))
	// Solving for b: b = θ + ln((1-P)/P) / a

	targetProb := irt.OptimalCorrectness
	if discrimination <= 0 {
		discrimination = irt.DefaultDiscrimination
	}

	logOdds := math.Log((1.0 - targetProb) / targetProb)
	optimalDifficulty := state.Theta + logOdds/discrimination

	return optimalDifficulty
}

// EstimateAbilityFromPlacement estimates initial ability from placement test results
func (irt *IRTAlgorithm) EstimateAbilityFromPlacement(responses []bool, itemParams []*ItemParameters) (*IRTState, error) {
	if len(responses) != len(itemParams) {
		return nil, fmt.Errorf("responses and item parameters length mismatch")
	}

	// Initialize with prior
	theta := irt.PriorMean

	// Iteratively update ability estimate
	for iteration := 0; iteration < irt.MaxIterations; iteration++ {
		oldTheta := theta

		// Calculate gradient and Hessian for Newton-Raphson
		gradient := 0.0
		hessian := 0.0

		for i, correct := range responses {
			prob := irt.calculateProbability(theta, itemParams[i])
			info := irt.calculateInformation(theta, itemParams[i])

			// Add to gradient
			var residual float64
			if correct {
				residual = 1.0 - prob
			} else {
				residual = 0.0 - prob
			}
			gradient += itemParams[i].Discrimination * residual

			// Add to Hessian (negative second derivative)
			hessian += info
		}

		// Add prior information
		gradient -= (theta - irt.PriorMean) / irt.PriorVariance
		hessian += 1.0 / irt.PriorVariance

		// Newton-Raphson update
		if hessian != 0 {
			theta = theta + gradient/hessian
		}

		// Check convergence
		if math.Abs(theta-oldTheta) < irt.Tolerance {
			break
		}
	}

	// Calculate final variance
	totalInformation := 0.0
	correctCount := 0
	for i, correct := range responses {
		totalInformation += irt.calculateInformation(theta, itemParams[i])
		if correct {
			correctCount++
		}
	}

	finalVariance := 1.0 / (1.0/irt.PriorVariance + totalInformation)

	// Calculate confidence based on information and consistency
	confidence := 1.0 / (1.0 + finalVariance)
	if confidence < irt.MinConfidence {
		confidence = irt.MinConfidence
	}
	if confidence > irt.MaxConfidence {
		confidence = irt.MaxConfidence
	}

	return &IRTState{
		Theta:         theta,
		ThetaVariance: finalVariance,
		Confidence:    confidence,
		AttemptsCount: len(responses),
		CorrectCount:  correctCount,
		LastUpdated:   time.Now(),
		UpdateHistory: []float64{theta - irt.PriorMean}, // Initial update from prior
	}, nil
}

// ApplyTimeDecay applies time-based decay to ability confidence
func (irt *IRTAlgorithm) ApplyTimeDecay(state *IRTState, currentTime time.Time) *IRTState {
	if state.LastUpdated.IsZero() {
		return state
	}

	daysSinceUpdate := currentTime.Sub(state.LastUpdated).Hours() / 24.0

	// Apply exponential decay to confidence
	decayFactor := math.Pow(irt.ConfidenceDecay, daysSinceUpdate)

	newState := &IRTState{
		Theta:         state.Theta,
		ThetaVariance: state.ThetaVariance / decayFactor, // Increase uncertainty over time
		Confidence:    state.Confidence * decayFactor,
		AttemptsCount: state.AttemptsCount,
		CorrectCount:  state.CorrectCount,
		LastUpdated:   state.LastUpdated, // Keep original update time
		UpdateHistory: make([]float64, len(state.UpdateHistory)),
	}

	// Copy update history
	copy(newState.UpdateHistory, state.UpdateHistory)

	// Ensure bounds
	if newState.Confidence < irt.MinConfidence {
		newState.Confidence = irt.MinConfidence
	}

	return newState
}

// CalibrateItemParameters calibrates item parameters from response data
func (irt *IRTAlgorithm) CalibrateItemParameters(responses []bool, abilities []float64) *ItemParameters {
	if len(responses) != len(abilities) || len(responses) == 0 {
		return &ItemParameters{
			Difficulty:     0.0,
			Discrimination: irt.DefaultDiscrimination,
			Guessing:       irt.DefaultGuessing,
			AttemptsCount:  len(responses),
			CorrectCount:   0,
		}
	}

	correctCount := 0
	for _, correct := range responses {
		if correct {
			correctCount++
		}
	}

	// Simple calibration using logistic regression approach
	// This is a simplified version - production would use more sophisticated methods

	// Estimate difficulty as the ability level where P(correct) = 0.5
	difficulty := irt.estimateDifficulty(responses, abilities)

	// Estimate discrimination based on how well ability predicts responses
	discrimination := irt.estimateDiscrimination(responses, abilities, difficulty)

	return &ItemParameters{
		Difficulty:     difficulty,
		Discrimination: discrimination,
		Guessing:       irt.DefaultGuessing,
		AttemptsCount:  len(responses),
		CorrectCount:   correctCount,
	}
}

// estimateDifficulty estimates item difficulty parameter
func (irt *IRTAlgorithm) estimateDifficulty(responses []bool, abilities []float64) float64 {
	// Find ability level where approximately 50% get it correct
	// Sort by ability and find median of those who got it correct

	type abilityResponse struct {
		ability float64
		correct bool
	}

	pairs := make([]abilityResponse, len(responses))
	for i := range responses {
		pairs[i] = abilityResponse{abilities[i], responses[i]}
	}

	// Simple approach: use mean ability of all respondents as starting point
	totalAbility := 0.0
	for _, ability := range abilities {
		totalAbility += ability
	}
	meanAbility := totalAbility / float64(len(abilities))

	// Adjust based on overall difficulty (proportion correct)
	correctCount := 0
	for _, correct := range responses {
		if correct {
			correctCount++
		}
	}

	proportionCorrect := float64(correctCount) / float64(len(responses))

	// If item is easier than expected (high proportion correct), reduce difficulty
	// If item is harder than expected (low proportion correct), increase difficulty
	adjustment := math.Log((1.0-proportionCorrect)/proportionCorrect) / irt.DefaultDiscrimination

	return meanAbility + adjustment
}

// estimateDiscrimination estimates item discrimination parameter
func (irt *IRTAlgorithm) estimateDiscrimination(responses []bool, abilities []float64, difficulty float64) float64 {
	// Calculate how well ability predicts responses
	// Higher discrimination means ability is a better predictor

	if len(responses) < 2 {
		return irt.DefaultDiscrimination
	}

	// Calculate correlation between ability and response
	meanAbility := 0.0
	meanResponse := 0.0

	for i := range responses {
		meanAbility += abilities[i]
		if responses[i] {
			meanResponse += 1.0
		}
	}

	meanAbility /= float64(len(responses))
	meanResponse /= float64(len(responses))

	numerator := 0.0
	abilityVariance := 0.0
	responseVariance := 0.0

	for i := range responses {
		abilityDiff := abilities[i] - meanAbility
		responseDiff := 0.0
		if responses[i] {
			responseDiff = 1.0 - meanResponse
		} else {
			responseDiff = 0.0 - meanResponse
		}

		numerator += abilityDiff * responseDiff
		abilityVariance += abilityDiff * abilityDiff
		responseVariance += responseDiff * responseDiff
	}

	if abilityVariance == 0 || responseVariance == 0 {
		return irt.DefaultDiscrimination
	}

	correlation := numerator / math.Sqrt(abilityVariance*responseVariance)

	// Convert correlation to discrimination parameter
	// Higher correlation suggests higher discrimination
	discrimination := math.Abs(correlation) * 2.0 // Scale factor

	// Ensure reasonable bounds
	if discrimination < 0.1 {
		discrimination = 0.1
	}
	if discrimination > 3.0 {
		discrimination = 3.0
	}

	return discrimination
}

// GetConfidenceInterval calculates confidence interval for ability estimate
func (irt *IRTAlgorithm) GetConfidenceInterval(state *IRTState, confidenceLevel float64) (float64, float64) {
	// Calculate z-score for confidence level
	var zScore float64
	switch {
	case confidenceLevel >= 0.99:
		zScore = 2.576
	case confidenceLevel >= 0.95:
		zScore = 1.96
	case confidenceLevel >= 0.90:
		zScore = 1.645
	default:
		zScore = 1.96 // Default to 95%
	}

	// Calculate margin of error
	standardError := math.Sqrt(state.ThetaVariance)
	marginOfError := zScore * standardError

	return state.Theta - marginOfError, state.Theta + marginOfError
}

// GetRecommendationScore calculates IRT-based recommendation score for an item
func (irt *IRTAlgorithm) GetRecommendationScore(state *IRTState, itemParams *ItemParameters) float64 {
	// Combine difficulty matching with information gain
	difficultyMatch := irt.GetDifficultyMatch(state, itemParams)
	information := irt.calculateInformation(state.Theta, itemParams)

	// Normalize information (typical range 0-1 for well-calibrated items)
	normalizedInformation := math.Min(1.0, information)

	// Weight difficulty matching more heavily than information
	score := 0.7*difficultyMatch + 0.3*normalizedInformation

	// Apply confidence weighting - less confident estimates benefit more from information
	confidenceWeight := 1.0 - state.Confidence
	score = score + confidenceWeight*normalizedInformation*0.2

	return math.Min(1.0, score)
}

// ConvertToProto converts internal IRTState to protobuf (extend existing UserSchedulerState)
func (irt *IRTAlgorithm) ConvertToProto(state *IRTState) map[string]interface{} {
	return map[string]interface{}{
		"theta":          state.Theta,
		"theta_variance": state.ThetaVariance,
		"confidence":     state.Confidence,
		"attempts_count": state.AttemptsCount,
		"correct_count":  state.CorrectCount,
		"last_updated":   state.LastUpdated.Unix(),
	}
}

// ConvertFromProto converts protobuf data to internal IRTState
func (irt *IRTAlgorithm) ConvertFromProto(data map[string]interface{}) *IRTState {
	state := &IRTState{
		Theta:         0.0,
		ThetaVariance: irt.PriorVariance,
		Confidence:    irt.MinConfidence,
		AttemptsCount: 0,
		CorrectCount:  0,
		LastUpdated:   time.Now(),
		UpdateHistory: make([]float64, 0),
	}

	if theta, ok := data["theta"].(float64); ok {
		state.Theta = theta
	}
	if variance, ok := data["theta_variance"].(float64); ok {
		state.ThetaVariance = variance
	}
	if confidence, ok := data["confidence"].(float64); ok {
		state.Confidence = confidence
	}
	if attempts, ok := data["attempts_count"].(int); ok {
		state.AttemptsCount = attempts
	}
	if correct, ok := data["correct_count"].(int); ok {
		state.CorrectCount = correct
	}
	if timestamp, ok := data["last_updated"].(int64); ok {
		state.LastUpdated = time.Unix(timestamp, 0)
	}

	return state
}

// GetAnalytics returns analytics data for the IRT state
func (irt *IRTAlgorithm) GetAnalytics(state *IRTState) map[string]interface{} {
	accuracy := 0.0
	if state.AttemptsCount > 0 {
		accuracy = float64(state.CorrectCount) / float64(state.AttemptsCount)
	}

	// Calculate confidence interval
	lowerBound, upperBound := irt.GetConfidenceInterval(state, 0.95)

	// Calculate learning trend from update history
	learningTrend := irt.calculateLearningTrend(state.UpdateHistory)

	return map[string]interface{}{
		"theta":                  state.Theta,
		"theta_variance":         state.ThetaVariance,
		"confidence":             state.Confidence,
		"attempts_count":         state.AttemptsCount,
		"correct_count":          state.CorrectCount,
		"accuracy":               accuracy,
		"confidence_interval_95": map[string]float64{"lower": lowerBound, "upper": upperBound},
		"learning_trend":         learningTrend,
		"days_since_update":      time.Since(state.LastUpdated).Hours() / 24.0,
		"optimal_difficulty":     irt.GetOptimalDifficulty(state, irt.DefaultDiscrimination),
		"ability_percentile":     irt.calculateAbilityPercentile(state.Theta),
	}
}

// calculateLearningTrend analyzes the trend in ability updates
func (irt *IRTAlgorithm) calculateLearningTrend(updateHistory []float64) string {
	if len(updateHistory) < 3 {
		return "insufficient_data"
	}

	// Calculate average of recent updates
	recentCount := int(math.Min(10, float64(len(updateHistory))))
	recentSum := 0.0
	for i := len(updateHistory) - recentCount; i < len(updateHistory); i++ {
		recentSum += updateHistory[i]
	}
	recentAverage := recentSum / float64(recentCount)

	// Classify trend
	if recentAverage > 0.05 {
		return "improving"
	} else if recentAverage < -0.05 {
		return "declining"
	} else {
		return "stable"
	}
}

// calculateAbilityPercentile estimates percentile rank of ability (assuming standard normal distribution)
func (irt *IRTAlgorithm) calculateAbilityPercentile(theta float64) float64 {
	// Use cumulative distribution function of standard normal
	// This is an approximation - in production you'd use more accurate methods
	return 0.5 * (1.0 + math.Erf(theta/math.Sqrt(2.0)))
}
