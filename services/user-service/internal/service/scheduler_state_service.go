package service

import (
	"context"
	"fmt"
	"time"

	"user-service/internal/cache"
	"user-service/internal/config"
	"user-service/internal/events"
	"user-service/internal/logger"
	"user-service/internal/models"
	"user-service/internal/repository"

	"github.com/google/uuid"
)

type SchedulerStateService interface {
	// Basic state management
	GetSchedulerState(ctx context.Context, userID uuid.UUID) (*models.UserSchedulerState, error)
	CreateSchedulerState(ctx context.Context, userID uuid.UUID) (*models.UserSchedulerState, error)
	UpdateSchedulerState(ctx context.Context, userID uuid.UUID, update *models.SchedulerStateUpdate) (*models.UserSchedulerState, error)
	DeleteSchedulerState(ctx context.Context, userID uuid.UUID) error

	// Atomic state updates
	UpdateStateAtomic(ctx context.Context, userID uuid.UUID, updateFunc func(*models.UserSchedulerState) error) (*models.UserSchedulerState, error)

	// Algorithm-specific updates
	UpdateSM2State(ctx context.Context, userID uuid.UUID, itemID string, quality int) (*models.UserSchedulerState, error)
	UpdateBKTState(ctx context.Context, userID uuid.UUID, topic string, correct bool) (*models.UserSchedulerState, error)
	UpdateAbility(ctx context.Context, userID uuid.UUID, topic string, ability, confidence float64) (*models.UserSchedulerState, error)
	UpdateBanditState(ctx context.Context, userID uuid.UUID, strategy string, reward float64) (*models.UserSchedulerState, error)

	// Session management
	StartSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID) (*models.UserSchedulerState, error)
	EndSession(ctx context.Context, userID uuid.UUID, studyTimeMs int64) (*models.UserSchedulerState, error)

	// Backup and recovery
	CreateBackup(ctx context.Context, userID uuid.UUID, reason string) (*models.SchedulerStateBackup, error)
	RestoreFromBackup(ctx context.Context, backupID uuid.UUID) (*models.UserSchedulerState, error)
	GetBackups(ctx context.Context, userID uuid.UUID, limit int) ([]models.SchedulerStateBackup, error)

	// Batch operations
	GetMultipleStates(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*models.UserSchedulerState, error)
	SyncStateToCache(ctx context.Context, userID uuid.UUID) error
	SyncStateFromCache(ctx context.Context, userID uuid.UUID) (*models.UserSchedulerState, error)

	// Maintenance
	CleanupOldBackups(ctx context.Context, retentionDays int) (int, error)
	RefreshStaleStates(ctx context.Context, staleDuration time.Duration) (int, error)
}

type schedulerStateService struct {
	repo      repository.SchedulerStateRepository
	cache     cache.CacheInterface
	config    *config.Config
	publisher events.EventPublisher
}

func NewSchedulerStateService(
	repo repository.SchedulerStateRepository,
	cache cache.CacheInterface,
	cfg *config.Config,
	publisher events.EventPublisher,
) SchedulerStateService {
	return &schedulerStateService{
		repo:      repo,
		cache:     cache,
		config:    cfg,
		publisher: publisher,
	}
}

func (s *schedulerStateService) GetSchedulerState(ctx context.Context, userID uuid.UUID) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	// Try cache first
	cacheKey := cache.SchedulerStateKey(userID.String())
	var state models.UserSchedulerState
	if err := s.cache.Get(ctx, cacheKey, &state); err == nil {
		log.Debug("Scheduler state found in cache")
		return &state, nil
	}

	// Cache miss, get from database
	log.Debug("Scheduler state not in cache, fetching from database")
	statePtr, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		if err == models.ErrSchedulerStateNotFound {
			log.Info("Scheduler state not found, creating new state")
			return s.CreateSchedulerState(ctx, userID)
		}
		log.WithError(err).Error("Failed to get scheduler state from database")
		return nil, err
	}

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, statePtr, s.config.CacheTTL.SchedulerState); err != nil {
		log.WithError(err).Warn("Failed to cache scheduler state")
	}

	log.Info("Scheduler state retrieved successfully")
	return statePtr, nil
}

func (s *schedulerStateService) CreateSchedulerState(ctx context.Context, userID uuid.UUID) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	// Create new state with defaults
	state := models.NewUserSchedulerState(userID)

	// Validate state
	if err := state.Validate(); err != nil {
		log.WithError(err).Error("Scheduler state validation failed")
		return nil, err
	}

	if err := s.repo.Create(ctx, state); err != nil {
		log.WithError(err).Error("Failed to create scheduler state")
		return nil, err
	}

	// Cache the new state
	cacheKey := cache.SchedulerStateKey(userID.String())
	if err := s.cache.Set(ctx, cacheKey, state, s.config.CacheTTL.SchedulerState); err != nil {
		log.WithError(err).Warn("Failed to cache new scheduler state")
	}

	// Publish scheduler state created event
	if err := s.publisher.PublishSchedulerStateCreated(ctx, userID, state); err != nil {
		log.WithError(err).Warn("Failed to publish scheduler state created event")
	}

	log.Info("Scheduler state created successfully")
	return state, nil
}

func (s *schedulerStateService) UpdateSchedulerState(ctx context.Context, userID uuid.UUID, update *models.SchedulerStateUpdate) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	// Validate update
	if update.Version <= 0 {
		log.Error("Invalid version in scheduler state update")
		return nil, fmt.Errorf("version must be positive")
	}

	state, err := s.repo.Update(ctx, userID, update)
	if err != nil {
		log.WithError(err).Error("Failed to update scheduler state")
		return nil, err
	}

	// Update cache
	cacheKey := cache.SchedulerStateKey(userID.String())
	if err := s.cache.Set(ctx, cacheKey, state, s.config.CacheTTL.SchedulerState); err != nil {
		log.WithError(err).Warn("Failed to update scheduler state cache")
	}

	// Publish scheduler state updated event
	if err := s.publisher.PublishSchedulerStateUpdated(ctx, userID, state, update.Version, state.Version); err != nil {
		log.WithError(err).Warn("Failed to publish scheduler state updated event")
	}

	log.Info("Scheduler state updated successfully")
	return state, nil
}

func (s *schedulerStateService) UpdateStateAtomic(ctx context.Context, userID uuid.UUID, updateFunc func(*models.UserSchedulerState) error) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	state, err := s.repo.UpdateWithLock(ctx, userID, updateFunc)
	if err != nil {
		log.WithError(err).Error("Failed to update scheduler state atomically")
		return nil, err
	}

	// Update cache
	cacheKey := cache.SchedulerStateKey(userID.String())
	if err := s.cache.Set(ctx, cacheKey, state, s.config.CacheTTL.SchedulerState); err != nil {
		log.WithError(err).Warn("Failed to update scheduler state cache")
	}

	log.Info("Scheduler state updated atomically")
	return state, nil
}

func (s *schedulerStateService) UpdateSM2State(ctx context.Context, userID uuid.UUID, itemID string, quality int) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String()).WithField("item_id", itemID).WithField("quality", quality)

	return s.UpdateStateAtomic(ctx, userID, func(state *models.UserSchedulerState) error {
		sm2State := state.GetSM2State(itemID)
		sm2State.UpdateSM2(quality)
		log.WithField("next_due", sm2State.NextDue).Debug("Updated SM-2 state")
		return nil
	})
}

func (s *schedulerStateService) UpdateBKTState(ctx context.Context, userID uuid.UUID, topic string, correct bool) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String()).WithField("topic", topic).WithField("correct", correct)

	return s.UpdateStateAtomic(ctx, userID, func(state *models.UserSchedulerState) error {
		bktState := state.GetBKTState(topic)
		bktState.UpdateBKT(correct)
		log.WithField("prob_knowledge", bktState.ProbKnowledge).Debug("Updated BKT state")
		return nil
	})
}

func (s *schedulerStateService) UpdateAbility(ctx context.Context, userID uuid.UUID, topic string, ability, confidence float64) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String()).WithField("topic", topic).WithField("ability", ability).WithField("confidence", confidence)

	// Validate ability and confidence ranges
	if ability < -4.0 || ability > 4.0 {
		return nil, fmt.Errorf("ability must be between -4.0 and 4.0")
	}
	if confidence < 0.0 || confidence > 1.0 {
		return nil, fmt.Errorf("confidence must be between 0.0 and 1.0")
	}

	return s.UpdateStateAtomic(ctx, userID, func(state *models.UserSchedulerState) error {
		state.SetAbility(topic, ability, confidence)
		log.Debug("Updated ability")
		return nil
	})
}

func (s *schedulerStateService) UpdateBanditState(ctx context.Context, userID uuid.UUID, strategy string, reward float64) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String()).WithField("strategy", strategy).WithField("reward", reward)

	return s.UpdateStateAtomic(ctx, userID, func(state *models.UserSchedulerState) error {
		if state.BanditState == nil {
			state.BanditState = models.NewBanditState()
		}
		state.BanditState.UpdateBandit(strategy, reward)
		log.WithField("exploration_rate", state.BanditState.ExplorationRate).Debug("Updated bandit state")
		return nil
	})
}

func (s *schedulerStateService) StartSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String()).WithField("session_id", sessionID.String())

	return s.UpdateStateAtomic(ctx, userID, func(state *models.UserSchedulerState) error {
		state.CurrentSessionID = &sessionID

		// Update consecutive days if this is a new day
		now := time.Now()
		if state.LastSessionEnd != nil {
			lastDay := state.LastSessionEnd.Truncate(24 * time.Hour)
			currentDay := now.Truncate(24 * time.Hour)
			daysDiff := int(currentDay.Sub(lastDay).Hours() / 24)

			if daysDiff == 1 {
				// Consecutive day
				state.ConsecutiveDays++
			} else if daysDiff > 1 {
				// Streak broken
				state.ConsecutiveDays = 1
			}
			// If daysDiff == 0, same day, no change to consecutive days
		} else {
			// First session
			state.ConsecutiveDays = 1
		}

		log.WithField("consecutive_days", state.ConsecutiveDays).Debug("Started session")
		return nil
	})
}

func (s *schedulerStateService) EndSession(ctx context.Context, userID uuid.UUID, studyTimeMs int64) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String()).WithField("study_time_ms", studyTimeMs)

	if studyTimeMs < 0 {
		return nil, fmt.Errorf("study time cannot be negative")
	}

	return s.UpdateStateAtomic(ctx, userID, func(state *models.UserSchedulerState) error {
		now := time.Now()
		state.LastSessionEnd = &now
		state.TotalStudyTimeMs += studyTimeMs
		state.CurrentSessionID = nil

		log.WithField("total_study_time_ms", state.TotalStudyTimeMs).Debug("Ended session")
		return nil
	})
}

func (s *schedulerStateService) CreateBackup(ctx context.Context, userID uuid.UUID, reason string) (*models.SchedulerStateBackup, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String()).WithField("reason", reason)

	backup, err := s.repo.CreateBackup(ctx, userID, "manual", reason)
	if err != nil {
		log.WithError(err).Error("Failed to create scheduler state backup")
		return nil, err
	}

	log.WithField("backup_id", backup.ID.String()).Info("Scheduler state backup created")
	return backup, nil
}

func (s *schedulerStateService) RestoreFromBackup(ctx context.Context, backupID uuid.UUID) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("backup_id", backupID.String())

	state, err := s.repo.RestoreFromBackup(ctx, backupID)
	if err != nil {
		log.WithError(err).Error("Failed to restore scheduler state from backup")
		return nil, err
	}

	// Update cache with restored state
	cacheKey := cache.SchedulerStateKey(state.UserID.String())
	if err := s.cache.Set(ctx, cacheKey, state, s.config.CacheTTL.SchedulerState); err != nil {
		log.WithError(err).Warn("Failed to cache restored scheduler state")
	}

	// Publish scheduler state restored event
	if err := s.publisher.PublishSchedulerStateRestored(ctx, state.UserID, backupID, state); err != nil {
		log.WithError(err).Warn("Failed to publish scheduler state restored event")
	}

	log.WithField("user_id", state.UserID.String()).Info("Scheduler state restored from backup")
	return state, nil
}

func (s *schedulerStateService) GetBackups(ctx context.Context, userID uuid.UUID, limit int) ([]models.SchedulerStateBackup, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String()).WithField("limit", limit)

	backups, err := s.repo.GetBackups(ctx, userID, limit)
	if err != nil {
		log.WithError(err).Error("Failed to get scheduler state backups")
		return nil, err
	}

	log.WithField("backup_count", len(backups)).Info("Retrieved scheduler state backups")
	return backups, nil
}

func (s *schedulerStateService) GetMultipleStates(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_count", len(userIDs))

	if len(userIDs) == 0 {
		return make(map[uuid.UUID]*models.UserSchedulerState), nil
	}

	// Try to get states from cache first
	var cachedStates = make(map[uuid.UUID]*models.UserSchedulerState)
	var missingIDs []uuid.UUID

	for _, userID := range userIDs {
		cacheKey := cache.SchedulerStateKey(userID.String())
		var state models.UserSchedulerState
		if err := s.cache.Get(ctx, cacheKey, &state); err == nil {
			cachedStates[userID] = &state
		} else {
			missingIDs = append(missingIDs, userID)
		}
	}

	log.WithField("cached_count", len(cachedStates)).WithField("missing_count", len(missingIDs)).Debug("Cache lookup results")

	// Get missing states from database
	var dbStates map[uuid.UUID]*models.UserSchedulerState
	if len(missingIDs) > 0 {
		var err error
		dbStates, err = s.repo.GetMultiple(ctx, missingIDs)
		if err != nil {
			log.WithError(err).Error("Failed to get scheduler states from database")
			return nil, err
		}

		// Cache the database results
		for userID, state := range dbStates {
			cacheKey := cache.SchedulerStateKey(userID.String())
			if err := s.cache.Set(ctx, cacheKey, state, s.config.CacheTTL.SchedulerState); err != nil {
				log.WithError(err).WithField("user_id", userID.String()).Warn("Failed to cache scheduler state")
			}
		}
	} else {
		dbStates = make(map[uuid.UUID]*models.UserSchedulerState)
	}

	// Combine results
	result := make(map[uuid.UUID]*models.UserSchedulerState)
	for userID, state := range cachedStates {
		result[userID] = state
	}
	for userID, state := range dbStates {
		result[userID] = state
	}

	log.WithField("total_returned", len(result)).Info("Multiple scheduler states retrieved successfully")
	return result, nil
}

func (s *schedulerStateService) SyncStateToCache(ctx context.Context, userID uuid.UUID) error {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	// Get fresh state from database
	state, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		log.WithError(err).Error("Failed to get scheduler state for cache sync")
		return err
	}

	// Update cache
	cacheKey := cache.SchedulerStateKey(userID.String())
	if err := s.cache.Set(ctx, cacheKey, state, s.config.CacheTTL.SchedulerState); err != nil {
		log.WithError(err).Error("Failed to sync scheduler state to cache")
		return err
	}

	log.Debug("Scheduler state synced to cache")
	return nil
}

func (s *schedulerStateService) SyncStateFromCache(ctx context.Context, userID uuid.UUID) (*models.UserSchedulerState, error) {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	// Get state from cache
	cacheKey := cache.SchedulerStateKey(userID.String())
	var state models.UserSchedulerState
	if err := s.cache.Get(ctx, cacheKey, &state); err != nil {
		log.WithError(err).Debug("Scheduler state not found in cache")
		return nil, err
	}

	log.Debug("Scheduler state retrieved from cache")
	return &state, nil
}

func (s *schedulerStateService) DeleteSchedulerState(ctx context.Context, userID uuid.UUID) error {
	log := logger.WithContext(ctx).WithField("user_id", userID.String())

	// Create backup before deletion
	if _, err := s.repo.CreateBackup(ctx, userID, "automatic", "Pre-deletion backup"); err != nil {
		log.WithError(err).Warn("Failed to create backup before deletion")
	}

	if err := s.repo.Delete(ctx, userID); err != nil {
		log.WithError(err).Error("Failed to delete scheduler state")
		return err
	}

	// Remove from cache
	cacheKey := cache.SchedulerStateKey(userID.String())
	if err := s.cache.Delete(ctx, cacheKey); err != nil {
		log.WithError(err).Warn("Failed to remove scheduler state from cache")
	}

	// Publish scheduler state deleted event
	if err := s.publisher.PublishSchedulerStateDeleted(ctx, userID); err != nil {
		log.WithError(err).Warn("Failed to publish scheduler state deleted event")
	}

	log.Info("Scheduler state deleted successfully")
	return nil
}

func (s *schedulerStateService) CleanupOldBackups(ctx context.Context, retentionDays int) (int, error) {
	log := logger.WithContext(ctx).WithField("retention_days", retentionDays)

	if retentionDays <= 0 {
		return 0, fmt.Errorf("retention days must be positive")
	}

	deletedCount, err := s.repo.CleanupOldBackups(ctx, retentionDays)
	if err != nil {
		log.WithError(err).Error("Failed to cleanup old scheduler state backups")
		return 0, err
	}

	log.WithField("deleted_count", deletedCount).Info("Cleaned up old scheduler state backups")
	return deletedCount, nil
}

func (s *schedulerStateService) RefreshStaleStates(ctx context.Context, staleDuration time.Duration) (int, error) {
	log := logger.WithContext(ctx).WithField("stale_duration", staleDuration)

	staleUserIDs, err := s.repo.GetStaleStates(ctx, staleDuration)
	if err != nil {
		log.WithError(err).Error("Failed to get stale scheduler states")
		return 0, err
	}

	refreshedCount := 0
	for _, userID := range staleUserIDs {
		if err := s.SyncStateToCache(ctx, userID); err != nil {
			log.WithError(err).WithField("user_id", userID.String()).Warn("Failed to refresh stale state")
		} else {
			refreshedCount++
		}
	}

	log.WithField("stale_count", len(staleUserIDs)).WithField("refreshed_count", refreshedCount).Info("Refreshed stale scheduler states")
	return refreshedCount, nil
}
