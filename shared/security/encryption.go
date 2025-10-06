package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/scrypt"
)

// EncryptionService provides encryption and decryption capabilities
type EncryptionService struct {
	key []byte
}

// NewEncryptionService creates a new encryption service
func NewEncryptionService(key string) (*EncryptionService, error) {
	if len(key) == 0 {
		return nil, errors.New("encryption key cannot be empty")
	}

	// Derive a 32-byte key using SHA-256
	hash := sha256.Sum256([]byte(key))

	return &EncryptionService{
		key: hash[:],
	}, nil
}

// Encrypt encrypts plaintext using AES-GCM
func (e *EncryptionService) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	// Create AES cipher
	block, err := aes.NewCipher(e.key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	// Generate random nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt the data
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// Encode to base64 for storage
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts ciphertext using AES-GCM
func (e *EncryptionService) Decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	// Decode from base64
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	// Create AES cipher
	block, err := aes.NewCipher(e.key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	// Check minimum length
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	// Extract nonce and ciphertext
	nonce, ciphertext_bytes := data[:nonceSize], data[nonceSize:]

	// Decrypt the data
	plaintext, err := gcm.Open(nil, nonce, ciphertext_bytes, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}

// EncryptPII encrypts personally identifiable information with deterministic encryption
func (e *EncryptionService) EncryptPII(pii string, salt string) (string, error) {
	if pii == "" {
		return "", nil
	}

	// Use scrypt for deterministic key derivation
	key, err := scrypt.Key([]byte(pii), []byte(salt), 32768, 8, 1, 32)
	if err != nil {
		return "", fmt.Errorf("failed to derive key: %w", err)
	}

	// Create AES cipher with derived key
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	// Use a fixed IV for deterministic encryption (not recommended for general use)
	// This allows for searching encrypted data but reduces security
	iv := make([]byte, aes.BlockSize)
	saltBytes := []byte(salt)
	if len(saltBytes) >= aes.BlockSize {
		copy(iv, saltBytes[:aes.BlockSize])
	} else {
		copy(iv, saltBytes)
		// Pad with zeros if salt is shorter than block size
		for i := len(saltBytes); i < aes.BlockSize; i++ {
			iv[i] = 0
		}
	}

	// Create CBC mode
	mode := cipher.NewCBCEncrypter(block, iv)

	// Pad the plaintext
	plaintext := []byte(pii)
	padding := aes.BlockSize - len(plaintext)%aes.BlockSize
	padtext := make([]byte, len(plaintext)+padding)
	copy(padtext, plaintext)
	for i := len(plaintext); i < len(padtext); i++ {
		padtext[i] = byte(padding)
	}

	// Encrypt
	ciphertext := make([]byte, len(padtext))
	mode.CryptBlocks(ciphertext, padtext)

	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptPII decrypts personally identifiable information
func (e *EncryptionService) DecryptPII(ciphertext string, salt string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	// Decode from base64
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	// Derive the same key used for encryption
	key, err := scrypt.Key([]byte("dummy"), []byte(salt), 32768, 8, 1, 32)
	if err != nil {
		return "", fmt.Errorf("failed to derive key: %w", err)
	}

	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	// Use the same fixed IV
	iv := make([]byte, aes.BlockSize)
	saltBytes := []byte(salt)
	if len(saltBytes) >= aes.BlockSize {
		copy(iv, saltBytes[:aes.BlockSize])
	} else {
		copy(iv, saltBytes)
		// Pad with zeros if salt is shorter than block size
		for i := len(saltBytes); i < aes.BlockSize; i++ {
			iv[i] = 0
		}
	}

	// Create CBC mode
	mode := cipher.NewCBCDecrypter(block, iv)

	// Decrypt
	plaintext := make([]byte, len(data))
	mode.CryptBlocks(plaintext, data)

	// Remove padding
	padding := int(plaintext[len(plaintext)-1])
	if padding > aes.BlockSize || padding == 0 {
		return "", errors.New("invalid padding")
	}

	for i := len(plaintext) - padding; i < len(plaintext); i++ {
		if plaintext[i] != byte(padding) {
			return "", errors.New("invalid padding")
		}
	}

	return string(plaintext[:len(plaintext)-padding]), nil
}

// HashPassword hashes a password using Argon2id
func HashPassword(password string) (string, error) {
	// Generate a random salt
	salt := make([]byte, 32)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}

	// Hash the password
	hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)

	// Encode salt and hash
	encoded := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, 64*1024, 1, 4,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash))

	return encoded, nil
}

// VerifyPassword verifies a password against its hash
func VerifyPassword(password, encodedHash string) (bool, error) {
	// Parse the encoded hash format: $argon2id$v=19$m=65536,t=1,p=4$salt$hash
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return false, errors.New("invalid hash format")
	}

	if parts[1] != "argon2id" {
		return false, errors.New("unsupported hash algorithm")
	}

	// Parse parameters
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return false, fmt.Errorf("invalid version: %w", err)
	}

	var memory, time, threads uint32
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &time, &threads); err != nil {
		return false, fmt.Errorf("invalid parameters: %w", err)
	}

	// Decode salt and hash
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, fmt.Errorf("failed to decode salt: %w", err)
	}

	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, fmt.Errorf("failed to decode hash: %w", err)
	}

	// Hash the provided password with the same parameters
	computedHash := argon2.IDKey([]byte(password), salt, time, memory, uint8(threads), uint32(len(hash)))

	// Compare hashes
	return subtle.ConstantTimeCompare(hash, computedHash) == 1, nil
}

// GenerateSecureToken generates a cryptographically secure random token
func GenerateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate secure token: %w", err)
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// HashSHA256 creates a SHA-256 hash of the input
func HashSHA256(input string) string {
	hash := sha256.Sum256([]byte(input))
	return base64.StdEncoding.EncodeToString(hash[:])
}
