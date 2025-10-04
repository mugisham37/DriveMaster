package state

import (
	"context"
	"fmt"
	"time"

	"scheduler-service/internal/algorithms"
	"scheduler-service/internal/cache"
	"scheduler-service/internal/models"

	"gorm.io/gorm"
)

// IRTManager manages IRT (Item Response Theory) state for users
type IRTManager struct {
	db        *gorm.DB
	cache     *cache.RedisClient
	algorithm *algorithms.IRTAlgorithm
}

// NewIRTManager creates a new IRT state manager
func NewIRTManager(db *gorm.DB, cache *cache.RedisClient) *IRTManager {
	return &IRTManager{
		db:        db,
		cache:     cache,
		algorithm: algorithms.NewIRTAlgorithm(),
	}
}

// GetState retrieves IRT state for a user and topic
func (m *IRTManager) GetState(ctx context.Context, userID, topic string) (*algorithms.IRTState, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("irt_state:%s:%s", userID, topic)
	var cachedState algorithms.IRTState
	if err := m.cache.Get(ctx, cacheKey, &cachedState); err == nil {
		return &cachedState, nil
	}

	// Fallback to database
	var model models.IRTStateModel
	err := m.db.WithContext(ctx).Where("user_id = ? AND topic = ?", userID, topic).First(&model).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Initialize new state
			state := m.algorithm.InitializeState(topic)
			return state, nil
		}
		return nil, fmt.Errorf("failed to get IRT state: %w", err)
	}

	// Convert model to algorithm state
	state := &algorithms.IRTState{
		Theta:         model.Theta,
		ThetaVariance: model.ThetaVariance,
		Confidence:    model.Confidence,
		AttemptsCount: model.AttemptsCount,
		CorrectCount:  model.CorrectCount,
		LastUpdated:   model.LastUpdated,
		UpdateHistory: make([]float64, 0), // History not stored in DB for performance
	}

	// Cache the state
	m.cache.Set(ctx, cacheKey, state, 30*time.Minute)

	return state, nil
}

// UpdateState updates IRT state after an attempt
func (m *IRTManager) UpdateState(ctx context.Context, userID, topic string, itemParams *algorithms.ItemParameters, correct bool) (*algorithms.IRTState, error) {
	// Get current state
	currentState, err := m.GetState(ctx, userID, topic)
	if err != nil {
		return nil, fmt.Errorf("failed to get current state: %w", err)
	}

	// Update state using algorithm
	newState := m.algorithm.UpdateAbility(currentState, itemParams, correct)

	// Save to database
	model := &models.IRTStateModel{
		UserID:        userID,
		Topic:         topic,
		Theta:         newState.Theta,
		ThetaVariance: newState.ThetaVariance,
		Confidence:    newState.Confidence,
		AttemptsCount: newState.AttemptsCount,
		CorrectCount:  newState.CorrectCount,
		LastUpdated:   newState.LastUpdated,
	}

	err = m.db.WithContext(ctx).Save(model).Error
	if err != nil {
		return nil, fmt.Errorf("failed to save IRT state: %w", err)
	}

	// Update cache
	cacheKey := fmt.Sprintf("irt_state:%s:%s", userID, topic)
	m.cache.Set(ctx, cacheKey, newState, 30*time.Minute)

	return newState, nil
}

// GetMultipleStates retrieves IRT states for multiple topics
func (m *IRTManager) GetMultipleStates(ctx context.Context, userID string, topics []string) (map[string]*algorithms.IRTState, error) {
	states := make(map[string]*algorithms.IRTState)

	// Try to get from cache first
	for _, topic := range topics {
		cacheKey := fmt.Sprintf("irt_state:%s:%s", userID, topic)
		var cachedState algorithms.IRTState
		if err := m.cache.Get(ctx, cacheKey, &cachedState); err == nil {
			states[topic] = &cachedState
		}
	}

	// Get missing states from database
	missingTopics := make([]string, 0)
	for _, topic := range topics {
		if _, exists := states[topic]; !exists {
			missingTopics = append(missingTopics, topic)
		}
	}

	if len(missingTopics) > 0 {
		var models []models.IRTStateModel
		err := m.db.WithContext(ctx).Where("user_id = ? AND topic IN ?", userID, missingTopics).Find(&models).Error
		if err != nil {
			return nil, fmt.Errorf("failed to get IRT states: %w", err)
		}

		// Convert models to states
		foundTopics := make(map[string]bool)
		for _, model := range models {
			state := &algorithms.IRTState{
				Theta:         model.Theta,
				ThetaVariance: model.ThetaVariance,
				Confidence:    model.Confidence,
				AttemptsCount: model.AttemptsCount,
				CorrectCount:  model.CorrectCount,
				LastUpdated:   model.LastUpdated,
				UpdateHistory: make([]float64, 0),
			}
			states[model.Topic] = state
			foundTopics[model.Topic] = true

			// Cache the state
			cacheKey := fmt.Sprintf("irt_state:%s:%s", userID, model.Topic)
			m.cache.Set(ctx, cacheKey, state, 30*time.Minute)
		}

		// Initialize states for topics not found in database
		for _, topic := range missingTopics {
			if !foundTopics[topic] {
				state := m.algorithm.InitializeState(topic)
				states[topic] = state
			}
		}
	}

	return states, nil
}

// InitializeFromPlacement initializes IRT state from placement test results
func (m *IRTManager) InitializeFromPlacement(ctx context.Context, userID, topic string, responses []bool, itemParams []*algorithms.ItemParameters) (*algorithms.IRTState, error) {
	// Estimate ability from placement test
	state, err := m.algorithm.EstimateAbilityFromPlacement(responses, itemParams)
	if err != nil {
		return nil, fmt.Errorf("failed to estimate ability from placement: %w", err)
	}

	// Save to database
	model := &models.IRTStateModel{
		UserID:        userID,
		Topic:         topic,
		Theta:         state.Theta,
		ThetaVariance: state.ThetaVariance,
		Confidence:    state.Confidence,
		AttemptsCount: state.AttemptsCount,
		CorrectCount:  state.CorrectCount,
		LastUpdated:   state.LastUpdated,
	}

	err = m.db.WithContext(ctx).Save(model).Error
	if err != nil {
		return nil, fmt.Errorf("failed to save initial IRT state: %w", err)
	}

	// Cache the state
	cacheKey := fmt.Sprintf("irt_state:%s:%s", userID, topic)
	m.cache.Set(ctx, cacheKey, state, 30*time.Minute)

	return state, nil
}

// ApplyTimeDecay applies time-based decay to all user's IRT states
func (m *IRTManager) ApplyTimeDecay(ctx context.Context, userID string) error {
	// Get all topics for user
	var models []models.IRTStateModel
	err := m.db.WithContext(ctx).Where("user_id = ?", userID).Find(&models).Error
	if err != nil {
		return fmt.Errorf("failed to get user IRT states: %w", err)
	}

	currentTime := time.Now()

	// Apply decay to each state
	for _, model := range models {
		state := &algorithms.IRTState{
			Theta:         model.Theta,
			ThetaVariance: model.ThetaVariance,
			Confidence:    model.Confidence,
			AttemptsCount: model.AttemptsCount,
			CorrectCount:  model.CorrectCount,
			LastUpdated:   model.LastUpdated,
			UpdateHistory: make([]float64, 0),
		}

		// Apply time decay
		decayedState := m.algorithm.ApplyTimeDecay(state, currentTime)

		// Update if there was significant decay
		if decayedState.Confidence != state.Confidence || decayedState.ThetaVariance != state.ThetaVariance {
			model.Confidence = decayedState.Confidence
			model.ThetaVariance = decayedState.ThetaVariance

			err = m.db.WithContext(ctx).Save(&model).Error
			if err != nil {
				return fmt.Errorf("failed to save decayed IRT state for topic %s: %w", model.Topic, err)
			}

			// Update cache
			cacheKey := fmt.Sprintf("irt_state:%s:%s", userID, model.Topic)
			m.cache.Set(ctx, cacheKey, decayedState, 30*time.Minute)
		}
	}

	return nil
}

// GetDifficultyMatch calculates how well an item matches user's ability
func (m *IRTManager) GetDifficultyMatch(ctx context.Context, userID, topic string, itemParams *algorithms.ItemParameters) (float64, error) {
	state, err := m.GetState(ctx, userID, topic)
	if err != nil {
		return 0.0, fmt.Errorf("failed to get IRT state: %w", err)
	}

	return m.algorithm.GetDifficultyMatch(state, itemParams), nil
}

// GetOptimalDifficulty calculates optimal difficulty for user's current ability
func (m *IRTManager) GetOptimalDifficulty(ctx context.Context, userID, topic string, discrimination float64) (float64, error) {
	state, err := m.GetState(ctx, userID, topic)
	if err != nil {
		return 0.0, fmt.Errorf("failed to get IRT state: %w", err)
	}

	return m.algorithm.GetOptimalDifficulty(state, discrimination), nil
}

// GetRecommendationScore calculates IRT-based recommendation score
func (m *IRTManager) GetRecommendationScore(ctx context.Context, userID, topic string, itemParams *algorithms.ItemParameters) (float64, error) {
	state, err := m.GetState(ctx, userID, topic)
	if err != nil {
		return 0.0, fmt.Errorf("failed to get IRT state: %w", err)
	}

	return m.algorithm.GetRecommendationScore(state, itemParams), nil
}

// GetAnalytics returns analytics data for user's IRT state
func (m *IRTManager) GetAnalytics(ctx context.Context, userID, topic string) (map[string]interface{}, error) {
	state, err := m.GetState(ctx, userID, topic)
	if err != nil {
		return nil, fmt.Errorf("failed to get IRT state: %w", err)
	}

	return m.algorithm.GetAnalytics(state), nil
}

// CalibrateItemParameters calibrates item parameters from response data
func (m *IRTManager) CalibrateItemParameters(responses []bool, abilities []float64) *algorithms.ItemParameters {
	return m.algorithm.CalibrateItemParameters(responses, abilities)
}

// InvalidateCache removes IRT state from cache
func (m *IRTManager) InvalidateCache(ctx context.Context, userID, topic string) error {
	cacheKey := fmt.Sprintf("irt_state:%s:%s", userID, topic)
	return m.cache.Delete(ctx, cacheKey)
}

// InvalidateUserCache removes all IRT states for a user from cache
func (m *IRTManager) InvalidateUserCache(ctx context.Context, userID string) error {
	// Since there's no DelPattern method, we'll need to implement this differently
	// For now, we'll just return nil and let individual cache entries expire
	// TODO: Implement pattern-based deletion if needed
	return nil
}

// GetConfidenceInterval calculates confidence interval for user's ability
func (m *IRTManager) GetConfidenceInterval(ctx context.Context, userID, topic string, confidenceLevel float64) (float64, float64, error) {
	state, err := m.GetState(ctx, userID, topic)
	if err != nil {
		return 0.0, 0.0, fmt.Errorf("failed to get IRT state: %w", err)
	}

	lower, upper := m.algorithm.GetConfidenceInterval(state, confidenceLevel)
	return lower, upper, nil
}

// BatchUpdateStates updates multiple IRT states efficiently
func (m *IRTManager) BatchUpdateStates(ctx context.Context, updates []IRTStateUpdate) error {
	if len(updates) == 0 {
		return nil
	}

	// Start transaction
	tx := m.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Process each update
	for _, update := range updates {
		// Get current state
		currentState, err := m.GetState(ctx, update.UserID, update.Topic)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to get current state for %s:%s: %w", update.UserID, update.Topic, err)
		}

		// Update state using algorithm
		newState := m.algorithm.UpdateAbility(currentState, update.ItemParams, update.Correct)

		// Save to database
		model := &models.IRTStateModel{
			UserID:        update.UserID,
			Topic:         update.Topic,
			Theta:         newState.Theta,
			ThetaVariance: newState.ThetaVariance,
			Confidence:    newState.Confidence,
			AttemptsCount: newState.AttemptsCount,
			CorrectCount:  newState.CorrectCount,
			LastUpdated:   newState.LastUpdated,
		}

		err = tx.Save(model).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to save IRT state for %s:%s: %w", update.UserID, update.Topic, err)
		}

		// Update cache
		cacheKey := fmt.Sprintf("irt_state:%s:%s", update.UserID, update.Topic)
		m.cache.Set(ctx, cacheKey, newState, 30*time.Minute)
	}

	// Commit transaction
	return tx.Commit().Error
}

// IRTStateUpdate represents a batch update for IRT state
type IRTStateUpdate struct {
	UserID     string
	Topic      string
	ItemParams *algorithms.ItemParameters
	Correct    bool
}
