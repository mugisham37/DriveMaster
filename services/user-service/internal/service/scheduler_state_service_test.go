package service

import (
	"context"
	"testing"
	"time"

	"user-service/internal/config"
	"user-service/internal/events"
	"user-service/internal/models"
	"user-service/internal/testutils"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock repository for testing
type MockSchedulerStateRepository struct {
	mock.Mock
}

func (m *MockSchedulerStateRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.UserSchedulerState, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.UserSchedulerState), args.Error(1)
}

func (m *MockSchedulerStateRepository) Create(ctx context.Context, state *models.UserSchedulerState) error {
	args := m.Called(ctx, state)
	return args.Error(0)
}

func (m *MockSchedulerStateRepository) Update(ctx context.Context, userID uuid.UUID, update *models.SchedulerStateUpdate) (*models.UserSchedulerState, error) {
	args := m.Called(ctx, userID, update)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.UserSchedulerState), args.Error(1)
}

func (m *MockSchedulerStateRepository) UpdateWithLock(ctx context.Context, userID uuid.UUID, updateFunc func(*models.UserSchedulerState) error) (*models.UserSchedulerState, error) {
	args := m.Called(ctx, userID, updateFunc)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.UserSchedulerState), args.Error(1)
}

func (m *MockSchedulerStateRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockSchedulerStateRepository) CreateBackup(ctx context.Context, userID uuid.UUID, backupType, reason string) (*models.SchedulerStateBackup, error) {
	args := m.Called(ctx, userID, backupType, reason)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.SchedulerStateBackup), args.Error(1)
}

func (m *MockSchedulerStateRepository) GetBackups(ctx context.Context, userID uuid.UUID, limit int) ([]models.SchedulerStateBackup, error) {
	args := m.Called(ctx, userID, limit)
	return args.Get(0).([]models.SchedulerStateBackup), args.Error(1)
}

func (m *MockSchedulerStateRepository) RestoreFromBackup(ctx context.Context, backupID uuid.UUID) (*models.UserSchedulerState, error) {
	args := m.Called(ctx, backupID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.UserSchedulerState), args.Error(1)
}

func (m *MockSchedulerStateRepository) GetMultiple(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*models.UserSchedulerState, error) {
	args := m.Called(ctx, userIDs)
	return args.Get(0).(map[uuid.UUID]*models.UserSchedulerState), args.Error(1)
}

func (m *MockSchedulerStateRepository) UpdateMultiple(ctx context.Context, updates map[uuid.UUID]*models.SchedulerStateUpdate) error {
	args := m.Called(ctx, updates)
	return args.Error(0)
}

func (m *MockSchedulerStateRepository) CleanupOldBackups(ctx context.Context, retentionDays int) (int, error) {
	args := m.Called(ctx, retentionDays)
	return args.Int(0), args.Error(1)
}

func (m *MockSchedulerStateRepository) GetStaleStates(ctx context.Context, staleDuration time.Duration) ([]uuid.UUID, error) {
	args := m.Called(ctx, staleDuration)
	return args.Get(0).([]uuid.UUID), args.Error(1)
}

// MockCache is already defined in progress_service_test.go

func TestSchedulerStateService_CreateSchedulerState(t *testing.T) {
	// Setup
	mockRepo := new(MockSchedulerStateRepository)
	mockCache := new(testutils.MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
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

	service := NewSchedulerStateService(mockRepo, mockCache, cfg, mockPublisher)

	userID := uuid.New()
	ctx := context.Background()

	// Mock expectations
	mockRepo.On("Create", ctx, mock.AnythingOfType("*models.UserSchedulerState")).Return(nil)
	mockCache.On("Set", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("*models.UserSchedulerState"), cfg.CacheTTL.SchedulerState).Return(nil)

	// Execute
	state, err := service.CreateSchedulerState(ctx, userID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, state)
	assert.Equal(t, userID, state.UserID)
	assert.Equal(t, 1, state.Version)
	assert.NotNil(t, state.AbilityVector)
	assert.NotNil(t, state.SM2States)
	assert.NotNil(t, state.BKTStates)
	assert.NotNil(t, state.BanditState)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestSchedulerStateService_UpdateSM2State(t *testing.T) {
	// Setup
	mockRepo := new(MockSchedulerStateRepository)
	mockCache := new(testutils.MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
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

	service := NewSchedulerStateService(mockRepo, mockCache, cfg, mockPublisher)

	userID := uuid.New()
	itemID := "test-item-123"
	quality := 4
	ctx := context.Background()

	// Create initial state
	initialState := models.NewUserSchedulerState(userID)
	updatedState := initialState.Clone()
	updatedState.Version = 2

	// Mock expectations
	mockRepo.On("UpdateWithLock", ctx, userID, mock.AnythingOfType("func(*models.UserSchedulerState) error")).Return(updatedState, nil)
	mockCache.On("Set", ctx, mock.AnythingOfType("string"), updatedState, cfg.CacheTTL.SchedulerState).Return(nil)

	// Execute
	result, err := service.UpdateSM2State(ctx, userID, itemID, quality)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, userID, result.UserID)
	assert.Equal(t, 2, result.Version)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestSchedulerStateService_UpdateBKTState(t *testing.T) {
	// Setup
	mockRepo := new(MockSchedulerStateRepository)
	mockCache := new(testutils.MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
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

	service := NewSchedulerStateService(mockRepo, mockCache, cfg, mockPublisher)

	userID := uuid.New()
	topic := "traffic_signs"
	correct := true
	ctx := context.Background()

	// Create initial state
	initialState := models.NewUserSchedulerState(userID)
	updatedState := initialState.Clone()
	updatedState.Version = 2

	// Mock expectations
	mockRepo.On("UpdateWithLock", ctx, userID, mock.AnythingOfType("func(*models.UserSchedulerState) error")).Return(updatedState, nil)
	mockCache.On("Set", ctx, mock.AnythingOfType("string"), updatedState, cfg.CacheTTL.SchedulerState).Return(nil)

	// Execute
	result, err := service.UpdateBKTState(ctx, userID, topic, correct)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, userID, result.UserID)
	assert.Equal(t, 2, result.Version)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestSchedulerStateService_StartSession(t *testing.T) {
	// Setup
	mockRepo := new(MockSchedulerStateRepository)
	mockCache := new(testutils.MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
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

	service := NewSchedulerStateService(mockRepo, mockCache, cfg, mockPublisher)

	userID := uuid.New()
	sessionID := uuid.New()
	ctx := context.Background()

	// Create initial state
	initialState := models.NewUserSchedulerState(userID)
	updatedState := initialState.Clone()
	updatedState.CurrentSessionID = &sessionID
	updatedState.ConsecutiveDays = 1
	updatedState.Version = 2

	// Mock expectations
	mockRepo.On("UpdateWithLock", ctx, userID, mock.AnythingOfType("func(*models.UserSchedulerState) error")).Return(updatedState, nil)
	mockCache.On("Set", ctx, mock.AnythingOfType("string"), updatedState, cfg.CacheTTL.SchedulerState).Return(nil)

	// Execute
	result, err := service.StartSession(ctx, userID, sessionID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, userID, result.UserID)
	assert.Equal(t, sessionID, *result.CurrentSessionID)
	assert.Equal(t, 1, result.ConsecutiveDays)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestSchedulerStateService_EndSession(t *testing.T) {
	// Setup
	mockRepo := new(MockSchedulerStateRepository)
	mockCache := new(testutils.MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
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

	service := NewSchedulerStateService(mockRepo, mockCache, cfg, mockPublisher)

	userID := uuid.New()
	studyTimeMs := int64(300000) // 5 minutes
	ctx := context.Background()

	// Create initial state
	initialState := models.NewUserSchedulerState(userID)
	updatedState := initialState.Clone()
	updatedState.TotalStudyTimeMs = studyTimeMs
	updatedState.CurrentSessionID = nil
	now := time.Now()
	updatedState.LastSessionEnd = &now
	updatedState.Version = 2

	// Mock expectations
	mockRepo.On("UpdateWithLock", ctx, userID, mock.AnythingOfType("func(*models.UserSchedulerState) error")).Return(updatedState, nil)
	mockCache.On("Set", ctx, mock.AnythingOfType("string"), updatedState, cfg.CacheTTL.SchedulerState).Return(nil)

	// Execute
	result, err := service.EndSession(ctx, userID, studyTimeMs)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, userID, result.UserID)
	assert.Equal(t, studyTimeMs, result.TotalStudyTimeMs)
	assert.Nil(t, result.CurrentSessionID)
	assert.NotNil(t, result.LastSessionEnd)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestSchedulerStateService_GetSchedulerState_NotFound_CreatesNew(t *testing.T) {
	// Setup
	mockRepo := new(MockSchedulerStateRepository)
	mockCache := new(testutils.MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
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

	service := NewSchedulerStateService(mockRepo, mockCache, cfg, mockPublisher)

	userID := uuid.New()
	ctx := context.Background()

	// Mock expectations - cache miss, then repo not found, then create
	mockCache.On("Get", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("*models.UserSchedulerState")).Return(assert.AnError)
	mockRepo.On("GetByUserID", ctx, userID).Return(nil, models.ErrSchedulerStateNotFound)
	mockRepo.On("Create", ctx, mock.AnythingOfType("*models.UserSchedulerState")).Return(nil)
	mockCache.On("Set", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("*models.UserSchedulerState"), cfg.CacheTTL.SchedulerState).Return(nil)

	// Execute
	result, err := service.GetSchedulerState(ctx, userID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, userID, result.UserID)
	assert.Equal(t, 1, result.Version)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}
