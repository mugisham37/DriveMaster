package security

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"shared/security"
)

// SecurityInterceptor provides gRPC security interceptors
type SecurityInterceptor struct {
	securityManager *security.SecurityManager
	logger          *logrus.Logger
}

// NewSecurityInterceptor creates a new security interceptor
func NewSecurityInterceptor(securityManager *security.SecurityManager, logger *logrus.Logger) *SecurityInterceptor {
	return &SecurityInterceptor{
		securityManager: securityManager,
		logger:          logger,
	}
}

// UnaryServerInterceptor provides security for unary gRPC calls
func (s *SecurityInterceptor) UnaryServerInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()

		// Extract metadata
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.InvalidArgument, "missing metadata")
		}

		// Create audit context
		auditCtx := s.createAuditContext(md, info.FullMethod)
		ctx = security.WithAuditContext(ctx, auditCtx)

		// Validate input
		if err := s.validateRequest(req, info.FullMethod); err != nil {
			s.logSecurityViolation(ctx, security.ActionSecurityViolation, info.FullMethod, err)
			return nil, status.Error(codes.InvalidArgument, "invalid request")
		}

		// Check rate limiting
		clientKey := s.getClientKey(auditCtx)
		if s.securityManager.IsRateLimited(ctx, clientKey, info.FullMethod) {
			s.logSecurityViolation(ctx, security.ActionRateLimitExceeded, info.FullMethod, fmt.Errorf("rate limit exceeded"))
			return nil, status.Error(codes.ResourceExhausted, "rate limit exceeded")
		}

		// Call handler
		resp, err := handler(ctx, req)

		// Log audit event
		duration := time.Since(start)
		outcome := security.AuditOutcomeSuccess
		if err != nil {
			outcome = security.AuditOutcomeFailure
		}

		s.securityManager.LogSecurityEvent(ctx, security.ActionDataRead, auditCtx.UserID, info.FullMethod, auditCtx.IPAddress, outcome, map[string]interface{}{
			"method":   info.FullMethod,
			"duration": duration.Milliseconds(),
		})

		return resp, err
	}
}

// StreamServerInterceptor provides security for streaming gRPC calls
func (s *SecurityInterceptor) StreamServerInterceptor() grpc.StreamServerInterceptor {
	return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		// Extract metadata
		md, ok := metadata.FromIncomingContext(ss.Context())
		if !ok {
			return status.Error(codes.InvalidArgument, "missing metadata")
		}

		// Create audit context
		auditCtx := s.createAuditContext(md, info.FullMethod)
		ctx := security.WithAuditContext(ss.Context(), auditCtx)

		// Check rate limiting
		clientKey := s.getClientKey(auditCtx)
		if s.securityManager.IsRateLimited(ctx, clientKey, info.FullMethod) {
			s.logSecurityViolation(ctx, security.ActionRateLimitExceeded, info.FullMethod, fmt.Errorf("rate limit exceeded"))
			return status.Error(codes.ResourceExhausted, "rate limit exceeded")
		}

		// Wrap stream with security context
		wrappedStream := &securityServerStream{
			ServerStream: ss,
			ctx:          ctx,
		}

		// Call handler
		err := handler(srv, wrappedStream)

		// Log audit event
		outcome := security.AuditOutcomeSuccess
		if err != nil {
			outcome = security.AuditOutcomeFailure
		}

		s.securityManager.LogSecurityEvent(ctx, security.ActionDataRead, auditCtx.UserID, info.FullMethod, auditCtx.IPAddress, outcome, map[string]interface{}{
			"method": info.FullMethod,
			"stream": true,
		})

		return err
	}
}

// createAuditContext creates audit context from gRPC metadata
func (s *SecurityInterceptor) createAuditContext(md metadata.MD, method string) *security.AuditContext {
	auditCtx := &security.AuditContext{}

	// Set the method being called for audit purposes
	auditCtx.Resource = method

	// Extract user ID
	if userIDs := md.Get("user-id"); len(userIDs) > 0 {
		auditCtx.UserID = userIDs[0]
	}

	// Extract email
	if emails := md.Get("user-email"); len(emails) > 0 {
		auditCtx.Email = emails[0]
	}

	// Extract IP address
	if ips := md.Get("x-forwarded-for"); len(ips) > 0 {
		auditCtx.IPAddress = strings.Split(ips[0], ",")[0]
	} else if ips := md.Get("x-real-ip"); len(ips) > 0 {
		auditCtx.IPAddress = ips[0]
	}

	// Extract user agent
	if userAgents := md.Get("user-agent"); len(userAgents) > 0 {
		auditCtx.UserAgent = userAgents[0]
	}

	// Extract session ID
	if sessionIDs := md.Get("session-id"); len(sessionIDs) > 0 {
		auditCtx.SessionID = sessionIDs[0]
	}

	// Extract request ID
	if requestIDs := md.Get("x-request-id"); len(requestIDs) > 0 {
		auditCtx.RequestID = requestIDs[0]
	}

	return auditCtx
}

// validateRequest validates the incoming request
func (s *SecurityInterceptor) validateRequest(req interface{}, method string) error {
	// Convert request to map for validation
	// This is a simplified implementation - in practice, you'd use reflection
	// or protocol buffer reflection to validate fields

	// For now, just check if request is not nil
	if req == nil {
		return fmt.Errorf("request cannot be nil for method %s", method)
	}

	// Add method-specific validation if needed
	switch method {
	case "/user.UserService/CreateUser":
		// Could add specific validation for user creation
		s.logger.Debug("Validating user creation request")
	case "/user.UserService/UpdateUser":
		// Could add specific validation for user updates
		s.logger.Debug("Validating user update request")
	default:
		s.logger.Debug("Validating generic request", "method", method)
	}

	return nil
}

// getClientKey generates a client key for rate limiting
func (s *SecurityInterceptor) getClientKey(auditCtx *security.AuditContext) string {
	if auditCtx.UserID != "" {
		return fmt.Sprintf("user:%s", auditCtx.UserID)
	}
	if auditCtx.IPAddress != "" {
		return fmt.Sprintf("ip:%s", auditCtx.IPAddress)
	}
	return "anonymous"
}

// logSecurityViolation logs security violations
func (s *SecurityInterceptor) logSecurityViolation(ctx context.Context, action security.AuditAction, resource string, err error) {
	auditCtx := security.GetAuditContext(ctx)
	s.securityManager.LogSecurityEvent(ctx, action, auditCtx.UserID, resource, auditCtx.IPAddress, security.AuditOutcomeBlocked, map[string]interface{}{
		"error": err.Error(),
	})
}

// securityServerStream wraps grpc.ServerStream with security context
type securityServerStream struct {
	grpc.ServerStream
	ctx context.Context
}

func (s *securityServerStream) Context() context.Context {
	return s.ctx
}
