package security

import (
	"context"
	"fmt"
	"os"
	"path"
	"time"

	"github.com/hashicorp/vault/api"
	"github.com/sirupsen/logrus"
)

// VaultConfig represents Vault configuration
type VaultConfig struct {
	Address    string
	Token      string
	MountPath  string
	Namespace  string
	TLSConfig  *api.TLSConfig
	MaxRetries int
	Timeout    time.Duration
}

// VaultClient wraps HashiCorp Vault client with additional functionality
type VaultClient struct {
	client *api.Client
	config *VaultConfig
	logger *logrus.Logger
}

// SecretData represents secret data from Vault
type SecretData struct {
	Data     map[string]interface{}
	Metadata map[string]interface{}
	Version  int
}

// NewVaultClient creates a new Vault client
func NewVaultClient(config *VaultConfig, logger *logrus.Logger) (*VaultClient, error) {
	// Create Vault client configuration
	vaultConfig := api.DefaultConfig()
	vaultConfig.Address = config.Address
	vaultConfig.MaxRetries = config.MaxRetries
	vaultConfig.Timeout = config.Timeout

	if config.TLSConfig != nil {
		vaultConfig.ConfigureTLS(config.TLSConfig)
	}

	// Create client
	client, err := api.NewClient(vaultConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Vault client: %w", err)
	}

	// Set token
	client.SetToken(config.Token)

	// Set namespace if provided
	if config.Namespace != "" {
		client.SetNamespace(config.Namespace)
	}

	return &VaultClient{
		client: client,
		config: config,
		logger: logger,
	}, nil
}

// GetSecret retrieves a secret from Vault
func (v *VaultClient) GetSecret(ctx context.Context, secretPath string) (*SecretData, error) {
	fullPath := path.Join(v.config.MountPath, secretPath)

	v.logger.WithField("path", fullPath).Debug("Retrieving secret from Vault")

	// Read secret
	secret, err := v.client.Logical().ReadWithContext(ctx, fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read secret from Vault: %w", err)
	}

	if secret == nil {
		return nil, fmt.Errorf("secret not found at path: %s", fullPath)
	}

	// Handle KV v2 secrets engine format
	var data map[string]interface{}
	var metadata map[string]interface{}
	var version int

	if secret.Data["data"] != nil {
		// KV v2 format
		if dataMap, ok := secret.Data["data"].(map[string]interface{}); ok {
			data = dataMap
		}
		if metadataMap, ok := secret.Data["metadata"].(map[string]interface{}); ok {
			metadata = metadataMap
			if v, ok := metadata["version"].(int); ok {
				version = v
			}
		}
	} else {
		// KV v1 format
		data = secret.Data
	}

	return &SecretData{
		Data:     data,
		Metadata: metadata,
		Version:  version,
	}, nil
}

// PutSecret stores a secret in Vault
func (v *VaultClient) PutSecret(ctx context.Context, secretPath string, data map[string]interface{}) error {
	fullPath := path.Join(v.config.MountPath, secretPath)

	v.logger.WithField("path", fullPath).Debug("Storing secret in Vault")

	// Prepare data for KV v2 format
	secretData := map[string]interface{}{
		"data": data,
	}

	// Write secret
	_, err := v.client.Logical().WriteWithContext(ctx, fullPath, secretData)
	if err != nil {
		return fmt.Errorf("failed to write secret to Vault: %w", err)
	}

	return nil
}

// DeleteSecret deletes a secret from Vault
func (v *VaultClient) DeleteSecret(ctx context.Context, secretPath string) error {
	fullPath := path.Join(v.config.MountPath, secretPath)

	v.logger.WithField("path", fullPath).Debug("Deleting secret from Vault")

	// Delete secret
	_, err := v.client.Logical().DeleteWithContext(ctx, fullPath)
	if err != nil {
		return fmt.Errorf("failed to delete secret from Vault: %w", err)
	}

	return nil
}

// GetDatabaseCredentials retrieves database credentials from Vault
func (v *VaultClient) GetDatabaseCredentials(ctx context.Context, role string) (*DatabaseCredentials, error) {
	secretPath := fmt.Sprintf("database/creds/%s", role)

	secret, err := v.GetSecret(ctx, secretPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get database credentials: %w", err)
	}

	username, ok := secret.Data["username"].(string)
	if !ok {
		return nil, fmt.Errorf("username not found in secret")
	}

	password, ok := secret.Data["password"].(string)
	if !ok {
		return nil, fmt.Errorf("password not found in secret")
	}

	return &DatabaseCredentials{
		Username: username,
		Password: password,
	}, nil
}

// RenewToken renews the Vault token
func (v *VaultClient) RenewToken(ctx context.Context) error {
	v.logger.Debug("Renewing Vault token")

	// Renew token
	secret, err := v.client.Auth().Token().RenewSelfWithContext(ctx, 0)
	if err != nil {
		return fmt.Errorf("failed to renew Vault token: %w", err)
	}

	v.logger.WithField("lease_duration", secret.Auth.LeaseDuration).Info("Vault token renewed")

	return nil
}

// IsHealthy checks if Vault is healthy
func (v *VaultClient) IsHealthy(ctx context.Context) error {
	health, err := v.client.Sys().HealthWithContext(ctx)
	if err != nil {
		return fmt.Errorf("failed to check Vault health: %w", err)
	}

	if !health.Initialized {
		return fmt.Errorf("Vault is not initialized")
	}

	if health.Sealed {
		return fmt.Errorf("Vault is sealed")
	}

	return nil
}

// DatabaseCredentials represents database credentials from Vault
type DatabaseCredentials struct {
	Username string
	Password string
}

// SecretsManager provides high-level secrets management
type SecretsManager struct {
	vault  *VaultClient
	cache  map[string]*cachedSecret
	logger *logrus.Logger
}

type cachedSecret struct {
	data      *SecretData
	expiresAt time.Time
}

// NewSecretsManager creates a new secrets manager
func NewSecretsManager(vault *VaultClient, logger *logrus.Logger) *SecretsManager {
	return &SecretsManager{
		vault:  vault,
		cache:  make(map[string]*cachedSecret),
		logger: logger,
	}
}

// GetSecret retrieves a secret with caching
func (s *SecretsManager) GetSecret(ctx context.Context, secretPath string) (*SecretData, error) {
	// Check cache first
	if cached, ok := s.cache[secretPath]; ok && time.Now().Before(cached.expiresAt) {
		s.logger.WithField("path", secretPath).Debug("Retrieved secret from cache")
		return cached.data, nil
	}

	// Retrieve from Vault
	secret, err := s.vault.GetSecret(ctx, secretPath)
	if err != nil {
		return nil, err
	}

	// Cache for 5 minutes
	s.cache[secretPath] = &cachedSecret{
		data:      secret,
		expiresAt: time.Now().Add(5 * time.Minute),
	}

	return secret, nil
}

// GetSecretValue retrieves a specific value from a secret
func (s *SecretsManager) GetSecretValue(ctx context.Context, secretPath, key string) (string, error) {
	secret, err := s.GetSecret(ctx, secretPath)
	if err != nil {
		return "", err
	}

	value, ok := secret.Data[key].(string)
	if !ok {
		return "", fmt.Errorf("key '%s' not found in secret or not a string", key)
	}

	return value, nil
}

// GetDatabaseURL constructs a database URL from Vault secrets
func (s *SecretsManager) GetDatabaseURL(ctx context.Context, secretPath string) (string, error) {
	secret, err := s.GetSecret(ctx, secretPath)
	if err != nil {
		return "", err
	}

	host, _ := secret.Data["host"].(string)
	port, _ := secret.Data["port"].(string)
	database, _ := secret.Data["database"].(string)
	username, _ := secret.Data["username"].(string)
	password, _ := secret.Data["password"].(string)

	if host == "" || database == "" || username == "" || password == "" {
		return "", fmt.Errorf("incomplete database configuration in secret")
	}

	if port == "" {
		port = "5432" // Default PostgreSQL port
	}

	return fmt.Sprintf("postgresql://%s:%s@%s:%s/%s", username, password, host, port, database), nil
}

// LoadFromVaultOrEnv loads a value from Vault or falls back to environment variable
func LoadFromVaultOrEnv(ctx context.Context, secretsManager *SecretsManager, vaultPath, vaultKey, envVar string) (string, error) {
	// Try Vault first
	if secretsManager != nil && vaultPath != "" && vaultKey != "" {
		value, err := secretsManager.GetSecretValue(ctx, vaultPath, vaultKey)
		if err == nil {
			return value, nil
		}
		// Log error but continue to environment variable
		fmt.Printf("Failed to load from Vault (path: %s, key: %s): %v\n", vaultPath, vaultKey, err)
	}

	// Fall back to environment variable
	value := os.Getenv(envVar)
	if value == "" {
		return "", fmt.Errorf("value not found in Vault or environment variable %s", envVar)
	}

	return value, nil
}

// InitializeVaultFromEnv initializes Vault client from environment variables
func InitializeVaultFromEnv(logger *logrus.Logger) (*VaultClient, error) {
	address := os.Getenv("VAULT_ADDR")
	if address == "" {
		return nil, fmt.Errorf("VAULT_ADDR environment variable not set")
	}

	token := os.Getenv("VAULT_TOKEN")
	if token == "" {
		return nil, fmt.Errorf("VAULT_TOKEN environment variable not set")
	}

	config := &VaultConfig{
		Address:    address,
		Token:      token,
		MountPath:  getEnvOrDefault("VAULT_MOUNT_PATH", "secret"),
		Namespace:  os.Getenv("VAULT_NAMESPACE"),
		MaxRetries: 3,
		Timeout:    30 * time.Second,
	}

	// Configure TLS if needed
	if os.Getenv("VAULT_SKIP_VERIFY") == "true" {
		config.TLSConfig = &api.TLSConfig{
			Insecure: true,
		}
	}

	return NewVaultClient(config, logger)
}

// getEnvOrDefault returns environment variable value or default
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// SecretRotator handles automatic secret rotation
type SecretRotator struct {
	secretsManager *SecretsManager
	rotationPaths  []string
	interval       time.Duration
	logger         *logrus.Logger
	stopChan       chan struct{}
}

// NewSecretRotator creates a new secret rotator
func NewSecretRotator(secretsManager *SecretsManager, rotationPaths []string, interval time.Duration, logger *logrus.Logger) *SecretRotator {
	return &SecretRotator{
		secretsManager: secretsManager,
		rotationPaths:  rotationPaths,
		interval:       interval,
		logger:         logger,
		stopChan:       make(chan struct{}),
	}
}

// Start starts the secret rotation process
func (r *SecretRotator) Start(ctx context.Context) {
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			r.rotateSecrets(ctx)
		case <-r.stopChan:
			return
		case <-ctx.Done():
			return
		}
	}
}

// Stop stops the secret rotation process
func (r *SecretRotator) Stop() {
	close(r.stopChan)
}

// rotateSecrets rotates secrets that need rotation
func (r *SecretRotator) rotateSecrets(ctx context.Context) {
	for _, secretPath := range r.rotationPaths {
		if err := r.rotateSecret(ctx, secretPath); err != nil {
			r.logger.WithError(err).WithField("path", secretPath).Error("Failed to rotate secret")
		}
	}
}

// rotateSecret rotates a specific secret
func (r *SecretRotator) rotateSecret(ctx context.Context, secretPath string) error {
	// This is a simplified implementation
	// In practice, you would check if rotation is needed based on metadata
	r.logger.WithField("path", secretPath).Info("Checking secret rotation")

	// Clear cache to force refresh
	delete(r.secretsManager.cache, secretPath)

	return nil
}
