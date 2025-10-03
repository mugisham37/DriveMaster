package service

import (
	"context"
	"fmt"
	"time"

	"user-service/internal/cache"
	"user-service/internal/config"
	"user-service/internal/events"
	"user-service/internal/logger"
	"user-service/internal/metrics"
	"user-service/internal/models"
	"user-service/internal/repository"

	"github.com/google/uuid"
)

type UserService interface {
	// User management
	GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	CreateUser(ctx context.Context, user *models.User) error
	UpdateUser(ctx context.Context, userID uuid.UUID, update *models.UserUpdate) (*models.User, error)
	DeactivateUser(ctx context.Context, userID uuid.UUID, reason string) error
	ActivateUser(ctx context.Context, userID uuid.UUID) error

	// Preferences management
	GetUserPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error)
	UpdatePreferences(ctx context.Context, userID uuid.UUID, preferences map[string]interface{}) (*models.UserPreferences, error)

	// Search and filtering
	SearchUsers(ctx context.Context, filters *models.UserSearchFilters) (*models.UserSearchResult, error)
	GetMultipleUsers(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error)

	// Activity tracking
	UpdateLastActive(ctx context.Context, userID uuid.UUID) error

	// Statistics
	GetActiveUserCount(ctx context.Context) (int, error)
	GetUserCountByCountry(ctx context.Context) (map[string]int, error)
}

type userService struct {
	repo      repository.UserRepository
	cache     cache.CacheInterface
	config    *config.Config
	publisher events.EventPublisher
}

func NewUserService(repo repository.UserRepository, cache cache.CacheInterface, cfg *config.Config, publisher events.EventPublisher) UserService {
	return &userService{
		repo:      repo,
		cache:     cache,
		config:    cfg,
		publisher: publisher,
	}
}

func (s *userService) GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	// Try cache first
	cacheKey := cache.UserKey(userID.String())
	var user models.User
	if err := s.cache.Get(ctx, cacheKey, &user); err == nil {
		log.Debug("User found in cache")
		return &user, nil
	}

	// Cache miss, get from database
	log.Debug("User not in cache, fetching from database")
	userPtr, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		log.WithError(err).Error("Failed to get user from database")
		return nil, err
	}

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, userPtr, s.config.CacheTTL.User); err != nil {
		log.WithError(err).Warn("Failed to cache user")
	}

	log.Info("User retrieved successfully")
	return userPtr, nil
}

func (s *userService) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	log := logger.WithContext(ctx).WithField("email", email)

	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		log.WithError(err).Error("Failed to get user by email")
		return nil, err
	}

	// Cache the result
	cacheKey := cache.UserKey(user.ID.String())
	if err := s.cache.Set(ctx, cacheKey, user, s.config.CacheTTL.User); err != nil {
		log.WithError(err).Warn("Failed to cache user")
	}

	log.Info("User retrieved by email successfully")
	return user, nil
}

func (s *userService) CreateUser(ctx context.Context, user *models.User) error {
	log := logger.WithContext(ctx).WithField("email", user.Email)

	// Validate user data
	if err := user.Validate(); err != nil {
		log.WithError(err).Error("User validation failed")
		return err
	}

	if err := s.repo.Create(ctx, user); err != nil {
		log.WithError(err).Error("Failed to create user")
		return err
	}

	// Get the user from repository to ensure we have the correct state
	createdUser, err := s.repo.GetByID(ctx, user.ID)
	if err != nil {
		log.WithError(err).Warn("Failed to get created user for caching")
	} else {
		// Cache the fresh user data
		cacheKey := cache.UserKey(user.ID.String())
		if err := s.cache.Set(ctx, cacheKey, createdUser, s.config.CacheTTL.User); err != nil {
			log.WithError(err).Warn("Failed to cache new user")
		}
	}

	// Publish user created event
	if err := s.publisher.PublishUserCreated(ctx, user); err != nil {
		log.WithError(err).Warn("Failed to publish user created event")
		// Don't fail the operation if event publishing fails
	}

	log.WithField("user_id", user.ID.String()).Info("User created successfully")
	return nil
}

func (s *userService) UpdateUser(ctx context.Context, userID uuid.UUID, update *models.UserUpdate) (*models.User, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	// Basic validation for update data
	if update.Timezone != nil && *update.Timezone == "" {
		log.Error("Invalid timezone in update")
		return nil, fmt.Errorf("timezone cannot be empty")
	}
	if update.Language != nil && *update.Language == "" {
		log.Error("Invalid language in update")
		return nil, fmt.Errorf("language cannot be empty")
	}

	user, err := s.repo.Update(ctx, userID, update)
	if err != nil {
		log.WithError(err).Error("Failed to update user")
		return nil, err
	}

	// Update cache
	cacheKey := cache.UserKey(userID.String())
	if err := s.cache.Set(ctx, cacheKey, user, s.config.CacheTTL.User); err != nil {
		log.WithError(err).Warn("Failed to update user cache")
	}

	// Also update preferences cache if preferences were updated
	if update.Preferences != nil {
		prefCacheKey := cache.UserPreferencesKey(userID.String())
		prefs := &models.UserPreferences{
			UserID:      userID,
			Preferences: *update.Preferences,
			UpdatedAt:   user.UpdatedAt,
		}
		if err := s.cache.Set(ctx, prefCacheKey, prefs, s.config.CacheTTL.User); err != nil {
			log.WithError(err).Warn("Failed to update preferences cache")
		}
	}

	// Publish user updated event
	changes := make(map[string]interface{})
	if update.Timezone != nil {
		changes["timezone"] = *update.Timezone
	}
	if update.Language != nil {
		changes["language"] = *update.Language
	}
	if update.Preferences != nil {
		changes["preferences"] = *update.Preferences
	}
	if update.GDPRConsent != nil {
		changes["gdpr_consent"] = *update.GDPRConsent
	}

	if len(changes) > 0 {
		if err := s.publisher.PublishUserUpdated(ctx, userID, changes, update.Version, user.Version); err != nil {
			log.WithError(err).Warn("Failed to publish user updated event")
		}
	}

	log.Info("User updated successfully")
	return user, nil
}

func (s *userService) DeactivateUser(ctx context.Context, userID uuid.UUID, reason string) error {
	log := logger.WithContext(ctx).WithField("user_id", userID.String()).WithField("reason", reason)

	if err := s.repo.Deactivate(ctx, userID, reason); err != nil {
		log.WithError(err).Error("Failed to deactivate user")
		return err
	}

	// Remove from cache
	cacheKey := cache.UserKey(userID.String())
	if err := s.cache.Delete(ctx, cacheKey); err != nil {
		log.WithError(err).Warn("Failed to remove user from cache")
	}

	// Remove preferences from cache
	prefCacheKey := cache.UserPreferencesKey(userID.String())
	if err := s.cache.Delete(ctx, prefCacheKey); err != nil {
		log.WithError(err).Warn("Failed to remove preferences from cache")
	}

	// Publish user deactivated event
	if err := s.publisher.PublishUserDeactivated(ctx, userID, reason); err != nil {
		log.WithError(err).Warn("Failed to publish user deactivated event")
	}

	log.Info("User deactivated successfully")
	return nil
}

func (s *userService) ActivateUser(ctx context.Context, userID uuid.UUID) error {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	if err := s.repo.Activate(ctx, userID); err != nil {
		log.WithError(err).Error("Failed to activate user")
		return err
	}

	// Remove from cache to force refresh
	cacheKey := cache.UserKey(userID.String())
	if err := s.cache.Delete(ctx, cacheKey); err != nil {
		log.WithError(err).Warn("Failed to remove user from cache")
	}

	// Publish user activated event
	if err := s.publisher.PublishUserActivated(ctx, userID); err != nil {
		log.WithError(err).Warn("Failed to publish user activated event")
	}

	log.Info("User activated successfully")
	return nil
}

func (s *userService) GetUserPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	// Try cache first
	cacheKey := cache.UserPreferencesKey(userID.String())
	var prefs models.UserPreferences
	if err := s.cache.Get(ctx, cacheKey, &prefs); err == nil {
		log.Debug("Preferences found in cache")
		return &prefs, nil
	}

	// Cache miss, get from database
	log.Debug("Preferences not in cache, fetching from database")
	prefsPtr, err := s.repo.GetPreferences(ctx, userID)
	if err != nil {
		log.WithError(err).Error("Failed to get preferences from database")
		return nil, err
	}

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, prefsPtr, s.config.CacheTTL.User); err != nil {
		log.WithError(err).Warn("Failed to cache preferences")
	}

	log.Info("Preferences retrieved successfully")
	return prefsPtr, nil
}

func (s *userService) UpdatePreferences(ctx context.Context, userID uuid.UUID, preferences map[string]interface{}) (*models.UserPreferences, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	// Basic validation for preferences
	if len(preferences) > 100 {
		log.Error("Too many preferences")
		return nil, fmt.Errorf("too many preferences (max 100)")
	}

	// Get old preferences for event publishing
	oldPrefs, err := s.repo.GetPreferences(ctx, userID)
	if err != nil {
		log.WithError(err).Warn("Failed to get old preferences for event")
		oldPrefs = &models.UserPreferences{Preferences: make(map[string]interface{})}
	}

	prefs, err := s.repo.UpdatePreferences(ctx, userID, preferences)
	if err != nil {
		log.WithError(err).Error("Failed to update preferences")
		return nil, err
	}

	// Update cache
	cacheKey := cache.UserPreferencesKey(userID.String())
	if err := s.cache.Set(ctx, cacheKey, prefs, s.config.CacheTTL.User); err != nil {
		log.WithError(err).Warn("Failed to update preferences cache")
	}

	// Also update user cache to reflect the preference change
	userCacheKey := cache.UserKey(userID.String())
	if err := s.cache.Delete(ctx, userCacheKey); err != nil {
		log.WithError(err).Warn("Failed to invalidate user cache")
	}

	// Publish preferences updated event
	if err := s.publisher.PublishUserPreferencesUpdated(ctx, userID, oldPrefs.Preferences, preferences); err != nil {
		log.WithError(err).Warn("Failed to publish preferences updated event")
	}

	log.Info("Preferences updated successfully")
	return prefs, nil
}

func (s *userService) SearchUsers(ctx context.Context, filters *models.UserSearchFilters) (*models.UserSearchResult, error) {
	log := logger.WithContext(ctx).WithField("filters", fmt.Sprintf("%+v", filters))

	// Basic validation for search filters
	if filters.Limit < 0 {
		log.Error("Invalid limit in search filters")
		return nil, fmt.Errorf("limit cannot be negative")
	}
	if filters.Limit > 1000 {
		filters.Limit = 1000
	}
	if filters.Offset < 0 {
		log.Error("Invalid offset in search filters")
		return nil, fmt.Errorf("offset cannot be negative")
	}

	result, err := s.repo.Search(ctx, filters)
	if err != nil {
		log.WithError(err).Error("Failed to search users")
		return nil, err
	}

	log.WithField("total_found", result.Total).Info("User search completed")
	return result, nil
}

func (s *userService) GetMultipleUsers(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error) {
	log := logger.WithContext(ctx).WithField("user_count", len(userIDs))

	if len(userIDs) == 0 {
		return []models.User{}, nil
	}

	// Try to get users from cache first
	var cachedUsers []models.User
	var missingIDs []uuid.UUID

	for _, userID := range userIDs {
		cacheKey := cache.UserKey(userID.String())
		var user models.User
		if err := s.cache.Get(ctx, cacheKey, &user); err == nil {
			cachedUsers = append(cachedUsers, user)
		} else {
			missingIDs = append(missingIDs, userID)
		}
	}

	log.WithField("cached_count", len(cachedUsers)).WithField("missing_count", len(missingIDs)).Debug("Cache lookup results")

	// Get missing users from database
	var dbUsers []models.User
	if len(missingIDs) > 0 {
		var err error
		dbUsers, err = s.repo.GetMultiple(ctx, missingIDs)
		if err != nil {
			log.WithError(err).Error("Failed to get users from database")
			return nil, err
		}

		// Cache the database results
		for _, user := range dbUsers {
			cacheKey := cache.UserKey(user.ID.String())
			if err := s.cache.Set(ctx, cacheKey, &user, s.config.CacheTTL.User); err != nil {
				log.WithError(err).WithField("user_id", user.ID.String()).Warn("Failed to cache user")
			}
		}
	}

	// Combine results
	allUsers := append(cachedUsers, dbUsers...)

	log.WithField("total_returned", len(allUsers)).Info("Multiple users retrieved successfully")
	return allUsers, nil
}

func (s *userService) UpdateLastActive(ctx context.Context, userID uuid.UUID) error {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	if err := s.repo.UpdateLastActive(ctx, userID); err != nil {
		log.WithError(err).Error("Failed to update last active")
		return err
	}

	// Invalidate user cache to reflect the update
	cacheKey := cache.UserKey(userID.String())
	if err := s.cache.Delete(ctx, cacheKey); err != nil {
		log.WithError(err).Warn("Failed to invalidate user cache")
	}

	// Publish last active updated event
	if err := s.publisher.PublishUserLastActiveUpdated(ctx, userID, time.Now()); err != nil {
		log.WithError(err).Warn("Failed to publish last active updated event")
	}

	log.Debug("Last active updated successfully")
	return nil
}

func (s *userService) GetActiveUserCount(ctx context.Context) (int, error) {
	log := logger.WithContext(ctx)

	// Try cache first
	cacheKey := "stats:active_users"
	var count int
	if err := s.cache.Get(ctx, cacheKey, &count); err == nil {
		log.Debug("Active user count found in cache")
		return count, nil
	}

	// Cache miss, get from database
	count, err := s.repo.GetActiveUserCount(ctx)
	if err != nil {
		log.WithError(err).Error("Failed to get active user count")
		return 0, err
	}

	// Cache the result for 5 minutes
	if err := s.cache.Set(ctx, cacheKey, count, 5*time.Minute); err != nil {
		log.WithError(err).Warn("Failed to cache active user count")
	}

	// Update metrics
	metrics.SetActiveUsers(count)

	log.WithField("count", count).Info("Active user count retrieved")
	return count, nil
}

func (s *userService) GetUserCountByCountry(ctx context.Context) (map[string]int, error) {
	log := logger.WithContext(ctx)

	// Try cache first
	cacheKey := "stats:users_by_country"
	var countMap map[string]int
	if err := s.cache.Get(ctx, cacheKey, &countMap); err == nil {
		log.Debug("User count by country found in cache")
		return countMap, nil
	}

	// Cache miss, get from database
	countMap, err := s.repo.GetUserCountByCountry(ctx)
	if err != nil {
		log.WithError(err).Error("Failed to get user count by country")
		return nil, err
	}

	// Cache the result for 1 hour
	if err := s.cache.Set(ctx, cacheKey, countMap, time.Hour); err != nil {
		log.WithError(err).Warn("Failed to cache user count by country")
	}

	log.WithField("countries", len(countMap)).Info("User count by country retrieved")
	return countMap, nil
}
