package algorithms

import (
	"math"
	"time"

	pb "scheduler-service/proto"

	"google.golang.org/protobuf/types/known/timestamppb"
)

// SM2Algorithm implements the SuperMemo-2 spaced repetition algorithm
type SM2Algorithm struct {
	// Configuration parameters
	MinEasinessFactor float64 // Minimum easiness factor (default: 1.3)
	MaxEasinessFactor float64 // Maximum easiness factor (default: 2.5)
	InitialInterval   int     // Initial interval in days (default: 1)
	SecondInterval    int     // Second interval in days (default: 6)
}

// NewSM2Algorithm creates a new SM-2 algorithm instance with default parameters
func NewSM2Algorithm() *SM2Algorithm {
	return &SM2Algorithm{
		MinEasinessFactor: 1.3,
		MaxEasinessFactor: 2.5,
		InitialInterval:   1,
		SecondInterval:    6,
	}
}

// SM2State represents the internal state for SM-2 algorithm
type SM2State struct {
	EasinessFactor float64   `json:"easiness_factor"`
	Interval       int       `json:"interval"`
	Repetition     int       `json:"repetition"`
	NextDue        time.Time `json:"next_due"`
	LastReviewed   time.Time `json:"last_reviewed"`
}

// InitializeState creates initial SM-2 state for a new item
func (sm2 *SM2Algorithm) InitializeState() *SM2State {
	now := time.Now()
	return &SM2State{
		EasinessFactor: 2.5, // Default easiness factor
		Interval:       0,   // Will be set on first review
		Repetition:     0,
		NextDue:        now, // Available immediately
		LastReviewed:   now,
	}
}

// UpdateState updates SM-2 state based on user response quality
// Quality scale: 0-5 where:
// 0: complete blackout
// 1: incorrect response; the correct one remembered
// 2: incorrect response; where the correct one seemed easy to recall
// 3: correct response recalled with serious difficulty
// 4: correct response after a hesitation
// 5: perfect response
func (sm2 *SM2Algorithm) UpdateState(state *SM2State, quality int) *SM2State {
	if quality < 0 || quality > 5 {
		quality = 0 // Default to worst case for invalid input
	}

	newState := &SM2State{
		EasinessFactor: state.EasinessFactor,
		Interval:       state.Interval,
		Repetition:     state.Repetition,
		LastReviewed:   time.Now(),
	}

	// Update easiness factor based on quality
	newState.EasinessFactor = state.EasinessFactor + (0.1 - float64(5-quality)*(0.08+float64(5-quality)*0.02))

	// Ensure easiness factor stays within bounds
	if newState.EasinessFactor < sm2.MinEasinessFactor {
		newState.EasinessFactor = sm2.MinEasinessFactor
	}
	if newState.EasinessFactor > sm2.MaxEasinessFactor {
		newState.EasinessFactor = sm2.MaxEasinessFactor
	}

	// If quality < 3, reset the repetition sequence
	if quality < 3 {
		newState.Repetition = 0
		newState.Interval = sm2.InitialInterval
	} else {
		// Increment repetition count
		newState.Repetition = state.Repetition + 1

		// Calculate new interval based on repetition
		switch newState.Repetition {
		case 1:
			newState.Interval = sm2.InitialInterval
		case 2:
			newState.Interval = sm2.SecondInterval
		default:
			// For repetitions > 2, multiply previous interval by easiness factor
			newState.Interval = int(math.Round(float64(state.Interval) * newState.EasinessFactor))
		}
	}

	// Calculate next due date
	newState.NextDue = newState.LastReviewed.AddDate(0, 0, newState.Interval)

	return newState
}

// GetUrgencyScore calculates urgency score based on how overdue an item is
// Returns a value between 0 and 1, where 1 means highly urgent
func (sm2 *SM2Algorithm) GetUrgencyScore(state *SM2State, currentTime time.Time) float64 {
	if currentTime.Before(state.NextDue) {
		// Item is not due yet
		return 0.0
	}

	// Calculate days overdue
	daysOverdue := currentTime.Sub(state.NextDue).Hours() / 24.0

	// Use sigmoid function to map overdue days to urgency score
	// This creates a smooth curve where urgency increases rapidly at first,
	// then levels off to prevent extremely high scores
	urgency := 1.0 / (1.0 + math.Exp(-daysOverdue/2.0))

	return math.Min(urgency, 1.0)
}

// IsDue checks if an item is due for review
func (sm2 *SM2Algorithm) IsDue(state *SM2State, currentTime time.Time) bool {
	return currentTime.After(state.NextDue) || currentTime.Equal(state.NextDue)
}

// GetDaysUntilDue returns the number of days until the item is due
// Negative values indicate overdue items
func (sm2 *SM2Algorithm) GetDaysUntilDue(state *SM2State, currentTime time.Time) float64 {
	return state.NextDue.Sub(currentTime).Hours() / 24.0
}

// ConvertToProto converts internal SM2State to protobuf SM2State
func (sm2 *SM2Algorithm) ConvertToProto(state *SM2State) *pb.SM2State {
	return &pb.SM2State{
		EasinessFactor: state.EasinessFactor,
		Interval:       int32(state.Interval),
		Repetition:     int32(state.Repetition),
		NextDue:        timestamppb.New(state.NextDue),
		LastReviewed:   timestamppb.New(state.LastReviewed),
	}
}

// ConvertFromProto converts protobuf SM2State to internal SM2State
func (sm2 *SM2Algorithm) ConvertFromProto(pbState *pb.SM2State) *SM2State {
	return &SM2State{
		EasinessFactor: pbState.EasinessFactor,
		Interval:       int(pbState.Interval),
		Repetition:     int(pbState.Repetition),
		NextDue:        pbState.NextDue.AsTime(),
		LastReviewed:   pbState.LastReviewed.AsTime(),
	}
}

// GetRetentionProbability estimates the probability of remembering an item
// based on the SM-2 model and time since last review
func (sm2 *SM2Algorithm) GetRetentionProbability(state *SM2State, currentTime time.Time) float64 {
	if state.Repetition == 0 {
		// New item, assume low retention
		return 0.3
	}

	// Calculate time since last review in days
	daysSinceReview := currentTime.Sub(state.LastReviewed).Hours() / 24.0

	// Use exponential decay model based on easiness factor
	// Higher easiness factor means slower forgetting
	decayRate := 1.0 / state.EasinessFactor
	retention := math.Exp(-decayRate * daysSinceReview / float64(state.Interval))

	// Ensure retention is between 0 and 1
	return math.Max(0.0, math.Min(1.0, retention))
}

// CalculateOptimalInterval calculates the optimal interval for maximum retention
// This is used for analytics and optimization
func (sm2 *SM2Algorithm) CalculateOptimalInterval(state *SM2State, targetRetention float64) int {
	if targetRetention <= 0 || targetRetention >= 1 {
		targetRetention = 0.85 // Default target retention
	}

	// Calculate interval that would achieve target retention
	decayRate := 1.0 / state.EasinessFactor
	optimalDays := -math.Log(targetRetention) / decayRate

	return int(math.Max(1, math.Round(optimalDays)))
}

// GetAnalytics returns analytics data for the SM-2 state
func (sm2 *SM2Algorithm) GetAnalytics(state *SM2State, currentTime time.Time) map[string]interface{} {
	return map[string]interface{}{
		"easiness_factor":       state.EasinessFactor,
		"interval_days":         state.Interval,
		"repetition_count":      state.Repetition,
		"days_until_due":        sm2.GetDaysUntilDue(state, currentTime),
		"urgency_score":         sm2.GetUrgencyScore(state, currentTime),
		"retention_probability": sm2.GetRetentionProbability(state, currentTime),
		"is_due":                sm2.IsDue(state, currentTime),
		"optimal_interval":      sm2.CalculateOptimalInterval(state, 0.85),
	}
}
