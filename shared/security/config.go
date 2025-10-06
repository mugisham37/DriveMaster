package security

import (
	"fmt"
	"time"
)

// SecurityConfig represents comprehensive security configuration
type SecurityConfig struct {
	// Encryption settings
	Encryption EncryptionConfig `json:"encryption"`

	// Rate limiting settings
	RateLimit RateLimitSettings `json:"rate_limit"`

	// Input validation settings
	Validation ValidationConfig `json:"validation"`

	// Audit logging settings
	Audit AuditConfig `json:"audit"`

	// Vault settings
	Vault VaultSettings `json:"vault"`

	// TLS settings
	TLS TLSConfig `json:"tls"`

	// CORS settings
	CORS CORSConfig `json:"cors"`

	// Session settings
	Session SessionConfig `json:"session"`
}

// EncryptionConfig represents encryption configuration
type EncryptionConfig struct {
	// Master encryption key (should be loaded from Vault)
	MasterKey string `json:"master_key"`

	// Key rotation interval
	KeyRotationInterval time.Duration `json:"key_rotation_interval"`

	// Enable encryption at rest
	EncryptAtRest bool `json:"encrypt_at_rest"`

	// Enable deterministic encryption for PII
	DeterministicPII bool `json:"deterministic_pii"`

	// Salt for PII encryption
	PIISalt string `json:"pii_salt"`
}

// RateLimitSettings represents rate limiting configuration
type RateLimitSettings struct {
	// Global rate limits
	Global RateLimitRule `json:"global"`

	// Per-endpoint rate limits
	Endpoints map[string]RateLimitRule `json:"endpoints"`

	// Redis configuration for distributed rate limiting
	Redis RedisConfig `json:"redis"`

	// Enable rate limiting
	Enabled bool `json:"enabled"`
}

// RateLimitRule represents a rate limiting rule
type RateLimitRule struct {
	RequestsPerMinute int           `json:"requests_per_minute"`
	BurstSize         int           `json:"burst_size"`
	WindowSize        time.Duration `json:"window_size"`
	BlockDuration     time.Duration `json:"block_duration"`
}

// RedisConfig represents Redis configuration for rate limiting
type RedisConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Password string `json:"password"`
	DB       int    `json:"db"`
}

// ValidationConfig represents input validation configuration
type ValidationConfig struct {
	// Maximum input lengths
	MaxStringLength int `json:"max_string_length"`
	MaxEmailLength  int `json:"max_email_length"`
	MaxJSONSize     int `json:"max_json_size"`

	// Enable strict validation
	StrictMode bool `json:"strict_mode"`

	// Enable SQL injection detection
	SQLInjectionDetection bool `json:"sql_injection_detection"`

	// Enable XSS detection
	XSSDetection bool `json:"xss_detection"`

	// Enable path traversal detection
	PathTraversalDetection bool `json:"path_traversal_detection"`
}

// AuditConfig represents audit logging configuration
type AuditConfig struct {
	// Enable audit logging
	Enabled bool `json:"enabled"`

	// Log to database
	DatabaseLogging bool `json:"database_logging"`

	// Log to file
	FileLogging bool `json:"file_logging"`

	// Log to SIEM
	SIEMLogging bool `json:"siem_logging"`

	// Audit log retention period
	RetentionPeriod time.Duration `json:"retention_period"`

	// Minimum risk score to log
	MinRiskScore float64 `json:"min_risk_score"`

	// SIEM endpoint
	SIEMEndpoint string `json:"siem_endpoint"`
}

// VaultSettings represents Vault configuration
type VaultSettings struct {
	// Enable Vault integration
	Enabled bool `json:"enabled"`

	// Vault address
	Address string `json:"address"`

	// Vault token (should be loaded from environment)
	Token string `json:"token"`

	// Mount path for secrets
	MountPath string `json:"mount_path"`

	// Namespace
	Namespace string `json:"namespace"`

	// Token renewal interval
	TokenRenewalInterval time.Duration `json:"token_renewal_interval"`

	// Secret cache TTL
	SecretCacheTTL time.Duration `json:"secret_cache_ttl"`
}

// TLSConfig represents TLS configuration
type TLSConfig struct {
	// Enable TLS
	Enabled bool `json:"enabled"`

	// Certificate file path
	CertFile string `json:"cert_file"`

	// Private key file path
	KeyFile string `json:"key_file"`

	// CA certificate file path
	CAFile string `json:"ca_file"`

	// Minimum TLS version
	MinVersion string `json:"min_version"`

	// Cipher suites
	CipherSuites []string `json:"cipher_suites"`

	// Enable mutual TLS
	MutualTLS bool `json:"mutual_tls"`
}

// CORSConfig represents CORS configuration
type CORSConfig struct {
	// Allowed origins
	AllowedOrigins []string `json:"allowed_origins"`

	// Allowed methods
	AllowedMethods []string `json:"allowed_methods"`

	// Allowed headers
	AllowedHeaders []string `json:"allowed_headers"`

	// Exposed headers
	ExposedHeaders []string `json:"exposed_headers"`

	// Allow credentials
	AllowCredentials bool `json:"allow_credentials"`

	// Max age for preflight requests
	MaxAge time.Duration `json:"max_age"`
}

// SessionConfig represents session configuration
type SessionConfig struct {
	// Session timeout
	Timeout time.Duration `json:"timeout"`

	// Session cookie name
	CookieName string `json:"cookie_name"`

	// Cookie domain
	CookieDomain string `json:"cookie_domain"`

	// Cookie path
	CookiePath string `json:"cookie_path"`

	// Secure cookie (HTTPS only)
	SecureCookie bool `json:"secure_cookie"`

	// HTTP only cookie
	HTTPOnlyCookie bool `json:"http_only_cookie"`

	// SameSite cookie attribute
	SameSite string `json:"same_site"`
}

// DefaultSecurityConfig returns default security configuration
func DefaultSecurityConfig() *SecurityConfig {
	return &SecurityConfig{
		Encryption: EncryptionConfig{
			KeyRotationInterval: 24 * time.Hour,
			EncryptAtRest:       true,
			DeterministicPII:    true,
		},
		RateLimit: RateLimitSettings{
			Enabled: true,
			Global: RateLimitRule{
				RequestsPerMinute: 100,
				BurstSize:         20,
				WindowSize:        time.Minute,
				BlockDuration:     5 * time.Minute,
			},
			Endpoints: map[string]RateLimitRule{
				"login": {
					RequestsPerMinute: 5,
					BurstSize:         2,
					WindowSize:        15 * time.Minute,
					BlockDuration:     30 * time.Minute,
				},
				"register": {
					RequestsPerMinute: 3,
					BurstSize:         1,
					WindowSize:        time.Hour,
					BlockDuration:     time.Hour,
				},
			},
		},
		Validation: ValidationConfig{
			MaxStringLength:        1000,
			MaxEmailLength:         254,
			MaxJSONSize:            1024 * 1024, // 1MB
			StrictMode:             true,
			SQLInjectionDetection:  true,
			XSSDetection:           true,
			PathTraversalDetection: true,
		},
		Audit: AuditConfig{
			Enabled:         true,
			DatabaseLogging: true,
			FileLogging:     true,
			SIEMLogging:     false,
			RetentionPeriod: 90 * 24 * time.Hour, // 90 days
			MinRiskScore:    0.0,
		},
		Vault: VaultSettings{
			Enabled:              false, // Disabled by default
			MountPath:            "secret",
			TokenRenewalInterval: time.Hour,
			SecretCacheTTL:       5 * time.Minute,
		},
		TLS: TLSConfig{
			Enabled:    true,
			MinVersion: "1.2",
			CipherSuites: []string{
				"TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
				"TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305",
				"TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
			},
			MutualTLS: false,
		},
		CORS: CORSConfig{
			AllowedOrigins:   []string{"https://localhost:3000"},
			AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID"},
			ExposedHeaders:   []string{"X-Request-ID"},
			AllowCredentials: true,
			MaxAge:           24 * time.Hour,
		},
		Session: SessionConfig{
			Timeout:        30 * time.Minute,
			CookieName:     "session_id",
			CookiePath:     "/",
			SecureCookie:   true,
			HTTPOnlyCookie: true,
			SameSite:       "Strict",
		},
	}
}

// LoadSecurityConfig loads security configuration from various sources
func LoadSecurityConfig() (*SecurityConfig, error) {
	// Start with default configuration
	config := DefaultSecurityConfig()

	// TODO: Load from configuration file, environment variables, or Vault
	// This is a simplified implementation

	return config, nil
}

// Validate validates the security configuration
func (c *SecurityConfig) Validate() error {
	// Validate encryption settings
	if c.Encryption.EncryptAtRest && c.Encryption.MasterKey == "" {
		return fmt.Errorf("master encryption key is required when encryption at rest is enabled")
	}

	// Validate rate limiting settings
	if c.RateLimit.Enabled {
		if c.RateLimit.Global.RequestsPerMinute <= 0 {
			return fmt.Errorf("global rate limit requests per minute must be positive")
		}
	}

	// Validate audit settings
	if c.Audit.Enabled {
		if c.Audit.RetentionPeriod <= 0 {
			return fmt.Errorf("audit retention period must be positive")
		}
	}

	// Validate Vault settings
	if c.Vault.Enabled {
		if c.Vault.Address == "" {
			return fmt.Errorf("Vault address is required when Vault is enabled")
		}
	}

	return nil
}
