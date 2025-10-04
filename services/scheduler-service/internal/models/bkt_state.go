package models

import (
	"time"

	"gorm.io/gorm"
)

// BKTStateModel represents the Bayesian Knowledge Tracing state in the database using GORM
type BKTStateModel struct {
	UserID        string    `gorm:"primaryKey;column:user_id;type:uuid" json:"user_id"`
	Topic         string    `gorm:"primaryKey;column:topic;type:varchar(100)" json:"topic"`
	ProbKnowledge float64   `gorm:"column:prob_knowledge;type:decimal(5,4);not null;default:0.1000" json:"prob_knowledge"`
	ProbGuess     float64   `gorm:"column:prob_guess;type:decimal(5,4);not null;default:0.2500" json:"prob_guess"`
	ProbSlip      float64   `gorm:"column:prob_slip;type:decimal(5,4);not null;default:0.1000" json:"prob_slip"`
	ProbLearn     float64   `gorm:"column:prob_learn;type:decimal(5,4);not null;default:0.1500" json:"prob_learn"`
	AttemptsCount int       `gorm:"column:attempts_count;not null;default:0" json:"attempts_count"`
	CorrectCount  int       `gorm:"column:correct_count;not null;default:0" json:"correct_count"`
	Confidence    float64   `gorm:"column:confidence;type:decimal(5,4);not null;default:0.1000" json:"confidence"`
	LastUpdated   time.Time `gorm:"column:last_updated;not null;default:now()" json:"last_updated"`
	CreatedAt     time.Time `gorm:"column:created_at;not null;default:now()" json:"created_at"`
	UpdatedAt     time.Time `gorm:"column:updated_at;not null;default:now()" json:"updated_at"`
}

// TableName specifies the table name for GORM
func (BKTStateModel) TableName() string {
	return "bkt_states"
}

// BeforeCreate sets default values before creating a record
func (b *BKTStateModel) BeforeCreate(tx *gorm.DB) error {
	now := time.Now()
	if b.LastUpdated.IsZero() {
		b.LastUpdated = now
	}
	if b.ProbKnowledge == 0 {
		b.ProbKnowledge = 0.1 // Default initial knowledge probability
	}
	if b.ProbGuess == 0 {
		b.ProbGuess = 0.25 // Default guessing probability (4-option multiple choice)
	}
	if b.ProbSlip == 0 {
		b.ProbSlip = 0.1 // Default slip probability
	}
	if b.ProbLearn == 0 {
		b.ProbLearn = 0.15 // Default learning probability
	}
	if b.Confidence == 0 {
		b.Confidence = 0.1 // Low initial confidence
	}
	return nil
}

// BeforeUpdate sets updated_at and last_updated before updating a record
func (b *BKTStateModel) BeforeUpdate(tx *gorm.DB) error {
	now := time.Now()
	b.UpdatedAt = now
	b.LastUpdated = now
	return nil
}

// GetAccuracy calculates the accuracy rate for this topic
func (b *BKTStateModel) GetAccuracy() float64 {
	if b.AttemptsCount == 0 {
		return 0.0
	}
	return float64(b.CorrectCount) / float64(b.AttemptsCount)
}

// IsMastered checks if this topic is considered mastered (using default threshold of 0.85)
func (b *BKTStateModel) IsMastered() bool {
	return b.ProbKnowledge >= 0.85 && b.Confidence >= 0.7
}

// GetMasteryGap calculates how far from mastery (0 = mastered, 1 = no knowledge)
func (b *BKTStateModel) GetMasteryGap() float64 {
	if b.IsMastered() {
		return 0.0
	}

	// Weight by confidence - less confident estimates contribute more to gap
	confidenceWeight := 1.0 - b.Confidence
	gap := (1.0 - b.ProbKnowledge) * (1.0 + confidenceWeight)

	if gap > 1.0 {
		return 1.0
	}
	return gap
}

// GetPredictedCorrectness predicts probability of correct response
func (b *BKTStateModel) GetPredictedCorrectness() float64 {
	// P(correct) = P(L) * (1 - P(S)) + (1 - P(L)) * P(G)
	return b.ProbKnowledge*(1-b.ProbSlip) + (1-b.ProbKnowledge)*b.ProbGuess
}

// DaysSinceUpdate calculates days since last update
func (b *BKTStateModel) DaysSinceUpdate() float64 {
	return time.Since(b.LastUpdated).Hours() / 24.0
}
