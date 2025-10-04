package algorithms

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewSM2Algorithm(t *testing.T) {
	sm2 := NewSM2Algorithm()

	assert.Equal(t, 1.3, sm2.MinEasinessFactor)
	assert.Equal(t, 2.5, sm2.MaxEasinessFactor)
	assert.Equal(t, 1, sm2.InitialInterval)
	assert.Equal(t, 6, sm2.SecondInterval)
}

func TestInitializeState(t *testing.T) {
	sm2 := NewSM2Algorithm()
	state := sm2.InitializeState()

	assert.Equal(t, 2.5, state.EasinessFactor)
	assert.Equal(t, 0, state.Interval)
	assert.Equal(t, 0, state.Repetition)
	assert.True(t, time.Since(state.NextDue) < time.Second)
	assert.True(t, time.Since(state.LastReviewed) < time.Second)
}

func TestUpdateState_FirstReview_HighQuality(t *testing.T) {
	sm2 := NewSM2Algorithm()
	initialState := sm2.InitializeState()

	// First review with high quality (5)
	newState := sm2.UpdateState(initialState, 5)

	assert.Equal(t, 1, newState.Repetition)
	assert.Equal(t, 1, newState.Interval)          // Initial interval
	assert.True(t, newState.EasinessFactor >= 2.5) // Should increase or stay same
	assert.True(t, newState.NextDue.After(newState.LastReviewed))
}

func TestUpdateState_FirstReview_LowQuality(t *testing.T) {
	sm2 := NewSM2Algorithm()
	initialState := sm2.InitializeState()

	// First review with low quality (2)
	newState := sm2.UpdateState(initialState, 2)

	assert.Equal(t, 0, newState.Repetition)       // Reset due to low quality
	assert.Equal(t, 1, newState.Interval)         // Reset to initial interval
	assert.True(t, newState.EasinessFactor < 2.5) // Should decrease
}

func TestUpdateState_SecondReview(t *testing.T) {
	sm2 := NewSM2Algorithm()

	// First review
	state1 := sm2.InitializeState()
	state2 := sm2.UpdateState(state1, 4)

	// Second review with good quality
	state3 := sm2.UpdateState(state2, 4)

	assert.Equal(t, 2, state3.Repetition)
	assert.Equal(t, 6, state3.Interval) // Second interval
}

func TestUpdateState_ThirdReview(t *testing.T) {
	sm2 := NewSM2Algorithm()

	// Simulate progression through first two reviews
	state := sm2.InitializeState()
	state = sm2.UpdateState(state, 4) // First review
	state = sm2.UpdateState(state, 4) // Second review

	// Third review
	previousInterval := state.Interval
	previousEF := state.EasinessFactor
	state = sm2.UpdateState(state, 4)

	assert.Equal(t, 3, state.Repetition)
	// Interval should be previous interval * easiness factor
	expectedInterval := int(float64(previousInterval) * previousEF)
	assert.Equal(t, expectedInterval, state.Interval)
}

func TestUpdateState_QualityBounds(t *testing.T) {
	sm2 := NewSM2Algorithm()
	state := sm2.InitializeState()

	// Test invalid quality values
	newState := sm2.UpdateState(state, -1)  // Below minimum
	assert.Equal(t, 0, newState.Repetition) // Should be treated as quality 0

	newState = sm2.UpdateState(state, 10)   // Above maximum
	assert.Equal(t, 0, newState.Repetition) // Should be treated as quality 0
}

func TestUpdateState_EasinessFactorBounds(t *testing.T) {
	sm2 := NewSM2Algorithm()
	state := sm2.InitializeState()

	// Force easiness factor to minimum by repeated low quality
	for i := 0; i < 10; i++ {
		state = sm2.UpdateState(state, 0)
	}
	assert.Equal(t, sm2.MinEasinessFactor, state.EasinessFactor)

	// Test that it doesn't go below minimum
	state = sm2.UpdateState(state, 0)
	assert.Equal(t, sm2.MinEasinessFactor, state.EasinessFactor)
}

func TestGetUrgencyScore(t *testing.T) {
	sm2 := NewSM2Algorithm()
	now := time.Now()

	// Test item not due yet
	state := &SM2State{
		NextDue: now.Add(24 * time.Hour), // Due tomorrow
	}
	urgency := sm2.GetUrgencyScore(state, now)
	assert.Equal(t, 0.0, urgency)

	// Test item due now
	state.NextDue = now
	urgency = sm2.GetUrgencyScore(state, now)
	assert.True(t, urgency > 0.0 && urgency <= 1.0)

	// Test overdue item
	state.NextDue = now.Add(-24 * time.Hour) // Due yesterday
	urgency = sm2.GetUrgencyScore(state, now)
	assert.True(t, urgency > 0.5) // Should have high urgency
}

func TestIsDue(t *testing.T) {
	sm2 := NewSM2Algorithm()
	now := time.Now()

	// Test item not due yet
	state := &SM2State{
		NextDue: now.Add(time.Hour),
	}
	assert.False(t, sm2.IsDue(state, now))

	// Test item due now
	state.NextDue = now
	assert.True(t, sm2.IsDue(state, now))

	// Test overdue item
	state.NextDue = now.Add(-time.Hour)
	assert.True(t, sm2.IsDue(state, now))
}

func TestGetDaysUntilDue(t *testing.T) {
	sm2 := NewSM2Algorithm()
	now := time.Now()

	// Test item due in 2 days
	state := &SM2State{
		NextDue: now.Add(48 * time.Hour),
	}
	days := sm2.GetDaysUntilDue(state, now)
	assert.InDelta(t, 2.0, days, 0.1)

	// Test overdue item (1 day overdue)
	state.NextDue = now.Add(-24 * time.Hour)
	days = sm2.GetDaysUntilDue(state, now)
	assert.InDelta(t, -1.0, days, 0.1)
}

func TestGetRetentionProbability(t *testing.T) {
	sm2 := NewSM2Algorithm()
	now := time.Now()

	// Test new item (repetition = 0)
	state := &SM2State{
		Repetition:   0,
		LastReviewed: now,
	}
	retention := sm2.GetRetentionProbability(state, now)
	assert.Equal(t, 0.3, retention) // Should return default for new items

	// Test reviewed item
	state = &SM2State{
		EasinessFactor: 2.5,
		Interval:       6,
		Repetition:     2,
		LastReviewed:   now.Add(-3 * 24 * time.Hour), // 3 days ago
	}
	retention = sm2.GetRetentionProbability(state, now)
	assert.True(t, retention > 0.0 && retention <= 1.0)
	assert.True(t, retention > 0.5) // Should have good retention after 3 days with 6-day interval
}

func TestCalculateOptimalInterval(t *testing.T) {
	sm2 := NewSM2Algorithm()

	state := &SM2State{
		EasinessFactor: 2.5,
		Interval:       6,
		Repetition:     2,
	}

	// Test with default target retention (0.85)
	optimal := sm2.CalculateOptimalInterval(state, 0.85)
	assert.True(t, optimal > 0)

	// Test with custom target retention
	optimal = sm2.CalculateOptimalInterval(state, 0.9)
	assert.True(t, optimal > 0)

	// Test with invalid target retention
	optimal = sm2.CalculateOptimalInterval(state, 0.0)
	assert.True(t, optimal > 0) // Should use default
}

func TestConvertToProto(t *testing.T) {
	sm2 := NewSM2Algorithm()
	now := time.Now()

	state := &SM2State{
		EasinessFactor: 2.5,
		Interval:       6,
		Repetition:     2,
		NextDue:        now.Add(24 * time.Hour),
		LastReviewed:   now,
	}

	pbState := sm2.ConvertToProto(state)

	assert.Equal(t, state.EasinessFactor, pbState.EasinessFactor)
	assert.Equal(t, int32(state.Interval), pbState.Interval)
	assert.Equal(t, int32(state.Repetition), pbState.Repetition)
	assert.True(t, pbState.NextDue.AsTime().Equal(state.NextDue))
	assert.True(t, pbState.LastReviewed.AsTime().Equal(state.LastReviewed))
}

func TestConvertFromProto(t *testing.T) {
	sm2 := NewSM2Algorithm()
	now := time.Now()

	// First convert to proto
	originalState := &SM2State{
		EasinessFactor: 2.5,
		Interval:       6,
		Repetition:     2,
		NextDue:        now.Add(24 * time.Hour),
		LastReviewed:   now,
	}

	pbState := sm2.ConvertToProto(originalState)

	// Then convert back
	convertedState := sm2.ConvertFromProto(pbState)

	assert.Equal(t, originalState.EasinessFactor, convertedState.EasinessFactor)
	assert.Equal(t, originalState.Interval, convertedState.Interval)
	assert.Equal(t, originalState.Repetition, convertedState.Repetition)
	assert.True(t, originalState.NextDue.Equal(convertedState.NextDue))
	assert.True(t, originalState.LastReviewed.Equal(convertedState.LastReviewed))
}

func TestGetAnalytics(t *testing.T) {
	sm2 := NewSM2Algorithm()
	now := time.Now()

	state := &SM2State{
		EasinessFactor: 2.5,
		Interval:       6,
		Repetition:     2,
		NextDue:        now.Add(-24 * time.Hour),     // Overdue by 1 day
		LastReviewed:   now.Add(-3 * 24 * time.Hour), // Reviewed 3 days ago
	}

	analytics := sm2.GetAnalytics(state, now)

	// Check that all expected fields are present
	require.Contains(t, analytics, "easiness_factor")
	require.Contains(t, analytics, "interval_days")
	require.Contains(t, analytics, "repetition_count")
	require.Contains(t, analytics, "days_until_due")
	require.Contains(t, analytics, "urgency_score")
	require.Contains(t, analytics, "retention_probability")
	require.Contains(t, analytics, "is_due")
	require.Contains(t, analytics, "optimal_interval")

	// Check some values
	assert.Equal(t, 2.5, analytics["easiness_factor"])
	assert.Equal(t, 6, analytics["interval_days"])
	assert.Equal(t, 2, analytics["repetition_count"])
	assert.True(t, analytics["is_due"].(bool))
	assert.True(t, analytics["urgency_score"].(float64) > 0)
}

// Benchmark tests
func BenchmarkUpdateState(b *testing.B) {
	sm2 := NewSM2Algorithm()
	state := sm2.InitializeState()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		state = sm2.UpdateState(state, 4)
	}
}

func BenchmarkGetUrgencyScore(b *testing.B) {
	sm2 := NewSM2Algorithm()
	now := time.Now()
	state := &SM2State{
		NextDue: now.Add(-24 * time.Hour),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sm2.GetUrgencyScore(state, now)
	}
}

func BenchmarkGetRetentionProbability(b *testing.B) {
	sm2 := NewSM2Algorithm()
	now := time.Now()
	state := &SM2State{
		EasinessFactor: 2.5,
		Interval:       6,
		Repetition:     2,
		LastReviewed:   now.Add(-3 * 24 * time.Hour),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sm2.GetRetentionProbability(state, now)
	}
}
