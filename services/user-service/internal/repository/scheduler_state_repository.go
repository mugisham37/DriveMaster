package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"user-service/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SchedulerStateRepository interface {
	// Basic CRUD operations
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.UserSchedulerState, error)
	Create(ctx context.Context, state *models.UserSchedulerState) error
	Update(ctx context.Context, userID uuid.UUID, update *models.SchedulerStateUpdate) (*models.UserSchedulerState, error)
	Delete(ctx context.Context, userID uuid.UUID) error

	// Optimistic locking operations
	UpdateWithLock(ctx context.Context, userID uuid.UUID, updateFunc func(*models.UserSchedulerState) error) (*models.UserSchedulerState, error)

	// Backup and recovery operations
	CreateBackup(ctx context.Context, userID uuid.UUID, backupType, reason string) (*models.SchedulerStateBackup, error)
	GetBackups(ctx context.Context, userID uuid.UUID, limit int) ([]models.SchedulerStateBackup, error)
	RestoreFromBackup(ctx context.Context, backupID uuid.UUID) (*models.UserSchedulerState, error)

	// Batch operations
	GetMultiple(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*models.UserSchedulerState, error)
	UpdateMultiple(ctx context.Context, updates map[uuid.UUID]*models.SchedulerStateUpdate) error

	// Maintenance operations
	CleanupOldBackups(ctx context.Context, retentionDays int) (int, error)
	GetStaleStates(ctx context.Context, staleDuration time.Duration) ([]uuid.UUID, error)
}

type schedulerStateRepository struct {
	db *pgxpool.Pool
}

func NewSchedulerStateRepository(db *pgxpool.Pool) SchedulerStateRepository {
	return &schedulerStateRepository{db: db}
}

func (r *schedulerStateRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.UserSchedulerState, error) {
	query := `
		SELECT user_id, ability_vector, ability_confidence, sm2_states, bkt_states, 
		       bandit_state, current_session_id, last_session_end, consecutive_days, 
		       total_study_time_ms, version, last_updated, created_at
		FROM user_scheduler_state 
		WHERE user_id = $1`

	var state models.UserSchedulerState
	var abilityVectorJSON, abilityConfidenceJSON, sm2StatesJSON, bktStatesJSON, banditStateJSON []byte

	err := r.db.QueryRow(ctx, query, userID).Scan(
		&state.UserID, &abilityVectorJSON, &abilityConfidenceJSON, &sm2StatesJSON,
		&bktStatesJSON, &banditStateJSON, &state.CurrentSessionID, &state.LastSessionEnd,
		&state.ConsecutiveDays, &state.TotalStudyTimeMs, &state.Version,
		&state.LastUpdated, &state.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrSchedulerStateNotFound
		}
		return nil, fmt.Errorf("failed to get scheduler state: %w", err)
	}

	// Parse JSON fields
	if err := r.parseJSONFields(&state, abilityVectorJSON, abilityConfidenceJSON, sm2StatesJSON, bktStatesJSON, banditStateJSON); err != nil {
		return nil, fmt.Errorf("failed to parse scheduler state JSON: %w", err)
	}

	return &state, nil
}

func (r *schedulerStateRepository) Create(ctx context.Context, state *models.UserSchedulerState) error {
	// Set defaults if not already set
	if state.CreatedAt.IsZero() {
		state.CreatedAt = time.Now()
	}
	if state.LastUpdated.IsZero() {
		state.LastUpdated = time.Now()
	}
	if state.Version == 0 {
		state.Version = 1
	}

	// Initialize empty maps if nil
	if state.AbilityVector == nil {
		state.AbilityVector = make(map[string]float64)
	}
	if state.AbilityConfidence == nil {
		state.AbilityConfidence = make(map[string]float64)
	}
	if state.SM2States == nil {
		state.SM2States = make(map[string]*models.SM2State)
	}
	if state.BKTStates == nil {
		state.BKTStates = make(map[string]*models.BKTState)
	}
	if state.BanditState == nil {
		state.BanditState = models.NewBanditState()
	}

	// Marshal JSON fields
	abilityVectorJSON, err := json.Marshal(state.AbilityVector)
	if err != nil {
		return fmt.Errorf("failed to marshal ability vector: %w", err)
	}

	abilityConfidenceJSON, err := json.Marshal(state.AbilityConfidence)
	if err != nil {
		return fmt.Errorf("failed to marshal ability confidence: %w", err)
	}

	sm2StatesJSON, err := json.Marshal(state.SM2States)
	if err != nil {
		return fmt.Errorf("failed to marshal SM2 states: %w", err)
	}

	bktStatesJSON, err := json.Marshal(state.BKTStates)
	if err != nil {
		return fmt.Errorf("failed to marshal BKT states: %w", err)
	}

	banditStateJSON, err := json.Marshal(state.BanditState)
	if err != nil {
		return fmt.Errorf("failed to marshal bandit state: %w", err)
	}

	query := `
		INSERT INTO user_scheduler_state (
			user_id, ability_vector, ability_confidence, sm2_states, bkt_states,
			bandit_state, current_session_id, last_session_end, consecutive_days,
			total_study_time_ms, version, last_updated, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)`

	_, err = r.db.Exec(ctx, query,
		state.UserID, abilityVectorJSON, abilityConfidenceJSON, sm2StatesJSON,
		bktStatesJSON, banditStateJSON, state.CurrentSessionID, state.LastSessionEnd,
		state.ConsecutiveDays, state.TotalStudyTimeMs, state.Version,
		state.LastUpdated, state.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create scheduler state: %w", err)
	}

	return nil
}

func (r *schedulerStateRepository) Update(ctx context.Context, userID uuid.UUID, update *models.SchedulerStateUpdate) (*models.UserSchedulerState, error) {
	// Start transaction for optimistic locking
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get current state for version check
	var currentVersion int
	err = tx.QueryRow(ctx, "SELECT version FROM user_scheduler_state WHERE user_id = $1", userID).Scan(&currentVersion)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrSchedulerStateNotFound
		}
		return nil, fmt.Errorf("failed to get current version: %w", err)
	}

	// Check optimistic lock
	if currentVersion != update.Version {
		return nil, models.ErrOptimisticLock
	}

	// Build dynamic update query
	setParts := []string{"last_updated = NOW()", "version = version + 1"}
	args := []interface{}{userID}
	argIndex := 2

	if update.AbilityVector != nil {
		abilityVectorJSON, err := json.Marshal(*update.AbilityVector)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal ability vector: %w", err)
		}
		setParts = append(setParts, fmt.Sprintf("ability_vector = $%d", argIndex))
		args = append(args, abilityVectorJSON)
		argIndex++
	}

	if update.AbilityConfidence != nil {
		abilityConfidenceJSON, err := json.Marshal(*update.AbilityConfidence)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal ability confidence: %w", err)
		}
		setParts = append(setParts, fmt.Sprintf("ability_confidence = $%d", argIndex))
		args = append(args, abilityConfidenceJSON)
		argIndex++
	}

	if update.SM2States != nil {
		sm2StatesJSON, err := json.Marshal(*update.SM2States)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal SM2 states: %w", err)
		}
		setParts = append(setParts, fmt.Sprintf("sm2_states = $%d", argIndex))
		args = append(args, sm2StatesJSON)
		argIndex++
	}

	if update.BKTStates != nil {
		bktStatesJSON, err := json.Marshal(*update.BKTStates)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal BKT states: %w", err)
		}
		setParts = append(setParts, fmt.Sprintf("bkt_states = $%d", argIndex))
		args = append(args, bktStatesJSON)
		argIndex++
	}

	if update.BanditState != nil {
		banditStateJSON, err := json.Marshal(update.BanditState)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal bandit state: %w", err)
		}
		setParts = append(setParts, fmt.Sprintf("bandit_state = $%d", argIndex))
		args = append(args, banditStateJSON)
		argIndex++
	}

	if update.CurrentSessionID != nil {
		setParts = append(setParts, fmt.Sprintf("current_session_id = $%d", argIndex))
		args = append(args, *update.CurrentSessionID)
		argIndex++
	}

	if update.LastSessionEnd != nil {
		setParts = append(setParts, fmt.Sprintf("last_session_end = $%d", argIndex))
		args = append(args, *update.LastSessionEnd)
		argIndex++
	}

	if update.ConsecutiveDays != nil {
		setParts = append(setParts, fmt.Sprintf("consecutive_days = $%d", argIndex))
		args = append(args, *update.ConsecutiveDays)
		argIndex++
	}

	if update.TotalStudyTimeMs != nil {
		setParts = append(setParts, fmt.Sprintf("total_study_time_ms = $%d", argIndex))
		args = append(args, *update.TotalStudyTimeMs)
		argIndex++
	}

	query := fmt.Sprintf(`
		UPDATE user_scheduler_state 
		SET %s
		WHERE user_id = $1
		RETURNING user_id, ability_vector, ability_confidence, sm2_states, bkt_states,
		          bandit_state, current_session_id, last_session_end, consecutive_days,
		          total_study_time_ms, version, last_updated, created_at`,
		fmt.Sprintf("%s", setParts))

	var state models.UserSchedulerState
	var abilityVectorJSON, abilityConfidenceJSON, sm2StatesJSON, bktStatesJSON, banditStateJSON []byte

	err = tx.QueryRow(ctx, query, args...).Scan(
		&state.UserID, &abilityVectorJSON, &abilityConfidenceJSON, &sm2StatesJSON,
		&bktStatesJSON, &banditStateJSON, &state.CurrentSessionID, &state.LastSessionEnd,
		&state.ConsecutiveDays, &state.TotalStudyTimeMs, &state.Version,
		&state.LastUpdated, &state.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrSchedulerStateNotFound
		}
		return nil, fmt.Errorf("failed to update scheduler state: %w", err)
	}

	// Parse JSON fields
	if err := r.parseJSONFields(&state, abilityVectorJSON, abilityConfidenceJSON, sm2StatesJSON, bktStatesJSON, banditStateJSON); err != nil {
		return nil, fmt.Errorf("failed to parse updated scheduler state JSON: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &state, nil
}

func (r *schedulerStateRepository) UpdateWithLock(ctx context.Context, userID uuid.UUID, updateFunc func(*models.UserSchedulerState) error) (*models.UserSchedulerState, error) {
	maxRetries := 3
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		// Get current state
		state, err := r.GetByUserID(ctx, userID)
		if err != nil {
			return nil, err
		}

		// Apply update function
		if err := updateFunc(state); err != nil {
			return nil, err
		}

		// Prepare update
		update := &models.SchedulerStateUpdate{
			AbilityVector:     &state.AbilityVector,
			AbilityConfidence: &state.AbilityConfidence,
			SM2States:         &state.SM2States,
			BKTStates:         &state.BKTStates,
			BanditState:       state.BanditState,
			CurrentSessionID:  state.CurrentSessionID,
			LastSessionEnd:    state.LastSessionEnd,
			ConsecutiveDays:   &state.ConsecutiveDays,
			TotalStudyTimeMs:  &state.TotalStudyTimeMs,
			Version:           state.Version,
		}

		// Try to update
		updatedState, err := r.Update(ctx, userID, update)
		if err != nil {
			if err == models.ErrOptimisticLock {
				lastErr = err
				// Retry with exponential backoff
				time.Sleep(time.Duration(attempt+1) * 100 * time.Millisecond)
				continue
			}
			return nil, err
		}

		return updatedState, nil
	}

	return nil, fmt.Errorf("failed to update after %d retries: %w", maxRetries, lastErr)
}

func (r *schedulerStateRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM user_scheduler_state WHERE user_id = $1`
	result, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete scheduler state: %w", err)
	}

	if result.RowsAffected() == 0 {
		return models.ErrSchedulerStateNotFound
	}

	return nil
}

func (r *schedulerStateRepository) CreateBackup(ctx context.Context, userID uuid.UUID, backupType, reason string) (*models.SchedulerStateBackup, error) {
	// Get current state
	state, err := r.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	backup := &models.SchedulerStateBackup{
		ID:         uuid.New(),
		UserID:     userID,
		StateData:  state,
		BackupType: backupType,
		Reason:     reason,
		CreatedAt:  time.Now(),
	}

	stateDataJSON, err := json.Marshal(backup.StateData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal state data: %w", err)
	}

	query := `
		INSERT INTO scheduler_state_backups (
			id, user_id, state_data, backup_type, reason, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6
		)`

	_, err = r.db.Exec(ctx, query,
		backup.ID, backup.UserID, stateDataJSON, backup.BackupType,
		backup.Reason, backup.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create backup: %w", err)
	}

	return backup, nil
}

func (r *schedulerStateRepository) GetBackups(ctx context.Context, userID uuid.UUID, limit int) ([]models.SchedulerStateBackup, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT id, user_id, state_data, backup_type, reason, created_at
		FROM scheduler_state_backups
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2`

	rows, err := r.db.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get backups: %w", err)
	}
	defer rows.Close()

	var backups []models.SchedulerStateBackup
	for rows.Next() {
		var backup models.SchedulerStateBackup
		var stateDataJSON []byte

		err := rows.Scan(
			&backup.ID, &backup.UserID, &stateDataJSON,
			&backup.BackupType, &backup.Reason, &backup.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan backup: %w", err)
		}

		// Parse state data
		if err := json.Unmarshal(stateDataJSON, &backup.StateData); err != nil {
			return nil, fmt.Errorf("failed to parse backup state data: %w", err)
		}

		backups = append(backups, backup)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating backups: %w", err)
	}

	return backups, nil
}

func (r *schedulerStateRepository) RestoreFromBackup(ctx context.Context, backupID uuid.UUID) (*models.UserSchedulerState, error) {
	// Get backup data
	query := `
		SELECT user_id, state_data
		FROM scheduler_state_backups
		WHERE id = $1`

	var userID uuid.UUID
	var stateDataJSON []byte

	err := r.db.QueryRow(ctx, query, backupID).Scan(&userID, &stateDataJSON)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrBackupFailed
		}
		return nil, fmt.Errorf("failed to get backup: %w", err)
	}

	// Parse backup state
	var backupState models.UserSchedulerState
	if err := json.Unmarshal(stateDataJSON, &backupState); err != nil {
		return nil, fmt.Errorf("failed to parse backup state: %w", err)
	}

	// Update version and timestamp for restoration
	backupState.Version++
	backupState.LastUpdated = time.Now()

	// Create update from backup
	update := &models.SchedulerStateUpdate{
		AbilityVector:     &backupState.AbilityVector,
		AbilityConfidence: &backupState.AbilityConfidence,
		SM2States:         &backupState.SM2States,
		BKTStates:         &backupState.BKTStates,
		BanditState:       backupState.BanditState,
		CurrentSessionID:  backupState.CurrentSessionID,
		LastSessionEnd:    backupState.LastSessionEnd,
		ConsecutiveDays:   &backupState.ConsecutiveDays,
		TotalStudyTimeMs:  &backupState.TotalStudyTimeMs,
		Version:           backupState.Version - 1, // Use original version for optimistic lock
	}

	// Restore state
	restoredState, err := r.Update(ctx, userID, update)
	if err != nil {
		return nil, fmt.Errorf("failed to restore from backup: %w", err)
	}

	return restoredState, nil
}

func (r *schedulerStateRepository) GetMultiple(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*models.UserSchedulerState, error) {
	if len(userIDs) == 0 {
		return make(map[uuid.UUID]*models.UserSchedulerState), nil
	}

	// Build IN clause with placeholders
	placeholders := make([]string, len(userIDs))
	args := make([]interface{}, len(userIDs))
	for i, id := range userIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT user_id, ability_vector, ability_confidence, sm2_states, bkt_states,
		       bandit_state, current_session_id, last_session_end, consecutive_days,
		       total_study_time_ms, version, last_updated, created_at
		FROM user_scheduler_state
		WHERE user_id IN (%s)`,
		fmt.Sprintf("%s", placeholders))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get multiple scheduler states: %w", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]*models.UserSchedulerState)
	for rows.Next() {
		var state models.UserSchedulerState
		var abilityVectorJSON, abilityConfidenceJSON, sm2StatesJSON, bktStatesJSON, banditStateJSON []byte

		err := rows.Scan(
			&state.UserID, &abilityVectorJSON, &abilityConfidenceJSON, &sm2StatesJSON,
			&bktStatesJSON, &banditStateJSON, &state.CurrentSessionID, &state.LastSessionEnd,
			&state.ConsecutiveDays, &state.TotalStudyTimeMs, &state.Version,
			&state.LastUpdated, &state.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan scheduler state: %w", err)
		}

		// Parse JSON fields
		if err := r.parseJSONFields(&state, abilityVectorJSON, abilityConfidenceJSON, sm2StatesJSON, bktStatesJSON, banditStateJSON); err != nil {
			return nil, fmt.Errorf("failed to parse scheduler state JSON: %w", err)
		}

		result[state.UserID] = &state
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating scheduler states: %w", err)
	}

	return result, nil
}

func (r *schedulerStateRepository) UpdateMultiple(ctx context.Context, updates map[uuid.UUID]*models.SchedulerStateUpdate) error {
	if len(updates) == 0 {
		return nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	for userID, update := range updates {
		_, err := r.Update(ctx, userID, update)
		if err != nil {
			return fmt.Errorf("failed to update scheduler state for user %s: %w", userID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit batch update: %w", err)
	}

	return nil
}

func (r *schedulerStateRepository) CleanupOldBackups(ctx context.Context, retentionDays int) (int, error) {
	query := `
		DELETE FROM scheduler_state_backups
		WHERE created_at < NOW() - INTERVAL '%d days'`

	result, err := r.db.Exec(ctx, fmt.Sprintf(query, retentionDays))
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup old backups: %w", err)
	}

	return int(result.RowsAffected()), nil
}

func (r *schedulerStateRepository) GetStaleStates(ctx context.Context, staleDuration time.Duration) ([]uuid.UUID, error) {
	query := `
		SELECT user_id
		FROM user_scheduler_state
		WHERE last_updated < $1`

	staleTime := time.Now().Add(-staleDuration)
	rows, err := r.db.Query(ctx, query, staleTime)
	if err != nil {
		return nil, fmt.Errorf("failed to get stale states: %w", err)
	}
	defer rows.Close()

	var staleUserIDs []uuid.UUID
	for rows.Next() {
		var userID uuid.UUID
		if err := rows.Scan(&userID); err != nil {
			return nil, fmt.Errorf("failed to scan stale user ID: %w", err)
		}
		staleUserIDs = append(staleUserIDs, userID)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating stale states: %w", err)
	}

	return staleUserIDs, nil
}

// Helper function to parse JSON fields
func (r *schedulerStateRepository) parseJSONFields(state *models.UserSchedulerState, abilityVectorJSON, abilityConfidenceJSON, sm2StatesJSON, bktStatesJSON, banditStateJSON []byte) error {
	// Parse ability vector
	if len(abilityVectorJSON) > 0 {
		if err := json.Unmarshal(abilityVectorJSON, &state.AbilityVector); err != nil {
			return fmt.Errorf("failed to parse ability vector: %w", err)
		}
	} else {
		state.AbilityVector = make(map[string]float64)
	}

	// Parse ability confidence
	if len(abilityConfidenceJSON) > 0 {
		if err := json.Unmarshal(abilityConfidenceJSON, &state.AbilityConfidence); err != nil {
			return fmt.Errorf("failed to parse ability confidence: %w", err)
		}
	} else {
		state.AbilityConfidence = make(map[string]float64)
	}

	// Parse SM2 states
	if len(sm2StatesJSON) > 0 {
		if err := json.Unmarshal(sm2StatesJSON, &state.SM2States); err != nil {
			return fmt.Errorf("failed to parse SM2 states: %w", err)
		}
	} else {
		state.SM2States = make(map[string]*models.SM2State)
	}

	// Parse BKT states
	if len(bktStatesJSON) > 0 {
		if err := json.Unmarshal(bktStatesJSON, &state.BKTStates); err != nil {
			return fmt.Errorf("failed to parse BKT states: %w", err)
		}
	} else {
		state.BKTStates = make(map[string]*models.BKTState)
	}

	// Parse bandit state
	if len(banditStateJSON) > 0 {
		if err := json.Unmarshal(banditStateJSON, &state.BanditState); err != nil {
			return fmt.Errorf("failed to parse bandit state: %w", err)
		}
	} else {
		state.BanditState = models.NewBanditState()
	}

	return nil
}
