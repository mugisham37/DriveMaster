package server

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"scheduler-service/internal/algorithms"
)

func TestSM2AlgorithmIntegration(t *testing.T) {
	sm2Algorithm := algorithms.NewSM2Algorithm()

	t.Run("InitializeAndUpdate", func(t *testing.T) {
		// Test SM-2 algorithm initialization
		initialState := sm2Algorithm.InitializeState()

		assert.Equal(t, 2.5, initialState.EasinessFactor)
		assert.Equal(t, 0, initialState.Interval)
		assert.Equal(t, 0, initialState.Repetition)
		assert.True(t, time.Since(initialState.NextDue) < time.Second)

		// Test first update with high quality
		updatedState := sm2Algorithm.UpdateState(initialState, 5)

		assert.Equal(t, 1, updatedState.Repetition)
		assert.Equal(t, 1, updatedState.Interval)
		assert.True(t, updatedState.EasinessFactor >= 2.5)
		assert.True(t, updatedState.NextDue.After(updatedState.LastReviewed))
	})

	t.Run("UrgencyScoring", func(t *testing.T) {
		currentTime := time.Now()

		// Test non-urgent item (due in future)
		futureState := &algorithms.SM2State{
			NextDue: currentTime.Add(24 * time.Hour), // Due tomorrow
		}
		urgency := sm2Algorithm.GetUrgencyScore(futureState, currentTime)
		assert.Equal(t, 0.0, urgency) // Should not be urgent since due in future

		// Test overdue item
		overdueState := &algorithms.SM2State{
			NextDue: currentTime.Add(-24 * time.Hour), // 1 day overdue
		}
		urgency = sm2Algorithm.GetUrgencyScore(overdueState, currentTime)
		assert.True(t, urgency > 0.0)
	})

	t.Run("ProtobufConversion", func(t *testing.T) {
		// Test protobuf conversion
		originalState := sm2Algorithm.InitializeState()
		originalState.EasinessFactor = 2.3
		originalState.Interval = 5
		originalState.Repetition = 2

		// Convert to protobuf
		pbState := sm2Algorithm.ConvertToProto(originalState)

		assert.Equal(t, originalState.EasinessFactor, pbState.EasinessFactor)
		assert.Equal(t, int32(originalState.Interval), pbState.Interval)
		assert.Equal(t, int32(originalState.Repetition), pbState.Repetition)

		// Convert back from protobuf
		convertedState := sm2Algorithm.ConvertFromProto(pbState)

		assert.Equal(t, originalState.EasinessFactor, convertedState.EasinessFactor)
		assert.Equal(t, originalState.Interval, convertedState.Interval)
		assert.Equal(t, originalState.Repetition, convertedState.Repetition)
	})
}
