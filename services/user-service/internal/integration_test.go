package internal

import (
	"context"
	"fmt"
	"testing"
	"time"

	"user-service/internal/cache"
	"user-service/internal/config"
	"user-service/internal/events"
	"user-service/internal/models"
	"user-service/internal/repository"
	"user-service/internal/service"
	"user-service/internal/validation"

	"github.com/google/uuid"
)

// Integration test for user profile management functionality
// This test validates the complete user profile management implementation
// as required by task 6.2

func TestUserProfileManagementIntegration(t *testing.T) {
	ctx := context.Background()

	// Helper function to create fresh test environment for each subtest
	setupTest := func() service.UserService {
		repo := newMockRepository()
		cache := newMockCache()
		cfg := &config.Config{}
		cfg.CacheTTL.User = time.Hour
		publisher := events.NewNoOpEventPublisher()
		return service.NewUserService(repo, cache, cfg, publisher)
	}

	t.Run("User CRUD Operations with Validation", func(t *testing.T) {
		userService := setupTest()
		// Test user creation with validation
		user := &models.User{
			Email:       "test@example.com",
			CountryCode: "US",
			Timezone:    "America/New_York",
			Language:    "en",
			UserRole:    "learner",
			Preferences: map[string]interface{}{
				"theme":            "light",
				"notifications":    true,
				"difficulty_level": 2,
			},
		}

		// Validate user data
		err := validation.ValidateUser(user)
		if err != nil {
			t.Fatalf("User validation failed: %v", err)
		}

		// Create user
		err = userService.CreateUser(ctx, user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		if user.ID == uuid.Nil {
			t.Error("Expected user ID to be set")
		}

		// Get user by ID
		retrievedUser, err := userService.GetUser(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to get user: %v", err)
		}

		if retrievedUser.Email != user.Email {
			t.Errorf("Expected email %s, got %s", user.Email, retrievedUser.Email)
		}

		// Get user by email
		userByEmail, err := userService.GetUserByEmail(ctx, user.Email)
		if err != nil {
			t.Fatalf("Failed to get user by email: %v", err)
		}

		if userByEmail.ID != user.ID {
			t.Error("Expected same user when retrieved by email")
		}
	})

	t.Run("User Profile Updates with Optimistic Locking", func(t *testing.T) {
		userService := setupTest()
		// Create a user
		user := &models.User{
			Email:       "update-test@example.com",
			CountryCode: "CA",
			Timezone:    "UTC",
			Language:    "en",
			UserRole:    "learner",
			Preferences: make(map[string]interface{}),
		}

		err := userService.CreateUser(ctx, user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Get current user for version
		currentUser, err := userService.GetUser(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to get current user: %v", err)
		}

		// Test successful update
		newTimezone := "America/Toronto"
		newLanguage := "fr"
		update := &models.UserUpdate{
			Timezone: &newTimezone,
			Language: &newLanguage,
			Version:  currentUser.Version,
		}

		// Validate update
		err = validation.ValidateUserUpdate(update)
		if err != nil {
			t.Fatalf("Update validation failed: %v", err)
		}

		updatedUser, err := userService.UpdateUser(ctx, user.ID, update)
		if err != nil {
			t.Fatalf("Failed to update user: %v", err)
		}

		if updatedUser.Timezone != newTimezone {
			t.Errorf("Expected timezone %s, got %s", newTimezone, updatedUser.Timezone)
		}

		if updatedUser.Language != newLanguage {
			t.Errorf("Expected language %s, got %s", newLanguage, updatedUser.Language)
		}

		if updatedUser.Version != currentUser.Version+1 {
			t.Errorf("Expected version to be incremented")
		}

		// Test optimistic locking failure
		staleUpdate := &models.UserUpdate{
			Timezone: &newTimezone,
			Version:  currentUser.Version, // Stale version
		}

		_, err = userService.UpdateUser(ctx, user.ID, staleUpdate)
		if err != models.ErrOptimisticLock {
			t.Errorf("Expected optimistic lock error, got %v", err)
		}
	})

	t.Run("User Preferences Management with JSONB Storage", func(t *testing.T) {
		userService := setupTest()
		// Create a user
		user := &models.User{
			Email:       "prefs-test@example.com",
			CountryCode: "UK",
			Timezone:    "Europe/London",
			Language:    "en",
			UserRole:    "learner",
			Preferences: map[string]interface{}{
				"initial_pref": "value",
			},
		}

		err := userService.CreateUser(ctx, user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Get initial preferences
		prefs, err := userService.GetUserPreferences(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to get preferences: %v", err)
		}

		if prefs.Preferences["initial_pref"] != "value" {
			t.Error("Expected initial preference to be preserved")
		}

		// Update preferences with complex data
		newPrefs := map[string]interface{}{
			"theme":         "dark",
			"notifications": true,
			"settings": map[string]interface{}{
				"auto_save":     true,
				"sound_enabled": false,
				"volume":        0.8,
			},
			"recent_topics": []interface{}{"traffic_signs", "parking", "highway_rules"},
			"difficulty":    3.0,
		}

		// Validate preferences
		err = validation.ValidatePreferences(newPrefs)
		if err != nil {
			t.Fatalf("Preferences validation failed: %v", err)
		}

		updatedPrefs, err := userService.UpdatePreferences(ctx, user.ID, newPrefs)
		if err != nil {
			t.Fatalf("Failed to update preferences: %v", err)
		}

		// Verify complex data types are preserved
		if updatedPrefs.Preferences["theme"] != "dark" {
			t.Error("String preference not preserved")
		}

		if updatedPrefs.Preferences["notifications"] != true {
			t.Error("Boolean preference not preserved")
		}

		settings, ok := updatedPrefs.Preferences["settings"].(map[string]interface{})
		if !ok {
			t.Fatal("Nested object preference not preserved")
		}

		if settings["volume"] != 0.8 {
			t.Error("Nested numeric preference not preserved")
		}

		topics, ok := updatedPrefs.Preferences["recent_topics"].([]interface{})
		if !ok {
			t.Fatal("Array preference not preserved")
		}

		if len(topics) != 3 {
			t.Error("Array preference length not preserved")
		}
	})

	t.Run("User Search and Filtering Capabilities", func(t *testing.T) {
		userService := setupTest()
		// Create multiple users for search testing
		users := []*models.User{
			{
				Email:       "search1@example.com",
				CountryCode: "US",
				Timezone:    "UTC",
				Language:    "en",
				UserRole:    "learner",
				Preferences: make(map[string]interface{}),
			},
			{
				Email:       "search2@example.com",
				CountryCode: "US",
				Timezone:    "UTC",
				Language:    "es",
				UserRole:    "content_author",
				Preferences: make(map[string]interface{}),
			},
			{
				Email:       "search3@example.com",
				CountryCode: "CA",
				Timezone:    "UTC",
				Language:    "en",
				UserRole:    "learner",
				Preferences: make(map[string]interface{}),
			},
		}

		for _, user := range users {
			err := userService.CreateUser(ctx, user)
			if err != nil {
				t.Fatalf("Failed to create user: %v", err)
			}
		}

		// Test search by country
		filters := &models.UserSearchFilters{
			CountryCode: "US",
			Limit:       10,
			Offset:      0,
		}

		// Validate search filters
		err := validation.ValidateSearchFilters(filters)
		if err != nil {
			t.Fatalf("Search filters validation failed: %v", err)
		}

		result, err := userService.SearchUsers(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to search users: %v", err)
		}

		if len(result.Users) != 2 {
			t.Errorf("Expected 2 US users, got %d", len(result.Users))
		}

		// Test search by role
		filters = &models.UserSearchFilters{
			UserRole: "learner",
			Limit:    10,
			Offset:   0,
		}

		result, err = userService.SearchUsers(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to search users by role: %v", err)
		}

		if len(result.Users) < 2 {
			t.Errorf("Expected at least 2 learner users, got %d", len(result.Users))
		}

		// Test pagination
		filters = &models.UserSearchFilters{
			Limit:  1,
			Offset: 0,
		}

		result, err = userService.SearchUsers(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to search with pagination: %v", err)
		}

		if len(result.Users) != 1 {
			t.Errorf("Expected 1 user with limit=1, got %d", len(result.Users))
		}

		if !result.HasMore {
			t.Error("Expected HasMore to be true with more results available")
		}
	})

	t.Run("Soft Deletion and Account Deactivation", func(t *testing.T) {
		userService := setupTest()
		// Create a user
		user := &models.User{
			Email:       "deactivate-test@example.com",
			CountryCode: "AU",
			Timezone:    "Australia/Sydney",
			Language:    "en",
			UserRole:    "learner",
			Preferences: make(map[string]interface{}),
		}

		err := userService.CreateUser(ctx, user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Verify user is active
		activeUser, err := userService.GetUser(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to get user: %v", err)
		}

		if !activeUser.IsActive {
			t.Error("Expected user to be active initially")
		}

		// Deactivate user
		err = userService.DeactivateUser(ctx, user.ID, "test deactivation")
		if err != nil {
			t.Fatalf("Failed to deactivate user: %v", err)
		}

		// Verify user is deactivated (soft deletion)
		// Note: The service should still return the user but marked as inactive
		deactivatedUser, err := userService.GetUser(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to get deactivated user: %v", err)
		}

		if deactivatedUser.IsActive {
			t.Error("Expected user to be deactivated")
		}

		// Activate user again
		err = userService.ActivateUser(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to activate user: %v", err)
		}

		// Verify user is active again
		reactivatedUser, err := userService.GetUser(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to get reactivated user: %v", err)
		}

		if !reactivatedUser.IsActive {
			t.Error("Expected user to be active after reactivation")
		}
	})

	t.Run("Multiple User Operations", func(t *testing.T) {
		userService := setupTest()
		// Create multiple users
		var userIDs []uuid.UUID
		for i := 0; i < 3; i++ {
			user := &models.User{
				Email:       fmt.Sprintf("multi-user-%d@example.com", i),
				CountryCode: "DE",
				Timezone:    "Europe/Berlin",
				Language:    "de",
				UserRole:    "learner",
				Preferences: make(map[string]interface{}),
			}

			err := userService.CreateUser(ctx, user)
			if err != nil {
				t.Fatalf("Failed to create user %d: %v", i, err)
			}
			userIDs = append(userIDs, user.ID)
		}

		// Get multiple users
		users, err := userService.GetMultipleUsers(ctx, userIDs)
		if err != nil {
			t.Fatalf("Failed to get multiple users: %v", err)
		}

		if len(users) != 3 {
			t.Errorf("Expected 3 users, got %d", len(users))
		}

		// Verify all users are returned
		for i, user := range users {
			expectedEmail := fmt.Sprintf("multi-user-%d@example.com", i)
			if user.Email != expectedEmail {
				t.Errorf("Expected email %s, got %s", expectedEmail, user.Email)
			}
		}
	})

	t.Run("Activity Tracking", func(t *testing.T) {
		userService := setupTest()
		// Create a user
		user := &models.User{
			Email:       "activity-test@example.com",
			CountryCode: "JP",
			Timezone:    "Asia/Tokyo",
			Language:    "ja",
			UserRole:    "learner",
			Preferences: make(map[string]interface{}),
		}

		err := userService.CreateUser(ctx, user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		originalLastActive := user.LastActiveAt

		// Wait a bit to ensure timestamp difference
		time.Sleep(10 * time.Millisecond)

		// Update last active
		err = userService.UpdateLastActive(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to update last active: %v", err)
		}

		// Verify last active was updated
		updatedUser, err := userService.GetUser(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to get updated user: %v", err)
		}

		if !updatedUser.LastActiveAt.After(originalLastActive) {
			t.Error("Expected last active time to be updated")
		}
	})

	t.Run("Statistics and Analytics", func(t *testing.T) {
		userService := setupTest()
		// Create some test users first
		for i := 0; i < 3; i++ {
			user := &models.User{
				Email:       fmt.Sprintf("stats-user-%d@example.com", i),
				CountryCode: "FR",
				Timezone:    "Europe/Paris",
				Language:    "fr",
				UserRole:    "learner",
				Preferences: make(map[string]interface{}),
			}
			err := userService.CreateUser(ctx, user)
			if err != nil {
				t.Fatalf("Failed to create test user: %v", err)
			}
		}

		// Get active user count
		count, err := userService.GetActiveUserCount(ctx)
		if err != nil {
			t.Fatalf("Failed to get active user count: %v", err)
		}

		if count <= 0 {
			t.Error("Expected positive active user count")
		}

		// Get user count by country
		countMap, err := userService.GetUserCountByCountry(ctx)
		if err != nil {
			t.Fatalf("Failed to get user count by country: %v", err)
		}

		if len(countMap) == 0 {
			t.Error("Expected non-empty country count map")
		}

		// Verify some countries have users
		totalUsers := 0
		for _, count := range countMap {
			totalUsers += count
		}

		if totalUsers <= 0 {
			t.Error("Expected positive total user count across countries")
		}
	})
}

// Mock implementations for integration testing
type mockRepository struct {
	users map[uuid.UUID]*models.User
}

func newMockRepository() repository.UserRepository {
	return &mockRepository{
		users: make(map[uuid.UUID]*models.User),
	}
}

func (m *mockRepository) GetByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	user, exists := m.users[userID]
	if !exists {
		return nil, models.ErrUserNotFound
	}
	userCopy := *user
	return &userCopy, nil
}

func (m *mockRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	for _, user := range m.users {
		if user.Email == email {
			userCopy := *user
			return &userCopy, nil
		}
	}
	return nil, models.ErrUserNotFound
}

func (m *mockRepository) Create(ctx context.Context, user *models.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	user.LastActiveAt = time.Now()
	user.IsActive = true
	user.Version = 1

	if user.Preferences == nil {
		user.Preferences = make(map[string]interface{})
	}

	m.users[user.ID] = user
	return nil
}

func (m *mockRepository) Update(ctx context.Context, userID uuid.UUID, update *models.UserUpdate) (*models.User, error) {
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

	user.UpdatedAt = time.Now()
	user.Version++

	return user, nil
}

func (m *mockRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	_, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	delete(m.users, userID)
	return nil
}

func (m *mockRepository) Deactivate(ctx context.Context, userID uuid.UUID, reason string) error {
	user, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	user.IsActive = false
	user.UpdatedAt = time.Now()
	return nil
}

func (m *mockRepository) Activate(ctx context.Context, userID uuid.UUID) error {
	user, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	user.IsActive = true
	user.UpdatedAt = time.Now()
	return nil
}

func (m *mockRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error) {
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

func (m *mockRepository) UpdatePreferences(ctx context.Context, userID uuid.UUID, preferences map[string]interface{}) (*models.UserPreferences, error) {
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

func (m *mockRepository) Search(ctx context.Context, filters *models.UserSearchFilters) (*models.UserSearchResult, error) {
	var filteredUsers []models.User
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
		if filters.Email != "" && !contains(user.Email, filters.Email) {
			continue
		}

		filteredUsers = append(filteredUsers, *user)
	}

	// Apply pagination
	start := filters.Offset
	end := start + filters.Limit
	if start > len(filteredUsers) {
		start = len(filteredUsers)
	}
	if end > len(filteredUsers) {
		end = len(filteredUsers)
	}

	paginatedUsers := filteredUsers[start:end]
	hasMore := end < len(filteredUsers)

	return &models.UserSearchResult{
		Users:   paginatedUsers,
		Total:   len(filteredUsers),
		Limit:   filters.Limit,
		Offset:  filters.Offset,
		HasMore: hasMore,
	}, nil
}

func (m *mockRepository) GetMultiple(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error) {
	var users []models.User
	for _, userID := range userIDs {
		if user, exists := m.users[userID]; exists {
			users = append(users, *user)
		}
	}
	return users, nil
}

func (m *mockRepository) UpdateLastActive(ctx context.Context, userID uuid.UUID) error {
	user, exists := m.users[userID]
	if !exists {
		return models.ErrUserNotFound
	}
	user.LastActiveAt = time.Now()
	return nil
}

func (m *mockRepository) GetActiveUserCount(ctx context.Context) (int, error) {
	count := 0
	for _, user := range m.users {
		if user.IsActive {
			count++
		}
	}
	return count, nil
}

func (m *mockRepository) GetUserCountByCountry(ctx context.Context) (map[string]int, error) {
	countMap := make(map[string]int)
	for _, user := range m.users {
		countMap[user.CountryCode]++
	}
	return countMap, nil
}

type mockCache struct{}

func newMockCache() cache.CacheInterface {
	return &mockCache{}
}

func (m *mockCache) Get(ctx context.Context, key string, dest interface{}) error {
	return cache.ErrCacheMiss // Always cache miss for simplicity
}

func (m *mockCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	return nil
}

func (m *mockCache) Delete(ctx context.Context, key string) error {
	return nil
}

func (m *mockCache) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	return true, nil
}

func (m *mockCache) Increment(ctx context.Context, key string) (int64, error) {
	return 1, nil
}

func (m *mockCache) Expire(ctx context.Context, key string, ttl time.Duration) error {
	return nil
}

func (m *mockCache) Close() error {
	return nil
}

// Helper function
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
			func() bool {
				for i := 1; i <= len(s)-len(substr); i++ {
					if s[i:i+len(substr)] == substr {
						return true
					}
				}
				return false
			}())))
}
