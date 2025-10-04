package algorithms

import (
	"context"
	"testing"
	"time"

	"scheduler-service/internal/config"
	"scheduler-service/internal/logger"
)

func TestPlacementTestAlgorithm_InitializePlacementTest(t *testing.T) {
	// Create test dependencies
	irtAlgorithm := NewIRTAlgorithm()
	logConfig := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(logConfig)

	// Create placement algorithm
	placementAlgorithm := NewPlacementTestAlgorithm(irtAlgorithm, log)

	// Test initialization
	ctx := context.Background()
	userID := "test_user_123"
	sessionID := "placement_session_456"
	countryCode := "US"

	state, err := placementAlgorithm.InitializePlacementTest(ctx, userID, sessionID, countryCode)

	// Verify results
	if err != nil {
		t.Fatalf("Failed to initialize placement test: %v", err)
	}

	if state.UserID != userID {
		t.Errorf("Expected UserID %s, got %s", userID, state.UserID)
	}

	if state.SessionID != sessionID {
		t.Errorf("Expected SessionID %s, got %s", sessionID, state.SessionID)
	}

	if state.CountryCode != countryCode {
		t.Errorf("Expected CountryCode %s, got %s", countryCode, state.CountryCode)
	}

	if state.OverallAbility != irtAlgorithm.PriorMean {
		t.Errorf("Expected initial ability %f, got %f", irtAlgorithm.PriorMean, state.OverallAbility)
	}

	if len(state.TopicAbilities) == 0 {
		t.Error("Expected topic abilities to be initialized")
	}

	if state.IsComplete {
		t.Error("Expected placement test to not be complete initially")
	}
}

func TestPlacementTestAlgorithm_SelectNextItem(t *testing.T) {
	// Create test dependencies
	irtAlgorithm := NewIRTAlgorithm()
	logConfig := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(logConfig)

	// Create placement algorithm
	placementAlgorithm := NewPlacementTestAlgorithm(irtAlgorithm, log)

	// Initialize placement test
	ctx := context.Background()
	state, err := placementAlgorithm.InitializePlacementTest(ctx, "test_user", "test_session", "US")
	if err != nil {
		t.Fatalf("Failed to initialize placement test: %v", err)
	}

	// Create test items
	availableItems := []PlacementItem{
		{
			ItemID:         "item_1",
			Topics:         []string{"traffic_signs"},
			Difficulty:     -1.0,
			Discrimination: 1.2,
			Guessing:       0.25,
			EstimatedTime:  60,
			ExposureCount:  0,
			ContentArea:    "traffic_signs",
		},
		{
			ItemID:         "item_2",
			Topics:         []string{"road_rules"},
			Difficulty:     0.0,
			Discrimination: 1.5,
			Guessing:       0.25,
			EstimatedTime:  60,
			ExposureCount:  0,
			ContentArea:    "road_rules",
		},
		{
			ItemID:         "item_3",
			Topics:         []string{"vehicle_operation"},
			Difficulty:     1.0,
			Discrimination: 1.3,
			Guessing:       0.25,
			EstimatedTime:  60,
			ExposureCount:  0,
			ContentArea:    "vehicle_operation",
		},
	}

	// Select next item
	selectedItem, err := placementAlgorithm.SelectNextItem(ctx, state, availableItems)

	// Verify results
	if err != nil {
		t.Fatalf("Failed to select next item: %v", err)
	}

	if selectedItem == nil {
		t.Fatal("Expected selected item to not be nil")
	}

	// Verify the selected item is one of the available items
	found := false
	for _, item := range availableItems {
		if item.ItemID == selectedItem.ItemID {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("Selected item %s not found in available items", selectedItem.ItemID)
	}
}

func TestPlacementTestAlgorithm_ProcessResponse(t *testing.T) {
	// Create test dependencies
	irtAlgorithm := NewIRTAlgorithm()
	logConfig := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(logConfig)

	// Create placement algorithm
	placementAlgorithm := NewPlacementTestAlgorithm(irtAlgorithm, log)

	// Initialize placement test
	ctx := context.Background()
	state, err := placementAlgorithm.InitializePlacementTest(ctx, "test_user", "test_session", "US")
	if err != nil {
		t.Fatalf("Failed to initialize placement test: %v", err)
	}

	// Add a test item
	testItem := PlacementItem{
		ItemID:         "test_item_1",
		Topics:         []string{"traffic_signs"},
		Difficulty:     0.0,
		Discrimination: 1.2,
		Guessing:       0.25,
		EstimatedTime:  60,
		ExposureCount:  0,
		ContentArea:    "traffic_signs",
	}

	placementAlgorithm.AddItemToTest(state, &testItem)

	// Store initial ability
	initialAbility := state.OverallAbility
	initialSE := state.OverallSE

	// Process a correct response
	err = placementAlgorithm.ProcessResponse(ctx, state, testItem.ItemID, true, 5000, 4)

	// Verify results
	if err != nil {
		t.Fatalf("Failed to process response: %v", err)
	}

	if len(state.Responses) != 1 {
		t.Errorf("Expected 1 response, got %d", len(state.Responses))
	}

	response := state.Responses[0]
	if response.ItemID != testItem.ItemID {
		t.Errorf("Expected response item ID %s, got %s", testItem.ItemID, response.ItemID)
	}

	if !response.Correct {
		t.Error("Expected response to be correct")
	}

	if response.ResponseTime != 5000 {
		t.Errorf("Expected response time 5000, got %d", response.ResponseTime)
	}

	if response.Confidence != 4 {
		t.Errorf("Expected confidence 4, got %d", response.Confidence)
	}

	// Verify ability was updated (should increase for correct response)
	if state.OverallAbility <= initialAbility {
		t.Errorf("Expected ability to increase from %f, got %f", initialAbility, state.OverallAbility)
	}

	// Verify standard error was reduced
	if state.OverallSE >= initialSE {
		t.Errorf("Expected SE to decrease from %f, got %f", initialSE, state.OverallSE)
	}

	// Verify current item index was incremented
	if state.CurrentItemIndex != 1 {
		t.Errorf("Expected current item index 1, got %d", state.CurrentItemIndex)
	}
}

func TestPlacementTestAlgorithm_CheckStoppingCriteria(t *testing.T) {
	// Create test dependencies
	irtAlgorithm := NewIRTAlgorithm()
	logConfig := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(logConfig)

	// Create placement algorithm
	placementAlgorithm := NewPlacementTestAlgorithm(irtAlgorithm, log)

	// Initialize placement test
	ctx := context.Background()
	state, err := placementAlgorithm.InitializePlacementTest(ctx, "test_user", "test_session", "US")
	if err != nil {
		t.Fatalf("Failed to initialize placement test: %v", err)
	}

	// Test with no responses (should not stop)
	shouldStop, reason := placementAlgorithm.CheckStoppingCriteria(ctx, state)
	if shouldStop {
		t.Errorf("Expected not to stop with no responses, but got reason: %s", reason)
	}

	// Add minimum number of responses with varying ability estimates
	for i := 0; i < placementAlgorithm.MinItems; i++ {
		state.Responses = append(state.Responses, PlacementResponse{
			ItemID:        "item_" + string(rune(i)),
			Correct:       i%2 == 0, // Alternate correct/incorrect
			ResponseTime:  5000,
			Confidence:    3,
			Timestamp:     time.Now(),
			AbilityBefore: 0.0,
			AbilityAfter:  0.0,
			SEBefore:      1.0,
			SEAfter:       0.8,
		})
		state.SEHistory = append(state.SEHistory, 0.8-float64(i)*0.05)
		// Make ability estimates vary more to avoid stability detection
		abilityVariation := float64(i%3) * 0.3 // More variation
		state.AbilityHistory = append(state.AbilityHistory, float64(i)*0.1+abilityVariation)
	}

	// Test with minimum items but high SE (should not stop)
	state.OverallSE = 0.5 // Higher than target
	shouldStop, reason = placementAlgorithm.CheckStoppingCriteria(ctx, state)
	if shouldStop {
		t.Errorf("Expected not to stop with high SE, but got reason: %s", reason)
	}

	// Test with target SE achieved (should stop)
	state.OverallSE = 0.2 // Lower than target (0.3)
	shouldStop, reason = placementAlgorithm.CheckStoppingCriteria(ctx, state)
	if !shouldStop {
		t.Error("Expected to stop when target SE is achieved")
	}
	if reason != "target_precision_achieved" {
		t.Errorf("Expected stopping reason 'target_precision_achieved', got '%s'", reason)
	}
}

func TestPlacementTestAlgorithm_FinalizePlacementTest(t *testing.T) {
	// Create test dependencies
	irtAlgorithm := NewIRTAlgorithm()
	logConfig := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(logConfig)

	// Create placement algorithm
	placementAlgorithm := NewPlacementTestAlgorithm(irtAlgorithm, log)

	// Initialize placement test
	ctx := context.Background()
	state, err := placementAlgorithm.InitializePlacementTest(ctx, "test_user", "test_session", "US")
	if err != nil {
		t.Fatalf("Failed to initialize placement test: %v", err)
	}

	// Add some test responses
	state.Responses = []PlacementResponse{
		{ItemID: "item_1", Correct: true, ResponseTime: 4000, Confidence: 4, Timestamp: time.Now()},
		{ItemID: "item_2", Correct: false, ResponseTime: 6000, Confidence: 2, Timestamp: time.Now()},
		{ItemID: "item_3", Correct: true, ResponseTime: 5000, Confidence: 3, Timestamp: time.Now()},
	}

	// Set final ability and SE
	state.OverallAbility = 0.5
	state.OverallSE = 0.25
	state.OverallConfidence = 0.8

	// Finalize placement test
	result, err := placementAlgorithm.FinalizePlacementTest(ctx, state, "target_precision_achieved")

	// Verify results
	if err != nil {
		t.Fatalf("Failed to finalize placement test: %v", err)
	}

	if result.UserID != state.UserID {
		t.Errorf("Expected UserID %s, got %s", state.UserID, result.UserID)
	}

	if result.SessionID != state.SessionID {
		t.Errorf("Expected SessionID %s, got %s", state.SessionID, result.SessionID)
	}

	if result.OverallAbility != state.OverallAbility {
		t.Errorf("Expected overall ability %f, got %f", state.OverallAbility, result.OverallAbility)
	}

	if result.ItemsAdministered != len(state.Responses) {
		t.Errorf("Expected %d items administered, got %d", len(state.Responses), result.ItemsAdministered)
	}

	if result.CorrectResponses != 2 {
		t.Errorf("Expected 2 correct responses, got %d", result.CorrectResponses)
	}

	if result.StoppingReason != "target_precision_achieved" {
		t.Errorf("Expected stopping reason 'target_precision_achieved', got '%s'", result.StoppingReason)
	}

	if result.RecommendedLevel == "" {
		t.Error("Expected recommended level to be set")
	}

	// Verify state is marked as complete
	if !state.IsComplete {
		t.Error("Expected placement test to be marked as complete")
	}
}

func TestPlacementTestAlgorithm_ItemScoring(t *testing.T) {
	// Create test dependencies
	irtAlgorithm := NewIRTAlgorithm()
	logConfig := &config.LoggingConfig{Level: "debug", Format: "text"}
	log := logger.New(logConfig)

	// Create placement algorithm
	placementAlgorithm := NewPlacementTestAlgorithm(irtAlgorithm, log)

	// Initialize placement test
	ctx := context.Background()
	state, err := placementAlgorithm.InitializePlacementTest(ctx, "test_user", "test_session", "US")
	if err != nil {
		t.Fatalf("Failed to initialize placement test: %v", err)
	}

	// Create test items with different characteristics
	easyItem := &PlacementItem{
		ItemID:         "easy_item",
		Topics:         []string{"traffic_signs"},
		Difficulty:     -1.0, // Easy
		Discrimination: 1.2,
		Guessing:       0.25,
		EstimatedTime:  45,
		ExposureCount:  0,
		ContentArea:    "traffic_signs",
	}

	hardItem := &PlacementItem{
		ItemID:         "hard_item",
		Topics:         []string{"traffic_signs"},
		Difficulty:     2.0, // Hard
		Discrimination: 1.2,
		Guessing:       0.25,
		EstimatedTime:  90,
		ExposureCount:  0,
		ContentArea:    "traffic_signs",
	}

	appropriateItem := &PlacementItem{
		ItemID:         "appropriate_item",
		Topics:         []string{"traffic_signs"},
		Difficulty:     0.0, // Near user's initial ability
		Discrimination: 1.5, // High discrimination
		Guessing:       0.25,
		EstimatedTime:  60,
		ExposureCount:  0,
		ContentArea:    "traffic_signs",
	}

	// Calculate scores
	easyScore := placementAlgorithm.calculateItemScore(state, easyItem)
	hardScore := placementAlgorithm.calculateItemScore(state, hardItem)
	appropriateScore := placementAlgorithm.calculateItemScore(state, appropriateItem)

	// Verify that the appropriate item has the highest score
	if appropriateScore <= easyScore {
		t.Errorf("Expected appropriate item score (%f) > easy item score (%f)", appropriateScore, easyScore)
	}

	if appropriateScore <= hardScore {
		t.Errorf("Expected appropriate item score (%f) > hard item score (%f)", appropriateScore, hardScore)
	}

	// All scores should be positive
	if easyScore <= 0 || hardScore <= 0 || appropriateScore <= 0 {
		t.Errorf("All scores should be positive: easy=%f, hard=%f, appropriate=%f", easyScore, hardScore, appropriateScore)
	}
}
