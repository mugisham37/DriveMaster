package security

import (
	"strings"
	"testing"
)

func TestEncryptionService_EncryptDecrypt(t *testing.T) {
	service, err := NewEncryptionService("test-master-key-for-encryption")
	if err != nil {
		t.Fatalf("failed to create encryption service: %v", err)
	}

	tests := []struct {
		name      string
		plaintext string
	}{
		{
			name:      "simple text",
			plaintext: "Hello, World!",
		},
		{
			name:      "empty string",
			plaintext: "",
		},
		{
			name:      "long text",
			plaintext: strings.Repeat("This is a long text for testing encryption. ", 100),
		},
		{
			name:      "special characters",
			plaintext: "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
		},
		{
			name:      "unicode text",
			plaintext: "Unicode: 你好世界 🌍 🚀 ñáéíóú",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Encrypt
			encrypted, err := service.Encrypt(tt.plaintext)
			if err != nil {
				t.Fatalf("encryption failed: %v", err)
			}

			// Verify encrypted text is different from plaintext (unless empty)
			if tt.plaintext != "" && encrypted == tt.plaintext {
				t.Error("encrypted text should be different from plaintext")
			}

			// Decrypt
			decrypted, err := service.Decrypt(encrypted)
			if err != nil {
				t.Fatalf("decryption failed: %v", err)
			}

			// Verify decrypted text matches original
			if decrypted != tt.plaintext {
				t.Errorf("decrypted text doesn't match original: got %q, want %q", decrypted, tt.plaintext)
			}
		})
	}
}

func TestEncryptionService_EncryptPII(t *testing.T) {
	service, err := NewEncryptionService("test-master-key-for-encryption")
	if err != nil {
		t.Fatalf("failed to create encryption service: %v", err)
	}

	salt := "test-salt"
	pii := "user@example.com"

	// Encrypt the same PII twice with same salt
	encrypted1, err := service.EncryptPII(pii, salt)
	if err != nil {
		t.Fatalf("first encryption failed: %v", err)
	}

	encrypted2, err := service.EncryptPII(pii, salt)
	if err != nil {
		t.Fatalf("second encryption failed: %v", err)
	}

	// Deterministic encryption should produce same result
	if encrypted1 != encrypted2 {
		t.Error("deterministic encryption should produce same result for same input and salt")
	}

	// Different salt should produce different result
	encrypted3, err := service.EncryptPII(pii, "different-salt")
	if err != nil {
		t.Fatalf("third encryption failed: %v", err)
	}

	if encrypted1 == encrypted3 {
		t.Error("different salt should produce different encrypted result")
	}
}

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
	}{
		{
			name:     "simple password",
			password: "password123",
		},
		{
			name:     "complex password",
			password: "C0mpl3x!P@ssw0rd#2023",
		},
		{
			name:     "long password",
			password: strings.Repeat("LongPassword!", 10),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Hash password
			hash, err := HashPassword(tt.password)
			if err != nil {
				t.Fatalf("password hashing failed: %v", err)
			}

			// Verify hash is not empty and different from password
			if hash == "" {
				t.Error("hash should not be empty")
			}
			if hash == tt.password {
				t.Error("hash should be different from password")
			}

			// Verify hash format (should contain Argon2 parameters)
			if !strings.Contains(hash, "$argon2id$") {
				t.Error("hash should contain Argon2 identifier")
			}

			// Verify password
			valid, err := VerifyPassword(tt.password, hash)
			if err != nil {
				t.Fatalf("password verification failed: %v", err)
			}
			if !valid {
				t.Error("password verification should succeed")
			}

			// Verify wrong password fails
			valid, err = VerifyPassword("wrong-password", hash)
			if err != nil {
				t.Fatalf("wrong password verification failed: %v", err)
			}
			if valid {
				t.Error("wrong password verification should fail")
			}
		})
	}
}

func TestGenerateSecureToken(t *testing.T) {
	tests := []struct {
		name   string
		length int
	}{
		{
			name:   "short token",
			length: 16,
		},
		{
			name:   "medium token",
			length: 32,
		},
		{
			name:   "long token",
			length: 64,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := GenerateSecureToken(tt.length)
			if err != nil {
				t.Fatalf("token generation failed: %v", err)
			}

			// Verify token is not empty
			if token == "" {
				t.Error("token should not be empty")
			}

			// Generate another token and verify they're different
			token2, err := GenerateSecureToken(tt.length)
			if err != nil {
				t.Fatalf("second token generation failed: %v", err)
			}

			if token == token2 {
				t.Error("consecutive token generations should produce different results")
			}
		})
	}
}

func TestHashSHA256(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{
			name:  "simple input",
			input: "hello world",
		},
		{
			name:  "empty input",
			input: "",
		},
		{
			name:  "complex input",
			input: "Complex input with special chars: !@#$%^&*()",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash := HashSHA256(tt.input)

			// Verify hash is not empty
			if hash == "" {
				t.Error("hash should not be empty")
			}

			// Verify hash is deterministic
			hash2 := HashSHA256(tt.input)
			if hash != hash2 {
				t.Error("SHA256 hash should be deterministic")
			}

			// Verify different inputs produce different hashes
			if tt.input != "" {
				differentHash := HashSHA256(tt.input + "different")
				if hash == differentHash {
					t.Error("different inputs should produce different hashes")
				}
			}
		})
	}
}

func TestEncryptionService_InvalidKey(t *testing.T) {
	// Test with empty key
	_, err := NewEncryptionService("")
	if err == nil {
		t.Error("expected error for empty encryption key")
	}
}

func TestEncryptionService_DecryptInvalidData(t *testing.T) {
	service, err := NewEncryptionService("test-master-key-for-encryption")
	if err != nil {
		t.Fatalf("failed to create encryption service: %v", err)
	}

	tests := []struct {
		name      string
		encrypted string
	}{
		{
			name:      "invalid base64",
			encrypted: "invalid-base64-data!@#",
		},
		{
			name:      "too short data",
			encrypted: "dGVzdA==", // "test" in base64, too short for GCM
		},
		{
			name:      "corrupted data",
			encrypted: "Y29ycnVwdGVkLWRhdGEtdGhhdC1jYW5ub3QtYmUtZGVjcnlwdGVk",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := service.Decrypt(tt.encrypted)
			if err == nil {
				t.Error("expected error for invalid encrypted data")
			}
		})
	}
}
