package algorithms

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"time"

	"scheduler-service/internal/logger"
)

// ContextualBandit implements Thompson Sampling and LinUCB algorithms for session strategy selection
type ContextualBandit struct {
	// Algorithm configuration
	Algorithm         BanditAlgorithm `json:"algorithm"`          // Thompson Sampling or LinUCB
	ExplorationRate   float64         `json:"exploration_rate"`   // Base exploration rate
	ConfidenceLevel   float64         `json:"confidence_level"`   // Confidence level for UCB
	PriorAlpha        float64         `json:"prior_alpha"`        // Beta distribution prior alpha
	PriorBeta         float64         `json:"prior_beta"`         // Beta distribution prior beta
	ContextDimension  int             `json:"context_dimension"`  // Dimension of context features
	RegularizationLam float64         `json:"regularization_lam"` // L2 regularization parameter for LinUCB

	// Strategy definitions
	Strategies map[string]*Strategy `json:"strategies"` // Available session strategies

	// Performance tracking
	PerformanceWindow int                            `json:"performance_window"` // Window for performance calculation
	RewardHistory     map[string][]RewardObservation `json:"reward_history"`     // Historical rewards per strategy
	ContextHistory    []ContextFeatures              `json:"context_history"`    // Historical context features

	// LinUCB specific state
	LinUCBState map[string]*LinUCBStrategyState `json:"linucb_state,omitempty"`

	// Thompson Sampling specific state
	ThompsonState map[string]*ThompsonStrategyState `json:"thompson_state,omitempty"`

	logger *logger.Logger
}

// BanditAlgorithm defines the type of bandit algorithm to use
type BanditAlgorithm string

const (
	ThompsonSampling BanditAlgorithm = "thompson_sampling"
	LinUCB           BanditAlgorithm = "linucb"
)

// Strategy represents a session strategy (practice, review, mock test)
type Strategy struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	MinDuration int     `json:"min_duration"` // Minimum session duration in minutes
	MaxDuration int     `json:"max_duration"` // Maximum session duration in minutes
	Difficulty  float64 `json:"difficulty"`   // Target difficulty level (0-1)
	Variety     float64 `json:"variety"`      // Topic variety emphasis (0-1)
	Urgency     float64 `json:"urgency"`      // SM-2 urgency emphasis (0-1)
	Mastery     float64 `json:"mastery"`      // BKT mastery gap emphasis (0-1)
}

// ContextFeatures represents the context for bandit decision making
type ContextFeatures struct {
	// User characteristics
	UserAbilityMean     float64 `json:"user_ability_mean"`     // Average ability across topics
	UserAbilityVariance float64 `json:"user_ability_variance"` // Variance in ability across topics
	UserMasteryMean     float64 `json:"user_mastery_mean"`     // Average mastery across topics
	UserMasteryVariance float64 `json:"user_mastery_variance"` // Variance in mastery across topics
	UserStreakDays      int     `json:"user_streak_days"`      // Consecutive study days
	UserTotalSessions   int     `json:"user_total_sessions"`   // Total sessions completed

	// Session context
	TimeOfDay        int     `json:"time_of_day"`       // Hour of day (0-23)
	DayOfWeek        int     `json:"day_of_week"`       // Day of week (0-6, 0=Sunday)
	SessionNumber    int     `json:"session_number"`    // Session number today
	AvailableTime    int     `json:"available_time"`    // Available time in minutes
	RecentAccuracy   float64 `json:"recent_accuracy"`   // Accuracy in last 10 attempts
	RecentDifficulty float64 `json:"recent_difficulty"` // Average difficulty of recent items

	// Learning state
	DueItemsCount     int     `json:"due_items_count"`     // Number of items due for review
	OverdueItemsCount int     `json:"overdue_items_count"` // Number of overdue items
	NewItemsCount     int     `json:"new_items_count"`     // Number of new items available
	MasteryGapSum     float64 `json:"mastery_gap_sum"`     // Sum of mastery gaps across topics
	UrgencyScore      float64 `json:"urgency_score"`       // Overall urgency score

	// Performance indicators
	RecentEngagement float64 `json:"recent_engagement"` // Engagement score (0-1)
	RecentRetention  float64 `json:"recent_retention"`  // Retention rate (0-1)
	RecentProgress   float64 `json:"recent_progress"`   // Progress rate (0-1)
	PredictedFatigue float64 `json:"predicted_fatigue"` // Fatigue prediction (0-1)
	MotivationLevel  float64 `json:"motivation_level"`  // Motivation estimate (0-1)

	Timestamp time.Time `json:"timestamp"`
}

// RewardObservation represents an observed reward for a strategy
type RewardObservation struct {
	Strategy  string          `json:"strategy"`
	Context   ContextFeatures `json:"context"`
	Reward    float64         `json:"reward"`
	SessionID string          `json:"session_id"`
	Timestamp time.Time       `json:"timestamp"`
	Metadata  map[string]any  `json:"metadata,omitempty"`
}

// LinUCBStrategyState maintains state for LinUCB algorithm per strategy
type LinUCBStrategyState struct {
	A          [][]float64 `json:"A"`         // A matrix (d x d)
	B          []float64   `json:"b"`         // b vector (d x 1)
	Theta      []float64   `json:"theta"`     // Parameter estimate
	Dimension  int         `json:"dimension"` // Context dimension
	Count      int         `json:"count"`     // Number of observations
	LastUpdate time.Time   `json:"last_update"`
}

// ThompsonStrategyState maintains state for Thompson Sampling per strategy
type ThompsonStrategyState struct {
	Alpha      float64   `json:"alpha"`       // Beta distribution alpha parameter
	Beta       float64   `json:"beta"`        // Beta distribution beta parameter
	Count      int       `json:"count"`       // Number of observations
	SuccessSum float64   `json:"success_sum"` // Sum of rewards
	LastUpdate time.Time `json:"last_update"`
}

// BanditSelection represents the result of strategy selection
type BanditSelection struct {
	Strategy         string          `json:"strategy"`
	Confidence       float64         `json:"confidence"`
	ExpectedReward   float64         `json:"expected_reward"`
	ExplorationBonus float64         `json:"exploration_bonus"`
	Context          ContextFeatures `json:"context"`
	Reason           string          `json:"reason"`
	Timestamp        time.Time       `json:"timestamp"`
}

// NewContextualBandit creates a new contextual bandit instance
func NewContextualBandit(algorithm BanditAlgorithm, logger *logger.Logger) *ContextualBandit {
	cb := &ContextualBandit{
		Algorithm:         algorithm,
		ExplorationRate:   0.1,
		ConfidenceLevel:   0.95,
		PriorAlpha:        1.0,
		PriorBeta:         1.0,
		ContextDimension:  15, // Number of features in ContextFeatures
		RegularizationLam: 1.0,
		PerformanceWindow: 100,
		Strategies:        make(map[string]*Strategy),
		RewardHistory:     make(map[string][]RewardObservation),
		ContextHistory:    make([]ContextFeatures, 0),
		LinUCBState:       make(map[string]*LinUCBStrategyState),
		ThompsonState:     make(map[string]*ThompsonStrategyState),
		logger:            logger,
	}

	// Initialize default strategies
	cb.initializeDefaultStrategies()

	return cb
}

// initializeDefaultStrategies sets up the default session strategies
func (cb *ContextualBandit) initializeDefaultStrategies() {
	cb.Strategies["practice"] = &Strategy{
		Name:        "practice",
		Description: "Focused practice on weak areas with moderate difficulty",
		MinDuration: 15,
		MaxDuration: 45,
		Difficulty:  0.6,
		Variety:     0.7,
		Urgency:     0.3,
		Mastery:     0.8,
	}

	cb.Strategies["review"] = &Strategy{
		Name:        "review",
		Description: "Spaced repetition review of due items",
		MinDuration: 10,
		MaxDuration: 30,
		Difficulty:  0.4,
		Variety:     0.4,
		Urgency:     0.9,
		Mastery:     0.3,
	}

	cb.Strategies["mock_test"] = &Strategy{
		Name:        "mock_test",
		Description: "Comprehensive test simulation with varied difficulty",
		MinDuration: 30,
		MaxDuration: 60,
		Difficulty:  0.7,
		Variety:     0.9,
		Urgency:     0.5,
		Mastery:     0.5,
	}

	cb.Strategies["exploration"] = &Strategy{
		Name:        "exploration",
		Description: "Explore new topics and content areas",
		MinDuration: 20,
		MaxDuration: 40,
		Difficulty:  0.5,
		Variety:     0.9,
		Urgency:     0.2,
		Mastery:     0.6,
	}

	cb.Strategies["intensive"] = &Strategy{
		Name:        "intensive",
		Description: "Intensive practice on challenging items",
		MinDuration: 25,
		MaxDuration: 50,
		Difficulty:  0.8,
		Variety:     0.3,
		Urgency:     0.4,
		Mastery:     0.9,
	}

	// Initialize algorithm-specific state for each strategy
	for strategyName := range cb.Strategies {
		cb.initializeStrategyState(strategyName)
	}
}

// initializeStrategyState initializes algorithm-specific state for a strategy
func (cb *ContextualBandit) initializeStrategyState(strategyName string) {
	switch cb.Algorithm {
	case LinUCB:
		cb.LinUCBState[strategyName] = &LinUCBStrategyState{
			A:          cb.createIdentityMatrix(cb.ContextDimension),
			B:          make([]float64, cb.ContextDimension),
			Theta:      make([]float64, cb.ContextDimension),
			Dimension:  cb.ContextDimension,
			Count:      0,
			LastUpdate: time.Now(),
		}
	case ThompsonSampling:
		cb.ThompsonState[strategyName] = &ThompsonStrategyState{
			Alpha:      cb.PriorAlpha,
			Beta:       cb.PriorBeta,
			Count:      0,
			SuccessSum: 0.0,
			LastUpdate: time.Now(),
		}
	}

	// Initialize reward history
	cb.RewardHistory[strategyName] = make([]RewardObservation, 0)
}

// SelectStrategy selects the best strategy given the current context
func (cb *ContextualBandit) SelectStrategy(ctx context.Context, contextFeatures ContextFeatures) (*BanditSelection, error) {
	if cb.logger != nil {
		cb.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"algorithm":       cb.Algorithm,
			"available_time":  contextFeatures.AvailableTime,
			"due_items":       contextFeatures.DueItemsCount,
			"recent_accuracy": contextFeatures.RecentAccuracy,
			"mastery_gap_sum": contextFeatures.MasteryGapSum,
		}).Debug("Selecting strategy with contextual bandit")
	}

	var selection *BanditSelection
	var err error

	switch cb.Algorithm {
	case ThompsonSampling:
		selection, err = cb.selectWithThompsonSampling(ctx, contextFeatures)
	case LinUCB:
		selection, err = cb.selectWithLinUCB(ctx, contextFeatures)
	default:
		return nil, fmt.Errorf("unsupported bandit algorithm: %s", cb.Algorithm)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to select strategy: %w", err)
	}

	// Store context for future analysis
	cb.ContextHistory = append(cb.ContextHistory, contextFeatures)
	if len(cb.ContextHistory) > cb.PerformanceWindow*2 {
		// Keep only recent history
		cb.ContextHistory = cb.ContextHistory[len(cb.ContextHistory)-cb.PerformanceWindow:]
	}

	if cb.logger != nil {
		cb.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"selected_strategy": selection.Strategy,
			"expected_reward":   selection.ExpectedReward,
			"confidence":        selection.Confidence,
			"reason":            selection.Reason,
		}).Info("Strategy selected by contextual bandit")
	}

	return selection, nil
}

// selectWithThompsonSampling implements Thompson Sampling strategy selection
func (cb *ContextualBandit) selectWithThompsonSampling(ctx context.Context, contextFeatures ContextFeatures) (*BanditSelection, error) {
	bestStrategy := ""
	bestSample := -1.0
	bestExpectedReward := 0.0
	bestConfidence := 0.0

	// Sample from posterior for each strategy
	for strategyName, strategy := range cb.Strategies {
		state := cb.ThompsonState[strategyName]

		// Check if strategy is feasible given time constraints
		if contextFeatures.AvailableTime < strategy.MinDuration {
			continue
		}

		// Sample from Beta distribution
		sample := cb.sampleBeta(state.Alpha, state.Beta)

		// Apply context-based adjustment
		contextAdjustment := cb.calculateContextAdjustment(contextFeatures, strategy)
		adjustedSample := sample * contextAdjustment

		// Calculate expected reward and confidence
		expectedReward := state.Alpha / (state.Alpha + state.Beta)
		confidence := cb.calculateThompsonConfidence(state)

		if adjustedSample > bestSample {
			bestStrategy = strategyName
			bestSample = adjustedSample
			bestExpectedReward = expectedReward
			bestConfidence = confidence
		}

		if cb.logger != nil {
			cb.logger.WithContext(ctx).WithFields(map[string]interface{}{
				"strategy":           strategyName,
				"alpha":              state.Alpha,
				"beta":               state.Beta,
				"sample":             sample,
				"context_adjustment": contextAdjustment,
				"adjusted_sample":    adjustedSample,
				"expected_reward":    expectedReward,
			}).Debug("Thompson sampling evaluation")
		}
	}

	if bestStrategy == "" {
		return nil, fmt.Errorf("no feasible strategy found for available time: %d minutes", contextFeatures.AvailableTime)
	}

	reason := cb.generateThompsonReason(bestStrategy, bestSample, contextFeatures)

	return &BanditSelection{
		Strategy:         bestStrategy,
		Confidence:       bestConfidence,
		ExpectedReward:   bestExpectedReward,
		ExplorationBonus: bestSample - bestExpectedReward,
		Context:          contextFeatures,
		Reason:           reason,
		Timestamp:        time.Now(),
	}, nil
}

// selectWithLinUCB implements LinUCB strategy selection
func (cb *ContextualBandit) selectWithLinUCB(ctx context.Context, contextFeatures ContextFeatures) (*BanditSelection, error) {
	contextVector := cb.contextToVector(contextFeatures)

	bestStrategy := ""
	bestUCB := -1.0
	bestExpectedReward := 0.0
	bestConfidence := 0.0

	// Calculate UCB for each strategy
	for strategyName, strategy := range cb.Strategies {
		state := cb.LinUCBState[strategyName]

		// Check if strategy is feasible given time constraints
		if contextFeatures.AvailableTime < strategy.MinDuration {
			continue
		}

		// Calculate expected reward (theta^T * x)
		expectedReward := cb.dotProduct(state.Theta, contextVector)

		// Calculate confidence bound
		confidenceBound := cb.calculateLinUCBConfidence(state, contextVector)

		// UCB score
		ucbScore := expectedReward + confidenceBound

		// Apply context-based adjustment
		contextAdjustment := cb.calculateContextAdjustment(contextFeatures, strategy)
		adjustedUCB := ucbScore * contextAdjustment

		if adjustedUCB > bestUCB {
			bestStrategy = strategyName
			bestUCB = adjustedUCB
			bestExpectedReward = expectedReward
			bestConfidence = confidenceBound
		}

		if cb.logger != nil {
			cb.logger.WithContext(ctx).WithFields(map[string]interface{}{
				"strategy":           strategyName,
				"expected_reward":    expectedReward,
				"confidence_bound":   confidenceBound,
				"ucb_score":          ucbScore,
				"context_adjustment": contextAdjustment,
				"adjusted_ucb":       adjustedUCB,
			}).Debug("LinUCB evaluation")
		}
	}

	if bestStrategy == "" {
		return nil, fmt.Errorf("no feasible strategy found for available time: %d minutes", contextFeatures.AvailableTime)
	}

	reason := cb.generateLinUCBReason(bestStrategy, bestExpectedReward, bestConfidence, contextFeatures)

	return &BanditSelection{
		Strategy:         bestStrategy,
		Confidence:       bestConfidence,
		ExpectedReward:   bestExpectedReward,
		ExplorationBonus: bestConfidence,
		Context:          contextFeatures,
		Reason:           reason,
		Timestamp:        time.Now(),
	}, nil
}

// UpdateReward updates the bandit model with observed reward
func (cb *ContextualBandit) UpdateReward(ctx context.Context, strategyName string, contextFeatures ContextFeatures, reward float64, sessionID string) error {
	if cb.logger != nil {
		cb.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"strategy":   strategyName,
			"reward":     reward,
			"session_id": sessionID,
		}).Debug("Updating bandit reward")
	}

	// Validate strategy exists
	if _, exists := cb.Strategies[strategyName]; !exists {
		return fmt.Errorf("unknown strategy: %s", strategyName)
	}

	// Create reward observation
	observation := RewardObservation{
		Strategy:  strategyName,
		Context:   contextFeatures,
		Reward:    reward,
		SessionID: sessionID,
		Timestamp: time.Now(),
	}

	// Add to reward history
	cb.RewardHistory[strategyName] = append(cb.RewardHistory[strategyName], observation)

	// Keep only recent history
	if len(cb.RewardHistory[strategyName]) > cb.PerformanceWindow {
		cb.RewardHistory[strategyName] = cb.RewardHistory[strategyName][1:]
	}

	// Update algorithm-specific state
	switch cb.Algorithm {
	case ThompsonSampling:
		err := cb.updateThompsonSampling(strategyName, reward)
		if err != nil {
			return fmt.Errorf("failed to update Thompson sampling: %w", err)
		}
	case LinUCB:
		err := cb.updateLinUCB(strategyName, contextFeatures, reward)
		if err != nil {
			return fmt.Errorf("failed to update LinUCB: %w", err)
		}
	}

	if cb.logger != nil {
		cb.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"strategy":       strategyName,
			"reward":         reward,
			"total_rewards":  len(cb.RewardHistory[strategyName]),
			"average_reward": cb.calculateAverageReward(strategyName),
		}).Info("Bandit reward updated")
	}

	return nil
}

// updateThompsonSampling updates Thompson Sampling state
func (cb *ContextualBandit) updateThompsonSampling(strategyName string, reward float64) error {
	state := cb.ThompsonState[strategyName]

	// Update Beta distribution parameters
	// Treat reward as success probability (0-1 range)
	normalizedReward := math.Max(0.0, math.Min(1.0, reward))

	state.Alpha += normalizedReward
	state.Beta += (1.0 - normalizedReward)
	state.Count++
	state.SuccessSum += normalizedReward
	state.LastUpdate = time.Now()

	return nil
}

// updateLinUCB updates LinUCB state
func (cb *ContextualBandit) updateLinUCB(strategyName string, contextFeatures ContextFeatures, reward float64) error {
	state := cb.LinUCBState[strategyName]
	contextVector := cb.contextToVector(contextFeatures)

	// Update A matrix: A = A + x * x^T
	for i := 0; i < cb.ContextDimension; i++ {
		for j := 0; j < cb.ContextDimension; j++ {
			state.A[i][j] += contextVector[i] * contextVector[j]
		}
	}

	// Update b vector: b = b + reward * x
	for i := 0; i < cb.ContextDimension; i++ {
		state.B[i] += reward * contextVector[i]
	}

	// Update theta: theta = A^(-1) * b
	err := cb.updateLinUCBTheta(state)
	if err != nil {
		return fmt.Errorf("failed to update theta: %w", err)
	}

	state.Count++
	state.LastUpdate = time.Now()

	return nil
}

// GetExplorationBonus calculates exploration bonus for unified scoring
func (cb *ContextualBandit) GetExplorationBonus(item *ItemCandidate, sessionContext *SessionContext) float64 {
	// Create context features from session context
	contextFeatures := cb.sessionContextToFeatures(sessionContext)

	// Calculate exploration bonus based on uncertainty
	switch cb.Algorithm {
	case ThompsonSampling:
		return cb.getThompsonExplorationBonus(contextFeatures)
	case LinUCB:
		return cb.getLinUCBExplorationBonus(contextFeatures)
	default:
		return cb.ExplorationRate // Fallback to base exploration rate
	}
}

// GetPerformanceMetrics returns performance metrics for all strategies
func (cb *ContextualBandit) GetPerformanceMetrics() map[string]interface{} {
	metrics := make(map[string]interface{})

	// Overall metrics
	metrics["algorithm"] = cb.Algorithm
	metrics["total_strategies"] = len(cb.Strategies)
	metrics["context_dimension"] = cb.ContextDimension
	metrics["performance_window"] = cb.PerformanceWindow

	// Strategy-specific metrics
	strategyMetrics := make(map[string]interface{})
	for strategyName := range cb.Strategies {
		strategyMetrics[strategyName] = cb.getStrategyMetrics(strategyName)
	}
	metrics["strategies"] = strategyMetrics

	// Algorithm-specific metrics
	switch cb.Algorithm {
	case ThompsonSampling:
		metrics["thompson_sampling"] = cb.getThompsonMetrics()
	case LinUCB:
		metrics["linucb"] = cb.getLinUCBMetrics()
	}

	return metrics
}

// Helper methods

// contextToVector converts context features to a vector for LinUCB
func (cb *ContextualBandit) contextToVector(features ContextFeatures) []float64 {
	return []float64{
		features.UserAbilityMean,
		features.UserAbilityVariance,
		features.UserMasteryMean,
		features.UserMasteryVariance,
		float64(features.UserStreakDays) / 30.0,     // Normalize to ~[0,1]
		float64(features.UserTotalSessions) / 100.0, // Normalize to ~[0,1]
		float64(features.TimeOfDay) / 24.0,
		float64(features.DayOfWeek) / 7.0,
		float64(features.SessionNumber) / 5.0,  // Assume max 5 sessions per day
		float64(features.AvailableTime) / 60.0, // Normalize to hours
		features.RecentAccuracy,
		features.RecentDifficulty,
		float64(features.DueItemsCount) / 50.0,     // Normalize assuming max 50 due items
		float64(features.OverdueItemsCount) / 20.0, // Normalize assuming max 20 overdue
		features.MasteryGapSum / 10.0,              // Normalize assuming max 10 topics
	}
}

// sessionContextToFeatures converts session context to context features
func (cb *ContextualBandit) sessionContextToFeatures(sessionContext *SessionContext) ContextFeatures {
	now := time.Now()

	return ContextFeatures{
		// Default values - in a real implementation, these would come from user data
		UserAbilityMean:     0.5,
		UserAbilityVariance: 0.2,
		UserMasteryMean:     0.6,
		UserMasteryVariance: 0.3,
		UserStreakDays:      1,
		UserTotalSessions:   10,

		// Session context
		TimeOfDay:        now.Hour(),
		DayOfWeek:        int(now.Weekday()),
		SessionNumber:    1,
		AvailableTime:    int(sessionContext.TimeRemaining.Minutes()),
		RecentAccuracy:   float64(sessionContext.CorrectCount) / math.Max(1.0, float64(sessionContext.ItemsCompleted)),
		RecentDifficulty: sessionContext.AverageDifficulty,

		// Learning state - defaults for now
		DueItemsCount:     10,
		OverdueItemsCount: 5,
		NewItemsCount:     20,
		MasteryGapSum:     3.0,
		UrgencyScore:      0.5,

		// Performance indicators - defaults
		RecentEngagement: 0.7,
		RecentRetention:  0.8,
		RecentProgress:   0.6,
		PredictedFatigue: 0.3,
		MotivationLevel:  0.8,

		Timestamp: now,
	}
}

// calculateContextAdjustment calculates context-based adjustment for strategy selection
func (cb *ContextualBandit) calculateContextAdjustment(context ContextFeatures, strategy *Strategy) float64 {
	adjustment := 1.0

	// Time-based adjustments
	if context.AvailableTime < strategy.MinDuration {
		return 0.0 // Strategy not feasible
	}

	// Prefer strategies that fit well within available time
	timeFit := 1.0 - math.Abs(float64(context.AvailableTime-strategy.MaxDuration))/float64(strategy.MaxDuration)
	adjustment *= (0.8 + 0.2*timeFit)

	// Accuracy-based adjustments
	if context.RecentAccuracy < 0.5 && strategy.Name == "intensive" {
		adjustment *= 1.2 // Boost intensive practice for low accuracy
	}
	if context.RecentAccuracy > 0.8 && strategy.Name == "exploration" {
		adjustment *= 1.1 // Boost exploration for high accuracy
	}

	// Due items adjustment
	if context.DueItemsCount > 10 && strategy.Name == "review" {
		adjustment *= 1.3 // Boost review when many items are due
	}

	// Time of day adjustments
	if context.TimeOfDay < 10 || context.TimeOfDay > 20 {
		// Early morning or late evening - prefer shorter sessions
		if strategy.MaxDuration <= 30 {
			adjustment *= 1.1
		}
	}

	// Fatigue adjustments
	if context.PredictedFatigue > 0.7 {
		if strategy.Name == "review" || strategy.Difficulty < 0.5 {
			adjustment *= 1.2 // Prefer easier strategies when fatigued
		}
	}

	return math.Max(0.1, math.Min(2.0, adjustment))
}

// sampleBeta samples from Beta distribution using rejection sampling
func (cb *ContextualBandit) sampleBeta(alpha, beta float64) float64 {
	// Simple Beta sampling using two Gamma distributions
	// In production, use a proper statistical library

	if alpha <= 0 || beta <= 0 {
		return 0.5 // Fallback
	}

	// Approximate Beta sampling
	x := rand.Float64()
	for i := 0; i < 10; i++ { // Simple approximation
		x = (x + rand.Float64()) / 2.0
	}

	// Adjust based on alpha and beta parameters
	mean := alpha / (alpha + beta)
	variance := (alpha * beta) / ((alpha + beta) * (alpha + beta) * (alpha + beta + 1))

	// Simple transformation
	result := mean + (x-0.5)*math.Sqrt(variance)*2.0
	return math.Max(0.0, math.Min(1.0, result))
}

// calculateThompsonConfidence calculates confidence for Thompson Sampling
func (cb *ContextualBandit) calculateThompsonConfidence(state *ThompsonStrategyState) float64 {
	if state.Count == 0 {
		return 0.1 // Low confidence for new strategies
	}

	// Confidence based on number of observations and variance
	total := state.Alpha + state.Beta
	variance := (state.Alpha * state.Beta) / (total * total * (total + 1))

	// Higher count and lower variance = higher confidence
	confidence := math.Min(0.95, float64(state.Count)/100.0) * (1.0 - variance)
	return math.Max(0.1, confidence)
}

// calculateLinUCBConfidence calculates confidence bound for LinUCB
func (cb *ContextualBandit) calculateLinUCBConfidence(state *LinUCBStrategyState, contextVector []float64) float64 {
	// Calculate x^T * A^(-1) * x
	// For simplicity, we'll approximate this

	// Calculate diagonal approximation of A^(-1)
	diagonalSum := 0.0
	for i := 0; i < cb.ContextDimension; i++ {
		if state.A[i][i] > 0 {
			diagonalSum += (contextVector[i] * contextVector[i]) / state.A[i][i]
		}
	}

	// Confidence bound with regularization
	alpha := 1.0 + math.Sqrt(math.Log(2.0/0.05)/2.0) // 95% confidence
	confidenceBound := alpha * math.Sqrt(cb.RegularizationLam*diagonalSum)

	// Normalize confidence bound to [0, 1] range using sigmoid
	normalizedConfidence := 1.0 / (1.0 + math.Exp(-confidenceBound))
	return math.Max(0.0, math.Min(1.0, normalizedConfidence))
}

// createIdentityMatrix creates an identity matrix of given size
func (cb *ContextualBandit) createIdentityMatrix(size int) [][]float64 {
	matrix := make([][]float64, size)
	for i := range matrix {
		matrix[i] = make([]float64, size)
		matrix[i][i] = cb.RegularizationLam // Regularized identity
	}
	return matrix
}

// dotProduct calculates dot product of two vectors
func (cb *ContextualBandit) dotProduct(a, b []float64) float64 {
	if len(a) != len(b) {
		return 0.0
	}

	result := 0.0
	for i := range a {
		result += a[i] * b[i]
	}
	return result
}

// updateLinUCBTheta updates theta parameter for LinUCB (simplified)
func (cb *ContextualBandit) updateLinUCBTheta(state *LinUCBStrategyState) error {
	// Simplified theta update: theta_i = b_i / A_ii
	// In production, use proper matrix inversion

	for i := 0; i < cb.ContextDimension; i++ {
		if state.A[i][i] > 0 {
			state.Theta[i] = state.B[i] / state.A[i][i]
		}
	}

	return nil
}

// calculateAverageReward calculates average reward for a strategy
func (cb *ContextualBandit) calculateAverageReward(strategyName string) float64 {
	rewards := cb.RewardHistory[strategyName]
	if len(rewards) == 0 {
		return 0.0
	}

	sum := 0.0
	for _, reward := range rewards {
		sum += reward.Reward
	}

	return sum / float64(len(rewards))
}

// getThompsonExplorationBonus calculates exploration bonus for Thompson Sampling
func (cb *ContextualBandit) getThompsonExplorationBonus(context ContextFeatures) float64 {
	// Base exploration rate adjusted by context
	baseBonus := cb.ExplorationRate

	// Increase exploration for new users or low confidence situations
	if context.UserTotalSessions < 10 {
		baseBonus *= 1.5
	}

	// Adjust based on recent performance
	if context.RecentAccuracy < 0.4 {
		baseBonus *= 1.2 // More exploration when struggling
	}

	return baseBonus
}

// getLinUCBExplorationBonus calculates exploration bonus for LinUCB
func (cb *ContextualBandit) getLinUCBExplorationBonus(context ContextFeatures) float64 {
	// LinUCB exploration is built into the confidence bounds
	// Return a small base bonus
	return cb.ExplorationRate * 0.5
}

// generateThompsonReason generates explanation for Thompson Sampling selection
func (cb *ContextualBandit) generateThompsonReason(strategy string, sample float64, context ContextFeatures) string {
	reasons := []string{}

	if sample > 0.8 {
		reasons = append(reasons, "high confidence in strategy effectiveness")
	} else if sample > 0.6 {
		reasons = append(reasons, "moderate confidence with exploration")
	} else {
		reasons = append(reasons, "exploratory selection")
	}

	// Add context-specific reasons
	if context.DueItemsCount > 10 && strategy == "review" {
		reasons = append(reasons, "many items due for review")
	}
	if context.RecentAccuracy < 0.5 && strategy == "practice" {
		reasons = append(reasons, "recent accuracy suggests need for practice")
	}
	if context.AvailableTime > 45 && strategy == "mock_test" {
		reasons = append(reasons, "sufficient time for comprehensive test")
	}

	if len(reasons) == 0 {
		return fmt.Sprintf("Thompson sampling selected %s", strategy)
	}

	return fmt.Sprintf("%s (%s)", strategy, reasons[0])
}

// generateLinUCBReason generates explanation for LinUCB selection
func (cb *ContextualBandit) generateLinUCBReason(strategy string, expectedReward, confidence float64, context ContextFeatures) string {
	reasons := []string{}

	if confidence > 0.3 {
		reasons = append(reasons, "high uncertainty drives exploration")
	} else if expectedReward > 0.7 {
		reasons = append(reasons, "high expected reward")
	} else {
		reasons = append(reasons, "balanced exploration-exploitation")
	}

	// Add context-specific reasons
	if context.DueItemsCount > 10 && strategy == "review" {
		reasons = append(reasons, "optimized for current due items")
	}
	if context.RecentAccuracy < 0.5 && strategy == "intensive" {
		reasons = append(reasons, "targeted practice for improvement")
	}

	if len(reasons) == 0 {
		return fmt.Sprintf("LinUCB selected %s (reward: %.2f)", strategy, expectedReward)
	}

	return fmt.Sprintf("%s (%s)", strategy, reasons[0])
}

// getStrategyMetrics returns metrics for a specific strategy
func (cb *ContextualBandit) getStrategyMetrics(strategyName string) map[string]interface{} {
	metrics := make(map[string]interface{})

	rewards := cb.RewardHistory[strategyName]
	metrics["total_selections"] = len(rewards)
	metrics["average_reward"] = cb.calculateAverageReward(strategyName)

	if len(rewards) > 0 {
		metrics["last_selected"] = rewards[len(rewards)-1].Timestamp

		// Calculate recent performance (last 20 selections)
		recentCount := 20
		if len(rewards) < recentCount {
			recentCount = len(rewards)
		}

		recentSum := 0.0
		for i := len(rewards) - recentCount; i < len(rewards); i++ {
			recentSum += rewards[i].Reward
		}
		metrics["recent_average_reward"] = recentSum / float64(recentCount)
	}

	// Algorithm-specific metrics
	switch cb.Algorithm {
	case ThompsonSampling:
		if state, exists := cb.ThompsonState[strategyName]; exists {
			metrics["alpha"] = state.Alpha
			metrics["beta"] = state.Beta
			metrics["success_rate"] = state.Alpha / (state.Alpha + state.Beta)
		}
	case LinUCB:
		if state, exists := cb.LinUCBState[strategyName]; exists {
			metrics["observations"] = state.Count
			metrics["last_update"] = state.LastUpdate
		}
	}

	return metrics
}

// getThompsonMetrics returns Thompson Sampling specific metrics
func (cb *ContextualBandit) getThompsonMetrics() map[string]interface{} {
	metrics := make(map[string]interface{})

	totalSelections := 0
	totalSuccessRate := 0.0

	for strategyName, state := range cb.ThompsonState {
		totalSelections += state.Count
		if state.Count > 0 {
			successRate := state.Alpha / (state.Alpha + state.Beta)
			totalSuccessRate += successRate
		}

		metrics[strategyName+"_alpha"] = state.Alpha
		metrics[strategyName+"_beta"] = state.Beta
	}

	metrics["total_selections"] = totalSelections
	if len(cb.ThompsonState) > 0 {
		metrics["average_success_rate"] = totalSuccessRate / float64(len(cb.ThompsonState))
	}

	return metrics
}

// getLinUCBMetrics returns LinUCB specific metrics
func (cb *ContextualBandit) getLinUCBMetrics() map[string]interface{} {
	metrics := make(map[string]interface{})

	totalObservations := 0

	for strategyName, state := range cb.LinUCBState {
		totalObservations += state.Count
		metrics[strategyName+"_observations"] = state.Count
		metrics[strategyName+"_last_update"] = state.LastUpdate
	}

	metrics["total_observations"] = totalObservations
	metrics["context_dimension"] = cb.ContextDimension
	metrics["regularization_lambda"] = cb.RegularizationLam

	return metrics
}

// AddStrategy adds a new strategy to the bandit
func (cb *ContextualBandit) AddStrategy(strategy *Strategy) error {
	if _, exists := cb.Strategies[strategy.Name]; exists {
		return fmt.Errorf("strategy %s already exists", strategy.Name)
	}

	cb.Strategies[strategy.Name] = strategy
	cb.initializeStrategyState(strategy.Name)

	return nil
}

// RemoveStrategy removes a strategy from the bandit
func (cb *ContextualBandit) RemoveStrategy(strategyName string) error {
	if _, exists := cb.Strategies[strategyName]; !exists {
		return fmt.Errorf("strategy %s does not exist", strategyName)
	}

	delete(cb.Strategies, strategyName)
	delete(cb.RewardHistory, strategyName)
	delete(cb.LinUCBState, strategyName)
	delete(cb.ThompsonState, strategyName)

	return nil
}

// GetStrategy returns a strategy by name
func (cb *ContextualBandit) GetStrategy(strategyName string) (*Strategy, bool) {
	strategy, exists := cb.Strategies[strategyName]
	return strategy, exists
}

// ListStrategies returns all available strategies
func (cb *ContextualBandit) ListStrategies() map[string]*Strategy {
	strategies := make(map[string]*Strategy)
	for name, strategy := range cb.Strategies {
		strategies[name] = strategy
	}
	return strategies
}

// Reset resets the bandit state (useful for testing or retraining)
func (cb *ContextualBandit) Reset() {
	cb.RewardHistory = make(map[string][]RewardObservation)
	cb.ContextHistory = make([]ContextFeatures, 0)
	cb.LinUCBState = make(map[string]*LinUCBStrategyState)
	cb.ThompsonState = make(map[string]*ThompsonStrategyState)

	// Reinitialize strategy states
	for strategyName := range cb.Strategies {
		cb.initializeStrategyState(strategyName)
	}
}

// OptimizeParameters automatically optimizes bandit parameters based on performance
func (cb *ContextualBandit) OptimizeParameters(ctx context.Context) error {
	if cb.logger != nil {
		cb.logger.WithContext(ctx).Info("Starting bandit parameter optimization")
	}

	// Calculate overall performance metrics
	totalRewards := 0.0
	totalObservations := 0
	strategyPerformance := make(map[string]float64)

	for strategyName, rewards := range cb.RewardHistory {
		if len(rewards) == 0 {
			continue
		}

		sum := 0.0
		for _, reward := range rewards {
			sum += reward.Reward
			totalRewards += reward.Reward
			totalObservations++
		}

		avgReward := sum / float64(len(rewards))
		strategyPerformance[strategyName] = avgReward
	}

	if totalObservations < 10 {
		// Not enough data for optimization
		return nil
	}

	overallAverage := totalRewards / float64(totalObservations)

	// Optimize exploration rate based on performance variance
	variance := 0.0
	for _, performance := range strategyPerformance {
		diff := performance - overallAverage
		variance += diff * diff
	}
	variance /= float64(len(strategyPerformance))

	// Adjust exploration rate: higher variance suggests need for more exploration
	if variance > 0.1 {
		cb.ExplorationRate = math.Min(0.3, cb.ExplorationRate*1.1)
	} else if variance < 0.05 {
		cb.ExplorationRate = math.Max(0.05, cb.ExplorationRate*0.9)
	}

	// Optimize algorithm-specific parameters
	switch cb.Algorithm {
	case ThompsonSampling:
		err := cb.optimizeThompsonParameters()
		if err != nil {
			return fmt.Errorf("failed to optimize Thompson sampling parameters: %w", err)
		}
	case LinUCB:
		err := cb.optimizeLinUCBParameters()
		if err != nil {
			return fmt.Errorf("failed to optimize LinUCB parameters: %w", err)
		}
	}

	if cb.logger != nil {
		cb.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"exploration_rate":     cb.ExplorationRate,
			"overall_average":      overallAverage,
			"performance_variance": variance,
			"total_observations":   totalObservations,
		}).Info("Bandit parameters optimized")
	}

	return nil
}

// optimizeThompsonParameters optimizes Thompson Sampling specific parameters
func (cb *ContextualBandit) optimizeThompsonParameters() error {
	// Adjust prior parameters based on observed performance
	for strategyName, rewards := range cb.RewardHistory {
		if len(rewards) < 5 {
			continue
		}

		state := cb.ThompsonState[strategyName]
		if state == nil {
			continue
		}

		// Calculate empirical success rate
		successSum := 0.0
		for _, reward := range rewards {
			successSum += reward.Reward
		}
		empiricalRate := successSum / float64(len(rewards))

		// Adjust priors to be more informative based on empirical data
		// Use method of moments to estimate better priors
		if empiricalRate > 0 && empiricalRate < 1 {
			// Estimate alpha and beta from empirical mean and variance
			variance := 0.0
			for _, reward := range rewards {
				diff := reward.Reward - empiricalRate
				variance += diff * diff
			}
			variance /= float64(len(rewards) - 1)

			if variance > 0 && variance < empiricalRate*(1-empiricalRate) {
				// Calculate method of moments estimates
				commonFactor := (empiricalRate*(1-empiricalRate)/variance - 1)
				newAlpha := empiricalRate * commonFactor
				newBeta := (1 - empiricalRate) * commonFactor

				// Apply smoothing to avoid drastic changes
				smoothingFactor := 0.1
				state.Alpha = state.Alpha*(1-smoothingFactor) + newAlpha*smoothingFactor
				state.Beta = state.Beta*(1-smoothingFactor) + newBeta*smoothingFactor

				// Ensure reasonable bounds
				state.Alpha = math.Max(0.1, math.Min(10.0, state.Alpha))
				state.Beta = math.Max(0.1, math.Min(10.0, state.Beta))
			}
		}
	}

	return nil
}

// optimizeLinUCBParameters optimizes LinUCB specific parameters
func (cb *ContextualBandit) optimizeLinUCBParameters() error {
	// Adjust regularization parameter based on performance
	totalObservations := 0
	for _, state := range cb.LinUCBState {
		totalObservations += state.Count
	}

	if totalObservations > 100 {
		// Reduce regularization as we get more data
		cb.RegularizationLam = math.Max(0.1, cb.RegularizationLam*0.95)
	} else if totalObservations < 20 {
		// Increase regularization with little data
		cb.RegularizationLam = math.Min(2.0, cb.RegularizationLam*1.05)
	}

	return nil
}

// GetConvergenceMetrics returns metrics about bandit convergence and stability
func (cb *ContextualBandit) GetConvergenceMetrics() map[string]interface{} {
	metrics := make(map[string]interface{})

	// Calculate selection distribution entropy (higher = more exploration)
	selectionCounts := make(map[string]int)
	totalSelections := 0

	for strategyName, rewards := range cb.RewardHistory {
		count := len(rewards)
		selectionCounts[strategyName] = count
		totalSelections += count
	}

	if totalSelections > 0 {
		entropy := 0.0
		for _, count := range selectionCounts {
			if count > 0 {
				prob := float64(count) / float64(totalSelections)
				entropy -= prob * math.Log2(prob)
			}
		}
		metrics["selection_entropy"] = entropy
		metrics["max_entropy"] = math.Log2(float64(len(cb.Strategies)))
		metrics["exploration_ratio"] = entropy / math.Log2(float64(len(cb.Strategies)))
	}

	// Calculate reward stability (lower variance = more stable)
	recentWindow := 20
	if totalSelections >= recentWindow {
		recentRewards := make([]float64, 0, recentWindow)

		// Collect recent rewards across all strategies
		for _, rewards := range cb.RewardHistory {
			startIdx := len(rewards) - recentWindow/len(cb.Strategies)
			if startIdx < 0 {
				startIdx = 0
			}

			for i := startIdx; i < len(rewards) && len(recentRewards) < recentWindow; i++ {
				recentRewards = append(recentRewards, rewards[i].Reward)
			}
		}

		if len(recentRewards) > 1 {
			// Calculate mean and variance of recent rewards
			mean := 0.0
			for _, reward := range recentRewards {
				mean += reward
			}
			mean /= float64(len(recentRewards))

			variance := 0.0
			for _, reward := range recentRewards {
				diff := reward - mean
				variance += diff * diff
			}
			variance /= float64(len(recentRewards) - 1)

			metrics["recent_reward_mean"] = mean
			metrics["recent_reward_variance"] = variance
			metrics["recent_reward_stability"] = 1.0 / (1.0 + variance) // Higher = more stable
		}
	}

	// Algorithm-specific convergence metrics
	switch cb.Algorithm {
	case ThompsonSampling:
		metrics["thompson_convergence"] = cb.getThompsonConvergenceMetrics()
	case LinUCB:
		metrics["linucb_convergence"] = cb.getLinUCBConvergenceMetrics()
	}

	metrics["total_observations"] = totalSelections
	metrics["strategies_count"] = len(cb.Strategies)
	metrics["exploration_rate"] = cb.ExplorationRate

	return metrics
}

// getThompsonConvergenceMetrics calculates Thompson Sampling specific convergence metrics
func (cb *ContextualBandit) getThompsonConvergenceMetrics() map[string]interface{} {
	metrics := make(map[string]interface{})

	totalAlpha := 0.0
	totalBeta := 0.0
	maxConfidence := 0.0
	minConfidence := 1.0

	for strategyName, state := range cb.ThompsonState {
		totalAlpha += state.Alpha
		totalBeta += state.Beta

		confidence := cb.calculateThompsonConfidence(state)
		if confidence > maxConfidence {
			maxConfidence = confidence
		}
		if confidence < minConfidence {
			minConfidence = confidence
		}

		metrics[strategyName+"_alpha"] = state.Alpha
		metrics[strategyName+"_beta"] = state.Beta
		metrics[strategyName+"_confidence"] = confidence
	}

	if len(cb.ThompsonState) > 0 {
		metrics["avg_alpha"] = totalAlpha / float64(len(cb.ThompsonState))
		metrics["avg_beta"] = totalBeta / float64(len(cb.ThompsonState))
		metrics["confidence_range"] = maxConfidence - minConfidence
	}

	return metrics
}

// getLinUCBConvergenceMetrics calculates LinUCB specific convergence metrics
func (cb *ContextualBandit) getLinUCBConvergenceMetrics() map[string]interface{} {
	metrics := make(map[string]interface{})

	totalObservations := 0
	maxConfidence := 0.0
	minConfidence := 1.0

	for strategyName, state := range cb.LinUCBState {
		totalObservations += state.Count

		// Calculate average confidence for this strategy
		contextVector := make([]float64, cb.ContextDimension)
		for i := range contextVector {
			contextVector[i] = 0.5 // Use neutral context for confidence estimation
		}

		confidence := cb.calculateLinUCBConfidence(state, contextVector)
		if confidence > maxConfidence {
			maxConfidence = confidence
		}
		if confidence < minConfidence {
			minConfidence = confidence
		}

		metrics[strategyName+"_observations"] = state.Count
		metrics[strategyName+"_confidence"] = confidence
	}

	metrics["total_observations"] = totalObservations
	metrics["confidence_range"] = maxConfidence - minConfidence
	metrics["regularization_lambda"] = cb.RegularizationLam

	return metrics
}
