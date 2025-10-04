package state

import (
	"context"
	"fmt"
	"time"

	"scheduler-service/internal/algorithms"
	"scheduler-service/internal/cache"
	"scheduler-service/internal/database"
	"scheduler-service/internal/logger"
	"scheduler-service/internal/models"
	pb "scheduler-service/proto"

	"gorm.io/gorm"
)

// BKTStateManager handles BKT state persistence and caching
type BKTStateManager struct {
	bktAlgorithm *algorithms.BKTAlgorithm
	db           *database.DB
	cache        *cache.RedisClient
	logger       *logger.Logger
}

// NewBKTStateManager creates a new BKT state manager
func NewBKTStateManager(
	bktAlgorithm *algorithms.BKTAlgorithm,
	db *database.DB,
	cache *cache.RedisClient,
	logger *logger.Logger,
) *BKTStateManager {
	return &BKTStateManager{
		bktAlgorithm: bktAlgorithm,
		db:           db,
		cache:        cache,
		logger:       logger,
	}
}

// GetState retrieves BKT state for a user's topic, creating if not exists
func (m *BKTStateManager) GetState(ctx context.Context, userID, topic string) (*algorithms.BKTState, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("bkt:%s:%s", userID, topic)

	if m.cache != nil {
		var state algorithms.BKTState
		err := m.cache.Get(ctx, cacheKey, &state)
		if err == nil {
			// Apply time decay if needed
			currentTime := time.Now()
			if currentTime.Sub(state.LastUpdated).Hours() > 24 {
				decayedState := m.bktAlgorithm.ApplyTimeDecay(&state, currentTime)
				// Update cache with decayed state
				go m.cacheState(context.Background(), userID, topic, decayedState)
				return decayedState, nil
			}
			return &state, nil
		}
	}

	// Load from database
	var dbState models.BKTStateModel
	err := m.db.WithContext(ctx).Where("user_id = ? AND topic = ?", userID, topic).First(&dbState).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new state
			state := m.bktAlgorithm.InitializeState(topic)

			// Save to database
			dbState = models.BKTStateModel{
				UserID:        userID,
				Topic:         topic,
				ProbKnowledge: state.ProbKnowledge,
				ProbGuess:     state.ProbGuess,
				ProbSlip:      state.ProbSlip,
				ProbLearn:     state.ProbLearn,
				AttemptsCount: state.AttemptsCount,
				CorrectCount:  state.CorrectCount,
				Confidence:    state.Confidence,
				LastUpdated:   state.LastUpdated,
			}

			if err := m.db.WithContext(ctx).Create(&dbState).Error; err != nil {
				m.logger.WithContext(ctx).WithError(err).WithFields(map[string]interface{}{
					"user_id": userID,
					"topic":   topic,
				}).Error("Failed to create BKT state")
				return nil, fmt.Errorf("failed to create BKT state: %w", err)
			}

			// Cache the new state
			go m.cacheState(context.Background(), userID, topic, state)

			return state, nil
		}

		m.logger.WithContext(ctx).WithError(err).WithFields(map[string]interface{}{
			"user_id": userID,
			"topic":   topic,
		}).Error("Failed to get BKT state from database")
		return nil, fmt.Errorf("failed to get BKT state: %w", err)
	}

	// Convert database model to algorithm state
	state := &algorithms.BKTState{
		ProbKnowledge: dbState.ProbKnowledge,
		ProbGuess:     dbState.ProbGuess,
		ProbSlip:      dbState.ProbSlip,
		ProbLearn:     dbState.ProbLearn,
		AttemptsCount: dbState.AttemptsCount,
		CorrectCount:  dbState.CorrectCount,
		LastUpdated:   dbState.LastUpdated,
		Confidence:    dbState.Confidence,
	}

	// Apply time decay if needed
	currentTime := time.Now()
	if currentTime.Sub(state.LastUpdated).Hours() > 24 {
		state = m.bktAlgorithm.ApplyTimeDecay(state, currentTime)
	}

	// Cache the state
	go m.cacheState(context.Background(), userID, topic, state)

	return state, nil
}

// UpdateState updates BKT state based on user response
func (m *BKTStateManager) UpdateState(ctx context.Context, userID, topic string, correct bool) (*algorithms.BKTState, error) {
	// Get current state
	currentState, err := m.GetState(ctx, userID, topic)
	if err != nil {
		return nil, fmt.Errorf("failed to get current BKT state: %w", err)
	}

	// Update state using BKT algorithm
	newState := m.bktAlgorithm.UpdateState(currentState, correct)

	// Save to database
	dbState := models.BKTStateModel{
		UserID:        userID,
		Topic:         topic,
		ProbKnowledge: newState.ProbKnowledge,
		ProbGuess:     newState.ProbGuess,
		ProbSlip:      newState.ProbSlip,
		ProbLearn:     newState.ProbLearn,
		AttemptsCount: newState.AttemptsCount,
		CorrectCount:  newState.CorrectCount,
		Confidence:    newState.Confidence,
		LastUpdated:   newState.LastUpdated,
	}

	err = m.db.WithContext(ctx).Save(&dbState).Error
	if err != nil {
		m.logger.WithContext(ctx).WithError(err).WithFields(map[string]interface{}{
			"user_id": userID,
			"topic":   topic,
			"correct": correct,
		}).Error("Failed to update BKT state in database")
		return nil, fmt.Errorf("failed to update BKT state: %w", err)
	}

	// Update cache
	go m.cacheState(context.Background(), userID, topic, newState)

	m.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":        userID,
		"topic":          topic,
		"correct":        correct,
		"old_knowledge":  currentState.ProbKnowledge,
		"new_knowledge":  newState.ProbKnowledge,
		"attempts_count": newState.AttemptsCount,
		"correct_count":  newState.CorrectCount,
		"confidence":     newState.Confidence,
	}).Info("BKT state updated")

	return newState, nil
}

// GetUserStates retrieves all BKT states for a user
func (m *BKTStateManager) GetUserStates(ctx context.Context, userID string) (map[string]*algorithms.BKTState, error) {
	var dbStates []models.BKTStateModel
	err := m.db.WithContext(ctx).Where("user_id = ?", userID).Find(&dbStates).Error
	if err != nil {
		m.logger.WithContext(ctx).WithError(err).WithField("user_id", userID).Error("Failed to get user BKT states")
		return nil, fmt.Errorf("failed to get user BKT states: %w", err)
	}

	states := make(map[string]*algorithms.BKTState)
	currentTime := time.Now()

	for _, dbState := range dbStates {
		state := &algorithms.BKTState{
			ProbKnowledge: dbState.ProbKnowledge,
			ProbGuess:     dbState.ProbGuess,
			ProbSlip:      dbState.ProbSlip,
			ProbLearn:     dbState.ProbLearn,
			AttemptsCount: dbState.AttemptsCount,
			CorrectCount:  dbState.CorrectCount,
			LastUpdated:   dbState.LastUpdated,
			Confidence:    dbState.Confidence,
		}

		// Apply time decay if needed
		if currentTime.Sub(state.LastUpdated).Hours() > 24 {
			state = m.bktAlgorithm.ApplyTimeDecay(state, currentTime)
		}

		states[dbState.Topic] = state
	}

	return states, nil
}

// GetMasteryGaps returns mastery gaps for all topics for a user
func (m *BKTStateManager) GetMasteryGaps(ctx context.Context, userID string) (map[string]float64, error) {
	states, err := m.GetUserStates(ctx, userID)
	if err != nil {
		return nil, err
	}

	gaps := make(map[string]float64)
	for topic, state := range states {
		gaps[topic] = m.bktAlgorithm.GetMasteryGap(state)
	}

	return gaps, nil
}

// GetMasteredTopics returns list of mastered topics for a user
func (m *BKTStateManager) GetMasteredTopics(ctx context.Context, userID string) ([]string, error) {
	states, err := m.GetUserStates(ctx, userID)
	if err != nil {
		return nil, err
	}

	var masteredTopics []string
	for topic, state := range states {
		if m.bktAlgorithm.IsMastered(state) {
			masteredTopics = append(masteredTopics, topic)
		}
	}

	return masteredTopics, nil
}

// GetTopicsNeedingPractice returns topics that need practice, sorted by mastery gap
func (m *BKTStateManager) GetTopicsNeedingPractice(ctx context.Context, userID string, limit int) ([]string, error) {
	gaps, err := m.GetMasteryGaps(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Sort topics by mastery gap (highest first)
	type topicGap struct {
		topic string
		gap   float64
	}

	var sortedTopics []topicGap
	for topic, gap := range gaps {
		sortedTopics = append(sortedTopics, topicGap{topic: topic, gap: gap})
	}

	// Simple bubble sort by gap (descending)
	for i := 0; i < len(sortedTopics)-1; i++ {
		for j := i + 1; j < len(sortedTopics); j++ {
			if sortedTopics[j].gap > sortedTopics[i].gap {
				sortedTopics[i], sortedTopics[j] = sortedTopics[j], sortedTopics[i]
			}
		}
	}

	// Extract topic names up to limit
	var topics []string
	maxTopics := limit
	if maxTopics > len(sortedTopics) {
		maxTopics = len(sortedTopics)
	}

	for i := 0; i < maxTopics; i++ {
		topics = append(topics, sortedTopics[i].topic)
	}

	return topics, nil
}

// DetectMasteryAlerts checks for mastery threshold alerts
func (m *BKTStateManager) DetectMasteryAlerts(ctx context.Context, userID string) ([]MasteryAlert, error) {
	states, err := m.GetUserStates(ctx, userID)
	if err != nil {
		return nil, err
	}

	var alerts []MasteryAlert
	for topic, state := range states {
		hasAlert, message := m.bktAlgorithm.DetectMasteryThreshold(state)
		if hasAlert {
			alerts = append(alerts, MasteryAlert{
				UserID:      userID,
				Topic:       topic,
				AlertType:   "mastery_threshold",
				Message:     message,
				Probability: state.ProbKnowledge,
				Confidence:  state.Confidence,
				Timestamp:   time.Now(),
			})
		}
	}

	return alerts, nil
}

// CalibrateParameters calibrates BKT parameters based on user data
func (m *BKTStateManager) CalibrateParameters(ctx context.Context, userID string) error {
	// Get all states for the user
	states, err := m.GetUserStates(ctx, userID)
	if err != nil {
		return err
	}

	// TODO: Get historical attempt data to calibrate parameters
	// This would require access to attempt history from the database
	// For now, we'll use the current states as a simplified calibration

	var stateList []*algorithms.BKTState
	var responses []bool

	for _, state := range states {
		stateList = append(stateList, state)
		// Simulate responses based on accuracy (simplified)
		accuracy := float64(state.CorrectCount) / float64(state.AttemptsCount)
		responses = append(responses, accuracy > 0.5)
	}

	if len(stateList) > 1 {
		m.bktAlgorithm.CalibrateParameters(stateList, responses)

		m.logger.WithContext(ctx).WithField("user_id", userID).Info("BKT parameters calibrated")
	}

	return nil
}

// ConvertToProto converts internal BKTState to protobuf BKTState
func (m *BKTStateManager) ConvertToProto(state *algorithms.BKTState) *pb.BKTState {
	return m.bktAlgorithm.ConvertToProto(state)
}

// ConvertFromProto converts protobuf BKTState to internal BKTState
func (m *BKTStateManager) ConvertFromProto(pbState *pb.BKTState) *algorithms.BKTState {
	return m.bktAlgorithm.ConvertFromProto(pbState)
}

// GetAnalytics returns analytics data for BKT states
func (m *BKTStateManager) GetAnalytics(ctx context.Context, userID string) (map[string]map[string]any, error) {
	states, err := m.GetUserStates(ctx, userID)
	if err != nil {
		return nil, err
	}

	analytics := make(map[string]map[string]any)
	for topic, state := range states {
		analytics[topic] = m.bktAlgorithm.GetAnalytics(state)
	}

	return analytics, nil
}

// GetVisualizationData returns data suitable for BKT visualization
func (m *BKTStateManager) GetVisualizationData(ctx context.Context, userID string) (map[string]map[string]any, error) {
	states, err := m.GetUserStates(ctx, userID)
	if err != nil {
		return nil, err
	}

	visualization := make(map[string]map[string]any)
	for topic, state := range states {
		visualization[topic] = m.bktAlgorithm.GetVisualizationData(state)
	}

	return visualization, nil
}

// Helper methods

// cacheState caches BKT state in Redis
func (m *BKTStateManager) cacheState(ctx context.Context, userID, topic string, state *algorithms.BKTState) {
	if m.cache == nil {
		return
	}

	cacheKey := fmt.Sprintf("bkt:%s:%s", userID, topic)

	// Cache for 30 minutes
	err := m.cache.Set(ctx, cacheKey, state, 30*time.Minute)
	if err != nil {
		m.logger.WithContext(ctx).WithError(err).Error("Failed to cache BKT state")
	}
}

// MasteryAlert represents a mastery threshold alert
type MasteryAlert struct {
	UserID      string    `json:"user_id"`
	Topic       string    `json:"topic"`
	AlertType   string    `json:"alert_type"`
	Message     string    `json:"message"`
	Probability float64   `json:"probability"`
	Confidence  float64   `json:"confidence"`
	Timestamp   time.Time `json:"timestamp"`
}
