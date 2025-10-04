package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// SkillMastery represents a user's mastery level for a specific topic
type SkillMastery struct {
	UserID        uuid.UUID `json:"user_id" db:"user_id"`
	Topic         string    `json:"topic" db:"topic"`
	Mastery       float64   `json:"mastery" db:"mastery"`
	Confidence    float64   `json:"confidence" db:"confidence"`
	LastPracticed time.Time `json:"last_practiced" db:"last_practiced"`
	PracticeCount int       `json:"practice_count" db:"practice_count"`
	CorrectStreak int       `json:"correct_streak" db:"correct_streak"`
	LongestStreak int       `json:"longest_streak" db:"longest_streak"`
	TotalTimeMs   int64     `json:"total_time_ms" db:"total_time_ms"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

// AttemptRecord represents a user's attempt at an item
type AttemptRecord struct {
	ID               uuid.UUID              `json:"id" db:"id"`
	UserID           uuid.UUID              `json:"user_id" db:"user_id"`
	ItemID           uuid.UUID              `json:"item_id" db:"item_id"`
	SessionID        uuid.UUID              `json:"session_id" db:"session_id"`
	Selected         map[string]interface{} `json:"selected" db:"selected"`
	Correct          bool                   `json:"correct" db:"correct"`
	Quality          *int                   `json:"quality,omitempty" db:"quality"`
	Confidence       *int                   `json:"confidence,omitempty" db:"confidence"`
	TimeTakenMs      int                    `json:"time_taken_ms" db:"time_taken_ms"`
	HintsUsed        int                    `json:"hints_used" db:"hints_used"`
	ClientAttemptID  uuid.UUID              `json:"client_attempt_id" db:"client_attempt_id"`
	DeviceType       string                 `json:"device_type,omitempty" db:"device_type"`
	AppVersion       string                 `json:"app_version,omitempty" db:"app_version"`
	SM2StateBefore   map[string]interface{} `json:"sm2_state_before,omitempty" db:"sm2_state_before"`
	SM2StateAfter    map[string]interface{} `json:"sm2_state_after,omitempty" db:"sm2_state_after"`
	BKTStateBefore   map[string]interface{} `json:"bkt_state_before,omitempty" db:"bkt_state_before"`
	BKTStateAfter    map[string]interface{} `json:"bkt_state_after,omitempty" db:"bkt_state_after"`
	IRTAbilityBefore map[string]interface{} `json:"irt_ability_before,omitempty" db:"irt_ability_before"`
	IRTAbilityAfter  map[string]interface{} `json:"irt_ability_after,omitempty" db:"irt_ability_after"`
	Timestamp        time.Time              `json:"timestamp" db:"timestamp"`
	CreatedAt        time.Time              `json:"created_at" db:"created_at"`
}

// ProgressSummary represents a comprehensive view of user's learning progress
type ProgressSummary struct {
	UserID           uuid.UUID                `json:"user_id"`
	OverallMastery   float64                  `json:"overall_mastery"`
	TotalTopics      int                      `json:"total_topics"`
	MasteredTopics   int                      `json:"mastered_topics"`
	TopicMasteries   map[string]*SkillMastery `json:"topic_masteries"`
	RecentAttempts   []AttemptRecord          `json:"recent_attempts"`
	LearningStreak   int                      `json:"learning_streak"`
	TotalStudyTimeMs int64                    `json:"total_study_time_ms"`
	TotalAttempts    int                      `json:"total_attempts"`
	CorrectAttempts  int                      `json:"correct_attempts"`
	AccuracyRate     float64                  `json:"accuracy_rate"`
	WeeklyProgress   []WeeklyProgressPoint    `json:"weekly_progress"`
	TopicProgress    []TopicProgressPoint     `json:"topic_progress"`
	Milestones       []Milestone              `json:"milestones"`
	Recommendations  []string                 `json:"recommendations"`
	LastActiveDate   time.Time                `json:"last_active_date"`
	ConsecutiveDays  int                      `json:"consecutive_days"`
	GeneratedAt      time.Time                `json:"generated_at"`
}

// WeeklyProgressPoint represents progress data for a specific week
type WeeklyProgressPoint struct {
	WeekStart     time.Time `json:"week_start"`
	WeekEnd       time.Time `json:"week_end"`
	AttemptsCount int       `json:"attempts_count"`
	CorrectCount  int       `json:"correct_count"`
	AccuracyRate  float64   `json:"accuracy_rate"`
	StudyTimeMs   int64     `json:"study_time_ms"`
	TopicsStudied int       `json:"topics_studied"`
	MasteryGained float64   `json:"mastery_gained"`
}

// TopicProgressPoint represents progress data for a specific topic
type TopicProgressPoint struct {
	Topic           string    `json:"topic"`
	CurrentMastery  float64   `json:"current_mastery"`
	PreviousMastery float64   `json:"previous_mastery"`
	MasteryChange   float64   `json:"mastery_change"`
	AttemptsCount   int       `json:"attempts_count"`
	CorrectCount    int       `json:"correct_count"`
	AccuracyRate    float64   `json:"accuracy_rate"`
	LastPracticed   time.Time `json:"last_practiced"`
	Trend           string    `json:"trend"` // "improving", "stable", "declining"
}

// Milestone represents a learning achievement
type Milestone struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"` // "mastery", "streak", "time", "attempts"
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Value       float64   `json:"value"`
	Target      float64   `json:"target"`
	Achieved    bool      `json:"achieved"`
	AchievedAt  time.Time `json:"achieved_at,omitempty"`
	Progress    float64   `json:"progress"` // 0.0 to 1.0
}

// LearningStreak represents consecutive learning activity
type LearningStreak struct {
	UserID          uuid.UUID `json:"user_id"`
	CurrentStreak   int       `json:"current_streak"`
	LongestStreak   int       `json:"longest_streak"`
	LastActiveDate  time.Time `json:"last_active_date"`
	StreakStartDate time.Time `json:"streak_start_date"`
}

// ProgressFilters represents filters for progress queries
type ProgressFilters struct {
	UserID     uuid.UUID `json:"user_id"`
	Topics     []string  `json:"topics,omitempty"`
	DateFrom   time.Time `json:"date_from,omitempty"`
	DateTo     time.Time `json:"date_to,omitempty"`
	MinMastery float64   `json:"min_mastery,omitempty"`
	MaxMastery float64   `json:"max_mastery,omitempty"`
	Limit      int       `json:"limit"`
	Offset     int       `json:"offset"`
}

// ProgressComparison represents comparison between users or time periods
type ProgressComparison struct {
	UserID           uuid.UUID              `json:"user_id"`
	ComparisonType   string                 `json:"comparison_type"` // "peer", "historical", "target"
	ComparisonTarget string                 `json:"comparison_target"`
	UserProgress     *ProgressSummary       `json:"user_progress"`
	ComparisonData   map[string]interface{} `json:"comparison_data"`
	Insights         []string               `json:"insights"`
	Recommendations  []string               `json:"recommendations"`
	GeneratedAt      time.Time              `json:"generated_at"`
}

// MasteryCalculationConfig represents configuration for mastery calculations
type MasteryCalculationConfig struct {
	MasteryThreshold      float64 `json:"mastery_threshold"`        // 0.8 = 80% mastery
	ConfidenceDecay       float64 `json:"confidence_decay"`         // How confidence decreases over time
	TimeDecayFactor       float64 `json:"time_decay_factor"`        // How mastery decays over time
	StreakBonus           float64 `json:"streak_bonus"`             // Bonus for correct streaks
	MinAttemptsForMastery int     `json:"min_attempts_for_mastery"` // Minimum attempts before considering mastery
	RecencyWeight         float64 `json:"recency_weight"`           // Weight for recent attempts
}

// DefaultMasteryConfig returns default configuration for mastery calculations
func DefaultMasteryConfig() *MasteryCalculationConfig {
	return &MasteryCalculationConfig{
		MasteryThreshold:      0.8,
		ConfidenceDecay:       0.95,
		TimeDecayFactor:       0.99,
		StreakBonus:           0.1,
		MinAttemptsForMastery: 3,
		RecencyWeight:         0.7,
	}
}

// CalculateMastery calculates mastery level based on attempts
func (sm *SkillMastery) CalculateMastery(attempts []AttemptRecord, config *MasteryCalculationConfig) {
	if len(attempts) == 0 {
		return
	}

	if config == nil {
		config = DefaultMasteryConfig()
	}

	// Calculate basic accuracy
	correctCount := 0
	totalTime := int64(0)
	for _, attempt := range attempts {
		if attempt.Correct {
			correctCount++
		}
		totalTime += int64(attempt.TimeTakenMs)
	}

	// Apply recency weighting - more recent attempts have higher weight
	weightedCorrect := 0.0
	weightedTotal := 0.0

	for i, attempt := range attempts {
		// More recent attempts (higher index) get higher weight
		weight := config.RecencyWeight + (1.0-config.RecencyWeight)*float64(i)/float64(len(attempts))
		weightedTotal += weight
		if attempt.Correct {
			weightedCorrect += weight
		}
	}

	weightedAccuracy := weightedCorrect / weightedTotal

	// Apply streak bonus
	streakBonus := float64(sm.CorrectStreak) * config.StreakBonus / 10.0
	if streakBonus > 0.2 { // Cap streak bonus at 20%
		streakBonus = 0.2
	}

	// Calculate time decay based on last practice
	daysSinceLastPractice := time.Since(sm.LastPracticed).Hours() / 24
	timeDecay := 1.0
	if daysSinceLastPractice > 1 {
		timeDecay = 1.0 - (daysSinceLastPractice-1)*0.01 // 1% decay per day after first day
		if timeDecay < 0.5 {                             // Minimum 50% retention
			timeDecay = 0.5
		}
	}

	// Combine factors
	mastery := (weightedAccuracy + streakBonus) * timeDecay
	if mastery > 1.0 {
		mastery = 1.0
	}
	if mastery < 0.0 {
		mastery = 0.0
	}

	// Update confidence based on number of attempts and consistency
	confidence := float64(len(attempts)) / (float64(len(attempts)) + 5.0) // Asymptotic to 1.0
	variability := 0.0
	if len(attempts) > 1 {
		// Calculate variability in recent performance
		recentAttempts := attempts
		if len(attempts) > 10 {
			recentAttempts = attempts[len(attempts)-10:] // Last 10 attempts
		}

		correctRates := make([]float64, 0)
		windowSize := 3
		for i := windowSize; i <= len(recentAttempts); i++ {
			window := recentAttempts[i-windowSize : i]
			windowCorrect := 0
			for _, attempt := range window {
				if attempt.Correct {
					windowCorrect++
				}
			}
			correctRates = append(correctRates, float64(windowCorrect)/float64(windowSize))
		}

		if len(correctRates) > 1 {
			mean := 0.0
			for _, rate := range correctRates {
				mean += rate
			}
			mean /= float64(len(correctRates))

			variance := 0.0
			for _, rate := range correctRates {
				variance += (rate - mean) * (rate - mean)
			}
			variance /= float64(len(correctRates))
			variability = variance
		}
	}

	// Lower confidence if performance is highly variable
	confidence *= (1.0 - variability)
	if confidence < 0.1 {
		confidence = 0.1
	}

	sm.Mastery = mastery
	sm.Confidence = confidence
	sm.PracticeCount = len(attempts)
	sm.TotalTimeMs = totalTime
	sm.UpdatedAt = time.Now()
}

// IsMastered returns true if the topic is considered mastered
func (sm *SkillMastery) IsMastered(threshold float64) bool {
	if threshold == 0 {
		threshold = 0.8 // Default 80% mastery threshold
	}
	return sm.Mastery >= threshold && sm.Confidence >= 0.7 && sm.PracticeCount >= 3
}

// GetMasteryLevel returns a human-readable mastery level
func (sm *SkillMastery) GetMasteryLevel() string {
	switch {
	case sm.Mastery >= 0.9:
		return "Expert"
	case sm.Mastery >= 0.8:
		return "Proficient"
	case sm.Mastery >= 0.6:
		return "Developing"
	case sm.Mastery >= 0.4:
		return "Beginner"
	default:
		return "Novice"
	}
}

// ToJSON converts SkillMastery to JSON bytes
func (sm *SkillMastery) ToJSON() ([]byte, error) {
	return json.Marshal(sm)
}

// FromJSON populates SkillMastery from JSON bytes
func (sm *SkillMastery) FromJSON(data []byte) error {
	return json.Unmarshal(data, sm)
}

// Validate validates SkillMastery data
func (sm *SkillMastery) Validate() error {
	if sm.UserID == uuid.Nil {
		return NewAppError("INVALID_USER_ID", "User ID is required")
	}
	if sm.Topic == "" {
		return NewAppError("INVALID_TOPIC", "Topic is required")
	}
	if sm.Mastery < 0 || sm.Mastery > 1 {
		return NewAppError("INVALID_MASTERY", "Mastery must be between 0 and 1")
	}
	if sm.Confidence < 0 || sm.Confidence > 1 {
		return NewAppError("INVALID_CONFIDENCE", "Confidence must be between 0 and 1")
	}
	return nil
}

// Custom errors for progress tracking
var (
	ErrProgressNotFound    = NewAppError("PROGRESS_NOT_FOUND", "Progress data not found")
	ErrInvalidMasteryLevel = NewAppError("INVALID_MASTERY_LEVEL", "Invalid mastery level")
	ErrInvalidProgressData = NewAppError("INVALID_PROGRESS_DATA", "Invalid progress data")
	ErrAttemptNotFound     = NewAppError("ATTEMPT_NOT_FOUND", "Attempt record not found")
	ErrDuplicateAttempt    = NewAppError("DUPLICATE_ATTEMPT", "Attempt with this client ID already exists")
)
