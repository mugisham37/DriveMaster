package security

import (
	"context"
	"testing"
	"time"

	"github.com/sirupsen/logrus"
)

func TestAuditLogger_LogEvent(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	processor := &TestAuditProcessor{}
	auditLogger := NewAuditLogger(logger, "test-service", processor)

	event := &AuditEvent{
		UserID:    "user123",
		Email:     "test@example.com",
		IPAddress: "192.168.1.1",
		UserAgent: "test-agent",
		Action:    string(ActionLogin),
		Outcome:   AuditOutcomeSuccess,
		Details: map[string]interface{}{
			"test": "data",
		},
	}

	auditLogger.LogEvent(context.Background(), event)

	// Verify event was processed
	if len(processor.Events) != 1 {
		t.Errorf("expected 1 event, got %d", len(processor.Events))
	}

	processedEvent := processor.Events[0]
	if processedEvent.UserID != event.UserID {
		t.Errorf("expected UserID %s, got %s", event.UserID, processedEvent.UserID)
	}
	if processedEvent.Action != event.Action {
		t.Errorf("expected Action %s, got %s", event.Action, processedEvent.Action)
	}
	if processedEvent.Service != "test-service" {
		t.Errorf("expected Service test-service, got %s", processedEvent.Service)
	}
}

func TestAuditLogger_LogAuthentication(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	processor := &TestAuditProcessor{}
	auditLogger := NewAuditLogger(logger, "auth-service", processor)

	ctx := context.Background()
	auditLogger.LogAuthentication(
		ctx,
		ActionLogin,
		"user123",
		"test@example.com",
		"192.168.1.1",
		"test-agent",
		AuditOutcomeSuccess,
		map[string]interface{}{
			"method": "password",
		},
	)

	// Verify event was logged
	if len(processor.Events) != 1 {
		t.Errorf("expected 1 event, got %d", len(processor.Events))
	}

	event := processor.Events[0]
	if event.Action != string(ActionLogin) {
		t.Errorf("expected Action %s, got %s", string(ActionLogin), event.Action)
	}
	if event.Outcome != AuditOutcomeSuccess {
		t.Errorf("expected Outcome %s, got %s", AuditOutcomeSuccess, event.Outcome)
	}
}

func TestAuditLogger_LogSecurityViolation(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	processor := &TestAuditProcessor{}
	auditLogger := NewAuditLogger(logger, "test-service", processor)

	ctx := context.Background()
	auditLogger.LogSecurityViolation(
		ctx,
		ActionSQLInjectionAttempt,
		"192.168.1.100",
		"malicious-agent",
		map[string]interface{}{
			"payload": "'; DROP TABLE users; --",
		},
	)

	// Verify event was logged
	if len(processor.Events) != 1 {
		t.Errorf("expected 1 event, got %d", len(processor.Events))
	}

	event := processor.Events[0]
	if event.Action != string(ActionSQLInjectionAttempt) {
		t.Errorf("expected Action %s, got %s", string(ActionSQLInjectionAttempt), event.Action)
	}
	if event.Outcome != AuditOutcomeBlocked {
		t.Errorf("expected Outcome %s, got %s", AuditOutcomeBlocked, event.Outcome)
	}
	if event.RiskScore != 0.9 {
		t.Errorf("expected RiskScore 0.9, got %f", event.RiskScore)
	}
}

func TestAuditLogger_CalculateAuthRiskScore(t *testing.T) {
	logger := logrus.New()
	processor := &TestAuditProcessor{}
	auditLogger := NewAuditLogger(logger, "test-service", processor)

	tests := []struct {
		name            string
		action          AuditAction
		outcome         AuditOutcome
		details         map[string]interface{}
		expectedMinRisk float64
		expectedMaxRisk float64
	}{
		{
			name:            "successful login",
			action:          ActionLogin,
			outcome:         AuditOutcomeSuccess,
			details:         map[string]interface{}{},
			expectedMinRisk: 0.1,
			expectedMaxRisk: 0.3,
		},
		{
			name:            "failed login",
			action:          ActionLogin,
			outcome:         AuditOutcomeFailure,
			details:         map[string]interface{}{},
			expectedMinRisk: 0.4,
			expectedMaxRisk: 0.6,
		},
		{
			name:    "failed login with multiple attempts",
			action:  ActionLogin,
			outcome: AuditOutcomeFailure,
			details: map[string]interface{}{
				"failed_attempts": 5,
			},
			expectedMinRisk: 0.7,
			expectedMaxRisk: 1.0,
		},
		{
			name:            "MFA disable",
			action:          ActionMFADisable,
			outcome:         AuditOutcomeSuccess,
			details:         map[string]interface{}{},
			expectedMinRisk: 0.5,
			expectedMaxRisk: 0.7,
		},
		{
			name:            "account lock",
			action:          ActionAccountLock,
			outcome:         AuditOutcomeSuccess,
			details:         map[string]interface{}{},
			expectedMinRisk: 0.7,
			expectedMaxRisk: 1.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			riskScore := auditLogger.calculateAuthRiskScore(tt.action, tt.outcome, tt.details)

			if riskScore < tt.expectedMinRisk || riskScore > tt.expectedMaxRisk {
				t.Errorf("expected risk score between %f and %f, got %f",
					tt.expectedMinRisk, tt.expectedMaxRisk, riskScore)
			}
		})
	}
}

func TestAuditLogger_CalculateDataAccessRiskScore(t *testing.T) {
	logger := logrus.New()
	processor := &TestAuditProcessor{}
	auditLogger := NewAuditLogger(logger, "test-service", processor)

	tests := []struct {
		name            string
		action          AuditAction
		outcome         AuditOutcome
		details         map[string]interface{}
		expectedMinRisk float64
		expectedMaxRisk float64
	}{
		{
			name:            "data read",
			action:          ActionDataRead,
			outcome:         AuditOutcomeSuccess,
			details:         map[string]interface{}{},
			expectedMinRisk: 0.0,
			expectedMaxRisk: 0.2,
		},
		{
			name:            "data delete",
			action:          ActionDataDelete,
			outcome:         AuditOutcomeSuccess,
			details:         map[string]interface{}{},
			expectedMinRisk: 0.5,
			expectedMaxRisk: 0.7,
		},
		{
			name:    "bulk data export",
			action:  ActionDataExport,
			outcome: AuditOutcomeSuccess,
			details: map[string]interface{}{
				"record_count": 5000,
			},
			expectedMinRisk: 0.6,
			expectedMaxRisk: 0.8,
		},
		{
			name:    "PII data access",
			action:  ActionDataRead,
			outcome: AuditOutcomeSuccess,
			details: map[string]interface{}{
				"contains_pii": true,
			},
			expectedMinRisk: 0.3,
			expectedMaxRisk: 0.5,
		},
		{
			name:    "bulk PII export",
			action:  ActionDataExport,
			outcome: AuditOutcomeSuccess,
			details: map[string]interface{}{
				"record_count": 2000,
				"contains_pii": true,
			},
			expectedMinRisk: 0.9,
			expectedMaxRisk: 1.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			riskScore := auditLogger.calculateDataAccessRiskScore(tt.action, tt.outcome, tt.details)

			if riskScore < tt.expectedMinRisk || riskScore > tt.expectedMaxRisk {
				t.Errorf("expected risk score between %f and %f, got %f",
					tt.expectedMinRisk, tt.expectedMaxRisk, riskScore)
			}
		})
	}
}

func TestAuditContext(t *testing.T) {
	ctx := context.Background()

	auditCtx := &AuditContext{
		UserID:    "user123",
		Email:     "test@example.com",
		IPAddress: "192.168.1.1",
		UserAgent: "test-agent",
		SessionID: "session123",
		RequestID: "request123",
	}

	// Add audit context to context
	ctxWithAudit := WithAuditContext(ctx, auditCtx)

	// Retrieve audit context
	retrievedCtx := GetAuditContext(ctxWithAudit)

	if retrievedCtx.UserID != auditCtx.UserID {
		t.Errorf("expected UserID %s, got %s", auditCtx.UserID, retrievedCtx.UserID)
	}
	if retrievedCtx.Email != auditCtx.Email {
		t.Errorf("expected Email %s, got %s", auditCtx.Email, retrievedCtx.Email)
	}
	if retrievedCtx.IPAddress != auditCtx.IPAddress {
		t.Errorf("expected IPAddress %s, got %s", auditCtx.IPAddress, retrievedCtx.IPAddress)
	}
}

func TestAuditContext_Empty(t *testing.T) {
	ctx := context.Background()

	// Get audit context from empty context
	auditCtx := GetAuditContext(ctx)

	// Should return empty audit context
	if auditCtx.UserID != "" {
		t.Errorf("expected empty UserID, got %s", auditCtx.UserID)
	}
	if auditCtx.Email != "" {
		t.Errorf("expected empty Email, got %s", auditCtx.Email)
	}
}

// TestAuditProcessor implements AuditProcessor for testing
type TestAuditProcessor struct {
	Events []*AuditEvent
}

func (p *TestAuditProcessor) ProcessEvent(ctx context.Context, event *AuditEvent) error {
	p.Events = append(p.Events, event)
	return nil
}

func TestGenerateAuditID(t *testing.T) {
	id1 := generateAuditID()
	time.Sleep(1 * time.Millisecond) // Ensure different timestamp
	id2 := generateAuditID()

	if id1 == id2 {
		t.Error("consecutive audit ID generations should produce different results")
	}

	if id1 == "" || id2 == "" {
		t.Error("audit IDs should not be empty")
	}
}
