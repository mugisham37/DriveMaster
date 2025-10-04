package validation

import (
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/google/uuid"
)

var (
	// ErrInvalidEventType indicates an invalid event type
	ErrInvalidEventType = errors.New("invalid event type")
	// ErrMissingRequiredField indicates a required field is missing
	ErrMissingRequiredField = errors.New("missing required field")
	// ErrInvalidFieldValue indicates an invalid field value
	ErrInvalidFieldValue = errors.New("invalid field value")
	// ErrInvalidTimestamp indicates an invalid timestamp
	ErrInvalidTimestamp = errors.New("invalid timestamp")
	// ErrInvalidUUID indicates an invalid UUID
	ErrInvalidUUID = errors.New("invalid UUID")
)

// ValidationError represents a validation error with details
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("validation error in field '%s': %s", e.Field, e.Message)
}

// ValidationResult holds the result of validation
type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationError `json:"errors,omitempty"`
}

// EventValidator provides validation for different event types
type EventValidator struct {
	userIDPattern *regexp.Regexp
	itemIDPattern *regexp.Regexp
}

// NewEventValidator creates a new event validator
func NewEventValidator() *EventValidator {
	return &EventValidator{
		userIDPattern: regexp.MustCompile(`^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$`),
		itemIDPattern: regexp.MustCompile(`^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$`),
	}
}

// ValidateAttemptEvent validates an attempt event
func (v *EventValidator) ValidateAttemptEvent(event map[string]interface{}) ValidationResult {
	var errors []ValidationError

	// Validate required fields
	if err := v.validateRequiredString(event, "user_id"); err != nil {
		errors = append(errors, *err)
	} else if !v.isValidUUID(event["user_id"].(string)) {
		errors = append(errors, ValidationError{
			Field:   "user_id",
			Message: "must be a valid UUID",
			Code:    "invalid_uuid",
		})
	}

	if err := v.validateRequiredString(event, "item_id"); err != nil {
		errors = append(errors, *err)
	} else if !v.isValidUUID(event["item_id"].(string)) {
		errors = append(errors, ValidationError{
			Field:   "item_id",
			Message: "must be a valid UUID",
			Code:    "invalid_uuid",
		})
	}

	if err := v.validateRequiredString(event, "session_id"); err != nil {
		errors = append(errors, *err)
	} else if !v.isValidUUID(event["session_id"].(string)) {
		errors = append(errors, ValidationError{
			Field:   "session_id",
			Message: "must be a valid UUID",
			Code:    "invalid_uuid",
		})
	}

	if err := v.validateRequiredString(event, "client_attempt_id"); err != nil {
		errors = append(errors, *err)
	} else if !v.isValidUUID(event["client_attempt_id"].(string)) {
		errors = append(errors, ValidationError{
			Field:   "client_attempt_id",
			Message: "must be a valid UUID",
			Code:    "invalid_uuid",
		})
	}

	// Validate timestamp
	if err := v.validateTimestamp(event, "timestamp"); err != nil {
		errors = append(errors, *err)
	}

	// Validate correct field (boolean)
	if err := v.validateRequiredBool(event, "correct"); err != nil {
		errors = append(errors, *err)
	}

	// Validate quality (0-5 scale for SM-2)
	if err := v.validateIntRange(event, "quality", 0, 5, true); err != nil {
		errors = append(errors, *err)
	}

	// Validate confidence (1-5 scale)
	if err := v.validateIntRange(event, "confidence", 1, 5, false); err != nil {
		errors = append(errors, *err)
	}

	// Validate time_taken_ms (must be positive)
	if err := v.validatePositiveInt(event, "time_taken_ms", true); err != nil {
		errors = append(errors, *err)
	}

	// Validate hints_used (non-negative)
	if err := v.validateIntRange(event, "hints_used", 0, 100, false); err != nil {
		errors = append(errors, *err)
	}

	// Validate device_type
	if err := v.validateOptionalString(event, "device_type"); err != nil {
		errors = append(errors, *err)
	}

	// Validate app_version
	if err := v.validateOptionalString(event, "app_version"); err != nil {
		errors = append(errors, *err)
	}

	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateSessionEvent validates a session event
func (v *EventValidator) ValidateSessionEvent(event map[string]interface{}) ValidationResult {
	var errors []ValidationError

	// Validate required fields
	if err := v.validateRequiredString(event, "session_id"); err != nil {
		errors = append(errors, *err)
	} else if !v.isValidUUID(event["session_id"].(string)) {
		errors = append(errors, ValidationError{
			Field:   "session_id",
			Message: "must be a valid UUID",
			Code:    "invalid_uuid",
		})
	}

	if err := v.validateRequiredString(event, "user_id"); err != nil {
		errors = append(errors, *err)
	} else if !v.isValidUUID(event["user_id"].(string)) {
		errors = append(errors, ValidationError{
			Field:   "user_id",
			Message: "must be a valid UUID",
			Code:    "invalid_uuid",
		})
	}

	// Validate timestamps
	if err := v.validateTimestamp(event, "start_time"); err != nil {
		errors = append(errors, *err)
	}

	if err := v.validateTimestamp(event, "end_time"); err != nil {
		errors = append(errors, *err)
	}

	// Validate session metrics
	if err := v.validatePositiveInt(event, "items_attempted", true); err != nil {
		errors = append(errors, *err)
	}

	if err := v.validateIntRange(event, "correct_count", 0, 10000, true); err != nil {
		errors = append(errors, *err)
	}

	if err := v.validatePositiveInt(event, "total_time_ms", true); err != nil {
		errors = append(errors, *err)
	}

	// Validate session_type
	validSessionTypes := []string{"practice", "review", "mock_test", "placement", "adaptive_practice"}
	if err := v.validateEnum(event, "session_type", validSessionTypes, true); err != nil {
		errors = append(errors, *err)
	}

	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidatePlacementEvent validates a placement event
func (v *EventValidator) ValidatePlacementEvent(event map[string]interface{}) ValidationResult {
	var errors []ValidationError

	// Validate required fields
	if err := v.validateRequiredString(event, "placement_id"); err != nil {
		errors = append(errors, *err)
	} else if !v.isValidUUID(event["placement_id"].(string)) {
		errors = append(errors, ValidationError{
			Field:   "placement_id",
			Message: "must be a valid UUID",
			Code:    "invalid_uuid",
		})
	}

	if err := v.validateRequiredString(event, "user_id"); err != nil {
		errors = append(errors, *err)
	} else if !v.isValidUUID(event["user_id"].(string)) {
		errors = append(errors, ValidationError{
			Field:   "user_id",
			Message: "must be a valid UUID",
			Code:    "invalid_uuid",
		})
	}

	// Validate timestamp
	if err := v.validateTimestamp(event, "timestamp"); err != nil {
		errors = append(errors, *err)
	}

	// Validate placement results
	if err := v.validateFloatRange(event, "overall_accuracy", 0.0, 1.0, false); err != nil {
		errors = append(errors, *err)
	}

	if err := v.validatePositiveInt(event, "items_administered", false); err != nil {
		errors = append(errors, *err)
	}

	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// Helper validation methods
func (v *EventValidator) validateRequiredString(event map[string]interface{}, field string) *ValidationError {
	value, exists := event[field]
	if !exists {
		return &ValidationError{
			Field:   field,
			Message: "field is required",
			Code:    "required_field_missing",
		}
	}

	str, ok := value.(string)
	if !ok {
		return &ValidationError{
			Field:   field,
			Message: "must be a string",
			Code:    "invalid_type",
		}
	}

	if str == "" {
		return &ValidationError{
			Field:   field,
			Message: "cannot be empty",
			Code:    "empty_value",
		}
	}

	return nil
}

func (v *EventValidator) validateOptionalString(event map[string]interface{}, field string) *ValidationError {
	value, exists := event[field]
	if !exists {
		return nil // Optional field
	}

	if _, ok := value.(string); !ok {
		return &ValidationError{
			Field:   field,
			Message: "must be a string",
			Code:    "invalid_type",
		}
	}

	return nil
}

func (v *EventValidator) validateRequiredBool(event map[string]interface{}, field string) *ValidationError {
	value, exists := event[field]
	if !exists {
		return &ValidationError{
			Field:   field,
			Message: "field is required",
			Code:    "required_field_missing",
		}
	}

	if _, ok := value.(bool); !ok {
		return &ValidationError{
			Field:   field,
			Message: "must be a boolean",
			Code:    "invalid_type",
		}
	}

	return nil
}

func (v *EventValidator) validateIntRange(event map[string]interface{}, field string, min, max int, required bool) *ValidationError {
	value, exists := event[field]
	if !exists {
		if required {
			return &ValidationError{
				Field:   field,
				Message: "field is required",
				Code:    "required_field_missing",
			}
		}
		return nil
	}

	var intValue int
	switch v := value.(type) {
	case int:
		intValue = v
	case int32:
		intValue = int(v)
	case int64:
		intValue = int(v)
	case float64:
		intValue = int(v)
	default:
		return &ValidationError{
			Field:   field,
			Message: "must be an integer",
			Code:    "invalid_type",
		}
	}

	if intValue < min || intValue > max {
		return &ValidationError{
			Field:   field,
			Message: fmt.Sprintf("must be between %d and %d", min, max),
			Code:    "out_of_range",
		}
	}

	return nil
}

func (v *EventValidator) validatePositiveInt(event map[string]interface{}, field string, required bool) *ValidationError {
	value, exists := event[field]
	if !exists {
		if required {
			return &ValidationError{
				Field:   field,
				Message: "field is required",
				Code:    "required_field_missing",
			}
		}
		return nil
	}

	var intValue int
	switch v := value.(type) {
	case int:
		intValue = v
	case int32:
		intValue = int(v)
	case int64:
		intValue = int(v)
	case float64:
		intValue = int(v)
	default:
		return &ValidationError{
			Field:   field,
			Message: "must be an integer",
			Code:    "invalid_type",
		}
	}

	if intValue <= 0 {
		return &ValidationError{
			Field:   field,
			Message: "must be positive",
			Code:    "invalid_value",
		}
	}

	return nil
}

func (v *EventValidator) validateFloatRange(event map[string]interface{}, field string, min, max float64, required bool) *ValidationError {
	value, exists := event[field]
	if !exists {
		if required {
			return &ValidationError{
				Field:   field,
				Message: "field is required",
				Code:    "required_field_missing",
			}
		}
		return nil
	}

	var floatValue float64
	switch v := value.(type) {
	case float64:
		floatValue = v
	case float32:
		floatValue = float64(v)
	case int:
		floatValue = float64(v)
	case int32:
		floatValue = float64(v)
	case int64:
		floatValue = float64(v)
	default:
		return &ValidationError{
			Field:   field,
			Message: "must be a number",
			Code:    "invalid_type",
		}
	}

	if floatValue < min || floatValue > max {
		return &ValidationError{
			Field:   field,
			Message: fmt.Sprintf("must be between %.2f and %.2f", min, max),
			Code:    "out_of_range",
		}
	}

	return nil
}

func (v *EventValidator) validateEnum(event map[string]interface{}, field string, validValues []string, required bool) *ValidationError {
	value, exists := event[field]
	if !exists {
		if required {
			return &ValidationError{
				Field:   field,
				Message: "field is required",
				Code:    "required_field_missing",
			}
		}
		return nil
	}

	str, ok := value.(string)
	if !ok {
		return &ValidationError{
			Field:   field,
			Message: "must be a string",
			Code:    "invalid_type",
		}
	}

	for _, valid := range validValues {
		if str == valid {
			return nil
		}
	}

	return &ValidationError{
		Field:   field,
		Message: fmt.Sprintf("must be one of: %v", validValues),
		Code:    "invalid_enum_value",
	}
}

func (v *EventValidator) validateTimestamp(event map[string]interface{}, field string) *ValidationError {
	value, exists := event[field]
	if !exists {
		return &ValidationError{
			Field:   field,
			Message: "field is required",
			Code:    "required_field_missing",
		}
	}

	switch v := value.(type) {
	case string:
		// Try to parse ISO 8601 timestamp
		if _, err := time.Parse(time.RFC3339, v); err != nil {
			return &ValidationError{
				Field:   field,
				Message: "must be a valid ISO 8601 timestamp",
				Code:    "invalid_timestamp_format",
			}
		}
	case int64:
		// Unix timestamp in milliseconds
		if v < 0 || v > time.Now().Add(24*time.Hour).UnixMilli() {
			return &ValidationError{
				Field:   field,
				Message: "timestamp is out of reasonable range",
				Code:    "invalid_timestamp_range",
			}
		}
	case float64:
		// Unix timestamp (possibly with fractional seconds)
		if v < 0 || v > float64(time.Now().Add(24*time.Hour).Unix()) {
			return &ValidationError{
				Field:   field,
				Message: "timestamp is out of reasonable range",
				Code:    "invalid_timestamp_range",
			}
		}
	default:
		return &ValidationError{
			Field:   field,
			Message: "must be a timestamp (string, int64, or float64)",
			Code:    "invalid_type",
		}
	}

	return nil
}

func (v *EventValidator) isValidUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}
