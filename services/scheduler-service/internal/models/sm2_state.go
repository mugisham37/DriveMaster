package models

import (
	"time"

	"gorm.io/gorm"
)

// SM2StateModel represents the SM-2 state in the database using GORM
type SM2StateModel struct {
	UserID         string    `gorm:"primaryKey;column:user_id;type:uuid" json:"user_id"`
	ItemID         string    `gorm:"primaryKey;column:item_id;type:uuid" json:"item_id"`
	EasinessFactor float64   `gorm:"column:easiness_factor;type:decimal(4,2);not null;default:2.50" json:"easiness_factor"`
	IntervalDays   int       `gorm:"column:interval_days;not null;default:0" json:"interval_days"`
	Repetition     int       `gorm:"column:repetition;not null;default:0" json:"repetition"`
	NextDue        time.Time `gorm:"column:next_due;not null" json:"next_due"`
	LastReviewed   time.Time `gorm:"column:last_reviewed;not null" json:"last_reviewed"`
	CreatedAt      time.Time `gorm:"column:created_at;not null;default:now()" json:"created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at;not null;default:now()" json:"updated_at"`
}

// TableName specifies the table name for GORM
func (SM2StateModel) TableName() string {
	return "sm2_states"
}

// BeforeCreate sets default values before creating a record
func (s *SM2StateModel) BeforeCreate(tx *gorm.DB) error {
	now := time.Now()
	if s.NextDue.IsZero() {
		s.NextDue = now
	}
	if s.LastReviewed.IsZero() {
		s.LastReviewed = now
	}
	if s.EasinessFactor == 0 {
		s.EasinessFactor = 2.5
	}
	return nil
}

// BeforeUpdate sets updated_at before updating a record
func (s *SM2StateModel) BeforeUpdate(tx *gorm.DB) error {
	s.UpdatedAt = time.Now()
	return nil
}
