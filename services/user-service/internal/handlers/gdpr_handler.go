package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"shared/security"
	"user-service/internal/service"
)

// GDPRHandler handles GDPR compliance requests
type GDPRHandler struct {
	userService     *service.UserService
	gdprService     *security.GDPRService
	securityManager *security.SecurityManager
	logger          *logrus.Logger
}

// NewGDPRHandler creates a new GDPR handler
func NewGDPRHandler(userService *service.UserService, securityManager *security.SecurityManager, logger *logrus.Logger) *GDPRHandler {
	// Initialize GDPR service
	gdprService := security.NewGDPRService(
		securityManager.AuditLogger,
		securityManager.EncryptionSvc,
		logger,
	)

	return &GDPRHandler{
		userService:     userService,
		gdprService:     gdprService,
		securityManager: securityManager,
		logger:          logger,
	}
}

// CreateGDPRRequest creates a new GDPR request
func (h *GDPRHandler) CreateGDPRRequest(c *gin.Context) {
	var req struct {
		RequestType security.GDPRRequestType `json:"request_type" binding:"required"`
		Details     map[string]interface{}   `json:"details,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Get user info from context
	userID := c.GetString("user_id")
	email := c.GetString("user_email")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Create GDPR request
	gdprRequest, err := h.gdprService.CreateGDPRRequest(
		c.Request.Context(),
		userID,
		email,
		c.ClientIP(),
		req.RequestType,
		req.Details,
	)
	if err != nil {
		h.logger.WithError(err).Error("Failed to create GDPR request")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create GDPR request"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"request_id": gdprRequest.ID,
		"status":     gdprRequest.Status,
		"expires_at": gdprRequest.ExpiresAt,
	})
}

// GetGDPRRequest retrieves a GDPR request status
func (h *GDPRHandler) GetGDPRRequest(c *gin.Context) {
	requestID := c.Param("requestId")
	userID := c.GetString("user_id")

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// In a real implementation, you would retrieve from database
	// For now, return a mock response
	c.JSON(http.StatusOK, gin.H{
		"request_id": requestID,
		"status":     "processing",
		"created_at": time.Now().Add(-24 * time.Hour),
		"expires_at": time.Now().Add(29 * 24 * time.Hour),
	})
}

// ExportUserData exports user data for GDPR compliance
func (h *GDPRHandler) ExportUserData(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Process data access request
	exportResult, err := h.gdprService.ProcessDataAccessRequest(c.Request.Context(), userID)
	if err != nil {
		h.logger.WithError(err).Error("Failed to export user data")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to export user data"})
		return
	}

	// Set headers for file download
	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=user_data_%s.json", userID))

	c.JSON(http.StatusOK, exportResult)
}

// DeleteUserData deletes user data for GDPR compliance
func (h *GDPRHandler) DeleteUserData(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		ConfirmationCode string `json:"confirmation_code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Confirmation code required"})
		return
	}

	// Process data erasure request
	err := h.gdprService.ProcessDataErasureRequest(c.Request.Context(), req.ConfirmationCode, userID)
	if err != nil {
		h.logger.WithError(err).Error("Failed to delete user data")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User data deletion initiated",
		"status":  "processing",
	})
}

// UpdateUserConsent updates user consent preferences
func (h *GDPRHandler) UpdateUserConsent(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		ConsentType string                 `json:"consent_type" binding:"required"`
		Granted     bool                   `json:"granted"`
		Version     string                 `json:"version" binding:"required"`
		Details     map[string]interface{} `json:"details,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Record consent
	err := h.gdprService.RecordConsent(
		c.Request.Context(),
		userID,
		req.ConsentType,
		c.ClientIP(),
		c.GetHeader("User-Agent"),
		req.Version,
		req.Granted,
		req.Details,
	)
	if err != nil {
		h.logger.WithError(err).Error("Failed to record consent")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record consent"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Consent recorded successfully",
		"consent_type": req.ConsentType,
		"granted":      req.Granted,
	})
}

// GetUserConsents retrieves user consent history
func (h *GDPRHandler) GetUserConsents(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	consents, err := h.gdprService.GetUserConsents(c.Request.Context(), userID)
	if err != nil {
		h.logger.WithError(err).Error("Failed to get user consents")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user consents"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"consents": consents,
	})
}

// GeneratePrivacyReport generates a privacy report
func (h *GDPRHandler) GeneratePrivacyReport(c *gin.Context) {
	// This endpoint is typically for administrators
	adminUserID := c.GetString("user_id")
	if adminUserID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin authentication required"})
		return
	}

	report, err := h.gdprService.GeneratePrivacyReport(c.Request.Context())
	if err != nil {
		h.logger.WithError(err).Error("Failed to generate privacy report")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate privacy report"})
		return
	}

	c.JSON(http.StatusOK, report)
}

// SetupGDPRRoutes sets up GDPR-related routes
func (h *GDPRHandler) SetupGDPRRoutes(router *gin.RouterGroup) {
	gdpr := router.Group("/gdpr")
	{
		// User GDPR requests
		gdpr.POST("/requests", h.CreateGDPRRequest)
		gdpr.GET("/requests/:requestId", h.GetGDPRRequest)

		// Data export and deletion
		gdpr.GET("/export", h.ExportUserData)
		gdpr.DELETE("/data", h.DeleteUserData)

		// Consent management
		gdpr.POST("/consent", h.UpdateUserConsent)
		gdpr.GET("/consent", h.GetUserConsents)

		// Admin endpoints
		gdpr.GET("/admin/privacy-report", h.GeneratePrivacyReport)
	}
}
