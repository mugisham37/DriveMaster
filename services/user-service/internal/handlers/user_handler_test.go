package handlers

import (
	"context"
	"testing"
	"time"

	"user-service/internal/config"
	"user-service/internal/events"
	"user-service/internal/models"
	"user-service/internal/service"
	pb "user-service/proto"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
)

// Mock repository for handler testing
type mockHandlerUserRepository struct {
	users map[uuid.UUID]*models.User
}

func newMockHandlerUserRepository() *mockHandlerUserRepository {
	return &mockHandlerUserRepository{
		users: make(map[uuid.UUID]*models.User),
	}
}

func (m *mockHandlerUserRepository) GetByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	user, exists := m.users[userID]
	if !exists {
		return nil, models.ErrUserNotFound
	}
	userCopy := *user
	return &userCopy, nil
}

func (m *mockHandlerUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	for _, user := range m.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, models.ErrUserNotFound
}

func (m *mockHandlerUserRepository) Create(ctx context.Context, user *models.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	user.IsActive = true
	user.Version = 1
	m.users[user.ID] = user
	return nil
}

func (m *mockHandlerUserRepository) Update(ctx context.Context, userID uuid.UUID, update *models.UserUpdate) (*models.User, error) {
	user, exists := m.users[userID]
	if !exists {
		return nil, models.ErrUserNotFound
	}

	if user.Version != update.Version {
		return nil, models.ErrOptimisticLock
	}

	if update.Timezone != nil {
		user.Timezone = *update.Timezone
	}
	if update.Language != nil {
		user.Language = *update.Language
	}
	if update.Preferences != nil {
		user.Preferences = *update.Preferences
	}
	if update.GDPRConsent != nil {
		user.GDPRConsent = *update.GDPRConsent
	}

	user.Version++
	return user, nil
}

func (m *mockHandlerUserRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	_, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	delete(m.users, userID)
	return nil
}

func (m *mockHandlerUserRepository) Deactivate(ctx context.Context, userID uuid.UUID, reason string) error {
	user, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	user.IsActive = false
	return nil
}

func (m *mockHandlerUserRepository) Activate(ctx context.Context, userID uuid.UUID) error {
	user, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	user.IsActive = true
	return nil
}

func (m *mockHandlerUserRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error) {
	user, exists := m.users[userID]
	if !exists {
		return nil, models.ErrUserNotFound
	}

	return &models.UserPreferences{
		UserID:      userID,
		Preferences: user.Preferences,
	}, nil
}

func (m *mockHandlerUserRepository) UpdatePreferences(ctx context.Context, userID uuid.UUID, preferences map[string]interface{}) (*models.UserPreferences, error) {
	user, exists := m.users[userID]
	if !exists {
		return nil, models.ErrUserNotFound
	}

	user.Preferences = preferences
	return &models.UserPreferences{
		UserID:      userID,
		Preferences: preferences,
	}, nil
}

func (m *mockHandlerUserRepository) Search(ctx context.Context, filters *models.UserSearchFilters) (*models.UserSearchResult, error) {
	var users []models.User
	for _, user := range m.users {
		users = append(users, *user)
	}
	return &models.UserSearchResult{
		Users: users,
		Total: len(users),
	}, nil
}

func (m *mockHandlerUserRepository) GetMultiple(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error) {
	var users []models.User
	for _, userID := range userIDs {
		if user, exists := m.users[userID]; exists {
			users = append(users, *user)
		}
	}
	return users, nil
}

func (m *mockHandlerUserRepository) UpdateLastActive(ctx context.Context, userID uuid.UUID) error {
	_, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	return nil
}

func (m *mockHandlerUserRepository) GetActiveUserCount(ctx context.Context) (int, error) {
	count := 0
	for _, user := range m.users {
		if user.IsActive {
			count++
		}
	}
	return count, nil
}

func (m *mockHandlerUserRepository) GetUserCountByCountry(ctx context.Context) (map[string]int, error) {
	countMap := make(map[string]int)
	for _, user := range m.users {
		countMap[user.CountryCode]++
	}
	return countMap, nil
}

// Mock cache for handler testing
type mockHandlerCache struct{}

func (m *mockHandlerCache) Get(ctx context.Context, key string, dest interface{}) error {
	return models.ErrUserNotFound // Always cache miss for simplicity
}

func (m *mockHandlerCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	return nil
}

func (m *mockHandlerCache) Delete(ctx context.Context, key string) error {
	return nil
}

func (m *mockHandlerCache) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	return true, nil
}

func (m *mockHandlerCache) Increment(ctx context.Context, key string) (int64, error) {
	return 1, nil
}

func (m *mockHandlerCache) Expire(ctx context.Context, key string, ttl time.Duration) error {
	return nil
}

func (m *mockHandlerCache) Close() error {
	return nil
}

// mockProgressService is a simple mock for testing
type mockProgressService struct{}

func (m *mockProgressService) GetSkillMastery(ctx context.Context, userID uuid.UUID, topic string) (*models.SkillMastery, error) {
	return nil, nil
}

func (m *mockProgressService) GetAllSkillMasteries(ctx context.Context, userID uuid.UUID) ([]models.SkillMastery, error) {
	return nil, nil
}

func (m *mockProgressService) UpdateSkillMastery(ctx context.Context, userID uuid.UUID, topic string, attempts []models.AttemptRecord) error {
	return nil
}

func (m *mockProgressService) RecalculateAllMasteries(ctx context.Context, userID uuid.UUID) error {
	return nil
}

func (m *mockProgressService) GetProgressSummary(ctx context.Context, userID uuid.UUID) (*models.ProgressSummary, error) {
	return nil, nil
}

func (m *mockProgressService) GetWeeklyProgress(ctx context.Context, userID uuid.UUID, weeks int) ([]models.WeeklyProgressPoint, error) {
	return nil, nil
}

func (m *mockProgressService) GetTopicProgress(ctx context.Context, userID uuid.UUID, topics []string) ([]models.TopicProgressPoint, error) {
	return nil, nil
}

func (m *mockProgressService) GetLearningStreak(ctx context.Context, userID uuid.UUID) (*models.LearningStreak, error) {
	return nil, nil
}

func (m *mockProgressService) UpdateLearningStreak(ctx context.Context, userID uuid.UUID) error {
	return nil
}

func (m *mockProgressService) GetMilestones(ctx context.Context, userID uuid.UUID) ([]models.Milestone, error) {
	return nil, nil
}

func (m *mockProgressService) CheckMilestoneAchievements(ctx context.Context, userID uuid.UUID) ([]models.Milestone, error) {
	return nil, nil
}

func (m *mockProgressService) GetProgressVisualizationData(ctx context.Context, userID uuid.UUID, timeRange string) (map[string]interface{}, error) {
	return nil, nil
}

func (m *mockProgressService) GetMasteryTrendData(ctx context.Context, userID uuid.UUID, topic string, days int) ([]map[string]interface{}, error) {
	return nil, nil
}

func (m *mockProgressService) GetAccuracyTrendData(ctx context.Context, userID uuid.UUID, days int) ([]map[string]interface{}, error) {
	return nil, nil
}

func (m *mockProgressService) GetProgressComparison(ctx context.Context, userID uuid.UUID, comparisonType string, target string) (*models.ProgressComparison, error) {
	return nil, nil
}

func (m *mockProgressService) GetPeerComparison(ctx context.Context, userID uuid.UUID, countryCode string) (*models.ProgressComparison, error) {
	return nil, nil
}

func (m *mockProgressService) GetHistoricalComparison(ctx context.Context, userID uuid.UUID, days int) (*models.ProgressComparison, error) {
	return nil, nil
}

func (m *mockProgressService) ProcessAttempt(ctx context.Context, attempt *models.AttemptRecord) error {
	return nil
}

func (m *mockProgressService) RecordAttempt(ctx context.Context, attempt *models.AttemptRecord) error {
	return nil
}

func (m *mockProgressService) GenerateInsights(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return nil, nil
}

func (m *mockProgressService) GenerateRecommendations(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return nil, nil
}

func setupHandler() *UserHandler {
	repo := newMockHandlerUserRepository()
	cache := &mockHandlerCache{}
	cfg := &config.Config{}
	publisher := events.NewNoOpEventPublisher()

	userService := service.NewUserService(repo, cache, cfg, publisher)
	progressService := &mockProgressService{}
	return NewUserHandler(userService, progressService)
}

func TestUserHandler_GetUser(t *testing.T) {
	handler := setupHandler()

	// Create a user first
	user := &models.User{
		ID:          uuid.New(),
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	// Create the user through the service
	err := handler.userService.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Test GetUser
	req := &pb.GetUserRequest{
		UserId: user.ID.String(),
	}

	resp, err := handler.GetUser(context.Background(), req)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if resp.User.Email != user.Email {
		t.Errorf("Expected email %s, got %s", user.Email, resp.User.Email)
	}

	if resp.User.CountryCode != user.CountryCode {
		t.Errorf("Expected country code %s, got %s", user.CountryCode, resp.User.CountryCode)
	}
}

func TestUserHandler_GetUser_NotFound(t *testing.T) {
	handler := setupHandler()

	req := &pb.GetUserRequest{
		UserId: uuid.New().String(),
	}

	_, err := handler.GetUser(context.Background(), req)
	if err == nil {
		t.Fatal("Expected error for non-existent user")
	}

	st, ok := status.FromError(err)
	if !ok {
		t.Fatal("Expected gRPC status error")
	}

	if st.Code() != codes.NotFound {
		t.Errorf("Expected NotFound status, got %v", st.Code())
	}
}

func TestUserHandler_GetUser_InvalidID(t *testing.T) {
	handler := setupHandler()

	req := &pb.GetUserRequest{
		UserId: "invalid-uuid",
	}

	_, err := handler.GetUser(context.Background(), req)
	if err == nil {
		t.Fatal("Expected error for invalid user ID")
	}

	st, ok := status.FromError(err)
	if !ok {
		t.Fatal("Expected gRPC status error")
	}

	if st.Code() != codes.InvalidArgument {
		t.Errorf("Expected InvalidArgument status, got %v", st.Code())
	}
}

func TestUserHandler_UpdateUser(t *testing.T) {
	handler := setupHandler()

	// Create a user first
	user := &models.User{
		ID:          uuid.New(),
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	err := handler.userService.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Update the user
	newTimezone := "America/New_York"
	newLanguage := "es"

	req := &pb.UpdateUserRequest{
		UserId:   user.ID.String(),
		Timezone: &newTimezone,
		Language: &newLanguage,
	}

	resp, err := handler.UpdateUser(context.Background(), req)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if resp.User.Timezone != newTimezone {
		t.Errorf("Expected timezone %s, got %s", newTimezone, resp.User.Timezone)
	}

	if resp.User.Language != newLanguage {
		t.Errorf("Expected language %s, got %s", newLanguage, resp.User.Language)
	}
}

func TestUserHandler_UpdatePreferences(t *testing.T) {
	handler := setupHandler()

	// Create a user first
	user := &models.User{
		ID:          uuid.New(),
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	err := handler.userService.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Update preferences
	prefs := map[string]interface{}{
		"theme":         "dark",
		"notifications": true,
	}

	prefsStruct, err := structpb.NewStruct(prefs)
	if err != nil {
		t.Fatalf("Failed to create struct: %v", err)
	}

	req := &pb.UpdatePreferencesRequest{
		UserId:      user.ID.String(),
		Preferences: prefsStruct,
	}

	resp, err := handler.UpdatePreferences(context.Background(), req)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	respPrefs := resp.Preferences.Preferences.AsMap()
	if respPrefs["theme"] != "dark" {
		t.Errorf("Expected theme 'dark', got %v", respPrefs["theme"])
	}

	if respPrefs["notifications"] != true {
		t.Errorf("Expected notifications true, got %v", respPrefs["notifications"])
	}
}

func TestUserHandler_DeactivateUser(t *testing.T) {
	handler := setupHandler()

	// Create a user first
	user := &models.User{
		ID:          uuid.New(),
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	err := handler.userService.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Deactivate the user
	req := &pb.DeactivateUserRequest{
		UserId: user.ID.String(),
		Reason: "test deactivation",
	}

	resp, err := handler.DeactivateUser(context.Background(), req)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if !resp.Success {
		t.Error("Expected success to be true")
	}
}

func TestUserHandler_HealthCheck(t *testing.T) {
	handler := setupHandler()

	req := &pb.HealthCheckRequest{}

	resp, err := handler.HealthCheck(context.Background(), req)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if resp.Status != "healthy" {
		t.Errorf("Expected status 'healthy', got %s", resp.Status)
	}

	if resp.Timestamp == nil {
		t.Error("Expected timestamp to be set")
	}
}
