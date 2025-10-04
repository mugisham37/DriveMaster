package internal

import (
	"context"
	"testing"
	"time"

	"user-service/internal/config"
	"user-service/internal/events"
	"user-service/internal/models"
	"user-service/internal/service"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockSchedulerStateRepository for integration testing
type MockSchedulerStateRepository struct {
	mock.Mock
	states map[uuid.UUID]*models.UserSchedulerState
}

func NewMockSchedulerStateRepository() *MockSchedulerStateRepository {
	return &MockSchedulerStateRepository{
		states: make(map[uuid.UUID]*models.UserSchedulerState),
	}
}

func (m *MockSchedulerStateRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.UserSchedulerState, error) {
	if state, exists := m.states[userID]; exists {
		return state.Clone(), nil
	}
	return nil, models.ErrSchedulerStateNotFound
}

func (m *MockSchedulerStateRepository) Create(ctx context.Context, state *models.UserSchedulerState) error {
	m.states[state.UserID] = state.Clone()
	return nil
}

func (m *MockSchedulerStateRepository) Update(ctx context.Context, userID uuid.UUID, update *models.SchedulerStateUpdate) (*models.UserSchedulerState, error) {
	state, exists := m.states[userID]
	if !exists {
		return nil, models.ErrSchedulerStateNotFound
	}

	// Check optimistic lock
	if state.Version != update.Version {
		return nil, models.ErrOptimisticLock
	}

	// Apply updates
	updatedState := state.Clone()
	if update.AbilityVector != nil {
		updatedState.AbilityVector = *update.AbilityVector
	}
	if update.AbilityConfidence != nil {
		updatedState.AbilityConfidence = *update.AbilityConfidence
	}
	if update.SM2States != nil {
		updatedState.SM2States = *update.SM2States
	}
	if update.BKTStates != nil {
		updatedState.BKTStates = *update.BKTStates
	}
	if update.BanditState != nil {
		updatedState.BanditState = update.BanditState
	}
	if update.CurrentSessionID != nil {
		updatedState.CurrentSessionID = update.CurrentSessionID
	}
	if update.LastSessionEnd != nil {
		updatedState.LastSessionEnd = update.LastSessionEnd
	}
	if update.ConsecutiveDays != nil {
		updatedState.ConsecutiveDays = *update.ConsecutiveDays
	}
	if update.TotalStudyTimeMs != nil {
		updatedState.TotalStudyTimeMs = *update.TotalStudyTimeMs
	}

	updatedState.Version++
	updatedState.LastUpdated = time.Now()

	m.states[userID] = updatedState
	return updatedState.Clone(), nil
}

func (m *MockSchedulerStateRepository) UpdateWithLock(ctx context.Context, userID uuid.UUID, updateFunc func(*models.UserSchedulerState) error) (*models.UserSchedulerState, error) {
	state, exists := m.states[userID]
	if !exists {
		return nil, models.ErrSchedulerStateNotFound
	}

	// Clone state for update
	workingState := state.Clone()

	// Apply update function
	if err := updateFunc(workingState); err != nil {
		return nil, err
	}

	// Update version and timestamp
	workingState.Version++
	workingState.LastUpdated = time.Now()

	// Store updated state
	m.states[userID] = workingState
	return workingState.Clone(), nil
}

func (m *MockSchedulerStateRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	if _, exists := m.states[userID]; !exists {
		return models.ErrSchedulerStateNotFound
	}
	delete(m.states, userID)
	return nil
}

func (m *MockSchedulerStateRepository) CreateBackup(ctx context.Context, userID uuid.UUID, backupType, reason string) (*models.SchedulerStateBackup, error) {
	state, exists := m.states[userID]
	if !exists {
		return nil, models.ErrSchedulerStateNotFound
	}

	backup := &models.SchedulerStateBackup{
		ID:         uuid.New(),
		UserID:     userID,
		StateData:  state.Clone(),
		BackupType: backupType,
		Reason:     reason,
		CreatedAt:  time.Now(),
	}

	return backup, nil
}

func (m *MockSchedulerStateRepository) GetBackups(ctx context.Context, userID uuid.UUID, limit int) ([]models.SchedulerStateBackup, error) {
	return []models.SchedulerStateBackup{}, nil
}

func (m *MockSchedulerStateRepository) RestoreFromBackup(ctx context.Context, backupID uuid.UUID) (*models.UserSchedulerState, error) {
	return nil, models.ErrBackupFailed
}

func (m *MockSchedulerStateRepository) GetMultiple(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*models.UserSchedulerState, error) {
	result := make(map[uuid.UUID]*models.UserSchedulerState)
	for _, userID := range userIDs {
		if state, exists := m.states[userID]; exists {
			result[userID] = state.Clone()
		}
	}
	return result, nil
}

func (m *MockSchedulerStateRepository) UpdateMultiple(ctx context.Context, updates map[uuid.UUID]*models.SchedulerStateUpdate) error {
	for userID, update := range updates {
		_, err := m.Update(ctx, userID, update)
		if err != nil {
			return err
		}
	}
	return nil
}

func (m *MockSchedulerStateRepository) CleanupOldBackups(ctx context.Context, retentionDays int) (int, error) {
	return 0, nil
}

func (m *MockSchedulerStateRepository) GetStaleStates(ctx context.Context, staleDuration time.Duration) ([]uuid.UUID, error) {
	return []uuid.UUID{}, nil
}

// MockCache for integration testing
type MockCache struct {
	data map[string]interface{}
}

func NewMockCache() *MockCache {
	return &MockCache{
		data: make(map[string]interface{}),
	}
}

func (m *MockCache) Get(ctx context.Context, key string, dest interface{}) error {
	if value, exists := m.data[key]; exists {
		// Simple copy for testing
		if state, ok := value.(*models.UserSchedulerState); ok {
			if destState, ok := dest.(*models.UserSchedulerState); ok {
				*destState = *state.Clone()
				return nil
			}
		}
	}
	return assert.AnError // Cache miss
}

func (m *MockCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if state, ok := value.(*models.UserSchedulerState); ok {
		m.data[key] = state.Clone()
	} else {
		m.data[key] = value
	}
	return nil
}

func (m *MockCache) Delete(ctx context.Context, key string) error {
	delete(m.data, key)
	return nil
}

func (m *MockCache) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	if _, exists := m.data[key]; exists {
		return false, nil
	}
	m.data[key] = value
	return true, nil
}

func (m *MockCache) Increment(ctx context.Context, key string) (int64, error) {
	if value, exists := m.data[key]; exists {
		if intValue, ok := value.(int64); ok {
			m.data[key] = intValue + 1
			return intValue + 1, nil
		}
	}
	m.data[key] = int64(1)
	return 1, nil
}

func (m *MockCache) Expire(ctx context.Context, key string, ttl time.Duration) error {
	return nil
}

func (m *MockCache) Close() error {
	return nil
}

// Integration test for scheduler state management
func TestSchedulerStateIntegration(t *testing.T) {
	// Setup
	repo := NewMockSchedulerStateRepository()
	cache := NewMockCache()
	publisher := events.NewNoOpEventPublisher()
	cfg := &config.Config{
		CacheTTL: struct {
			User           time.Duration
			Mastery        time.Duration
			Scheduler      time.Duration
			SchedulerState time.Duration
		}{
			SchedulerState: 30 * time.Minute,
		},
	}

	schedulerService := service.NewSchedulerStateService(repo, cache, cfg, publisher)
	ctx := context.Background()
	userID := uuid.New()

	// Test 1: Create new scheduler state
	t.Run("CreateSchedulerState", func(t *testing.T) {
		state, err := schedulerService.CreateSchedulerState(ctx, userID)
		assert.NoError(t, err)
		assert.NotNil(t, state)
		assert.Equal(t, userID, state.UserID)
		assert.Equal(t, 1, state.Version)
	})

	// Test 2: Get existing scheduler state
	t.Run("GetSchedulerState", func(t *testing.T) {
		state, err := schedulerService.GetSchedulerState(ctx, userID)
		assert.NoError(t, err)
		assert.NotNil(t, state)
		assert.Equal(t, userID, state.UserID)
	})

	// Test 3: Update SM-2 state for an item
	t.Run("UpdateSM2State", func(t *testing.T) {
		itemID := "driving-test-item-001"
		quality := 4

		state, err := schedulerService.UpdateSM2State(ctx, userID, itemID, quality)
		assert.NoError(t, err)
		assert.NotNil(t, state)
		assert.Contains(t, state.SM2States, itemID)
		assert.Equal(t, quality, state.SM2States[itemID].Quality)
		assert.Equal(t, 2, state.Version) // Version should increment
	})

	// Test 4: Update BKT state for a topic
	t.Run("UpdateBKTState", func(t *testing.T) {
		topic := "traffic_signs"
		correct := true

		state, err := schedulerService.UpdateBKTState(ctx, userID, topic, correct)
		assert.NoError(t, err)
		assert.NotNil(t, state)
		assert.Contains(t, state.BKTStates, topic)
		assert.True(t, state.BKTStates[topic].ProbKnowledge > 0.1) // Should increase from default
		assert.Equal(t, 3, state.Version)                          // Version should increment
	})

	// Test 5: Update ability for a topic
	t.Run("UpdateAbility", func(t *testing.T) {
		topic := "road_rules"
		ability := 1.5
		confidence := 0.8

		state, err := schedulerService.UpdateAbility(ctx, userID, topic, ability, confidence)
		assert.NoError(t, err)
		assert.NotNil(t, state)
		assert.Equal(t, ability, state.AbilityVector[topic])
		assert.Equal(t, confidence, state.AbilityConfidence[topic])
		assert.Equal(t, 4, state.Version) // Version should increment
	})

	// Test 6: Start a session
	t.Run("StartSession", func(t *testing.T) {
		sessionID := uuid.New()

		state, err := schedulerService.StartSession(ctx, userID, sessionID)
		assert.NoError(t, err)
		assert.NotNil(t, state)
		assert.Equal(t, sessionID, *state.CurrentSessionID)
		assert.Equal(t, 1, state.ConsecutiveDays) // First session
		assert.Equal(t, 5, state.Version)         // Version should increment
	})

	// Test 7: End a session
	t.Run("EndSession", func(t *testing.T) {
		studyTimeMs := int64(300000) // 5 minutes

		state, err := schedulerService.EndSession(ctx, userID, studyTimeMs)
		assert.NoError(t, err)
		assert.NotNil(t, state)
		assert.Nil(t, state.CurrentSessionID)
		assert.Equal(t, studyTimeMs, state.TotalStudyTimeMs)
		assert.NotNil(t, state.LastSessionEnd)
		assert.Equal(t, 6, state.Version) // Version should increment
	})

	// Test 8: Update bandit state
	t.Run("UpdateBanditState", func(t *testing.T) {
		strategy := "practice"
		reward := 0.8

		state, err := schedulerService.UpdateBanditState(ctx, userID, strategy, reward)
		assert.NoError(t, err)
		assert.NotNil(t, state)
		assert.Contains(t, state.BanditState.StrategyWeights, strategy)
		assert.Equal(t, 1, state.BanditState.TotalAttempts)
		assert.Equal(t, reward, state.BanditState.TotalReward)
		assert.Equal(t, 7, state.Version) // Version should increment
	})

	// Test 9: Create backup
	t.Run("CreateBackup", func(t *testing.T) {
		reason := "Before major update"

		backup, err := schedulerService.CreateBackup(ctx, userID, reason)
		assert.NoError(t, err)
		assert.NotNil(t, backup)
		assert.Equal(t, userID, backup.UserID)
		assert.Equal(t, reason, backup.Reason)
		assert.Equal(t, "manual", backup.BackupType)
	})

	// Test 10: Verify final state integrity
	t.Run("VerifyFinalState", func(t *testing.T) {
		state, err := schedulerService.GetSchedulerState(ctx, userID)
		assert.NoError(t, err)
		assert.NotNil(t, state)

		// Verify all our updates are present
		assert.Contains(t, state.SM2States, "driving-test-item-001")
		assert.Contains(t, state.BKTStates, "traffic_signs")
		assert.Contains(t, state.AbilityVector, "road_rules")
		assert.Equal(t, 1.5, state.AbilityVector["road_rules"])
		assert.Equal(t, int64(300000), state.TotalStudyTimeMs)
		assert.Equal(t, 1, state.ConsecutiveDays)
		assert.Contains(t, state.BanditState.StrategyWeights, "practice")

		// Verify state is valid
		assert.NoError(t, state.Validate())
	})

	// Test 11: Test multiple users
	t.Run("MultipleUsers", func(t *testing.T) {
		userID2 := uuid.New()
		userID3 := uuid.New()

		// Create states for multiple users
		_, err := schedulerService.CreateSchedulerState(ctx, userID2)
		assert.NoError(t, err)
		_, err = schedulerService.CreateSchedulerState(ctx, userID3)
		assert.NoError(t, err)

		// Get multiple states
		states, err := schedulerService.GetMultipleStates(ctx, []uuid.UUID{userID, userID2, userID3})
		assert.NoError(t, err)
		assert.Len(t, states, 3)
		assert.Contains(t, states, userID)
		assert.Contains(t, states, userID2)
		assert.Contains(t, states, userID3)
	})

	// Test 12: Test atomic updates with concurrent simulation
	t.Run("AtomicUpdates", func(t *testing.T) {
		// Simulate concurrent updates
		for i := 0; i < 5; i++ {
			itemID := uuid.New().String()
			_, err := schedulerService.UpdateSM2State(ctx, userID, itemID, 3+i%3)
			assert.NoError(t, err)
		}

		// Verify all updates were applied
		state, err := schedulerService.GetSchedulerState(ctx, userID)
		assert.NoError(t, err)
		assert.True(t, len(state.SM2States) >= 6) // Original item + 5 new items
	})
}

// Test scheduler state algorithms
func TestSchedulerStateAlgorithms(t *testing.T) {
	userID := uuid.New()
	state := models.NewUserSchedulerState(userID)

	t.Run("SM2Algorithm", func(t *testing.T) {
		itemID := "test-item"
		sm2State := state.GetSM2State(itemID)

		// Test progression through SM-2 algorithm
		qualities := []int{4, 5, 4, 3, 5}
		expectedIntervals := []int{1, 6, 15, 1, 1} // Approximate expected intervals

		for i, quality := range qualities {
			sm2State.UpdateSM2(quality)

			if quality >= 3 {
				assert.True(t, sm2State.Interval >= expectedIntervals[i] || sm2State.Interval == 1,
					"Interval should progress or reset for quality %d", quality)
			} else {
				assert.Equal(t, 1, sm2State.Interval, "Poor quality should reset interval")
			}

			assert.True(t, sm2State.EasinessFactor >= 1.3, "Easiness factor should not go below 1.3")
		}
	})

	t.Run("BKTAlgorithm", func(t *testing.T) {
		topic := "test-topic"
		bktState := state.GetBKTState(topic)
		initialKnowledge := bktState.ProbKnowledge

		// Test correct answers increase knowledge
		for i := 0; i < 5; i++ {
			bktState.UpdateBKT(true)
		}
		assert.True(t, bktState.ProbKnowledge > initialKnowledge, "Correct answers should increase knowledge")

		// Test incorrect answers
		for i := 0; i < 2; i++ {
			bktState.UpdateBKT(false)
		}
		// Knowledge might decrease but should stay within bounds
		assert.True(t, bktState.ProbKnowledge >= 0.0 && bktState.ProbKnowledge <= 1.0)
	})

	t.Run("BanditAlgorithm", func(t *testing.T) {
		banditState := state.BanditState
		initialExploration := banditState.ExplorationRate

		// Test strategy updates
		strategies := []string{"practice", "review", "mock_test"}
		rewards := []float64{0.8, 0.6, 0.9}

		for i, strategy := range strategies {
			banditState.UpdateBandit(strategy, rewards[i])
			assert.Contains(t, banditState.StrategyWeights, strategy)
		}

		assert.Equal(t, 3, banditState.TotalAttempts)
		assert.Equal(t, 2.3, banditState.TotalReward) // Sum of rewards
		assert.True(t, banditState.ExplorationRate < initialExploration, "Exploration should decay")
		assert.True(t, banditState.ExplorationRate >= 0.01, "Exploration should not go below minimum")
	})

	t.Run("AbilityTracking", func(t *testing.T) {
		topics := []string{"traffic_signs", "road_rules", "parking"}
		abilities := []float64{1.2, -0.5, 2.1}
		confidences := []float64{0.8, 0.6, 0.9}

		for i, topic := range topics {
			state.SetAbility(topic, abilities[i], confidences[i])

			retrievedAbility := state.GetAbility(topic)
			assert.Equal(t, abilities[i], retrievedAbility)
			assert.Equal(t, confidences[i], state.AbilityConfidence[topic])
		}

		// Test mastery calculation
		for _, topic := range topics {
			mastery := state.GetTopicMastery(topic)
			assert.True(t, mastery >= 0.0 && mastery <= 1.0, "Mastery should be between 0 and 1 for topic %s", topic)
		}
	})
}
