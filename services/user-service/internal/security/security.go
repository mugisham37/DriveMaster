package security

import (
	"context"
	"fmt"
	"os"

	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"user-service/internal/config"
	sharedSecurity "github.com/adaptive-learning-platform/shared/security"
)

// SecurityService provides security functionality for the user service
type SecurityService struct {
	config          *config.Config
	logger          *logrus.Logger
	auditLogger     *sharedSecurity.AuditLogger
	inputSanitizer  *sharedSecurity.InputSanitizer
	encryptionSvc   *sharedSecurity.EncryptionService
	vaultClient     *sharedSecurity.VaultClient
	secretsManager  *sharedSecurity.SecretsManager
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
			