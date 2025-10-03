package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID            uuid.UUID              `json:"id" db:"id"`
	Email         string                 `json:"email" db:"email"`
	EmailVerified bool                   `json:"email_verified" db:"email_verified"`
	CountryCode   string                 `json:"country_code" db:"country_code"`
	Timezone      string                 `json:"timezone" db:"timezone"`
	Language      string                 `json:"language" db:"language"`
	Preferences   map[string]interface{} `json:"preferences" db:"preferences"`
	UserRole      string                 `json:"user_role" db:"user_role"`
	MFAEnabled    bool                   `json:"mfa_enabled" db:"mfa_enabled"`
	GDPRConsent   bool                   `json:"gdpr_consent" db:"gdpr_consent"`
	CreatedAt     time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at" db:"updated_at"`
	LastActiveAt  time.Time              `json:"last_active_at" db:"last_active_at"`
	IsActive      bool                   `json:"is_active" db:"is_active"`
	Version       int                    `json:"version" db:"version"`
}

// UserPreferences represents user preferences
type UserPreferences struct {
	UserID      uuid.UUID              `json:"user_id" db:"user_id"`
	Preferences map[string]interface{} `json:"preferences" db:"preferences"`
	UpdatedAt   time.Time              `json:"updated_at" db:"updated_at"`
}

// UserUpdate represents fields that can be updated
type UserUpdate struct {
	Timezone    *string                 `json:"timezone,omitempty"`
	Language    *string                 `json:"language,omitempty"`
	Preferences *map[string]interface{} `json:"preferences,omitempty"`
	GDPRConsent *bool                   `json:"gdpr_consent,omitempty"`
	Version     int                     `json:"version"`
}

// UserSearchFilters represents search and filtering options
type UserSearchFilters struct {
	Email       string    `json:"email,omitempty"`
	CountryCode string    `json:"country_code,omitempty"`
	UserRole    string    `json:"user_role,omitempty"`
	IsActive    *bool     `json:"is_active,omitempty"`
	CreatedFrom time.Time `json:"created_from,omitempty"`
	CreatedTo   time.Time `json:"created_to,omitempty"`
	Limit       int       `json:"limit"`
	Offset      int       `json:"offset"`
}

// UserSearchResult represents paginated search results
type UserSearchResult struct {
	Users   []User `json:"users"`
	Total   int    `json:"total"`
	Limit   int    `json:"limit"`
	Offset  int    `json:"offset"`
	HasMore bool   `json:"has_more"`
}

// Validate validates user data
func (u *User) Validate() error {
	if u.Email == "" {
		return ErrInvalidEmail
	}
	if u.CountryCode == "" {
		return ErrInvalidCountryCode
	}
	if u.Timezone == "" {
		u.Timezone = "UTC"
	}
	if u.Language == "" {
		u.Language = "en"
	}
	if u.UserRole == "" {
		u.UserRole = "learner"
	}
	return nil
}

// ToJSON converts user to JSON bytes
func (u *User) ToJSON() ([]byte, error) {
	return json.Marshal(u)
}

// FromJSON populates user from JSON bytes
func (u *User) FromJSON(data []byte) error {
	return json.Unmarshal(data, u)
}

// SanitizeForResponse removes sensitive fields for API responses
func (u *User) SanitizeForResponse() *User {
	sanitized := *u
	// Remove any sensitive fields if needed
	return &sanitized
}

// Custom errors
var (
	ErrUserNotFound       = NewAppError("USER_NOT_FOUND", "User not found")
	ErrInvalidEmail       = NewAppError("INVALID_EMAIL", "Invalid email address")
	ErrInvalidCountryCode = NewAppError("INVALID_COUNTRY_CODE", "Invalid country code")
	ErrUserAlreadyExists  = NewAppError("USER_ALREADY_EXISTS", "User already exists")
	ErrOptimisticLock     = NewAppError("OPTIMISTIC_LOCK_ERROR", "Resource was modified by another process")
	ErrUserDeactivated    = NewAppError("USER_DEACTIVATED", "User account is deactivated")
)

// AppError represents application-specific errors
type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *AppError) Error() string {
	return e.Message
}

func NewAppError(code, message string) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
	}
}
