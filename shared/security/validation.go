package security

import (
	"fmt"
	"html"
	"net/url"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("validation error on field '%s': %s", e.Field, e.Message)
}

// ValidationErrors represents multiple validation errors
type ValidationErrors []ValidationError

func (e ValidationErrors) Error() string {
	if len(e) == 0 {
		return "no validation errors"
	}
	if len(e) == 1 {
		return e[0].Error()
	}
	return fmt.Sprintf("%d validation errors occurred", len(e))
}

// InputSanitizer provides methods for sanitizing user input
type InputSanitizer struct {
	// SQL injection patterns
	sqlInjectionPatterns []*regexp.Regexp
	// XSS patterns
	xssPatterns []*regexp.Regexp
	// Path traversal patterns
	pathTraversalPatterns []*regexp.Regexp
}

// NewInputSanitizer creates a new input sanitizer
func NewInputSanitizer() *InputSanitizer {
	return &InputSanitizer{
		sqlInjectionPatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(union\s+select|select\s+.*\s+from|insert\s+into|update\s+.*\s+set|delete\s+from)`),
			regexp.MustCompile(`(?i)(drop\s+table|create\s+table|alter\s+table|truncate\s+table)`),
			regexp.MustCompile(`(?i)(exec\s*\(|execute\s*\(|sp_executesql)`),
			regexp.MustCompile(`(?i)(script\s*>|javascript:|vbscript:|onload\s*=|onerror\s*=)`),
			regexp.MustCompile(`(?i)(\-\-|\#|\/\*|\*\/)`),
			regexp.MustCompile(`(?i)(0x[0-9a-f]+|char\s*\(|ascii\s*\(|substring\s*\()`),
		},
		xssPatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`),
			regexp.MustCompile(`(?i)<iframe[^>]*>.*?</iframe>`),
			regexp.MustCompile(`(?i)<object[^>]*>.*?</object>`),
			regexp.MustCompile(`(?i)<embed[^>]*>.*?</embed>`),
			regexp.MustCompile(`(?i)<link[^>]*>`),
			regexp.MustCompile(`(?i)<meta[^>]*>`),
			regexp.MustCompile(`(?i)javascript:|vbscript:|data:|about:`),
			regexp.MustCompile(`(?i)on\w+\s*=`),
		},
		pathTraversalPatterns: []*regexp.Regexp{
			regexp.MustCompile(`\.\.\/|\.\.\\`),
			regexp.MustCompile(`%2e%2e%2f|%2e%2e%5c`),
			regexp.MustCompile(`%252e%252e%252f|%252e%252e%255c`),
		},
	}
}

// SanitizeString sanitizes a string input
func (s *InputSanitizer) SanitizeString(input string) string {
	if input == "" {
		return input
	}

	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")

	// HTML escape
	input = html.EscapeString(input)

	// URL decode and re-encode to prevent double encoding attacks
	if decoded, err := url.QueryUnescape(input); err == nil {
		input = url.QueryEscape(decoded)
		input, _ = url.QueryUnescape(input) // Decode back for normal use
	}

	// Trim whitespace
	input = strings.TrimSpace(input)

	return input
}

// ValidateAndSanitizeEmail validates and sanitizes email input
func (s *InputSanitizer) ValidateAndSanitizeEmail(email string) (string, error) {
	if email == "" {
		return "", ValidationError{Field: "email", Message: "email is required", Code: "REQUIRED"}
	}

	// Basic sanitization
	email = strings.TrimSpace(strings.ToLower(email))

	// Length validation
	if len(email) > 254 {
		return "", ValidationError{Field: "email", Message: "email too long", Code: "TOO_LONG"}
	}

	// Basic email regex (RFC 5322 compliant)
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return "", ValidationError{Field: "email", Message: "invalid email format", Code: "INVALID_FORMAT"}
	}

	// Check for suspicious patterns
	if s.containsSuspiciousPatterns(email) {
		return "", ValidationError{Field: "email", Message: "email contains suspicious content", Code: "SUSPICIOUS_CONTENT"}
	}

	return email, nil
}

// ValidateAndSanitizeText validates and sanitizes text input
func (s *InputSanitizer) ValidateAndSanitizeText(text string, maxLength int, fieldName string) (string, error) {
	if text == "" {
		return text, nil
	}

	// Check for valid UTF-8
	if !utf8.ValidString(text) {
		return "", ValidationError{Field: fieldName, Message: "invalid UTF-8 encoding", Code: "INVALID_ENCODING"}
	}

	// Length validation
	if len(text) > maxLength {
		return "", ValidationError{Field: fieldName, Message: fmt.Sprintf("text too long (max %d characters)", maxLength), Code: "TOO_LONG"}
	}

	// Check for suspicious patterns
	if s.containsSuspiciousPatterns(text) {
		return "", ValidationError{Field: fieldName, Message: "text contains suspicious content", Code: "SUSPICIOUS_CONTENT"}
	}

	// Sanitize
	sanitized := s.SanitizeString(text)

	// Check for control characters (except newlines and tabs)
	for _, r := range sanitized {
		if unicode.IsControl(r) && r != '\n' && r != '\t' && r != '\r' {
			return "", ValidationError{Field: fieldName, Message: "text contains invalid control characters", Code: "INVALID_CHARACTERS"}
		}
	}

	return sanitized, nil
}

// ValidateUUID validates UUID format
func (s *InputSanitizer) ValidateUUID(id string, fieldName string) error {
	if id == "" {
		return ValidationError{Field: fieldName, Message: "ID is required", Code: "REQUIRED"}
	}

	// UUID v4 regex
	uuidRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	if !uuidRegex.MatchString(strings.ToLower(id)) {
		return ValidationError{Field: fieldName, Message: "invalid UUID format", Code: "INVALID_FORMAT"}
	}

	return nil
}

// ValidateJSONB validates JSONB input
func (s *InputSanitizer) ValidateJSONB(jsonStr string, fieldName string) error {
	if jsonStr == "" {
		return nil
	}

	// Check for suspicious patterns in JSON
	if s.containsSuspiciousPatterns(jsonStr) {
		return ValidationError{Field: fieldName, Message: "JSON contains suspicious content", Code: "SUSPICIOUS_CONTENT"}
	}

	// Additional JSON-specific validations
	if strings.Contains(jsonStr, "__proto__") || strings.Contains(jsonStr, "constructor") {
		return ValidationError{Field: fieldName, Message: "JSON contains prototype pollution attempt", Code: "PROTOTYPE_POLLUTION"}
	}

	return nil
}

// ValidateCountryCode validates ISO country codes
func (s *InputSanitizer) ValidateCountryCode(code string) error {
	if code == "" {
		return ValidationError{Field: "country_code", Message: "country code is required", Code: "REQUIRED"}
	}

	code = strings.ToUpper(strings.TrimSpace(code))

	if len(code) != 2 {
		return ValidationError{Field: "country_code", Message: "country code must be 2 characters", Code: "INVALID_LENGTH"}
	}

	// Basic validation - only letters
	for _, r := range code {
		if !unicode.IsLetter(r) {
			return ValidationError{Field: "country_code", Message: "country code must contain only letters", Code: "INVALID_CHARACTERS"}
		}
	}

	return nil
}

// ValidateLanguageCode validates language codes
func (s *InputSanitizer) ValidateLanguageCode(code string) error {
	if code == "" {
		return ValidationError{Field: "language", Message: "language code is required", Code: "REQUIRED"}
	}

	code = strings.ToLower(strings.TrimSpace(code))

	// Language code regex (e.g., en, en-US, zh-CN)
	langRegex := regexp.MustCompile(`^[a-z]{2}(-[A-Z]{2})?$`)
	if !langRegex.MatchString(code) {
		return ValidationError{Field: "language", Message: "invalid language code format", Code: "INVALID_FORMAT"}
	}

	return nil
}

// containsSuspiciousPatterns checks if input contains suspicious patterns
func (s *InputSanitizer) containsSuspiciousPatterns(input string) bool {
	input = strings.ToLower(input)

	// Check SQL injection patterns
	for _, pattern := range s.sqlInjectionPatterns {
		if pattern.MatchString(input) {
			return true
		}
	}

	// Check XSS patterns
	for _, pattern := range s.xssPatterns {
		if pattern.MatchString(input) {
			return true
		}
	}

	// Check path traversal patterns
	for _, pattern := range s.pathTraversalPatterns {
		if pattern.MatchString(input) {
			return true
		}
	}

	return false
}

// ValidateIPAddress validates IP address format
func (s *InputSanitizer) ValidateIPAddress(ip string) error {
	if ip == "" {
		return ValidationError{Field: "ip_address", Message: "IP address is required", Code: "REQUIRED"}
	}

	// IPv4 regex
	ipv4Regex := regexp.MustCompile(`^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$`)
	// IPv6 regex (simplified)
	ipv6Regex := regexp.MustCompile(`^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$`)

	if !ipv4Regex.MatchString(ip) && !ipv6Regex.MatchString(ip) {
		return ValidationError{Field: "ip_address", Message: "invalid IP address format", Code: "INVALID_FORMAT"}
	}

	return nil
}

// ValidateUserAgent validates user agent string
func (s *InputSanitizer) ValidateUserAgent(userAgent string) (string, error) {
	if userAgent == "" {
		return userAgent, nil // User agent is optional
	}

	// Length validation
	if len(userAgent) > 512 {
		return "", ValidationError{Field: "user_agent", Message: "user agent too long", Code: "TOO_LONG"}
	}

	// Check for suspicious patterns
	if s.containsSuspiciousPatterns(userAgent) {
		return "", ValidationError{Field: "user_agent", Message: "user agent contains suspicious content", Code: "SUSPICIOUS_CONTENT"}
	}

	// Sanitize
	sanitized := s.SanitizeString(userAgent)

	return sanitized, nil
}

// ValidatePassword validates password strength (without storing the password)
func (s *InputSanitizer) ValidatePassword(password string) error {
	if password == "" {
		return ValidationError{Field: "password", Message: "password is required", Code: "REQUIRED"}
	}

	if len(password) < 8 {
		return ValidationError{Field: "password", Message: "password must be at least 8 characters", Code: "TOO_SHORT"}
	}

	if len(password) > 128 {
		return ValidationError{Field: "password", Message: "password must be less than 128 characters", Code: "TOO_LONG"}
	}

	// Check for required character types
	var hasLower, hasUpper, hasDigit, hasSpecial bool
	for _, r := range password {
		switch {
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsDigit(r):
			hasDigit = true
		case unicode.IsPunct(r) || unicode.IsSymbol(r):
			hasSpecial = true
		}
	}

	var errors ValidationErrors
	if !hasLower {
		errors = append(errors, ValidationError{Field: "password", Message: "password must contain lowercase letters", Code: "MISSING_LOWERCASE"})
	}
	if !hasUpper {
		errors = append(errors, ValidationError{Field: "password", Message: "password must contain uppercase letters", Code: "MISSING_UPPERCASE"})
	}
	if !hasDigit {
		errors = append(errors, ValidationError{Field: "password", Message: "password must contain digits", Code: "MISSING_DIGIT"})
	}
	if !hasSpecial {
		errors = append(errors, ValidationError{Field: "password", Message: "password must contain special characters", Code: "MISSING_SPECIAL"})
	}

	if len(errors) > 0 {
		return errors
	}

	// Check for common patterns
	commonPatterns := []string{"password", "123456", "qwerty", "admin", "user"}
	lowerPassword := strings.ToLower(password)
	for _, pattern := range commonPatterns {
		if strings.Contains(lowerPassword, pattern) {
			return ValidationError{Field: "password", Message: "password contains common patterns", Code: "COMMON_PATTERN"}
		}
	}

	return nil
}