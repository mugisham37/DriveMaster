package security

import (
	"strings"
	"testing"
)

func TestInputSanitizer_ValidateAndSanitizeEmail(t *testing.T) {
	sanitizer := NewInputSanitizer()

	tests := []struct {
		name        string
		email       string
		expected    string
		shouldError bool
	}{
		{
			name:        "valid email",
			email:       "test@example.com",
			expected:    "test@example.com",
			shouldError: false,
		},
		{
			name:        "email with uppercase",
			email:       "Test@Example.COM",
			expected:    "test@example.com",
			shouldError: false,
		},
		{
			name:        "empty email",
			email:       "",
			expected:    "",
			shouldError: true,
		},
		{
			name:        "invalid email format",
			email:       "invalid-email",
			expected:    "",
			shouldError: true,
		},
		{
			name:        "email too long",
			email:       strings.Repeat("a", 250) + "@example.com",
			expected:    "",
			shouldError: true,
		},
		{
			name:        "email with SQL injection attempt",
			email:       "test@example.com'; DROP TABLE users; --",
			expected:    "",
			shouldError: true,
		},
		{
			name:        "email with XSS attempt",
			email:       "test@example.com<script>alert('xss')</script>",
			expected:    "",
			shouldError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := sanitizer.ValidateAndSanitizeEmail(tt.email)

			if tt.shouldError {
				if err == nil {
					t.Errorf("expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if result != tt.expected {
					t.Errorf("expected %q, got %q", tt.expected, result)
				}
			}
		})
	}
}

func TestInputSanitizer_ValidateAndSanitizeText(t *testing.T) {
	sanitizer := NewInputSanitizer()

	tests := []struct {
		name        string
		text        string
		maxLength   int
		fieldName   string
		expected    string
		shouldError bool
	}{
		{
			name:        "valid text",
			text:        "Hello, World!",
			maxLength:   100,
			fieldName:   "message",
			expected:    "Hello, World!",
			shouldError: false,
		},
		{
			name:        "text with HTML",
			text:        "<p>Hello, <b>World!</b></p>",
			maxLength:   100,
			fieldName:   "message",
			expected:    "&lt;p&gt;Hello, &lt;b&gt;World!&lt;/b&gt;&lt;/p&gt;",
			shouldError: false,
		},
		{
			name:        "text too long",
			text:        "This is a very long text that exceeds the maximum length limit",
			maxLength:   20,
			fieldName:   "message",
			expected:    "",
			shouldError: true,
		},
		{
			name:        "text with SQL injection",
			text:        "Hello'; DROP TABLE users; --",
			maxLength:   100,
			fieldName:   "message",
			expected:    "",
			shouldError: true,
		},
		{
			name:        "text with XSS",
			text:        "Hello<script>alert('xss')</script>",
			maxLength:   100,
			fieldName:   "message",
			expected:    "",
			shouldError: true,
		},
		{
			name:        "text with path traversal",
			text:        "../../etc/passwd",
			maxLength:   100,
			fieldName:   "filename",
			expected:    "",
			shouldError: true,
		},
		{
			name:        "empty text",
			text:        "",
			maxLength:   100,
			fieldName:   "message",
			expected:    "",
			shouldError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := sanitizer.ValidateAndSanitizeText(tt.text, tt.maxLength, tt.fieldName)

			if tt.shouldError {
				if err == nil {
					t.Errorf("expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if result != tt.expected {
					t.Errorf("expected %q, got %q", tt.expected, result)
				}
			}
		})
	}
}

func TestInputSanitizer_ValidateUUID(t *testing.T) {
	sanitizer := NewInputSanitizer()

	tests := []struct {
		name        string
		uuid        string
		fieldName   string
		shouldError bool
	}{
		{
			name:        "valid UUID v4",
			uuid:        "550e8400-e29b-41d4-a716-446655440000",
			fieldName:   "id",
			shouldError: false,
		},
		{
			name:        "valid UUID v4 uppercase",
			uuid:        "550E8400-E29B-41D4-A716-446655440000",
			fieldName:   "id",
			shouldError: false,
		},
		{
			name:        "empty UUID",
			uuid:        "",
			fieldName:   "id",
			shouldError: true,
		},
		{
			name:        "invalid UUID format",
			uuid:        "invalid-uuid",
			fieldName:   "id",
			shouldError: true,
		},
		{
			name:        "UUID with wrong version",
			uuid:        "550e8400-e29b-31d4-a716-446655440000",
			fieldName:   "id",
			shouldError: true,
		},
		{
			name:        "UUID too short",
			uuid:        "550e8400-e29b-41d4-a716-44665544000",
			fieldName:   "id",
			shouldError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := sanitizer.ValidateUUID(tt.uuid, tt.fieldName)

			if tt.shouldError {
				if err == nil {
					t.Errorf("expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestInputSanitizer_ValidatePassword(t *testing.T) {
	sanitizer := NewInputSanitizer()

	tests := []struct {
		name        string
		password    string
		shouldError bool
	}{
		{
			name:        "valid strong password",
			password:    "StrongP@ssw0rd!",
			shouldError: false,
		},
		{
			name:        "password too short",
			password:    "Short1!",
			shouldError: true,
		},
		{
			name:        "password too long",
			password:    "ThisIsAVeryLongPasswordThatExceedsTheMaximumLengthLimitAndShouldBeRejectedByOurValidationSystemBecauseItIsTooLongForPracticalUse!",
			shouldError: true,
		},
		{
			name:        "password without lowercase",
			password:    "PASSWORD123!",
			shouldError: true,
		},
		{
			name:        "password without uppercase",
			password:    "password123!",
			shouldError: true,
		},
		{
			name:        "password without digits",
			password:    "Password!",
			shouldError: true,
		},
		{
			name:        "password without special characters",
			password:    "Password123",
			shouldError: true,
		},
		{
			name:        "password with common pattern",
			password:    "Password123!",
			shouldError: true,
		},
		{
			name:        "empty password",
			password:    "",
			shouldError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := sanitizer.ValidatePassword(tt.password)

			if tt.shouldError {
				if err == nil {
					t.Errorf("expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestInputSanitizer_ContainsSuspiciousPatterns(t *testing.T) {
	sanitizer := NewInputSanitizer()

	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "clean input",
			input:    "Hello, World!",
			expected: false,
		},
		{
			name:     "SQL injection - UNION SELECT",
			input:    "1' UNION SELECT * FROM users --",
			expected: true,
		},
		{
			name:     "SQL injection - DROP TABLE",
			input:    "'; DROP TABLE users; --",
			expected: true,
		},
		{
			name:     "XSS - script tag",
			input:    "<script>alert('xss')</script>",
			expected: true,
		},
		{
			name:     "XSS - javascript protocol",
			input:    "javascript:alert('xss')",
			expected: true,
		},
		{
			name:     "XSS - event handler",
			input:    "<img onload='alert(1)'>",
			expected: true,
		},
		{
			name:     "Path traversal - dot dot slash",
			input:    "../../etc/passwd",
			expected: true,
		},
		{
			name:     "Path traversal - URL encoded",
			input:    "%2e%2e%2f",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizer.containsSuspiciousPatterns(tt.input)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}
