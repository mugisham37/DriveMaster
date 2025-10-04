package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"user-service/internal/models"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// ActivityRepository defines the interface for activity data operations
type ActivityRepository interface {
	// Activity CRUD operations
	CreateActivity(ctx context.Context, activity *models.UserActivity) error
	GetActivity(ctx context.Context, activityID uuid.UUID) (*models.UserActivity, error)
	GetActivitiesByUser(ctx context.Context, userID uuid.UUID, filters *models.ActivityFilters) ([]models.UserActivity, error)
	GetActivitiesBySession(ctx context.Context, sessionID uuid.UUID) ([]models.UserActivity, error)
	DeleteActivity(ctx context.Context, activityID uuid.UUID) error

	// Activity aggregation and analytics
	GetActivitySummary(ctx context.Context, userID uuid.UUID, dateRange models.DateRange) (*models.ActivitySummary, error)
	GetActivityAggregation(ctx context.Context, filters *models.ActivityFilters, groupBy, period string) (*models.ActivityAggregation, error)
	GetEngagementMetrics(ctx context.Context, userID uuid.UUID, days int) (*models.EngagementMetrics, error)

	// Behavior pattern analysis
	GetBehaviorPatterns(ctx context.Context, userID uuid.UUID, days int) ([]models.BehaviorPattern, error)
	GetTopTopics(ctx context.Context, userID uuid.UUID, limit int, days int) ([]models.TopicActivitySummary, error)

	// Activity insights and recommendations
	GetActivityInsights(ctx context.Context, userID uuid.UUID) ([]models.ActivityInsight, error)
	CreateActivityInsight(ctx context.Context, insight *models.ActivityInsight) error
	GetActivityRecommendations(ctx context.Context, userID uuid.UUID) ([]models.ActivityRecommendation, error)
	CreateActivityRecommendation(ctx context.Context, recommendation *models.ActivityRecommendation) error
	MarkRecommendationApplied(ctx context.Context, recommendationID string, userID uuid.UUID) error

	// Batch operations
	CreateActivitiesBatch(ctx context.Context, activities []models.UserActivity) error
	GetRecentActivities(ctx context.Context, userID uuid.UUID, limit int) ([]models.UserActivity, error)
}

type activityRepository struct {
	db *sql.DB
}

// NewActivityRepository creates a new activity repository instance
func NewActivityRepository(db *sql.DB) ActivityRepository {
	return &activityRepository{db: db}
}

// CreateActivity creates a new user activity record
func (r *activityRepository) CreateActivity(ctx context.Context, activity *models.UserActivity) error {
	query := `
		INSERT INTO user_activities (
			id, user_id, activity_type, session_id, item_id, topic_id,
			metadata, device_type, app_version, platform, user_agent, ip_address,
			duration_ms, timestamp, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
		)`

	metadataJSON, err := json.Marshal(activity.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	_, err = r.db.ExecContext(ctx, query,
		activity.ID,
		activity.UserID,
		activity.ActivityType,
		activity.SessionID,
		activity.ItemID,
		activity.TopicID,
		metadataJSON,
		activity.DeviceType,
		activity.AppVersion,
		activity.Platform,
		activity.UserAgent,
		activity.IPAddress,
		activity.Duration,
		activity.Timestamp,
		activity.CreatedAt,
	)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return models.ErrDuplicateActivity
		}
		return fmt.Errorf("failed to create activity: %w", err)
	}

	return nil
}

// GetActivity retrieves a specific activity by ID
func (r *activityRepository) GetActivity(ctx context.Context, activityID uuid.UUID) (*models.UserActivity, error) {
	query := `
		SELECT id, user_id, activity_type, session_id, item_id, topic_id,
			   metadata, device_type, app_version, platform, user_agent, ip_address,
			   duration_ms, timestamp, created_at
		FROM user_activities
		WHERE id = $1`

	var activity models.UserActivity
	var metadataJSON []byte

	err := r.db.QueryRowContext(ctx, query, activityID).Scan(
		&activity.ID,
		&activity.UserID,
		&activity.ActivityType,
		&activity.SessionID,
		&activity.ItemID,
		&activity.TopicID,
		&metadataJSON,
		&activity.DeviceType,
		&activity.AppVersion,
		&activity.Platform,
		&activity.UserAgent,
		&activity.IPAddress,
		&activity.Duration,
		&activity.Timestamp,
		&activity.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, models.ErrActivityNotFound
		}
		return nil, fmt.Errorf("failed to get activity: %w", err)
	}

	if err := json.Unmarshal(metadataJSON, &activity.Metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}

	return &activity, nil
}

// GetActivitiesByUser retrieves activities for a specific user with filters
func (r *activityRepository) GetActivitiesByUser(ctx context.Context, userID uuid.UUID, filters *models.ActivityFilters) ([]models.UserActivity, error) {
	query := `
		SELECT id, user_id, activity_type, session_id, item_id, topic_id,
			   metadata, device_type, app_version, platform, user_agent, ip_address,
			   duration_ms, timestamp, created_at
		FROM user_activities
		WHERE user_id = $1`

	args := []interface{}{userID}
	argIndex := 2

	// Apply filters
	if filters != nil {
		if filters.ActivityType != nil {
			query += fmt.Sprintf(" AND activity_type = $%d", argIndex)
			args = append(args, *filters.ActivityType)
			argIndex++
		}

		if filters.SessionID != nil {
			query += fmt.Sprintf(" AND session_id = $%d", argIndex)
			args = append(args, *filters.SessionID)
			argIndex++
		}

		if filters.ItemID != nil {
			query += fmt.Sprintf(" AND item_id = $%d", argIndex)
			args = append(args, *filters.ItemID)
			argIndex++
		}

		if filters.TopicID != nil {
			query += fmt.Sprintf(" AND topic_id = $%d", argIndex)
			args = append(args, *filters.TopicID)
			argIndex++
		}

		if filters.DeviceType != nil {
			query += fmt.Sprintf(" AND device_type = $%d", argIndex)
			args = append(args, *filters.DeviceType)
			argIndex++
		}

		if filters.Platform != nil {
			query += fmt.Sprintf(" AND platform = $%d", argIndex)
			args = append(args, *filters.Platform)
			argIndex++
		}

		if filters.DateFrom != nil {
			query += fmt.Sprintf(" AND timestamp >= $%d", argIndex)
			args = append(args, *filters.DateFrom)
			argIndex++
		}

		if filters.DateTo != nil {
			query += fmt.Sprintf(" AND timestamp <= $%d", argIndex)
			args = append(args, *filters.DateTo)
			argIndex++
		}
	}

	query += " ORDER BY timestamp DESC"

	// Apply pagination
	if filters != nil {
		if filters.Limit > 0 {
			query += fmt.Sprintf(" LIMIT $%d", argIndex)
			args = append(args, filters.Limit)
			argIndex++
		}

		if filters.Offset > 0 {
			query += fmt.Sprintf(" OFFSET $%d", argIndex)
			args = append(args, filters.Offset)
		}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query activities: %w", err)
	}
	defer rows.Close()

	var activities []models.UserActivity
	for rows.Next() {
		var activity models.UserActivity
		var metadataJSON []byte

		err := rows.Scan(
			&activity.ID,
			&activity.UserID,
			&activity.ActivityType,
			&activity.SessionID,
			&activity.ItemID,
			&activity.TopicID,
			&metadataJSON,
			&activity.DeviceType,
			&activity.AppVersion,
			&activity.Platform,
			&activity.UserAgent,
			&activity.IPAddress,
			&activity.Duration,
			&activity.Timestamp,
			&activity.CreatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan activity: %w", err)
		}

		if err := json.Unmarshal(metadataJSON, &activity.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		activities = append(activities, activity)
	}

	return activities, nil
}

// GetActivitiesBySession retrieves all activities for a specific session
func (r *activityRepository) GetActivitiesBySession(ctx context.Context, sessionID uuid.UUID) ([]models.UserActivity, error) {
	query := `
		SELECT id, user_id, activity_type, session_id, item_id, topic_id,
			   metadata, device_type, app_version, platform, user_agent, ip_address,
			   duration_ms, timestamp, created_at
		FROM user_activities
		WHERE session_id = $1
		ORDER BY timestamp ASC`

	rows, err := r.db.QueryContext(ctx, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to query session activities: %w", err)
	}
	defer rows.Close()

	var activities []models.UserActivity
	for rows.Next() {
		var activity models.UserActivity
		var metadataJSON []byte

		err := rows.Scan(
			&activity.ID,
			&activity.UserID,
			&activity.ActivityType,
			&activity.SessionID,
			&activity.ItemID,
			&activity.TopicID,
			&metadataJSON,
			&activity.DeviceType,
			&activity.AppVersion,
			&activity.Platform,
			&activity.UserAgent,
			&activity.IPAddress,
			&activity.Duration,
			&activity.Timestamp,
			&activity.CreatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan activity: %w", err)
		}

		if err := json.Unmarshal(metadataJSON, &activity.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		activities = append(activities, activity)
	}

	return activities, nil
}

// DeleteActivity deletes an activity record
func (r *activityRepository) DeleteActivity(ctx context.Context, activityID uuid.UUID) error {
	query := `DELETE FROM user_activities WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, activityID)
	if err != nil {
		return fmt.Errorf("failed to delete activity: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return models.ErrActivityNotFound
	}

	return nil
}

// GetActivitySummary generates an activity summary for a user within a date range
func (r *activityRepository) GetActivitySummary(ctx context.Context, userID uuid.UUID, dateRange models.DateRange) (*models.ActivitySummary, error) {
	// Get basic activity counts
	query := `
		SELECT 
			activity_type,
			COUNT(*) as count,
			COALESCE(SUM(duration_ms), 0) as total_duration,
			device_type,
			platform
		FROM user_activities
		WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3
		GROUP BY activity_type, device_type, platform`

	rows, err := r.db.QueryContext(ctx, query, userID, dateRange.Start, dateRange.End)
	if err != nil {
		return nil, fmt.Errorf("failed to query activity summary: %w", err)
	}
	defer rows.Close()

	summary := &models.ActivitySummary{
		UserID:             userID,
		DateRange:          dateRange,
		ActivityBreakdown:  make(map[models.ActivityType]int),
		DeviceBreakdown:    make(map[string]int),
		PlatformBreakdown:  make(map[string]int),
		HourlyDistribution: make(map[int]int),
		DailyDistribution:  make(map[string]int),
		GeneratedAt:        time.Now(),
	}

	totalActivities := 0
	totalDuration := int64(0)

	for rows.Next() {
		var activityType models.ActivityType
		var count int
		var duration int64
		var deviceType, platform sql.NullString

		err := rows.Scan(&activityType, &count, &duration, &deviceType, &platform)
		if err != nil {
			return nil, fmt.Errorf("failed to scan activity summary: %w", err)
		}

		summary.ActivityBreakdown[activityType] += count
		totalActivities += count
		totalDuration += duration

		if deviceType.Valid {
			summary.DeviceBreakdown[deviceType.String] += count
		}

		if platform.Valid {
			summary.PlatformBreakdown[platform.String] += count
		}
	}

	summary.TotalActivities = totalActivities

	// Get session statistics
	sessionQuery := `
		SELECT 
			COUNT(DISTINCT session_id) as session_count,
			COALESCE(AVG(duration_ms), 0) as avg_session_duration
		FROM user_activities
		WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3 AND session_id IS NOT NULL`

	var sessionCount int
	var avgSessionDuration float64

	err = r.db.QueryRowContext(ctx, sessionQuery, userID, dateRange.Start, dateRange.End).Scan(
		&sessionCount, &avgSessionDuration)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get session statistics: %w", err)
	}

	summary.SessionCount = sessionCount
	summary.TotalSessionTime = totalDuration
	summary.AverageSessionTime = int64(avgSessionDuration)

	// Get hourly distribution
	hourlyQuery := `
		SELECT 
			EXTRACT(HOUR FROM timestamp) as hour,
			COUNT(*) as count
		FROM user_activities
		WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3
		GROUP BY EXTRACT(HOUR FROM timestamp)`

	hourlyRows, err := r.db.QueryContext(ctx, hourlyQuery, userID, dateRange.Start, dateRange.End)
	if err != nil {
		return nil, fmt.Errorf("failed to query hourly distribution: %w", err)
	}
	defer hourlyRows.Close()

	for hourlyRows.Next() {
		var hour int
		var count int

		err := hourlyRows.Scan(&hour, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan hourly distribution: %w", err)
		}

		summary.HourlyDistribution[hour] = count
	}

	// Get daily distribution
	dailyQuery := `
		SELECT 
			DATE(timestamp) as day,
			COUNT(*) as count
		FROM user_activities
		WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3
		GROUP BY DATE(timestamp)`

	dailyRows, err := r.db.QueryContext(ctx, dailyQuery, userID, dateRange.Start, dateRange.End)
	if err != nil {
		return nil, fmt.Errorf("failed to query daily distribution: %w", err)
	}
	defer dailyRows.Close()

	for dailyRows.Next() {
		var day time.Time
		var count int

		err := dailyRows.Scan(&day, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan daily distribution: %w", err)
		}

		summary.DailyDistribution[day.Format("2006-01-02")] = count
	}

	// Get top topics
	topTopics, err := r.GetTopTopics(ctx, userID, 10, int(dateRange.End.Sub(dateRange.Start).Hours()/24))
	if err != nil {
		return nil, fmt.Errorf("failed to get top topics: %w", err)
	}
	summary.TopTopics = topTopics

	// Calculate engagement metrics
	engagementMetrics, err := r.GetEngagementMetrics(ctx, userID, int(dateRange.End.Sub(dateRange.Start).Hours()/24))
	if err != nil {
		return nil, fmt.Errorf("failed to get engagement metrics: %w", err)
	}
	summary.EngagementMetrics = *engagementMetrics

	// Get behavior patterns
	behaviorPatterns, err := r.GetBehaviorPatterns(ctx, userID, int(dateRange.End.Sub(dateRange.Start).Hours()/24))
	if err != nil {
		return nil, fmt.Errorf("failed to get behavior patterns: %w", err)
	}
	summary.BehaviorPatterns = behaviorPatterns

	return summary, nil
}

// GetActivityAggregation provides aggregated activity data
func (r *activityRepository) GetActivityAggregation(ctx context.Context, filters *models.ActivityFilters, groupBy, period string) (*models.ActivityAggregation, error) {
	var query strings.Builder
	var args []interface{}
	argIndex := 1

	// Build base query
	query.WriteString("SELECT ")

	// Add grouping and time period logic
	switch period {
	case "hour":
		query.WriteString("DATE_TRUNC('hour', timestamp) as period")
	case "day":
		query.WriteString("DATE_TRUNC('day', timestamp) as period")
	case "week":
		query.WriteString("DATE_TRUNC('week', timestamp) as period")
	case "month":
		query.WriteString("DATE_TRUNC('month', timestamp) as period")
	default:
		query.WriteString("DATE_TRUNC('day', timestamp) as period")
	}

	// Add groupBy field
	switch groupBy {
	case "activity_type":
		query.WriteString(", activity_type as group_key")
	case "device_type":
		query.WriteString(", device_type as group_key")
	case "platform":
		query.WriteString(", platform as group_key")
	default:
		query.WriteString(", 'all' as group_key")
	}

	query.WriteString(", COUNT(*) as count FROM user_activities WHERE 1=1")

	// Apply filters
	if filters != nil {
		if filters.UserID != nil {
			query.WriteString(fmt.Sprintf(" AND user_id = $%d", argIndex))
			args = append(args, *filters.UserID)
			argIndex++
		}

		if filters.ActivityType != nil {
			query.WriteString(fmt.Sprintf(" AND activity_type = $%d", argIndex))
			args = append(args, *filters.ActivityType)
			argIndex++
		}

		if filters.DateFrom != nil {
			query.WriteString(fmt.Sprintf(" AND timestamp >= $%d", argIndex))
			args = append(args, *filters.DateFrom)
			argIndex++
		}

		if filters.DateTo != nil {
			query.WriteString(fmt.Sprintf(" AND timestamp <= $%d", argIndex))
			args = append(args, *filters.DateTo)
			argIndex++
		}
	}

	query.WriteString(" GROUP BY period, group_key ORDER BY period DESC")

	rows, err := r.db.QueryContext(ctx, query.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query activity aggregation: %w", err)
	}
	defer rows.Close()

	var points []models.AggregationPoint
	totalCount := 0

	for rows.Next() {
		var period time.Time
		var groupKey string
		var count int

		err := rows.Scan(&period, &groupKey, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan aggregation point: %w", err)
		}

		points = append(points, models.AggregationPoint{
			Key:       groupKey,
			Count:     count,
			Timestamp: period,
		})

		totalCount += count
	}

	return &models.ActivityAggregation{
		GroupBy:     groupBy,
		Period:      period,
		Data:        points,
		TotalCount:  totalCount,
		GeneratedAt: time.Now(),
	}, nil
}

// GetEngagementMetrics calculates engagement metrics for a user
func (r *activityRepository) GetEngagementMetrics(ctx context.Context, userID uuid.UUID, days int) (*models.EngagementMetrics, error) {
	cutoffDate := time.Now().AddDate(0, 0, -days)

	// Get basic activity statistics
	query := `
		SELECT 
			COUNT(*) as total_activities,
			COUNT(DISTINCT DATE(timestamp)) as active_days,
			COUNT(DISTINCT session_id) as total_sessions,
			COALESCE(AVG(duration_ms), 0) as avg_session_length
		FROM user_activities
		WHERE user_id = $1 AND timestamp >= $2 AND session_id IS NOT NULL`

	var totalActivities, activeDays, totalSessions int
	var avgSessionLength float64

	err := r.db.QueryRowContext(ctx, query, userID, cutoffDate).Scan(
		&totalActivities, &activeDays, &totalSessions, &avgSessionLength)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get basic engagement metrics: %w", err)
	}

	// Calculate derived metrics
	sessionsPerDay := 0.0
	if activeDays > 0 {
		sessionsPerDay = float64(totalSessions) / float64(activeDays)
	}

	activitiesPerSession := 0.0
	if totalSessions > 0 {
		activitiesPerSession = float64(totalActivities) / float64(totalSessions)
	}

	// Calculate return rate (simplified)
	returnRate := float64(activeDays) / float64(days)
	if returnRate > 1.0 {
		returnRate = 1.0
	}

	// Calculate streaks (simplified implementation)
	dailyActiveStreak := r.calculateDailyStreak(ctx, userID)
	weeklyActiveStreak := r.calculateWeeklyStreak(ctx, userID)

	// Calculate engagement score
	engagementScore := r.calculateEngagementScore(totalActivities, activeDays, totalSessions, avgSessionLength, returnRate)

	metrics := &models.EngagementMetrics{
		DailyActiveStreak:    dailyActiveStreak,
		WeeklyActiveStreak:   weeklyActiveStreak,
		AverageSessionLength: int64(avgSessionLength),
		SessionsPerDay:       sessionsPerDay,
		ActivitiesPerSession: activitiesPerSession,
		ReturnRate:           returnRate,
		EngagementScore:      engagementScore,
	}

	metrics.ChurnRisk = metrics.CalculateChurnRisk()

	return metrics, nil
}

// calculateDailyStreak calculates the current daily active streak
func (r *activityRepository) calculateDailyStreak(ctx context.Context, userID uuid.UUID) int {
	query := `
		SELECT DISTINCT DATE(timestamp) as activity_date
		FROM user_activities
		WHERE user_id = $1 AND timestamp >= $2
		ORDER BY activity_date DESC`

	cutoffDate := time.Now().AddDate(0, 0, -30) // Look back 30 days

	rows, err := r.db.QueryContext(ctx, query, userID, cutoffDate)
	if err != nil {
		return 0
	}
	defer rows.Close()

	var dates []time.Time
	for rows.Next() {
		var date time.Time
		if err := rows.Scan(&date); err != nil {
			return 0
		}
		dates = append(dates, date)
	}

	if len(dates) == 0 {
		return 0
	}

	// Calculate consecutive days from today
	today := time.Now().Truncate(24 * time.Hour)
	streak := 0

	for i, date := range dates {
		expectedDate := today.AddDate(0, 0, -i)
		if date.Truncate(24*time.Hour).Equal(expectedDate) {
			streak++
		} else {
			break
		}
	}

	return streak
}

// calculateWeeklyStreak calculates the current weekly active streak
func (r *activityRepository) calculateWeeklyStreak(ctx context.Context, userID uuid.UUID) int {
	query := `
		SELECT DISTINCT DATE_TRUNC('week', timestamp) as activity_week
		FROM user_activities
		WHERE user_id = $1 AND timestamp >= $2
		ORDER BY activity_week DESC`

	cutoffDate := time.Now().AddDate(0, 0, -84) // Look back 12 weeks

	rows, err := r.db.QueryContext(ctx, query, userID, cutoffDate)
	if err != nil {
		return 0
	}
	defer rows.Close()

	var weeks []time.Time
	for rows.Next() {
		var week time.Time
		if err := rows.Scan(&week); err != nil {
			return 0
		}
		weeks = append(weeks, week)
	}

	if len(weeks) == 0 {
		return 0
	}

	// Calculate consecutive weeks from this week
	thisWeek := time.Now().Truncate(24 * time.Hour)
	// Adjust to start of week (Monday)
	for thisWeek.Weekday() != time.Monday {
		thisWeek = thisWeek.AddDate(0, 0, -1)
	}

	streak := 0
	for i, week := range weeks {
		expectedWeek := thisWeek.AddDate(0, 0, -7*i)
		if week.Equal(expectedWeek) {
			streak++
		} else {
			break
		}
	}

	return streak
}

// calculateEngagementScore calculates an overall engagement score
func (r *activityRepository) calculateEngagementScore(totalActivities, activeDays, totalSessions int, avgSessionLength, returnRate float64) float64 {
	// Normalize activity frequency (0-1)
	activityScore := float64(totalActivities) / 100.0
	if activityScore > 1.0 {
		activityScore = 1.0
	}

	// Normalize session quality (0-1)
	sessionScore := 0.0
	if totalSessions > 0 {
		avgSessionMinutes := avgSessionLength / (1000 * 60)
		if avgSessionMinutes >= 5 && avgSessionMinutes <= 60 {
			sessionScore = 1.0
		} else if avgSessionMinutes >= 2 && avgSessionMinutes <= 90 {
			sessionScore = 0.7
		} else if avgSessionMinutes >= 1 {
			sessionScore = 0.4
		}
	}

	// Combine scores with weights
	engagementScore := (activityScore * 0.4) + (sessionScore * 0.3) + (returnRate * 0.3)

	if engagementScore > 1.0 {
		engagementScore = 1.0
	}

	return engagementScore
}

// GetBehaviorPatterns identifies behavior patterns for a user
func (r *activityRepository) GetBehaviorPatterns(ctx context.Context, userID uuid.UUID, days int) ([]models.BehaviorPattern, error) {
	cutoffDate := time.Now().AddDate(0, 0, -days)

	// This is a simplified implementation
	// In a real system, you'd use more sophisticated pattern recognition algorithms

	var patterns []models.BehaviorPattern

	// Pattern 1: Peak activity hours
	hourlyQuery := `
		SELECT 
			EXTRACT(HOUR FROM timestamp) as hour,
			COUNT(*) as count
		FROM user_activities
		WHERE user_id = $1 AND timestamp >= $2
		GROUP BY EXTRACT(HOUR FROM timestamp)
		ORDER BY count DESC
		LIMIT 3`

	rows, err := r.db.QueryContext(ctx, hourlyQuery, userID, cutoffDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query hourly patterns: %w", err)
	}
	defer rows.Close()

	var peakHours []int
	for rows.Next() {
		var hour int
		var count int
		if err := rows.Scan(&hour, &count); err != nil {
			continue
		}
		peakHours = append(peakHours, hour)
	}

	if len(peakHours) > 0 {
		patterns = append(patterns, models.BehaviorPattern{
			PatternType: "peak_hours",
			Description: fmt.Sprintf("Most active during hours: %v", peakHours),
			Confidence:  0.8,
			Frequency:   "daily",
			Metadata: map[string]interface{}{
				"peak_hours": peakHours,
			},
			FirstSeen:   cutoffDate,
			LastSeen:    time.Now(),
			Occurrences: days,
		})
	}

	// Pattern 2: Session length preference
	sessionQuery := `
		SELECT AVG(duration_ms) as avg_duration
		FROM user_activities
		WHERE user_id = $1 AND timestamp >= $2 AND duration_ms IS NOT NULL AND duration_ms > 0`

	var avgDuration sql.NullFloat64
	err = r.db.QueryRowContext(ctx, sessionQuery, userID, cutoffDate).Scan(&avgDuration)
	if err == nil && avgDuration.Valid {
		sessionType := "short"
		if avgDuration.Float64 > 300000 { // 5 minutes
			sessionType = "medium"
		}
		if avgDuration.Float64 > 1800000 { // 30 minutes
			sessionType = "long"
		}

		patterns = append(patterns, models.BehaviorPattern{
			PatternType: "session_length",
			Description: fmt.Sprintf("Prefers %s sessions (avg: %.1f minutes)", sessionType, avgDuration.Float64/(1000*60)),
			Confidence:  0.7,
			Frequency:   "session",
			Metadata: map[string]interface{}{
				"avg_duration_ms": avgDuration.Float64,
				"session_type":    sessionType,
			},
			FirstSeen:   cutoffDate,
			LastSeen:    time.Now(),
			Occurrences: 1,
		})
	}

	return patterns, nil
}

// GetTopTopics gets the most active topics for a user
func (r *activityRepository) GetTopTopics(ctx context.Context, userID uuid.UUID, limit int, days int) ([]models.TopicActivitySummary, error) {
	cutoffDate := time.Now().AddDate(0, 0, -days)

	query := `
		SELECT 
			topic_id,
			COUNT(*) as activity_count,
			COALESCE(SUM(duration_ms), 0) as time_spent,
			MAX(timestamp) as last_activity
		FROM user_activities
		WHERE user_id = $1 AND timestamp >= $2 AND topic_id IS NOT NULL
		GROUP BY topic_id
		ORDER BY activity_count DESC
		LIMIT $3`

	rows, err := r.db.QueryContext(ctx, query, userID, cutoffDate, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query top topics: %w", err)
	}
	defer rows.Close()

	var topics []models.TopicActivitySummary
	for rows.Next() {
		var topic models.TopicActivitySummary

		err := rows.Scan(
			&topic.TopicID,
			&topic.ActivityCount,
			&topic.TimeSpent,
			&topic.LastActivity,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan topic summary: %w", err)
		}

		// Calculate engagement score (simplified)
		topic.EngagementScore = float64(topic.ActivityCount) / 10.0
		if topic.EngagementScore > 1.0 {
			topic.EngagementScore = 1.0
		}

		topics = append(topics, topic)
	}

	return topics, nil
}

// GetActivityInsights retrieves activity insights for a user
func (r *activityRepository) GetActivityInsights(ctx context.Context, userID uuid.UUID) ([]models.ActivityInsight, error) {
	query := `
		SELECT id, user_id, type, title, description, severity, category,
			   metadata, action_items, generated_at, expires_at
		FROM activity_insights
		WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY generated_at DESC`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query activity insights: %w", err)
	}
	defer rows.Close()

	var insights []models.ActivityInsight
	for rows.Next() {
		var insight models.ActivityInsight
		var metadataJSON, actionItemsJSON []byte
		var expiresAt sql.NullTime

		err := rows.Scan(
			&insight.ID,
			&insight.UserID,
			&insight.Type,
			&insight.Title,
			&insight.Description,
			&insight.Severity,
			&insight.Category,
			&metadataJSON,
			&actionItemsJSON,
			&insight.GeneratedAt,
			&expiresAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan insight: %w", err)
		}

		if err := json.Unmarshal(metadataJSON, &insight.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		if err := json.Unmarshal(actionItemsJSON, &insight.ActionItems); err != nil {
			return nil, fmt.Errorf("failed to unmarshal action items: %w", err)
		}

		if expiresAt.Valid {
			insight.ExpiresAt = &expiresAt.Time
		}

		insights = append(insights, insight)
	}

	return insights, nil
}

// CreateActivityInsight creates a new activity insight
func (r *activityRepository) CreateActivityInsight(ctx context.Context, insight *models.ActivityInsight) error {
	query := `
		INSERT INTO activity_insights (
			id, user_id, type, title, description, severity, category,
			metadata, action_items, generated_at, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	metadataJSON, err := json.Marshal(insight.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	actionItemsJSON, err := json.Marshal(insight.ActionItems)
	if err != nil {
		return fmt.Errorf("failed to marshal action items: %w", err)
	}

	_, err = r.db.ExecContext(ctx, query,
		insight.ID,
		insight.UserID,
		insight.Type,
		insight.Title,
		insight.Description,
		insight.Severity,
		insight.Category,
		metadataJSON,
		actionItemsJSON,
		insight.GeneratedAt,
		insight.ExpiresAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create activity insight: %w", err)
	}

	return nil
}

// GetActivityRecommendations retrieves activity recommendations for a user
func (r *activityRepository) GetActivityRecommendations(ctx context.Context, userID uuid.UUID) ([]models.ActivityRecommendation, error) {
	query := `
		SELECT id, user_id, type, title, description, priority, category,
			   metadata, actions, generated_at, expires_at, applied, applied_at
		FROM activity_recommendations
		WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY priority DESC, generated_at DESC`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query activity recommendations: %w", err)
	}
	defer rows.Close()

	var recommendations []models.ActivityRecommendation
	for rows.Next() {
		var rec models.ActivityRecommendation
		var metadataJSON, actionsJSON []byte
		var expiresAt, appliedAt sql.NullTime

		err := rows.Scan(
			&rec.ID,
			&rec.UserID,
			&rec.Type,
			&rec.Title,
			&rec.Description,
			&rec.Priority,
			&rec.Category,
			&metadataJSON,
			&actionsJSON,
			&rec.GeneratedAt,
			&expiresAt,
			&rec.Applied,
			&appliedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan recommendation: %w", err)
		}

		if err := json.Unmarshal(metadataJSON, &rec.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		if err := json.Unmarshal(actionsJSON, &rec.Actions); err != nil {
			return nil, fmt.Errorf("failed to unmarshal actions: %w", err)
		}

		if expiresAt.Valid {
			rec.ExpiresAt = &expiresAt.Time
		}

		if appliedAt.Valid {
			rec.AppliedAt = &appliedAt.Time
		}

		recommendations = append(recommendations, rec)
	}

	return recommendations, nil
}

// CreateActivityRecommendation creates a new activity recommendation
func (r *activityRepository) CreateActivityRecommendation(ctx context.Context, recommendation *models.ActivityRecommendation) error {
	query := `
		INSERT INTO activity_recommendations (
			id, user_id, type, title, description, priority, category,
			metadata, actions, generated_at, expires_at, applied, applied_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`

	metadataJSON, err := json.Marshal(recommendation.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	actionsJSON, err := json.Marshal(recommendation.Actions)
	if err != nil {
		return fmt.Errorf("failed to marshal actions: %w", err)
	}

	_, err = r.db.ExecContext(ctx, query,
		recommendation.ID,
		recommendation.UserID,
		recommendation.Type,
		recommendation.Title,
		recommendation.Description,
		recommendation.Priority,
		recommendation.Category,
		metadataJSON,
		actionsJSON,
		recommendation.GeneratedAt,
		recommendation.ExpiresAt,
		recommendation.Applied,
		recommendation.AppliedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create activity recommendation: %w", err)
	}

	return nil
}

// MarkRecommendationApplied marks a recommendation as applied
func (r *activityRepository) MarkRecommendationApplied(ctx context.Context, recommendationID string, userID uuid.UUID) error {
	query := `
		UPDATE activity_recommendations
		SET applied = true, applied_at = NOW()
		WHERE id = $1 AND user_id = $2`

	result, err := r.db.ExecContext(ctx, query, recommendationID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark recommendation as applied: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return models.ErrActivityNotFound
	}

	return nil
}

// CreateActivitiesBatch creates multiple activities in a single transaction
func (r *activityRepository) CreateActivitiesBatch(ctx context.Context, activities []models.UserActivity) error {
	if len(activities) == 0 {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO user_activities (
			id, user_id, activity_type, session_id, item_id, topic_id,
			metadata, device_type, app_version, platform, user_agent, ip_address,
			duration_ms, timestamp, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for _, activity := range activities {
		metadataJSON, err := json.Marshal(activity.Metadata)
		if err != nil {
			return fmt.Errorf("failed to marshal metadata: %w", err)
		}

		_, err = stmt.ExecContext(ctx,
			activity.ID,
			activity.UserID,
			activity.ActivityType,
			activity.SessionID,
			activity.ItemID,
			activity.TopicID,
			metadataJSON,
			activity.DeviceType,
			activity.AppVersion,
			activity.Platform,
			activity.UserAgent,
			activity.IPAddress,
			activity.Duration,
			activity.Timestamp,
			activity.CreatedAt,
		)

		if err != nil {
			return fmt.Errorf("failed to insert activity: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetRecentActivities retrieves the most recent activities for a user
func (r *activityRepository) GetRecentActivities(ctx context.Context, userID uuid.UUID, limit int) ([]models.UserActivity, error) {
	filters := &models.ActivityFilters{
		UserID: &userID,
		Limit:  limit,
	}

	return r.GetActivitiesByUser(ctx, userID, filters)
}