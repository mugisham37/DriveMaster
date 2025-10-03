package service

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"user-service/internal/config"
	"user-service/internal/events"
	"user-service/internal/models"

	"github.com/google/uuid"
)

// Mock repository for testing
type mockUserRepository struct {
	users map[uuid.UUID]*models.User
}

func newMockUserRepository() *mockUserRepository {
	return &mockUserRepository{
		users: make(map[uuid.UUID]*models.User),
	}
}

func (m *mockUserRepository) GetByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	user, exists := m.users[userID]
	if !exists {
		return nil, models.ErrUserNotFound
	}
	// Return a copy to avoid reference issues
	userCopy := *user
	return &userCopy, nil
}

func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	for _, user := range m.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, models.ErrUserNotFound
}

func (m *mockUserRepository) Create(ctx context.Context, user *models.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	user.LastActiveAt = time.Now()
	user.IsActive = true
	user.Version = 1

	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepository) Update(ctx context.Context, userID uuid.UUID, update *models.UserUpdate) (*models.User, error) {
	user, exists := m.users[userID]
	if !exists {
		return nil, models.ErrUserNotFound
	}

	if user.Version != update.Version {
		return nil, models.ErrOptimisticLock
	}

	// Apply updates
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

	user.UpdatedAt = time.Now()
	user.Version++

	return user, nil
}

func (m *mockUserRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	_, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	delete(m.users, userID)
	return nil
}

func (m *mockUserRepository) Deactivate(ctx context.Context, userID uuid.UUID, reason string) error {
	user, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	user.IsActive = false
	user.UpdatedAt = time.Now()
	return nil
}

func (m *mockUserRepository) Activate(ctx context.Context, userID uuid.UUID) error {
	user, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	user.IsActive = true
	user.UpdatedAt = time.Now()
	return nil
}

func (m *mockUserRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error) {
	user, exists := m.users[userID]
	if !exists {
		return nil, models.ErrUserNotFound
	}

	return &models.UserPreferences{
		UserID:      userID,
		Preferences: user.Preferences,
		UpdatedAt:   user.UpdatedAt,
	}, nil
}

func (m *mockUserRepository) UpdatePreferences(ctx context.Context, userID uuid.UUID, preferences map[string]interface{}) (*models.UserPreferences, error) {
	user, exists := m.users[userID]
	if !exists {
		return nil, models.ErrUserNotFound
	}

	user.Preferences = preferences
	user.UpdatedAt = time.Now()

	return &models.UserPreferences{
		UserID:      userID,
		Preferences: preferences,
		UpdatedAt:   user.UpdatedAt,
	}, nil
}

func (m *mockUserRepository) Search(ctx context.Context, filters *models.UserSearchFilters) (*models.UserSearchResult, error) {
	var users []models.User
	for _, user := range m.users {
		// Apply filters
		if filters.CountryCode != "" && user.CountryCode != filters.CountryCode {
			continue
		}
		if filters.UserRole != "" && user.UserRole != filters.UserRole {
			continue
		}
		if filters.IsActive != nil && user.IsActive != *filters.IsActive {
			continue
		}
		if filters.Email != "" && !strings.Contains(strings.ToLower(user.Email), strings.ToLower(filters.Email)) {
			continue
		}

		users = append(users, *user)
	}

	return &models.UserSearchResult{
		Users:   users,
		Total:   len(users),
		Limit:   filters.Limit,
		Offset:  filters.Offset,
		HasMore: false,
	}, nil
}

func (m *mockUserRepository) GetMultiple(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error) {
	var users []models.User
	if len(userIDs) == 0 {
		// Return all users if no specific IDs requested
		for _, user := range m.users {
			users = append(users, *user)
		}
	} else {
		for _, userID := range userIDs {
			if user, exists := m.users[userID]; exists {
				users = append(users, *user)
			}
		}
	}
	return users, nil
}

func (m *mockUserRepository) UpdateLastActive(ctx context.Context, userID uuid.UUID) error {
	user, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	user.LastActiveAt = time.Now()
	return nil
}

func (m *mockUserRepository) GetActiveUserCount(ctx context.Context) (int, error) {
	count := 0
	for _, user := range m.users {
		if user.IsActive {
			count++
		}
	}
	return count, nil
}

func (m *mockUserRepository) GetUserCountByCountry(ctx context.Context) (map[string]int, error) {
	countMap := make(map[string]int)
	for _, user := range m.users {
		countMap[user.CountryCode]++
	}
	return countMap, nil
}

// Mock cache for testing
type mockCache struct {
	data map[string]interface{}
}

func newMockCache() *mockCache {
	return &mockCache{
		data: make(map[string]interface{}),
	}
}

func (m *mockCache) Get(ctx context.Context, key string, dest interface{}) error {
	// Simple mock - always return cache miss to force database lookup
	return fmt.Errorf("cache miss")
}

func (m *mockCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	m.data[key] = value
	return nil
}

func (m *mockCache) Delete(ctx context.Context, key string) error {
	delete(m.data, key)
	return nil
}

func (m *mockCache) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	if _, exists := m.data[key]; exists {
		return false, nil
	}
	m.data[key] = value
	return true, nil
}

func (m *mockCache) Increment(ctx context.Context, key string) (int64, error) {
	val, exists := m.data[key]
	if !exists {
		m.data[key] = int64(1)
		return 1, nil
	}
	if intVal, ok := val.(int64); ok {
		intVal++
		m.data[key] = intVal
		return intVal, nil
	}
	return 0, fmt.Errorf("value is not an integer")
}

func (m *mockCache) Expire(ctx context.Context, key string, ttl time.Duration) error {
	// Mock implementation - just return success
	return nil
}

func (m *mockCache) Close() error {
	return nil
}

// Test functions
func TestUserService_CreateUser(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	user := &models.User{
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	err := service.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if user.ID == uuid.Nil {
		t.Error("Expected user ID to be set")
	}

	if !user.IsActive {
		t.Error("Expected user to be active")
	}
}

func TestUserService_GetUser(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create a user first
	user := &models.User{
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	err := service.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Get the user
	retrievedUser, err := service.GetUser(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if retrievedUser.Email != user.Email {
		t.Errorf("Expected email %s, got %s", user.Email, retrievedUser.Email)
	}
}

func TestUserService_UpdateUser(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create a user first
	user := &models.User{
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	err := service.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Get the user to get the correct version
	createdUser, err := service.GetUser(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Failed to get created user: %v", err)
	}

	t.Logf("Created user version: %d", createdUser.Version)

	// Update the user
	newTimezone := "America/New_York"
	update := &models.UserUpdate{
		Timezone: &newTimezone,
		Version:  createdUser.Version,
	}

	updatedUser, err := service.UpdateUser(context.Background(), user.ID, update)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if updatedUser.Timezone != newTimezone {
		t.Errorf("Expected timezone %s, got %s", newTimezone, updatedUser.Timezone)
	}

	t.Logf("Updated user version: %d", updatedUser.Version)

	if updatedUser.Version != createdUser.Version+1 {
		t.Errorf("Expected version to be incremented from %d to %d, got %d", createdUser.Version, createdUser.Version+1, updatedUser.Version)
	}
}
func TestUserService_UpdatePreferences(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create a user first
	user := &models.User{
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	err := service.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Update preferences
	newPrefs := map[string]interface{}{
		"theme":            "dark",
		"notifications":    true,
		"difficulty_level": 3,
	}

	updatedPrefs, err := service.UpdatePreferences(context.Background(), user.ID, newPrefs)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if updatedPrefs.Preferences["theme"] != "dark" {
		t.Errorf("Expected theme to be 'dark', got %v", updatedPrefs.Preferences["theme"])
	}

	if updatedPrefs.Preferences["notifications"] != true {
		t.Errorf("Expected notifications to be true, got %v", updatedPrefs.Preferences["notifications"])
	}
}

func TestUserService_GetUserPreferences(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create a user with preferences
	initialPrefs := map[string]interface{}{
		"language": "en",
		"theme":    "light",
	}

	user := &models.User{
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: initialPrefs,
	}

	err := service.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Get preferences
	prefs, err := service.GetUserPreferences(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if prefs.Preferences["language"] != "en" {
		t.Errorf("Expected language to be 'en', got %v", prefs.Preferences["language"])
	}

	if prefs.Preferences["theme"] != "light" {
		t.Errorf("Expected theme to be 'light', got %v", prefs.Preferences["theme"])
	}
}

func TestUserService_DeactivateAndActivateUser(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create a user first
	user := &models.User{
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	err := service.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Deactivate user
	err = service.DeactivateUser(context.Background(), user.ID, "test deactivation")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Verify user is deactivated
	deactivatedUser, err := repo.GetByID(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Failed to get user: %v", err)
	}

	if deactivatedUser.IsActive {
		t.Error("Expected user to be deactivated")
	}

	// Activate user
	err = service.ActivateUser(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Verify user is activated
	activatedUser, err := repo.GetByID(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Failed to get user: %v", err)
	}

	if !activatedUser.IsActive {
		t.Error("Expected user to be activated")
	}
}

func TestUserService_SearchUsers(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create multiple users
	users := []*models.User{
		{
			Email:       "user1@example.com",
			CountryCode: "US",
			Timezone:    "UTC",
			Language:    "en",
			UserRole:    "learner",
			Preferences: make(map[string]interface{}),
		},
		{
			Email:       "user2@example.com",
			CountryCode: "CA",
			Timezone:    "UTC",
			Language:    "en",
			UserRole:    "content_author",
			Preferences: make(map[string]interface{}),
		},
		{
			Email:       "user3@example.com",
			CountryCode: "US",
			Timezone:    "UTC",
			Language:    "es",
			UserRole:    "learner",
			Preferences: make(map[string]interface{}),
		},
	}

	for _, user := range users {
		err := service.CreateUser(context.Background(), user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}
	}

	// Search for users
	filters := &models.UserSearchFilters{
		CountryCode: "US",
		Limit:       10,
		Offset:      0,
	}

	result, err := service.SearchUsers(context.Background(), filters)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Should find 2 US users
	if len(result.Users) != 2 {
		t.Errorf("Expected 2 users, got %d", len(result.Users))
	}

	// Verify all returned users are from US
	for _, user := range result.Users {
		if user.CountryCode != "US" {
			t.Errorf("Expected country code 'US', got %s", user.CountryCode)
		}
	}
}

func TestUserService_GetMultipleUsers(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create multiple users
	var userIDs []uuid.UUID
	for i := 0; i < 3; i++ {
		user := &models.User{
			Email:       fmt.Sprintf("user%d@example.com", i+1),
			CountryCode: "US",
			Timezone:    "UTC",
			Language:    "en",
			UserRole:    "learner",
			Preferences: make(map[string]interface{}),
		}

		err := service.CreateUser(context.Background(), user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}
		userIDs = append(userIDs, user.ID)
	}

	// Get multiple users
	users, err := service.GetMultipleUsers(context.Background(), userIDs)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(users) != 3 {
		t.Errorf("Expected 3 users, got %d", len(users))
	}

	// Verify all users are returned
	for i, user := range users {
		expectedEmail := fmt.Sprintf("user%d@example.com", i+1)
		if user.Email != expectedEmail {
			t.Errorf("Expected email %s, got %s", expectedEmail, user.Email)
		}
	}
}

func TestUserService_UpdateLastActive(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create a user first
	user := &models.User{
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	err := service.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	originalLastActive := user.LastActiveAt

	// Wait a bit to ensure timestamp difference
	time.Sleep(10 * time.Millisecond)

	// Update last active
	err = service.UpdateLastActive(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Verify last active was updated
	updatedUser, err := repo.GetByID(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Failed to get user: %v", err)
	}

	if !updatedUser.LastActiveAt.After(originalLastActive) {
		t.Error("Expected last active time to be updated")
	}
}

func TestUserService_GetActiveUserCount(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create multiple users
	for i := 0; i < 3; i++ {
		user := &models.User{
			Email:       fmt.Sprintf("user%d@example.com", i+1),
			CountryCode: "US",
			Timezone:    "UTC",
			Language:    "en",
			UserRole:    "learner",
			Preferences: make(map[string]interface{}),
		}

		err := service.CreateUser(context.Background(), user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}
	}

	// Get all users and deactivate one
	allUsers, _ := repo.GetMultiple(context.Background(), []uuid.UUID{})
	if len(allUsers) > 0 {
		err := service.DeactivateUser(context.Background(), allUsers[0].ID, "test")
		if err != nil {
			t.Fatalf("Failed to deactivate user: %v", err)
		}
	}

	// Get active user count
	count, err := service.GetActiveUserCount(context.Background())
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Should have 2 active users (3 created - 1 deactivated)
	if count != 2 {
		t.Errorf("Expected 2 active users, got %d", count)
	}
}

func TestUserService_GetUserCountByCountry(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create users from different countries
	countries := []string{"US", "US", "CA", "UK"}
	for i, country := range countries {
		user := &models.User{
			Email:       fmt.Sprintf("user%d@example.com", i+1),
			CountryCode: country,
			Timezone:    "UTC",
			Language:    "en",
			UserRole:    "learner",
			Preferences: make(map[string]interface{}),
		}

		err := service.CreateUser(context.Background(), user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}
	}

	// Get user count by country
	countMap, err := service.GetUserCountByCountry(context.Background())
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Verify counts
	if countMap["US"] != 2 {
		t.Errorf("Expected 2 US users, got %d", countMap["US"])
	}

	if countMap["CA"] != 1 {
		t.Errorf("Expected 1 CA user, got %d", countMap["CA"])
	}

	if countMap["UK"] != 1 {
		t.Errorf("Expected 1 UK user, got %d", countMap["UK"])
	}
}

func TestUserService_OptimisticLocking(t *testing.T) {
	repo := newMockUserRepository()
	cache := newMockCache()
	cfg := &config.Config{}

	service := NewUserService(repo, cache, cfg, events.NewNoOpEventPublisher())

	// Create a user first
	user := &models.User{
		Email:       "test@example.com",
		CountryCode: "US",
		Timezone:    "UTC",
		Language:    "en",
		UserRole:    "learner",
		Preferences: make(map[string]interface{}),
	}

	err := service.CreateUser(context.Background(), user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Get the user to get the correct version
	createdUser, err := service.GetUser(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("Failed to get created user: %v", err)
	}

	// Try to update with wrong version
	newTimezone := "America/New_York"
	update := &models.UserUpdate{
		Timezone: &newTimezone,
		Version:  createdUser.Version + 1, // Wrong version
	}

	_, err = service.UpdateUser(context.Background(), user.ID, update)
	if err != models.ErrOptimisticLock {
		t.Errorf("Expected optimistic lock error, got %v", err)
	}

	// Update with correct version should work
	update.Version = createdUser.Version
	updatedUser, err := service.UpdateUser(context.Background(), user.ID, update)
	if err != nil {
		t.Fatalf("Expected no error with correct version, got %v", err)
	}

	if updatedUser.Timezone != newTimezone {
		t.Errorf("Expected timezone %s, got %s", newTimezone, updatedUser.Timezone)
	}
}
