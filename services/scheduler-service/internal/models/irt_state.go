package models

import (
	"math"
	"time"

	"gorm.io/gorm"
)

// IRTStateModel represents the IRT ability state in the database using GORM
type IRTStateModel struct {
	UserID        string    `gorm:"primaryKey;column:user_id;type:uuid" json:"user_id"`
	Topic         string    `gorm:"primaryKey;column:topic;type:varchar(100)" json:"topic"`
	Theta         float64   `gorm:"column:theta;type:decimal(8,4);not null;default:0.0000" json:"theta"`
	ThetaVariance float64   `gorm:"column:theta_variance;type:decimal(8,4);not null;default:1.0000" json:"theta_variance"`
	Confidence    float64   `gorm:"column:confidence;type:decimal(5,4);not null;default:0.1000" json:"confidence"`
	AttemptsCount int       `gorm:"column:attempts_count;not null;default:0" json:"attempts_count"`
	CorrectCount  int       `gorm:"column:correct_count;not null;default:0" json:"correct_count"`
	LastUpdated   time.Time `gorm:"column:last_updated;not null;default:now()" json:"last_updated"`
	CreatedAt     time.Time `gorm:"column:created_at;not null;default:now()" json:"created_at"`
	UpdatedAt     time.Time `gorm:"column:updated_at;not null;default:now()" json:"updated_at"`
}

// TableName specifies the table name for GORM
func (IRTStateModel) TableName() string {
	return "irt_states"
}

// BeforeCreate sets default values before creating a record
func (i *IRTStateModel) BeforeCreate(tx *gorm.DB) error {
	now := time.Now()
	if i.LastUpdated.IsZero() {
		i.LastUpdated = now
	}
	if i.Theta == 0 && i.ThetaVariance == 0 {
		i.Theta = 0.0         // Standard normal prior mean
		i.ThetaVariance = 1.0 // Standard normal prior variance
	}
	if i.Confidence == 0 {
		i.Confidence = 0.1 // Low initial confidence
	}
	return nil
}

// BeforeUpdate sets updated_at and last_updated before updating a record
func (i *IRTStateModel) BeforeUpdate(tx *gorm.DB) error {
	now := time.Now()
	i.UpdatedAt = now
	i.LastUpdated = now
	return nil
}

// GetAccuracy calculates the accuracy rate for this topic
func (i *IRTStateModel) GetAccuracy() float64 {
	if i.AttemptsCount == 0 {
		return 0.0
	}
	return float64(i.CorrectCount) / float64(i.AttemptsCount)
}

// GetStandardError calculates the standard error of the ability estimate
func (i *IRTStateModel) GetStandardError() float64 {
	return math.Sqrt(i.ThetaVariance)
}

// GetConfidenceInterval calculates 95% confidence interval for ability
func (i *IRTStateModel) GetConfidenceInterval() (float64, float64) {
	standardError := i.GetStandardError()
	margin := 1.96 * standardError // 95% confidence interval
	return i.Theta - margin, i.Theta + margin
}

// GetAbilityPercentile estimates percentile rank assuming standard normal distribution
func (i *IRTStateModel) GetAbilityPercentile() float64 {
	// Approximate cumulative distribution function of standard normal
	return 0.5 * (1.0 + math.Erf(i.Theta/math.Sqrt(2.0)))
}

// DaysSinceUpdate calculates days since last update
func (i *IRTStateModel) DaysSinceUpdate() float64 {
	return time.Since(i.LastUpdated).Hours() / 24.0
}

// IsHighConfidence checks if the ability estimate has high confidence
func (i *IRTStateModel) IsHighConfidence() bool {
	return i.Confidence >= 0.8 && i.AttemptsCount >= 10
}

// GetAbilityLevel returns a human-readable ability level
func (i *IRTStateModel) GetAbilityLevel() string {
	percentile := i.GetAbilityPercentile()

	switch {
	case percentile >= 0.95:
		return "expert"
	case percentile >= 0.85:
		return "advanced"
	case percentile >= 0.65:
		return "proficient"
	case percentile >= 0.35:
		return "developing"
	case percentile >= 0.15:
		return "beginner"
	default:
		return "novice"
	}
}
