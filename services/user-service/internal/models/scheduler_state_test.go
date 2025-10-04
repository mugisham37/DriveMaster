package models

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestNewUserSchedulerState(t *testing.T) {
	userID := uuid.New()
	state := NewUserSchedulerState(userID)

	assert.Equal(t, userID, state.UserID)
	assert.NotNil(t, state.AbilityVector)
	assert.NotNil(t, state.AbilityConfidence)
	assert.NotNil(t, state.SM2States)
	assert.NotNil(t, state.BKTStates)
	assert.NotNil(t, state.BanditState)
	assert.Equal(t, 0, state.ConsecutiveDays)
	assert.Equal(t, int64(0), state.TotalStudyTimeMs)
	assert.Equal(t, 1, state.Version)
}

func TestSM2State_UpdateSM2(t *testing.T) {
	sm2State := NewSM2State()

	// Test good quality (4)
	sm2State.UpdateSM2(4)
	assert.Equal(t, 4, sm2State.Quality)
	assert.Equal(t, 1, sm2State.Repetition)
	assert.Equal(t, 1, sm2State.Interval)
	assert.True(t, sm2State.EasinessFactor >= 1.3)

	// Test another good quality (5)
	sm2State.UpdateSM2(5)
	assert.Equal(t, 5, sm2State.Quality)
	assert.Equal(t, 2, sm2State.Repetition)
	assert.Equal(t, 6, sm2State.Interval)

	// Test poor quality (1) - should reset
	sm2State.UpdateSM2(1)
	assert.Equal(t, 1, sm2State.Quality)
	assert.Equal(t, 0, sm2State.Repetition)
	assert.Equal(t, 1, sm2State.Interval)
}

func TestBKTState_UpdateBKT(t *testing.T) {
	bktState := NewBKTState()
	initialKnowledge := bktState.ProbKnowledge

	// Test correct answer
	bktState.UpdateBKT(true)
	assert.True(t, bktState.ProbKnowledge >= initialKnowledge)
	assert.True(t, bktState.ProbKnowledge >= 0.0 && bktState.ProbKnowledge <= 1.0)

	// Test incorrect answer
	bktState.UpdateBKT(false)
	assert.True(t, bktState.ProbKnowledge >= 0.0 && bktState.ProbKnowledge <= 1.0)
}

func TestBanditState_UpdateBandit(t *testing.T) {
	banditState := NewBanditState()
	initialExploration := banditState.ExplorationRate

	// Test strategy update
	banditState.UpdateBandit("practice", 0.8)
	assert.Equal(t, 1, banditState.TotalAttempts)
	assert.Equal(t, 0.8, banditState.TotalReward)
	assert.Contains(t, banditState.StrategyWeights, "practice")
	assert.True(t, banditState.ExplorationRate <= initialExploration)
}

func TestUserSchedulerState_GetSM2State(t *testing.T) {
	userID := uuid.New()
	state := NewUserSchedulerState(userID)
	itemID := "test-item-123"

	// Test getting non-existent state creates new one
	sm2State := state.GetSM2State(itemID)
	assert.NotNil(t, sm2State)
	assert.Equal(t, 2.5, sm2State.EasinessFactor)
	assert.Equal(t, 1, sm2State.Interval)

	// Test getting existing state returns same instance
	sm2State2 := state.GetSM2State(itemID)
	assert.Equal(t, sm2State, sm2State2)
}

func TestUserSchedulerState_GetBKTState(t *testing.T) {
	userID := uuid.New()
	state := NewUserSchedulerState(userID)
	topic := "traffic_signs"

	// Test getting non-existent state creates new one
	bktState := state.GetBKTState(topic)
	assert.NotNil(t, bktState)
	assert.Equal(t, 0.1, bktState.ProbKnowledge)
	assert.Equal(t, 0.25, bktState.ProbGuess)

	// Test getting existing state returns same instance
	bktState2 := state.GetBKTState(topic)
	assert.Equal(t, bktState, bktState2)
}

func TestUserSchedulerState_GetAbility(t *testing.T) {
	userID := uuid.New()
	state := NewUserSchedulerState(userID)
	topic := "traffic_signs"

	// Test getting non-existent ability initializes to 0.0
	ability := state.GetAbility(topic)
	assert.Equal(t, 0.0, ability)
	assert.Equal(t, 0.5, state.AbilityConfidence[topic])

	// Test getting existing ability
	state.SetAbility(topic, 1.5, 0.8)
	ability2 := state.GetAbility(topic)
	assert.Equal(t, 1.5, ability2)
	assert.Equal(t, 0.8, state.AbilityConfidence[topic])
}

func TestUserSchedulerState_IsItemDue(t *testing.T) {
	userID := uuid.New()
	state := NewUserSchedulerState(userID)
	itemID := "test-item-123"

	// New item should be due (NextDue is set to time.Now() by default)
	// Let's set it to past to ensure it's due
	sm2State := state.GetSM2State(itemID)
	sm2State.NextDue = time.Now().Add(-1 * time.Second)
	assert.True(t, state.IsItemDue(itemID))

	// Set item to be due in the future
	sm2State = state.GetSM2State(itemID)
	sm2State.NextDue = time.Now().Add(24 * time.Hour)
	assert.False(t, state.IsItemDue(itemID))

	// Set item to be due in the past
	sm2State.NextDue = time.Now().Add(-24 * time.Hour)
	assert.True(t, state.IsItemDue(itemID))
}

func TestUserSchedulerState_GetTopicMastery(t *testing.T) {
	userID := uuid.New()
	state := NewUserSchedulerState(userID)
	topic := "traffic_signs"

	// New topic should have low mastery
	mastery := state.GetTopicMastery(topic)
	assert.Equal(t, 0.1, mastery) // Default ProbKnowledge

	// Update BKT state and check mastery
	bktState := state.GetBKTState(topic)
	bktState.ProbKnowledge = 0.8
	mastery2 := state.GetTopicMastery(topic)
	assert.Equal(t, 0.8, mastery2)
}

func TestUserSchedulerState_Clone(t *testing.T) {
	userID := uuid.New()
	state := NewUserSchedulerState(userID)

	// Add some data
	state.SetAbility("topic1", 1.5, 0.8)
	sm2State := state.GetSM2State("item1")
	sm2State.UpdateSM2(4)
	bktState := state.GetBKTState("topic1")
	bktState.UpdateBKT(true)
	state.ConsecutiveDays = 5
	state.TotalStudyTimeMs = 300000

	// Clone and verify
	clone := state.Clone()
	assert.Equal(t, state.UserID, clone.UserID)
	assert.Equal(t, state.ConsecutiveDays, clone.ConsecutiveDays)
	assert.Equal(t, state.TotalStudyTimeMs, clone.TotalStudyTimeMs)
	assert.Equal(t, state.Version, clone.Version)

	// Verify deep copy - modifying clone shouldn't affect original
	clone.SetAbility("topic1", 2.0, 0.9)
	assert.NotEqual(t, state.AbilityVector["topic1"], clone.AbilityVector["topic1"])

	cloneSM2 := clone.GetSM2State("item1")
	cloneSM2.UpdateSM2(2)
	originalSM2 := state.GetSM2State("item1")
	assert.NotEqual(t, originalSM2.Quality, cloneSM2.Quality)
}

func TestUserSchedulerState_Validate(t *testing.T) {
	userID := uuid.New()
	state := NewUserSchedulerState(userID)

	// Valid state should pass
	assert.NoError(t, state.Validate())

	// Invalid user ID
	state.UserID = uuid.Nil
	assert.Error(t, state.Validate())
	state.UserID = userID

	// Invalid version
	state.Version = 0
	assert.Error(t, state.Validate())
	state.Version = 1

	// Invalid consecutive days
	state.ConsecutiveDays = -1
	assert.Error(t, state.Validate())
	state.ConsecutiveDays = 0

	// Invalid study time
	state.TotalStudyTimeMs = -1
	assert.Error(t, state.Validate())
	state.TotalStudyTimeMs = 0

	// Invalid ability
	state.AbilityVector["topic1"] = 5.0 // Out of range
	assert.Error(t, state.Validate())
	state.AbilityVector["topic1"] = 1.0

	// Invalid confidence
	state.AbilityConfidence["topic1"] = 1.5 // Out of range
	assert.Error(t, state.Validate())
	state.AbilityConfidence["topic1"] = 0.8

	// Invalid BKT probabilities
	bktState := state.GetBKTState("topic1")
	bktState.ProbKnowledge = 1.5 // Out of range
	assert.Error(t, state.Validate())
}
