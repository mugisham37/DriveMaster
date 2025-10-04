package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"user-service/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProgressRepository interface {
	// Skill mastery operations
	GetSkillMastery(ctx context.Context, userID uuid.UUID, topic string) (*models.SkillMastery, error)
	GetAllSkillMasteries(ctx context.Context, userID uuid.UUID) ([]models.SkillMastery, error)
	UpsertSkillMastery(ctx context.Context, mastery *models.SkillMastery) error
	UpdateSkillMastery(ctx context.Context, userID uuid.UUID, topic string, mastery float64, confidence float64) error

	// Attempt operations
	CreateAttempt(ctx context.Context, attempt *models.AttemptRecord) error
	GetAttemptsByUser(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]models.AttemptRecord, error)
	GetAttemptsByUserAndTopic(ctx context.Context, userID uuid.UUID, topics []string, limit int) ([]models.AttemptRecord, error)
	GetAttemptsBySession(ctx context.Context, sessionID uuid.UUID) ([]models.AttemptRecord, error)
	GetRecentAttempts(ctx context.Context, userID uuid.UUID, days int, limit int) ([]models.AttemptRecord, error)

	// Progress analytics
	GetProgressSummary(ctx context.Context, userID uuid.UUID) (*models.ProgressSummary, error)
	GetWeeklyProgress(ctx context.Context, userID uuid.UUID, weeks int) ([]models.WeeklyProgressPoint, error)
	GetTopicProgress(ctx context.Context, userID uuid.UUID, topics []string) ([]models.TopicProgressPoint, error)
	GetLearningStreak(ctx context.Context, userID uuid.UUID) (*models.LearningStreak, error)

	// Comparison and benchmarking
	GetUserRanking(ctx context.Context, userID uuid.UUID, topic string) (int, error)
	GetTopicLeaderboard(ctx context.Context, topic string, limit int) ([]models.SkillMastery, error)
	GetAverageMasteryByTopic(ctx context.Context, topic string) (float64, error)

	// Statistics
	GetTotalAttempts(ctx context.Context, userID uuid.UUID) (int, error)
	GetAccuracyRate(ctx context.Context, userID uuid.UUID, days int) (float64, error)
	GetStudyTimeStats(ctx context.Context, userID uuid.UUID, days int) (int64, error)
}

type progressRepository struct {
	db *pgxpool.Pool
}

func NewProgressRepository(db *pgxpool.Pool) ProgressRepository {
	return &progressRepository{db: db}
}

func (r *progressRepository) GetSkillMastery(ctx context.Context, userID uuid.UUID, topic string) (*models.SkillMastery, error) {
	query := `
		SELECT user_id, topic, mastery, confidence, last_practiced, practice_count,
		       correct_streak, longest_streak, total_time_ms, created_at, updated_at
		FROM skill_mastery 
		WHERE user_id = $1 AND topic = $2`

	var mastery models.SkillMastery
	err := r.db.QueryRow(ctx, query, userID, topic).Scan(
		&mastery.UserID, &mastery.Topic, &mastery.Mastery, &mastery.Confidence,
		&mastery.LastPracticed, &mastery.PracticeCount, &mastery.CorrectStreak,
		&mastery.LongestStreak, &mastery.TotalTimeMs, &mastery.CreatedAt, &mastery.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrProgressNotFound
		}
		return nil, fmt.Errorf("failed to get skill mastery: %w", err)
	}

	return &mastery, nil
}

func (r *progressRepository) GetAllSkillMasteries(ctx context.Context, userID uuid.UUID) ([]models.SkillMastery, error) {
	query := `
		SELECT user_id, topic, mastery, confidence, last_practiced, practice_count,
		       correct_streak, longest_streak, total_time_ms, created_at, updated_at
		FROM skill_mastery 
		WHERE user_id = $1
		ORDER BY mastery DESC, last_practiced DESC`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get all skill masteries: %w", err)
	}
	defer rows.Close()

	var masteries []models.SkillMastery
	for rows.Next() {
		var mastery models.SkillMastery
		err := rows.Scan(
			&mastery.UserID, &mastery.Topic, &mastery.Mastery, &mastery.Confidence,
			&mastery.LastPracticed, &mastery.PracticeCount, &mastery.CorrectStreak,
			&mastery.LongestStreak, &mastery.TotalTimeMs, &mastery.CreatedAt, &mastery.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan skill mastery: %w", err)
		}
		masteries = append(masteries, mastery)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating skill masteries: %w", err)
	}

	return masteries, nil
}

func (r *progressRepository) UpsertSkillMastery(ctx context.Context, mastery *models.SkillMastery) error {
	if mastery.CreatedAt.IsZero() {
		mastery.CreatedAt = time.Now()
	}
	mastery.UpdatedAt = time.Now()

	query := `
		INSERT INTO skill_mastery (
			user_id, topic, mastery, confidence, last_practiced, practice_count,
			correct_streak, longest_streak, total_time_ms, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (user_id, topic) 
		DO UPDATE SET 
			mastery = EXCLUDED.mastery,
			confidence = EXCLUDED.confidence,
			last_practiced = EXCLUDED.last_practiced,
			practice_count = EXCLUDED.practice_count,
			correct_streak = EXCLUDED.correct_streak,
			longest_streak = EXCLUDED.longest_streak,
			total_time_ms = EXCLUDED.total_time_ms,
			updated_at = EXCLUDED.updated_at`

	_, err := r.db.Exec(ctx, query,
		mastery.UserID, mastery.Topic, mastery.Mastery, mastery.Confidence,
		mastery.LastPracticed, mastery.PracticeCount, mastery.CorrectStreak,
		mastery.LongestStreak, mastery.TotalTimeMs, mastery.CreatedAt, mastery.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to upsert skill mastery: %w", err)
	}

	return nil
}

func (r *progressRepository) UpdateSkillMastery(ctx context.Context, userID uuid.UUID, topic string, mastery float64, confidence float64) error {
	query := `
		UPDATE skill_mastery 
		SET mastery = $3, confidence = $4, updated_at = NOW()
		WHERE user_id = $1 AND topic = $2`

	result, err := r.db.Exec(ctx, query, userID, topic, mastery, confidence)
	if err != nil {
		return fmt.Errorf("failed to update skill mastery: %w", err)
	}

	if result.RowsAffected() == 0 {
		return models.ErrProgressNotFound
	}

	return nil
}

func (r *progressRepository) CreateAttempt(ctx context.Context, attempt *models.AttemptRecord) error {
	if attempt.ID == uuid.Nil {
		attempt.ID = uuid.New()
	}
	if attempt.Timestamp.IsZero() {
		attempt.Timestamp = time.Now()
	}
	if attempt.CreatedAt.IsZero() {
		attempt.CreatedAt = time.Now()
	}

	// Marshal JSON fields
	selectedJSON, err := json.Marshal(attempt.Selected)
	if err != nil {
		return fmt.Errorf("failed to marshal selected: %w", err)
	}

	var sm2BeforeJSON, sm2AfterJSON, bktBeforeJSON, bktAfterJSON, irtBeforeJSON, irtAfterJSON []byte

	if attempt.SM2StateBefore != nil {
		sm2BeforeJSON, err = json.Marshal(attempt.SM2StateBefore)
		if err != nil {
			return fmt.Errorf("failed to marshal SM2 state before: %w", err)
		}
	}

	if attempt.SM2StateAfter != nil {
		sm2AfterJSON, err = json.Marshal(attempt.SM2StateAfter)
		if err != nil {
			return fmt.Errorf("failed to marshal SM2 state after: %w", err)
		}
	}

	if attempt.BKTStateBefore != nil {
		bktBeforeJSON, err = json.Marshal(attempt.BKTStateBefore)
		if err != nil {
			return fmt.Errorf("failed to marshal BKT state before: %w", err)
		}
	}

	if attempt.BKTStateAfter != nil {
		bktAfterJSON, err = json.Marshal(attempt.BKTStateAfter)
		if err != nil {
			return fmt.Errorf("failed to marshal BKT state after: %w", err)
		}
	}

	if attempt.IRTAbilityBefore != nil {
		irtBeforeJSON, err = json.Marshal(attempt.IRTAbilityBefore)
		if err != nil {
			return fmt.Errorf("failed to marshal IRT ability before: %w", err)
		}
	}

	if attempt.IRTAbilityAfter != nil {
		irtAfterJSON, err = json.Marshal(attempt.IRTAbilityAfter)
		if err != nil {
			return fmt.Errorf("failed to marshal IRT ability after: %w", err)
		}
	}

	query := `
		INSERT INTO attempts (
			id, user_id, item_id, session_id, selected, correct, quality, confidence,
			time_taken_ms, hints_used, client_attempt_id, device_type, app_version,
			sm2_state_before, sm2_state_after, bkt_state_before, bkt_state_after,
			irt_ability_before, irt_ability_after, timestamp, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
		)`

	_, err = r.db.Exec(ctx, query,
		attempt.ID, attempt.UserID, attempt.ItemID, attempt.SessionID, selectedJSON,
		attempt.Correct, attempt.Quality, attempt.Confidence, attempt.TimeTakenMs,
		attempt.HintsUsed, attempt.ClientAttemptID, attempt.DeviceType, attempt.AppVersion,
		sm2BeforeJSON, sm2AfterJSON, bktBeforeJSON, bktAfterJSON,
		irtBeforeJSON, irtAfterJSON, attempt.Timestamp, attempt.CreatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") && strings.Contains(err.Error(), "client_attempt_id") {
			return models.ErrDuplicateAttempt
		}
		return fmt.Errorf("failed to create attempt: %w", err)
	}

	return nil
}

func (r *progressRepository) GetAttemptsByUser(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]models.AttemptRecord, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 1000 {
		limit = 1000
	}

	query := `
		SELECT id, user_id, item_id, session_id, selected, correct, quality, confidence,
		       time_taken_ms, hints_used, client_attempt_id, device_type, app_version,
		       sm2_state_before, sm2_state_after, bkt_state_before, bkt_state_after,
		       irt_ability_before, irt_ability_after, timestamp, created_at
		FROM attempts 
		WHERE user_id = $1
		ORDER BY timestamp DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get attempts by user: %w", err)
	}
	defer rows.Close()

	return r.scanAttempts(rows)
}

func (r *progressRepository) GetAttemptsByUserAndTopic(ctx context.Context, userID uuid.UUID, topics []string, limit int) ([]models.AttemptRecord, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}

	// Build topic filter for items
	topicPlaceholders := make([]string, len(topics))
	args := []interface{}{userID}
	for i, topic := range topics {
		topicPlaceholders[i] = fmt.Sprintf("$%d", i+2)
		args = append(args, topic)
	}
	args = append(args, limit)

	query := fmt.Sprintf(`
		SELECT a.id, a.user_id, a.item_id, a.session_id, a.selected, a.correct, a.quality, a.confidence,
		       a.time_taken_ms, a.hints_used, a.client_attempt_id, a.device_type, a.app_version,
		       a.sm2_state_before, a.sm2_state_after, a.bkt_state_before, a.bkt_state_after,
		       a.irt_ability_before, a.irt_ability_after, a.timestamp, a.created_at
		FROM attempts a
		JOIN items i ON a.item_id = i.id
		WHERE a.user_id = $1 AND i.topics ?| array[%s]
		ORDER BY a.timestamp DESC
		LIMIT $%d`, strings.Join(topicPlaceholders, ","), len(args))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get attempts by user and topic: %w", err)
	}
	defer rows.Close()

	return r.scanAttempts(rows)
}

func (r *progressRepository) GetAttemptsBySession(ctx context.Context, sessionID uuid.UUID) ([]models.AttemptRecord, error) {
	query := `
		SELECT id, user_id, item_id, session_id, selected, correct, quality, confidence,
		       time_taken_ms, hints_used, client_attempt_id, device_type, app_version,
		       sm2_state_before, sm2_state_after, bkt_state_before, bkt_state_after,
		       irt_ability_before, irt_ability_after, timestamp, created_at
		FROM attempts 
		WHERE session_id = $1
		ORDER BY timestamp ASC`

	rows, err := r.db.Query(ctx, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get attempts by session: %w", err)
	}
	defer rows.Close()

	return r.scanAttempts(rows)
}

func (r *progressRepository) GetRecentAttempts(ctx context.Context, userID uuid.UUID, days int, limit int) ([]models.AttemptRecord, error) {
	if days <= 0 {
		days = 7
	}
	if limit <= 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}

	query := `
		SELECT id, user_id, item_id, session_id, selected, correct, quality, confidence,
		       time_taken_ms, hints_used, client_attempt_id, device_type, app_version,
		       sm2_state_before, sm2_state_after, bkt_state_before, bkt_state_after,
		       irt_ability_before, irt_ability_after, timestamp, created_at
		FROM attempts 
		WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '%d days'
		ORDER BY timestamp DESC
		LIMIT $2`

	rows, err := r.db.Query(ctx, fmt.Sprintf(query, days), userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent attempts: %w", err)
	}
	defer rows.Close()

	return r.scanAttempts(rows)
}

func (r *progressRepository) scanAttempts(rows pgx.Rows) ([]models.AttemptRecord, error) {
	var attempts []models.AttemptRecord

	for rows.Next() {
		var attempt models.AttemptRecord
		var selectedJSON, sm2BeforeJSON, sm2AfterJSON, bktBeforeJSON, bktAfterJSON, irtBeforeJSON, irtAfterJSON []byte

		err := rows.Scan(
			&attempt.ID, &attempt.UserID, &attempt.ItemID, &attempt.SessionID,
			&selectedJSON, &attempt.Correct, &attempt.Quality, &attempt.Confidence,
			&attempt.TimeTakenMs, &attempt.HintsUsed, &attempt.ClientAttemptID,
			&attempt.DeviceType, &attempt.AppVersion, &sm2BeforeJSON, &sm2AfterJSON,
			&bktBeforeJSON, &bktAfterJSON, &irtBeforeJSON, &irtAfterJSON,
			&attempt.Timestamp, &attempt.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan attempt: %w", err)
		}

		// Unmarshal JSON fields
		if err := json.Unmarshal(selectedJSON, &attempt.Selected); err != nil {
			return nil, fmt.Errorf("failed to unmarshal selected: %w", err)
		}

		if len(sm2BeforeJSON) > 0 {
			if err := json.Unmarshal(sm2BeforeJSON, &attempt.SM2StateBefore); err != nil {
				return nil, fmt.Errorf("failed to unmarshal SM2 state before: %w", err)
			}
		}

		if len(sm2AfterJSON) > 0 {
			if err := json.Unmarshal(sm2AfterJSON, &attempt.SM2StateAfter); err != nil {
				return nil, fmt.Errorf("failed to unmarshal SM2 state after: %w", err)
			}
		}

		if len(bktBeforeJSON) > 0 {
			if err := json.Unmarshal(bktBeforeJSON, &attempt.BKTStateBefore); err != nil {
				return nil, fmt.Errorf("failed to unmarshal BKT state before: %w", err)
			}
		}

		if len(bktAfterJSON) > 0 {
			if err := json.Unmarshal(bktAfterJSON, &attempt.BKTStateAfter); err != nil {
				return nil, fmt.Errorf("failed to unmarshal BKT state after: %w", err)
			}
		}

		if len(irtBeforeJSON) > 0 {
			if err := json.Unmarshal(irtBeforeJSON, &attempt.IRTAbilityBefore); err != nil {
				return nil, fmt.Errorf("failed to unmarshal IRT ability before: %w", err)
			}
		}

		if len(irtAfterJSON) > 0 {
			if err := json.Unmarshal(irtAfterJSON, &attempt.IRTAbilityAfter); err != nil {
				return nil, fmt.Errorf("failed to unmarshal IRT ability after: %w", err)
			}
		}

		attempts = append(attempts, attempt)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating attempts: %w", err)
	}

	return attempts, nil
}

func (r *progressRepository) GetProgressSummary(ctx context.Context, userID uuid.UUID) (*models.ProgressSummary, error) {
	summary := &models.ProgressSummary{
		UserID:      userID,
		GeneratedAt: time.Now(),
	}

	// Get all skill masteries
	masteries, err := r.GetAllSkillMasteries(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get skill masteries: %w", err)
	}

	summary.TopicMasteries = make(map[string]*models.SkillMastery)
	totalMastery := 0.0
	masteredCount := 0
	totalStudyTime := int64(0)

	for i := range masteries {
		mastery := &masteries[i]
		summary.TopicMasteries[mastery.Topic] = mastery
		totalMastery += mastery.Mastery
		totalStudyTime += mastery.TotalTimeMs

		if mastery.IsMastered(0.8) {
			masteredCount++
		}
	}

	summary.TotalTopics = len(masteries)
	summary.MasteredTopics = masteredCount
	summary.TotalStudyTimeMs = totalStudyTime

	if len(masteries) > 0 {
		summary.OverallMastery = totalMastery / float64(len(masteries))
	}

	// Get recent attempts for accuracy calculation
	recentAttempts, err := r.GetRecentAttempts(ctx, userID, 30, 1000)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent attempts: %w", err)
	}

	summary.RecentAttempts = recentAttempts
	summary.TotalAttempts = len(recentAttempts)

	correctCount := 0
	for _, attempt := range recentAttempts {
		if attempt.Correct {
			correctCount++
		}
	}

	summary.CorrectAttempts = correctCount
	if len(recentAttempts) > 0 {
		summary.AccuracyRate = float64(correctCount) / float64(len(recentAttempts))
	}

	// Get learning streak
	streak, err := r.GetLearningStreak(ctx, userID)
	if err == nil {
		summary.LearningStreak = streak.CurrentStreak
		summary.ConsecutiveDays = streak.CurrentStreak
		summary.LastActiveDate = streak.LastActiveDate
	}

	// Generate milestones
	summary.Milestones = r.generateMilestones(summary)

	// Generate recommendations
	summary.Recommendations = r.generateRecommendations(summary)

	return summary, nil
}

func (r *progressRepository) GetWeeklyProgress(ctx context.Context, userID uuid.UUID, weeks int) ([]models.WeeklyProgressPoint, error) {
	if weeks <= 0 {
		weeks = 12 // Default to 12 weeks
	}
	if weeks > 52 {
		weeks = 52 // Max 1 year
	}

	query := `
		WITH weekly_data AS (
			SELECT 
				date_trunc('week', timestamp) as week_start,
				COUNT(*) as attempts_count,
				SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct_count,
				SUM(time_taken_ms) as total_time_ms,
				COUNT(DISTINCT (
					SELECT jsonb_array_elements_text(i.topics)
					FROM items i WHERE i.id = a.item_id
				)) as topics_studied
			FROM attempts a
			WHERE a.user_id = $1 
				AND a.timestamp >= NOW() - INTERVAL '%d weeks'
			GROUP BY date_trunc('week', timestamp)
			ORDER BY week_start DESC
		)
		SELECT 
			week_start,
			week_start + INTERVAL '6 days' as week_end,
			attempts_count,
			correct_count,
			CASE WHEN attempts_count > 0 THEN correct_count::float / attempts_count ELSE 0 END as accuracy_rate,
			total_time_ms,
			COALESCE(topics_studied, 0) as topics_studied
		FROM weekly_data`

	rows, err := r.db.Query(ctx, fmt.Sprintf(query, weeks), userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get weekly progress: %w", err)
	}
	defer rows.Close()

	var weeklyProgress []models.WeeklyProgressPoint
	for rows.Next() {
		var point models.WeeklyProgressPoint
		err := rows.Scan(
			&point.WeekStart, &point.WeekEnd, &point.AttemptsCount,
			&point.CorrectCount, &point.AccuracyRate, &point.StudyTimeMs,
			&point.TopicsStudied,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan weekly progress: %w", err)
		}

		// Calculate mastery gained (simplified - would need more complex calculation in practice)
		point.MasteryGained = float64(point.CorrectCount) * 0.1 // Placeholder calculation

		weeklyProgress = append(weeklyProgress, point)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating weekly progress: %w", err)
	}

	return weeklyProgress, nil
}

func (r *progressRepository) GetTopicProgress(ctx context.Context, userID uuid.UUID, topics []string) ([]models.TopicProgressPoint, error) {
	if len(topics) == 0 {
		// Get all topics for the user
		masteries, err := r.GetAllSkillMasteries(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to get skill masteries: %w", err)
		}

		for _, mastery := range masteries {
			topics = append(topics, mastery.Topic)
		}
	}

	var topicProgress []models.TopicProgressPoint

	for _, topic := range topics {
		mastery, err := r.GetSkillMastery(ctx, userID, topic)
		if err != nil {
			if err == models.ErrProgressNotFound {
				// Create empty progress point for topics without mastery data
				topicProgress = append(topicProgress, models.TopicProgressPoint{
					Topic:           topic,
					CurrentMastery:  0.0,
					PreviousMastery: 0.0,
					MasteryChange:   0.0,
					AttemptsCount:   0,
					CorrectCount:    0,
					AccuracyRate:    0.0,
					LastPracticed:   time.Time{},
					Trend:           "stable",
				})
				continue
			}
			return nil, fmt.Errorf("failed to get mastery for topic %s: %w", topic, err)
		}

		// Get recent attempts for this topic to calculate trend
		attempts, err := r.GetAttemptsByUserAndTopic(ctx, userID, []string{topic}, 20)
		if err != nil {
			return nil, fmt.Errorf("failed to get attempts for topic %s: %w", topic, err)
		}

		correctCount := 0
		for _, attempt := range attempts {
			if attempt.Correct {
				correctCount++
			}
		}

		accuracyRate := 0.0
		if len(attempts) > 0 {
			accuracyRate = float64(correctCount) / float64(len(attempts))
		}

		// Calculate trend (simplified)
		trend := "stable"
		if len(attempts) >= 6 {
			// Compare first half vs second half of recent attempts
			firstHalf := attempts[len(attempts)/2:]
			secondHalf := attempts[:len(attempts)/2]

			firstHalfCorrect := 0
			for _, attempt := range firstHalf {
				if attempt.Correct {
					firstHalfCorrect++
				}
			}

			secondHalfCorrect := 0
			for _, attempt := range secondHalf {
				if attempt.Correct {
					secondHalfCorrect++
				}
			}

			firstHalfRate := float64(firstHalfCorrect) / float64(len(firstHalf))
			secondHalfRate := float64(secondHalfCorrect) / float64(len(secondHalf))

			if secondHalfRate > firstHalfRate+0.1 {
				trend = "improving"
			} else if secondHalfRate < firstHalfRate-0.1 {
				trend = "declining"
			}
		}

		// For simplicity, using current mastery as both current and previous
		// In a real implementation, you'd track historical mastery values
		topicProgress = append(topicProgress, models.TopicProgressPoint{
			Topic:           topic,
			CurrentMastery:  mastery.Mastery,
			PreviousMastery: mastery.Mastery * 0.9, // Placeholder - assume 10% improvement
			MasteryChange:   mastery.Mastery * 0.1,
			AttemptsCount:   len(attempts),
			CorrectCount:    correctCount,
			AccuracyRate:    accuracyRate,
			LastPracticed:   mastery.LastPracticed,
			Trend:           trend,
		})
	}

	return topicProgress, nil
}

func (r *progressRepository) GetLearningStreak(ctx context.Context, userID uuid.UUID) (*models.LearningStreak, error) {
	// Get the user's attempt history to calculate streak
	query := `
		SELECT DISTINCT DATE(timestamp) as practice_date
		FROM attempts 
		WHERE user_id = $1 
		ORDER BY practice_date DESC
		LIMIT 365` // Look at last year

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get practice dates: %w", err)
	}
	defer rows.Close()

	var practiceDates []time.Time
	for rows.Next() {
		var date time.Time
		if err := rows.Scan(&date); err != nil {
			return nil, fmt.Errorf("failed to scan practice date: %w", err)
		}
		practiceDates = append(practiceDates, date)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating practice dates: %w", err)
	}

	streak := &models.LearningStreak{
		UserID: userID,
	}

	if len(practiceDates) == 0 {
		return streak, nil
	}

	// Calculate current streak
	today := time.Now().Truncate(24 * time.Hour)
	yesterday := today.AddDate(0, 0, -1)

	streak.LastActiveDate = practiceDates[0]

	// Check if user practiced today or yesterday to maintain streak
	if practiceDates[0].Equal(today) || practiceDates[0].Equal(yesterday) {
		currentStreak := 1
		longestStreak := 1
		streakStart := practiceDates[0]

		// Count consecutive days
		for i := 1; i < len(practiceDates); i++ {
			expectedDate := practiceDates[i-1].AddDate(0, 0, -1)
			if practiceDates[i].Equal(expectedDate) {
				currentStreak++
				if currentStreak > longestStreak {
					longestStreak = currentStreak
				}
			} else {
				// Streak broken, but continue to find longest streak
				if currentStreak > longestStreak {
					longestStreak = currentStreak
				}
				currentStreak = 1
				streakStart = practiceDates[i]
			}
		}

		streak.CurrentStreak = currentStreak
		streak.LongestStreak = longestStreak
		streak.StreakStartDate = streakStart
	} else {
		// No current streak, but find longest historical streak
		longestStreak := 1
		currentStreak := 1

		for i := 1; i < len(practiceDates); i++ {
			expectedDate := practiceDates[i-1].AddDate(0, 0, -1)
			if practiceDates[i].Equal(expectedDate) {
				currentStreak++
			} else {
				if currentStreak > longestStreak {
					longestStreak = currentStreak
				}
				currentStreak = 1
			}
		}

		if currentStreak > longestStreak {
			longestStreak = currentStreak
		}

		streak.LongestStreak = longestStreak
	}

	return streak, nil
}

func (r *progressRepository) GetUserRanking(ctx context.Context, userID uuid.UUID, topic string) (int, error) {
	query := `
		SELECT COUNT(*) + 1 as rank
		FROM skill_mastery 
		WHERE topic = $1 AND mastery > (
			SELECT mastery FROM skill_mastery 
			WHERE user_id = $2 AND topic = $1
		)`

	var rank int
	err := r.db.QueryRow(ctx, query, topic, userID).Scan(&rank)
	if err != nil {
		if err == pgx.ErrNoRows {
			return 1, nil // User is ranked #1 or no data exists
		}
		return 0, fmt.Errorf("failed to get user ranking: %w", err)
	}

	return rank, nil
}

func (r *progressRepository) GetTopicLeaderboard(ctx context.Context, topic string, limit int) ([]models.SkillMastery, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT user_id, topic, mastery, confidence, last_practiced, practice_count,
		       correct_streak, longest_streak, total_time_ms, created_at, updated_at
		FROM skill_mastery 
		WHERE topic = $1
		ORDER BY mastery DESC, practice_count DESC
		LIMIT $2`

	rows, err := r.db.Query(ctx, query, topic, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get topic leaderboard: %w", err)
	}
	defer rows.Close()

	var leaderboard []models.SkillMastery
	for rows.Next() {
		var mastery models.SkillMastery
		err := rows.Scan(
			&mastery.UserID, &mastery.Topic, &mastery.Mastery, &mastery.Confidence,
			&mastery.LastPracticed, &mastery.PracticeCount, &mastery.CorrectStreak,
			&mastery.LongestStreak, &mastery.TotalTimeMs, &mastery.CreatedAt, &mastery.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan leaderboard entry: %w", err)
		}
		leaderboard = append(leaderboard, mastery)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating leaderboard: %w", err)
	}

	return leaderboard, nil
}

func (r *progressRepository) GetAverageMasteryByTopic(ctx context.Context, topic string) (float64, error) {
	query := `
		SELECT AVG(mastery) as avg_mastery
		FROM skill_mastery 
		WHERE topic = $1 AND practice_count >= 3`

	var avgMastery float64
	err := r.db.QueryRow(ctx, query, topic).Scan(&avgMastery)
	if err != nil {
		if err == pgx.ErrNoRows {
			return 0.0, nil
		}
		return 0.0, fmt.Errorf("failed to get average mastery: %w", err)
	}

	return avgMastery, nil
}

func (r *progressRepository) GetTotalAttempts(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM attempts WHERE user_id = $1`

	var count int
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get total attempts: %w", err)
	}

	return count, nil
}

func (r *progressRepository) GetAccuracyRate(ctx context.Context, userID uuid.UUID, days int) (float64, error) {
	if days <= 0 {
		days = 30
	}

	query := `
		SELECT 
			COUNT(*) as total,
			SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct
		FROM attempts 
		WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '%d days'`

	var total, correct int
	err := r.db.QueryRow(ctx, fmt.Sprintf(query, days), userID).Scan(&total, &correct)
	if err != nil {
		return 0.0, fmt.Errorf("failed to get accuracy rate: %w", err)
	}

	if total == 0 {
		return 0.0, nil
	}

	return float64(correct) / float64(total), nil
}

func (r *progressRepository) GetStudyTimeStats(ctx context.Context, userID uuid.UUID, days int) (int64, error) {
	if days <= 0 {
		days = 30
	}

	query := `
		SELECT COALESCE(SUM(time_taken_ms), 0) as total_time
		FROM attempts 
		WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '%d days'`

	var totalTime int64
	err := r.db.QueryRow(ctx, fmt.Sprintf(query, days), userID).Scan(&totalTime)
	if err != nil {
		return 0, fmt.Errorf("failed to get study time stats: %w", err)
	}

	return totalTime, nil
}

// Helper functions for generating milestones and recommendations

func (r *progressRepository) generateMilestones(summary *models.ProgressSummary) []models.Milestone {
	var milestones []models.Milestone

	// Mastery milestones
	milestones = append(milestones, models.Milestone{
		ID:          "overall_mastery_80",
		Type:        "mastery",
		Title:       "Master Student",
		Description: "Achieve 80% overall mastery",
		Value:       summary.OverallMastery,
		Target:      0.8,
		Achieved:    summary.OverallMastery >= 0.8,
		Progress:    summary.OverallMastery / 0.8,
	})

	// Topic mastery milestone
	milestones = append(milestones, models.Milestone{
		ID:          "master_10_topics",
		Type:        "mastery",
		Title:       "Topic Expert",
		Description: "Master 10 different topics",
		Value:       float64(summary.MasteredTopics),
		Target:      10,
		Achieved:    summary.MasteredTopics >= 10,
		Progress:    float64(summary.MasteredTopics) / 10.0,
	})

	// Streak milestone
	milestones = append(milestones, models.Milestone{
		ID:          "streak_7_days",
		Type:        "streak",
		Title:       "Week Warrior",
		Description: "Maintain a 7-day learning streak",
		Value:       float64(summary.LearningStreak),
		Target:      7,
		Achieved:    summary.LearningStreak >= 7,
		Progress:    float64(summary.LearningStreak) / 7.0,
	})

	// Study time milestone (convert ms to hours)
	studyHours := float64(summary.TotalStudyTimeMs) / (1000 * 60 * 60)
	milestones = append(milestones, models.Milestone{
		ID:          "study_time_50_hours",
		Type:        "time",
		Title:       "Dedicated Learner",
		Description: "Complete 50 hours of study time",
		Value:       studyHours,
		Target:      50,
		Achieved:    studyHours >= 50,
		Progress:    studyHours / 50.0,
	})

	// Attempts milestone
	milestones = append(milestones, models.Milestone{
		ID:          "attempts_1000",
		Type:        "attempts",
		Title:       "Practice Champion",
		Description: "Complete 1000 practice attempts",
		Value:       float64(summary.TotalAttempts),
		Target:      1000,
		Achieved:    summary.TotalAttempts >= 1000,
		Progress:    float64(summary.TotalAttempts) / 1000.0,
	})

	return milestones
}

func (r *progressRepository) generateRecommendations(summary *models.ProgressSummary) []string {
	var recommendations []string

	// Accuracy-based recommendations
	if summary.AccuracyRate < 0.7 {
		recommendations = append(recommendations, "Focus on reviewing fundamentals to improve accuracy")
	}

	// Mastery-based recommendations
	if summary.OverallMastery < 0.6 {
		recommendations = append(recommendations, "Spend more time on weaker topics to build foundational knowledge")
	}

	// Streak-based recommendations
	if summary.LearningStreak < 3 {
		recommendations = append(recommendations, "Try to practice daily to build a learning habit")
	}

	// Topic-specific recommendations
	weakTopics := make([]string, 0)
	for topic, mastery := range summary.TopicMasteries {
		if mastery.Mastery < 0.5 {
			weakTopics = append(weakTopics, topic)
		}
	}

	if len(weakTopics) > 0 {
		if len(weakTopics) <= 3 {
			recommendations = append(recommendations, fmt.Sprintf("Focus on improving: %s", strings.Join(weakTopics, ", ")))
		} else {
			recommendations = append(recommendations, fmt.Sprintf("Focus on improving %d weaker topics", len(weakTopics)))
		}
	}

	// Study time recommendations
	studyHours := float64(summary.TotalStudyTimeMs) / (1000 * 60 * 60)
	if studyHours < 10 {
		recommendations = append(recommendations, "Increase daily study time for better retention")
	}

	// Default recommendation if no specific issues
	if len(recommendations) == 0 {
		recommendations = append(recommendations, "Keep up the great work! Continue practicing regularly")
	}

	return recommendations
}

