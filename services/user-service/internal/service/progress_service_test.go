package service

import (
	"context"
	"testing"
	"time"
	"user-service/internal/cache"
	"user-service/internal/config"
	"user-service/internal/logger"
	"user-service/internal/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockProgressRepository is a mock implementation of ProgressRepository
type MockProgressRepository struct {
	mock.Mock
}

func (m *MockProgressRepository) GetSkillMastery(ctx context.Context, userID uuid.UUID, topic string) (*models.SkillMastery, error) {
	args := m.Called(ctx, userID, topic)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.SkillMastery), args.Error(1)
}

func (m *MockProgressRepository) GetAllSkillMasteries(ctx context.Context, userID uuid.UUID) ([]models.SkillMastery, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]models.SkillMastery), args.Error(1)
}

func (m *MockProgressRepository) UpsertSkillMastery(ctx context.Context, mastery *models.SkillMastery) error {
	args := m.Called(ctx, mastery)
	return args.Error(0)
}

func (m *MockProgressRepository) UpdateSkillMastery(ctx context.Context, userID uuid.UUID, topic string, mastery float64, confidence float64) error {
	args := m.Called(ctx, userID, topic, mastery, confidence)
	return args.Error(0)
}

func (m *MockProgressRepository) CreateAttempt(ctx context.Context, attempt *models.AttemptRecord) error {
	args := m.Called(ctx, attempt)
	return args.Error(0)
}

func (m *MockProgressRepository) GetAttemptsByUser(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]models.AttemptRecord, error) {
	args := m.Called(ctx, userID, limit, offset)
	return args.Get(0).([]models.AttemptRecord), args.Error(1)
}

func (m *MockProgressRepository) GetAttemptsByUserAndTopic(ctx context.Context, userID uuid.UUID, topics []string, limit int) ([]models.AttemptRecord, error) {
	args := m.Called(ctx, userID, topics, limit)
	return args.Get(0).([]models.AttemptRecord), args.Error(1)
}

func (m *MockProgressRepository) GetAttemptsBySession(ctx context.Context, sessionID uuid.UUID) ([]models.AttemptRecord, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]models.AttemptRecord), args.Error(1)
}

func (m *MockProgressRepository) GetRecentAttempts(ctx context.Context, userID uuid.UUID, days int, limit int) ([]models.AttemptRecord, error) {
	args := m.Called(ctx, userID, days, limit)
	return args.Get(0).([]models.AttemptRecord), args.Error(1)
}

func (m *MockProgressRepository) GetProgressSummary(ctx context.Context, userID uuid.UUID) (*models.ProgressSummary, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.ProgressSummary), args.Error(1)
}

func (m *MockProgressRepository) GetWeeklyProgress(ctx context.Context, userID uuid.UUID, weeks int) ([]models.WeeklyProgressPoint, error) {
	args := m.Called(ctx, userID, weeks)
	return args.Get(0).([]models.WeeklyProgressPoint), args.Error(1)
}

func (m *MockProgressRepository) GetTopicProgress(ctx context.Context, userID uuid.UUID, topics []string) ([]models.TopicProgressPoint, error) {
	args := m.Called(ctx, userID, topics)
	return args.Get(0).([]models.TopicProgressPoint), args.Error(1)
}

func (m *MockProgressRepository) GetLearningStreak(ctx context.Context, userID uuid.UUID) (*models.LearningStreak, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.LearningStreak), args.Error(1)
}

func (m *MockProgressRepository) GetUserRanking(ctx context.Context, userID uuid.UUID, topic string) (int, error) {
	args := m.Called(ctx, userID, topic)
	return args.Int(0), args.Error(1)
}

func (m *MockProgressRepository) GetTopicLeaderboard(ctx context.Context, topic string, limit int) ([]models.SkillMastery, error) {
	args := m.Called(ctx, topic, limit)
	return args.Get(0).([]models.SkillMastery), args.Error(1)
}

func (m *MockProgressRepository) GetAverageMasteryByTopic(ctx context.Context, topic string) (float64, error) {
	args := m.Called(ctx, topic)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockProgressRepository) GetTotalAttempts(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

func (m *MockProgressRepository) GetAccuracyRate(ctx context.Context, userID uuid.UUID, days int) (float64, error) {
	args := m.Called(ctx, userID, days)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockProgressRepository) GetStudyTimeStats(ctx context.Context, userID uuid.UUID, days int) (int64, error) {
	args := m.Called(ctx, userID, days)
	return args.Get(0).(int64), args.Error(1)
}

// MockCache is a mock implementation of CacheInterface
type MockCache struct {
	mock.Mock
}

func (m *MockCache) Get(ctx context.Context, key string, dest interface{}) error {
	args := m.Called(ctx, key, dest)
	return args.Error(0)
}

func (m *MockCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	args := m.Called(ctx, key, value, ttl)
	return args.Error(0)
}

func (m *MockCache) Delete(ctx context.Context, key string) error {
	args := m.Called(ctx, key)
	return args.Error(0)
}

func (m *MockCache) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	args := m.Called(ctx, key, value, ttl)
	return args.Bool(0), args.Error(1)
}

func (m *MockCache) Increment(ctx context.Context, key string) (int64, error) {
	args := m.Called(ctx, key)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockCache) Expire(ctx context.Context, key string, ttl time.Duration) error {
	args := m.Called(ctx, key, ttl)
	return args.Error(0)
}

func (m *MockCache) Close() error {
	args := m.Called()
	return args.Error(0)
}

func TestProgressService_GetSkillMastery(t *testing.T) {
	// Setup
	mockRepo := new(MockProgressRepository)
	mockCache := new(MockCache)
	cfg := &config.Config{}
	log := logger.GetLogger()

	service := NewProgressService(mockRepo, mockCache, cfg, log)

	userID := uuid.New()
	topic := "traffic_rules"

	expectedMastery := &models.SkillMastery{
		UserID:        userID,
		Topic:         topic,
		Mastery:       0.85,
		Confidence:    0.9,
		LastPracticed: time.Now(),
		PracticeCount: 10,
		CorrectStreak: 5,
		LongestStreak: 8,
		TotalTimeMs:   300000,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Test cache miss, then database hit
	mockCache.On("Get", mock.Anything, mock.AnythingOfType("string"), mock.Anything).Return(cache.ErrCacheMiss)
	mockRepo.On("GetSkillMastery", mock.Anything, userID, topic).Return(expectedMastery, nil)
	mockCache.On("Set", mock.Anything, mock.AnythingOfType("string"), expectedMastery, 30*time.Minute).Return(nil)

	// Execute
	result, err := service.GetSkillMastery(context.Background(), userID, topic)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedMastery.UserID, result.UserID)
	assert.Equal(t, expectedMastery.Topic, result.Topic)
	assert.Equal(t, expectedMastery.Mastery, result.Mastery)
	assert.Equal(t, expectedMastery.Confidence, result.Confidence)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestProgressService_UpdateSkillMastery(t *testing.T) {
	// Setup
	mockRepo := new(MockProgressRepository)
	mockCache := new(MockCache)
	cfg := &config.Config{}
	log := logger.GetLogger()

	service := NewProgressService(mockRepo, mockCache, cfg, log)

	userID := uuid.New()
	topic := "road_signs"

	// Create test attempts
	attempts := []models.AttemptRecord{
		{
			ID:          uuid.New(),
			UserID:      userID,
			ItemID:      uuid.New(),
			SessionID:   uuid.New(),
			Correct:     true,
			TimeTakenMs: 30000,
			Timestamp:   time.Now().Add(-2 * time.Hour),
		},
		{
			ID:          uuid.New(),
			UserID:      userID,
			ItemID:      uuid.New(),
			SessionID:   uuid.New(),
			Correct:     true,
			TimeTakenMs: 25000,
			Timestamp:   time.Now().Add(-1 * time.Hour),
		},
		{
			ID:          uuid.New(),
			UserID:      userID,
			ItemID:      uuid.New(),
			SessionID:   uuid.New(),
			Correct:     false,
			TimeTakenMs: 45000,
			Timestamp:   time.Now(),
		},
	}

	// Mock existing mastery (not found, so create new)
	mockRepo.On("GetSkillMastery", mock.Anything, userID, topic).Return(nil, models.ErrProgressNotFound)
	mockRepo.On("UpsertSkillMastery", mock.Anything, mock.AnythingOfType("*models.SkillMastery")).Return(nil)

	// Mock cache operations
	mockCache.On("Delete", mock.Anything, mock.AnythingOfType("string")).Return(nil).Times(3)

	// Execute
	err := service.UpdateSkillMastery(context.Background(), userID, topic, attempts)

	// Assert
	assert.NoError(t, err)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestProgressService_GetProgressSummary(t *testing.T) {
	// Setup
	mockRepo := new(MockProgressRepository)
	mockCache := new(MockCache)
	cfg := &config.Config{}
	log := logger.GetLogger()

	service := NewProgressService(mockRepo, mockCache, cfg, log)

	userID := uuid.New()

	expectedSummary := &models.ProgressSummary{
		UserID:           userID,
		OverallMastery:   0.75,
		TotalTopics:      5,
		MasteredTopics:   3,
		TotalAttempts:    50,
		CorrectAttempts:  38,
		AccuracyRate:     0.76,
		LearningStreak:   7,
		TotalStudyTimeMs: 1800000, // 30 minutes
		GeneratedAt:      time.Now(),
	}

	// Test cache miss, then database hit
	mockCache.On("Get", mock.Anything, mock.AnythingOfType("string"), mock.Anything).Return(cache.ErrCacheMiss)
	mockRepo.On("GetProgressSummary", mock.Anything, userID).Return(expectedSummary, nil)
	mockCache.On("Set", mock.Anything, mock.AnythingOfType("string"), mock.Anything, 10*time.Minute).Return(nil)

	// Execute
	result, err := service.GetProgressSummary(context.Background(), userID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedSummary.UserID, result.UserID)
	assert.Equal(t, expectedSummary.OverallMastery, result.OverallMastery)
	assert.Equal(t, expectedSummary.TotalTopics, result.TotalTopics)
	assert.Equal(t, expectedSummary.MasteredTopics, result.MasteredTopics)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestProgressService_ProcessAttempt(t *testing.T) {
	// Setup
	mockRepo := new(MockProgressRepository)
	mockCache := new(MockCache)
	cfg := &config.Config{}
	log := logger.GetLogger()

	service := NewProgressService(mockRepo, mockCache, cfg, log)

	userID := uuid.New()
	attempt := &models.AttemptRecord{
		ID:              uuid.New(),
		UserID:          userID,
		ItemID:          uuid.New(),
		SessionID:       uuid.New(),
		Correct:         true,
		TimeTakenMs:     30000,
		ClientAttemptID: uuid.New(),
		Timestamp:       time.Now(),
		CreatedAt:       time.Now(),
	}

	// Mock attempt creation
	mockRepo.On("CreateAttempt", mock.Anything, attempt).Return(nil)

	// Mock topic attempts retrieval for mastery update
	topicAttempts := []models.AttemptRecord{*attempt}
	mockRepo.On("GetAttemptsByUserAndTopic", mock.Anything, userID, mock.AnythingOfType("[]string"), 50).Return(topicAttempts, nil).Times(3) // For each topic

	// Mock mastery operations
	mockRepo.On("GetSkillMastery", mock.Anything, userID, mock.AnythingOfType("string")).Return(nil, models.ErrProgressNotFound).Times(3)
	mockRepo.On("UpsertSkillMastery", mock.Anything, mock.AnythingOfType("*models.SkillMastery")).Return(nil).Times(3)

	// Mock learning streak operations
	streak := &models.LearningStreak{
		UserID:         userID,
		CurrentStreak:  5,
		LongestStreak:  10,
		LastActiveDate: time.Now().Add(-24 * time.Hour),
	}
	mockCache.On("Get", mock.Anything, mock.AnythingOfType("string"), mock.Anything).Return(cache.ErrCacheMiss).Maybe()
	mockRepo.On("GetLearningStreak", mock.Anything, userID).Return(streak, nil)
	mockRepo.On("GetRecentAttempts", mock.Anything, userID, 1, 1).Return([]models.AttemptRecord{*attempt}, nil)

	// Mock cache operations
	mockCache.On("Set", mock.Anything, mock.AnythingOfType("string"), mock.Anything, mock.AnythingOfType("time.Duration")).Return(nil).Maybe()
	mockCache.On("Delete", mock.Anything, mock.AnythingOfType("string")).Return(nil).Maybe() // Multiple cache invalidations

	// Execute
	err := service.ProcessAttempt(context.Background(), attempt)

	// Assert
	assert.NoError(t, err)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}
