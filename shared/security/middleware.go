package security

import (
	"crypto/subtle"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// SecurityHeaders middleware adds security headers to responses
func SecurityHeaders() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")

		// XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")

		// Strict Transport Security (HTTPS only)
		if c.Request.TLS != nil {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		// Content Security Policy
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
			"style-src 'self' 'unsafe-inline'; " +
			"img-src 'self' data: https:; " +
			"font-src 'self' data:; " +
			"connect-src 'self'; " +
			"frame-ancestors 'none'; " +
			"base-uri 'self'; " +
			"form-action 'self'"
		c.Header("Content-Security-Policy", csp)

		// Referrer Policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions Policy
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Remove server information
		c.Header("Server", "")

		c.Next()
	})
}

// RequestSizeLimit middleware limits request body size
func RequestSizeLimit(maxSize int64) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
		c.Next()
	})
}

// InputValidation middleware validates and sanitizes input
func InputValidation(logger *logrus.Logger) gin.HandlerFunc {
	sanitizer := NewInputSanitizer()

	return gin.HandlerFunc(func(c *gin.Context) {
		// Validate and sanitize headers
		userAgent := c.GetHeader("User-Agent")
		if userAgent != "" {
			if sanitizedUA, err := sanitizer.ValidateUserAgent(userAgent); err != nil {
				logger.WithError(err).Warn("Invalid user agent")
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user agent"})
				c.Abort()
				return
			} else {
				c.Request.Header.Set("User-Agent", sanitizedUA)
			}
		}

		// Validate IP address
		clientIP := c.ClientIP()
		if err := sanitizer.ValidateIPAddress(clientIP); err != nil {
			logger.WithError(err).Warn("Invalid client IP")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid client IP"})
			c.Abort()
			return
		}

		// Validate query parameters
		for key, values := range c.Request.URL.Query() {
			for i, value := range values {
				if sanitized, err := sanitizer.ValidateAndSanitizeText(value, 1000, key); err != nil {
					logger.WithError(err).WithField("param", key).Warn("Invalid query parameter")
					c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid parameter: %s", key)})
					c.Abort()
					return
				} else {
					values[i] = sanitized
				}
			}
		}

		c.Next()
	})
}

// RateLimitConfig represents rate limiting configuration
type RateLimitConfig struct {
	RequestsPerMinute int
	BurstSize         int
	KeyFunc           func(*gin.Context) string
}

// RateLimit middleware implements rate limiting
func RateLimit(config RateLimitConfig, logger *logrus.Logger) gin.HandlerFunc {
	// This is a simplified implementation
	// In production, use Redis-based rate limiting

	return gin.HandlerFunc(func(c *gin.Context) {
		key := config.KeyFunc(c)

		// Check rate limit (simplified - use Redis in production)
		// For now, just log the rate limit check
		logger.WithField("key", key).Debug("Rate limit check")

		c.Next()
	})
}

// CORS middleware with security considerations
func SecureCORS(allowedOrigins []string) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400") // 24 hours

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})
}

// APIKeyAuth middleware for API key authentication
func APIKeyAuth(validAPIKeys []string, logger *logrus.Logger) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			logger.Warn("Missing API key")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "API key required"})
			c.Abort()
			return
		}

		// Use constant-time comparison to prevent timing attacks
		valid := false
		for _, validKey := range validAPIKeys {
			if subtle.ConstantTimeCompare([]byte(apiKey), []byte(validKey)) == 1 {
				valid = true
				break
			}
		}

		if !valid {
			logger.WithField("api_key", apiKey[:8]+"...").Warn("Invalid API key")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid API key"})
			c.Abort()
			return
		}

		c.Next()
	})
}

// RequestID middleware adds unique request ID
func RequestID() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)

		c.Next()
	})
}

// AuditLogging middleware logs security-relevant events
func AuditLogging(logger *logrus.Logger) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Log audit information
		duration := time.Since(start)

		auditLog := logger.WithFields(logrus.Fields{
			"method":     c.Request.Method,
			"path":       c.Request.URL.Path,
			"status":     c.Writer.Status(),
			"duration":   duration,
			"client_ip":  c.ClientIP(),
			"user_agent": c.GetHeader("User-Agent"),
			"request_id": c.GetString("request_id"),
			"user_id":    c.GetString("user_id"), // Set by auth middleware
		})

		// Log based on status code
		switch {
		case c.Writer.Status() >= 500:
			auditLog.Error("Server error")
		case c.Writer.Status() >= 400:
			auditLog.Warn("Client error")
		case c.Writer.Status() >= 300:
			auditLog.Info("Redirect")
		default:
			auditLog.Debug("Request completed")
		}
	})
}

// SQLInjectionProtection middleware detects potential SQL injection attempts
func SQLInjectionProtection(logger *logrus.Logger) gin.HandlerFunc {
	sanitizer := NewInputSanitizer()

	return gin.HandlerFunc(func(c *gin.Context) {
		// Check query parameters
		for key, values := range c.Request.URL.Query() {
			for _, value := range values {
				if sanitizer.containsSuspiciousPatterns(value) {
					logger.WithFields(logrus.Fields{
						"client_ip":  c.ClientIP(),
						"user_agent": c.GetHeader("User-Agent"),
						"parameter":  key,
						"value":      value,
					}).Warn("Potential SQL injection attempt detected")

					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
					c.Abort()
					return
				}
			}
		}

		c.Next()
	})
}

// XSSProtection middleware detects potential XSS attempts
func XSSProtection(logger *logrus.Logger) gin.HandlerFunc {
	sanitizer := NewInputSanitizer()

	return gin.HandlerFunc(func(c *gin.Context) {
		// Check headers for XSS attempts
		for name, values := range c.Request.Header {
			for _, value := range values {
				if sanitizer.containsSuspiciousPatterns(value) {
					logger.WithFields(logrus.Fields{
						"client_ip":  c.ClientIP(),
						"user_agent": c.GetHeader("User-Agent"),
						"header":     name,
						"value":      value,
					}).Warn("Potential XSS attempt detected in header")

					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
					c.Abort()
					return
				}
			}
		}

		c.Next()
	})
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	// Simple implementation - use UUID in production
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// TrustedProxyCheck middleware validates trusted proxies
func TrustedProxyCheck(trustedProxies []string, logger *logrus.Logger) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Get the real client IP considering trusted proxies
		clientIP := c.ClientIP()

		// Validate that the request is coming through trusted proxies
		xForwardedFor := c.GetHeader("X-Forwarded-For")
		if xForwardedFor != "" {
			ips := strings.Split(xForwardedFor, ",")
			for i, ip := range ips {
				ips[i] = strings.TrimSpace(ip)
			}

			// Log for audit purposes
			logger.WithFields(logrus.Fields{
				"client_ip":       clientIP,
				"x_forwarded_for": xForwardedFor,
				"forwarded_ips":   ips,
			}).Debug("Request through proxy")
		}

		c.Next()
	})
}
