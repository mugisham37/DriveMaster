package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ActivityType represents different types of user activities
type ActivityType string

const (
	ActivityTypeLogin           ActivityType = "login"
	ActivityTypeLogout          ActivityType = "logout"
	ActivityTypeAttemptStart    ActivityType = "attempt_start"
	ActivityTypeAttemptSubmit   ActivityType = "attempt_submit"
	ActivityTypeSessionStart    ActivityType = "session_start"
	ActivityTypeSessionEnd      ActivityType = "session_end"
	ActivityTypeContentView     ActivityType = "content_view"
	ActivityTypeHintRequest     ActivityType = "hint_request"
	ActivityTypeExplanationView ActivityType = "explanation_view"
	ActivityTypeProgressView    ActivityType = "progress_view"
	ActivityTypeSettingsUpdate  ActivityType = "settings_update"
	ActivityTypeProfileUpdate   ActivityType = "profile_update"
	ActivityTypeSearch          ActivityType = "search"
	ActivityTypeFilter          ActivityType = "filter"
	ActivityTypeExport          ActivityType = "export"
	ActivityTypeShare           ActivityType = "share"
	ActivityTypeBookmark        ActivityType = "bookmark"
	ActivityTypeUnbookmark      ActivityType = "unbookmark"
	ActivityTypeReview          ActivityType = "review"
	ActivityTypeFeedback        ActivityType = "feedback"
	ActivityTypeError           ActivityType = "error"
	ActivityTypePerformance     ActivityType = "performance"
)

// UserActivity represents a user activity event
type UserActivity struct {
	ID           uuid.UUID    `json:"id" db:"id"`
	UserID       uuid.UUID    `json:"user_id" db:"user_id"`
	ActivityType ActivityType `json:"activity_type" db:"activity_type"`
	SessionID    *uuid.UUID   `json:"session_id,omitempty" db:"session_id"`
	ItemID       *uuid.UUID   `json:"item_id,omitempty" db:"item_id"`
	TopicID      *string      `json:"topic_id,omitempty" db:"topic_id"`

	// Activity metadata
	Metadata map[string]interface{} `json:"metadata" db:"metadata"`

	// Context information
	DeviceType string `json:"device_type,omitempty" db:"device_type"`
	AppVersion string `json:"app_version,omitempty" db:"app_version"`
	Platform   string `json:"platform,omitempty" db:"platform"`
	UserAgent  string `json:"user_agent,omitempty" db:"user_agent"`
	IPAddress  string `json:"ip_address,omitempty" db:"ip_address"`

	// Timing information
	Duration  *int64    `json:"duration_ms,omitempty" db:"duration_ms"`
	Timestamp time.Time `json:"timestamp" db:"timestamp"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// ActivitySummary represents aggregated activity data for a user
type ActivitySummary struct {
	UserID             uuid.UUID              `json:"user_id"`
	DateRange          DateRange              `json:"date_range"`
	TotalActivities    int                    `json:"total_activities"`
	ActivityBreakdown  map[ActivityType]int   `json:"activity_breakdown"`
	SessionCount       int                    `json:"session_count"`
	TotalSessionTime   int64                  `json:"total_session_time_ms"`
	AverageSessionTime int64                  `json:"average_session_time_ms"`
	DeviceBreakdown    map[string]int         `json:"device_breakdown"`
	PlatformBreakdown  map[string]int         `json:"platform_breakdown"`
	HourlyDistribution map[int]int            `json:"hourly_distribution"`
	DailyDistribution  map[string]int         `json:"daily_distribution"`
	TopTopics          []TopicActivitySummary `json:"top_topics"`
	EngagementMetrics  EngagementMetrics      `json:"engagement_metrics"`
	BehaviorPatterns   []BehaviorPattern      `json:"behavior_patterns"`
	GeneratedAt        time.Time              `json:"generated_at"`
}

// DateRange represents a time range for activity analysis
type DateRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// TopicActivitySummary represents activity summary for a specific topic
type TopicActivitySummary struct {
	TopicID         string    `json:"topic_id"`
	ActivityCount   int       `json:"activity_count"`
	TimeSpent       int64     `json:"time_spent_ms"`
	LastActivity    time.Time `json:"last_activity"`
	EngagementScore float64   `json:"engagement_score"`
}

// EngagementMetrics represents user engagement metrics
type EngagementMetrics struct {
	DailyActiveStreak    int     `json:"daily_active_streak"`
	WeeklyActiveStreak   int     `json:"weekly_active_streak"`
	AverageSessionLength int64   `json:"average_session_length_ms"`
	SessionsPerDay       float64 `json:"sessions_per_day"`
	ActivitiesPerSession float64 `json:"activities_per_session"`
	ReturnRate           float64 `json:"return_rate"`
	EngagementScore      float64 `json:"engagement_score"`
	ChurnRisk            string  `json:"churn_risk"` // "low", "medium", "high"
}

// BehaviorPattern represents identified user behavior patterns
type BehaviorPattern struct {
	PatternType string                 `json:"pattern_type"`
	Description string                 `json:"description"`
	Confidence  float64                `json:"confidence"`
	Frequency   string                 `json:"frequency"`
	Metadata    map[string]interface{} `json:"metadata"`
	FirstSeen   time.Time              `json:"first_seen"`
	LastSeen    time.Time              `json:"last_seen"`
	Occurrences int                    `json:"occurrences"`
}

// ActivityInsight represents insights derived from user activity
type ActivityInsight struct {
	ID          string                 `json:"id"`
	UserID      uuid.UUID              `json:"user_id"`
	Type        string                 `json:"type"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Severity    string                 `json:"severity"` // "info", "warning", "critical"
	Category    string                 `json:"category"` // "engagement", "performance", "behavior"
	Metadata    map[string]interface{} `json:"metadata"`
	ActionItems []string               `json:"action_items"`
	GeneratedAt time.Time              `json:"generated_at"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty"`
}

// ActivityRecommendation represents personalized recommendations based on activity
type ActivityRecommendation struct {
	ID          string                 `json:"id"`
	UserID      uuid.UUID              `json:"user_id"`
	Type        string                 `json:"type"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Priority    int                    `json:"priority"` // 1-10, higher is more important
	Category    string                 `json:"category"` // "study_schedule", "content", "strategy"
	Metadata    map[string]interface{} `json:"metadata"`
	Actions     []RecommendationAction `json:"actions"`
	GeneratedAt time.Time              `json:"generated_at"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty"`
	Applied     bool                   `json:"applied"`
	AppliedAt   *time.Time             `json:"applied_at,omitempty"`
}

// RecommendationAction represents an actionable item within a recommendation
type RecommendationAction struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	URL         string                 `json:"url,omitempty"`
	Metadata    map[string]interface{} `json:"metadata"`
}

// ActivityFilters represents filters for activity queries
type ActivityFilters struct {
	UserID       *uuid.UUID    `json:"user_id,omitempty"`
	ActivityType *ActivityType `json:"activity_type,omitempty"`
	SessionID    *uuid.UUID    `json:"session_id,omitempty"`
	ItemID       *uuid.UUID    `json:"item_id,omitempty"`
	TopicID      *string       `json:"topic_id,omitempty"`
	DeviceType   *string       `json:"device_type,omitempty"`
	Platform     *string       `json:"platform,omitempty"`
	DateFrom     *time.Time    `json:"date_from,omitempty"`
	DateTo       *time.Time    `json:"date_to,omitempty"`
	Limit        int           `json:"limit"`
	Offset       int           `json:"offset"`
}

// ActivityAggregation represents aggregated activity data
type ActivityAggregation struct {
	GroupBy     string             `json:"group_by"`
	Period      string             `json:"period"` // "hour", "day", "week", "month"
	Data        []AggregationPoint `json:"data"`
	TotalCount  int                `json:"total_count"`
	GeneratedAt time.Time          `json:"generated_at"`
}

// AggregationPoint represents a single point in aggregated data
type AggregationPoint struct {
	Key       string                 `json:"key"`
	Count     int                    `json:"count"`
	Timestamp time.Time              `json:"timestamp"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// Validate validates user activity data
func (ua *UserActivity) Validate() error {
	if ua.UserID == uuid.Nil {
		return NewAppError("INVALID_USER_ID", "User ID is required")
	}
	if ua.ActivityType == "" {
		return NewAppError("INVALID_ACTIVITY_TYPE", "Activity type is required")
	}
	if ua.Timestamp.IsZero() {
		ua.Timestamp = time.Now()
	}
	if ua.CreatedAt.IsZero() {
		ua.CreatedAt = time.Now()
	}
	if ua.ID == uuid.Nil {
		ua.ID = uuid.New()
	}
	if ua.Metadata == nil {
		ua.Metadata = make(map[string]interface{})
	}
	return nil
}

// ToJSON converts UserActivity to JSON bytes
func (ua *UserActivity) ToJSON() ([]byte, error) {
	return json.Marshal(ua)
}

// FromJSON populates UserActivity from JSON bytes
func (ua *UserActivity) FromJSON(data []byte) error {
	return json.Unmarshal(data, ua)
}

// GetEngagementScore calculates an engagement score based on activity patterns
func (as *ActivitySummary) GetEngagementScore() float64 {
	if as.TotalActivities == 0 {
		return 0.0
	}

	// Base score from activity frequency
	baseScore := float64(as.TotalActivities) / 100.0 // Normalize to 0-1 range
	if baseScore > 1.0 {
		baseScore = 1.0
	}

	// Session quality bonus
	sessionQuality := 0.0
	if as.SessionCount > 0 {
		avgSessionTime := float64(as.AverageSessionTime) / (1000 * 60) // Convert to minutes
		if avgSessionTime >= 5 && avgSessionTime <= 60 {               // Optimal session length
			sessionQuality = 0.2
		} else if avgSessionTime >= 2 && avgSessionTime <= 90 {
			sessionQuality = 0.1
		}
	}

	// Diversity bonus (using different devices/platforms)
	diversityBonus := 0.0
	if len(as.DeviceBreakdown) > 1 {
		diversityBonus += 0.05
	}
	if len(as.PlatformBreakdown) > 1 {
		diversityBonus += 0.05
	}

	// Consistency bonus (regular daily activity)
	consistencyBonus := 0.0
	if len(as.DailyDistribution) >= 3 { // Active on at least 3 days
		consistencyBonus = 0.1
	}

	totalScore := baseScore + sessionQuality + diversityBonus + consistencyBonus
	if totalScore > 1.0 {
		totalScore = 1.0
	}

	return totalScore
}

// CalculateChurnRisk calculates the churn risk based on engagement metrics
func (em *EngagementMetrics) CalculateChurnRisk() string {
	riskScore := 0

	// Low engagement score
	if em.EngagementScore < 0.3 {
		riskScore += 3
	} else if em.EngagementScore < 0.5 {
		riskScore += 1
	}

	// Short sessions
	avgSessionMinutes := float64(em.AverageSessionLength) / (1000 * 60)
	if avgSessionMinutes < 2 {
		riskScore += 2
	} else if avgSessionMinutes < 5 {
		riskScore += 1
	}

	// Low session frequency
	if em.SessionsPerDay < 0.5 {
		riskScore += 2
	} else if em.SessionsPerDay < 1.0 {
		riskScore += 1
	}

	// Low return rate
	if em.ReturnRate < 0.3 {
		riskScore += 2
	} else if em.ReturnRate < 0.6 {
		riskScore += 1
	}

	// No active streaks
	if em.DailyActiveStreak == 0 {
		riskScore += 1
	}

	switch {
	case riskScore >= 6:
		return "high"
	case riskScore >= 3:
		return "medium"
	default:
		return "low"
	}
}

// IsValidActivityType checks if the activity type is valid
func IsValidActivityType(activityType string) bool {
	validTypes := map[ActivityType]bool{
		ActivityTypeLogin:           true,
		ActivityTypeLogout:          true,
		ActivityTypeAttemptStart:    true,
		ActivityTypeAttemptSubmit:   true,
		ActivityTypeSessionStart:    true,
		ActivityTypeSessionEnd:      true,
		ActivityTypeContentView:     true,
		ActivityTypeHintRequest:     true,
		ActivityTypeExplanationView: true,
		ActivityTypeProgressView:    true,
		ActivityTypeSettingsUpdate:  true,
		ActivityTypeProfileUpdate:   true,
		ActivityTypeSearch:          true,
		ActivityTypeFilter:          true,
		ActivityTypeExport:          true,
		ActivityTypeShare:           true,
		ActivityTypeBookmark:        true,
		ActivityTypeUnbookmark:      true,
		ActivityTypeReview:          true,
		ActivityTypeFeedback:        true,
		ActivityTypeError:           true,
		ActivityTypePerformance:     true,
	}

	return validTypes[ActivityType(activityType)]
}

// Custom errors for activity tracking
var (
	ErrActivityNotFound    = NewAppError("ACTIVITY_NOT_FOUND", "Activity not found")
	ErrInvalidActivityType = NewAppError("INVALID_ACTIVITY_TYPE", "Invalid activity type")
	ErrInvalidActivityData = NewAppError("INVALID_ACTIVITY_DATA", "Invalid activity data")
	ErrDuplicateActivity   = NewAppError("DUPLICATE_ACTIVITY", "Duplicate activity detected")
	ErrActivityValidation  = NewAppError("ACTIVITY_VALIDATION_ERROR", "Activity validation failed")
)
