package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"scheduler-service/internal/logger"
	"scheduler-service/internal/onboarding"
	"scheduler-service/internal/server"
)

// OnboardingHandler handles HTTP requests for onboarding functionality
type OnboardingHandler struct {
	logger            *logger.Logger
	schedulerService  *server.SchedulerService
	onboardingService *onboarding.OnboardingService
}

// NewOnboardingHandler creates a new onboarding handler
func NewOnboardingHandler(
	logger *logger.Logger,
	schedulerService *server.SchedulerService,
	onboardingService *onboarding.OnboardingService,
) *OnboardingHandler {
	return &OnboardingHandler{
		logger:            logger,
		schedulerService:  schedulerService,
		onboardingService: onboardingService,
	}
}

// OnboardingStateResponse represents the HTTP response for onboarding state
type OnboardingStateResponse struct {
	Success bool                        `json:"success"`
	Message string                      `json:"message,omitempty"`
	Data    *onboarding.OnboardingState `json:"data,omitempty"`
	Error   string                      `json:"error,omitempty"`
}

// PreferencesRequest represents the HTTP request for updating preferences
type PreferencesRequest struct {
	StudyGoal           string          `json:"study_goal"`
	AvailableTime       int             `json:"available_time"`
	PreferredDifficulty string          `json:"preferred_difficulty"`
	FocusAreas          []string        `json:"focus_areas"`
	LearningStyle       string          `json:"learning_style"`
	NotificationTimes   []string        `json:"notification_times"`
	WeeklySchedule      map[string]bool `json:"weekly_schedule"`
}

// PlacementTestResponse represents the HTTP response for placement test
type PlacementTestResponse struct {
	Success bool                           `json:"success"`
	Message string                         `json:"message,omitempty"`
	Data    *onboarding.PlacementTestState `json:"data,omitempty"`
	Error   string                         `json:"error,omitempty"`
}

// LearningPathResponse represents the HTTP response for learning path
type LearningPathResponse struct {
	Success bool                     `json:"success"`
	Message string                   `json:"message,omitempty"`
	Data    *onboarding.LearningPath `json:"data,omitempty"`
	Error   string                   `json:"error,omitempty"`
}

// CompletionRequest represents the HTTP request for completing onboarding
type CompletionRequest struct {
	Satisfaction int    `json:"satisfaction"`
	Feedback     string `json:"feedback"`
}

// RegisterRoutes registers HTTP routes for onboarding
func (h *OnboardingHandler) RegisterRoutes(router *mux.Router) {
	// Onboarding routes
	onboardingRouter := router.PathPrefix("/api/v1/onboarding").Subrouter()

	// Initialize onboarding
	onboardingRouter.HandleFunc("/initialize", h.InitializeOnboarding).Methods("POST")

	// Get onboarding state
	onboardingRouter.HandleFunc("/{user_id}/state", h.GetOnboardingState).Methods("GET")

	// Update preferences
	onboardingRouter.HandleFunc("/{user_id}/preferences", h.UpdatePreferences).Methods("PUT")

	// Placement test routes
	onboardingRouter.HandleFunc("/{user_id}/placement/start", h.StartPlacementTest).Methods("POST")
	onboardingRouter.HandleFunc("/{user_id}/placement/skip", h.SkipPlacementTest).Methods("POST")

	// Learning path
	onboardingRouter.HandleFunc("/{user_id}/learning-path", h.GetLearningPath).Methods("GET")

	// Complete onboarding
	onboardingRouter.HandleFunc("/{user_id}/complete", h.CompleteOnboarding).Methods("POST")

	// Progress tracking
	onboardingRouter.HandleFunc("/{user_id}/progress", h.UpdateProgress).Methods("POST")
}

// InitializeOnboarding handles POST /api/v1/onboarding/initialize
func (h *OnboardingHandler) InitializeOnboarding(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse request body
	var req struct {
		UserID      string `json:"user_id"`
		CountryCode string `json:"country_code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Validate required fields
	if req.UserID == "" {
		h.writeErrorResponse(w, http.StatusBadRequest, "user_id is required", nil)
		return
	}
	if req.CountryCode == "" {
		h.writeErrorResponse(w, http.StatusBadRequest, "country_code is required", nil)
		return
	}

	// Initialize onboarding
	state, err := h.onboardingService.InitializeOnboarding(ctx, req.UserID, req.CountryCode)
	if err != nil {
		h.logger.WithContext(ctx).WithError(err).Error("Failed to initialize onboarding")
		h.writeErrorResponse(w, http.StatusInternalServerError, "Failed to initialize onboarding", err)
		return
	}

	// Return success response
	response := OnboardingStateResponse{
		Success: true,
		Message: "Onboarding initialized successfully",
		Data:    state,
	}

	h.writeJSONResponse(w, http.StatusOK, response)
}

// GetOnboardingState handles GET /api/v1/onboarding/{user_id}/state
func (h *OnboardingHandler) GetOnboardingState(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	userID := vars["user_id"]

	if userID == "" {
		h.writeErrorResponse(w, http.StatusBadRequest, "user_id is required", nil)
		return
	}

	// Get onboarding state
	state, err := h.onboardingService.GetOnboardingState(ctx, userID)
	if err != nil {
		h.logger.WithContext(ctx).WithError(err).Error("Failed to get onboarding state")
		h.writeErrorResponse(w, http.StatusNotFound, "Onboarding state not found", err)
		return
	}

	// Return success response
	response := OnboardingStateResponse{
		Success: true,
		Data:    state,
	}

	h.writeJSONResponse(w, http.StatusOK, response)
}

// UpdatePreferences handles PUT /api/v1/onboarding/{user_id}/preferences
func (h *OnboardingHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	userID := vars["user_id"]

	if userID == "" {
		h.writeErrorResponse(w, http.StatusBadRequest, "user_id is required", nil)
		return
	}

	// Parse request body
	var req PreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Convert to internal preferences format
	preferences := onboarding.UserPreferences{
		StudyGoal:           req.StudyGoal,
		AvailableTime:       req.AvailableTime,
		PreferredDifficulty: req.PreferredDifficulty,
		FocusAreas:          req.FocusAreas,
		LearningStyle:       req.LearningStyle,
		NotificationTimes:   req.NotificationTimes,
		WeeklySchedule:      req.WeeklySchedule,
	}

	// Update preferences
	err := h.onboardingService.UpdatePreferences(ctx, userID, preferences)
	if err != nil {
		h.logger.WithContext(ctx).WithError(err).Error("Failed to update preferences")
		h.writeErrorResponse(w, http.StatusInternalServerError, "Failed to update preferences", err)
		return
	}

	// Return success response
	response := map[string]interface{}{
		"success": true,
		"message": "Preferences updated successfully",
	}

	h.writeJSONResponse(w, http.StatusOK, response)
}

// StartPlacementTest handles POST /api/v1/onboarding/{user_id}/placement/start
func (h *OnboardingHandler) StartPlacementTest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	userID := vars["user_id"]

	if userID == "" {
		h.writeErrorResponse(w, http.StatusBadRequest, "user_id is required", nil)
		return
	}

	// Start placement test
	placementTest, err := h.onboardingService.StartPlacementTest(ctx, userID)
	if err != nil {
		h.logger.WithContext(ctx).WithError(err).Error("Failed to start placement test")
		h.writeErrorResponse(w, http.StatusInternalServerError, "Failed to start placement test", err)
		return
	}

	// Return success response
	response := PlacementTestResponse{
		Success: true,
		Message: "Placement test started successfully",
		Data:    placementTest,
	}

	h.writeJSONResponse(w, http.StatusOK, response)
}

// SkipPlacementTest handles POST /api/v1/onboarding/{user_id}/placement/skip
func (h *OnboardingHandler) SkipPlacementTest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	userID := vars["user_id"]

	if userID == "" {
		h.writeErrorResponse(w, http.StatusBadRequest, "user_id is required", nil)
		return
	}

	// Skip placement test
	err := h.onboardingService.SkipPlacementTest(ctx, userID)
	if err != nil {
		h.logger.WithContext(ctx).WithError(err).Error("Failed to skip placement test")
		h.writeErrorResponse(w, http.StatusInternalServerError, "Failed to skip placement test", err)
		return
	}

	// Get the generated learning path
	learningPath, err := h.onboardingService.GetLearningPath(ctx, userID)
	if err != nil {
		h.logger.WithContext(ctx).WithError(err).Error("Failed to get learning path")
		h.writeErrorResponse(w, http.StatusInternalServerError, "Failed to get learning path", err)
		return
	}

	// Return success response
	response := LearningPathResponse{
		Success: true,
		Message: "Placement test skipped and default learning path generated",
		Data:    learningPath,
	}

	h.writeJSONResponse(w, http.StatusOK, response)
}

// GetLearningPath handles GET /api/v1/onboarding/{user_id}/learning-path
func (h *OnboardingHandler) GetLearningPath(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	userID := vars["user_id"]

	if userID == "" {
		h.writeErrorResponse(w, http.StatusBadRequest, "user_id is required", nil)
		return
	}

	// Get learning path
	learningPath, err := h.onboardingService.GetLearningPath(ctx, userID)
	if err != nil {
		h.logger.WithContext(ctx).WithError(err).Error("Failed to get learning path")
		h.writeErrorResponse(w, http.StatusNotFound, "Learning path not found", err)
		return
	}

	// Return success response
	response := LearningPathResponse{
		Success: true,
		Data:    learningPath,
	}

	h.writeJSONResponse(w, http.StatusOK, response)
}

// CompleteOnboarding handles POST /api/v1/onboarding/{user_id}/complete
func (h *OnboardingHandler) CompleteOnboarding(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	userID := vars["user_id"]

	if userID == "" {
		h.writeErrorResponse(w, http.StatusBadRequest, "user_id is required", nil)
		return
	}

	// Parse request body
	var req CompletionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Validate satisfaction score
	if req.Satisfaction < 1 || req.Satisfaction > 5 {
		h.writeErrorResponse(w, http.StatusBadRequest, "satisfaction must be between 1 and 5", nil)
		return
	}

	// Complete onboarding
	err := h.onboardingService.CompleteOnboarding(ctx, userID, req.Satisfaction, req.Feedback)
	if err != nil {
		h.logger.WithContext(ctx).WithError(err).Error("Failed to complete onboarding")
		h.writeErrorResponse(w, http.StatusInternalServerError, "Failed to complete onboarding", err)
		return
	}

	// Return success response
	response := map[string]interface{}{
		"success": true,
		"message": "Onboarding completed successfully",
	}

	h.writeJSONResponse(w, http.StatusOK, response)
}

// UpdateProgress handles POST /api/v1/onboarding/{user_id}/progress
func (h *OnboardingHandler) UpdateProgress(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	userID := vars["user_id"]

	if userID == "" {
		h.writeErrorResponse(w, http.StatusBadRequest, "user_id is required", nil)
		return
	}

	// Parse request body
	var req struct {
		Stage     string `json:"stage"`
		TimeSpent int    `json:"time_spent"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Convert stage string to onboarding stage
	stage := onboarding.OnboardingStage(req.Stage)

	// Update progress
	err := h.onboardingService.UpdateProgress(ctx, userID, stage, req.TimeSpent)
	if err != nil {
		h.logger.WithContext(ctx).WithError(err).Error("Failed to update progress")
		h.writeErrorResponse(w, http.StatusInternalServerError, "Failed to update progress", err)
		return
	}

	// Return success response
	response := map[string]interface{}{
		"success": true,
		"message": "Progress updated successfully",
	}

	h.writeJSONResponse(w, http.StatusOK, response)
}

// Helper methods

// writeJSONResponse writes a JSON response
func (h *OnboardingHandler) writeJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.WithError(err).Error("Failed to encode JSON response")
	}
}

// writeErrorResponse writes an error response
func (h *OnboardingHandler) writeErrorResponse(w http.ResponseWriter, statusCode int, message string, err error) {
	response := map[string]interface{}{
		"success": false,
		"message": message,
	}

	if err != nil {
		response["error"] = err.Error()
	}

	h.writeJSONResponse(w, statusCode, response)
}

// Middleware for CORS and common headers
func (h *OnboardingHandler) CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequestLoggingMiddleware logs incoming requests
func (h *OnboardingHandler) RequestLoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		next.ServeHTTP(w, r)

		h.logger.WithFields(map[string]interface{}{
			"method":   r.Method,
			"path":     r.URL.Path,
			"duration": time.Since(start).Milliseconds(),
			"remote":   r.RemoteAddr,
		}).Info("HTTP request processed")
	})
}
