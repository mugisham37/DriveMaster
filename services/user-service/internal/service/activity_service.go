package service

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"
	"user-service/internal/cache"
	"user-service/internal/config"
	"user-service/internal/events"
	"user-service/internal/models"
	"user-service/internal/repository"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// ActivityService handles user activity tracking and analytics
type ActivityService interface {
	// Activity tracking
	RecordActivity(ctx context.Context, activity *models.UserActivity) error
	RecordActivitiesBatch(ctx context.Context, activities []models.UserActivity) error
	GetActivity(ctx context.Context, activityID uuid.UUID) (*models.UserActivity, error)
	GetUserActivities(ctx context.Context, userID uuid.UUID, filters *models.ActivityFilters) ([]models.UserActivity, error)
	GetSessionActivities(ctx context.Context, sessionID uuid.UUID) ([]models.UserActivity, error)

	// Activity analytics and summaries
	GetActivitySummary(ctx context.Context, userID uuid.UUID, dateRange models.DateRange) (*models.ActivitySummary, error)
	GetActivityAggregation(ctx context.Context, filters *models.ActivityFilters, groupBy, period string) (*models.ActivityAggregation, error)
	GetEngagementMetrics(ctx context.Context, userID uuid.UUID, days int) (*models.EngagementMetrics, error)

	// Behavior analysis
	GetBehaviorPatterns(ctx context.Context, userID uuid.UUID, days int) ([]models.BehaviorPattern, error)
	GetTopTopics(ctx context.Context, userID uuid.UUID, limit int, days int) ([]models.TopicActivitySummary, error)

	// Insights and recommendations
	GenerateActivityInsights(ctx context.Context, userID uuid.UUID) ([]models.ActivityInsight, error)
	GenerateActivityRecommendations(ctx context.Context, userID uuid.UUID) ([]models.ActivityRecommendation, error)
	GetActivityInsights(ctx context.Context, userID uuid.UUID) ([]models.ActivityInsight, error)
	GetActivityRecommendations(ctx context.Context, userID uuid.UUID) ([]models.ActivityRecommendation, error)
	ApplyRecommendation(ctx context.Context, recommendationID string, userID uuid.UUID) error

	// Event publishing
	PublishActivityEvent(ctx context.Context, activity *models.UserActivity) error

	// Utility methods
	ValidateActivity(activity *models.UserActivity) error
	EnrichActivity(ctx context.Context, activity *models.UserActivity) error
}

type activityService struct {
	repo      repository.ActivityRepository
	cache     cache.CacheInterface
	publisher events.EventPublisher
	config    *config.Config
	logger    *logrus.Logger
}

// NewActivityService creates a new activity service instance
func NewActivityService(
	repo repository.ActivityRepository,
	cache cache.CacheInterface,
	publisher events.EventPublisher,
	cfg *config.Config,
	log *logrus.Logger,
) ActivityService {
	return &activityService{
		repo:      repo,
		cache:     cache,
		publisher: publisher,
		config:    cfg,
		logger:    log,
	}
}

// RecordActivity records a single user activity
func (s *activityService) RecordActivity(ctx context.Context, activity *models.UserActivity) error {
	// Validate the activity
	if err := s.ValidateActivity(activity); err != nil {
		return fmt.Errorf("activity validation failed: %w", err)
	}

	// Enrich the activity with additional context
	if err := s.EnrichActivity(ctx, activity); err != nil {
		s.logger.Warn("Failed to enrich activity", "error", err, "activity_id", activity.ID)
	}

	// Record in database
	if err := s.repo.CreateActivity(ctx, activity); err != nil {
		return fmt.Errorf("failed to create activity: %w", err)
	}

	// Publish event asynchronously
	go func() {
		if err := s.PublishActivityEvent(context.Background(), activity); err != nil {
			s.logger.Error("Failed to publish activity event", "error", err, "activity_id", activity.ID)
		}
	}()

	// Invalidate relevant caches
	s.invalidateActivityCaches(ctx, activity.UserID)

	s.logger.Debug("Activity recorded", "user_id", activity.UserID, "type", activity.ActivityType, "id", activity.ID)

	return nil
}

// RecordActivitiesBatch records multiple activities in a batch
func (s *activityService) RecordActivitiesBatch(ctx context.Context, activities []models.UserActivity) error {
	if len(activities) == 0 {
		return nil
	}

	// Validate all activities
	for i := range activities {
		if err := s.ValidateActivity(&activities[i]); err != nil {
			return fmt.Errorf("activity validation failed for index %d: %w", i, err)
		}

		// Enrich each activity
		if err := s.EnrichActivity(ctx, &activities[i]); err != nil {
			s.logger.Warn("Failed to enrich activity", "error", err, "activity_id", activities[i].ID)
		}
	}

	// Record in database as batch
	if err := s.repo.CreateActivitiesBatch(ctx, activities); err != nil {
		return fmt.Errorf("failed to create activities batch: %w", err)
	}

	// Publish events asynchronously
	go func() {
		for _, activity := range activities {
			if err := s.PublishActivityEvent(context.Background(), &activity); err != nil {
				s.logger.Error("Failed to publish activity event", "error", err, "activity_id", activity.ID)
			}
		}
	}()

	// Invalidate caches for all affected users
	userIDs := make(map[uuid.UUID]bool)
	for _, activity := range activities {
		userIDs[activity.UserID] = true
	}

	for userID := range userIDs {
		s.invalidateActivityCaches(ctx, userID)
	}

	s.logger.Info("Activities batch recorded", "count", len(activities))

	return nil
}

// GetActivity retrieves a specific activity by ID
func (s *activityService) GetActivity(ctx context.Context, activityID uuid.UUID) (*models.UserActivity, error) {
	return s.repo.GetActivity(ctx, activityID)
}

// GetUserActivities retrieves activities for a user with filters
func (s *activityService) GetUserActivities(ctx context.Context, userID uuid.UUID, filters *models.ActivityFilters) ([]models.UserActivity, error) {
	cacheKey := s.buildActivityCacheKey(userID, filters)

	// Try cache first for recent activities
	if filters != nil && filters.Limit <= 100 && filters.DateFrom == nil {
		var activities []models.UserActivity
		if err := s.cache.Get(ctx, cacheKey, &activities); err == nil {
			return activities, nil
		}
	}

	// Get from repository
	activities, err := s.repo.GetActivitiesByUser(ctx, userID, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get user activities: %w", err)
	}

	// Cache recent activities
	if filters != nil && filters.Limit <= 100 && filters.DateFrom == nil {
		if err := s.cache.Set(ctx, cacheKey, activities, 5*time.Minute); err != nil {
			s.logger.Warn("Failed to cache user activities", "error", err, "user_id", userID)
		}
	}

	return activities, nil
}

// GetSessionActivities retrieves all activities for a session
func (s *activityService) GetSessionActivities(ctx context.Context, sessionID uuid.UUID) ([]models.UserActivity, error) {
	cacheKey := fmt.Sprintf("session_activities:%s", sessionID.String())

	// Try cache first
	var activities []models.UserActivity
	if err := s.cache.Get(ctx, cacheKey, &activities); err == nil {
		return activities, nil
	}

	// Get from repository
	activities, err := s.repo.GetActivitiesBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session activities: %w", err)
	}

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, activities, 15*time.Minute); err != nil {
		s.logger.Warn("Failed to cache session activities", "error", err, "session_id", sessionID)
	}

	return activities, nil
}

// GetActivitySummary generates an activity summary for a user
func (s *activityService) GetActivitySummary(ctx context.Context, userID uuid.UUID, dateRange models.DateRange) (*models.ActivitySummary, error) {
	cacheKey := fmt.Sprintf("activity_summary:%s:%s:%s", userID.String(), dateRange.Start.Format("2006-01-02"), dateRange.End.Format("2006-01-02"))

	// Try cache first
	var summary models.ActivitySummary
	if err := s.cache.Get(ctx, cacheKey, &summary); err == nil {
		return &summary, nil
	}

	// Get from repository
	summaryPtr, err := s.repo.GetActivitySummary(ctx, userID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get activity summary: %w", err)
	}

	// Enhance summary with additional calculations
	s.enhanceActivitySummary(ctx, summaryPtr)

	// Cache the result
	cacheTTL := 1 * time.Hour
	if dateRange.End.After(time.Now().AddDate(0, 0, -1)) {
		cacheTTL = 10 * time.Minute // Shorter cache for recent data
	}

	if err := s.cache.Set(ctx, cacheKey, summaryPtr, cacheTTL); err != nil {
		s.logger.Warn("Failed to cache activity summary", "error", err, "user_id", userID)
	}

	return summaryPtr, nil
}

// GetActivityAggregation provides aggregated activity data
func (s *activityService) GetActivityAggregation(ctx context.Context, filters *models.ActivityFilters, groupBy, period string) (*models.ActivityAggregation, error) {
	return s.repo.GetActivityAggregation(ctx, filters, groupBy, period)
}

// GetEngagementMetrics calculates engagement metrics for a user
func (s *activityService) GetEngagementMetrics(ctx context.Context, userID uuid.UUID, days int) (*models.EngagementMetrics, error) {
	cacheKey := fmt.Sprintf("engagement_metrics:%s:%d", userID.String(), days)

	// Try cache first
	var metrics models.EngagementMetrics
	if err := s.cache.Get(ctx, cacheKey, &metrics); err == nil {
		return &metrics, nil
	}

	// Get from repository
	metricsPtr, err := s.repo.GetEngagementMetrics(ctx, userID, days)
	if err != nil {
		return nil, fmt.Errorf("failed to get engagement metrics: %w", err)
	}

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, metricsPtr, 30*time.Minute); err != nil {
		s.logger.Warn("Failed to cache engagement metrics", "error", err, "user_id", userID)
	}

	return metricsPtr, nil
}

// GetBehaviorPatterns identifies behavior patterns for a user
func (s *activityService) GetBehaviorPatterns(ctx context.Context, userID uuid.UUID, days int) ([]models.BehaviorPattern, error) {
	cacheKey := fmt.Sprintf("behavior_patterns:%s:%d", userID.String(), days)

	// Try cache first
	var patterns []models.BehaviorPattern
	if err := s.cache.Get(ctx, cacheKey, &patterns); err == nil {
		return patterns, nil
	}

	// Get from repository
	patterns, err := s.repo.GetBehaviorPatterns(ctx, userID, days)
	if err != nil {
		return nil, fmt.Errorf("failed to get behavior patterns: %w", err)
	}

	// Enhance patterns with additional analysis
	s.enhanceBehaviorPatterns(ctx, userID, patterns)

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, patterns, 2*time.Hour); err != nil {
		s.logger.Warn("Failed to cache behavior patterns", "error", err, "user_id", userID)
	}

	return patterns, nil
}

// GetTopTopics gets the most active topics for a user
func (s *activityService) GetTopTopics(ctx context.Context, userID uuid.UUID, limit int, days int) ([]models.TopicActivitySummary, error) {
	cacheKey := fmt.Sprintf("top_topics:%s:%d:%d", userID.String(), limit, days)

	// Try cache first
	var topics []models.TopicActivitySummary
	if err := s.cache.Get(ctx, cacheKey, &topics); err == nil {
		return topics, nil
	}

	// Get from repository
	topics, err := s.repo.GetTopTopics(ctx, userID, limit, days)
	if err != nil {
		return nil, fmt.Errorf("failed to get top topics: %w", err)
	}

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, topics, 1*time.Hour); err != nil {
		s.logger.Warn("Failed to cache top topics", "error", err, "user_id", userID)
	}

	return topics, nil
}

// GenerateActivityInsights generates personalized insights based on user activity
func (s *activityService) GenerateActivityInsights(ctx context.Context, userID uuid.UUID) ([]models.ActivityInsight, error) {
	var insights []models.ActivityInsight

	// Get recent activity data
	dateRange := models.DateRange{
		Start: time.Now().AddDate(0, 0, -30), // Last 30 days
		End:   time.Now(),
	}

	summary, err := s.GetActivitySummary(ctx, userID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get activity summary: %w", err)
	}

	engagementMetrics, err := s.GetEngagementMetrics(ctx, userID, 30)
	if err != nil {
		return nil, fmt.Errorf("failed to get engagement metrics: %w", err)
	}

	// Generate engagement insights
	if engagementMetrics.EngagementScore < 0.3 {
		insights = append(insights, models.ActivityInsight{
			ID:          uuid.New().String(),
			UserID:      userID,
			Type:        "low_engagement",
			Title:       "Low Engagement Detected",
			Description: "Your engagement has been lower than usual. Consider setting up a regular study schedule.",
			Severity:    "warning",
			Category:    "engagement",
			Metadata: map[string]interface{}{
				"engagement_score": engagementMetrics.EngagementScore,
				"churn_risk":       engagementMetrics.ChurnRisk,
			},
			ActionItems: []string{
				"Set up daily study reminders",
				"Try shorter, more frequent study sessions",
				"Review your learning goals",
			},
			GeneratedAt: time.Now(),
		})
	}

	// Generate session length insights
	avgSessionMinutes := float64(engagementMetrics.AverageSessionLength) / (1000 * 60)
	if avgSessionMinutes < 2 {
		insights = append(insights, models.ActivityInsight{
			ID:          uuid.New().String(),
			UserID:      userID,
			Type:        "short_sessions",
			Title:       "Very Short Study Sessions",
			Description: fmt.Sprintf("Your average session length is %.1f minutes. Longer sessions might be more effective.", avgSessionMinutes),
			Severity:    "info",
			Category:    "performance",
			Metadata: map[string]interface{}{
				"avg_session_minutes": avgSessionMinutes,
				"recommended_minimum": 5,
			},
			ActionItems: []string{
				"Try to study for at least 5-10 minutes per session",
				"Use the Pomodoro technique (25-minute focused sessions)",
				"Set session goals before starting",
			},
			GeneratedAt: time.Now(),
		})
	} else if avgSessionMinutes > 60 {
		insights = append(insights, models.ActivityInsight{
			ID:          uuid.New().String(),
			UserID:      userID,
			Type:        "long_sessions",
			Title:       "Very Long Study Sessions",
			Description: fmt.Sprintf("Your average session length is %.1f minutes. Consider taking breaks to maintain focus.", avgSessionMinutes),
			Severity:    "info",
			Category:    "performance",
			Metadata: map[string]interface{}{
				"avg_session_minutes": avgSessionMinutes,
				"recommended_maximum": 45,
			},
			ActionItems: []string{
				"Take 5-10 minute breaks every 25-30 minutes",
				"Break long study sessions into smaller chunks",
				"Stay hydrated and stretch regularly",
			},
			GeneratedAt: time.Now(),
		})
	}

	// Generate streak insights
	if engagementMetrics.DailyActiveStreak >= 7 {
		insights = append(insights, models.ActivityInsight{
			ID:          uuid.New().String(),
			UserID:      userID,
			Type:        "streak_achievement",
			Title:       "Great Learning Streak!",
			Description: fmt.Sprintf("You've maintained a %d-day learning streak. Keep up the excellent work!", engagementMetrics.DailyActiveStreak),
			Severity:    "info",
			Category:    "engagement",
			Metadata: map[string]interface{}{
				"streak_days": engagementMetrics.DailyActiveStreak,
			},
			ActionItems: []string{
				"Continue your consistent study habit",
				"Consider gradually increasing session length",
				"Share your achievement with friends",
			},
			GeneratedAt: time.Now(),
		})
	} else if engagementMetrics.DailyActiveStreak == 0 {
		insights = append(insights, models.ActivityInsight{
			ID:          uuid.New().String(),
			UserID:      userID,
			Type:        "no_streak",
			Title:       "Start a Learning Streak",
			Description: "Building a consistent daily study habit can significantly improve your learning outcomes.",
			Severity:    "info",
			Category:    "engagement",
			Metadata: map[string]interface{}{
				"streak_days": 0,
			},
			ActionItems: []string{
				"Set a daily study reminder",
				"Start with just 5 minutes per day",
				"Track your progress visually",
			},
			GeneratedAt: time.Now(),
		})
	}

	// Generate topic diversity insights
	if len(summary.TopTopics) > 0 {
		topTopicActivity := summary.TopTopics[0].ActivityCount
		totalActivity := summary.TotalActivities

		if float64(topTopicActivity)/float64(totalActivity) > 0.7 {
			insights = append(insights, models.ActivityInsight{
				ID:          uuid.New().String(),
				UserID:      userID,
				Type:        "topic_concentration",
				Title:       "Focused on One Topic",
				Description: fmt.Sprintf("You're spending most of your time on '%s'. Consider diversifying your study topics.", summary.TopTopics[0].TopicID),
				Severity:    "info",
				Category:    "behavior",
				Metadata: map[string]interface{}{
					"dominant_topic":    summary.TopTopics[0].TopicID,
					"concentration_pct": float64(topTopicActivity) / float64(totalActivity) * 100,
				},
				ActionItems: []string{
					"Explore other topics in your curriculum",
					"Use spaced repetition across multiple topics",
					"Set topic rotation goals",
				},
				GeneratedAt: time.Now(),
			})
		}
	}

	// Store insights in database
	for _, insight := range insights {
		if err := s.repo.CreateActivityInsight(ctx, &insight); err != nil {
			s.logger.Error("Failed to store activity insight", "error", err, "insight_id", insight.ID)
		}
	}

	return insights, nil
}

// GenerateActivityRecommendations generates personalized recommendations based on activity
func (s *activityService) GenerateActivityRecommendations(ctx context.Context, userID uuid.UUID) ([]models.ActivityRecommendation, error) {
	var recommendations []models.ActivityRecommendation

	// Get recent activity data
	engagementMetrics, err := s.GetEngagementMetrics(ctx, userID, 30)
	if err != nil {
		return nil, fmt.Errorf("failed to get engagement metrics: %w", err)
	}

	behaviorPatterns, err := s.GetBehaviorPatterns(ctx, userID, 30)
	if err != nil {
		return nil, fmt.Errorf("failed to get behavior patterns: %w", err)
	}

	// Generate schedule recommendations based on peak hours
	for _, pattern := range behaviorPatterns {
		if pattern.PatternType == "peak_hours" {
			if peakHours, ok := pattern.Metadata["peak_hours"].([]int); ok && len(peakHours) > 0 {
				recommendations = append(recommendations, models.ActivityRecommendation{
					ID:          uuid.New().String(),
					UserID:      userID,
					Type:        "optimal_schedule",
					Title:       "Optimize Your Study Schedule",
					Description: fmt.Sprintf("You're most active during hours %v. Schedule your important study sessions during these times.", peakHours),
					Priority:    7,
					Category:    "study_schedule",
					Metadata: map[string]interface{}{
						"peak_hours": peakHours,
					},
					Actions: []models.RecommendationAction{
						{
							ID:          uuid.New().String(),
							Type:        "schedule",
							Title:       "Set Study Reminders",
							Description: "Set up notifications for your peak activity hours",
							Metadata: map[string]interface{}{
								"hours": peakHours,
							},
						},
					},
					GeneratedAt: time.Now(),
				})
			}
		}
	}

	// Generate session length recommendations
	avgSessionMinutes := float64(engagementMetrics.AverageSessionLength) / (1000 * 60)
	if avgSessionMinutes < 5 {
		recommendations = append(recommendations, models.ActivityRecommendation{
			ID:          uuid.New().String(),
			UserID:      userID,
			Type:        "session_length",
			Title:       "Increase Session Length",
			Description: "Try longer study sessions for better learning retention. Aim for 15-25 minute focused sessions.",
			Priority:    6,
			Category:    "strategy",
			Metadata: map[string]interface{}{
				"current_avg_minutes": avgSessionMinutes,
				"recommended_minutes": 20,
			},
			Actions: []models.RecommendationAction{
				{
					ID:          uuid.New().String(),
					Type:        "technique",
					Title:       "Try the Pomodoro Technique",
					Description: "Use 25-minute focused study sessions with 5-minute breaks",
				},
			},
			GeneratedAt: time.Now(),
		})
	}

	// Generate engagement recommendations
	if engagementMetrics.ChurnRisk == "high" {
		recommendations = append(recommendations, models.ActivityRecommendation{
			ID:          uuid.New().String(),
			UserID:      userID,
			Type:        "engagement_boost",
			Title:       "Boost Your Learning Engagement",
			Description: "Your engagement has been low recently. Try these strategies to get back on track.",
			Priority:    9,
			Category:    "engagement",
			Metadata: map[string]interface{}{
				"churn_risk":       engagementMetrics.ChurnRisk,
				"engagement_score": engagementMetrics.EngagementScore,
			},
			Actions: []models.RecommendationAction{
				{
					ID:          uuid.New().String(),
					Type:        "goal_setting",
					Title:       "Set Small Daily Goals",
					Description: "Start with just 10 minutes of study per day",
				},
				{
					ID:          uuid.New().String(),
					Type:        "gamification",
					Title:       "Track Your Progress",
					Description: "Use visual progress tracking to stay motivated",
				},
			},
			GeneratedAt: time.Now(),
		})
	}

	// Generate streak building recommendations
	if engagementMetrics.DailyActiveStreak < 3 {
		recommendations = append(recommendations, models.ActivityRecommendation{
			ID:          uuid.New().String(),
			UserID:      userID,
			Type:        "streak_building",
			Title:       "Build a Learning Streak",
			Description: "Consistent daily practice, even for just a few minutes, can significantly improve your learning outcomes.",
			Priority:    5,
			Category:    "study_schedule",
			Metadata: map[string]interface{}{
				"current_streak": engagementMetrics.DailyActiveStreak,
				"target_streak":  7,
			},
			Actions: []models.RecommendationAction{
				{
					ID:          uuid.New().String(),
					Type:        "reminder",
					Title:       "Set Daily Reminders",
					Description: "Set up notifications to remind you to study each day",
				},
				{
					ID:          uuid.New().String(),
					Type:        "micro_learning",
					Title:       "Start Small",
					Description: "Begin with just 5 minutes per day to build the habit",
				},
			},
			GeneratedAt: time.Now(),
		})
	}

	// Store recommendations in database
	for _, rec := range recommendations {
		if err := s.repo.CreateActivityRecommendation(ctx, &rec); err != nil {
			s.logger.Error("Failed to store activity recommendation", "error", err, "recommendation_id", rec.ID)
		}
	}

	return recommendations, nil
}

// GetActivityInsights retrieves stored activity insights for a user
func (s *activityService) GetActivityInsights(ctx context.Context, userID uuid.UUID) ([]models.ActivityInsight, error) {
	return s.repo.GetActivityInsights(ctx, userID)
}

// GetActivityRecommendations retrieves stored activity recommendations for a user
func (s *activityService) GetActivityRecommendations(ctx context.Context, userID uuid.UUID) ([]models.ActivityRecommendation, error) {
	return s.repo.GetActivityRecommendations(ctx, userID)
}

// ApplyRecommendation marks a recommendation as applied
func (s *activityService) ApplyRecommendation(ctx context.Context, recommendationID string, userID uuid.UUID) error {
	return s.repo.MarkRecommendationApplied(ctx, recommendationID, userID)
}

// PublishActivityEvent publishes an activity event to Kafka
func (s *activityService) PublishActivityEvent(ctx context.Context, activity *models.UserActivity) error {
	// Create metadata map for the event
	metadata := make(map[string]interface{})
	for k, v := range activity.Metadata {
		metadata[k] = v
	}

	// Add additional context
	metadata["activity_id"] = activity.ID.String()
	if activity.ItemID != nil {
		metadata["item_id"] = activity.ItemID.String()
	}
	if activity.TopicID != nil {
		metadata["topic_id"] = *activity.TopicID
	}
	if activity.Duration != nil {
		metadata["duration_ms"] = *activity.Duration
	}

	// Publish the event
	return s.publisher.PublishUserActivity(
		ctx,
		activity.UserID,
		string(activity.ActivityType),
		metadata,
		func() string {
			if activity.SessionID != nil {
				return activity.SessionID.String()
			}
			return ""
		}(),
		activity.DeviceType,
		activity.AppVersion,
	)
}

// ValidateActivity validates activity data
func (s *activityService) ValidateActivity(activity *models.UserActivity) error {
	if err := activity.Validate(); err != nil {
		return err
	}

	// Additional business logic validation
	if !models.IsValidActivityType(string(activity.ActivityType)) {
		return models.ErrInvalidActivityType
	}

	// Validate metadata based on activity type
	switch activity.ActivityType {
	case models.ActivityTypeAttemptStart, models.ActivityTypeAttemptSubmit:
		if activity.ItemID == nil {
			return models.NewAppError("MISSING_ITEM_ID", "Item ID is required for attempt activities")
		}
	case models.ActivityTypeSessionStart, models.ActivityTypeSessionEnd:
		if activity.SessionID == nil {
			return models.NewAppError("MISSING_SESSION_ID", "Session ID is required for session activities")
		}
	}

	return nil
}

// EnrichActivity enriches activity with additional context
func (s *activityService) EnrichActivity(ctx context.Context, activity *models.UserActivity) error {
	// Add timestamp if not set
	if activity.Timestamp.IsZero() {
		activity.Timestamp = time.Now()
	}

	// Add created_at if not set
	if activity.CreatedAt.IsZero() {
		activity.CreatedAt = time.Now()
	}

	// Generate ID if not set
	if activity.ID == uuid.Nil {
		activity.ID = uuid.New()
	}

	// Initialize metadata if nil
	if activity.Metadata == nil {
		activity.Metadata = make(map[string]interface{})
	}

	// Add enrichment metadata
	activity.Metadata["enriched_at"] = time.Now()
	activity.Metadata["service_version"] = "1.0"

	// Add derived fields based on activity type
	switch activity.ActivityType {
	case models.ActivityTypeLogin:
		activity.Metadata["login_method"] = "standard"
	case models.ActivityTypeAttemptSubmit:
		if activity.Duration != nil && *activity.Duration > 0 {
			activity.Metadata["response_speed"] = s.categorizeResponseSpeed(*activity.Duration)
		}
	}

	return nil
}

// Helper methods

// invalidateActivityCaches invalidates activity-related caches for a user
func (s *activityService) invalidateActivityCaches(ctx context.Context, userID uuid.UUID) {
	cacheKeys := []string{
		fmt.Sprintf("activity_summary:%s:*", userID.String()),
		fmt.Sprintf("engagement_metrics:%s:*", userID.String()),
		fmt.Sprintf("behavior_patterns:%s:*", userID.String()),
		fmt.Sprintf("top_topics:%s:*", userID.String()),
		fmt.Sprintf("user_activities:%s:*", userID.String()),
	}

	for _, pattern := range cacheKeys {
		// Note: This is a simplified cache invalidation
		// In a real implementation, you'd use pattern-based deletion
		if err := s.cache.Delete(ctx, pattern); err != nil {
			s.logger.Warn("Failed to invalidate cache", "error", err, "pattern", pattern)
		}
	}
}

// buildActivityCacheKey builds a cache key for activity queries
func (s *activityService) buildActivityCacheKey(userID uuid.UUID, filters *models.ActivityFilters) string {
	key := fmt.Sprintf("user_activities:%s", userID.String())

	if filters != nil {
		if filters.ActivityType != nil {
			key += fmt.Sprintf(":type_%s", *filters.ActivityType)
		}
		if filters.Limit > 0 {
			key += fmt.Sprintf(":limit_%d", filters.Limit)
		}
		if filters.Offset > 0 {
			key += fmt.Sprintf(":offset_%d", filters.Offset)
		}
	}

	return key
}

// enhanceActivitySummary adds additional calculations to activity summary
func (s *activityService) enhanceActivitySummary(ctx context.Context, summary *models.ActivitySummary) {
	s.logger.WithContext(ctx).Debug("Enhancing activity summary", "user_id", summary.UserID)

	// Calculate engagement score
	summary.EngagementMetrics.EngagementScore = summary.GetEngagementScore()

	// Add activity type insights
	if len(summary.ActivityBreakdown) > 0 {
		// Find most common activity type
		maxCount := 0
		var dominantActivity models.ActivityType
		for actType, count := range summary.ActivityBreakdown {
			if count > maxCount {
				maxCount = count
				dominantActivity = actType
			}
		}

		// Add to metadata
		if summary.EngagementMetrics.EngagementScore < 0.5 {
			// Low engagement - suggest more interactive activities
			summary.BehaviorPatterns = append(summary.BehaviorPatterns, models.BehaviorPattern{
				PatternType: "low_engagement",
				Description: "Consider more interactive study methods",
				Confidence:  0.7,
				Frequency:   "daily",
				Metadata: map[string]interface{}{
					"dominant_activity": dominantActivity,
					"engagement_score":  summary.EngagementMetrics.EngagementScore,
				},
				FirstSeen:   summary.DateRange.Start,
				LastSeen:    summary.DateRange.End,
				Occurrences: 1,
			})
		}
	}
}

// enhanceBehaviorPatterns adds additional analysis to behavior patterns
func (s *activityService) enhanceBehaviorPatterns(ctx context.Context, userID uuid.UUID, patterns []models.BehaviorPattern) {
	s.logger.WithContext(ctx).Debug("Enhancing behavior patterns", "user_id", userID, "pattern_count", len(patterns))

	// Sort patterns by confidence
	sort.Slice(patterns, func(i, j int) bool {
		return patterns[i].Confidence > patterns[j].Confidence
	})

	// Add pattern relationships and insights
	for i := range patterns {
		pattern := &patterns[i]

		// Enhance peak hours pattern
		if pattern.PatternType == "peak_hours" {
			if peakHours, ok := pattern.Metadata["peak_hours"].([]int); ok {
				// Categorize time of day
				timeCategory := s.categorizeTimeOfDay(peakHours)
				pattern.Metadata["time_category"] = timeCategory
				pattern.Metadata["user_id"] = userID.String() // Use userID parameter
				pattern.Description = fmt.Sprintf("Most active during %s hours: %v", timeCategory, peakHours)
			}
		}

		// Enhance session length pattern
		if pattern.PatternType == "session_length" {
			if avgDuration, ok := pattern.Metadata["avg_duration_ms"].(float64); ok {
				efficiency := s.calculateSessionEfficiency(avgDuration)
				pattern.Metadata["efficiency_score"] = efficiency
				pattern.Metadata["user_id"] = userID.String() // Use userID parameter
				pattern.Confidence = math.Min(pattern.Confidence+efficiency*0.2, 1.0)
			}
		}
	}
}

// categorizeResponseSpeed categorizes response speed
func (s *activityService) categorizeResponseSpeed(durationMs int64) string {
	seconds := float64(durationMs) / 1000.0
	switch {
	case seconds < 5:
		return "very_fast"
	case seconds < 15:
		return "fast"
	case seconds < 30:
		return "normal"
	case seconds < 60:
		return "slow"
	default:
		return "very_slow"
	}
}

// categorizeTimeOfDay categorizes hours into time periods
func (s *activityService) categorizeTimeOfDay(hours []int) string {
	if len(hours) == 0 {
		return "unknown"
	}

	morningCount := 0
	afternoonCount := 0
	eveningCount := 0
	nightCount := 0

	for _, hour := range hours {
		switch {
		case hour >= 6 && hour < 12:
			morningCount++
		case hour >= 12 && hour < 18:
			afternoonCount++
		case hour >= 18 && hour < 22:
			eveningCount++
		default:
			nightCount++
		}
	}

	// Find the dominant time period
	maxCount := morningCount
	category := "morning"

	if afternoonCount > maxCount {
		maxCount = afternoonCount
		category = "afternoon"
	}
	if eveningCount > maxCount {
		maxCount = eveningCount
		category = "evening"
	}
	if nightCount > maxCount {
		category = "night"
	}

	return category
}

// calculateSessionEfficiency calculates session efficiency score
func (s *activityService) calculateSessionEfficiency(avgDurationMs float64) float64 {
	minutes := avgDurationMs / (1000 * 60)

	// Optimal session length is considered to be 15-45 minutes
	switch {
	case minutes >= 15 && minutes <= 45:
		return 1.0 // Optimal
	case minutes >= 10 && minutes <= 60:
		return 0.8 // Good
	case minutes >= 5 && minutes <= 90:
		return 0.6 // Acceptable
	default:
		return 0.3 // Suboptimal
	}
}
