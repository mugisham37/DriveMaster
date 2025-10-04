package algorithms

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"

	"scheduler-service/internal/logger"
)

// PlacementTestAlgorithm implements adaptive placement testing using IRT
type PlacementTestAlgorithm struct {
	irtAlgorithm *IRTAlgorithm
	logger       *logger.Logger

	// Placement test configuration
	MinItems          int     // Minimum items to administer
	MaxItems          int     // Maximum items to administer
	TargetSE          float64 // Target standard error for stopping
	ConfidenceLevel   float64 // Confidence level for ability estimation
	InitialDifficulty float64 // Starting difficulty for first item
	MaxInformation    float64 // Maximum information threshold

	// Item selection parameters
	InformationWeight float64 // Weight for information in item selection
	ExposureWeight    float64 // Weight for exposure control
	ContentWeight     float64 // Weight for content balancing

	// Stopping criteria parameters
	MinSEReduction       float64 // Minimum SE reduction to continue
	ConsistencyWindow    int     // Number of items to check for consistency
	ConsistencyThreshold float64 // Threshold for ability estimate consistency
}

// NewPlacementTestAlgorithm creates a new placement test algorithm instance
func NewPlacementTestAlgorithm(irtAlgorithm *IRTAlgorithm, logger *logger.Logger) *PlacementTestAlgorithm {
	return &PlacementTestAlgorithm{
		irtAlgorithm:      irtAlgorithm,
		logger:            logger,
		MinItems:          15,
		MaxItems:          25,
		TargetSE:          0.3, // Target standard error
		ConfidenceLevel:   0.95,
		InitialDifficulty: 0.0, // Start at average difficulty
		MaxInformation:    2.5, // Maximum information per item

		InformationWeight: 0.6, // Prioritize information gain
		ExposureWeight:    0.2, // Control item exposure
		ContentWeight:     0.2, // Balance content coverage

		MinSEReduction:       0.05, // Minimum SE reduction to continue
		ConsistencyWindow:    5,    // Check last 5 items for consistency
		ConsistencyThreshold: 0.2,  // Ability estimate should be stable within 0.2
	}
}

// PlacementTestState represents the current state of a placement test
type PlacementTestState struct {
	UserID      string `json:"user_id"`
	SessionID   string `json:"session_id"`
	CountryCode string `json:"country_code"`

	// Current ability estimates per topic
	TopicAbilities  map[string]float64 `json:"topic_abilities"`
	TopicSE         map[string]float64 `json:"topic_se"` // Standard errors
	TopicConfidence map[string]float64 `json:"topic_confidence"`

	// Overall ability estimate
	OverallAbility    float64 `json:"overall_ability"`
	OverallSE         float64 `json:"overall_se"`
	OverallConfidence float64 `json:"overall_confidence"`

	// Test progress
	ItemsAdministered []PlacementItem     `json:"items_administered"`
	Responses         []PlacementResponse `json:"responses"`
	CurrentItemIndex  int                 `json:"current_item_index"`

	// Stopping criteria tracking
	SEHistory      []float64 `json:"se_history"`
	AbilityHistory []float64 `json:"ability_history"`

	// Content balancing
	TopicCoverage   map[string]int  `json:"topic_coverage"`
	DifficultyRange DifficultyRange `json:"difficulty_range"`

	// Metadata
	StartTime      time.Time `json:"start_time"`
	LastUpdated    time.Time `json:"last_updated"`
	IsComplete     bool      `json:"is_complete"`
	StoppingReason string    `json:"stopping_reason"`
}

// PlacementItem represents an item in the placement test
type PlacementItem struct {
	ItemID         string   `json:"item_id"`
	Topics         []string `json:"topics"`
	Difficulty     float64  `json:"difficulty"`
	Discrimination float64  `json:"discrimination"`
	Guessing       float64  `json:"guessing"`
	EstimatedTime  int      `json:"estimated_time_seconds"`
	ExposureCount  int      `json:"exposure_count"`
	ContentArea    string   `json:"content_area"`
}

// PlacementResponse represents a user's response to a placement item
type PlacementResponse struct {
	ItemID       string    `json:"item_id"`
	Correct      bool      `json:"correct"`
	ResponseTime int       `json:"response_time_ms"`
	Confidence   int       `json:"confidence"` // 1-5 scale
	Timestamp    time.Time `json:"timestamp"`

	// State before and after for analysis
	AbilityBefore float64 `json:"ability_before"`
	AbilityAfter  float64 `json:"ability_after"`
	SEBefore      float64 `json:"se_before"`
	SEAfter       float64 `json:"se_after"`
}

// DifficultyRange tracks the range of difficulties administered
type DifficultyRange struct {
	Min    float64 `json:"min"`
	Max    float64 `json:"max"`
	Mean   float64 `json:"mean"`
	StdDev float64 `json:"std_dev"`
}

// PlacementResult represents the final results of a placement test
type PlacementResult struct {
	UserID    string `json:"user_id"`
	SessionID string `json:"session_id"`

	// Final ability estimates
	TopicAbilities    map[string]float64 `json:"topic_abilities"`
	TopicConfidence   map[string]float64 `json:"topic_confidence"`
	OverallAbility    float64            `json:"overall_ability"`
	OverallConfidence float64            `json:"overall_confidence"`

	// Test statistics
	ItemsAdministered int `json:"items_administered"`
	CorrectResponses  int `json:"correct_responses"`
	TotalTime         int `json:"total_time_ms"`
	AverageTime       int `json:"average_time_ms"`

	// Quality metrics
	FinalSE              float64        `json:"final_se"`
	MeasurementPrecision float64        `json:"measurement_precision"`
	ContentCoverage      map[string]int `json:"content_coverage"`

	// Recommendations
	RecommendedLevel string   `json:"recommended_level"`
	StrengthAreas    []string `json:"strength_areas"`
	WeaknessAreas    []string `json:"weakness_areas"`

	// Metadata
	CompletedAt    time.Time `json:"completed_at"`
	StoppingReason string    `json:"stopping_reason"`
}

// InitializePlacementTest starts a new placement test for a user
func (p *PlacementTestAlgorithm) InitializePlacementTest(ctx context.Context, userID, sessionID, countryCode string) (*PlacementTestState, error) {
	p.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":      userID,
		"session_id":   sessionID,
		"country_code": countryCode,
	}).Info("Initializing placement test")

	state := &PlacementTestState{
		UserID:            userID,
		SessionID:         sessionID,
		CountryCode:       countryCode,
		TopicAbilities:    make(map[string]float64),
		TopicSE:           make(map[string]float64),
		TopicConfidence:   make(map[string]float64),
		OverallAbility:    p.irtAlgorithm.PriorMean,
		OverallSE:         math.Sqrt(p.irtAlgorithm.PriorVariance),
		OverallConfidence: p.irtAlgorithm.MinConfidence,
		ItemsAdministered: make([]PlacementItem, 0, p.MaxItems),
		Responses:         make([]PlacementResponse, 0, p.MaxItems),
		CurrentItemIndex:  0,
		SEHistory:         make([]float64, 0, p.MaxItems),
		AbilityHistory:    make([]float64, 0, p.MaxItems),
		TopicCoverage:     make(map[string]int),
		DifficultyRange: DifficultyRange{
			Min:    math.Inf(1),
			Max:    math.Inf(-1),
			Mean:   0.0,
			StdDev: 0.0,
		},
		StartTime:   time.Now(),
		LastUpdated: time.Now(),
		IsComplete:  false,
	}

	// Initialize topic abilities with prior
	topics := p.getAvailableTopics(countryCode)
	for _, topic := range topics {
		state.TopicAbilities[topic] = p.irtAlgorithm.PriorMean
		state.TopicSE[topic] = math.Sqrt(p.irtAlgorithm.PriorVariance)
		state.TopicConfidence[topic] = p.irtAlgorithm.MinConfidence
		state.TopicCoverage[topic] = 0
	}

	p.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":   userID,
		"topics":    len(topics),
		"min_items": p.MinItems,
		"max_items": p.MaxItems,
		"target_se": p.TargetSE,
	}).Info("Placement test initialized")

	return state, nil
}

// SelectNextItem selects the optimal next item for the placement test
func (p *PlacementTestAlgorithm) SelectNextItem(ctx context.Context, state *PlacementTestState, availableItems []PlacementItem) (*PlacementItem, error) {
	if state.IsComplete {
		return nil, fmt.Errorf("placement test is already complete")
	}

	p.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":         state.UserID,
		"current_item":    state.CurrentItemIndex,
		"available_items": len(availableItems),
		"overall_ability": state.OverallAbility,
		"overall_se":      state.OverallSE,
	}).Debug("Selecting next placement item")

	// Filter out already administered items
	administeredIDs := make(map[string]bool)
	for _, item := range state.ItemsAdministered {
		administeredIDs[item.ItemID] = true
	}

	var candidateItems []PlacementItem
	for _, item := range availableItems {
		if !administeredIDs[item.ItemID] {
			candidateItems = append(candidateItems, item)
		}
	}

	if len(candidateItems) == 0 {
		return nil, fmt.Errorf("no available items for placement test")
	}

	// Score each candidate item
	type scoredItem struct {
		item  PlacementItem
		score float64
	}

	var scoredItems []scoredItem

	for _, item := range candidateItems {
		score := p.calculateItemScore(state, &item)
		scoredItems = append(scoredItems, scoredItem{
			item:  item,
			score: score,
		})
	}

	// Sort by score (highest first)
	sort.Slice(scoredItems, func(i, j int) bool {
		return scoredItems[i].score > scoredItems[j].score
	})

	selectedItem := &scoredItems[0].item

	p.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"selected_item_id": selectedItem.ItemID,
		"item_difficulty":  selectedItem.Difficulty,
		"item_topics":      selectedItem.Topics,
		"selection_score":  scoredItems[0].score,
	}).Debug("Selected next placement item")

	return selectedItem, nil
}

// calculateItemScore calculates the selection score for a placement item
func (p *PlacementTestAlgorithm) calculateItemScore(state *PlacementTestState, item *PlacementItem) float64 {
	// Calculate information gain for overall ability
	overallInfo := p.calculateInformation(state.OverallAbility, item)

	// Calculate topic-specific information gains
	topicInfoSum := 0.0
	topicCount := 0
	for _, topic := range item.Topics {
		if ability, exists := state.TopicAbilities[topic]; exists {
			topicInfo := p.calculateInformation(ability, item)
			topicInfoSum += topicInfo
			topicCount++
		}
	}

	var avgTopicInfo float64
	if topicCount > 0 {
		avgTopicInfo = topicInfoSum / float64(topicCount)
	}

	// Information component (weighted average of overall and topic-specific)
	informationScore := 0.7*overallInfo + 0.3*avgTopicInfo

	// Normalize information score (cap at MaxInformation)
	if informationScore > p.MaxInformation {
		informationScore = p.MaxInformation
	}
	informationScore /= p.MaxInformation

	// Exposure control component (prefer less exposed items)
	exposureScore := 1.0 / (1.0 + float64(item.ExposureCount)*0.1)

	// Content balancing component
	contentScore := p.calculateContentBalance(state, item)

	// Difficulty appropriateness (prefer items near current ability estimate)
	difficultyDistance := math.Abs(item.Difficulty - state.OverallAbility)
	difficultyScore := math.Exp(-difficultyDistance * difficultyDistance / 2.0)

	// Combine components with weights
	totalScore := p.InformationWeight*informationScore +
		p.ExposureWeight*exposureScore +
		p.ContentWeight*contentScore +
		0.1*difficultyScore // Small weight for difficulty appropriateness

	return totalScore
}

// calculateInformation calculates Fisher information for an item given ability
func (p *PlacementTestAlgorithm) calculateInformation(ability float64, item *PlacementItem) float64 {
	itemParams := &ItemParameters{
		Difficulty:     item.Difficulty,
		Discrimination: item.Discrimination,
		Guessing:       item.Guessing,
	}

	return p.irtAlgorithm.calculateInformation(ability, itemParams)
}

// calculateContentBalance calculates content balancing score for an item
func (p *PlacementTestAlgorithm) calculateContentBalance(state *PlacementTestState, item *PlacementItem) float64 {
	if len(item.Topics) == 0 {
		return 0.5 // Neutral score for items without topics
	}

	// Calculate average coverage for item's topics
	totalCoverage := 0
	for _, topic := range item.Topics {
		if coverage, exists := state.TopicCoverage[topic]; exists {
			totalCoverage += coverage
		}
	}

	avgCoverage := float64(totalCoverage) / float64(len(item.Topics))

	// Find minimum and maximum coverage across all topics
	minCoverage := math.Inf(1)
	maxCoverage := math.Inf(-1)
	for _, coverage := range state.TopicCoverage {
		if float64(coverage) < minCoverage {
			minCoverage = float64(coverage)
		}
		if float64(coverage) > maxCoverage {
			maxCoverage = float64(coverage)
		}
	}

	// Prefer items from less covered topics
	if maxCoverage > minCoverage {
		balanceScore := 1.0 - (avgCoverage-minCoverage)/(maxCoverage-minCoverage)
		return math.Max(0.0, balanceScore)
	}

	return 0.5 // Neutral score when all topics have equal coverage
}

// ProcessResponse processes a user's response and updates the placement test state
func (p *PlacementTestAlgorithm) ProcessResponse(ctx context.Context, state *PlacementTestState, itemID string, correct bool, responseTime int, confidence int) error {
	if state.IsComplete {
		return fmt.Errorf("placement test is already complete")
	}

	if state.CurrentItemIndex >= len(state.ItemsAdministered) {
		return fmt.Errorf("no current item to process response for")
	}

	currentItem := &state.ItemsAdministered[state.CurrentItemIndex]
	if currentItem.ItemID != itemID {
		return fmt.Errorf("item ID mismatch: expected %s, got %s", currentItem.ItemID, itemID)
	}

	p.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":       state.UserID,
		"item_id":       itemID,
		"correct":       correct,
		"response_time": responseTime,
		"confidence":    confidence,
		"item_index":    state.CurrentItemIndex,
	}).Debug("Processing placement response")

	// Store ability and SE before update
	abilityBefore := state.OverallAbility
	seBefore := state.OverallSE

	// Create response record
	response := PlacementResponse{
		ItemID:        itemID,
		Correct:       correct,
		ResponseTime:  responseTime,
		Confidence:    confidence,
		Timestamp:     time.Now(),
		AbilityBefore: abilityBefore,
		SEBefore:      seBefore,
	}

	// Update overall ability estimate
	itemParams := &ItemParameters{
		Difficulty:     currentItem.Difficulty,
		Discrimination: currentItem.Discrimination,
		Guessing:       currentItem.Guessing,
	}

	// Update ability using Bayesian updating
	newAbility, newSE := p.updateAbilityEstimate(state.OverallAbility, state.OverallSE, itemParams, correct)

	state.OverallAbility = newAbility
	state.OverallSE = newSE
	state.OverallConfidence = p.calculateConfidence(newSE)

	// Update topic-specific abilities
	for _, topic := range currentItem.Topics {
		if topicAbility, exists := state.TopicAbilities[topic]; exists {
			topicSE := state.TopicSE[topic]
			newTopicAbility, newTopicSE := p.updateAbilityEstimate(topicAbility, topicSE, itemParams, correct)

			state.TopicAbilities[topic] = newTopicAbility
			state.TopicSE[topic] = newTopicSE
			state.TopicConfidence[topic] = p.calculateConfidence(newTopicSE)

			// Update topic coverage
			state.TopicCoverage[topic]++
		}
	}

	// Complete response record
	response.AbilityAfter = state.OverallAbility
	response.SEAfter = state.OverallSE

	// Add response to history
	state.Responses = append(state.Responses, response)
	state.SEHistory = append(state.SEHistory, state.OverallSE)
	state.AbilityHistory = append(state.AbilityHistory, state.OverallAbility)

	// Update difficulty range statistics
	p.updateDifficultyRange(state, currentItem.Difficulty)

	// Move to next item
	state.CurrentItemIndex++
	state.LastUpdated = time.Now()

	p.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":        state.UserID,
		"ability_before": abilityBefore,
		"ability_after":  state.OverallAbility,
		"se_before":      seBefore,
		"se_after":       state.OverallSE,
		"ability_change": state.OverallAbility - abilityBefore,
		"se_reduction":   seBefore - state.OverallSE,
	}).Debug("Placement response processed")

	return nil
}

// updateAbilityEstimate updates ability estimate using Bayesian updating
func (p *PlacementTestAlgorithm) updateAbilityEstimate(currentAbility, currentSE float64, itemParams *ItemParameters, correct bool) (float64, float64) {
	// Calculate information
	information := p.irtAlgorithm.calculateInformation(currentAbility, itemParams)

	// Calculate expected response probability
	probCorrect := p.irtAlgorithm.calculateProbability(currentAbility, itemParams)

	// Calculate residual (observed - expected)
	var residual float64
	if correct {
		residual = 1.0 - probCorrect
	} else {
		residual = 0.0 - probCorrect
	}

	// Update variance (inverse of precision)
	currentVariance := currentSE * currentSE
	newVariance := 1.0 / (1.0/currentVariance + information)
	newSE := math.Sqrt(newVariance)

	// Update ability estimate
	updateStep := newVariance * residual * itemParams.Discrimination
	newAbility := currentAbility + updateStep

	return newAbility, newSE
}

// calculateConfidence converts standard error to confidence score
func (p *PlacementTestAlgorithm) calculateConfidence(standardError float64) float64 {
	// Convert SE to confidence (inverse relationship)
	confidence := 1.0 / (1.0 + standardError*standardError)

	// Apply bounds
	if confidence < p.irtAlgorithm.MinConfidence {
		confidence = p.irtAlgorithm.MinConfidence
	}
	if confidence > p.irtAlgorithm.MaxConfidence {
		confidence = p.irtAlgorithm.MaxConfidence
	}

	return confidence
}

// updateDifficultyRange updates the difficulty range statistics
func (p *PlacementTestAlgorithm) updateDifficultyRange(state *PlacementTestState, difficulty float64) {
	// Update min/max
	if difficulty < state.DifficultyRange.Min {
		state.DifficultyRange.Min = difficulty
	}
	if difficulty > state.DifficultyRange.Max {
		state.DifficultyRange.Max = difficulty
	}

	// Calculate mean and standard deviation
	n := float64(len(state.Responses))
	if n > 0 {
		sum := 0.0
		sumSquares := 0.0

		for _, item := range state.ItemsAdministered[:len(state.Responses)] {
			sum += item.Difficulty
			sumSquares += item.Difficulty * item.Difficulty
		}

		state.DifficultyRange.Mean = sum / n

		if n > 1 {
			variance := (sumSquares - sum*sum/n) / (n - 1)
			state.DifficultyRange.StdDev = math.Sqrt(variance)
		}
	}
}

// CheckStoppingCriteria checks if the placement test should be stopped
func (p *PlacementTestAlgorithm) CheckStoppingCriteria(ctx context.Context, state *PlacementTestState) (bool, string) {
	itemsAdministered := len(state.Responses)

	// Minimum items check
	if itemsAdministered < p.MinItems {
		return false, ""
	}

	// Maximum items check
	if itemsAdministered >= p.MaxItems {
		return true, "maximum_items_reached"
	}

	// Target standard error check
	if state.OverallSE <= p.TargetSE {
		return true, "target_precision_achieved"
	}

	// Standard error reduction check
	if len(state.SEHistory) >= 3 {
		recentSE := state.SEHistory[len(state.SEHistory)-1]
		previousSE := state.SEHistory[len(state.SEHistory)-3]
		seReduction := previousSE - recentSE

		if seReduction < p.MinSEReduction {
			return true, "minimal_precision_improvement"
		}
	}

	// Ability estimate consistency check
	if len(state.AbilityHistory) >= p.ConsistencyWindow {
		recent := state.AbilityHistory[len(state.AbilityHistory)-p.ConsistencyWindow:]
		if p.isAbilityConsistent(recent) {
			return true, "ability_estimate_stable"
		}
	}

	// Information plateau check
	if itemsAdministered >= p.MinItems+5 {
		recentInfo := p.calculateRecentInformationGain(state)
		if recentInfo < 0.1 { // Very low information gain
			return true, "information_plateau_reached"
		}
	}

	return false, ""
}

// isAbilityConsistent checks if recent ability estimates are consistent
func (p *PlacementTestAlgorithm) isAbilityConsistent(abilities []float64) bool {
	if len(abilities) < 2 {
		return false
	}

	// Calculate standard deviation of recent estimates
	sum := 0.0
	for _, ability := range abilities {
		sum += ability
	}
	mean := sum / float64(len(abilities))

	sumSquares := 0.0
	for _, ability := range abilities {
		diff := ability - mean
		sumSquares += diff * diff
	}

	variance := sumSquares / float64(len(abilities)-1)
	stdDev := math.Sqrt(variance)

	return stdDev <= p.ConsistencyThreshold
}

// calculateRecentInformationGain calculates average information gain from recent items
func (p *PlacementTestAlgorithm) calculateRecentInformationGain(state *PlacementTestState) float64 {
	if len(state.Responses) < 3 {
		return 1.0 // Assume high information for early items
	}

	// Look at last 3 items
	recentCount := 3
	if len(state.Responses) < recentCount {
		recentCount = len(state.Responses)
	}

	totalInfo := 0.0
	for i := len(state.Responses) - recentCount; i < len(state.Responses); i++ {
		item := &state.ItemsAdministered[i]
		ability := state.AbilityHistory[i]
		info := p.calculateInformation(ability, item)
		totalInfo += info
	}

	return totalInfo / float64(recentCount)
}

// FinalizePlacementTest completes the placement test and generates results
func (p *PlacementTestAlgorithm) FinalizePlacementTest(ctx context.Context, state *PlacementTestState, stoppingReason string) (*PlacementResult, error) {
	if state.IsComplete {
		return nil, fmt.Errorf("placement test is already complete")
	}

	p.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":         state.UserID,
		"items_completed": len(state.Responses),
		"stopping_reason": stoppingReason,
		"final_ability":   state.OverallAbility,
		"final_se":        state.OverallSE,
	}).Info("Finalizing placement test")

	// Mark as complete
	state.IsComplete = true
	state.StoppingReason = stoppingReason
	state.LastUpdated = time.Now()

	// Calculate test statistics
	correctCount := 0
	totalTime := 0
	for _, response := range state.Responses {
		if response.Correct {
			correctCount++
		}
		totalTime += response.ResponseTime
	}

	var averageTime int
	if len(state.Responses) > 0 {
		averageTime = totalTime / len(state.Responses)
	}

	// Determine recommended level
	recommendedLevel := p.determineRecommendedLevel(state.OverallAbility, state.OverallConfidence)

	// Identify strength and weakness areas
	strengthAreas, weaknessAreas := p.identifyStrengthsAndWeaknesses(state.TopicAbilities, state.TopicConfidence)

	// Calculate measurement precision
	measurementPrecision := 1.0 / (1.0 + state.OverallSE)

	result := &PlacementResult{
		UserID:               state.UserID,
		SessionID:            state.SessionID,
		TopicAbilities:       state.TopicAbilities,
		TopicConfidence:      state.TopicConfidence,
		OverallAbility:       state.OverallAbility,
		OverallConfidence:    state.OverallConfidence,
		ItemsAdministered:    len(state.Responses),
		CorrectResponses:     correctCount,
		TotalTime:            totalTime,
		AverageTime:          averageTime,
		FinalSE:              state.OverallSE,
		MeasurementPrecision: measurementPrecision,
		ContentCoverage:      state.TopicCoverage,
		RecommendedLevel:     recommendedLevel,
		StrengthAreas:        strengthAreas,
		WeaknessAreas:        weaknessAreas,
		CompletedAt:          time.Now(),
		StoppingReason:       stoppingReason,
	}

	p.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":               state.UserID,
		"overall_ability":       result.OverallAbility,
		"overall_confidence":    result.OverallConfidence,
		"recommended_level":     result.RecommendedLevel,
		"items_administered":    result.ItemsAdministered,
		"correct_responses":     result.CorrectResponses,
		"measurement_precision": result.MeasurementPrecision,
	}).Info("Placement test finalized")

	return result, nil
}

// determineRecommendedLevel determines the recommended difficulty level based on ability
func (p *PlacementTestAlgorithm) determineRecommendedLevel(ability, confidence float64) string {
	// Adjust ability based on confidence
	adjustedAbility := ability
	if confidence < 0.7 {
		// Lower the level if confidence is low
		adjustedAbility -= (0.7 - confidence) * 0.5
	}

	switch {
	case adjustedAbility >= 1.5:
		return "advanced"
	case adjustedAbility >= 0.5:
		return "intermediate"
	case adjustedAbility >= -0.5:
		return "beginner"
	default:
		return "foundation"
	}
}

// identifyStrengthsAndWeaknesses identifies topic areas of strength and weakness
func (p *PlacementTestAlgorithm) identifyStrengthsAndWeaknesses(topicAbilities, topicConfidence map[string]float64) ([]string, []string) {
	type topicScore struct {
		topic      string
		score      float64
		confidence float64
	}

	var scores []topicScore
	for topic, ability := range topicAbilities {
		confidence := topicConfidence[topic]
		// Only consider topics with reasonable confidence
		if confidence >= 0.5 {
			scores = append(scores, topicScore{
				topic:      topic,
				score:      ability,
				confidence: confidence,
			})
		}
	}

	if len(scores) == 0 {
		return []string{}, []string{}
	}

	// Sort by ability score
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].score > scores[j].score
	})

	// Calculate thresholds
	var totalScore float64
	for _, score := range scores {
		totalScore += score.score
	}
	meanScore := totalScore / float64(len(scores))

	strengthThreshold := meanScore + 0.5
	weaknessThreshold := meanScore - 0.5

	var strengths, weaknesses []string
	for _, score := range scores {
		if score.score >= strengthThreshold {
			strengths = append(strengths, score.topic)
		} else if score.score <= weaknessThreshold {
			weaknesses = append(weaknesses, score.topic)
		}
	}

	// Limit to top 3 in each category
	if len(strengths) > 3 {
		strengths = strengths[:3]
	}
	if len(weaknesses) > 3 {
		weaknesses = weaknesses[:3]
	}

	return strengths, weaknesses
}

// AddItemToTest adds an item to the placement test (called before processing response)
func (p *PlacementTestAlgorithm) AddItemToTest(state *PlacementTestState, item *PlacementItem) {
	state.ItemsAdministered = append(state.ItemsAdministered, *item)
}

// GetAnalytics returns analytics data for the placement test
func (p *PlacementTestAlgorithm) GetAnalytics(state *PlacementTestState) map[string]interface{} {
	analytics := map[string]interface{}{
		"user_id":            state.UserID,
		"session_id":         state.SessionID,
		"items_administered": len(state.Responses),
		"is_complete":        state.IsComplete,
		"overall_ability":    state.OverallAbility,
		"overall_se":         state.OverallSE,
		"overall_confidence": state.OverallConfidence,
		"topic_abilities":    state.TopicAbilities,
		"topic_confidence":   state.TopicConfidence,
		"topic_coverage":     state.TopicCoverage,
		"difficulty_range":   state.DifficultyRange,
		"stopping_reason":    state.StoppingReason,
	}

	if len(state.Responses) > 0 {
		correctCount := 0
		totalTime := 0
		for _, response := range state.Responses {
			if response.Correct {
				correctCount++
			}
			totalTime += response.ResponseTime
		}

		analytics["correct_responses"] = correctCount
		analytics["accuracy"] = float64(correctCount) / float64(len(state.Responses))
		analytics["total_time_ms"] = totalTime
		analytics["average_time_ms"] = totalTime / len(state.Responses)
		analytics["elapsed_time_ms"] = time.Since(state.StartTime).Milliseconds()
	}

	return analytics
}

// getAvailableTopics returns the list of available topics for a country
func (p *PlacementTestAlgorithm) getAvailableTopics(countryCode string) []string {
	// TODO: This should be retrieved from a configuration or database
	// For now, return a standard set of driving test topics
	return []string{
		"traffic_signs",
		"road_rules",
		"vehicle_operation",
		"safety_procedures",
		"emergency_situations",
		"parking_maneuvers",
		"intersection_navigation",
		"highway_driving",
	}
}

// OptimizePlacementParameters optimizes placement test parameters based on historical data
func (p *PlacementTestAlgorithm) OptimizePlacementParameters(ctx context.Context, historicalResults []PlacementResult) error {
	if len(historicalResults) < 10 {
		return fmt.Errorf("insufficient historical data for optimization")
	}

	p.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"historical_results": len(historicalResults),
	}).Info("Optimizing placement test parameters")

	// Analyze stopping criteria effectiveness
	p.analyzeStoppingCriteria(historicalResults)

	// Analyze item selection effectiveness
	p.analyzeItemSelection(historicalResults)

	// Analyze measurement precision
	p.analyzeMeasurementPrecision(historicalResults)

	p.logger.WithContext(ctx).Info("Placement test parameters optimized")

	return nil
}

// analyzeStoppingCriteria analyzes the effectiveness of stopping criteria
func (p *PlacementTestAlgorithm) analyzeStoppingCriteria(results []PlacementResult) {
	// Count stopping reasons
	reasonCounts := make(map[string]int)
	for _, result := range results {
		reasonCounts[result.StoppingReason]++
	}

	// Analyze average items administered by stopping reason
	reasonItems := make(map[string][]int)
	for _, result := range results {
		reasonItems[result.StoppingReason] = append(reasonItems[result.StoppingReason], result.ItemsAdministered)
	}

	// TODO: Implement parameter adjustments based on analysis
}

// analyzeItemSelection analyzes the effectiveness of item selection
func (p *PlacementTestAlgorithm) analyzeItemSelection(results []PlacementResult) {
	// Analyze measurement precision vs items administered
	var precisionSum, itemSum float64
	for _, result := range results {
		precisionSum += result.MeasurementPrecision
		itemSum += float64(result.ItemsAdministered)
	}

	avgPrecision := precisionSum / float64(len(results))
	avgItems := itemSum / float64(len(results))

	// TODO: Adjust selection weights based on efficiency analysis
	_ = avgPrecision
	_ = avgItems
}

// analyzeMeasurementPrecision analyzes measurement precision across different ability levels
func (p *PlacementTestAlgorithm) analyzeMeasurementPrecision(results []PlacementResult) {
	// Group results by ability level
	abilityGroups := make(map[string][]PlacementResult)
	for _, result := range results {
		level := p.determineRecommendedLevel(result.OverallAbility, result.OverallConfidence)
		abilityGroups[level] = append(abilityGroups[level], result)
	}

	// Analyze precision by ability level
	for level, groupResults := range abilityGroups {
		if len(groupResults) == 0 {
			continue
		}

		var precisionSum float64
		for _, result := range groupResults {
			precisionSum += result.MeasurementPrecision
		}
		avgPrecision := precisionSum / float64(len(groupResults))

		// TODO: Adjust parameters based on precision by level
		_ = level
		_ = avgPrecision
	}
}
