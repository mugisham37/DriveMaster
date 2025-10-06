package security

import (
	"context"
	"fmt"

	"github.com/sirupsen/logrus"
)

// SecurityManager manages all security components
type SecurityManager struct {
	Config         *SecurityConfig
	EncryptionSvc  *EncryptionService
	InputSanitizer *InputSanitizer
	AuditLogger    *AuditLogger
	SecretsManager *SecretsManager
	VaultClient    *VaultClient
	Logger         *logrus.Logger
}

// InitializeSecurity initializes all security components
func InitializeSecurity(logger *logrus.Logger) (*SecurityManager, error) {
	// Load security configuration
	config, err := LoadSecurityConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load security config: %w", err)
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid security config: %w", err)
	}

	// Initialize encryption service
	var encryptionSvc *EncryptionService
	if config.Encryption.MasterKey != "" {
		encryptionSvc, err = NewEncryptionService(config.Encryption.MasterKey)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize encryption service: %w", err)
		}
	}

	// Initialize input sanitizer
	inputSanitizer := NewInputSanitizer()

	// Initialize Vault client if enabled
	var vaultClient *VaultClient
	var secretsManager *SecretsManager
	if config.Vault.Enabled {
		vaultClient, err = InitializeVaultFromEnv(logger)
		if err != nil {
			logger.WithError(err).Warn("Failed to initialize Vault client, continuing without Vault")
		} else {
			// Test Vault connection
			ctx := context.Background()
			if err := vaultClient.IsHealthy(ctx); err != nil {
				logger.WithError(err).Warn("Vault health check failed, continuing without Vault")
				vaultClient = nil
			} else {
				secretsManager = NewSecretsManager(vaultClient, logger)
				logger.Info("Vault client initialized successfully")
			}
		}
	}

	// Initialize audit logger
	auditProcessor := &DatabaseAuditProcessor{} // In production, use actual database
	auditLogger := NewAuditLogger(logger, "security-manager", auditProcessor)

	manager := &SecurityManager{
		Config:         config,
		EncryptionSvc:  encryptionSvc,
		InputSanitizer: inputSanitizer,
		AuditLogger:    auditLogger,
		SecretsManager: secretsManager,
		VaultClient:    vaultClient,
		Logger:         logger,
	}

	logger.Info("Security manager initialized successfully")
	return manager, nil
}

// GetDatabaseURL retrieves database URL with credentials from Vault or environment
func (sm *SecurityManager) GetDatabaseURL(ctx context.Context, serviceName string) (string, error) {
	if sm.SecretsManager != nil {
		// Try to get from Vault first
		secretPath := fmt.Sprintf("database/%s", serviceName)
		dbURL, err := sm.SecretsManager.GetDatabaseURL(ctx, secretPath)
		if err == nil {
			return dbURL, nil
		}
		sm.Logger.WithError(err).Warn("Failed to get database URL from Vault, falling back to environment")
	}

	// Fall back to environment variable
	return LoadFromVaultOrEnv(ctx, sm.SecretsManager, "", "", "DATABASE_URL")
}

// GetRedisURL retrieves Redis URL with credentials from Vault or environment
func (sm *SecurityManager) GetRedisURL(ctx context.Context, serviceName string) (string, error) {
	if sm.SecretsManager != nil {
		// Try to get from Vault first
		secretPath := fmt.Sprintf("redis/%s", serviceName)
		redisURL, err := sm.SecretsManager.GetSecretValue(ctx, secretPath, "url")
		if err == nil {
			return redisURL, nil
		}
		sm.Logger.WithError(err).Warn("Failed to get Redis URL from Vault, falling back to environment")
	}

	// Fall back to environment variable
	return LoadFromVaultOrEnv(ctx, sm.SecretsManager, "", "", "REDIS_URL")
}

// GetJWTSecret retrieves JWT secret from Vault or environment
func (sm *SecurityManager) GetJWTSecret(ctx context.Context) (string, error) {
	return LoadFromVaultOrEnv(ctx, sm.SecretsManager, "jwt", "secret", "JWT_SECRET")
}

// GetEncryptionKey retrieves encryption key from Vault or environment
func (sm *SecurityManager) GetEncryptionKey(ctx context.Context) (string, error) {
	return LoadFromVaultOrEnv(ctx, sm.SecretsManager, "encryption", "master_key", "ENCRYPTION_KEY")
}

// ValidateAndSanitizeInput validates and sanitizes user input
func (sm *SecurityManager) ValidateAndSanitizeInput(input map[string]interface{}) (map[string]interface{}, error) {
	sanitized := make(map[string]interface{})

	for key, value := range input {
		switch v := value.(type) {
		case string:
			sanitizedValue, err := sm.InputSanitizer.ValidateAndSanitizeText(v, sm.Config.Validation.MaxStringLength, key)
			if err != nil {
				return nil, fmt.Errorf("validation failed for field %s: %w", key, err)
			}
			sanitized[key] = sanitizedValue
		case map[string]interface{}:
			// Recursively validate nested objects
			sanitizedNested, err := sm.ValidateAndSanitizeInput(v)
			if err != nil {
				return nil, err
			}
			sanitized[key] = sanitizedNested
		default:
			// For other types, just copy as-is (numbers, booleans, etc.)
			sanitized[key] = v
		}
	}

	return sanitized, nil
}

// EncryptSensitiveData encrypts sensitive data if encryption is enabled
func (sm *SecurityManager) EncryptSensitiveData(data string) (string, error) {
	if sm.EncryptionSvc == nil {
		return data, nil // No encryption configured
	}
	return sm.EncryptionSvc.Encrypt(data)
}

// DecryptSensitiveData decrypts sensitive data if encryption is enabled
func (sm *SecurityManager) DecryptSensitiveData(encryptedData string) (string, error) {
	if sm.EncryptionSvc == nil {
		return encryptedData, nil // No encryption configured
	}
	return sm.EncryptionSvc.Decrypt(encryptedData)
}

// LogSecurityEvent logs a security event
func (sm *SecurityManager) LogSecurityEvent(ctx context.Context, action AuditAction, userID, resource, ipAddress string, outcome AuditOutcome, details map[string]interface{}) {
	auditCtx := GetAuditContext(ctx)

	event := &AuditEvent{
		UserID:    userID,
		Email:     auditCtx.Email,
		IPAddress: ipAddress,
		UserAgent: auditCtx.UserAgent,
		Action:    string(action),
		Resource:  resource,
		Outcome:   outcome,
		Details:   details,
		SessionID: auditCtx.SessionID,
		RequestID: auditCtx.RequestID,
	}

	sm.AuditLogger.LogEvent(ctx, event)
}

// IsRateLimited checks if a request should be rate limited
func (sm *SecurityManager) IsRateLimited(ctx context.Context, key string, endpoint string) bool {
	// This is a simplified implementation
	// In production, use Redis-based rate limiting

	// For now, just log the rate limit check
	sm.Logger.WithFields(logrus.Fields{
		"key":      key,
		"endpoint": endpoint,
	}).Debug("Rate limit check")

	return false // Allow all requests for now
}

// Shutdown gracefully shuts down security components
func (sm *SecurityManager) Shutdown(ctx context.Context) error {
	sm.Logger.Info("Shutting down security manager")

	// Close Vault client if initialized
	if sm.VaultClient != nil {
		// Vault client doesn't need explicit closing
		sm.Logger.Debug("Vault client shutdown")
	}

	return nil
}

// GetSecurityMiddleware returns security middleware for HTTP services
func (sm *SecurityManager) GetSecurityMiddleware() []interface{} {
	var middleware []interface{}

	// Add security headers middleware
	middleware = append(middleware, SecurityHeaders())

	// Add request size limit middleware
	middleware = append(middleware, RequestSizeLimit(10*1024*1024)) // 10MB limit

	// Add input validation middleware
	middleware = append(middleware, InputValidation(sm.Logger))

	// Add CORS middleware
	middleware = append(middleware, SecureCORS(sm.Config.CORS.AllowedOrigins))

	// Add request ID middleware
	middleware = append(middleware, RequestID())

	// Add audit logging middleware
	middleware = append(middleware, AuditLogging(sm.Logger))

	// Add SQL injection protection
	if sm.Config.Validation.SQLInjectionDetection {
		middleware = append(middleware, SQLInjectionProtection(sm.Logger))
	}

	// Add XSS protection
	if sm.Config.Validation.XSSDetection {
		middleware = append(middleware, XSSProtection(sm.Logger))
	}

	return middleware
}

// ValidateServiceConfiguration validates service-specific security configuration
func (sm *SecurityManager) ValidateServiceConfiguration(serviceName string) error {
	sm.Logger.WithField("service", serviceName).Info("Validating service security configuration")

	// Check if required secrets are available
	ctx := context.Background()

	// Validate database access
	if _, err := sm.GetDatabaseURL(ctx, serviceName); err != nil {
		return fmt.Errorf("database configuration validation failed: %w", err)
	}

	// Validate Redis access
	if _, err := sm.GetRedisURL(ctx, serviceName); err != nil {
		return fmt.Errorf("Redis configuration validation failed: %w", err)
	}

	// Validate JWT secret for auth-related services
	if serviceName == "auth-service" || serviceName == "user-service" {
		if _, err := sm.GetJWTSecret(ctx); err != nil {
			return fmt.Errorf("JWT secret validation failed: %w", err)
		}
	}

	sm.Logger.WithField("service", serviceName).Info("Service security configuration validated successfully")
	return nil
}
