package onboarding

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"scheduler-service/internal/algorithms"
	"scheduler-service/internal/cache"
	"scheduler-service/internal/database"
	"scheduler-service/internal/logger"
	"scheduler-service/internal/state"
)

// OnboardingService handles user onboarding and initialization
type OnboardingService struct {
	logger             *logger.Logger
	db                 *database.DB
	cache              *cache.RedisClient
	placementAlgorithm *algorithms.PlacementTestAlgorithm
	sm2Manager         *state.SM2StateManager
	bktManager         *state.BKTStateManager
	irtManager         *state.IRTManager
}

// NewOnboardingService creates a new onboarding service instance
func NewOnboardingService(
	logger *logger.Logger,
	db *database.DB,
	cache *cache.RedisClient,
	placementAlgorithm *algorithms.PlacementTestAlgorithm,
	sm2Manager *state.SM2StateManager,
	bktManager *state.BKTStateManager,
	irtManager *state.IRTManager,
) *OnboardingService {
	return &OnboardingService{
		logger:             logger,
		db:                 db,
		cache:              cache,
		placementAlgorithm: placementAlgorithm,
		sm2Manager:         sm2Manager,
		bktManager:         bktManager,
		irtManager:         irtManager,
	}
}

// OnboardingState represents the current state of user onboarding
type OnboardingState struct {
	UserID        string              `json:"user_id"`
	CountryCode   string              `json:"country_code"`
	Stage         OnboardingStage     `json:"stage"`
	Progress      OnboardingProgress  `json:"progress"`
	Preferences   UserPreferences     `json:"preferences"`
	PlacementTest *PlacementTestState `json:"placement_test,omitempty"`
	LearningPath  *LearningPath       `json:"learning_path,omitempty"`
	Analytics     OnboardingAnalytics `json:"analytics"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
	CompletedAt   *time.Time          `json:"completed_at,omitempty"`
}

// OnboardingStage represents the current stage of onboarding
type OnboardingStage string

const (
	StageWelcome         OnboardingStage = "welcome"
	StagePreferences     OnboardingStage = "preferences"
	StagePlacementTest   OnboardingStage = "placement_test"
	StageLearningPath    OnboardingStage = "learning_path"
	StageInitialPractice OnboardingStage = "initial_practice"
	StageCompleted       OnboardingStage = "completed"
)

// OnboardingProgress tracks progress through onboarding stages
type OnboardingProgress struct {
	CurrentStage           OnboardingStage   `json:"current_stage"`
	CompletedStages        []OnboardingStage `json:"completed_stages"`
	TotalStages            int               `json:"total_stages"`
	PercentComplete        float64           `json:"percent_complete"`
	EstimatedTimeRemaining int               `json:"estimated_time_remaining_minutes"`
}

// UserPreferences stores user preferences collected during onboarding
type UserPreferences struct {
	StudyGoal           string          `json:"study_goal"`           // "pass_test", "improve_skills", "refresh_knowledge"
	AvailableTime       int             `json:"available_time"`       // minutes per day
	PreferredDifficulty string          `json:"preferred_difficulty"` // "easy", "medium", "hard", "adaptive"
	FocusAreas          []string        `json:"focus_areas"`          // specific topics to focus on
	LearningStyle       string          `json:"learning_style"`       // "visual", "auditory", "kinesthetic", "mixed"
	NotificationTimes   []string        `json:"notification_times"`   // preferred study reminder times
	WeeklySchedule      map[string]bool `json:"weekly_schedule"`      // days of week available for study
}

// PlacementTestState wraps the placement test state for onboarding
type PlacementTestState struct {
	SessionID      string                      `json:"session_id"`
	Status         PlacementTestStatus         `json:"status"`
	ItemsCompleted int                         `json:"items_completed"`
	TotalItems     int                         `json:"total_items"`
	CurrentAbility float64                     `json:"current_ability"`
	Confidence     float64                     `json:"confidence"`
	TopicAbilities map[string]float64          `json:"topic_abilities"`
	Results        *algorithms.PlacementResult `json:"results,omitempty"`
	StartedAt      time.Time                   `json:"started_at"`
	CompletedAt    *time.Time                  `json:"completed_at,omitempty"`
}

// PlacementTestStatus represents the status of the placement test
type PlacementTestStatus string

const (
	PlacementNotStarted PlacementTestStatus = "not_started"
	PlacementInProgress PlacementTestStatus = "in_progress"
	PlacementCompleted  PlacementTestStatus = "completed"
	PlacementSkipped    PlacementTestStatus = "skipped"
)

// LearningPath represents the personalized learning path
type LearningPath struct {
	PathID            string                `json:"path_id"`
	RecommendedLevel  string                `json:"recommended_level"`
	FocusTopics       []TopicRecommendation `json:"focus_topics"`
	StudyPlan         StudyPlan             `json:"study_plan"`
	Milestones        []LearningMilestone   `json:"milestones"`
	EstimatedDuration int                   `json:"estimated_duration_days"`
	CreatedAt         time.Time             `json:"created_at"`
}

// TopicRecommendation represents a recommended topic with priority
type TopicRecommendation struct {
	Topic         string  `json:"topic"`
	Priority      string  `json:"priority"`   // "high", "medium", "low"
	Reason        string  `json:"reason"`     // why this topic is recommended
	Difficulty    float64 `json:"difficulty"` // recommended starting difficulty
	EstimatedTime int     `json:"estimated_time_hours"`
}

// StudyPlan represents the recommended study schedule
type StudyPlan struct {
	DailyMinutes    int            `json:"daily_minutes"`
	WeeklySchedule  map[string]int `json:"weekly_schedule"` // day -> minutes
	SessionTypes    []string       `json:"session_types"`   // types of sessions to include
	ReviewFrequency int            `json:"review_frequency_days"`
	TestFrequency   int            `json:"test_frequency_days"`
}

// LearningMilestone represents a milestone in the learning journey
type LearningMilestone struct {
	ID             string     `json:"id"`
	Title          string     `json:"title"`
	Description    string     `json:"description"`
	TargetAccuracy float64    `json:"target_accuracy"`
	RequiredTopics []string   `json:"required_topics"`
	EstimatedDate  time.Time  `json:"estimated_date"`
	IsCompleted    bool       `json:"is_completed"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
}

// OnboardingAnalytics tracks analytics for the onboarding process
type OnboardingAnalytics struct {
	TimeSpent        map[OnboardingStage]int `json:"time_spent_seconds"`
	InteractionCount map[OnboardingStage]int `json:"interaction_count"`
	DropoffPoints    []string                `json:"dropoff_points"`
	CompletionRate   float64                 `json:"completion_rate"`
	UserSatisfaction int                     `json:"user_satisfaction"` // 1-5 scale
	FeedbackComments string                  `json:"feedback_comments"`
}

// InitializeOnboarding starts the onboarding process for a new user
func (o *OnboardingService) InitializeOnboarding(ctx context.Context, userID, countryCode string) (*OnboardingState, error) {
	o.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":      userID,
		"country_code": countryCode,
	}).Info("Initializing user onboarding")

	// Check if user already has onboarding state
	existingState, err := o.getOnboardingState(ctx, userID)
	if err == nil && existingState != nil {
		o.logger.WithContext(ctx).WithField("user_id", userID).Info("User already has onboarding state")
		return existingState, nil
	}

	// Create new onboarding state
	state := &OnboardingState{
		UserID:      userID,
		CountryCode: countryCode,
		Stage:       StageWelcome,
		Progress: OnboardingProgress{
			CurrentStage:           StageWelcome,
			CompletedStages:        []OnboardingStage{},
			TotalStages:            6, // welcome, preferences, placement, learning_path, initial_practice, completed
			PercentComplete:        0.0,
			EstimatedTimeRemaining: 15, // estimated 15 minutes for full onboarding
		},
		Preferences: UserPreferences{
			StudyGoal:           "",
			AvailableTime:       30, // default 30 minutes per day
			PreferredDifficulty: "adaptive",
			FocusAreas:          []string{},
			LearningStyle:       "mixed",
			NotificationTimes:   []string{"19:00"}, // default evening reminder
			WeeklySchedule: map[string]bool{
				"monday": true, "tuesday": true, "wednesday": true,
				"thursday": true, "friday": true, "saturday": true, "sunday": false,
			},
		},
		Analytics: OnboardingAnalytics{
			TimeSpent:        make(map[OnboardingStage]int),
			InteractionCount: make(map[OnboardingStage]int),
			DropoffPoints:    []string{},
			CompletionRate:   0.0,
			UserSatisfaction: 0,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Store onboarding state
	err = o.storeOnboardingState(ctx, state)
	if err != nil {
		o.logger.WithContext(ctx).WithError(err).Error("Failed to store onboarding state")
		return nil, fmt.Errorf("failed to store onboarding state: %w", err)
	}

	o.logger.WithContext(ctx).WithField("user_id", userID).Info("Onboarding initialized successfully")
	return state, nil
}

// UpdatePreferences updates user preferences during onboarding
func (o *OnboardingService) UpdatePreferences(ctx context.Context, userID string, preferences UserPreferences) error {
	o.logger.WithContext(ctx).WithField("user_id", userID).Info("Updating user preferences")

	state, err := o.getOnboardingState(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get onboarding state: %w", err)
	}

	// Update preferences
	state.Preferences = preferences
	state.UpdatedAt = time.Now()

	// Advance to next stage if currently in preferences stage
	if state.Stage == StagePreferences {
		err = o.advanceStage(ctx, state, StagePlacementTest)
		if err != nil {
			return fmt.Errorf("failed to advance to placement test stage: %w", err)
		}
	}

	// Store updated state
	err = o.storeOnboardingState(ctx, state)
	if err != nil {
		return fmt.Errorf("failed to store updated onboarding state: %w", err)
	}

	o.logger.WithContext(ctx).WithField("user_id", userID).Info("User preferences updated successfully")
	return nil
}

// StartPlacementTest initiates the placement test for the user
func (o *OnboardingService) StartPlacementTest(ctx context.Context, userID string) (*PlacementTestState, error) {
	o.logger.WithContext(ctx).WithField("user_id", userID).Info("Starting placement test")

	state, err := o.getOnboardingState(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get onboarding state: %w", err)
	}

	// Initialize placement test
	placementState, err := o.placementAlgorithm.InitializePlacementTest(ctx, userID,
		fmt.Sprintf("onboarding_%s_%d", userID, time.Now().Unix()), state.CountryCode)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize placement test: %w", err)
	}

	// Create placement test state for onboarding
	testState := &PlacementTestState{
		SessionID:      placementState.SessionID,
		Status:         PlacementInProgress,
		ItemsCompleted: 0,
		TotalItems:     o.placementAlgorithm.MaxItems,
		CurrentAbility: placementState.OverallAbility,
		Confidence:     placementState.OverallConfidence,
		TopicAbilities: placementState.TopicAbilities,
		StartedAt:      time.Now(),
	}

	// Update onboarding state
	state.PlacementTest = testState
	state.Stage = StagePlacementTest
	state.UpdatedAt = time.Now()

	// Store updated state
	err = o.storeOnboardingState(ctx, state)
	if err != nil {
		return nil, fmt.Errorf("failed to store onboarding state: %w", err)
	}

	// Store placement test state in cache
	err = o.storePlacementState(ctx, placementState.SessionID, placementState)
	if err != nil {
		o.logger.WithContext(ctx).WithError(err).Warn("Failed to store placement state in cache")
	}

	o.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":    userID,
		"session_id": testState.SessionID,
	}).Info("Placement test started successfully")

	return testState, nil
}

// CompletePlacementTest completes the placement test and generates learning path
func (o *OnboardingService) CompletePlacementTest(ctx context.Context, userID string, results *algorithms.PlacementResult) error {
	o.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":         userID,
		"overall_ability": results.OverallAbility,
		"items_completed": results.ItemsAdministered,
	}).Info("Completing placement test")

	state, err := o.getOnboardingState(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get onboarding state: %w", err)
	}

	if state.PlacementTest == nil {
		return fmt.Errorf("no placement test in progress")
	}

	// Update placement test state
	completedAt := time.Now()
	state.PlacementTest.Status = PlacementCompleted
	state.PlacementTest.Results = results
	state.PlacementTest.CompletedAt = &completedAt
	state.PlacementTest.ItemsCompleted = results.ItemsAdministered
	state.PlacementTest.CurrentAbility = results.OverallAbility
	state.PlacementTest.Confidence = results.OverallConfidence
	state.PlacementTest.TopicAbilities = results.TopicAbilities

	// Initialize user scheduler state with placement results
	err = o.initializeSchedulerState(ctx, userID, state.CountryCode, results)
	if err != nil {
		o.logger.WithContext(ctx).WithError(err).Error("Failed to initialize scheduler state")
		return fmt.Errorf("failed to initialize scheduler state: %w", err)
	}

	// Generate personalized learning path
	learningPath, err := o.generateLearningPath(ctx, state, results)
	if err != nil {
		o.logger.WithContext(ctx).WithError(err).Error("Failed to generate learning path")
		return fmt.Errorf("failed to generate learning path: %w", err)
	}

	state.LearningPath = learningPath

	// Advance to learning path stage
	err = o.advanceStage(ctx, state, StageLearningPath)
	if err != nil {
		return fmt.Errorf("failed to advance to learning path stage: %w", err)
	}

	// Store updated state
	err = o.storeOnboardingState(ctx, state)
	if err != nil {
		return fmt.Errorf("failed to store onboarding state: %w", err)
	}

	o.logger.WithContext(ctx).WithField("user_id", userID).Info("Placement test completed and learning path generated")
	return nil
}

// SkipPlacementTest allows users to skip the placement test
func (o *OnboardingService) SkipPlacementTest(ctx context.Context, userID string) error {
	o.logger.WithContext(ctx).WithField("user_id", userID).Info("Skipping placement test")

	state, err := o.getOnboardingState(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get onboarding state: %w", err)
	}

	// Create default placement test state
	state.PlacementTest = &PlacementTestState{
		SessionID:      fmt.Sprintf("skipped_%s_%d", userID, time.Now().Unix()),
		Status:         PlacementSkipped,
		ItemsCompleted: 0,
		TotalItems:     0,
		CurrentAbility: 0.0, // neutral ability
		Confidence:     0.5, // medium confidence
		TopicAbilities: make(map[string]float64),
		StartedAt:      time.Now(),
		CompletedAt:    func() *time.Time { t := time.Now(); return &t }(),
	}

	// Initialize default topic abilities
	topics := []string{"traffic_signs", "road_rules", "vehicle_operation", "safety_procedures"}
	for _, topic := range topics {
		state.PlacementTest.TopicAbilities[topic] = 0.0 // neutral ability for all topics
	}

	// Initialize scheduler state with default values
	err = o.initializeSchedulerStateDefault(ctx, userID, state.CountryCode)
	if err != nil {
		return fmt.Errorf("failed to initialize default scheduler state: %w", err)
	}

	// Generate default learning path
	learningPath, err := o.generateDefaultLearningPath(ctx, state)
	if err != nil {
		return fmt.Errorf("failed to generate default learning path: %w", err)
	}

	state.LearningPath = learningPath

	// Advance to learning path stage
	err = o.advanceStage(ctx, state, StageLearningPath)
	if err != nil {
		return fmt.Errorf("failed to advance to learning path stage: %w", err)
	}

	// Store updated state
	err = o.storeOnboardingState(ctx, state)
	if err != nil {
		return fmt.Errorf("failed to store onboarding state: %w", err)
	}

	o.logger.WithContext(ctx).WithField("user_id", userID).Info("Placement test skipped and default learning path generated")
	return nil
}

// CompleteOnboarding finalizes the onboarding process
func (o *OnboardingService) CompleteOnboarding(ctx context.Context, userID string, satisfaction int, feedback string) error {
	o.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":      userID,
		"satisfaction": satisfaction,
	}).Info("Completing onboarding")

	state, err := o.getOnboardingState(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get onboarding state: %w", err)
	}

	// Update analytics
	state.Analytics.UserSatisfaction = satisfaction
	state.Analytics.FeedbackComments = feedback
	state.Analytics.CompletionRate = 1.0

	// Mark as completed
	completedAt := time.Now()
	state.CompletedAt = &completedAt

	// Advance to completed stage
	err = o.advanceStage(ctx, state, StageCompleted)
	if err != nil {
		return fmt.Errorf("failed to advance to completed stage: %w", err)
	}

	// Store final state
	err = o.storeOnboardingState(ctx, state)
	if err != nil {
		return fmt.Errorf("failed to store final onboarding state: %w", err)
	}

	// Track onboarding completion analytics
	err = o.trackOnboardingCompletion(ctx, state)
	if err != nil {
		o.logger.WithContext(ctx).WithError(err).Warn("Failed to track onboarding completion analytics")
	}

	o.logger.WithContext(ctx).WithField("user_id", userID).Info("Onboarding completed successfully")
	return nil
}

// GetOnboardingState retrieves the current onboarding state for a user
func (o *OnboardingService) GetOnboardingState(ctx context.Context, userID string) (*OnboardingState, error) {
	return o.getOnboardingState(ctx, userID)
}

// GetLearningPath retrieves the learning path for a user
func (o *OnboardingService) GetLearningPath(ctx context.Context, userID string) (*LearningPath, error) {
	state, err := o.getOnboardingState(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get onboarding state: %w", err)
	}

	if state.LearningPath == nil {
		return nil, fmt.Errorf("no learning path available for user")
	}

	return state.LearningPath, nil
}

// UpdateProgress updates the progress tracking for onboarding analytics
func (o *OnboardingService) UpdateProgress(ctx context.Context, userID string, stage OnboardingStage, timeSpent int) error {
	state, err := o.getOnboardingState(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get onboarding state: %w", err)
	}

	// Update analytics
	if state.Analytics.TimeSpent == nil {
		state.Analytics.TimeSpent = make(map[OnboardingStage]int)
	}
	if state.Analytics.InteractionCount == nil {
		state.Analytics.InteractionCount = make(map[OnboardingStage]int)
	}

	state.Analytics.TimeSpent[stage] += timeSpent
	state.Analytics.InteractionCount[stage]++
	state.UpdatedAt = time.Now()

	// Store updated state
	err = o.storeOnboardingState(ctx, state)
	if err != nil {
		return fmt.Errorf("failed to store onboarding state: %w", err)
	}

	return nil
}

// Helper methods

// advanceStage advances the onboarding to the next stage
func (o *OnboardingService) advanceStage(ctx context.Context, state *OnboardingState, nextStage OnboardingStage) error {
	// Add current stage to completed stages if not already there
	found := false
	for _, completed := range state.Progress.CompletedStages {
		if completed == state.Stage {
			found = true
			break
		}
	}
	if !found && state.Stage != StageWelcome {
		state.Progress.CompletedStages = append(state.Progress.CompletedStages, state.Stage)
	}

	// Update current stage
	state.Stage = nextStage
	state.Progress.CurrentStage = nextStage

	// Update progress percentage
	state.Progress.PercentComplete = float64(len(state.Progress.CompletedStages)) / float64(state.Progress.TotalStages) * 100

	// Update estimated time remaining
	remainingStages := state.Progress.TotalStages - len(state.Progress.CompletedStages)
	state.Progress.EstimatedTimeRemaining = remainingStages * 3 // estimate 3 minutes per remaining stage

	state.UpdatedAt = time.Now()

	o.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":          state.UserID,
		"previous_stage":   state.Stage,
		"next_stage":       nextStage,
		"percent_complete": state.Progress.PercentComplete,
	}).Debug("Advanced onboarding stage")

	return nil
}

// initializeSchedulerState initializes the scheduler state with placement results
func (o *OnboardingService) initializeSchedulerState(ctx context.Context, userID, countryCode string, results *algorithms.PlacementResult) error {
	// Initialize BKT states for each topic by getting existing state (which creates default if not exists)
	for topic := range results.TopicAbilities {
		// Get state (this will create default state if not exists)
		_, err := o.bktManager.GetState(ctx, userID, topic)
		if err != nil {
			o.logger.WithContext(ctx).WithError(err).WithField("topic", topic).Error("Failed to initialize BKT state")
			return fmt.Errorf("failed to initialize BKT state for topic %s: %w", topic, err)
		}
	}

	// Initialize IRT states for each topic by getting existing state (which creates default if not exists)
	for topic := range results.TopicAbilities {
		// Get state (this will create default state if not exists)
		_, err := o.irtManager.GetState(ctx, userID, topic)
		if err != nil {
			o.logger.WithContext(ctx).WithError(err).WithField("topic", topic).Error("Failed to initialize IRT state")
			return fmt.Errorf("failed to initialize IRT state for topic %s: %w", topic, err)
		}
	}

	o.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":            userID,
		"topics_initialized": len(results.TopicAbilities),
		"overall_ability":    results.OverallAbility,
	}).Info("Scheduler state initialized from placement results")

	return nil
}

// initializeSchedulerStateDefault initializes scheduler state with default values
func (o *OnboardingService) initializeSchedulerStateDefault(ctx context.Context, userID, countryCode string) error {
	// Default topics for driving test
	topics := []string{"traffic_signs", "road_rules", "vehicle_operation", "safety_procedures"}

	// Initialize BKT states by getting existing state (which creates default if not exists)
	for _, topic := range topics {
		_, err := o.bktManager.GetState(ctx, userID, topic)
		if err != nil {
			return fmt.Errorf("failed to initialize default BKT state for topic %s: %w", topic, err)
		}
	}

	// Initialize IRT states by getting existing state (which creates default if not exists)
	for _, topic := range topics {
		_, err := o.irtManager.GetState(ctx, userID, topic)
		if err != nil {
			return fmt.Errorf("failed to initialize default IRT state for topic %s: %w", topic, err)
		}
	}

	o.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id": userID,
		"topics":  len(topics),
	}).Info("Default scheduler state initialized")

	return nil
}

// abilityToBKTProbability converts IRT ability to BKT knowledge probability
func (o *OnboardingService) abilityToBKTProbability(ability, confidence float64) float64 {
	// Convert ability (-3 to +3) to probability (0 to 1)
	// Use sigmoid function with confidence adjustment
	prob := 1.0 / (1.0 + math.Exp(-ability))

	// Adjust based on confidence - lower confidence pulls toward 0.5
	adjustedProb := confidence*prob + (1.0-confidence)*0.5

	// Ensure bounds
	if adjustedProb < 0.1 {
		adjustedProb = 0.1
	}
	if adjustedProb > 0.9 {
		adjustedProb = 0.9
	}

	return adjustedProb
}

// Storage and retrieval methods will be implemented in the next part...

// generateLearningPath creates a personalized learning path based on placement results
func (o *OnboardingService) generateLearningPath(ctx context.Context, state *OnboardingState, results *algorithms.PlacementResult) (*LearningPath, error) {
	o.logger.WithContext(ctx).WithField("user_id", state.UserID).Info("Generating personalized learning path")

	pathID := fmt.Sprintf("path_%s_%d", state.UserID, time.Now().Unix())

	// Analyze placement results to determine focus areas
	focusTopics := o.analyzePlacementResults(results, state.Preferences)

	// Generate study plan based on user preferences
	studyPlan := o.generateStudyPlan(state.Preferences)

	// Create learning milestones
	milestones := o.generateLearningMilestones(results, state.Preferences)

	// Estimate duration based on user availability and current ability
	estimatedDuration := o.estimateLearningDuration(results, state.Preferences)

	learningPath := &LearningPath{
		PathID:            pathID,
		RecommendedLevel:  results.RecommendedLevel,
		FocusTopics:       focusTopics,
		StudyPlan:         studyPlan,
		Milestones:        milestones,
		EstimatedDuration: estimatedDuration,
		CreatedAt:         time.Now(),
	}

	o.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":            state.UserID,
		"path_id":            pathID,
		"recommended_level":  results.RecommendedLevel,
		"focus_topics":       len(focusTopics),
		"estimated_duration": estimatedDuration,
	}).Info("Personalized learning path generated")

	return learningPath, nil
}

// generateDefaultLearningPath creates a default learning path for users who skip placement
func (o *OnboardingService) generateDefaultLearningPath(ctx context.Context, state *OnboardingState) (*LearningPath, error) {
	o.logger.WithContext(ctx).WithField("user_id", state.UserID).Info("Generating default learning path")

	pathID := fmt.Sprintf("default_path_%s_%d", state.UserID, time.Now().Unix())

	// Create default focus topics with equal priority
	focusTopics := []TopicRecommendation{
		{
			Topic:         "traffic_signs",
			Priority:      "high",
			Reason:        "Essential foundation for driving knowledge",
			Difficulty:    0.0,
			EstimatedTime: 8,
		},
		{
			Topic:         "road_rules",
			Priority:      "high",
			Reason:        "Core driving regulations and laws",
			Difficulty:    0.0,
			EstimatedTime: 10,
		},
		{
			Topic:         "vehicle_operation",
			Priority:      "medium",
			Reason:        "Practical vehicle handling skills",
			Difficulty:    0.0,
			EstimatedTime: 6,
		},
		{
			Topic:         "safety_procedures",
			Priority:      "medium",
			Reason:        "Important safety practices",
			Difficulty:    0.0,
			EstimatedTime: 4,
		},
	}

	// Generate study plan based on user preferences
	studyPlan := o.generateStudyPlan(state.Preferences)

	// Create default milestones
	milestones := o.generateDefaultMilestones(state.Preferences)

	// Estimate duration for beginner level
	estimatedDuration := o.estimateDefaultDuration(state.Preferences)

	learningPath := &LearningPath{
		PathID:            pathID,
		RecommendedLevel:  "beginner",
		FocusTopics:       focusTopics,
		StudyPlan:         studyPlan,
		Milestones:        milestones,
		EstimatedDuration: estimatedDuration,
		CreatedAt:         time.Now(),
	}

	o.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":            state.UserID,
		"path_id":            pathID,
		"estimated_duration": estimatedDuration,
	}).Info("Default learning path generated")

	return learningPath, nil
}

// analyzePlacementResults analyzes placement test results to determine focus areas
func (o *OnboardingService) analyzePlacementResults(results *algorithms.PlacementResult, preferences UserPreferences) []TopicRecommendation {
	var recommendations []TopicRecommendation

	// Analyze each topic's performance
	for topic, ability := range results.TopicAbilities {
		confidence := results.TopicConfidence[topic]

		// Determine priority based on ability and user preferences
		priority := o.determinePriority(topic, ability, confidence, preferences)

		// Determine reason for recommendation
		reason := o.generateRecommendationReason(topic, ability, confidence, results.RecommendedLevel)

		// Estimate time needed based on current ability
		estimatedTime := o.estimateTopicTime(ability, confidence, preferences.AvailableTime)

		// Adjust difficulty based on ability
		recommendedDifficulty := o.adjustDifficultyForAbility(ability, confidence)

		recommendation := TopicRecommendation{
			Topic:         topic,
			Priority:      priority,
			Reason:        reason,
			Difficulty:    recommendedDifficulty,
			EstimatedTime: estimatedTime,
		}

		recommendations = append(recommendations, recommendation)
	}

	// Sort by priority and ability (weakest areas first for high priority)
	o.sortRecommendationsByPriority(recommendations, results.TopicAbilities)

	return recommendations
}

// determinePriority determines the priority level for a topic
func (o *OnboardingService) determinePriority(topic string, ability, confidence float64, preferences UserPreferences) string {
	// Check if topic is in user's focus areas
	for _, focusArea := range preferences.FocusAreas {
		if focusArea == topic {
			return "high"
		}
	}

	// Determine priority based on ability and confidence
	if ability < -0.5 || confidence < 0.6 {
		return "high" // Low ability or confidence = high priority
	} else if ability < 0.5 || confidence < 0.8 {
		return "medium"
	} else {
		return "low" // High ability and confidence = low priority
	}
}

// generateRecommendationReason generates a human-readable reason for the recommendation
func (o *OnboardingService) generateRecommendationReason(topic string, ability, confidence float64, level string) string {
	if ability < -1.0 {
		return fmt.Sprintf("Significant improvement needed in %s - foundational concepts require attention", topic)
	} else if ability < -0.5 {
		return fmt.Sprintf("Below average performance in %s - focused practice recommended", topic)
	} else if ability < 0.0 {
		return fmt.Sprintf("Room for improvement in %s - regular practice will help", topic)
	} else if ability < 0.5 {
		return fmt.Sprintf("Good foundation in %s - continue building knowledge", topic)
	} else if ability < 1.0 {
		return fmt.Sprintf("Strong performance in %s - maintain with periodic review", topic)
	} else {
		return fmt.Sprintf("Excellent mastery of %s - minimal review needed", topic)
	}
}

// estimateTopicTime estimates hours needed for a topic based on current ability
func (o *OnboardingService) estimateTopicTime(ability, confidence float64, dailyMinutes int) int {
	// Base time estimates (hours) for different ability levels
	var baseHours float64
	if ability < -1.0 {
		baseHours = 15 // Significant work needed
	} else if ability < -0.5 {
		baseHours = 12
	} else if ability < 0.0 {
		baseHours = 8
	} else if ability < 0.5 {
		baseHours = 5
	} else if ability < 1.0 {
		baseHours = 3
	} else {
		baseHours = 1 // Just maintenance
	}

	// Adjust based on confidence
	confidenceMultiplier := 2.0 - confidence // Lower confidence = more time needed
	adjustedHours := baseHours * confidenceMultiplier

	// Ensure reasonable bounds
	if adjustedHours < 1 {
		adjustedHours = 1
	}
	if adjustedHours > 20 {
		adjustedHours = 20
	}

	return int(adjustedHours)
}

// adjustDifficultyForAbility adjusts starting difficulty based on current ability
func (o *OnboardingService) adjustDifficultyForAbility(ability, confidence float64) float64 {
	// Start slightly below current ability to build confidence
	adjustedDifficulty := ability - 0.3

	// Adjust based on confidence
	if confidence < 0.6 {
		adjustedDifficulty -= 0.2 // Start easier if low confidence
	}

	// Ensure reasonable bounds
	if adjustedDifficulty < -2.0 {
		adjustedDifficulty = -2.0
	}
	if adjustedDifficulty > 1.0 {
		adjustedDifficulty = 1.0
	}

	return adjustedDifficulty
}

// sortRecommendationsByPriority sorts recommendations by priority and ability
func (o *OnboardingService) sortRecommendationsByPriority(recommendations []TopicRecommendation, abilities map[string]float64) {
	// Sort by priority first, then by ability (lowest first for same priority)
	for i := 0; i < len(recommendations)-1; i++ {
		for j := i + 1; j < len(recommendations); j++ {
			// Priority order: high > medium > low
			iPriority := o.priorityToInt(recommendations[i].Priority)
			jPriority := o.priorityToInt(recommendations[j].Priority)

			shouldSwap := false
			if iPriority < jPriority {
				shouldSwap = true
			} else if iPriority == jPriority {
				// Same priority, sort by ability (lowest first)
				iAbility := abilities[recommendations[i].Topic]
				jAbility := abilities[recommendations[j].Topic]
				if iAbility > jAbility {
					shouldSwap = true
				}
			}

			if shouldSwap {
				recommendations[i], recommendations[j] = recommendations[j], recommendations[i]
			}
		}
	}
}

// priorityToInt converts priority string to int for sorting
func (o *OnboardingService) priorityToInt(priority string) int {
	switch priority {
	case "high":
		return 3
	case "medium":
		return 2
	case "low":
		return 1
	default:
		return 0
	}
}

// generateStudyPlan creates a study plan based on user preferences
func (o *OnboardingService) generateStudyPlan(preferences UserPreferences) StudyPlan {
	// Calculate weekly distribution
	weeklySchedule := make(map[string]int)
	activeDays := 0
	for _, active := range preferences.WeeklySchedule {
		if active {
			activeDays++
		}
	}

	// Distribute daily minutes across active days
	if activeDays > 0 {
		dailyMinutes := preferences.AvailableTime
		for day, active := range preferences.WeeklySchedule {
			if active {
				weeklySchedule[day] = dailyMinutes
			} else {
				weeklySchedule[day] = 0
			}
		}
	}

	// Determine session types based on study goal
	sessionTypes := []string{"practice"}
	switch preferences.StudyGoal {
	case "pass_test":
		sessionTypes = []string{"practice", "review", "mock_test"}
	case "improve_skills":
		sessionTypes = []string{"practice", "review"}
	case "refresh_knowledge":
		sessionTypes = []string{"review", "practice"}
	default:
		sessionTypes = []string{"practice", "review"}
	}

	// Set review and test frequency based on study goal
	reviewFrequency := 3 // days
	testFrequency := 7   // days
	if preferences.StudyGoal == "pass_test" {
		reviewFrequency = 2
		testFrequency = 5
	} else if preferences.StudyGoal == "refresh_knowledge" {
		reviewFrequency = 1
		testFrequency = 10
	}

	return StudyPlan{
		DailyMinutes:    preferences.AvailableTime,
		WeeklySchedule:  weeklySchedule,
		SessionTypes:    sessionTypes,
		ReviewFrequency: reviewFrequency,
		TestFrequency:   testFrequency,
	}
}

// generateLearningMilestones creates learning milestones based on placement results
func (o *OnboardingService) generateLearningMilestones(results *algorithms.PlacementResult, preferences UserPreferences) []LearningMilestone {
	var milestones []LearningMilestone

	// Calculate base date for milestones
	baseDate := time.Now()

	// Milestone 1: Foundation (2 weeks)
	milestone1 := LearningMilestone{
		ID:             "foundation",
		Title:          "Foundation Knowledge",
		Description:    "Master basic concepts and build confidence",
		TargetAccuracy: 0.7,
		RequiredTopics: []string{"traffic_signs", "road_rules"},
		EstimatedDate:  baseDate.AddDate(0, 0, 14),
		IsCompleted:    false,
	}
	milestones = append(milestones, milestone1)

	// Milestone 2: Intermediate (4 weeks)
	milestone2 := LearningMilestone{
		ID:             "intermediate",
		Title:          "Intermediate Skills",
		Description:    "Develop practical driving knowledge",
		TargetAccuracy: 0.8,
		RequiredTopics: []string{"vehicle_operation", "safety_procedures"},
		EstimatedDate:  baseDate.AddDate(0, 0, 28),
		IsCompleted:    false,
	}
	milestones = append(milestones, milestone2)

	// Milestone 3: Advanced (6 weeks)
	milestone3 := LearningMilestone{
		ID:             "advanced",
		Title:          "Advanced Proficiency",
		Description:    "Achieve test-ready performance",
		TargetAccuracy: 0.85,
		RequiredTopics: o.getAllTopics(results),
		EstimatedDate:  baseDate.AddDate(0, 0, 42),
		IsCompleted:    false,
	}
	milestones = append(milestones, milestone3)

	// Milestone 4: Test Ready (8 weeks)
	if preferences.StudyGoal == "pass_test" {
		milestone4 := LearningMilestone{
			ID:             "test_ready",
			Title:          "Test Ready",
			Description:    "Consistently pass practice tests",
			TargetAccuracy: 0.9,
			RequiredTopics: o.getAllTopics(results),
			EstimatedDate:  baseDate.AddDate(0, 0, 56),
			IsCompleted:    false,
		}
		milestones = append(milestones, milestone4)
	}

	return milestones
}

// generateDefaultMilestones creates default milestones for users who skip placement
func (o *OnboardingService) generateDefaultMilestones(preferences UserPreferences) []LearningMilestone {
	var milestones []LearningMilestone
	baseDate := time.Now()

	// Default milestones for beginner level
	milestone1 := LearningMilestone{
		ID:             "foundation",
		Title:          "Foundation Knowledge",
		Description:    "Learn basic traffic signs and road rules",
		TargetAccuracy: 0.7,
		RequiredTopics: []string{"traffic_signs", "road_rules"},
		EstimatedDate:  baseDate.AddDate(0, 0, 21), // 3 weeks for beginners
		IsCompleted:    false,
	}
	milestones = append(milestones, milestone1)

	milestone2 := LearningMilestone{
		ID:             "intermediate",
		Title:          "Practical Skills",
		Description:    "Develop vehicle operation and safety knowledge",
		TargetAccuracy: 0.75,
		RequiredTopics: []string{"vehicle_operation", "safety_procedures"},
		EstimatedDate:  baseDate.AddDate(0, 0, 42), // 6 weeks
		IsCompleted:    false,
	}
	milestones = append(milestones, milestone2)

	milestone3 := LearningMilestone{
		ID:             "proficient",
		Title:          "Proficient Driver",
		Description:    "Achieve consistent performance across all areas",
		TargetAccuracy: 0.8,
		RequiredTopics: []string{"traffic_signs", "road_rules", "vehicle_operation", "safety_procedures"},
		EstimatedDate:  baseDate.AddDate(0, 0, 63), // 9 weeks
		IsCompleted:    false,
	}
	milestones = append(milestones, milestone3)

	return milestones
}

// getAllTopics extracts all topics from placement results
func (o *OnboardingService) getAllTopics(results *algorithms.PlacementResult) []string {
	var topics []string
	for topic := range results.TopicAbilities {
		topics = append(topics, topic)
	}
	return topics
}

// estimateLearningDuration estimates total learning duration based on results and preferences
func (o *OnboardingService) estimateLearningDuration(results *algorithms.PlacementResult, preferences UserPreferences) int {
	// Base duration based on overall ability
	var baseDays int
	switch results.RecommendedLevel {
	case "foundation":
		baseDays = 90 // 3 months
	case "beginner":
		baseDays = 70 // ~2.5 months
	case "intermediate":
		baseDays = 50 // ~1.5 months
	case "advanced":
		baseDays = 30 // 1 month
	default:
		baseDays = 60 // 2 months default
	}

	// Adjust based on daily study time
	if preferences.AvailableTime >= 60 {
		baseDays = int(float64(baseDays) * 0.7) // 30% faster with more time
	} else if preferences.AvailableTime <= 15 {
		baseDays = int(float64(baseDays) * 1.5) // 50% longer with less time
	}

	// Adjust based on study goal
	switch preferences.StudyGoal {
	case "pass_test":
		baseDays = int(float64(baseDays) * 0.8) // More focused, faster completion
	case "refresh_knowledge":
		baseDays = int(float64(baseDays) * 0.6) // Just refreshing, faster
	}

	// Ensure reasonable bounds
	if baseDays < 14 {
		baseDays = 14 // Minimum 2 weeks
	}
	if baseDays > 180 {
		baseDays = 180 // Maximum 6 months
	}

	return baseDays
}

// estimateDefaultDuration estimates duration for default learning path
func (o *OnboardingService) estimateDefaultDuration(preferences UserPreferences) int {
	baseDays := 70 // Default for beginner level

	// Adjust based on available time
	if preferences.AvailableTime >= 60 {
		baseDays = 50
	} else if preferences.AvailableTime <= 15 {
		baseDays = 100
	}

	return baseDays
}

// Storage methods

// getOnboardingState retrieves onboarding state from cache/database
func (o *OnboardingService) getOnboardingState(ctx context.Context, userID string) (*OnboardingState, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("onboarding:%s", userID)
	var state OnboardingState
	err := o.cache.Get(ctx, cacheKey, &state)
	if err == nil {
		return &state, nil
	}

	// Try database - for now, return not found since we don't have the table structure
	// TODO: Implement proper database retrieval once tables are created
	return nil, fmt.Errorf("onboarding state not found")

	// Cache for future use
	stateBytes, _ := json.Marshal(state)
	_ = o.cache.Set(ctx, cacheKey, string(stateBytes), 30*time.Minute)

	return &state, nil
}

// storeOnboardingState stores onboarding state in cache and database
func (o *OnboardingService) storeOnboardingState(ctx context.Context, state *OnboardingState) error {
	stateBytes, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to marshal onboarding state: %w", err)
	}

	// Store in database - for now, just log since we don't have the table structure
	// TODO: Implement proper database storage once tables are created
	o.logger.WithContext(ctx).WithField("user_id", state.UserID).Debug("Onboarding state stored (cache only)")

	// Store in cache
	cacheKey := fmt.Sprintf("onboarding:%s", state.UserID)
	err = o.cache.Set(ctx, cacheKey, string(stateBytes), 30*time.Minute)
	if err != nil {
		o.logger.WithContext(ctx).WithError(err).Warn("Failed to cache onboarding state")
	}

	return nil
}

// storePlacementState stores placement test state in cache
func (o *OnboardingService) storePlacementState(ctx context.Context, sessionID string, state *algorithms.PlacementTestState) error {
	stateBytes, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to marshal placement state: %w", err)
	}

	cacheKey := fmt.Sprintf("placement:%s", sessionID)
	err = o.cache.Set(ctx, cacheKey, string(stateBytes), 2*time.Hour)
	if err != nil {
		return fmt.Errorf("failed to cache placement state: %w", err)
	}

	return nil
}

// trackOnboardingCompletion tracks analytics for completed onboarding
func (o *OnboardingService) trackOnboardingCompletion(ctx context.Context, state *OnboardingState) error {
	// Calculate total time spent
	totalTime := 0
	for _, timeSpent := range state.Analytics.TimeSpent {
		totalTime += timeSpent
	}

	// Store completion analytics - for now, just log since we don't have the table structure
	// TODO: Implement proper analytics storage once tables are created
	placementCompleted := state.PlacementTest != nil && state.PlacementTest.Status == PlacementCompleted
	recommendedLevel := ""
	if state.LearningPath != nil {
		recommendedLevel = state.LearningPath.RecommendedLevel
	}

	o.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":             state.UserID,
		"total_time_seconds":  totalTime,
		"satisfaction":        state.Analytics.UserSatisfaction,
		"placement_completed": placementCompleted,
		"recommended_level":   recommendedLevel,
	}).Info("Onboarding completion analytics tracked")

	return nil
}
