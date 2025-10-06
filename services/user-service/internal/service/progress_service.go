package service

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"
	"user-service/internal/cache"
	"user-service/internal/config"
	"user-service/internal/models"
	"user-service/internal/repository"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// ProgressService handles all progress tracking and mastery calculations
type ProgressService interface {
	// Skill mastery operations
	GetSkillMastery(ctx context.Context, userID uuid.UUID, topic string) (*models.SkillMastery, error)
	GetAllSkillMasteries(ctx context.Context, userID uuid.UUID) ([]models.SkillMastery, error)
	UpdateSkillMastery(ctx context.Context, userID uuid.UUID, topic string, attempts []models.AttemptRecord) error
	RecalculateAllMasteries(ctx context.Context, userID uuid.UUID) error

	// Progress analytics and summaries
	GetProgressSummary(ctx context.Context, userID uuid.UUID) (*models.ProgressSummary, error)
	GetWeeklyProgress(ctx context.Context, userID uuid.UUID, weeks int) ([]models.WeeklyProgressPoint, error)
	GetTopicProgress(ctx context.Context, userID uuid.UUID, topics []string) ([]models.TopicProgressPoint, error)

	// Learning streaks and milestones
	GetLearningStreak(ctx context.Context, userID uuid.UUID) (*models.LearningStreak, error)
	UpdateLearningStreak(ctx context.Context, userID uuid.UUID) error
	GetMilestones(ctx context.Context, userID uuid.UUID) ([]models.Milestone, error)
	CheckMilestoneAchievements(ctx context.Context, userID uuid.UUID) ([]models.Milestone, error)

	// Progress visualization data
	GetProgressVisualizationData(ctx context.Context, userID uuid.UUID, timeRange string) (map[string]interface{}, error)
	GetMasteryTrendData(ctx context.Context, userID uuid.UUID, topic string, days int) ([]map[string]interface{}, error)
	GetAccuracyTrendData(ctx context.Context, userID uuid.UUID, days int) ([]map[string]interface{}, error)

	// Progress comparison and benchmarking
	GetProgressComparison(ctx context.Context, userID uuid.UUID, comparisonType string, target string) (*models.ProgressComparison, error)
	GetPeerComparison(ctx context.Context, userID uuid.UUID, countryCode string) (*models.ProgressComparison, error)
	GetHistoricalComparison(ctx context.Context, userID uuid.UUID, days int) (*models.ProgressComparison, error)

	// Attempt processing
	ProcessAttempt(ctx context.Context, attempt *models.AttemptRecord) error
	RecordAttempt(ctx context.Context, attempt *models.AttemptRecord) error

	// Insights and recommendations
	GenerateInsights(ctx context.Context, userID uuid.UUID) ([]string, error)
	GenerateRecommendations(ctx context.Context, userID uuid.UUID) ([]string, error)
}

type progressService struct {
	repo   repository.ProgressRepository
	cache  cache.CacheInterface
	config *config.Config
	logger *logrus.Logger
}

// NewProgressService creates a new progress service instance
func NewProgressService(repo repository.ProgressRepository, cache cache.CacheInterface, cfg *config.Config, log *logrus.Logger) ProgressService {
	return &progressService{
		repo:   repo,
		cache:  cache,
		config: cfg,
		logger: log,
	}
}

// GetSkillMastery retrieves skill mastery for a specific topic with caching
func (s *progressService) GetSkillMastery(ctx context.Context, userID uuid.UUID, topic string) (*models.SkillMastery, error) {
	cacheKey := fmt.Sprintf("mastery:%s:%s", userID.String(), topic)

	// Try cache first
	var mastery models.SkillMastery
	if err := s.cache.Get(ctx, cacheKey, &mastery); err == nil {
		return &mastery, nil
	}

	// Get from database
	masteryPtr, err := s.repo.GetSkillMastery(ctx, userID, topic)
	if err != nil {
		return nil, fmt.Errorf("failed to get skill mastery: %w", err)
	}

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, masteryPtr, 30*time.Minute); err != nil {
		s.logger.Warn("Failed to cache skill mastery", "error", err, "user_id", userID, "topic", topic)
	}

	return masteryPtr, nil
}

// GetAllSkillMasteries retrieves all skill masteries for a user
func (s *progressService) GetAllSkillMasteries(ctx context.Context, userID uuid.UUID) ([]models.SkillMastery, error) {
	cacheKey := fmt.Sprintf("masteries:%s", userID.String())

	// Try cache first
	var masteries []models.SkillMastery
	if err := s.cache.Get(ctx, cacheKey, &masteries); err == nil {
		return masteries, nil
	}

	// Get from database
	masteries, err := s.repo.GetAllSkillMasteries(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get all skill masteries: %w", err)
	}

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, masteries, 15*time.Minute); err != nil {
		s.logger.Warn("Failed to cache skill masteries", "error", err, "user_id", userID)
	}

	return masteries, nil
}

// UpdateSkillMastery calculates and updates mastery based on attempts
func (s *progressService) UpdateSkillMastery(ctx context.Context, userID uuid.UUID, topic string, attempts []models.AttemptRecord) error {
	if len(attempts) == 0 {
		return fmt.Errorf("no attempts provided for mastery calculation")
	}

	// Get existing mastery or create new one
	mastery, err := s.repo.GetSkillMastery(ctx, userID, topic)
	if err != nil && err != models.ErrProgressNotFound {
		return fmt.Errorf("failed to get existing mastery: %w", err)
	}

	if mastery == nil {
		mastery = &models.SkillMastery{
			UserID:        userID,
			Topic:         topic,
			Mastery:       0.0,
			Confidence:    0.5,
			LastPracticed: time.Now(),
			PracticeCount: 0,
			CorrectStreak: 0,
			LongestStreak: 0,
			TotalTimeMs:   0,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
	}

	// Calculate current streak
	currentStreak := 0
	longestStreak := mastery.LongestStreak

	// Sort attempts by timestamp to process in order
	sortedAttempts := make([]models.AttemptRecord, len(attempts))
	copy(sortedAttempts, attempts)
	sort.Slice(sortedAttempts, func(i, j int) bool {
		return sortedAttempts[i].Timestamp.Before(sortedAttempts[j].Timestamp)
	})

	// Calculate streaks
	for _, attempt := range sortedAttempts {
		if attempt.Correct {
			currentStreak++
			if currentStreak > longestStreak {
				longestStreak = currentStreak
			}
		} else {
			currentStreak = 0
		}
	}

	mastery.CorrectStreak = currentStreak
	mastery.LongestStreak = longestStreak
	mastery.LastPracticed = sortedAttempts[len(sortedAttempts)-1].Timestamp

	// Use the sophisticated mastery calculation from the model
	config := models.DefaultMasteryConfig()
	mastery.CalculateMastery(attempts, config)

	// Save to database
	if err := s.repo.UpsertSkillMastery(ctx, mastery); err != nil {
		return fmt.Errorf("failed to upsert skill mastery: %w", err)
	}

	// Invalidate cache
	cacheKeys := []string{
		fmt.Sprintf("mastery:%s:%s", userID.String(), topic),
		fmt.Sprintf("masteries:%s", userID.String()),
		fmt.Sprintf("progress_summary:%s", userID.String()),
	}

	for _, key := range cacheKeys {
		if err := s.cache.Delete(ctx, key); err != nil {
			s.logger.Warn("Failed to invalidate cache", "error", err, "key", key)
		}
	}

	s.logger.Info("Updated skill mastery", "user_id", userID, "topic", topic, "mastery", mastery.Mastery, "confidence", mastery.Confidence)

	return nil
}

// RecalculateAllMasteries recalculates all masteries for a user
func (s *progressService) RecalculateAllMasteries(ctx context.Context, userID uuid.UUID) error {
	// Get all attempts for the user
	attempts, err := s.repo.GetAttemptsByUser(ctx, userID, 10000, 0) // Get all attempts
	if err != nil {
		return fmt.Errorf("failed to get user attempts: %w", err)
	}

	// Group attempts by topic
	topicAttempts := make(map[string][]models.AttemptRecord)

	for _, attempt := range attempts {
		// For this implementation, we'll assume we can get topics from the attempt
		// In a real system, you'd need to join with the items table to get topics
		// For now, we'll use a placeholder approach
		topics := s.extractTopicsFromAttempt(attempt)
		for _, topic := range topics {
			topicAttempts[topic] = append(topicAttempts[topic], attempt)
		}
	}

	// Update mastery for each topic
	for topic, topicAttemptList := range topicAttempts {
		if err := s.UpdateSkillMastery(ctx, userID, topic, topicAttemptList); err != nil {
			s.logger.Error("Failed to update mastery for topic", "error", err, "user_id", userID, "topic", topic)
			continue
		}
	}

	s.logger.Info("Recalculated all masteries", "user_id", userID, "topics_count", len(topicAttempts))

	return nil
}

// extractTopicsFromAttempt is a helper function to extract topics from an attempt
// In a real implementation, this would join with the items table
func (s *progressService) extractTopicsFromAttempt(attempt models.AttemptRecord) []string {
	// This is a placeholder implementation
	// In reality, you'd query the items table to get the topics for the item_id
	// For now, we'll return some default topics based on the item ID pattern

	// Use the attempt data to determine topics (placeholder logic)
	s.logger.Debug("Extracting topics from attempt", "item_id", attempt.ItemID, "user_id", attempt.UserID)

	// In a real implementation, you would use attempt.ItemID to query the items table
	// and get the actual topics associated with that item
	return []string{"traffic_rules", "road_signs", "safety"} // Placeholder
}

// GetProgressSummary generates a comprehensive progress summary
func (s *progressService) GetProgressSummary(ctx context.Context, userID uuid.UUID) (*models.ProgressSummary, error) {
	cacheKey := fmt.Sprintf("progress_summary:%s", userID.String())

	// Try cache first
	var summary models.ProgressSummary
	if err := s.cache.Get(ctx, cacheKey, &summary); err == nil {
		return &summary, nil
	}

	// Get from repository
	summaryPtr, err := s.repo.GetProgressSummary(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get progress summary: %w", err)
	}

	// Enhance with additional calculations
	s.enhanceProgressSummary(ctx, summaryPtr)

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, summaryPtr, 10*time.Minute); err != nil {
		s.logger.Warn("Failed to cache progress summary", "error", err, "user_id", userID)
	}

	return summaryPtr, nil
}

// enhanceProgressSummary adds additional calculated fields to the progress summary
func (s *progressService) enhanceProgressSummary(ctx context.Context, summary *models.ProgressSummary) {
	s.logger.WithContext(ctx).Debug("Enhancing progress summary", "user_id", summary.UserID)

	// Calculate additional metrics
	if len(summary.TopicMasteries) > 0 {
		// Calculate mastery distribution
		masteryLevels := map[string]int{
			"Expert":     0,
			"Proficient": 0,
			"Developing": 0,
			"Beginner":   0,
			"Novice":     0,
		}

		for _, mastery := range summary.TopicMasteries {
			level := mastery.GetMasteryLevel()
			masteryLevels[level]++
		}

		// Add mastery distribution to recommendations
		if masteryLevels["Novice"] > 0 {
			summary.Recommendations = append(summary.Recommendations,
				fmt.Sprintf("Focus on %d topics where you're still a novice", masteryLevels["Novice"]))
		}

		if masteryLevels["Expert"] > 0 {
			summary.Recommendations = append(summary.Recommendations,
				fmt.Sprintf("Great job! You've mastered %d topics", masteryLevels["Expert"]))
		}
	}

	// Calculate study efficiency
	if summary.TotalStudyTimeMs > 0 && summary.TotalAttempts > 0 {
		avgTimePerAttempt := float64(summary.TotalStudyTimeMs) / float64(summary.TotalAttempts)
		if avgTimePerAttempt < 30000 { // Less than 30 seconds per attempt
			summary.Recommendations = append(summary.Recommendations,
				"Consider spending more time on each question to improve accuracy")
		} else if avgTimePerAttempt > 120000 { // More than 2 minutes per attempt
			summary.Recommendations = append(summary.Recommendations,
				"Try to improve your response time while maintaining accuracy")
		}
	}
}

// GetWeeklyProgress retrieves weekly progress data
func (s *progressService) GetWeeklyProgress(ctx context.Context, userID uuid.UUID, weeks int) ([]models.WeeklyProgressPoint, error) {
	cacheKey := fmt.Sprintf("weekly_progress:%s:%d", userID.String(), weeks)

	// Try cache first
	var weeklyProgress []models.WeeklyProgressPoint
	if err := s.cache.Get(ctx, cacheKey, &weeklyProgress); err == nil {
		return weeklyProgress, nil
	}

	// Get from repository
	weeklyProgress, err := s.repo.GetWeeklyProgress(ctx, userID, weeks)
	if err != nil {
		return nil, fmt.Errorf("failed to get weekly progress: %w", err)
	}

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, weeklyProgress, 1*time.Hour); err != nil {
		s.logger.Warn("Failed to cache weekly progress", "error", err, "user_id", userID)
	}

	return weeklyProgress, nil
}

// GetTopicProgress retrieves progress data for specific topics
func (s *progressService) GetTopicProgress(ctx context.Context, userID uuid.UUID, topics []string) ([]models.TopicProgressPoint, error) {
	topicProgress, err := s.repo.GetTopicProgress(ctx, userID, topics)
	if err != nil {
		return nil, fmt.Errorf("failed to get topic progress: %w", err)
	}

	return topicProgress, nil
}

// GetLearningStreak retrieves the user's learning streak
func (s *progressService) GetLearningStreak(ctx context.Context, userID uuid.UUID) (*models.LearningStreak, error) {
	cacheKey := fmt.Sprintf("learning_streak:%s", userID.String())

	// Try cache first
	var streak models.LearningStreak
	if err := s.cache.Get(ctx, cacheKey, &streak); err == nil {
		return &streak, nil
	}

	// Get from repository
	streakPtr, err := s.repo.GetLearningStreak(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get learning streak: %w", err)
	}

	// Cache the result
	if err := s.cache.Set(ctx, cacheKey, streakPtr, 1*time.Hour); err != nil {
		s.logger.Warn("Failed to cache learning streak", "error", err, "user_id", userID)
	}

	return streakPtr, nil
}

// UpdateLearningStreak updates the user's learning streak based on recent activity
func (s *progressService) UpdateLearningStreak(ctx context.Context, userID uuid.UUID) error {
	// Get current streak
	streak, err := s.GetLearningStreak(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get current streak: %w", err)
	}

	// Check if user practiced today
	today := time.Now().Truncate(24 * time.Hour)
	recentAttempts, err := s.repo.GetRecentAttempts(ctx, userID, 1, 1)
	if err != nil {
		return fmt.Errorf("failed to get recent attempts: %w", err)
	}

	practicedToday := false
	if len(recentAttempts) > 0 {
		lastAttemptDate := recentAttempts[0].Timestamp.Truncate(24 * time.Hour)
		practicedToday = lastAttemptDate.Equal(today)
	}

	// Update streak logic
	if practicedToday {
		yesterday := today.AddDate(0, 0, -1)
		if streak.LastActiveDate.Truncate(24 * time.Hour).Equal(yesterday) {
			// Continue streak
			streak.CurrentStreak++
		} else if !streak.LastActiveDate.Truncate(24 * time.Hour).Equal(today) {
			// Start new streak
			streak.CurrentStreak = 1
			streak.StreakStartDate = today
		}
		// If already practiced today, no change needed

		streak.LastActiveDate = time.Now()
		if streak.CurrentStreak > streak.LongestStreak {
			streak.LongestStreak = streak.CurrentStreak
		}
	}

	// Invalidate cache
	cacheKey := fmt.Sprintf("learning_streak:%s", userID.String())
	if err := s.cache.Delete(ctx, cacheKey); err != nil {
		s.logger.Warn("Failed to invalidate streak cache", "error", err, "user_id", userID)
	}

	return nil
}

// GetMilestones retrieves all milestones for a user
func (s *progressService) GetMilestones(ctx context.Context, userID uuid.UUID) ([]models.Milestone, error) {
	// Get progress summary to calculate milestones
	summary, err := s.GetProgressSummary(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get progress summary: %w", err)
	}

	return summary.Milestones, nil
}

// CheckMilestoneAchievements checks for newly achieved milestones
func (s *progressService) CheckMilestoneAchievements(ctx context.Context, userID uuid.UUID) ([]models.Milestone, error) {
	milestones, err := s.GetMilestones(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get milestones: %w", err)
	}

	var newlyAchieved []models.Milestone
	for _, milestone := range milestones {
		if milestone.Achieved && milestone.AchievedAt.IsZero() {
			// This is a newly achieved milestone
			milestone.AchievedAt = time.Now()
			newlyAchieved = append(newlyAchieved, milestone)
		}
	}

	return newlyAchieved, nil
}

// GetProgressVisualizationData prepares data for progress visualization
func (s *progressService) GetProgressVisualizationData(ctx context.Context, userID uuid.UUID, timeRange string) (map[string]interface{}, error) {
	data := make(map[string]interface{})

	// Determine time range
	var weeks int
	switch timeRange {
	case "week":
		weeks = 1
	case "month":
		weeks = 4
	case "quarter":
		weeks = 12
	case "year":
		weeks = 52
	default:
		weeks = 12 // Default to quarter
	}

	// Get weekly progress data
	weeklyProgress, err := s.GetWeeklyProgress(ctx, userID, weeks)
	if err != nil {
		return nil, fmt.Errorf("failed to get weekly progress: %w", err)
	}

	// Get topic progress
	topicProgress, err := s.GetTopicProgress(ctx, userID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get topic progress: %w", err)
	}

	// Get learning streak
	streak, err := s.GetLearningStreak(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get learning streak: %w", err)
	}

	// Prepare visualization data
	data["weekly_progress"] = weeklyProgress
	data["topic_progress"] = topicProgress
	data["learning_streak"] = streak

	// Calculate trend data
	if len(weeklyProgress) > 1 {
		// Calculate accuracy trend
		accuracyTrend := make([]float64, len(weeklyProgress))
		for i, week := range weeklyProgress {
			accuracyTrend[i] = week.AccuracyRate
		}
		data["accuracy_trend"] = accuracyTrend

		// Calculate study time trend
		studyTimeTrend := make([]int64, len(weeklyProgress))
		for i, week := range weeklyProgress {
			studyTimeTrend[i] = week.StudyTimeMs
		}
		data["study_time_trend"] = studyTimeTrend
	}

	// Calculate mastery distribution
	masteryDistribution := make(map[string]int)
	for _, topic := range topicProgress {
		level := s.getMasteryLevelFromScore(topic.CurrentMastery)
		masteryDistribution[level]++
	}
	data["mastery_distribution"] = masteryDistribution

	return data, nil
}

// getMasteryLevelFromScore converts mastery score to level
func (s *progressService) getMasteryLevelFromScore(mastery float64) string {
	switch {
	case mastery >= 0.9:
		return "Expert"
	case mastery >= 0.8:
		return "Proficient"
	case mastery >= 0.6:
		return "Developing"
	case mastery >= 0.4:
		return "Beginner"
	default:
		return "Novice"
	}
}

// GetMasteryTrendData gets mastery trend data for a specific topic
func (s *progressService) GetMasteryTrendData(ctx context.Context, userID uuid.UUID, topic string, days int) ([]map[string]interface{}, error) {
	// Get attempts for the topic over the specified period
	attempts, err := s.repo.GetAttemptsByUserAndTopic(ctx, userID, []string{topic}, 1000)
	if err != nil {
		return nil, fmt.Errorf("failed to get attempts for topic: %w", err)
	}

	// Filter attempts by date range
	cutoffDate := time.Now().AddDate(0, 0, -days)
	var filteredAttempts []models.AttemptRecord
	for _, attempt := range attempts {
		if attempt.Timestamp.After(cutoffDate) {
			filteredAttempts = append(filteredAttempts, attempt)
		}
	}

	// Group attempts by day and calculate daily mastery
	dailyData := make(map[string][]models.AttemptRecord)
	for _, attempt := range filteredAttempts {
		day := attempt.Timestamp.Format("2006-01-02")
		dailyData[day] = append(dailyData[day], attempt)
	}

	// Calculate trend data
	var trendData []map[string]interface{}
	for day, dayAttempts := range dailyData {
		correctCount := 0
		for _, attempt := range dayAttempts {
			if attempt.Correct {
				correctCount++
			}
		}

		accuracy := float64(correctCount) / float64(len(dayAttempts))

		trendData = append(trendData, map[string]interface{}{
			"date":     day,
			"accuracy": accuracy,
			"attempts": len(dayAttempts),
			"correct":  correctCount,
		})
	}

	// Sort by date
	sort.Slice(trendData, func(i, j int) bool {
		return trendData[i]["date"].(string) < trendData[j]["date"].(string)
	})

	return trendData, nil
}

// GetAccuracyTrendData gets overall accuracy trend data
func (s *progressService) GetAccuracyTrendData(ctx context.Context, userID uuid.UUID, days int) ([]map[string]interface{}, error) {
	// Get recent attempts
	attempts, err := s.repo.GetRecentAttempts(ctx, userID, days, 10000)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent attempts: %w", err)
	}

	// Group attempts by day
	dailyData := make(map[string][]models.AttemptRecord)
	for _, attempt := range attempts {
		day := attempt.Timestamp.Format("2006-01-02")
		dailyData[day] = append(dailyData[day], attempt)
	}

	// Calculate daily accuracy
	var trendData []map[string]interface{}
	for day, dayAttempts := range dailyData {
		correctCount := 0
		totalTime := int64(0)

		for _, attempt := range dayAttempts {
			if attempt.Correct {
				correctCount++
			}
			totalTime += int64(attempt.TimeTakenMs)
		}

		accuracy := float64(correctCount) / float64(len(dayAttempts))
		avgTime := float64(totalTime) / float64(len(dayAttempts))

		trendData = append(trendData, map[string]interface{}{
			"date":        day,
			"accuracy":    accuracy,
			"attempts":    len(dayAttempts),
			"correct":     correctCount,
			"avg_time_ms": avgTime,
		})
	}

	// Sort by date
	sort.Slice(trendData, func(i, j int) bool {
		return trendData[i]["date"].(string) < trendData[j]["date"].(string)
	})

	return trendData, nil
}

// GetProgressComparison generates progress comparison data
func (s *progressService) GetProgressComparison(ctx context.Context, userID uuid.UUID, comparisonType string, target string) (*models.ProgressComparison, error) {
	switch comparisonType {
	case "peer":
		return s.GetPeerComparison(ctx, userID, target)
	case "historical":
		days := 30 // Default to 30 days
		if target != "" {
			// Parse days from target if provided
			fmt.Sscanf(target, "%d", &days)
		}
		return s.GetHistoricalComparison(ctx, userID, days)
	default:
		return nil, fmt.Errorf("unsupported comparison type: %s", comparisonType)
	}
}

// GetPeerComparison compares user progress with peers in the same country
func (s *progressService) GetPeerComparison(ctx context.Context, userID uuid.UUID, countryCode string) (*models.ProgressComparison, error) {
	// Get user's progress
	userProgress, err := s.GetProgressSummary(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user progress: %w", err)
	}

	// Calculate peer averages (simplified implementation)
	// In a real system, you'd query aggregated peer data
	peerData := map[string]interface{}{
		"average_mastery":    0.65,                                                // Placeholder
		"average_accuracy":   0.72,                                                // Placeholder
		"average_study_time": int64(float64(userProgress.TotalStudyTimeMs) * 0.8), // Placeholder
		"average_streak":     7,                                                   // Placeholder
		"total_peers":        150,                                                 // Placeholder
	}

	// Generate insights
	var insights []string
	if userProgress.OverallMastery > 0.65 {
		insights = append(insights, "Your mastery is above average compared to peers")
	} else {
		insights = append(insights, "Your mastery is below average - consider more practice")
	}

	if userProgress.AccuracyRate > 0.72 {
		insights = append(insights, "Your accuracy is better than most peers")
	}

	// Generate recommendations
	var recommendations []string
	if userProgress.LearningStreak < 7 {
		recommendations = append(recommendations, "Try to maintain a longer learning streak like your peers")
	}

	comparison := &models.ProgressComparison{
		UserID:           userID,
		ComparisonType:   "peer",
		ComparisonTarget: countryCode,
		UserProgress:     userProgress,
		ComparisonData:   peerData,
		Insights:         insights,
		Recommendations:  recommendations,
		GeneratedAt:      time.Now(),
	}

	return comparison, nil
}

// GetHistoricalComparison compares current progress with historical performance
func (s *progressService) GetHistoricalComparison(ctx context.Context, userID uuid.UUID, days int) (*models.ProgressComparison, error) {
	// Get current progress
	currentProgress, err := s.GetProgressSummary(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current progress: %w", err)
	}

	// Get historical accuracy
	historicalAccuracy, err := s.repo.GetAccuracyRate(ctx, userID, days)
	if err != nil {
		return nil, fmt.Errorf("failed to get historical accuracy: %w", err)
	}

	// Get historical study time
	historicalStudyTime, err := s.repo.GetStudyTimeStats(ctx, userID, days)
	if err != nil {
		return nil, fmt.Errorf("failed to get historical study time: %w", err)
	}

	historicalData := map[string]interface{}{
		"historical_accuracy":    historicalAccuracy,
		"historical_study_time":  historicalStudyTime,
		"comparison_period_days": days,
	}

	// Generate insights
	var insights []string
	accuracyChange := currentProgress.AccuracyRate - historicalAccuracy
	if accuracyChange > 0.05 {
		insights = append(insights, fmt.Sprintf("Your accuracy has improved by %.1f%% over the last %d days", accuracyChange*100, days))
	} else if accuracyChange < -0.05 {
		insights = append(insights, fmt.Sprintf("Your accuracy has decreased by %.1f%% over the last %d days", math.Abs(accuracyChange)*100, days))
	} else {
		insights = append(insights, "Your accuracy has remained stable")
	}

	// Generate recommendations
	var recommendations []string
	if accuracyChange < 0 {
		recommendations = append(recommendations, "Consider reviewing topics where you're struggling")
		recommendations = append(recommendations, "Take more time to read questions carefully")
	}

	comparison := &models.ProgressComparison{
		UserID:           userID,
		ComparisonType:   "historical",
		ComparisonTarget: fmt.Sprintf("%d_days", days),
		UserProgress:     currentProgress,
		ComparisonData:   historicalData,
		Insights:         insights,
		Recommendations:  recommendations,
		GeneratedAt:      time.Now(),
	}

	return comparison, nil
}

// ProcessAttempt processes a new attempt and updates related progress data
func (s *progressService) ProcessAttempt(ctx context.Context, attempt *models.AttemptRecord) error {
	// Record the attempt
	if err := s.RecordAttempt(ctx, attempt); err != nil {
		return fmt.Errorf("failed to record attempt: %w", err)
	}

	// Extract topics from the attempt (placeholder implementation)
	topics := s.extractTopicsFromAttempt(*attempt)

	// Update mastery for each topic
	for _, topic := range topics {
		// Get recent attempts for this topic
		topicAttempts, err := s.repo.GetAttemptsByUserAndTopic(ctx, attempt.UserID, []string{topic}, 50)
		if err != nil {
			s.logger.Error("Failed to get topic attempts", "error", err, "user_id", attempt.UserID, "topic", topic)
			continue
		}

		// Update mastery
		if err := s.UpdateSkillMastery(ctx, attempt.UserID, topic, topicAttempts); err != nil {
			s.logger.Error("Failed to update skill mastery", "error", err, "user_id", attempt.UserID, "topic", topic)
			continue
		}
	}

	// Update learning streak
	if err := s.UpdateLearningStreak(ctx, attempt.UserID); err != nil {
		s.logger.Error("Failed to update learning streak", "error", err, "user_id", attempt.UserID)
	}

	// Invalidate relevant caches
	cacheKeys := []string{
		fmt.Sprintf("progress_summary:%s", attempt.UserID.String()),
		fmt.Sprintf("masteries:%s", attempt.UserID.String()),
		fmt.Sprintf("learning_streak:%s", attempt.UserID.String()),
	}

	for _, key := range cacheKeys {
		if err := s.cache.Delete(ctx, key); err != nil {
			s.logger.Warn("Failed to invalidate cache", "error", err, "key", key)
		}
	}

	return nil
}

// RecordAttempt records an attempt in the database
func (s *progressService) RecordAttempt(ctx context.Context, attempt *models.AttemptRecord) error {
	if err := s.repo.CreateAttempt(ctx, attempt); err != nil {
		return fmt.Errorf("failed to create attempt: %w", err)
	}

	s.logger.Info("Recorded attempt", "user_id", attempt.UserID, "item_id", attempt.ItemID, "correct", attempt.Correct)
	return nil
}

// GenerateInsights generates personalized insights for a user
func (s *progressService) GenerateInsights(ctx context.Context, userID uuid.UUID) ([]string, error) {
	summary, err := s.GetProgressSummary(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get progress summary: %w", err)
	}

	var insights []string

	// Overall mastery insights
	if summary.OverallMastery >= 0.8 {
		insights = append(insights, "Excellent progress! You're mastering most topics.")
	} else if summary.OverallMastery >= 0.6 {
		insights = append(insights, "Good progress! Focus on weaker topics to improve further.")
	} else {
		insights = append(insights, "Keep practicing! Consistent study will improve your mastery.")
	}

	// Accuracy insights
	if summary.AccuracyRate >= 0.8 {
		insights = append(insights, "Your accuracy is excellent - you're answering most questions correctly.")
	} else if summary.AccuracyRate >= 0.6 {
		insights = append(insights, "Your accuracy is good but has room for improvement.")
	} else {
		insights = append(insights, "Focus on understanding concepts better to improve accuracy.")
	}

	// Streak insights
	if summary.LearningStreak >= 7 {
		insights = append(insights, fmt.Sprintf("Amazing! You've maintained a %d-day learning streak.", summary.LearningStreak))
	} else if summary.LearningStreak >= 3 {
		insights = append(insights, "Good consistency! Try to extend your learning streak.")
	} else {
		insights = append(insights, "Try to practice daily to build a learning streak.")
	}

	// Topic-specific insights
	weakTopics := 0
	strongTopics := 0
	for _, mastery := range summary.TopicMasteries {
		if mastery.Mastery < 0.5 {
			weakTopics++
		} else if mastery.Mastery >= 0.8 {
			strongTopics++
		}
	}

	if weakTopics > 0 {
		insights = append(insights, fmt.Sprintf("You have %d topics that need more attention.", weakTopics))
	}

	if strongTopics > 0 {
		insights = append(insights, fmt.Sprintf("You've mastered %d topics - great work!", strongTopics))
	}

	return insights, nil
}

// GenerateRecommendations generates personalized recommendations for a user
func (s *progressService) GenerateRecommendations(ctx context.Context, userID uuid.UUID) ([]string, error) {
	summary, err := s.GetProgressSummary(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get progress summary: %w", err)
	}

	var recommendations []string

	// Study time recommendations
	if summary.TotalStudyTimeMs < 3600000 { // Less than 1 hour total
		recommendations = append(recommendations, "Try to spend at least 15-20 minutes studying each day.")
	}

	// Accuracy-based recommendations
	if summary.AccuracyRate < 0.7 {
		recommendations = append(recommendations, "Take more time to read questions carefully before answering.")
		recommendations = append(recommendations, "Review explanations for incorrect answers to learn from mistakes.")
	}

	// Topic-specific recommendations
	var weakestTopic string
	var lowestMastery float64 = 1.0

	for topic, mastery := range summary.TopicMasteries {
		if mastery.Mastery < lowestMastery {
			lowestMastery = mastery.Mastery
			weakestTopic = topic
		}
	}

	if weakestTopic != "" && lowestMastery < 0.6 {
		recommendations = append(recommendations, fmt.Sprintf("Focus extra practice on '%s' - it's your weakest topic.", weakestTopic))
	}

	// Streak recommendations
	if summary.LearningStreak == 0 {
		recommendations = append(recommendations, "Start a daily practice routine to build momentum.")
	} else if summary.LearningStreak < 7 {
		recommendations = append(recommendations, "Try to practice daily to build a longer learning streak.")
	}

	// Progress-based recommendations
	if summary.OverallMastery < 0.5 {
		recommendations = append(recommendations, "Consider reviewing fundamental concepts before attempting more questions.")
	} else if summary.OverallMastery >= 0.8 {
		recommendations = append(recommendations, "You're doing great! Consider taking practice tests to prepare for the real exam.")
	}

	return recommendations, nil
}
