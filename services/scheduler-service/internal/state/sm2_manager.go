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

// SM2StateManager handles persistence and caching of SM-2 states
type SM2StateManager struct {
	algorithm *algorithms.SM2Algorithm
	db        *database.DB
	cache     *cache.RedisClient
	logger    *logger.Logger
}

// NewSM2StateManager creates a new SM-2 state manager
func NewSM2StateManager(
	algorithm *algorithms.SM2Algorithm,
	db *database.DB,
	cache *cache.RedisClient,
	logger *logger.Logger,
) *SM2StateManager {
	return &SM2StateManager{
		algorithm: algorithm,
		db:        db,
		cache:     cache,
		logger:    logger,
	}
}

// GetState retrieves SM-2 state for a user-item pair
func (sm *SM2StateManager) GetState(ctx context.Context, userID, itemID string) (*algorithms.SM2State, error) {
	// Try cache first
	cacheKey := sm.getCacheKey(userID, itemID)
	var state algorithms.SM2State
	if err := sm.cache.Get(ctx, cacheKey, &state); err == nil {
		return &state, nil
	}

	// Fallback to database
	statePtr, err := sm.getStateFromDB(ctx, userID, itemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get SM-2 state from database: %w", err)
	}

	// Cache the result
	if err := sm.cacheState(ctx, userID, itemID, statePtr); err != nil {
		sm.logger.WithContext(ctx).WithError(err).Warn("Failed to cache SM-2 state")
	}

	return statePtr, nil
}

// UpdateState updates SM-2 state based on user response
func (sm *SM2StateManager) UpdateState(ctx context.Context, userID, itemID string, quality int) (*algorithms.SM2State, error) {
	// Get current state
	currentState, err := sm.GetState(ctx, userID, itemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current SM-2 state: %w", err)
	}

	// Update state using algorithm
	newState := sm.algorithm.UpdateState(currentState, quality)

	// Persist to database
	if err := sm.saveStateToDB(ctx, userID, itemID, newState); err != nil {
		return nil, fmt.Errorf("failed to save SM-2 state to database: %w", err)
	}

	// Update cache
	if err := sm.cacheState(ctx, userID, itemID, newState); err != nil {
		sm.logger.WithContext(ctx).WithError(err).Warn("Failed to update SM-2 state in cache")
	}

	return newState, nil
}

// InitializeState creates initial SM-2 state for a new user-item pair
func (sm *SM2StateManager) InitializeState(ctx context.Context, userID, itemID string) (*algorithms.SM2State, error) {
	// Check if state already exists
	if exists, err := sm.stateExists(ctx, userID, itemID); err != nil {
		return nil, fmt.Errorf("failed to check if SM-2 state exists: %w", err)
	} else if exists {
		return sm.GetState(ctx, userID, itemID)
	}

	// Create new state
	state := sm.algorithm.InitializeState()

	// Persist to database
	if err := sm.saveStateToDB(ctx, userID, itemID, state); err != nil {
		return nil, fmt.Errorf("failed to save initial SM-2 state: %w", err)
	}

	// Cache the state
	if err := sm.cacheState(ctx, userID, itemID, state); err != nil {
		sm.logger.WithContext(ctx).WithError(err).Warn("Failed to cache initial SM-2 state")
	}

	return state, nil
}

// GetUserStates retrieves all SM-2 states for a user
func (sm *SM2StateManager) GetUserStates(ctx context.Context, userID string) (map[string]*algorithms.SM2State, error) {
	// Try to get from cache first
	cacheKey := fmt.Sprintf("sm2:user:%s:all", userID)
	var states map[string]*algorithms.SM2State
	if err := sm.cache.Get(ctx, cacheKey, &states); err == nil {
		return states, nil
	}

	// Fallback to database
	states, err := sm.getUserStatesFromDB(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user SM-2 states from database: %w", err)
	}

	// Cache the result for 15 minutes
	sm.cache.Set(ctx, cacheKey, states, 15*time.Minute)

	return states, nil
}

// GetDueItems returns items that are due for review for a user
func (sm *SM2StateManager) GetDueItems(ctx context.Context, userID string, currentTime time.Time) ([]string, error) {
	states, err := sm.GetUserStates(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user states: %w", err)
	}

	var dueItems []string
	for itemID, state := range states {
		if sm.algorithm.IsDue(state, currentTime) {
			dueItems = append(dueItems, itemID)
		}
	}

	return dueItems, nil
}

// GetUrgencyScores returns urgency scores for all items for a user
func (sm *SM2StateManager) GetUrgencyScores(ctx context.Context, userID string, currentTime time.Time) (map[string]float64, error) {
	states, err := sm.GetUserStates(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user states: %w", err)
	}

	scores := make(map[string]float64)
	for itemID, state := range states {
		scores[itemID] = sm.algorithm.GetUrgencyScore(state, currentTime)
	}

	return scores, nil
}

// GetAnalytics returns analytics data for SM-2 states
func (sm *SM2StateManager) GetAnalytics(ctx context.Context, userID string, currentTime time.Time) (map[string]interface{}, error) {
	states, err := sm.GetUserStates(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user states: %w", err)
	}

	analytics := map[string]interface{}{
		"total_items":    len(states),
		"due_items":      0,
		"overdue_items":  0,
		"avg_easiness":   0.0,
		"avg_interval":   0.0,
		"avg_retention":  0.0,
		"items_by_stage": make(map[string]int),
	}

	if len(states) == 0 {
		return analytics, nil
	}

	var totalEasiness, totalInterval, totalRetention float64
	dueCount, overdueCount := 0, 0
	stageCount := make(map[string]int)

	for _, state := range states {
		// Count due and overdue items
		if sm.algorithm.IsDue(state, currentTime) {
			dueCount++
			if currentTime.After(state.NextDue) {
				overdueCount++
			}
		}

		// Accumulate averages
		totalEasiness += state.EasinessFactor
		totalInterval += float64(state.Interval)
		totalRetention += sm.algorithm.GetRetentionProbability(state, currentTime)

		// Count items by learning stage
		stage := sm.getLearningStage(state)
		stageCount[stage]++
	}

	analytics["due_items"] = dueCount
	analytics["overdue_items"] = overdueCount
	analytics["avg_easiness"] = totalEasiness / float64(len(states))
	analytics["avg_interval"] = totalInterval / float64(len(states))
	analytics["avg_retention"] = totalRetention / float64(len(states))
	analytics["items_by_stage"] = stageCount

	return analytics, nil
}

// InvalidateCache removes cached SM-2 state for a user-item pair
func (sm *SM2StateManager) InvalidateCache(ctx context.Context, userID, itemID string) error {
	// Remove individual item cache
	cacheKey := sm.getCacheKey(userID, itemID)
	if err := sm.cache.Delete(ctx, cacheKey); err != nil {
		return fmt.Errorf("failed to invalidate SM-2 state cache: %w", err)
	}

	// Remove user's all states cache
	userCacheKey := fmt.Sprintf("sm2:user:%s:all", userID)
	if err := sm.cache.Delete(ctx, userCacheKey); err != nil {
		sm.logger.WithContext(ctx).WithError(err).Warn("Failed to invalidate user SM-2 states cache")
	}

	return nil
}

// Helper methods

func (sm *SM2StateManager) getCacheKey(userID, itemID string) string {
	return fmt.Sprintf("sm2:%s:%s", userID, itemID)
}

func (sm *SM2StateManager) cacheState(ctx context.Context, userID, itemID string, state *algorithms.SM2State) error {
	cacheKey := sm.getCacheKey(userID, itemID)
	// Cache for 30 minutes
	return sm.cache.Set(ctx, cacheKey, state, 30*time.Minute)
}

func (sm *SM2StateManager) getStateFromDB(ctx context.Context, userID, itemID string) (*algorithms.SM2State, error) {
	var model models.SM2StateModel

	err := sm.db.WithContext(ctx).Where("user_id = ? AND item_id = ?", userID, itemID).First(&model).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Return initialized state for new items
			return sm.algorithm.InitializeState(), nil
		}
		return nil, fmt.Errorf("failed to query SM-2 state: %w", err)
	}

	// Convert model to algorithm state
	state := &algorithms.SM2State{
		EasinessFactor: model.EasinessFactor,
		Interval:       model.IntervalDays,
		Repetition:     model.Repetition,
		NextDue:        model.NextDue,
		LastReviewed:   model.LastReviewed,
	}

	return state, nil
}

func (sm *SM2StateManager) saveStateToDB(ctx context.Context, userID, itemID string, state *algorithms.SM2State) error {
	model := models.SM2StateModel{
		UserID:         userID,
		ItemID:         itemID,
		EasinessFactor: state.EasinessFactor,
		IntervalDays:   state.Interval,
		Repetition:     state.Repetition,
		NextDue:        state.NextDue,
		LastReviewed:   state.LastReviewed,
		UpdatedAt:      time.Now(),
	}

	// Use GORM's Save method which handles both insert and update
	err := sm.db.WithContext(ctx).Save(&model).Error
	if err != nil {
		return fmt.Errorf("failed to save SM-2 state: %w", err)
	}

	return nil
}

func (sm *SM2StateManager) stateExists(ctx context.Context, userID, itemID string) (bool, error) {
	var count int64
	err := sm.db.WithContext(ctx).Model(&models.SM2StateModel{}).
		Where("user_id = ? AND item_id = ?", userID, itemID).
		Count(&count).Error

	if err != nil {
		return false, fmt.Errorf("failed to check SM-2 state existence: %w", err)
	}

	return count > 0, nil
}

func (sm *SM2StateManager) getUserStatesFromDB(ctx context.Context, userID string) (map[string]*algorithms.SM2State, error) {
	var models []models.SM2StateModel

	err := sm.db.WithContext(ctx).Where("user_id = ?", userID).Find(&models).Error
	if err != nil {
		return nil, fmt.Errorf("failed to query user SM-2 states: %w", err)
	}

	states := make(map[string]*algorithms.SM2State)
	for _, model := range models {
		state := &algorithms.SM2State{
			EasinessFactor: model.EasinessFactor,
			Interval:       model.IntervalDays,
			Repetition:     model.Repetition,
			NextDue:        model.NextDue,
			LastReviewed:   model.LastReviewed,
		}
		states[model.ItemID] = state
	}

	return states, nil
}

func (sm *SM2StateManager) getLearningStage(state *algorithms.SM2State) string {
	switch {
	case state.Repetition == 0:
		return "new"
	case state.Repetition == 1:
		return "learning"
	case state.Repetition == 2:
		return "young"
	case state.Interval < 30:
		return "mature"
	default:
		return "mastered"
	}
}

// ConvertToProto converts internal SM-2 state to protobuf format
func (sm *SM2StateManager) ConvertToProto(state *algorithms.SM2State) *pb.SM2State {
	return sm.algorithm.ConvertToProto(state)
}

// ConvertFromProto converts protobuf SM-2 state to internal format
func (sm *SM2StateManager) ConvertFromProto(pbState *pb.SM2State) *algorithms.SM2State {
	return sm.algorithm.ConvertFromProto(pbState)
}
