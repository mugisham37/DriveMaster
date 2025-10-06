package security

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/sirupsen/logrus"
)

// AuditEvent represents a security audit event
type AuditEvent struct {
	ID        string         `json:"id"`
	Timestamp time.Time      `json:"timestamp"`
	UserID    string         `json:"user_id,omitempty"`
	Email     string         `json:"email,omitempty"`
	IPAddress string         `json:"ip_address"`
	UserAgent string         `json:"user_agent,omitempty"`
	Service   string         `json:"service"`
	Action    string         `json:"action"`
	Resource  string         `json:"resource,omitempty"`
	Outcome   AuditOutcome   `json:"outcome"`
	RiskScore float64        `json:"risk_score"`
	Details   map[string]any `json:"details,omitempty"`
	SessionID string         `json:"session_id,omitempty"`
	RequestID string         `json:"request_id,omitempty"`
	Duration  time.Duration  `json:"duration,omitempty"`
	ErrorCode string         `json:"error_code,omitempty"`
	ErrorMsg  string         `json:"error_message,omitempty"`
}

// AuditOutcome represents the outcome of an audited action
type AuditOutcome string

const (
	AuditOutcomeSuccess AuditOutcome = "success"
	AuditOutcomeFailure AuditOutcome = "failure"
	AuditOutcomeBlocked AuditOutcome = "blocked"
	AuditOutcomeWarning AuditOutcome = "warning"
)

// AuditAction represents different types of auditable actions
type AuditAction string

const (
	// Authentication actions
	ActionLogin          AuditAction = "login"
	ActionLogout         AuditAction = "logout"
	ActionRegister       AuditAction = "register"
	ActionPasswordChange AuditAction = "password_change"
	ActionPasswordReset  AuditAction = "password_reset"
	ActionMFAEnable      AuditAction = "mfa_enable"
	ActionMFADisable     AuditAction = "mfa_disable"
	ActionMFAVerify      AuditAction = "mfa_verify"
	ActionOAuthLink      AuditAction = "oauth_link"
	ActionOAuthUnlink    AuditAction = "oauth_unlink"
	ActionTokenRefresh   AuditAction = "token_refresh"
	ActionTokenRevoke    AuditAction = "token_revoke"
	ActionAccountLock    AuditAction = "account_lock"
	ActionAccountUnlock  AuditAction = "account_unlock"

	// Data access actions
	ActionDataRead   AuditAction = "data_read"
	ActionDataCreate AuditAction = "data_create"
	ActionDataUpdate AuditAction = "data_update"
	ActionDataDelete AuditAction = "data_delete"
	ActionDataExport AuditAction = "data_export"
	ActionDataImport AuditAction = "data_import"

	// Security actions
	ActionSecurityViolation   AuditAction = "security_violation"
	ActionRateLimitExceeded   AuditAction = "rate_limit_exceeded"
	ActionSuspiciousActivity  AuditAction = "suspicious_activity"
	ActionSQLInjectionAttempt AuditAction = "sql_injection_attempt"
	ActionXSSAttempt          AuditAction = "xss_attempt"
	ActionCSRFAttempt         AuditAction = "csrf_attempt"

	// Administrative actions
	ActionAdminAccess      AuditAction = "admin_access"
	ActionConfigChange     AuditAction = "config_change"
	ActionUserManagement   AuditAction = "user_management"
	ActionRoleChange       AuditAction = "role_change"
	ActionPermissionChange AuditAction = "permission_change"

	// Privacy actions
	ActionGDPRRequest       AuditAction = "gdpr_request"
	ActionDataAnonymization AuditAction = "data_anonymization"
	ActionDataRetention     AuditAction = "data_retention"
	ActionConsentChange     AuditAction = "consent_change"
)

// AuditLogger provides comprehensive audit logging capabilities
type AuditLogger struct {
	logger    *logrus.Logger
	service   string
	processor AuditProcessor
}

// AuditProcessor defines interface for processing audit events
type AuditProcessor interface {
	ProcessEvent(ctx context.Context, event *AuditEvent) error
}

// NewAuditLogger creates a new audit logger
func NewAuditLogger(logger *logrus.Logger, service string, processor AuditProcessor) *AuditLogger {
	return &AuditLogger{
		logger:    logger,
		service:   service,
		processor: processor,
	}
}

// LogEvent logs an audit event
func (a *AuditLogger) LogEvent(ctx context.Context, event *AuditEvent) {
	// Set service name
	event.Service = a.service

	// Set timestamp if not provided
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	// Generate ID if not provided
	if event.ID == "" {
		event.ID = generateAuditID()
	}

	// Log to structured logger
	logEntry := a.logger.WithFields(logrus.Fields{
		"audit_id":   event.ID,
		"user_id":    event.UserID,
		"email":      event.Email,
		"ip_address": event.IPAddress,
		"user_agent": event.UserAgent,
		"service":    event.Service,
		"action":     event.Action,
		"resource":   event.Resource,
		"outcome":    event.Outcome,
		"risk_score": event.RiskScore,
		"session_id": event.SessionID,
		"request_id": event.RequestID,
		"duration":   event.Duration,
		"error_code": event.ErrorCode,
		"error_msg":  event.ErrorMsg,
		"details":    event.Details,
	})

	// Log based on outcome and risk score
	switch event.Outcome {
	case AuditOutcomeSuccess:
		if event.RiskScore > 0.5 {
			logEntry.Warn("High-risk successful action")
		} else {
			logEntry.Info("Successful action")
		}
	case AuditOutcomeFailure:
		logEntry.Error("Failed action")
	case AuditOutcomeBlocked:
		logEntry.Warn("Blocked action")
	case AuditOutcomeWarning:
		logEntry.Warn("Warning action")
	default:
		logEntry.Info("Unknown outcome")
	}

	// Process event through processor (e.g., send to SIEM, database, etc.)
	if a.processor != nil {
		if err := a.processor.ProcessEvent(ctx, event); err != nil {
			a.logger.WithError(err).Error("Failed to process audit event")
		}
	}
}

// LogAuthentication logs authentication events
func (a *AuditLogger) LogAuthentication(ctx context.Context, action AuditAction, userID, email, ipAddress, userAgent string, outcome AuditOutcome, details map[string]interface{}) {
	riskScore := a.calculateAuthRiskScore(action, outcome, details)

	event := &AuditEvent{
		UserID:    userID,
		Email:     email,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Action:    string(action),
		Outcome:   outcome,
		RiskScore: riskScore,
		Details:   details,
	}

	a.LogEvent(ctx, event)
}

// LogDataAccess logs data access events
func (a *AuditLogger) LogDataAccess(ctx context.Context, action AuditAction, userID, resource, ipAddress string, outcome AuditOutcome, details map[string]interface{}) {
	riskScore := a.calculateDataAccessRiskScore(action, outcome, details)

	event := &AuditEvent{
		UserID:    userID,
		IPAddress: ipAddress,
		Action:    string(action),
		Resource:  resource,
		Outcome:   outcome,
		RiskScore: riskScore,
		Details:   details,
	}

	a.LogEvent(ctx, event)
}

// LogSecurityViolation logs security violations
func (a *AuditLogger) LogSecurityViolation(ctx context.Context, violation AuditAction, ipAddress, userAgent string, details map[string]interface{}) {
	event := &AuditEvent{
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Action:    string(violation),
		Outcome:   AuditOutcomeBlocked,
		RiskScore: 0.9, // High risk for security violations
		Details:   details,
	}

	a.LogEvent(ctx, event)
}

// LogAdministrativeAction logs administrative actions
func (a *AuditLogger) LogAdministrativeAction(ctx context.Context, action AuditAction, adminUserID, targetResource, ipAddress string, outcome AuditOutcome, details map[string]interface{}) {
	event := &AuditEvent{
		UserID:    adminUserID,
		IPAddress: ipAddress,
		Action:    string(action),
		Resource:  targetResource,
		Outcome:   outcome,
		RiskScore: 0.7, // High risk for admin actions
		Details:   details,
	}

	a.LogEvent(ctx, event)
}

// LogGDPRAction logs GDPR-related actions
func (a *AuditLogger) LogGDPRAction(ctx context.Context, action AuditAction, userID, dataSubject, ipAddress string, outcome AuditOutcome, details map[string]interface{}) {
	event := &AuditEvent{
		UserID:    userID,
		IPAddress: ipAddress,
		Action:    string(action),
		Resource:  dataSubject,
		Outcome:   outcome,
		RiskScore: 0.5, // Medium risk for GDPR actions
		Details:   details,
	}

	a.LogEvent(ctx, event)
}

// calculateAuthRiskScore calculates risk score for authentication events
func (a *AuditLogger) calculateAuthRiskScore(action AuditAction, outcome AuditOutcome, details map[string]interface{}) float64 {
	baseScore := 0.1

	// Increase risk based on action type
	switch action {
	case ActionLogin:
		if outcome == AuditOutcomeFailure {
			baseScore = 0.5
		}
	case ActionPasswordReset:
		baseScore = 0.4
	case ActionMFADisable:
		baseScore = 0.6
	case ActionAccountLock:
		baseScore = 0.8
	}

	// Increase risk based on failure patterns
	if outcome == AuditOutcomeFailure {
		if failedAttempts, ok := details["failed_attempts"].(int); ok && failedAttempts > 3 {
			baseScore += 0.3
		}
	}

	// Cap at 1.0
	if baseScore > 1.0 {
		baseScore = 1.0
	}

	return baseScore
}

// calculateDataAccessRiskScore calculates risk score for data access events
func (a *AuditLogger) calculateDataAccessRiskScore(action AuditAction, outcome AuditOutcome, details map[string]interface{}) float64 {
	baseScore := 0.1

	// Increase risk based on action type
	switch action {
	case ActionDataDelete:
		baseScore = 0.6
	case ActionDataExport:
		baseScore = 0.5
	case ActionDataImport:
		baseScore = 0.4
	}

	// Adjust risk based on outcome
	switch outcome {
	case AuditOutcomeFailure:
		baseScore += 0.2 // Failed operations are more suspicious
	case AuditOutcomeBlocked:
		baseScore += 0.3 // Blocked operations indicate potential threats
	case AuditOutcomeWarning:
		baseScore += 0.1 // Warnings indicate minor issues
	case AuditOutcomeSuccess:
		// No adjustment for successful operations
	}

	// Increase risk for bulk operations
	if recordCount, ok := details["record_count"].(int); ok && recordCount > 1000 {
		baseScore += 0.2
	}

	// Increase risk for sensitive data
	if sensitive, ok := details["contains_pii"].(bool); ok && sensitive {
		baseScore += 0.3
	}

	// Cap at 1.0
	if baseScore > 1.0 {
		baseScore = 1.0
	}

	return baseScore
}

// DatabaseAuditProcessor processes audit events to database
type DatabaseAuditProcessor struct {
	// Database connection would go here
	// For now, just implement the interface
}

// ProcessEvent processes an audit event to database
func (d *DatabaseAuditProcessor) ProcessEvent(ctx context.Context, event *AuditEvent) error {
	// In a real implementation, this would save to database
	// For now, just serialize to JSON for demonstration
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal audit event: %w", err)
	}

	// Log the JSON representation
	fmt.Printf("AUDIT_EVENT: %s\n", string(eventJSON))

	return nil
}

// generateAuditID generates a unique audit event ID
func generateAuditID() string {
	return fmt.Sprintf("audit_%d_%d", time.Now().Unix(), time.Now().Nanosecond())
}

// AuditContextKey is a custom type for context keys to avoid collisions
type AuditContextKey string

const auditContextKey AuditContextKey = "audit_context"

// AuditContext provides audit context for requests
type AuditContext struct {
	UserID    string
	Email     string
	IPAddress string
	UserAgent string
	SessionID string
	RequestID string
	Resource  string
}

// GetAuditContext extracts audit context from request context
func GetAuditContext(ctx context.Context) *AuditContext {
	if auditCtx, ok := ctx.Value(auditContextKey).(*AuditContext); ok {
		return auditCtx
	}
	return &AuditContext{}
}

// WithAuditContext adds audit context to request context
func WithAuditContext(ctx context.Context, auditCtx *AuditContext) context.Context {
	return context.WithValue(ctx, auditContextKey, auditCtx)
}
