package service

import (
	"context"
	"testing"
	"time"
	"user-service/internal/cache"
	"user-service/internal/config"
	"user-service/internal/events"
	"user-service/internal/models"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockActivityRepository is a mock implementation of ActivityRepository
type MockActivityRepository struct {
	mock.Mock
}

func (m *MockActivityRepository) CreateActivity(ctx context.Context, activity *models.UserActivity) error {
	args := m.Called(ctx, activity)
	return args.Error(0)
}

func (m *MockActivityRepository) GetActivity(ctx context.Context, activityID uuid.UUID) (*models.UserActivity, error) {
	args := m.Called(ctx, activityID)
	return args.Get(0).(*models.UserActivity), args.Error(1)
}

func (m *MockActivityRepository) GetActivitiesByUser(ctx context.Context, userID uuid.UUID, filters *models.ActivityFilters) ([]models.UserActivity, error) {
	args := m.Called(ctx, userID, filters)
	return args.Get(0).([]models.UserActivity), args.Error(1)
}

func (m *MockActivityRepository) GetActivitiesBySession(ctx context.Context, sessionID uuid.UUID) ([]models.UserActivity, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]models.UserActivity), args.Error(1)
}

func (m *MockActivityRepository) DeleteActivity(ctx context.Context, activityID uuid.UUID) error {
	args := m.Called(ctx, activityID)
	return args.Error(0)
}

func (m *MockActivityRepository) GetActivitySummary(ctx context.Context, userID uuid.UUID, dateRange models.DateRange) (*models.ActivitySummary, error) {
	args := m.Called(ctx, userID, dateRange)
	return args.Get(0).(*models.ActivitySummary), args.Error(1)
}

func (m *MockActivityRepository) GetActivityAggregation(ctx context.Context, filters *models.ActivityFilters, groupBy, period string) (*models.ActivityAggregation, error) {
	args := m.Called(ctx, filters, groupBy, period)
	return args.Get(0).(*models.ActivityAggregation), args.Error(1)
}

func (m *MockActivityRepository) GetEngagementMetrics(ctx context.Context, userID uuid.UUID, days int) (*models.EngagementMetrics, error) {
	args := m.Called(ctx, userID, days)
	return args.Get(0).(*models.EngagementMetrics), args.Error(1)
}

func (m *MockActivityRepository) GetBehaviorPatterns(ctx context.Context, userID uuid.UUID, days int) ([]models.BehaviorPattern, error) {
	args := m.Called(ctx, userID, days)
	return args.Get(0).([]models.BehaviorPattern), args.Error(1)
}

func (m *MockActivityRepository) GetTopTopics(ctx context.Context, userID uuid.UUID, limit int, days int) ([]models.TopicActivitySummary, error) {
	args := m.Called(ctx, userID, limit, days)
	return args.Get(0).([]models.TopicActivitySummary), args.Error(1)
}

func (m *MockActivityRepository) GetActivityInsights(ctx context.Context, userID uuid.UUID) ([]models.ActivityInsight, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]models.ActivityInsight), args.Error(1)
}

func (m *MockActivityRepository) CreateActivityInsight(ctx context.Context, insight *models.ActivityInsight) error {
	args := m.Called(ctx, insight)
	return args.Error(0)
}

func (m *MockActivityRepository) GetActivityRecommendations(ctx context.Context, userID uuid.UUID) ([]models.ActivityRecommendation, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]models.ActivityRecommendation), args.Error(1)
}

func (m *MockActivityRepository) CreateActivityRecommendation(ctx context.Context, recommendation *models.ActivityRecommendation) error {
	args := m.Called(ctx, recommendation)
	return args.Error(0)
}

func (m *MockActivityRepository) MarkRecommendationApplied(ctx context.Context, recommendationID string, userID uuid.UUID) error {
	args := m.Called(ctx, recommendationID, userID)
	return args.Error(0)
}

func (m *MockActivityRepository) CreateActivitiesBatch(ctx context.Context, activities []models.UserActivity) error {
	args := m.Called(ctx, activities)
	return args.Error(0)
}

func (m *MockActivityRepository) GetRecentActivities(ctx context.Context, userID uuid.UUID, limit int) ([]models.UserActivity, error) {
	args := m.Called(ctx, userID, limit)
	return args.Get(0).([]models.UserActivity), args.Error(1)
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

func (m *MockCache) Exists(ctx context.Context, key string) (bool, error) {
	args := m.Called(ctx, key)
	return args.Bool(0), args.Error(1)
}

func (m *MockCache) Close() error {
	args := m.Called()
	return args.Error(0)
}

func TestActivityService_RecordActivity(t *testing.T) {
	// Setup
	mockRepo := new(MockActivityRepository)
	mockCache := new(MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
	cfg := &config.Config{}
	logger := logrus.New()

	service := NewActivityService(mockRepo, mockCache, mockPublisher, cfg, logger)

	userID := uuid.New()
	activity := &models.UserActivity{
		UserID:       userID,
		ActivityType: models.ActivityTypeLogin,
		DeviceType:   "mobile",
		AppVersion:   "1.0.0",
		Metadata:     make(map[string]interface{}),
	}

	// Mock expectations
	mockRepo.On("CreateActivity", mock.Anything, mock.AnythingOfType("*models.UserActivity")).Return(nil)
	mockCache.On("Delete", mock.Anything, mock.AnythingOfType("string")).Return(nil)

	// Execute
	err := service.RecordActivity(context.Background(), activity)

	// Assert
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, activity.ID)
	assert.False(t, activity.Timestamp.IsZero())
	assert.False(t, activity.CreatedAt.IsZero())

	mockRepo.AssertExpectations(t)
}

func TestActivityService_ValidateActivity(t *testing.T) {
	// Setup
	mockRepo := new(MockActivityRepository)
	mockCache := new(MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
	cfg := &config.Config{}
	logger := logrus.New()

	service := NewActivityService(mockRepo, mockCache, mockPublisher, cfg, logger)

	tests := []struct {
		name        string
		activity    *models.UserActivity
		expectError bool
	}{
		{
			name: "valid activity",
			activity: &models.UserActivity{
				UserID:       uuid.New(),
				ActivityType: models.ActivityTypeLogin,
			},
			expectError: false,
		},
		{
			name: "missing user ID",
			activity: &models.UserActivity{
				ActivityType: models.ActivityTypeLogin,
			},
			expectError: true,
		},
		{
			name: "invalid activity type",
			activity: &models.UserActivity{
				UserID:       uuid.New(),
				ActivityType: models.ActivityType("invalid_type"),
			},
			expectError: true,
		},
		{
			name: "attempt activity without item ID",
			activity: &models.UserActivity{
				UserID:       uuid.New(),
				ActivityType: models.ActivityTypeAttemptStart,
			},
			expectError: true,
		},
		{
			name: "session activity without session ID",
			activity: &models.UserActivity{
				UserID:       uuid.New(),
				ActivityType: models.ActivityTypeSessionStart,
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ValidateActivity(tt.activity)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestActivityService_GetActivitySummary(t *testing.T) {
	// Setup
	mockRepo := new(MockActivityRepository)
	mockCache := new(MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
	cfg := &config.Config{}
	logger := logrus.New()

	service := NewActivityService(mockRepo, mockCache, mockPublisher, cfg, logger)

	userID := uuid.New()
	dateRange := models.DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	expectedSummary := &models.ActivitySummary{
		UserID:          userID,
		DateRange:       dateRange,
		TotalActivities: 100,
		ActivityBreakdown: map[models.ActivityType]int{
			models.ActivityTypeLogin:        10,
			models.ActivityTypeAttemptStart: 50,
		},
		SessionCount:       20,
		TotalSessionTime:   3600000, // 1 hour in ms
		AverageSessionTime: 180000,  // 3 minutes in ms
		GeneratedAt:        time.Now(),
	}

	// Mock expectations - cache miss, then repo call
	mockCache.On("Get", mock.Anything, mock.AnythingOfType("string"), mock.Anything).Return(cache.ErrCacheMiss)
	mockRepo.On("GetActivitySummary", mock.Anything, userID, dateRange).Return(expectedSummary, nil)
	mockCache.On("Set", mock.Anything, mock.AnythingOfType("string"), mock.Anything, mock.AnythingOfType("time.Duration")).Return(nil)

	// Execute
	summary, err := service.GetActivitySummary(context.Background(), userID, dateRange)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, summary)
	assert.Equal(t, userID, summary.UserID)
	assert.Equal(t, 100, summary.TotalActivities)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestActivityService_GenerateActivityInsights(t *testing.T) {
	// Setup
	mockRepo := new(MockActivityRepository)
	mockCache := new(MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
	cfg := &config.Config{}
	logger := logrus.New()

	service := NewActivityService(mockRepo, mockCache, mockPublisher, cfg, logger)

	userID := uuid.New()

	// Mock activity summary with low engagement
	lowEngagementSummary := &models.ActivitySummary{
		UserID:          userID,
		TotalActivities: 10,
		EngagementMetrics: models.EngagementMetrics{
			EngagementScore:      0.2, // Low engagement
			AverageSessionLength: 60000, // 1 minute
			DailyActiveStreak:    0,
			ChurnRisk:           "high",
		},
		TopTopics: []models.TopicActivitySummary{
			{
				TopicID:       "traffic_rules",
				ActivityCount: 8, // 80% of activities
			},
		},
		GeneratedAt: time.Now(),
	}

	engagementMetrics := &models.EngagementMetrics{
		EngagementScore:      0.2,
		AverageSessionLength: 60000,
		DailyActiveStreak:    0,
		ChurnRisk:           "high",
	}

	// Mock expectations
	mockCache.On("Get", mock.Anything, mock.AnythingOfType("string"), mock.Anything).Return(cache.ErrCacheMiss)
	mockRepo.On("GetActivitySummary", mock.Anything, userID, mock.AnythingOfType("models.DateRange")).Return(lowEngagementSummary, nil)
	mockCache.On("Set", mock.Anything, mock.AnythingOfType("string"), mock.Anything, mock.AnythingOfType("time.Duration")).Return(nil)
	mockRepo.On("GetEngagementMetrics", mock.Anything, userID, 30).Return(engagementMetrics, nil)
	mockRepo.On("GetBehaviorPatterns", mock.Anything, userID, 30).Return([]models.BehaviorPattern{}, nil)
	mockRepo.On("CreateActivityInsight", mock.Anything, mock.AnythingOfType("*models.ActivityInsight")).Return(nil)

	// Execute
	insights, err := service.GenerateActivityInsights(context.Background(), userID)

	// Assert
	assert.NoError(t, err)
	assert.NotEmpty(t, insights)

	// Check for expected insights
	foundLowEngagement := false
	foundShortSessions := false
	foundNoStreak := false
	foundTopicConcentration := false

	for _, insight := range insights {
		switch insight.Type {
		case "low_engagement":
			foundLowEngagement = true
			assert.Equal(t, "warning", insight.Severity)
		case "short_sessions":
			foundShortSessions = true
			assert.Equal(t, "info", insight.Severity)
		case "no_streak":
			foundNoStreak = true
		case "topic_concentration":
			foundTopicConcentration = true
		}
	}

	assert.True(t, foundLowEngagement, "Should generate low engagement insight")
	assert.True(t, foundShortSessions, "Should generate short sessions insight")
	assert.True(t, foundNoStreak, "Should generate no streak insight")
	assert.True(t, foundTopicConcentration, "Should generate topic concentration insight")

	mockRepo.AssertExpectations(t)
}

func TestActivityService_GenerateActivityRecommendations(t *testing.T) {
	// Setup
	mockRepo := new(MockActivityRepository)
	mockCache := new(MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
	cfg := &config.Config{}
	logger := logrus.New()

	service := NewActivityService(mockRepo, mockCache, mockPublisher, cfg, logger)

	userID := uuid.New()

	// Mock engagement metrics with high churn risk
	engagementMetrics := &models.EngagementMetrics{
		EngagementScore:      0.2,
		AverageSessionLength: 30000, // 30 seconds - very short
		DailyActiveStreak:    1,     // Low streak
		ChurnRisk:           "high",
	}

	// Mock behavior patterns with peak hours
	behaviorPatterns := []models.BehaviorPattern{
		{
			PatternType: "peak_hours",
			Metadata: map[string]interface{}{
				"peak_hours": []int{9, 14, 20}, // 9 AM, 2 PM, 8 PM
			},
		},
	}

	// Mock expectations
	mockRepo.On("GetEngagementMetrics", mock.Anything, userID, 30).Return(engagementMetrics, nil)
	mockRepo.On("GetBehaviorPatterns", mock.Anything, userID, 30).Return(behaviorPatterns, nil)
	mockRepo.On("CreateActivityRecommendation", mock.Anything, mock.AnythingOfType("*models.ActivityRecommendation")).Return(nil)

	// Execute
	recommendations, err := service.GenerateActivityRecommendations(context.Background(), userID)

	// Assert
	assert.NoError(t, err)
	assert.NotEmpty(t, recommendations)

	// Check for expected recommendations
	foundScheduleOptimization := false
	foundSessionLength := false
	foundEngagementBoost := false
	foundStreakBuilding := false

	for _, rec := range recommendations {
		switch rec.Type {
		case "optimal_schedule":
			foundScheduleOptimization = true
			assert.Equal(t, "study_schedule", rec.Category)
		case "session_length":
			foundSessionLength = true
			assert.Equal(t, "strategy", rec.Category)
		case "engagement_boost":
			foundEngagementBoost = true
			assert.Equal(t, "engagement", rec.Category)
			assert.Equal(t, 9, rec.Priority) // High priority for high churn risk
		case "streak_building":
			foundStreakBuilding = true
			assert.Equal(t, "study_schedule", rec.Category)
		}
	}

	assert.True(t, foundScheduleOptimization, "Should generate schedule optimization recommendation")
	assert.True(t, foundSessionLength, "Should generate session length recommendation")
	assert.True(t, foundEngagementBoost, "Should generate engagement boost recommendation")
	assert.True(t, foundStreakBuilding, "Should generate streak building recommendation")

	mockRepo.AssertExpectations(t)
}

func TestActivityService_RecordActivitiesBatch(t *testing.T) {
	// Setup
	mockRepo := new(MockActivityRepository)
	mockCache := new(MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
	cfg := &config.Config{}
	logger := logrus.New()

	service := NewActivityService(mockRepo, mockCache, mockPublisher, cfg, logger)

	userID := uuid.New()
	activities := []models.UserActivity{
		{
			UserID:       userID,
			ActivityType: models.ActivityTypeLogin,
			DeviceType:   "mobile",
			Metadata:     make(map[string]interface{}),
		},
		{
			UserID:       userID,
			ActivityType: models.ActivityTypeAttemptStart,
			ItemID:       &[]uuid.UUID{uuid.New()}[0],
			DeviceType:   "mobile",
			Metadata:     make(map[string]interface{}),
		},
	}

	// Mock expectations
	mockRepo.On("CreateActivitiesBatch", mock.Anything, mock.AnythingOfType("[]models.UserActivity")).Return(nil)
	mockCache.On("Delete", mock.Anything, mock.AnythingOfType("string")).Return(nil)

	// Execute
	err := service.RecordActivitiesBatch(context.Background(), activities)

	// Assert
	assert.NoError(t, err)

	// Verify all activities have IDs and timestamps
	for _, activity := range activities {
		assert.NotEqual(t, uuid.Nil, activity.ID)
		assert.False(t, activity.Timestamp.IsZero())
		assert.False(t, activity.CreatedAt.IsZero())
	}

	mockRepo.AssertExpectations(t)
}

func TestActivityService_EnrichActivity(t *testing.T) {
	// Setup
	mockRepo := new(MockActivityRepository)
	mockCache := new(MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
	cfg := &config.Config{}
	logger := logrus.New()

	service := NewActivityService(mockRepo, mockCache, mockPublisher, cfg, logger)

	activity := &models.UserActivity{
		UserID:       uuid.New(),
		ActivityType: models.ActivityTypeAttemptSubmit,
		Duration:     &[]int64{45000}[0], // 45 seconds
	}

	// Execute
	err := service.EnrichActivity(context.Background(), activity)

	// Assert
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, activity.ID)
	assert.False(t, activity.Timestamp.IsZero())
	assert.False(t, activity.CreatedAt.IsZero())
	assert.NotNil(t, activity.Metadata)
	assert.Contains(t, activity.Metadata, "enriched_at")
	assert.Contains(t, activity.Metadata, "service_version")
	assert.Contains(t, activity.Metadata, "response_speed")
	assert.Equal(t, "normal", activity.Metadata["response_speed"])
}

// Benchmark tests
func BenchmarkActivityService_RecordActivity(b *testing.B) {
	mockRepo := new(MockActivityRepository)
	mockCache := new(MockCache)
	mockPublisher := events.NewNoOpEventPublisher()
	cfg := &config.Config{}
	logger := logrus.New()

	service := NewActivityService(mockRepo, mockCache, mockPublisher, cfg, logger)

	mockRepo.On("CreateActivity", mock.Anything, mock.AnythingOfType("*models.UserActivity")).Return(nil)
	mockCache.On("Delete", mock.Anything, mock.AnythingOfType("string")).Return(nil)

	userID := uuid.New()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		activity := &models.UserActivity{
			UserID:       userID,
			ActivityType: models.ActivityTypeLogin,
			DeviceType:   "mobile",
			Metadata:     make(map[string]interface{}),
		}

		service.RecordActivity(context.Background(), activity)
	}
}