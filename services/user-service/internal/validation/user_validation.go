package validation

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"user-service/internal/models"

	"github.com/google/uuid"
)

var (
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
)

// ValidateUser validates a user model
func ValidateUser(user *models.User) error {
	if err := ValidateEmail(user.Email); err != nil {
		return err
	}

	if err := ValidateCountryCode(user.CountryCode); err != nil {
		return err
	}

	if err := ValidateTimezone(user.Timezone); err != nil {
		return err
	}

	if err := ValidateLanguage(user.Language); err != nil {
		return err
	}

	if err := ValidateUserRole(user.UserRole); err != nil {
		return err
	}

	return nil
}

// ValidateUserUpdate validates a user update model
func ValidateUserUpdate(update *models.UserUpdate) error {
	if update.Timezone != nil {
		if err := ValidateTimezone(*update.Timezone); err != nil {
			return err
		}
	}

	if update.Language != nil {
		if err := ValidateLanguage(*update.Language); err != nil {
			return err
		}
	}

	if update.Preferences != nil {
		if err := ValidatePreferences(*update.Preferences); err != nil {
			return err
		}
	}

	return nil
}

// ValidateEmail validates email format
func ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email is required")
	}

	if len(email) > 255 {
		return fmt.Errorf("email is too long (max 255 characters)")
	}

	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}

	return nil
}

// ValidateCountryCode validates ISO 3166-1 alpha-2 country code
func ValidateCountryCode(countryCode string) error {
	if countryCode == "" {
		return fmt.Errorf("country code is required")
	}

	if len(countryCode) != 2 {
		return fmt.Errorf("country code must be 2 characters (ISO 3166-1 alpha-2)")
	}

	// Convert to uppercase for consistency
	countryCode = strings.ToUpper(countryCode)

	// Basic validation - in production, validate against actual ISO codes
	if !isAlpha(countryCode) {
		return fmt.Errorf("country code must contain only letters")
	}

	return nil
}

// ValidateTimezone validates timezone string
func ValidateTimezone(timezone string) error {
	if timezone == "" {
		return fmt.Errorf("timezone is required")
	}

	// Try to load the timezone to validate it
	_, err := time.LoadLocation(timezone)
	if err != nil {
		return fmt.Errorf("invalid timezone: %w", err)
	}

	return nil
}

// ValidateLanguage validates language code (ISO 639-1)
func ValidateLanguage(language string) error {
	if language == "" {
		return fmt.Errorf("language is required")
	}

	if len(language) < 2 || len(language) > 5 {
		return fmt.Errorf("language code must be 2-5 characters")
	}

	// Basic validation - in production, validate against actual ISO codes
	if !isAlphaOrHyphen(language) {
		return fmt.Errorf("language code must contain only letters and hyphens")
	}

	return nil
}

// ValidateUserRole validates user role
func ValidateUserRole(role string) error {
	if role == "" {
		return fmt.Errorf("user role is required")
	}

	validRoles := map[string]bool{
		"learner":          true,
		"content_author":   true,
		"content_reviewer": true,
		"admin":            true,
		"super_admin":      true,
	}

	if !validRoles[role] {
		return fmt.Errorf("invalid user role: %s", role)
	}

	return nil
}

// ValidatePreferences validates user preferences
func ValidatePreferences(preferences map[string]interface{}) error {
	// Check for maximum size
	if len(preferences) > 100 {
		return fmt.Errorf("too many preferences (max 100)")
	}

	// Validate each preference
	for key, value := range preferences {
		if err := ValidatePreferenceKey(key); err != nil {
			return fmt.Errorf("invalid preference key '%s': %w", key, err)
		}

		if err := ValidatePreferenceValue(value); err != nil {
			return fmt.Errorf("invalid preference value for key '%s': %w", key, err)
		}
	}

	return nil
}

// ValidatePreferenceKey validates preference key
func ValidatePreferenceKey(key string) error {
	if key == "" {
		return fmt.Errorf("preference key cannot be empty")
	}

	if len(key) > 50 {
		return fmt.Errorf("preference key too long (max 50 characters)")
	}

	// Key should be alphanumeric with underscores and dots
	if !isValidPreferenceKey(key) {
		return fmt.Errorf("preference key must contain only letters, numbers, underscores, and dots")
	}

	return nil
}

// ValidatePreferenceValue validates preference value
func ValidatePreferenceValue(value interface{}) error {
	switch v := value.(type) {
	case string:
		if len(v) > 1000 {
			return fmt.Errorf("string value too long (max 1000 characters)")
		}
	case float64:
		// Numbers are fine
	case bool:
		// Booleans are fine
	case []interface{}:
		if len(v) > 100 {
			return fmt.Errorf("array too long (max 100 elements)")
		}
		// Recursively validate array elements
		for i, elem := range v {
			if err := ValidatePreferenceValue(elem); err != nil {
				return fmt.Errorf("invalid array element at index %d: %w", i, err)
			}
		}
	case map[string]interface{}:
		if len(v) > 50 {
			return fmt.Errorf("object too large (max 50 properties)")
		}
		// Recursively validate object properties
		for key, val := range v {
			if err := ValidatePreferenceKey(key); err != nil {
				return fmt.Errorf("invalid object key '%s': %w", key, err)
			}
			if err := ValidatePreferenceValue(val); err != nil {
				return fmt.Errorf("invalid object value for key '%s': %w", key, err)
			}
		}
	case nil:
		// Null values are fine
	default:
		return fmt.Errorf("unsupported value type: %T", value)
	}

	return nil
}

// ValidateUserID validates UUID format
func ValidateUserID(userIDStr string) (uuid.UUID, error) {
	if userIDStr == "" {
		return uuid.Nil, fmt.Errorf("user ID is required")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid user ID format: %w", err)
	}

	return userID, nil
}

// ValidateSearchFilters validates search filters
func ValidateSearchFilters(filters *models.UserSearchFilters) error {
	if filters.Limit < 0 {
		return fmt.Errorf("limit cannot be negative")
	}

	if filters.Limit > 1000 {
		return fmt.Errorf("limit cannot exceed 1000")
	}

	if filters.Offset < 0 {
		return fmt.Errorf("offset cannot be negative")
	}

	if filters.Email != "" {
		if len(filters.Email) > 255 {
			return fmt.Errorf("email filter too long")
		}
	}

	if filters.CountryCode != "" {
		if err := ValidateCountryCode(filters.CountryCode); err != nil {
			return fmt.Errorf("invalid country code filter: %w", err)
		}
	}

	if filters.UserRole != "" {
		if err := ValidateUserRole(filters.UserRole); err != nil {
			return fmt.Errorf("invalid user role filter: %w", err)
		}
	}

	if !filters.CreatedFrom.IsZero() && !filters.CreatedTo.IsZero() {
		if filters.CreatedFrom.After(filters.CreatedTo) {
			return fmt.Errorf("created_from cannot be after created_to")
		}
	}

	return nil
}

// Helper functions

func isAlpha(s string) bool {
	for _, r := range s {
		if (r < 'A' || r > 'Z') && (r < 'a' || r > 'z') {
			return false
		}
	}
	return true
}

func isAlphaOrHyphen(s string) bool {
	for _, r := range s {
		if (r < 'A' || r > 'Z') && (r < 'a' || r > 'z') && r != '-' {
			return false
		}
	}
	return true
}

func isValidPreferenceKey(s string) bool {
	for _, r := range s {
		if (r < 'A' || r > 'Z') && (r < 'a' || r > 'z') && (r < '0' || r > '9') && r != '_' && r != '.' {
			return false
		}
	}
	return true
}
