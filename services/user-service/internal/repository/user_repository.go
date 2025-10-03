package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"user-service/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository interface {
	// Basic CRUD operations
	GetByID(ctx context.Context, userID uuid.UUID) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
	Update(ctx context.Context, userID uuid.UUID, update *models.UserUpdate) (*models.User, error)
	Delete(ctx context.Context, userID uuid.UUID) error

	// Soft deletion and activation
	Deactivate(ctx context.Context, userID uuid.UUID, reason string) error
	Activate(ctx context.Context, userID uuid.UUID) error

	// Preferences management
	GetPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error)
	UpdatePreferences(ctx context.Context, userID uuid.UUID, preferences map[string]interface{}) (*models.UserPreferences, error)

	// Search and filtering
	Search(ctx context.Context, filters *models.UserSearchFilters) (*models.UserSearchResult, error)

	// Batch operations
	GetMultiple(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error)

	// Activity tracking
	UpdateLastActive(ctx context.Context, userID uuid.UUID) error

	// Statistics
	GetActiveUserCount(ctx context.Context) (int, error)
	GetUserCountByCountry(ctx context.Context) (map[string]int, error)
}

type userRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, email, email_verified, country_code, timezone, language, 
		       preferences, user_role, mfa_enabled, gdpr_consent, 
		       created_at, updated_at, last_active_at, is_active, version
		FROM users 
		WHERE id = $1 AND is_active = true`

	var user models.User
	var preferencesJSON []byte

	err := r.db.QueryRow(ctx, query, userID).Scan(
		&user.ID, &user.Email, &user.EmailVerified, &user.CountryCode,
		&user.Timezone, &user.Language, &preferencesJSON, &user.UserRole,
		&user.MFAEnabled, &user.GDPRConsent, &user.CreatedAt, &user.UpdatedAt,
		&user.LastActiveAt, &user.IsActive, &user.Version,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	// Parse preferences JSON
	if len(preferencesJSON) > 0 {
		if err := json.Unmarshal(preferencesJSON, &user.Preferences); err != nil {
			return nil, fmt.Errorf("failed to parse preferences: %w", err)
		}
	} else {
		user.Preferences = make(map[string]interface{})
	}

	return &user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, email_verified, country_code, timezone, language, 
		       preferences, user_role, mfa_enabled, gdpr_consent, 
		       created_at, updated_at, last_active_at, is_active, version
		FROM users 
		WHERE email = $1 AND is_active = true`

	var user models.User
	var preferencesJSON []byte

	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.EmailVerified, &user.CountryCode,
		&user.Timezone, &user.Language, &preferencesJSON, &user.UserRole,
		&user.MFAEnabled, &user.GDPRConsent, &user.CreatedAt, &user.UpdatedAt,
		&user.LastActiveAt, &user.IsActive, &user.Version,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	// Parse preferences JSON
	if len(preferencesJSON) > 0 {
		if err := json.Unmarshal(preferencesJSON, &user.Preferences); err != nil {
			return nil, fmt.Errorf("failed to parse preferences: %w", err)
		}
	} else {
		user.Preferences = make(map[string]interface{})
	}

	return &user, nil
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	// Set defaults if not already set
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now()
	}
	if user.UpdatedAt.IsZero() {
		user.UpdatedAt = time.Now()
	}
	if user.LastActiveAt.IsZero() {
		user.LastActiveAt = time.Now()
	}
	if user.Version == 0 {
		user.Version = 1
	}
	user.IsActive = true

	if user.Preferences == nil {
		user.Preferences = make(map[string]interface{})
	}

	preferencesJSON, err := json.Marshal(user.Preferences)
	if err != nil {
		return fmt.Errorf("failed to marshal preferences: %w", err)
	}

	query := `
		INSERT INTO users (
			id, email, email_verified, country_code, timezone, language,
			preferences, user_role, mfa_enabled, gdpr_consent,
			created_at, updated_at, last_active_at, is_active, version
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
		)`

	_, err = r.db.Exec(ctx, query,
		user.ID, user.Email, user.EmailVerified, user.CountryCode,
		user.Timezone, user.Language, preferencesJSON, user.UserRole,
		user.MFAEnabled, user.GDPRConsent, user.CreatedAt, user.UpdatedAt,
		user.LastActiveAt, user.IsActive, user.Version,
	)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return models.ErrUserAlreadyExists
		}
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

func (r *userRepository) Update(ctx context.Context, userID uuid.UUID, update *models.UserUpdate) (*models.User, error) {
	// Start transaction for optimistic locking
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get current user for version check
	var currentVersion int
	err = tx.QueryRow(ctx, "SELECT version FROM users WHERE id = $1 AND is_active = true", userID).Scan(&currentVersion)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get current version: %w", err)
	}

	// Check optimistic lock
	if currentVersion != update.Version {
		return nil, models.ErrOptimisticLock
	}

	// Build dynamic update query
	setParts := []string{"updated_at = NOW()", "version = version + 1"}
	args := []interface{}{userID}
	argIndex := 2

	if update.Timezone != nil {
		setParts = append(setParts, fmt.Sprintf("timezone = $%d", argIndex))
		args = append(args, *update.Timezone)
		argIndex++
	}

	if update.Language != nil {
		setParts = append(setParts, fmt.Sprintf("language = $%d", argIndex))
		args = append(args, *update.Language)
		argIndex++
	}

	if update.Preferences != nil {
		preferencesJSON, err := json.Marshal(*update.Preferences)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal preferences: %w", err)
		}
		setParts = append(setParts, fmt.Sprintf("preferences = $%d", argIndex))
		args = append(args, preferencesJSON)
		argIndex++
	}

	if update.GDPRConsent != nil {
		setParts = append(setParts, fmt.Sprintf("gdpr_consent = $%d", argIndex))
		args = append(args, *update.GDPRConsent)
		argIndex++
	}

	query := fmt.Sprintf(`
		UPDATE users 
		SET %s
		WHERE id = $1 AND is_active = true
		RETURNING id, email, email_verified, country_code, timezone, language, 
		          preferences, user_role, mfa_enabled, gdpr_consent, 
		          created_at, updated_at, last_active_at, is_active, version`,
		strings.Join(setParts, ", "))

	var user models.User
	var preferencesJSON []byte

	err = tx.QueryRow(ctx, query, args...).Scan(
		&user.ID, &user.Email, &user.EmailVerified, &user.CountryCode,
		&user.Timezone, &user.Language, &preferencesJSON, &user.UserRole,
		&user.MFAEnabled, &user.GDPRConsent, &user.CreatedAt, &user.UpdatedAt,
		&user.LastActiveAt, &user.IsActive, &user.Version,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Parse preferences JSON
	if len(preferencesJSON) > 0 {
		if err := json.Unmarshal(preferencesJSON, &user.Preferences); err != nil {
			return nil, fmt.Errorf("failed to parse preferences: %w", err)
		}
	} else {
		user.Preferences = make(map[string]interface{})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &user, nil
}

func (r *userRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	result, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return models.ErrUserNotFound
	}

	return nil
}

func (r *userRepository) Deactivate(ctx context.Context, userID uuid.UUID, reason string) error {
	query := `
		UPDATE users 
		SET is_active = false, updated_at = NOW()
		WHERE id = $1 AND is_active = true`

	result, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to deactivate user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return models.ErrUserNotFound
	}

	// Log deactivation reason (could be stored in audit table)
	// For now, we'll just log it
	return nil
}

func (r *userRepository) Activate(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE users 
		SET is_active = true, updated_at = NOW()
		WHERE id = $1 AND is_active = false`

	result, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to activate user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return models.ErrUserNotFound
	}

	return nil
}

func (r *userRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error) {
	query := `
		SELECT preferences, updated_at
		FROM users 
		WHERE id = $1 AND is_active = true`

	var preferencesJSON []byte
	var updatedAt time.Time

	err := r.db.QueryRow(ctx, query, userID).Scan(&preferencesJSON, &updatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user preferences: %w", err)
	}

	preferences := &models.UserPreferences{
		UserID:    userID,
		UpdatedAt: updatedAt,
	}

	if len(preferencesJSON) > 0 {
		if err := json.Unmarshal(preferencesJSON, &preferences.Preferences); err != nil {
			return nil, fmt.Errorf("failed to parse preferences: %w", err)
		}
	} else {
		preferences.Preferences = make(map[string]interface{})
	}

	return preferences, nil
}

func (r *userRepository) UpdatePreferences(ctx context.Context, userID uuid.UUID, preferences map[string]interface{}) (*models.UserPreferences, error) {
	preferencesJSON, err := json.Marshal(preferences)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal preferences: %w", err)
	}

	query := `
		UPDATE users 
		SET preferences = $2, updated_at = NOW()
		WHERE id = $1 AND is_active = true
		RETURNING updated_at`

	var updatedAt time.Time
	err = r.db.QueryRow(ctx, query, userID, preferencesJSON).Scan(&updatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to update preferences: %w", err)
	}

	return &models.UserPreferences{
		UserID:      userID,
		Preferences: preferences,
		UpdatedAt:   updatedAt,
	}, nil
}

func (r *userRepository) Search(ctx context.Context, filters *models.UserSearchFilters) (*models.UserSearchResult, error) {
	// Build WHERE clause dynamically
	whereParts := []string{"is_active = true"}
	args := []interface{}{}
	argIndex := 1

	if filters.Email != "" {
		whereParts = append(whereParts, fmt.Sprintf("email ILIKE $%d", argIndex))
		args = append(args, "%"+filters.Email+"%")
		argIndex++
	}

	if filters.CountryCode != "" {
		whereParts = append(whereParts, fmt.Sprintf("country_code = $%d", argIndex))
		args = append(args, filters.CountryCode)
		argIndex++
	}

	if filters.UserRole != "" {
		whereParts = append(whereParts, fmt.Sprintf("user_role = $%d", argIndex))
		args = append(args, filters.UserRole)
		argIndex++
	}

	if filters.IsActive != nil {
		whereParts = append(whereParts, fmt.Sprintf("is_active = $%d", argIndex))
		args = append(args, *filters.IsActive)
		argIndex++
	}

	if !filters.CreatedFrom.IsZero() {
		whereParts = append(whereParts, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, filters.CreatedFrom)
		argIndex++
	}

	if !filters.CreatedTo.IsZero() {
		whereParts = append(whereParts, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, filters.CreatedTo)
		argIndex++
	}

	whereClause := strings.Join(whereParts, " AND ")

	// Count total results
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users WHERE %s", whereClause)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count users: %w", err)
	}

	// Set defaults for pagination
	if filters.Limit <= 0 {
		filters.Limit = 50
	}
	if filters.Limit > 1000 {
		filters.Limit = 1000
	}

	// Get paginated results
	query := fmt.Sprintf(`
		SELECT id, email, email_verified, country_code, timezone, language, 
		       preferences, user_role, mfa_enabled, gdpr_consent, 
		       created_at, updated_at, last_active_at, is_active, version
		FROM users 
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`,
		whereClause, argIndex, argIndex+1)

	args = append(args, filters.Limit, filters.Offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to search users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var preferencesJSON []byte

		err := rows.Scan(
			&user.ID, &user.Email, &user.EmailVerified, &user.CountryCode,
			&user.Timezone, &user.Language, &preferencesJSON, &user.UserRole,
			&user.MFAEnabled, &user.GDPRConsent, &user.CreatedAt, &user.UpdatedAt,
			&user.LastActiveAt, &user.IsActive, &user.Version,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}

		// Parse preferences JSON
		if len(preferencesJSON) > 0 {
			if err := json.Unmarshal(preferencesJSON, &user.Preferences); err != nil {
				return nil, fmt.Errorf("failed to parse preferences: %w", err)
			}
		} else {
			user.Preferences = make(map[string]interface{})
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %w", err)
	}

	return &models.UserSearchResult{
		Users:   users,
		Total:   total,
		Limit:   filters.Limit,
		Offset:  filters.Offset,
		HasMore: filters.Offset+len(users) < total,
	}, nil
}

func (r *userRepository) GetMultiple(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error) {
	if len(userIDs) == 0 {
		return []models.User{}, nil
	}

	// Build IN clause with placeholders
	placeholders := make([]string, len(userIDs))
	args := make([]interface{}, len(userIDs))
	for i, id := range userIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT id, email, email_verified, country_code, timezone, language, 
		       preferences, user_role, mfa_enabled, gdpr_consent, 
		       created_at, updated_at, last_active_at, is_active, version
		FROM users 
		WHERE id IN (%s) AND is_active = true
		ORDER BY created_at DESC`,
		strings.Join(placeholders, ", "))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get multiple users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var preferencesJSON []byte

		err := rows.Scan(
			&user.ID, &user.Email, &user.EmailVerified, &user.CountryCode,
			&user.Timezone, &user.Language, &preferencesJSON, &user.UserRole,
			&user.MFAEnabled, &user.GDPRConsent, &user.CreatedAt, &user.UpdatedAt,
			&user.LastActiveAt, &user.IsActive, &user.Version,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}

		// Parse preferences JSON
		if len(preferencesJSON) > 0 {
			if err := json.Unmarshal(preferencesJSON, &user.Preferences); err != nil {
				return nil, fmt.Errorf("failed to parse preferences: %w", err)
			}
		} else {
			user.Preferences = make(map[string]interface{})
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %w", err)
	}

	return users, nil
}

func (r *userRepository) UpdateLastActive(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE users 
		SET last_active_at = NOW()
		WHERE id = $1 AND is_active = true`

	result, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to update last active: %w", err)
	}

	if result.RowsAffected() == 0 {
		return models.ErrUserNotFound
	}

	return nil
}

func (r *userRepository) GetActiveUserCount(ctx context.Context) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM users 
		WHERE is_active = true AND last_active_at > NOW() - INTERVAL '30 days'`

	var count int
	err := r.db.QueryRow(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get active user count: %w", err)
	}

	return count, nil
}

func (r *userRepository) GetUserCountByCountry(ctx context.Context) (map[string]int, error) {
	query := `
		SELECT country_code, COUNT(*) 
		FROM users 
		WHERE is_active = true 
		GROUP BY country_code
		ORDER BY COUNT(*) DESC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get user count by country: %w", err)
	}
	defer rows.Close()

	result := make(map[string]int)
	for rows.Next() {
		var countryCode string
		var count int

		err := rows.Scan(&countryCode, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan country count: %w", err)
		}

		result[countryCode] = count
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating country counts: %w", err)
	}

	return result, nil
}
