package onboarding

import (
	"testing"

	"scheduler-service/internal/algorithms"
)

func TestDeterminePriority(t *testing.T) {
	service := &OnboardingService{}

	preferences := UserPreferences{
		FocusAreas: []string{"traffic_signs"},
	}

	tests := []struct {
		topic      string
		ability    float64
		confidence float64
		expected   string
	}{
		{"traffic_signs", -1.0, 0.5, "high"},      // In focus areas
		{"road_rules", -0.6, 0.5, "high"},         // Low ability
		{"vehicle_operation", 0.0, 0.7, "medium"}, // Medium ability
		{"safety_procedures", 1.0, 0.9, "low"},    // High ability and confidence
	}

	for _, test := range tests {
		result := service.determinePriority(test.topic, test.ability, test.confidence, preferences)
		if result != test.expected {
			t.Errorf("For topic %s (ability=%.1f, confidence=%.1f): expected priority %s, got %s",
				test.topic, test.ability, test.confidence, test.expected, result)
		}
	}
}

func TestEstimateTopicTime(t *testing.T) {
	service := &OnboardingService{}

	tests := []struct {
		ability      float64
		confidence   float64
		dailyMinutes int
		minExpected  int
		maxExpected  int
	}{
		{-1.5, 0.4, 30, 15, 25}, // Very low ability and confidence
		{0.0, 0.7, 30, 5, 15},   // Medium ability, good confidence
		{1.0, 0.9, 30, 1, 5},    // High ability and confidence
	}

	for _, test := range tests {
		result := service.estimateTopicTime(test.ability, test.confidence, test.dailyMinutes)
		if result < test.minExpected || result > test.maxExpected {
			t.Errorf("For ability=%.1f, confidence=%.1f: expected time between %d-%d hours, got %d",
				test.ability, test.confidence, test.minExpected, test.maxExpected, result)
		}
	}
}

func TestEstimateLearningDuration(t *testing.T) {
	service := &OnboardingService{}

	preferences := UserPreferences{
		StudyGoal:     "pass_test",
		AvailableTime: 30,
	}

	results := &algorithms.PlacementResult{
		RecommendedLevel: "beginner",
	}

	duration := service.estimateLearningDuration(results, preferences)
	if duration <= 0 {
		t.Error("Expected positive learning duration")
	}
	if duration > 180 {
		t.Error("Expected learning duration to be reasonable (< 180 days)")
	}

	t.Logf("Estimated learning duration: %d days", duration)
}

func TestGenerateRecommendationReason(t *testing.T) {
	service := &OnboardingService{}

	tests := []struct {
		topic      string
		ability    float64
		confidence float64
		level      string
		expected   string
	}{
		{"traffic_signs", -1.5, 0.5, "beginner", "Significant improvement needed"},
		{"road_rules", 0.5, 0.8, "intermediate", "Good foundation"},
		{"vehicle_operation", 1.2, 0.9, "advanced", "Excellent mastery"},
	}

	for _, test := range tests {
		result := service.generateRecommendationReason(test.topic, test.ability, test.confidence, test.level)
		if len(result) == 0 {
			t.Errorf("Expected non-empty recommendation reason for topic %s", test.topic)
		}
		// Just log the result for verification
		t.Logf("Recommendation for %s (ability=%.1f): %s", test.topic, test.ability, result)
	}
}

func TestPriorityToInt(t *testing.T) {
	service := &OnboardingService{}

	tests := []struct {
		priority string
		expected int
	}{
		{"high", 3},
		{"medium", 2},
		{"low", 1},
		{"unknown", 0},
	}

	for _, test := range tests {
		result := service.priorityToInt(test.priority)
		if result != test.expected {
			t.Errorf("For priority %s: expected %d, got %d", test.priority, test.expected, result)
		}
	}
}

func TestAbilityToBKTProbability(t *testing.T) {
	service := &OnboardingService{}

	tests := []struct {
		ability     float64
		confidence  float64
		minExpected float64
		maxExpected float64
	}{
		{-2.0, 0.5, 0.1, 0.4}, // Very low ability
		{0.0, 0.8, 0.4, 0.6},  // Neutral ability, high confidence
		{2.0, 0.9, 0.7, 0.9},  // High ability and confidence
	}

	for _, test := range tests {
		result := service.abilityToBKTProbability(test.ability, test.confidence)
		if result < test.minExpected || result > test.maxExpected {
			t.Errorf("For ability=%.1f, confidence=%.1f: expected probability between %.1f-%.1f, got %.3f",
				test.ability, test.confidence, test.minExpected, test.maxExpected, result)
		}

		// Ensure bounds are respected
		if result < 0.1 || result > 0.9 {
			t.Errorf("Probability %.3f is outside expected bounds [0.1, 0.9]", result)
		}
	}
}

func TestGenerateStudyPlan(t *testing.T) {
	service := &OnboardingService{}

	preferences := UserPreferences{
		StudyGoal:     "pass_test",
		AvailableTime: 45,
		WeeklySchedule: map[string]bool{
			"monday": true, "tuesday": true, "wednesday": true,
			"thursday": true, "friday": true, "saturday": false, "sunday": false,
		},
	}

	studyPlan := service.generateStudyPlan(preferences)

	if studyPlan.DailyMinutes != 45 {
		t.Errorf("Expected DailyMinutes 45, got %d", studyPlan.DailyMinutes)
	}

	if len(studyPlan.SessionTypes) == 0 {
		t.Error("Expected session types to be generated")
	}

	if studyPlan.ReviewFrequency <= 0 {
		t.Error("Expected positive review frequency")
	}

	if studyPlan.TestFrequency <= 0 {
		t.Error("Expected positive test frequency")
	}

	// Check that active days have minutes assigned
	activeDays := 0
	for day, minutes := range studyPlan.WeeklySchedule {
		if preferences.WeeklySchedule[day] && minutes > 0 {
			activeDays++
		}
	}

	if activeDays == 0 {
		t.Error("Expected at least one active day with minutes assigned")
	}

	t.Logf("Generated study plan: %d daily minutes, %d active days, %v session types",
		studyPlan.DailyMinutes, activeDays, studyPlan.SessionTypes)
}
