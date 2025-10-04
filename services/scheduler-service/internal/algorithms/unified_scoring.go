package algorithms

import (
	"context"
	"fmt"
	"math"
	"time"

	"scheduler-service/internal/logger"
)

// UnifiedScoringAlgorithm implements the unified scoring function that combines
// SM-2 urgency, BKT mastery gaps, IRT difficulty matching, and contextual bandit exploration
type UnifiedScoringAlgorithm struct {
	// Component weights (should sum to 1.0)
	WeightUrgency     float64 // Weight for SM-2 urgency component
	WeightMastery     float64 // Weight for BKT mastery gap component
	WeightDifficulty  float64 // Weight for IRT difficulty matching component
	WeightExploration float64 // Weight for contextual bandit exploration

	// Session constraints
	MaxSessionTime       time.Duration // Maximum session duration
	MinTopicInterleaving int           // Minimum items between same topic
	MaxConsecutiveTopic  int           // Maximum consecutive items from same topic
	DifficultyVariance   float64       // Target variance in difficulty distribution
	RecentItemsWindow    int           // Number of recent items to avoid

	// Exploration vs exploitation parameters
	ExplorationDecay   float64 // Rate at which exploration decreases over time
	MinExplorationRate float64 // Minimum exploration rate
	MaxExplorationRate float64 // Maximum exploration rate
	NoveltyBonus       float64 // Bonus for items not recently attempted
	VarietyBonus       float64 // Bonus for topic variety in session

	// A/B testing framework
	ABTestingEnabled  bool                       // Whether A/B testing is enabled
	ScoringStrategies map[string]ScoringStrategy // Available scoring strategies
	DefaultStrategy   string                     // Default strategy name

	// Contextual bandit for strategy selection
	ContextualBandit *ContextualBandit // Bandit for session strategy selection

	logger *logger.Logger
}

// ScoringStrategy defines different approaches to unified scoring
type ScoringStrategy struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Weights     ScoringWeights    `json:"weights"`
	Parameters  ScoringParameters `json:"parameters"`
}

// ScoringWeights defines the weights for different scoring components
type ScoringWeights struct {
	Urgency     float64 `json:"urgency"`
	Mastery     float64 `json:"mastery"`
	Difficulty  float64 `json:"difficulty"`
	Exploration float64 `json:"exploration"`
}

// ScoringParameters defines parameters for scoring behavior
type ScoringParameters struct {
	ExplorationRate     float64 `json:"exploration_rate"`
	NoveltyWeight       float64 `json:"novelty_weight"`
	VarietyWeight       float64 `json:"variety_weight"`
	DifficultyTolerance float64 `json:"difficulty_tolerance"`
}

// SessionContext contains information about the current learning session
type SessionContext struct {
	SessionID         string        `json:"session_id"`
	SessionType       string        `json:"session_type"` // "practice", "review", "mock_test"
	ElapsedTime       time.Duration `json:"elapsed_time"`
	ItemsCompleted    int           `json:"items_completed"`
	CorrectCount      int           `json:"correct_count"`
	TopicsPracticed   []string      `json:"topics_practiced"`
	RecentItems       []string      `json:"recent_items"`
	AverageDifficulty float64       `json:"average_difficulty"`
	TargetItemCount   int           `json:"target_item_count"`
	TimeRemaining     time.Duration `json:"time_remaining"`
}

// ItemCandidate represents a candidate item for selection
type ItemCandidate struct {
	ItemID         string                 `json:"item_id"`
	Topics         []string               `json:"topics"`
	Difficulty     float64                `json:"difficulty"`
	Discrimination float64                `json:"discrimination"`
	Guessing       float64                `json:"guessing"`
	EstimatedTime  time.Duration          `json:"estimated_time"`
	LastAttempted  *time.Time             `json:"last_attempted,omitempty"`
	AttemptCount   int                    `json:"attempt_count"`
	Metadata       map[string]interface{} `json:"metadata"`
}

// ScoringResult contains the unified score and component breakdown
type ScoringResult struct {
	ItemID          string            `json:"item_id"`
	UnifiedScore    float64           `json:"unified_score"`
	ComponentScores ComponentScores   `json:"component_scores"`
	Constraints     ConstraintResults `json:"constraints"`
	Reason          string            `json:"reason"`
	Strategy        string            `json:"strategy"`
}

// ComponentScores breaks down the unified score into its components
type ComponentScores struct {
	UrgencyScore     float64 `json:"urgency_score"`
	MasteryGapScore  float64 `json:"mastery_gap_score"`
	DifficultyScore  float64 `json:"difficulty_score"`
	ExplorationScore float64 `json:"exploration_score"`
	NoveltyBonus     float64 `json:"novelty_bonus"`
	VarietyBonus     float64 `json:"variety_bonus"`
}

// ConstraintResults indicates whether session constraints are satisfied
type ConstraintResults struct {
	TimeConstraint      bool   `json:"time_constraint"`
	InterleavingOK      bool   `json:"interleaving_ok"`
	DifficultyVariance  bool   `json:"difficulty_variance"`
	RecentItemsOK       bool   `json:"recent_items_ok"`
	ConstraintViolation string `json:"constraint_violation,omitempty"`
}

// NewUnifiedScoringAlgorithm creates a new unified scoring algorithm with default parameters
func NewUnifiedScoringAlgorithm(logger *logger.Logger) *UnifiedScoringAlgorithm {
	usa := &UnifiedScoringAlgorithm{
		// Default weights (balanced approach)
		WeightUrgency:     0.30, // SM-2 urgency
		WeightMastery:     0.35, // BKT mastery gaps
		WeightDifficulty:  0.25, // IRT difficulty matching
		WeightExploration: 0.10, // Contextual bandit exploration

		// Session constraints
		MaxSessionTime:       45 * time.Minute,
		MinTopicInterleaving: 2,
		MaxConsecutiveTopic:  3,
		DifficultyVariance:   0.3,
		RecentItemsWindow:    10,

		// Exploration parameters
		ExplorationDecay:   0.95,
		MinExplorationRate: 0.05,
		MaxExplorationRate: 0.25,
		NoveltyBonus:       0.15,
		VarietyBonus:       0.10,

		// A/B testing
		ABTestingEnabled: true,
		DefaultStrategy:  "balanced",

		logger: logger,
	}

	// Initialize scoring strategies
	usa.initializeScoringStrategies()

	// Initialize contextual bandit with Thompson Sampling
	usa.ContextualBandit = NewContextualBandit(ThompsonSampling, logger)

	return usa
}

// initializeScoringStrategies sets up different scoring strategies for A/B testing
func (usa *UnifiedScoringAlgorithm) initializeScoringStrategies() {
	usa.ScoringStrategies = map[string]ScoringStrategy{
		"balanced": {
			Name:        "balanced",
			Description: "Balanced approach with equal emphasis on all components",
			Weights: ScoringWeights{
				Urgency:     0.30,
				Mastery:     0.35,
				Difficulty:  0.25,
				Exploration: 0.10,
			},
			Parameters: ScoringParameters{
				ExplorationRate:     0.15,
				NoveltyWeight:       0.15,
				VarietyWeight:       0.10,
				DifficultyTolerance: 0.3,
			},
		},
		"urgency_focused": {
			Name:        "urgency_focused",
			Description: "Prioritizes SM-2 urgency for spaced repetition",
			Weights: ScoringWeights{
				Urgency:     0.50,
				Mastery:     0.25,
				Difficulty:  0.20,
				Exploration: 0.05,
			},
			Parameters: ScoringParameters{
				ExplorationRate:     0.10,
				NoveltyWeight:       0.10,
				VarietyWeight:       0.05,
				DifficultyTolerance: 0.4,
			},
		},
		"mastery_focused": {
			Name:        "mastery_focused",
			Description: "Prioritizes BKT mastery gaps for knowledge building",
			Weights: ScoringWeights{
				Urgency:     0.20,
				Mastery:     0.50,
				Difficulty:  0.25,
				Exploration: 0.05,
			},
			Parameters: ScoringParameters{
				ExplorationRate:     0.10,
				NoveltyWeight:       0.10,
				VarietyWeight:       0.15,
				DifficultyTolerance: 0.2,
			},
		},
		"adaptive_challenge": {
			Name:        "adaptive_challenge",
			Description: "Prioritizes IRT difficulty matching for optimal challenge",
			Weights: ScoringWeights{
				Urgency:     0.20,
				Mastery:     0.25,
				Difficulty:  0.45,
				Exploration: 0.10,
			},
			Parameters: ScoringParameters{
				ExplorationRate:     0.20,
				NoveltyWeight:       0.20,
				VarietyWeight:       0.15,
				DifficultyTolerance: 0.15,
			},
		},
		"exploratory": {
			Name:        "exploratory",
			Description: "High exploration for discovering user preferences",
			Weights: ScoringWeights{
				Urgency:     0.25,
				Mastery:     0.30,
				Difficulty:  0.25,
				Exploration: 0.20,
			},
			Parameters: ScoringParameters{
				ExplorationRate:     0.30,
				NoveltyWeight:       0.25,
				VarietyWeight:       0.20,
				DifficultyTolerance: 0.4,
			},
		},
	}
}

// ComputeUnifiedScore calculates the unified score for an item candidate
func (usa *UnifiedScoringAlgorithm) ComputeUnifiedScore(
	ctx context.Context,
	candidate *ItemCandidate,
	sm2State *SM2State,
	bktStates map[string]*BKTState,
	irtStates map[string]*IRTState,
	sessionContext *SessionContext,
	strategy string,
) (*ScoringResult, error) {
	// Get scoring strategy
	scoringStrategy, exists := usa.ScoringStrategies[strategy]
	if !exists {
		scoringStrategy = usa.ScoringStrategies[usa.DefaultStrategy]
		strategy = usa.DefaultStrategy
	}

	// Initialize result
	result := &ScoringResult{
		ItemID:          candidate.ItemID,
		Strategy:        strategy,
		ComponentScores: ComponentScores{},
		Constraints: ConstraintResults{
			TimeConstraint:     true,
			InterleavingOK:     true,
			DifficultyVariance: true,
			RecentItemsOK:      true,
		},
	}

	// Check session constraints first
	if !usa.checkSessionConstraints(candidate, sessionContext, &result.Constraints) {
		result.UnifiedScore = 0.0
		result.Reason = fmt.Sprintf("Constraint violation: %s", result.Constraints.ConstraintViolation)
		return result, nil
	}

	// Calculate SM-2 urgency component
	urgencyScore := usa.calculateUrgencyScore(sm2State, time.Now())
	result.ComponentScores.UrgencyScore = urgencyScore

	// Calculate BKT mastery gap component
	masteryGapScore := usa.calculateMasteryGapScore(candidate.Topics, bktStates)
	result.ComponentScores.MasteryGapScore = masteryGapScore

	// Calculate IRT difficulty matching component
	difficultyScore := usa.calculateDifficultyScore(candidate, irtStates, scoringStrategy.Parameters.DifficultyTolerance)
	result.ComponentScores.DifficultyScore = difficultyScore

	// Calculate exploration component
	explorationScore := usa.calculateExplorationScore(candidate, sessionContext, scoringStrategy.Parameters.ExplorationRate)
	result.ComponentScores.ExplorationScore = explorationScore

	// Calculate novelty bonus
	noveltyBonus := usa.calculateNoveltyBonus(candidate, sessionContext, scoringStrategy.Parameters.NoveltyWeight)
	result.ComponentScores.NoveltyBonus = noveltyBonus

	// Calculate variety bonus
	varietyBonus := usa.calculateVarietyBonus(candidate.Topics, sessionContext, scoringStrategy.Parameters.VarietyWeight)
	result.ComponentScores.VarietyBonus = varietyBonus

	// Compute weighted unified score
	result.UnifiedScore = scoringStrategy.Weights.Urgency*urgencyScore +
		scoringStrategy.Weights.Mastery*masteryGapScore +
		scoringStrategy.Weights.Difficulty*difficultyScore +
		scoringStrategy.Weights.Exploration*explorationScore +
		noveltyBonus + varietyBonus

	// Ensure score is within bounds [0, 1]
	result.UnifiedScore = math.Max(0.0, math.Min(1.0, result.UnifiedScore))

	// Generate explanation
	result.Reason = usa.generateScoringReason(result, candidate, sm2State)

	if usa.logger != nil {
		usa.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"item_id":       candidate.ItemID,
			"strategy":      strategy,
			"unified_score": result.UnifiedScore,
			"urgency":       urgencyScore,
			"mastery_gap":   masteryGapScore,
			"difficulty":    difficultyScore,
			"exploration":   explorationScore,
			"novelty_bonus": noveltyBonus,
			"variety_bonus": varietyBonus,
		}).Debug("Computed unified score")
	}

	return result, nil
}

// calculateUrgencyScore computes SM-2 urgency component
func (usa *UnifiedScoringAlgorithm) calculateUrgencyScore(sm2State *SM2State, currentTime time.Time) float64 {
	if sm2State == nil {
		return 0.5 // Default score for new items
	}

	// Calculate days since due
	daysSinceDue := currentTime.Sub(sm2State.NextDue).Hours() / 24.0

	// Use sigmoid function to map overdue days to urgency score
	// Positive values (overdue) increase urgency, negative values (not due) decrease it
	urgency := 1.0 / (1.0 + math.Exp(-daysSinceDue/2.0))

	// Apply retention probability weighting
	retention := usa.calculateRetentionProbability(sm2State, currentTime)

	// Lower retention increases urgency
	urgency = urgency * (1.0 - retention*0.5)

	return math.Max(0.0, math.Min(1.0, urgency))
}

// calculateRetentionProbability estimates retention probability using SM-2 parameters
func (usa *UnifiedScoringAlgorithm) calculateRetentionProbability(sm2State *SM2State, currentTime time.Time) float64 {
	if sm2State.Repetition == 0 {
		return 0.3 // Low retention for new items
	}

	daysSinceReview := currentTime.Sub(sm2State.LastReviewed).Hours() / 24.0
	decayRate := 1.0 / sm2State.EasinessFactor
	retention := math.Exp(-decayRate * daysSinceReview / float64(sm2State.Interval))

	return math.Max(0.0, math.Min(1.0, retention))
}

// calculateMasteryGapScore computes BKT mastery gap component
func (usa *UnifiedScoringAlgorithm) calculateMasteryGapScore(topics []string, bktStates map[string]*BKTState) float64 {
	if len(topics) == 0 {
		return 0.5 // Default score if no topics
	}

	totalGap := 0.0
	validTopics := 0

	for _, topic := range topics {
		if bktState, exists := bktStates[topic]; exists {
			// Calculate mastery gap (1 - knowledge probability)
			gap := 1.0 - bktState.ProbKnowledge

			// Weight by confidence - less confident estimates contribute more
			confidenceWeight := 1.0 + (1.0 - bktState.Confidence)
			weightedGap := gap * confidenceWeight

			totalGap += weightedGap
			validTopics++
		} else {
			// No BKT state - assume high gap for new topic
			totalGap += 0.8
			validTopics++
		}
	}

	if validTopics == 0 {
		return 0.5
	}

	averageGap := totalGap / float64(validTopics)

	// Normalize to [0, 1] range
	return math.Max(0.0, math.Min(1.0, averageGap/2.0))
}

// calculateDifficultyScore computes IRT difficulty matching component
func (usa *UnifiedScoringAlgorithm) calculateDifficultyScore(
	candidate *ItemCandidate,
	irtStates map[string]*IRTState,
	tolerance float64,
) float64 {
	if len(candidate.Topics) == 0 {
		return 0.5 // Default score if no topics
	}

	totalMatch := 0.0
	validTopics := 0

	for _, topic := range candidate.Topics {
		if irtState, exists := irtStates[topic]; exists {
			// Calculate probability of correct response
			probCorrect := usa.calculateIRTProbability(irtState.Theta, candidate.Difficulty, candidate.Discrimination)

			// Optimal challenge is around 75% correctness
			optimalProb := 0.75
			distance := math.Abs(probCorrect - optimalProb)

			// Convert distance to match score using Gaussian
			matchScore := math.Exp(-distance * distance / (2 * tolerance * tolerance))

			// Weight by confidence
			confidenceWeight := irtState.Confidence
			weightedMatch := matchScore*confidenceWeight + (1.0-confidenceWeight)*0.5

			totalMatch += weightedMatch
			validTopics++
		} else {
			// No IRT state - use moderate match score
			totalMatch += 0.5
			validTopics++
		}
	}

	if validTopics == 0 {
		return 0.5
	}

	return totalMatch / float64(validTopics)
}

// calculateIRTProbability computes probability using 2PL IRT model
func (usa *UnifiedScoringAlgorithm) calculateIRTProbability(theta, difficulty, discrimination float64) float64 {
	exponent := discrimination * (theta - difficulty)
	return 1.0 / (1.0 + math.Exp(-exponent))
}

// calculateExplorationScore computes contextual bandit exploration component
func (usa *UnifiedScoringAlgorithm) calculateExplorationScore(
	candidate *ItemCandidate,
	sessionContext *SessionContext,
	explorationRate float64,
) float64 {
	// Base exploration score decreases with attempt count
	baseExploration := math.Exp(-float64(candidate.AttemptCount) / 10.0)

	// Increase exploration for items not recently attempted
	timeSinceAttempt := 0.0
	if candidate.LastAttempted != nil {
		timeSinceAttempt = time.Since(*candidate.LastAttempted).Hours() / 24.0
	} else {
		timeSinceAttempt = 365.0 // Very high for never attempted
	}

	timeBonus := math.Min(1.0, timeSinceAttempt/30.0) // Bonus increases over 30 days

	// Session-based exploration adjustment
	sessionProgress := float64(sessionContext.ItemsCompleted) / float64(sessionContext.TargetItemCount)
	sessionExploration := explorationRate * (1.0 - sessionProgress*0.5) // Decrease exploration as session progresses

	explorationScore := baseExploration * timeBonus * sessionExploration

	return math.Max(0.0, math.Min(1.0, explorationScore))
}

// calculateNoveltyBonus computes bonus for items not recently attempted
func (usa *UnifiedScoringAlgorithm) calculateNoveltyBonus(
	candidate *ItemCandidate,
	sessionContext *SessionContext,
	noveltyWeight float64,
) float64 {
	// Check if item was recently attempted in this session
	for _, recentItem := range sessionContext.RecentItems {
		if recentItem == candidate.ItemID {
			return 0.0 // No novelty bonus for recent items
		}
	}

	// Calculate novelty based on time since last attempt
	if candidate.LastAttempted == nil {
		return noveltyWeight // Full bonus for never attempted
	}

	daysSinceAttempt := time.Since(*candidate.LastAttempted).Hours() / 24.0

	// Novelty increases with time, plateaus after 7 days
	noveltyFactor := math.Min(1.0, daysSinceAttempt/7.0)

	return noveltyWeight * noveltyFactor
}

// calculateVarietyBonus computes bonus for topic variety in session
func (usa *UnifiedScoringAlgorithm) calculateVarietyBonus(
	candidateTopics []string,
	sessionContext *SessionContext,
	varietyWeight float64,
) float64 {
	if len(candidateTopics) == 0 {
		return 0.0
	}

	// Count how many of the candidate's topics have been practiced in this session
	practicedTopics := make(map[string]bool)
	for _, topic := range sessionContext.TopicsPracticed {
		practicedTopics[topic] = true
	}

	newTopics := 0
	for _, topic := range candidateTopics {
		if !practicedTopics[topic] {
			newTopics++
		}
	}

	// Bonus proportional to new topics introduced
	varietyFactor := float64(newTopics) / float64(len(candidateTopics))

	// Reduce bonus if session already has good variety
	sessionVariety := float64(len(practicedTopics))
	varietyPenalty := math.Min(1.0, sessionVariety/5.0) // Penalty increases after 5 topics

	return varietyWeight * varietyFactor * (1.0 - varietyPenalty*0.5)
}

// checkSessionConstraints validates session constraints
func (usa *UnifiedScoringAlgorithm) checkSessionConstraints(
	candidate *ItemCandidate,
	sessionContext *SessionContext,
	constraints *ConstraintResults,
) bool {
	// Check time constraint
	if sessionContext.TimeRemaining < candidate.EstimatedTime {
		constraints.TimeConstraint = false
		constraints.ConstraintViolation = "insufficient time remaining"
		return false
	}

	// Check recent items constraint
	for _, recentItem := range sessionContext.RecentItems {
		if recentItem == candidate.ItemID {
			constraints.RecentItemsOK = false
			constraints.ConstraintViolation = "item attempted recently"
			return false
		}
	}

	// Check topic interleaving constraint
	if len(sessionContext.TopicsPracticed) > 0 && len(candidate.Topics) > 0 {
		recentTopicCount := usa.countRecentTopicOccurrences(candidate.Topics[0], sessionContext.TopicsPracticed)
		if recentTopicCount >= usa.MaxConsecutiveTopic {
			constraints.InterleavingOK = false
			constraints.ConstraintViolation = fmt.Sprintf("too many consecutive items from topic %s", candidate.Topics[0])
			return false
		}
	}

	// Check difficulty variance constraint
	if sessionContext.ItemsCompleted > 0 {
		projectedVariance := usa.calculateProjectedDifficultyVariance(candidate.Difficulty, sessionContext)
		if projectedVariance > usa.DifficultyVariance*2.0 { // Allow some flexibility
			constraints.DifficultyVariance = false
			constraints.ConstraintViolation = "would create excessive difficulty variance"
			return false
		}
	}

	return true
}

// countRecentTopicOccurrences counts consecutive occurrences of a topic at the end of the list
func (usa *UnifiedScoringAlgorithm) countRecentTopicOccurrences(topic string, topicsPracticed []string) int {
	count := 0
	for i := len(topicsPracticed) - 1; i >= 0; i-- {
		if topicsPracticed[i] == topic {
			count++
		} else {
			break
		}
	}
	return count
}

// calculateProjectedDifficultyVariance calculates what the difficulty variance would be if this item is added
func (usa *UnifiedScoringAlgorithm) calculateProjectedDifficultyVariance(
	candidateDifficulty float64,
	sessionContext *SessionContext,
) float64 {
	if sessionContext.ItemsCompleted == 0 {
		return 0.0 // No variance with first item
	}

	// Simple approximation: assume current average and calculate new variance
	currentMean := sessionContext.AverageDifficulty
	newMean := (currentMean*float64(sessionContext.ItemsCompleted) + candidateDifficulty) / float64(sessionContext.ItemsCompleted+1)

	// Estimate variance increase (simplified calculation)
	diffFromMean := math.Abs(candidateDifficulty - newMean)

	return diffFromMean
}

// generateScoringReason creates a human-readable explanation for the score
func (usa *UnifiedScoringAlgorithm) generateScoringReason(
	result *ScoringResult,
	candidate *ItemCandidate,
	sm2State *SM2State,
) string {
	reasons := []string{}

	// Identify dominant component
	maxScore := 0.0
	maxComponent := ""

	if result.ComponentScores.UrgencyScore > maxScore {
		maxScore = result.ComponentScores.UrgencyScore
		maxComponent = "urgency"
	}
	if result.ComponentScores.MasteryGapScore > maxScore {
		maxScore = result.ComponentScores.MasteryGapScore
		maxComponent = "mastery"
	}
	if result.ComponentScores.DifficultyScore > maxScore {
		maxScore = result.ComponentScores.DifficultyScore
		maxComponent = "difficulty"
	}
	if result.ComponentScores.ExplorationScore > maxScore {
		maxScore = result.ComponentScores.ExplorationScore
		maxComponent = "exploration"
	}

	// Generate reason based on dominant component
	switch maxComponent {
	case "urgency":
		if sm2State != nil && time.Now().After(sm2State.NextDue) {
			daysOverdue := time.Since(sm2State.NextDue).Hours() / 24.0
			reasons = append(reasons, fmt.Sprintf("overdue by %.1f days", daysOverdue))
		} else {
			reasons = append(reasons, "due for spaced repetition")
		}
	case "mastery":
		reasons = append(reasons, "addresses knowledge gaps")
	case "difficulty":
		reasons = append(reasons, "optimal challenge level")
	case "exploration":
		reasons = append(reasons, "explores new content")
	}

	// Add bonus reasons
	if result.ComponentScores.NoveltyBonus > 0.1 {
		reasons = append(reasons, "novel content")
	}
	if result.ComponentScores.VarietyBonus > 0.1 {
		reasons = append(reasons, "adds topic variety")
	}

	if len(reasons) == 0 {
		return "balanced recommendation"
	}

	return fmt.Sprintf("%s (%.2f)", reasons[0], result.UnifiedScore)
}

// GetScoringStrategy returns the specified scoring strategy
func (usa *UnifiedScoringAlgorithm) GetScoringStrategy(strategyName string) (ScoringStrategy, bool) {
	strategy, exists := usa.ScoringStrategies[strategyName]
	return strategy, exists
}

// AddScoringStrategy adds a new scoring strategy for A/B testing
func (usa *UnifiedScoringAlgorithm) AddScoringStrategy(strategy ScoringStrategy) error {
	// Validate weights sum to approximately 1.0
	totalWeight := strategy.Weights.Urgency + strategy.Weights.Mastery +
		strategy.Weights.Difficulty + strategy.Weights.Exploration

	if math.Abs(totalWeight-1.0) > 0.01 {
		return fmt.Errorf("strategy weights must sum to 1.0, got %.3f", totalWeight)
	}

	usa.ScoringStrategies[strategy.Name] = strategy
	return nil
}

// UpdateWeights updates the weights for the unified scoring algorithm
func (usa *UnifiedScoringAlgorithm) UpdateWeights(weights ScoringWeights) error {
	totalWeight := weights.Urgency + weights.Mastery + weights.Difficulty + weights.Exploration

	if math.Abs(totalWeight-1.0) > 0.01 {
		return fmt.Errorf("weights must sum to 1.0, got %.3f", totalWeight)
	}

	usa.WeightUrgency = weights.Urgency
	usa.WeightMastery = weights.Mastery
	usa.WeightDifficulty = weights.Difficulty
	usa.WeightExploration = weights.Exploration

	return nil
}

// GetAnalytics returns analytics data for the unified scoring algorithm
func (usa *UnifiedScoringAlgorithm) GetAnalytics() map[string]interface{} {
	return map[string]interface{}{
		"weights": map[string]float64{
			"urgency":     usa.WeightUrgency,
			"mastery":     usa.WeightMastery,
			"difficulty":  usa.WeightDifficulty,
			"exploration": usa.WeightExploration,
		},
		"constraints": map[string]interface{}{
			"max_session_time":       usa.MaxSessionTime.Minutes(),
			"min_topic_interleaving": usa.MinTopicInterleaving,
			"max_consecutive_topic":  usa.MaxConsecutiveTopic,
			"difficulty_variance":    usa.DifficultyVariance,
			"recent_items_window":    usa.RecentItemsWindow,
		},
		"exploration": map[string]float64{
			"exploration_decay":    usa.ExplorationDecay,
			"min_exploration_rate": usa.MinExplorationRate,
			"max_exploration_rate": usa.MaxExplorationRate,
			"novelty_bonus":        usa.NoveltyBonus,
			"variety_bonus":        usa.VarietyBonus,
		},
		"ab_testing": map[string]interface{}{
			"enabled":          usa.ABTestingEnabled,
			"strategies_count": len(usa.ScoringStrategies),
			"default_strategy": usa.DefaultStrategy,
		},
	}
}

// ValidateConfiguration validates the unified scoring algorithm configuration
func (usa *UnifiedScoringAlgorithm) ValidateConfiguration() error {
	// Check weights sum to 1.0
	totalWeight := usa.WeightUrgency + usa.WeightMastery + usa.WeightDifficulty + usa.WeightExploration
	if math.Abs(totalWeight-1.0) > 0.01 {
		return fmt.Errorf("weights must sum to 1.0, got %.3f", totalWeight)
	}

	// Check exploration rates
	if usa.MinExplorationRate >= usa.MaxExplorationRate {
		return fmt.Errorf("min exploration rate must be less than max exploration rate")
	}

	// Check session constraints
	if usa.MaxSessionTime <= 0 {
		return fmt.Errorf("max session time must be positive")
	}

	if usa.MinTopicInterleaving < 0 {
		return fmt.Errorf("min topic interleaving must be non-negative")
	}

	if usa.MaxConsecutiveTopic <= 0 {
		return fmt.Errorf("max consecutive topic must be positive")
	}

	// Validate all scoring strategies
	for name, strategy := range usa.ScoringStrategies {
		strategyWeight := strategy.Weights.Urgency + strategy.Weights.Mastery +
			strategy.Weights.Difficulty + strategy.Weights.Exploration
		if math.Abs(strategyWeight-1.0) > 0.01 {
			return fmt.Errorf("strategy %s weights must sum to 1.0, got %.3f", name, strategyWeight)
		}
	}

	return nil
}

// SelectSessionStrategy uses the contextual bandit to select the best session strategy
func (usa *UnifiedScoringAlgorithm) SelectSessionStrategy(ctx context.Context, contextFeatures ContextFeatures) (*BanditSelection, error) {
	if usa.ContextualBandit == nil {
		return nil, fmt.Errorf("contextual bandit not initialized")
	}

	selection, err := usa.ContextualBandit.SelectStrategy(ctx, contextFeatures)
	if err != nil {
		return nil, fmt.Errorf("failed to select session strategy: %w", err)
	}

	if usa.logger != nil {
		usa.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"selected_strategy": selection.Strategy,
			"expected_reward":   selection.ExpectedReward,
			"confidence":        selection.Confidence,
			"reason":            selection.Reason,
		}).Info("Session strategy selected by contextual bandit")
	}

	return selection, nil
}

// UpdateSessionReward updates the contextual bandit with session performance feedback
func (usa *UnifiedScoringAlgorithm) UpdateSessionReward(ctx context.Context, strategyName string, contextFeatures ContextFeatures, reward float64, sessionID string) error {
	if usa.ContextualBandit == nil {
		return fmt.Errorf("contextual bandit not initialized")
	}

	err := usa.ContextualBandit.UpdateReward(ctx, strategyName, contextFeatures, reward, sessionID)
	if err != nil {
		return fmt.Errorf("failed to update session reward: %w", err)
	}

	if usa.logger != nil {
		usa.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"strategy":   strategyName,
			"reward":     reward,
			"session_id": sessionID,
		}).Info("Session reward updated in contextual bandit")
	}

	return nil
}

// GetBanditPerformanceMetrics returns performance metrics for the contextual bandit
func (usa *UnifiedScoringAlgorithm) GetBanditPerformanceMetrics() map[string]interface{} {
	if usa.ContextualBandit == nil {
		return map[string]interface{}{
			"error": "contextual bandit not initialized",
		}
	}

	return usa.ContextualBandit.GetPerformanceMetrics()
}

// GetAvailableStrategies returns all available session strategies from the bandit
func (usa *UnifiedScoringAlgorithm) GetAvailableStrategies() map[string]*Strategy {
	if usa.ContextualBandit == nil {
		return make(map[string]*Strategy)
	}

	return usa.ContextualBandit.ListStrategies()
}

// AddSessionStrategy adds a new session strategy to the contextual bandit
func (usa *UnifiedScoringAlgorithm) AddSessionStrategy(strategy *Strategy) error {
	if usa.ContextualBandit == nil {
		return fmt.Errorf("contextual bandit not initialized")
	}

	err := usa.ContextualBandit.AddStrategy(strategy)
	if err != nil {
		return fmt.Errorf("failed to add session strategy: %w", err)
	}

	if usa.logger != nil {
		usa.logger.WithFields(map[string]interface{}{
			"strategy_name": strategy.Name,
			"description":   strategy.Description,
		}).Info("Session strategy added to contextual bandit")
	}

	return nil
}

// RemoveSessionStrategy removes a session strategy from the contextual bandit
func (usa *UnifiedScoringAlgorithm) RemoveSessionStrategy(strategyName string) error {
	if usa.ContextualBandit == nil {
		return fmt.Errorf("contextual bandit not initialized")
	}

	err := usa.ContextualBandit.RemoveStrategy(strategyName)
	if err != nil {
		return fmt.Errorf("failed to remove session strategy: %w", err)
	}

	if usa.logger != nil {
		usa.logger.WithFields(map[string]interface{}{
			"strategy_name": strategyName,
		}).Info("Session strategy removed from contextual bandit")
	}

	return nil
}

// GetSessionStrategy retrieves a specific session strategy
func (usa *UnifiedScoringAlgorithm) GetSessionStrategy(strategyName string) (*Strategy, bool) {
	if usa.ContextualBandit == nil {
		return nil, false
	}

	return usa.ContextualBandit.GetStrategy(strategyName)
}

// ResetBanditState resets the contextual bandit state (useful for testing or retraining)
func (usa *UnifiedScoringAlgorithm) ResetBanditState() {
	if usa.ContextualBandit != nil {
		usa.ContextualBandit.Reset()
		if usa.logger != nil {
			usa.logger.Info("Contextual bandit state reset")
		}
	}
}

// SetBanditAlgorithm changes the bandit algorithm (Thompson Sampling or LinUCB)
func (usa *UnifiedScoringAlgorithm) SetBanditAlgorithm(algorithm BanditAlgorithm) error {
	if usa.ContextualBandit == nil {
		return fmt.Errorf("contextual bandit not initialized")
	}

	// Create new bandit with the specified algorithm
	newBandit := NewContextualBandit(algorithm, usa.logger)

	// Copy existing strategies
	for name, strategy := range usa.ContextualBandit.Strategies {
		err := newBandit.AddStrategy(strategy)
		if err != nil {
			if usa.logger != nil {
				usa.logger.WithError(err).WithField("strategy", name).Warn("Failed to copy strategy to new bandit")
			}
		}
	}

	usa.ContextualBandit = newBandit

	if usa.logger != nil {
		usa.logger.WithFields(map[string]interface{}{
			"algorithm": algorithm,
		}).Info("Contextual bandit algorithm changed")
	}

	return nil
}

// CalculateSessionReward calculates reward based on session performance metrics
func (usa *UnifiedScoringAlgorithm) CalculateSessionReward(sessionMetrics SessionPerformanceMetrics) float64 {
	// Weighted combination of different performance aspects
	accuracyWeight := 0.4
	engagementWeight := 0.3
	efficiencyWeight := 0.2
	completionWeight := 0.1

	// Normalize metrics to [0, 1] range
	accuracyScore := math.Max(0.0, math.Min(1.0, sessionMetrics.Accuracy))
	engagementScore := math.Max(0.0, math.Min(1.0, sessionMetrics.EngagementScore))
	efficiencyScore := math.Max(0.0, math.Min(1.0, sessionMetrics.EfficiencyScore))
	completionScore := math.Max(0.0, math.Min(1.0, sessionMetrics.CompletionRate))

	// Calculate weighted reward
	reward := accuracyWeight*accuracyScore +
		engagementWeight*engagementScore +
		efficiencyWeight*efficiencyScore +
		completionWeight*completionScore

	// Apply bonus for achieving learning objectives
	if sessionMetrics.ObjectivesAchieved > 0.8 {
		reward *= 1.1 // 10% bonus for high objective achievement
	}

	// Apply penalty for excessive time or fatigue
	if sessionMetrics.FatigueLevel > 0.7 {
		reward *= 0.9 // 10% penalty for high fatigue
	}

	return math.Max(0.0, math.Min(1.0, reward))
}

// SessionPerformanceMetrics represents metrics used to calculate session reward
type SessionPerformanceMetrics struct {
	Accuracy           float64 `json:"accuracy"`            // Accuracy rate (0-1)
	EngagementScore    float64 `json:"engagement_score"`    // Engagement level (0-1)
	EfficiencyScore    float64 `json:"efficiency_score"`    // Learning efficiency (0-1)
	CompletionRate     float64 `json:"completion_rate"`     // Session completion rate (0-1)
	ObjectivesAchieved float64 `json:"objectives_achieved"` // Learning objectives achieved (0-1)
	FatigueLevel       float64 `json:"fatigue_level"`       // User fatigue level (0-1)
	TimeSpent          int     `json:"time_spent"`          // Time spent in minutes
	ItemsCompleted     int     `json:"items_completed"`     // Number of items completed
	MasteryImprovement float64 `json:"mastery_improvement"` // Improvement in mastery scores
	RetentionRate      float64 `json:"retention_rate"`      // Retention of previously learned material
}
