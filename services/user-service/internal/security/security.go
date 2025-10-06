package security

import (
	"context"
	"fmt"
	"os"

	"github.com/sirupsen/logrus"

	sharedSecurity "shared/security"
	"user-service/internal/config"
)

// SecurityService provides security functionality for the user service
type SecurityService struct {
	config         *config.Config
	logger         *logrus.Logger
	auditLogger    *sharedSecurity.AuditLogger
	inputSanitizer *sharedSecurity.InputSanitizer
	encryptionSvc  *sharedSecurity.EncryptionService
	vaultClient    *sharedSecurity.VaultClient
	secretsManager *sharedSecurity.SecretsManager
}

// NewSecurityService creates a new security service
func NewSecurityService(cfg *config.Config, logger *logrus.Logger) (*SecurityService, error) {
	// Initialize input sanitizer
	inputSanitizer := sharedSecurity.NewInputSanitizer()

	// Initialize encryption service
	encryptionKey := os.Getenv("ENCRYPTION_KEY")
	if encryptionKey == "" {
		return nil, fmt.Errorf("ENCRYPTION_KEY environment variable not set")
	}

	encryptionSvc, err := sharedSecurity.NewEncryptionService(encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize encryption service: %w", err)
	}

	// Initialize Vault client if configured
	var vaultClient *sharedSecurity.VaultClient
	var secretsManager *sharedSecurity.SecretsManager

	if os.Getenv("VAULT_ADDR") != "" {
		vaultClient, err = sharedSecurity.InitializeVaultFromEnv(logger)
		if err != nil {
			logger.WithError(err).Warn("Failed to initialize Vault client, continuing without Vault")
		} else {
			secretsManager = sharedSecurity.NewSecretsManager(vaultClient, logger)
		}
	}

	// Initialize audit logger
	auditProcessor := &sharedSecurity.DatabaseAuditProcessor{}
	auditLogger := sharedSecurity.NewAuditLogger(logger, "user-service", auditProcessor)

	return &SecurityService{
		config:         cfg,
		logger:         logger,
		auditLogger:    auditLogger,
		inputSanitizer: inputSanitizer,
		encryptionSvc:  encryptionSvc,
		vaultClient:    vaultClient,
		secretsManager: secretsManager,
	}, nil
}

// ValidateAndSanitizeUserInput validates and sanitizes user input
func (s *SecurityService) ValidateAndSanitizeUserInput(input map[string]interface{}) (map[string]interface{}, error) {
	sanitized := make(map[string]interface{})

	for key, value := range input {
		switch v := value.(type) {
		case string:
			// Validate and sanitize string inputs
			sanitizedValue, err := s.inputSanitizer.ValidateAndSanitizeText(v, 1000, key)
			if err != nil {
				return nil, fmt.Errorf("validation failed for field %s: %w", key, err)
			}
			sanitized[key] = sanitizedValue
		case int, int32, int64, float32, float64:
			// Numeric values are generally safe, but validate ranges if needed
			sanitized[key] = value
		case bool:
			// Boolean values are safe
			sanitized[key] = value
		default:
			// For complex types, convert to string and sanitize
			strValue := fmt.Sprintf("%v", value)
			sanitizedValue, err := s.inputSanitizer.ValidateAndSanitizeText(strValue, 1000, key)
			if err != nil {
				return nil, fmt.Errorf("validation failed for field %s: %w", key, err)
			}
			sanitized[key] = sanitizedValue
		}
	}

	return sanitized, nil
}

// EncryptSensitiveData encrypts sensitive data before storage
func (s *SecurityService) EncryptSensitiveData(data string) (string, error) {
	return s.encryptionSvc.Encrypt(data)
}

// DecryptSensitiveData decrypts sensitive data after retrieval
func (s *SecurityService) DecryptSensitiveData(encryptedData string) (string, error) {
	return s.encryptionSvc.Decrypt(encryptedData)
}

// LogSecurityEvent logs security-related events for audit purposes
func (s *SecurityService) LogSecurityEvent(ctx context.Context, eventType, description string, metadata map[string]interface{}) {
	event := &sharedSecurity.AuditEvent{
		Action:    eventType,
		Resource:  description,
		Outcome:   sharedSecurity.AuditOutcomeSuccess,
		Details:   metadata,
		RiskScore: 0.1, // Default low risk score
	}
	s.auditLogger.LogEvent(ctx, event)
}
