package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// UserSchedulerState represents the complete scheduler state for a user
type UserSchedulerState struct {
	UserID            uuid.UUID            `json:"user_id" db:"user_id"`
	AbilityVector     map[string]float64   `json:"ability_vector" db:"ability_vector"`
	AbilityConfidence map[string]float64   `json:"ability_confidence" db:"ability_confidence"`
	SM2States         map[string]*SM2State `json:"sm2_states" db:"sm2_states"`
	BKTStates         map[string]*BKTState `json:"bkt_states" db:"bkt_states"`
	BanditState       *BanditState         `json:"bandit_state" db:"bandit_state"`
	CurrentSessionID  *uuid.UUID           `json:"current_session_id,omitempty" db:"current_session_id"`
	LastSessionEnd    *time.Time           `json:"last_session_end,omitempty" db:"last_session_end"`
	ConsecutiveDays   int                  `json:"consecutive_days" db:"consecutive_days"`
	TotalStudyTimeMs  int64                `json:"total_study_time_ms" db:"total_study_time_ms"`
	Version           int                  `json:"version" db:"version"`
	LastUpdated       time.Time            `json:"last_updated" db:"last_updated"`
	CreatedAt         time.Time            `json:"created_at" db:"created_at"`
}

// SM2State represents the SM-2 spaced repetition state for an item
type SM2State struct {
	EasinessFactor float64   `json:"easiness_factor"`
	Interval       int       `json:"interval"`
	Repetition     int       `json:"repetition"`
	NextDue        time.Time `json:"next_due"`
	LastReviewed   time.Time `json:"last_reviewed"`
	Quality        int       `json:"quality"` // Last quality score (0-5)
}

// BKTState represents Bayesian Knowledge Tracing state for a topic
type BKTState struct {
	ProbKnowledge float64   `json:"prob_knowledge"` // P(L) - probability of knowing
	ProbGuess     float64   `json:"prob_guess"`     // P(G) - probability of guessing correctly
	ProbSlip      float64   `json:"prob_slip"`      // P(S) - probability of slipping (knowing but answering wrong)
	ProbLearn     float64   `json:"prob_learn"`     // P(T) - probability of learning from attempt
	LastUpdated   time.Time `json:"last_updated"`
}

// BanditState represents contextual bandit state for strategy selection
type BanditState struct {
	StrategyWeights map[string]float64 `json:"strategy_weights"` // Strategy -> weight
	ExplorationRate float64            `json:"exploration_rate"`
	TotalReward     float64            `json:"total_reward"`
	TotalAttempts   int                `json:"total_attempts"`
	LastUpdated     time.Time          `json:"last_updated"`
}

// SchedulerStateUpdate represents fields that can be updated in scheduler state
type SchedulerStateUpdate struct {
	AbilityVector     *map[string]float64   `json:"ability_vector,omitempty"`
	AbilityConfidence *map[string]float64   `json:"ability_confidence,omitempty"`
	SM2States         *map[string]*SM2State `json:"sm2_states,omitempty"`
	BKTStates         *map[string]*BKTState `json:"bkt_states,omitempty"`
	BanditState       *BanditState          `json:"bandit_state,omitempty"`
	CurrentSessionID  *uuid.UUID            `json:"current_session_id,omitempty"`
	LastSessionEnd    *time.Time            `json:"last_session_end,omitempty"`
	ConsecutiveDays   *int                  `json:"consecutive_days,omitempty"`
	TotalStudyTimeMs  *int64                `json:"total_study_time_ms,omitempty"`
	Version           int                   `json:"version"`
}

// SchedulerStateBackup represents a backup of scheduler state
type SchedulerStateBackup struct {
	ID         uuid.UUID           `json:"id" db:"id"`
	UserID     uuid.UUID           `json:"user_id" db:"user_id"`
	StateData  *UserSchedulerState `json:"state_data" db:"state_data"`
	BackupType string              `json:"backup_type" db:"backup_type"` // "manual", "automatic", "recovery"
	Reason     string              `json:"reason" db:"reason"`
	CreatedAt  time.Time           `json:"created_at" db:"created_at"`
}

// NewUserSchedulerState creates a new scheduler state with default values
func NewUserSchedulerState(userID uuid.UUID) *UserSchedulerState {
	return &UserSchedulerState{
		UserID:            userID,
		AbilityVector:     make(map[string]float64),
		AbilityConfidence: make(map[string]float64),
		SM2States:         make(map[string]*SM2State),
		BKTStates:         make(map[string]*BKTState),
		BanditState:       NewBanditState(),
		ConsecutiveDays:   0,
		TotalStudyTimeMs:  0,
		Version:           1,
		LastUpdated:       time.Now(),
		CreatedAt:         time.Now(),
	}
}

// NewSM2State creates a new SM-2 state with default values
func NewSM2State() *SM2State {
	return &SM2State{
		EasinessFactor: 2.5,
		Interval:       1,
		Repetition:     0,
		NextDue:        time.Now(),
		LastReviewed:   time.Time{},
		Quality:        0,
	}
}

// NewBKTState creates a new BKT state with default parameters
func NewBKTState() *BKTState {
	return &BKTState{
		ProbKnowledge: 0.1,  // Start with low knowledge probability
		ProbGuess:     0.25, // Default guessing probability for multiple choice
		ProbSlip:      0.1,  // Default slip probability
		ProbLearn:     0.3,  // Default learning probability
		LastUpdated:   time.Now(),
	}
}

// NewBanditState creates a new bandit state with default values
func NewBanditState() *BanditState {
	return &BanditState{
		StrategyWeights: map[string]float64{
			"practice":  1.0,
			"review":    1.0,
			"mock_test": 1.0,
		},
		ExplorationRate: 0.1,
		TotalReward:     0.0,
		TotalAttempts:   0,
		LastUpdated:     time.Now(),
	}
}

// UpdateSM2 updates the SM-2 state based on attempt quality
func (s *SM2State) UpdateSM2(quality int) {
	if quality < 0 || quality > 5 {
		quality = 0 // Invalid quality, treat as failure
	}

	s.Quality = quality
	s.LastReviewed = time.Now()

	// Update easiness factor
	s.EasinessFactor = s.EasinessFactor + 0.1 - (5-float64(quality))*(0.08+(5-float64(quality))*0.02)
	if s.EasinessFactor < 1.3 {
		s.EasinessFactor = 1.3
	}

	if quality < 3 {
		// Reset for poor performance
		s.Interval = 1
		s.Repetition = 0
	} else {
		s.Repetition++
		switch s.Repetition {
		case 1:
			s.Interval = 1
		case 2:
			s.Interval = 6
		default:
			s.Interval = int(float64(s.Interval) * s.EasinessFactor)
		}
	}

	s.NextDue = time.Now().AddDate(0, 0, s.Interval)
}

// UpdateBKT updates the BKT state based on attempt correctness
func (b *BKTState) UpdateBKT(correct bool) {
	b.LastUpdated = time.Now()

	if correct {
		// P(correct) = P(L) * (1 - P(S)) + (1 - P(L)) * P(G)
		probCorrect := b.ProbKnowledge*(1-b.ProbSlip) + (1-b.ProbKnowledge)*b.ProbGuess
		if probCorrect > 0 {
			// Update P(L) using Bayes rule
			b.ProbKnowledge = (b.ProbKnowledge * (1 - b.ProbSlip)) / probCorrect
		}
	} else {
		// P(incorrect) = P(L) * P(S) + (1 - P(L)) * (1 - P(G))
		probIncorrect := b.ProbKnowledge*b.ProbSlip + (1-b.ProbKnowledge)*(1-b.ProbGuess)
		if probIncorrect > 0 {
			b.ProbKnowledge = (b.ProbKnowledge * b.ProbSlip) / probIncorrect
		}
	}

	// Apply learning
	b.ProbKnowledge = b.ProbKnowledge + (1-b.ProbKnowledge)*b.ProbLearn

	// Ensure probabilities stay within bounds
	if b.ProbKnowledge > 1.0 {
		b.ProbKnowledge = 1.0
	}
	if b.ProbKnowledge < 0.0 {
		b.ProbKnowledge = 0.0
	}
}

// UpdateBandit updates the bandit state based on strategy performance
func (b *BanditState) UpdateBandit(strategy string, reward float64) {
	b.LastUpdated = time.Now()
	b.TotalAttempts++
	b.TotalReward += reward

	// Update strategy weight using exponential moving average
	alpha := 0.1 // Learning rate
	if currentWeight, exists := b.StrategyWeights[strategy]; exists {
		b.StrategyWeights[strategy] = (1-alpha)*currentWeight + alpha*reward
	} else {
		b.StrategyWeights[strategy] = reward
	}

	// Decay exploration rate over time
	b.ExplorationRate = b.ExplorationRate * 0.999
	if b.ExplorationRate < 0.01 {
		b.ExplorationRate = 0.01 // Minimum exploration
	}
}

// GetSM2State gets or creates SM-2 state for an item
func (s *UserSchedulerState) GetSM2State(itemID string) *SM2State {
	if state, exists := s.SM2States[itemID]; exists {
		return state
	}

	// Create new state if it doesn't exist
	newState := NewSM2State()
	s.SM2States[itemID] = newState
	return newState
}

// GetBKTState gets or creates BKT state for a topic
func (s *UserSchedulerState) GetBKTState(topic string) *BKTState {
	if state, exists := s.BKTStates[topic]; exists {
		return state
	}

	// Create new state if it doesn't exist
	newState := NewBKTState()
	s.BKTStates[topic] = newState
	return newState
}

// GetAbility gets or initializes ability for a topic
func (s *UserSchedulerState) GetAbility(topic string) float64 {
	if ability, exists := s.AbilityVector[topic]; exists {
		return ability
	}

	// Initialize with default ability (0.0 = average)
	s.AbilityVector[topic] = 0.0
	s.AbilityConfidence[topic] = 0.5 // Medium confidence
	return 0.0
}

// SetAbility sets ability and confidence for a topic
func (s *UserSchedulerState) SetAbility(topic string, ability, confidence float64) {
	s.AbilityVector[topic] = ability
	s.AbilityConfidence[topic] = confidence
}

// IsItemDue checks if an item is due for review based on SM-2
func (s *UserSchedulerState) IsItemDue(itemID string) bool {
	state := s.GetSM2State(itemID)
	return time.Now().After(state.NextDue)
}

// GetTopicMastery calculates mastery level for a topic based on BKT
func (s *UserSchedulerState) GetTopicMastery(topic string) float64 {
	state := s.GetBKTState(topic)
	return state.ProbKnowledge
}

// Clone creates a deep copy of the scheduler state
func (s *UserSchedulerState) Clone() *UserSchedulerState {
	clone := &UserSchedulerState{
		UserID:            s.UserID,
		AbilityVector:     make(map[string]float64),
		AbilityConfidence: make(map[string]float64),
		SM2States:         make(map[string]*SM2State),
		BKTStates:         make(map[string]*BKTState),
		ConsecutiveDays:   s.ConsecutiveDays,
		TotalStudyTimeMs:  s.TotalStudyTimeMs,
		Version:           s.Version,
		LastUpdated:       s.LastUpdated,
		CreatedAt:         s.CreatedAt,
	}

	// Deep copy maps
	for k, v := range s.AbilityVector {
		clone.AbilityVector[k] = v
	}
	for k, v := range s.AbilityConfidence {
		clone.AbilityConfidence[k] = v
	}
	for k, v := range s.SM2States {
		clone.SM2States[k] = &SM2State{
			EasinessFactor: v.EasinessFactor,
			Interval:       v.Interval,
			Repetition:     v.Repetition,
			NextDue:        v.NextDue,
			LastReviewed:   v.LastReviewed,
			Quality:        v.Quality,
		}
	}
	for k, v := range s.BKTStates {
		clone.BKTStates[k] = &BKTState{
			ProbKnowledge: v.ProbKnowledge,
			ProbGuess:     v.ProbGuess,
			ProbSlip:      v.ProbSlip,
			ProbLearn:     v.ProbLearn,
			LastUpdated:   v.LastUpdated,
		}
	}

	if s.BanditState != nil {
		clone.BanditState = &BanditState{
			StrategyWeights: make(map[string]float64),
			ExplorationRate: s.BanditState.ExplorationRate,
			TotalReward:     s.BanditState.TotalReward,
			TotalAttempts:   s.BanditState.TotalAttempts,
			LastUpdated:     s.BanditState.LastUpdated,
		}
		for k, v := range s.BanditState.StrategyWeights {
			clone.BanditState.StrategyWeights[k] = v
		}
	}

	if s.CurrentSessionID != nil {
		sessionID := *s.CurrentSessionID
		clone.CurrentSessionID = &sessionID
	}
	if s.LastSessionEnd != nil {
		sessionEnd := *s.LastSessionEnd
		clone.LastSessionEnd = &sessionEnd
	}

	return clone
}

// ToJSON converts scheduler state to JSON bytes
func (s *UserSchedulerState) ToJSON() ([]byte, error) {
	return json.Marshal(s)
}

// FromJSON populates scheduler state from JSON bytes
func (s *UserSchedulerState) FromJSON(data []byte) error {
	return json.Unmarshal(data, s)
}

// Validate validates scheduler state data
func (s *UserSchedulerState) Validate() error {
	if s.UserID == uuid.Nil {
		return NewAppError("INVALID_USER_ID", "User ID is required")
	}
	if s.Version <= 0 {
		return NewAppError("INVALID_VERSION", "Version must be positive")
	}
	if s.ConsecutiveDays < 0 {
		return NewAppError("INVALID_CONSECUTIVE_DAYS", "Consecutive days cannot be negative")
	}
	if s.TotalStudyTimeMs < 0 {
		return NewAppError("INVALID_STUDY_TIME", "Total study time cannot be negative")
	}

	// Validate ability values
	for topic, ability := range s.AbilityVector {
		if ability < -4.0 || ability > 4.0 {
			return NewAppError("INVALID_ABILITY", "Ability for topic "+topic+" must be between -4.0 and 4.0")
		}
	}

	// Validate confidence values
	for topic, confidence := range s.AbilityConfidence {
		if confidence < 0.0 || confidence > 1.0 {
			return NewAppError("INVALID_CONFIDENCE", "Confidence for topic "+topic+" must be between 0.0 and 1.0")
		}
	}

	// Validate BKT states
	for topic, bkt := range s.BKTStates {
		if bkt.ProbKnowledge < 0.0 || bkt.ProbKnowledge > 1.0 {
			return NewAppError("INVALID_BKT_KNOWLEDGE", "Knowledge probability for topic "+topic+" must be between 0.0 and 1.0")
		}
		if bkt.ProbGuess < 0.0 || bkt.ProbGuess > 1.0 {
			return NewAppError("INVALID_BKT_GUESS", "Guess probability for topic "+topic+" must be between 0.0 and 1.0")
		}
		if bkt.ProbSlip < 0.0 || bkt.ProbSlip > 1.0 {
			return NewAppError("INVALID_BKT_SLIP", "Slip probability for topic "+topic+" must be between 0.0 and 1.0")
		}
		if bkt.ProbLearn < 0.0 || bkt.ProbLearn > 1.0 {
			return NewAppError("INVALID_BKT_LEARN", "Learn probability for topic "+topic+" must be between 0.0 and 1.0")
		}
	}

	return nil
}

// Custom errors for scheduler state
var (
	ErrSchedulerStateNotFound = NewAppError("SCHEDULER_STATE_NOT_FOUND", "Scheduler state not found")
	ErrInvalidSchedulerState  = NewAppError("INVALID_SCHEDULER_STATE", "Invalid scheduler state data")
	ErrSchedulerStateLocked   = NewAppError("SCHEDULER_STATE_LOCKED", "Scheduler state is locked by another process")
	ErrBackupFailed           = NewAppError("BACKUP_FAILED", "Failed to create scheduler state backup")
	ErrRecoveryFailed         = NewAppError("RECOVERY_FAILED", "Failed to recover scheduler state")
)
