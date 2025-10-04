package server

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	"scheduler-service/internal/algorithms"
	"scheduler-service/internal/cache"
	"scheduler-service/internal/config"
	"scheduler-service/internal/database"
	"scheduler-service/internal/logger"
	"scheduler-service/internal/metrics"
	"scheduler-service/internal/state"
	pb "scheduler-service/proto"
)

// SchedulerService implements the gRPC SchedulerService interface
type SchedulerService struct {
	pb.UnimplementedSchedulerServiceServer

	config         *config.Config
	logger         *logger.Logger
	metrics        *metrics.Metrics
	db             *database.DB
	cache          *cache.RedisClient
	sm2Algorithm   *algorithms.SM2Algorithm
	sm2Manager     *state.SM2StateManager
	bktAlgorithm   *algorithms.BKTAlgorithm
	bktManager     *state.BKTStateManager
	irtAlgorithm   *algorithms.IRTAlgorithm
	irtManager     *state.IRTManager
	unifiedScoring *algorithms.UnifiedScoringAlgorithm
}

// NewSchedulerService creates a new scheduler service instance
func NewSchedulerService(
	cfg *config.Config,
	log *logger.Logger,
	metrics *metrics.Metrics,
	db *database.DB,
	cache *cache.RedisClient,
) *SchedulerService {
	// Initialize SM-2 algorithm
	sm2Algorithm := algorithms.NewSM2Algorithm()

	// Initialize SM-2 state manager
	sm2Manager := state.NewSM2StateManager(sm2Algorithm, db, cache, log)

	// Initialize BKT algorithm
	bktAlgorithm := algorithms.NewBKTAlgorithm()

	// Initialize BKT state manager
	bktManager := state.NewBKTStateManager(bktAlgorithm, db, cache, log)

	// Initialize IRT algorithm
	irtAlgorithm := algorithms.NewIRTAlgorithm()

	// Initialize IRT state manager
	irtManager := state.NewIRTManager(db.DB, cache)

	// Initialize unified scoring algorithm
	unifiedScoring := algorithms.NewUnifiedScoringAlgorithm(log)

	return &SchedulerService{
		config:         cfg,
		logger:         log,
		metrics:        metrics,
		db:             db,
		cache:          cache,
		sm2Algorithm:   sm2Algorithm,
		sm2Manager:     sm2Manager,
		bktAlgorithm:   bktAlgorithm,
		bktManager:     bktManager,
		irtAlgorithm:   irtAlgorithm,
		irtManager:     irtManager,
		unifiedScoring: unifiedScoring,
	}
}

// GetNextItems returns recommended items for a user session
func (s *SchedulerService) GetNextItems(ctx context.Context, req *pb.NextItemsRequest) (*pb.NextItemsResponse, error) {
	timer := metrics.NewTimer()
	defer func() {
		if s.metrics != nil && s.metrics.ItemSelectionTime != nil {
			s.metrics.ItemSelectionTime.Observe(timer.Duration().Seconds())
		}
	}()

	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":      req.UserId,
		"session_id":   req.SessionId,
		"session_type": req.SessionType,
		"count":        req.Count,
	}).Info("Getting next items")

	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}
	if req.Count <= 0 || req.Count > 50 {
		return nil, status.Error(codes.InvalidArgument, "count must be between 1 and 50")
	}

	currentTime := time.Now()

	// Get SM-2 urgency scores for all user items
	urgencyScores, err := s.sm2Manager.GetUrgencyScores(ctx, req.UserId, currentTime)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to get SM-2 urgency scores")
		return nil, status.Error(codes.Internal, "failed to get urgency scores")
	}

	// Get due items for prioritization
	dueItems, err := s.sm2Manager.GetDueItems(ctx, req.UserId, currentTime)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to get due items")
		return nil, status.Error(codes.Internal, "failed to get due items")
	}

	// Get BKT mastery gaps for topic-based prioritization
	masteryGaps, err := s.bktManager.GetMasteryGaps(ctx, req.UserId)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to get BKT mastery gaps")
		return nil, status.Error(codes.Internal, "failed to get mastery gaps")
	}

	// Select items based on unified scoring (SM-2 urgency, BKT mastery gaps, IRT difficulty matching)
	selectedItems := s.selectItemsWithUnifiedScoring(ctx, req, urgencyScores, dueItems, masteryGaps, currentTime)

	// Create session context
	sessionContext := &pb.SessionContext{
		SessionId:         req.SessionId,
		SessionType:       req.SessionType,
		ItemsCompleted:    0,
		CorrectCount:      0,
		ElapsedTimeMs:     0,
		TopicsPracticed:   []string{},
		AverageDifficulty: 0.0,
		StartedAt:         timestamppb.Now(),
	}

	// Update metrics
	if s.metrics != nil && s.metrics.ItemsRecommended != nil {
		s.metrics.ItemsRecommended.Add(float64(len(selectedItems)))
	}

	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":        req.UserId,
		"items_returned": len(selectedItems),
		"due_items":      len(dueItems),
		"total_items":    len(urgencyScores),
	}).Info("Items selected successfully")

	return &pb.NextItemsResponse{
		Items:          selectedItems,
		SessionContext: sessionContext,
		Strategy:       "sm2_spaced_repetition",
	}, nil
}

// GetPlacementItems returns items for placement testing
func (s *SchedulerService) GetPlacementItems(ctx context.Context, req *pb.PlacementRequest) (*pb.PlacementResponse, error) {
	s.logger.WithContext(ctx).WithField("user_id", req.UserId).Info("Getting placement items")

	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}
	if req.CountryCode == "" {
		return nil, status.Error(codes.InvalidArgument, "country_code is required")
	}

	// TODO: Implement actual placement item selection
	// For now, return placeholder items
	items := []*pb.PlacementItem{
		{
			ItemId:         "placement_1",
			Topics:         []string{"traffic_signs"},
			Difficulty:     0.0,
			Discrimination: 1.0,
		},
		{
			ItemId:         "placement_2",
			Topics:         []string{"road_rules"},
			Difficulty:     0.5,
			Discrimination: 1.2,
		},
	}

	return &pb.PlacementResponse{
		Items:              items,
		PlacementSessionId: fmt.Sprintf("placement_%s_%d", req.UserId, time.Now().Unix()),
	}, nil
}

// RecordAttempt processes a user's attempt and updates their state
func (s *SchedulerService) RecordAttempt(ctx context.Context, req *pb.AttemptRequest) (*pb.AttemptResponse, error) {
	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id": req.UserId,
		"item_id": req.ItemId,
		"correct": req.Correct,
		"quality": req.Quality,
	}).Info("Recording attempt")

	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}
	if req.ItemId == "" {
		return nil, status.Error(codes.InvalidArgument, "item_id is required")
	}
	if req.ClientAttemptId == "" {
		return nil, status.Error(codes.InvalidArgument, "client_attempt_id is required")
	}
	if req.Quality < 0 || req.Quality > 5 {
		return nil, status.Error(codes.InvalidArgument, "quality must be between 0 and 5")
	}

	// Get current SM-2 state before update
	currentState, err := s.sm2Manager.GetState(ctx, req.UserId, req.ItemId)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to get current SM-2 state")
		return nil, status.Error(codes.Internal, "failed to get current state")
	}

	// Update SM-2 state based on quality
	newSM2State, err := s.sm2Manager.UpdateState(ctx, req.UserId, req.ItemId, int(req.Quality))
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to update SM-2 state")
		return nil, status.Error(codes.Internal, "failed to update SM-2 state")
	}

	// Update BKT and IRT states for all topics associated with this item
	// TODO: Get item topics from item metadata - for now using placeholder topics
	itemTopics := []string{"general"} // This should come from item metadata
	masteryChanges := make(map[string]float64)
	abilityChanges := make(map[string]float64)

	// TODO: Get item parameters from item metadata - for now using default values
	itemParams := &algorithms.ItemParameters{
		Difficulty:     0.0, // Should come from item calibration
		Discrimination: 1.0, // Should come from item calibration
		Guessing:       0.0, // Should come from item calibration
	}

	for _, topic := range itemTopics {
		// Get current BKT state before update
		currentBKTState, err := s.bktManager.GetState(ctx, req.UserId, topic)
		if err != nil {
			s.logger.WithContext(ctx).WithError(err).WithField("topic", topic).Warn("Failed to get BKT state for topic")
			continue
		}

		// Update BKT state based on correctness
		newBKTState, err := s.bktManager.UpdateState(ctx, req.UserId, topic, req.Correct)
		if err != nil {
			s.logger.WithContext(ctx).WithError(err).WithField("topic", topic).Error("Failed to update BKT state")
			continue
		}

		// Calculate mastery change
		masteryChange := newBKTState.ProbKnowledge - currentBKTState.ProbKnowledge
		masteryChanges[topic] = masteryChange

		// Get current IRT state before update
		currentIRTState, err := s.irtManager.GetState(ctx, req.UserId, topic)
		if err != nil {
			s.logger.WithContext(ctx).WithError(err).WithField("topic", topic).Warn("Failed to get IRT state for topic")
			continue
		}

		// Update IRT state based on correctness
		newIRTState, err := s.irtManager.UpdateState(ctx, req.UserId, topic, itemParams, req.Correct)
		if err != nil {
			s.logger.WithContext(ctx).WithError(err).WithField("topic", topic).Error("Failed to update IRT state")
			continue
		}

		// Calculate ability change
		abilityChange := newIRTState.Theta - currentIRTState.Theta
		abilityChanges[topic] = abilityChange

		s.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"topic":          topic,
			"old_theta":      currentIRTState.Theta,
			"new_theta":      newIRTState.Theta,
			"theta_change":   abilityChange,
			"confidence":     newIRTState.Confidence,
			"mastery_change": masteryChange,
		}).Debug("Updated IRT and BKT states for topic")
	}

	// Create state update response
	stateUpdate := &pb.UserStateUpdate{
		MasteryChanges: masteryChanges,
		AbilityChanges: abilityChanges,
		Sm2Update: &pb.SM2StateUpdate{
			EasinessFactor: newSM2State.EasinessFactor,
			Interval:       int32(newSM2State.Interval),
			Repetition:     int32(newSM2State.Repetition),
			NextDue:        timestamppb.New(newSM2State.NextDue),
		},
	}

	// Update metrics
	if s.metrics != nil {
		if s.metrics.MasteryUpdates != nil {
			s.metrics.MasteryUpdates.Inc()
		}

		// Track attempt outcomes
		if req.GetCorrect() {
			// Track correct attempts
		} else {
			// Track incorrect attempts
		}

		// Track SM-2 specific metrics
		s.trackSM2Metrics(currentState, newSM2State, req.Quality)
	}

	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":      req.UserId,
		"item_id":      req.ItemId,
		"old_interval": currentState.Interval,
		"new_interval": newSM2State.Interval,
		"old_easiness": currentState.EasinessFactor,
		"new_easiness": newSM2State.EasinessFactor,
		"repetition":   newSM2State.Repetition,
	}).Info("SM-2 state updated successfully")

	return &pb.AttemptResponse{
		Success:     true,
		Message:     "Attempt recorded and SM-2 state updated successfully",
		StateUpdate: stateUpdate,
	}, nil
}

// InitializeUser initializes scheduler state for a new user
func (s *SchedulerService) InitializeUser(ctx context.Context, req *pb.InitializeUserRequest) (*pb.InitializeUserResponse, error) {
	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":      req.UserId,
		"country_code": req.CountryCode,
	}).Info("Initializing user")

	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}
	if req.CountryCode == "" {
		return nil, status.Error(codes.InvalidArgument, "country_code is required")
	}

	// Initialize SM-2 states for available items
	// TODO: Get available items for the country/jurisdiction
	// For now, we'll initialize with empty states and create them on-demand

	// Create initial scheduler state
	initialState := &pb.UserSchedulerState{
		UserId:            req.UserId,
		AbilityVector:     map[string]float64{},
		AbilityConfidence: map[string]float64{},
		Sm2States:         map[string]*pb.SM2State{},
		BktStates:         map[string]*pb.BKTState{},
		BanditState: &pb.BanditState{
			StrategyWeights: map[string]float64{
				"practice": 0.4,
				"review":   0.3,
				"test":     0.3,
			},
			StrategyCounts:  map[string]int32{},
			StrategyRewards: map[string]float64{},
			ExplorationRate: 0.1,
		},
		ConsecutiveDays:  0,
		TotalStudyTimeMs: 0,
		Version:          1,
		LastUpdated:      timestamppb.Now(),
	}

	// If placement results are provided, initialize ability estimates
	if req.PlacementResults != nil {
		initialState.AbilityVector = req.PlacementResults.TopicAbilities
		initialState.AbilityConfidence = req.PlacementResults.TopicConfidence

		s.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"user_id":         req.UserId,
			"topic_abilities": req.PlacementResults.TopicAbilities,
			"overall_ability": req.PlacementResults.OverallAbility,
		}).Info("Initialized user with placement results")
	}

	// TODO: Persist initial state to database
	// For now, the state will be created on-demand when items are accessed

	s.logger.WithContext(ctx).WithField("user_id", req.UserId).Info("User initialized successfully")

	return &pb.InitializeUserResponse{
		Success:      true,
		Message:      "User initialized successfully with SM-2 spaced repetition",
		InitialState: initialState,
	}, nil
}

// GetUserState retrieves the current scheduler state for a user
func (s *SchedulerService) GetUserState(ctx context.Context, req *pb.GetUserStateRequest) (*pb.GetUserStateResponse, error) {
	s.logger.WithContext(ctx).WithField("user_id", req.UserId).Info("Getting user state")

	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	// Get SM-2 states for the user
	sm2States, err := s.sm2Manager.GetUserStates(ctx, req.UserId)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to get user SM-2 states")
		return nil, status.Error(codes.Internal, "failed to get user SM-2 states")
	}

	// Convert SM-2 states to protobuf format
	pbSM2States := make(map[string]*pb.SM2State)
	for itemID, state := range sm2States {
		pbSM2States[itemID] = s.sm2Manager.ConvertToProto(state)
	}

	// Get BKT states for the user
	bktStates, err := s.bktManager.GetUserStates(ctx, req.UserId)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to get user BKT states")
		return nil, status.Error(codes.Internal, "failed to get user BKT states")
	}

	// Convert BKT states to protobuf format
	pbBKTStates := make(map[string]*pb.BKTState)
	for topic, state := range bktStates {
		pbBKTStates[topic] = s.bktManager.ConvertToProto(state)
	}

	// Create user scheduler state
	state := &pb.UserSchedulerState{
		UserId:            req.UserId,
		AbilityVector:     map[string]float64{}, // TODO: Implement IRT ability tracking
		AbilityConfidence: map[string]float64{}, // TODO: Implement IRT confidence tracking
		Sm2States:         pbSM2States,
		BktStates:         pbBKTStates,
		BanditState: &pb.BanditState{
			StrategyWeights: map[string]float64{
				"practice": 0.4,
				"review":   0.3,
				"test":     0.3,
			},
			StrategyCounts:  map[string]int32{},
			StrategyRewards: map[string]float64{},
			ExplorationRate: 0.1,
		},
		ConsecutiveDays:  0, // TODO: Implement streak tracking
		TotalStudyTimeMs: 0, // TODO: Implement time tracking
		Version:          1,
		LastUpdated:      timestamppb.Now(),
	}

	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":    req.UserId,
		"sm2_states": len(pbSM2States),
	}).Info("User state retrieved successfully")

	return &pb.GetUserStateResponse{
		State: state,
	}, nil
}

// GetItemDifficulty retrieves difficulty parameters for an item
func (s *SchedulerService) GetItemDifficulty(ctx context.Context, req *pb.GetItemDifficultyRequest) (*pb.GetItemDifficultyResponse, error) {
	s.logger.WithContext(ctx).WithField("item_id", req.ItemId).Info("Getting item difficulty")

	// Validate request
	if req.ItemId == "" {
		return nil, status.Error(codes.InvalidArgument, "item_id is required")
	}

	// TODO: Implement actual difficulty retrieval
	// For now, return placeholder values
	return &pb.GetItemDifficultyResponse{
		Difficulty:     0.5,
		Discrimination: 1.0,
		Guessing:       0.25,
		AttemptsCount:  100,
	}, nil
}

// GetTopicMastery retrieves mastery level for a user's topic
func (s *SchedulerService) GetTopicMastery(ctx context.Context, req *pb.GetTopicMasteryRequest) (*pb.GetTopicMasteryResponse, error) {
	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id": req.UserId,
		"topic":   req.Topic,
	}).Info("Getting topic mastery")

	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}
	if req.Topic == "" {
		return nil, status.Error(codes.InvalidArgument, "topic is required")
	}

	// Get BKT state for the topic
	bktState, err := s.bktManager.GetState(ctx, req.UserId, req.Topic)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to get BKT state for topic mastery")
		return nil, status.Error(codes.Internal, "failed to get topic mastery")
	}

	return &pb.GetTopicMasteryResponse{
		Mastery:       bktState.ProbKnowledge,
		Confidence:    bktState.Confidence,
		PracticeCount: int32(bktState.AttemptsCount),
		LastPracticed: timestamppb.New(bktState.LastUpdated),
	}, nil
}

// Health performs a health check
func (s *SchedulerService) Health(ctx context.Context, req *pb.HealthRequest) (*pb.HealthResponse, error) {
	checks := make(map[string]string)

	// Check database
	if s.db != nil {
		if err := s.db.Health(ctx); err != nil {
			checks["database"] = "unhealthy: " + err.Error()
		} else {
			checks["database"] = "healthy"
		}
	} else {
		checks["database"] = "unhealthy: not configured"
	}

	// Check Redis
	if s.cache != nil {
		if err := s.cache.Health(ctx); err != nil {
			checks["redis"] = "unhealthy: " + err.Error()
		} else {
			checks["redis"] = "healthy"
		}
	} else {
		checks["redis"] = "unhealthy: not configured"
	}

	// Determine overall status
	status := "healthy"
	for _, check := range checks {
		if check != "healthy" {
			status = "unhealthy"
			break
		}
	}

	return &pb.HealthResponse{
		Status:    status,
		Checks:    checks,
		Timestamp: timestamppb.Now(),
	}, nil
}

// Helper methods for SM-2 integration

// selectItemsWithUnifiedScoring selects items using the unified scoring algorithm
func (s *SchedulerService) selectItemsWithUnifiedScoring(
	ctx context.Context,
	req *pb.NextItemsRequest,
	urgencyScores map[string]float64,
	dueItems []string,
	masteryGaps map[string]float64,
	currentTime time.Time,
) []*pb.RecommendedItem {
	var items []*pb.RecommendedItem

	// Create session context
	sessionTypeStr := "practice" // Default
	switch req.SessionType {
	case pb.SessionType_PRACTICE:
		sessionTypeStr = "practice"
	case pb.SessionType_REVIEW:
		sessionTypeStr = "review"
	case pb.SessionType_MOCK_TEST:
		sessionTypeStr = "mock_test"
	case pb.SessionType_PLACEMENT:
		sessionTypeStr = "placement"
	}

	sessionContext := &algorithms.SessionContext{
		SessionID:         req.SessionId,
		SessionType:       sessionTypeStr,
		ElapsedTime:       0,          // TODO: Calculate from session start time
		ItemsCompleted:    0,          // TODO: Get from session state
		CorrectCount:      0,          // TODO: Get from session state
		TopicsPracticed:   []string{}, // TODO: Get from session state
		RecentItems:       req.ExcludeItems,
		AverageDifficulty: 0.5, // TODO: Calculate from session
		TargetItemCount:   int(req.Count),
		TimeRemaining:     45 * time.Minute, // TODO: Get from session constraints
	}

	// Get user's BKT states
	userBKTStates, err := s.bktManager.GetUserStates(ctx, req.UserId)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to get user BKT states")
		userBKTStates = make(map[string]*algorithms.BKTState)
	}

	// Get user's IRT states - we'll need to get them per topic as needed
	// For now, create an empty map and populate as needed
	userIRTStates := make(map[string]*algorithms.IRTState)

	// Determine scoring strategy (could be from A/B testing or user preference)
	strategy := "balanced" // Default strategy
	// TODO: Add strategy field to NextItemsRequest proto if needed

	// Score all candidate items
	type scoredItem struct {
		itemID   string
		result   *algorithms.ScoringResult
		sm2State *algorithms.SM2State
	}

	var scoredItems []scoredItem

	for itemID := range urgencyScores {
		// Skip excluded items
		excluded := false
		for _, excludeID := range req.ExcludeItems {
			if itemID == excludeID {
				excluded = true
				break
			}
		}
		if excluded {
			continue
		}

		// Create item candidate
		candidate := &algorithms.ItemCandidate{
			ItemID:         itemID,
			Topics:         s.getItemTopicsFromID(itemID), // TODO: Get from item metadata
			Difficulty:     0.5,                           // TODO: Get from item metadata
			Discrimination: 1.0,                           // TODO: Get from item metadata
			Guessing:       0.0,                           // TODO: Get from item metadata
			EstimatedTime:  60 * time.Second,              // TODO: Get from item metadata
			AttemptCount:   0,                             // TODO: Get from user attempt history
			Metadata:       make(map[string]interface{}),
		}

		// Get SM-2 state
		sm2State, err := s.sm2Manager.GetState(ctx, req.UserId, itemID)
		if err != nil {
			s.logger.WithContext(ctx).WithError(err).WithField("item_id", itemID).Debug("Failed to get SM-2 state, using default")
			sm2State = s.sm2Algorithm.InitializeState()
		}

		// Compute unified score
		result, err := s.unifiedScoring.ComputeUnifiedScore(
			ctx,
			candidate,
			sm2State,
			userBKTStates,
			userIRTStates,
			sessionContext,
			strategy,
		)

		if err != nil {
			s.logger.WithContext(ctx).WithError(err).WithField("item_id", itemID).Error("Failed to compute unified score")
			continue
		}

		// Skip items that violate constraints
		if result.UnifiedScore == 0.0 {
			s.logger.WithContext(ctx).WithFields(map[string]interface{}{
				"item_id": itemID,
				"reason":  result.Reason,
			}).Debug("Item skipped due to constraint violation")
			continue
		}

		scoredItems = append(scoredItems, scoredItem{
			itemID:   itemID,
			result:   result,
			sm2State: sm2State,
		})
	}

	// Sort items by unified score (highest first)
	for i := 0; i < len(scoredItems)-1; i++ {
		for j := i + 1; j < len(scoredItems); j++ {
			if scoredItems[j].result.UnifiedScore > scoredItems[i].result.UnifiedScore {
				scoredItems[i], scoredItems[j] = scoredItems[j], scoredItems[i]
			}
		}
	}

	// Select top items up to requested count
	count := int(req.Count)
	if count > len(scoredItems) {
		count = len(scoredItems)
	}

	for i := 0; i < count; i++ {
		item := scoredItems[i]

		// Calculate predicted correctness based on retention probability
		predictedCorrectness := s.sm2Algorithm.GetRetentionProbability(item.sm2State, currentTime)

		recommendedItem := &pb.RecommendedItem{
			ItemId:               item.itemID,
			Score:                item.result.UnifiedScore,
			Reason:               item.result.Reason,
			Topics:               s.getItemTopicsFromID(item.itemID), // TODO: Get from item metadata
			Difficulty:           0.5,                                // TODO: Get from item metadata
			PredictedCorrectness: predictedCorrectness,
		}

		items = append(items, recommendedItem)

		s.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"item_id":       item.itemID,
			"unified_score": item.result.UnifiedScore,
			"urgency":       item.result.ComponentScores.UrgencyScore,
			"mastery_gap":   item.result.ComponentScores.MasteryGapScore,
			"difficulty":    item.result.ComponentScores.DifficultyScore,
			"exploration":   item.result.ComponentScores.ExplorationScore,
			"strategy":      item.result.Strategy,
			"reason":        item.result.Reason,
		}).Debug("Item selected with unified scoring")
	}

	return items
}

// generateRecommendationReason creates a human-readable reason for item recommendation
func (s *SchedulerService) generateRecommendationReason(state *algorithms.SM2State, isDue bool, currentTime time.Time) string {
	if isDue {
		daysOverdue := currentTime.Sub(state.NextDue).Hours() / 24.0
		if daysOverdue > 1 {
			return fmt.Sprintf("Overdue by %.1f days - needs review", daysOverdue)
		}
		return "Due for review"
	}

	if state.Repetition == 0 {
		return "New item - first learning"
	}

	if state.Repetition == 1 {
		return "Early learning stage"
	}

	if state.EasinessFactor < 2.0 {
		return "Difficult item - needs reinforcement"
	}

	return "Scheduled for spaced repetition"
}

// trackSM2Metrics updates metrics related to SM-2 algorithm performance
func (s *SchedulerService) trackSM2Metrics(oldState, newState *algorithms.SM2State, quality int32) {
	if s.metrics == nil {
		return
	}

	// Track easiness factor changes
	easinessChange := newState.EasinessFactor - oldState.EasinessFactor

	// Track interval changes
	intervalChange := newState.Interval - oldState.Interval

	// Track repetition resets (when quality < 3)
	if quality < 3 && oldState.Repetition > 0 {
		// Repetition was reset
	}

	// Log metrics for monitoring
	s.logger.WithFields(map[string]interface{}{
		"easiness_change": easinessChange,
		"interval_change": intervalChange,
		"quality":         quality,
		"repetition":      newState.Repetition,
	}).Debug("SM-2 metrics tracked")
}

// IRT-specific methods

// GetAbilityEstimate retrieves IRT ability estimate for a user and topic
func (s *SchedulerService) GetAbilityEstimate(ctx context.Context, userID, topic string) (float64, float64, error) {
	state, err := s.irtManager.GetState(ctx, userID, topic)
	if err != nil {
		return 0.0, 0.0, fmt.Errorf("failed to get IRT state: %w", err)
	}

	return state.Theta, state.Confidence, nil
}

// GetOptimalDifficulty calculates optimal difficulty for a user's current ability in a topic
func (s *SchedulerService) GetOptimalDifficulty(ctx context.Context, userID, topic string, discrimination float64) (float64, error) {
	return s.irtManager.GetOptimalDifficulty(ctx, userID, topic, discrimination)
}

// GetAbilityConfidenceInterval calculates confidence interval for user's ability
func (s *SchedulerService) GetAbilityConfidenceInterval(ctx context.Context, userID, topic string, confidenceLevel float64) (float64, float64, error) {
	return s.irtManager.GetConfidenceInterval(ctx, userID, topic, confidenceLevel)
}

// InitializeAbilityFromPlacement initializes IRT state from placement test results
func (s *SchedulerService) InitializeAbilityFromPlacement(ctx context.Context, userID, topic string, responses []bool, itemParams []*algorithms.ItemParameters) error {
	_, err := s.irtManager.InitializeFromPlacement(ctx, userID, topic, responses, itemParams)
	if err != nil {
		return fmt.Errorf("failed to initialize ability from placement: %w", err)
	}

	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":        userID,
		"topic":          topic,
		"response_count": len(responses),
	}).Info("Initialized IRT ability from placement test")

	return nil
}

// ApplyTimeDecayToAbilities applies time-based decay to all user's IRT states
func (s *SchedulerService) ApplyTimeDecayToAbilities(ctx context.Context, userID string) error {
	err := s.irtManager.ApplyTimeDecay(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to apply time decay to abilities: %w", err)
	}

	s.logger.WithContext(ctx).WithField("user_id", userID).Debug("Applied time decay to IRT abilities")
	return nil
}

// GetIRTAnalytics returns analytics data for user's IRT state in a topic
func (s *SchedulerService) GetIRTAnalytics(ctx context.Context, userID, topic string) (map[string]interface{}, error) {
	analytics, err := s.irtManager.GetAnalytics(ctx, userID, topic)
	if err != nil {
		return nil, fmt.Errorf("failed to get IRT analytics: %w", err)
	}

	return analytics, nil
}

// CalibrateItemDifficulty calibrates item parameters from response data
func (s *SchedulerService) CalibrateItemDifficulty(responses []bool, abilities []float64) *algorithms.ItemParameters {
	return s.irtManager.CalibrateItemParameters(responses, abilities)
}

// GetRecommendationScoreWithIRT calculates IRT-based recommendation score for an item
func (s *SchedulerService) GetRecommendationScoreWithIRT(ctx context.Context, userID, topic string, itemParams *algorithms.ItemParameters) (float64, error) {
	return s.irtManager.GetRecommendationScore(ctx, userID, topic, itemParams)
}

// SelectSessionStrategy uses contextual bandit to select optimal session strategy
func (s *SchedulerService) SelectSessionStrategy(ctx context.Context, req *pb.SelectSessionStrategyRequest) (*pb.SelectSessionStrategyResponse, error) {
	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":        req.UserId,
		"available_time": req.AvailableTime,
		"recent_accuracy": req.RecentAccuracy,
	}).Info("Selecting session strategy")

	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	// Create context features from request
	contextFeatures := s.createContextFeatures(ctx, req)

	// Select strategy using contextual bandit
	selection, err := s.unifiedScoring.SelectSessionStrategy(ctx, contextFeatures)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to select session strategy")
		return nil, status.Error(codes.Internal, "failed to select session strategy")
	}

	// Get strategy details
	strategy, exists := s.unifiedScoring.GetSessionStrategy(selection.Strategy)
	if !exists {
		return nil, status.Error(codes.Internal, "selected strategy not found")
	}

	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":         req.UserId,
		"selected_strategy": selection.Strategy,
		"expected_reward": selection.ExpectedReward,
		"confidence":      selection.Confidence,
	}).Info("Session strategy selected")

	return &pb.SelectSessionStrategyResponse{
		Strategy: &pb.SessionStrategy{
			Name:        strategy.Name,
			Description: strategy.Description,
			MinDuration: int32(strategy.MinDuration),
			MaxDuration: int32(strategy.MaxDuration),
			Difficulty:  strategy.Difficulty,
			Variety:     strategy.Variety,
			Urgency:     strategy.Urgency,
			Mastery:     strategy.Mastery,
		},
		Selection: &pb.BanditSelection{
			Strategy:         selection.Strategy,
			Confidence:       selection.Confidence,
			ExpectedReward:   selection.ExpectedReward,
			ExplorationBonus: selection.ExplorationBonus,
			Reason:           selection.Reason,
			Timestamp:        timestamppb.New(selection.Timestamp),
		},
	}, nil
}

// UpdateSessionReward updates the contextual bandit with session performance feedback
func (s *SchedulerService) UpdateSessionReward(ctx context.Context, req *pb.UpdateSessionRewardRequest) (*pb.UpdateSessionRewardResponse, error) {
	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":    req.UserId,
		"session_id": req.SessionId,
		"strategy":   req.Strategy,
		"reward":     req.Reward,
	}).Info("Updating session reward")

	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}
	if req.SessionId == "" {
		return nil, status.Error(codes.InvalidArgument, "session_id is required")
	}
	if req.Strategy == "" {
		return nil, status.Error(codes.InvalidArgument, "strategy is required")
	}

	// Create context features from request
	contextFeatures := s.createContextFeaturesFromReward(ctx, req)

	// Update bandit with reward
	err := s.unifiedScoring.UpdateSessionReward(ctx, req.Strategy, contextFeatures, req.Reward, req.SessionId)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to update session reward")
		return nil, status.Error(codes.Internal, "failed to update session reward")
	}

	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":    req.UserId,
		"session_id": req.SessionId,
		"strategy":   req.Strategy,
		"reward":     req.Reward,
	}).Info("Session reward updated successfully")

	return &pb.UpdateSessionRewardResponse{
		Success: true,
		Message: "Session reward updated successfully",
	}, nil
}

// GetBanditMetrics returns performance metrics for the contextual bandit
func (s *SchedulerService) GetBanditMetrics(ctx context.Context, req *pb.GetBanditMetricsRequest) (*pb.GetBanditMetricsResponse, error) {
	s.logger.WithContext(ctx).Info("Getting bandit metrics")

	metrics := s.unifiedScoring.GetBanditPerformanceMetrics()

	// Convert metrics to protobuf format
	pbMetrics := make(map[string]string)
	for key, value := range metrics {
		pbMetrics[key] = fmt.Sprintf("%v", value)
	}

	return &pb.GetBanditMetricsResponse{
		Metrics: pbMetrics,
	}, nil
}

// GetAvailableStrategies returns all available session strategies
func (s *SchedulerService) GetAvailableStrategies(ctx context.Context, req *pb.GetAvailableStrategiesRequest) (*pb.GetAvailableStrategiesResponse, error) {
	s.logger.WithContext(ctx).Info("Getting available strategies")

	strategies := s.unifiedScoring.GetAvailableStrategies()

	var pbStrategies []*pb.SessionStrategy
	for _, strategy := range strategies {
		pbStrategies = append(pbStrategies, &pb.SessionStrategy{
			Name:        strategy.Name,
			Description: strategy.Description,
			MinDuration: int32(strategy.MinDuration),
			MaxDuration: int32(strategy.MaxDuration),
			Difficulty:  strategy.Difficulty,
			Variety:     strategy.Variety,
			Urgency:     strategy.Urgency,
			Mastery:     strategy.Mastery,
		})
	}

	return &pb.GetAvailableStrategiesResponse{
		Strategies: pbStrategies,
	}, nil
}

// createContextFeatures creates context features from session strategy request
func (s *SchedulerService) createContextFeatures(ctx context.Context, req *pb.SelectSessionStrategyRequest) algorithms.ContextFeatures {
	now := time.Now()

	// Get user's current state for more accurate context
	// In a real implementation, these would be fetched from the database
	userAbilityMean := 0.5     // Default - should be calculated from IRT states
	userMasteryMean := 0.6     // Default - should be calculated from BKT states
	userStreakDays := 1        // Default - should be fetched from user data
	userTotalSessions := 10    // Default - should be fetched from user data

	return algorithms.ContextFeatures{
		// User characteristics (defaults - should be fetched from actual data)
		UserAbilityMean:     userAbilityMean,
		UserAbilityVariance: 0.2,
		UserMasteryMean:     userMasteryMean,
		UserMasteryVariance: 0.3,
		UserStreakDays:      userStreakDays,
		UserTotalSessions:   userTotalSessions,

		// Session context from request
		TimeOfDay:        now.Hour(),
		DayOfWeek:        int(now.Weekday()),
		SessionNumber:    int(req.SessionNumber),
		AvailableTime:    int(req.AvailableTime),
		RecentAccuracy:   req.RecentAccuracy,
		RecentDifficulty: req.RecentDifficulty,

		// Learning state from request
		DueItemsCount:     int(req.DueItemsCount),
		OverdueItemsCount: int(req.OverdueItemsCount),
		NewItemsCount:     int(req.NewItemsCount),
		MasteryGapSum:     req.MasteryGapSum,
		UrgencyScore:      req.UrgencyScore,

		// Performance indicators from request
		RecentEngagement: req.RecentEngagement,
		RecentRetention:  req.RecentRetention,
		RecentProgress:   req.RecentProgress,
		PredictedFatigue: req.PredictedFatigue,
		MotivationLevel:  req.MotivationLevel,

		Timestamp: now,
	}
}

// createContextFeaturesFromReward creates context features from reward update request
func (s *SchedulerService) createContextFeaturesFromReward(ctx context.Context, req *pb.UpdateSessionRewardRequest) algorithms.ContextFeatures {
	now := time.Now()

	// Extract context from session metrics if provided
	var contextFeatures algorithms.ContextFeatures
	if req.SessionMetrics != nil {
		contextFeatures = algorithms.ContextFeatures{
			// User characteristics (defaults - should be fetched from actual data)
			UserAbilityMean:     0.5,
			UserAbilityVariance: 0.2,
			UserMasteryMean:     0.6,
			UserMasteryVariance: 0.3,
			UserStreakDays:      1,
			UserTotalSessions:   10,

			// Session context from metrics
			TimeOfDay:        now.Hour(),
			DayOfWeek:        int(now.Weekday()),
			SessionNumber:    1,
			AvailableTime:    int(req.SessionMetrics.TimeSpent),
			RecentAccuracy:   req.SessionMetrics.Accuracy,
			RecentDifficulty: 0.5, // Default

			// Learning state (defaults)
			DueItemsCount:     10,
			OverdueItemsCount: 5,
			NewItemsCount:     20,
			MasteryGapSum:     3.0,
			UrgencyScore:      0.5,

			// Performance indicators from metrics
			RecentEngagement: req.SessionMetrics.EngagementScore,
			RecentRetention:  req.SessionMetrics.RetentionRate,
			RecentProgress:   req.SessionMetrics.MasteryImprovement,
			PredictedFatigue: req.SessionMetrics.FatigueLevel,
			MotivationLevel:  0.8, // Default

			Timestamp: now,
		}
	} else {
		// Use defaults if no metrics provided
		contextFeatures = algorithms.ContextFeatures{
			UserAbilityMean:     0.5,
			UserAbilityVariance: 0.2,
			UserMasteryMean:     0.6,
			UserMasteryVariance: 0.3,
			UserStreakDays:      1,
			UserTotalSessions:   10,
			TimeOfDay:           now.Hour(),
			DayOfWeek:           int(now.Weekday()),
			SessionNumber:       1,
			AvailableTime:       30,
			RecentAccuracy:      0.7,
			RecentDifficulty:    0.5,
			DueItemsCount:       10,
			OverdueItemsCount:   5,
			NewItemsCount:       20,
			MasteryGapSum:       3.0,
			UrgencyScore:        0.5,
			RecentEngagement:    0.7,
			RecentRetention:     0.8,
			RecentProgress:      0.6,
			PredictedFatigue:    0.3,
			MotivationLevel:     0.8,
			Timestamp:           now,
		}
	}

	return contextFeatures
}

// trackIRTMetrics updates metrics related to IRT algorithm performance
func (s *SchedulerService) trackIRTMetrics(oldState, newState *algorithms.IRTState, correct bool) {
	if s.metrics == nil {
		return
	}

	// Track IRT updates
	if s.metrics.IRTUpdates != nil {
		s.metrics.IRTUpdates.Inc()
	}

	// Track ability changes
	abilityChange := newState.Theta - oldState.Theta
	confidenceChange := newState.Confidence - oldState.Confidence

	s.logger.WithFields(map[string]interface{}{
		"old_theta":         oldState.Theta,
		"new_theta":         newState.Theta,
		"ability_change":    abilityChange,
		"old_confidence":    oldState.Confidence,
		"new_confidence":    newState.Confidence,
		"confidence_change": confidenceChange,
		"correct":           correct,
		"attempts_count":    newState.AttemptsCount,
	}).Debug("IRT metrics tracked")
}

// Helper method to get item parameters (placeholder implementation)
func (s *SchedulerService) getItemParameters(ctx context.Context, itemID string) (*algorithms.ItemParameters, error) {
	// TODO: Implement actual item parameter retrieval from database/cache
	// This is a placeholder implementation with default values
	return &algorithms.ItemParameters{
		Difficulty:     0.0, // Should be calibrated from historical data
		Discrimination: 1.0, // Should be calibrated from historical data
		Guessing:       0.0, // Should be calibrated from historical data (0.25 for 4-option multiple choice)
		AttemptsCount:  0,   // Should come from item statistics
		CorrectCount:   0,   // Should come from item statistics
	}, nil
}

// Helper method to get item topics from item ID (placeholder implementation)
func (s *SchedulerService) getItemTopicsFromID(itemID string) []string {
	// TODO: Implement actual item topic retrieval from database/cache
	// This is a placeholder implementation that maps item ID to topics

	// For now, derive topic from item ID pattern or use default
	if len(itemID) > 0 {
		// Simple mapping based on item ID prefix or pattern
		switch {
		case itemID[:1] == "t": // traffic signs
			return []string{"traffic_signs"}
		case itemID[:1] == "r": // road rules
			return []string{"road_rules"}
		case itemID[:1] == "s": // safety
			return []string{"safety"}
		case itemID[:1] == "p": // parking
			return []string{"parking"}
		default:
			return []string{"general"}
		}
	}

	return []string{"general"}
}

// Helper method to get item topics (placeholder implementation)
func (s *SchedulerService) getItemTopics(ctx context.Context, itemID string) ([]string, error) {
	// TODO: Implement actual item topic retrieval from database/cache
	// This is a placeholder implementation
	return []string{"general"}, nil
}

// Unified Scoring Algorithm Management Methods

// GetScoringStrategy retrieves a scoring strategy by name
func (s *SchedulerService) GetScoringStrategy(strategyName string) (algorithms.ScoringStrategy, bool) {
	return s.unifiedScoring.GetScoringStrategy(strategyName)
}

// AddScoringStrategy adds a new scoring strategy for A/B testing
func (s *SchedulerService) AddScoringStrategy(strategy algorithms.ScoringStrategy) error {
	err := s.unifiedScoring.AddScoringStrategy(strategy)
	if err != nil {
		s.logger.WithFields(map[string]interface{}{
			"strategy_name": strategy.Name,
			"error":         err.Error(),
		}).Error("Failed to add scoring strategy")
		return err
	}

	s.logger.WithFields(map[string]interface{}{
		"strategy_name": strategy.Name,
		"description":   strategy.Description,
	}).Info("Added new scoring strategy")

	return nil
}

// UpdateScoringWeights updates the weights for the unified scoring algorithm
func (s *SchedulerService) UpdateScoringWeights(weights algorithms.ScoringWeights) error {
	err := s.unifiedScoring.UpdateWeights(weights)
	if err != nil {
		s.logger.WithFields(map[string]interface{}{
			"weights": weights,
			"error":   err.Error(),
		}).Error("Failed to update scoring weights")
		return err
	}

	s.logger.WithFields(map[string]interface{}{
		"urgency":     weights.Urgency,
		"mastery":     weights.Mastery,
		"difficulty":  weights.Difficulty,
		"exploration": weights.Exploration,
	}).Info("Updated unified scoring weights")

	return nil
}

// GetUnifiedScoringAnalytics returns analytics data for the unified scoring algorithm
func (s *SchedulerService) GetUnifiedScoringAnalytics() map[string]interface{} {
	analytics := s.unifiedScoring.GetAnalytics()

	s.logger.WithFields(map[string]interface{}{
		"strategies_count": len(s.unifiedScoring.ScoringStrategies),
		"ab_testing":       s.unifiedScoring.ABTestingEnabled,
	}).Debug("Retrieved unified scoring analytics")

	return analytics
}

// ValidateUnifiedScoringConfiguration validates the current unified scoring configuration
func (s *SchedulerService) ValidateUnifiedScoringConfiguration() error {
	err := s.unifiedScoring.ValidateConfiguration()
	if err != nil {
		s.logger.WithError(err).Error("Unified scoring configuration validation failed")
		return err
	}

	s.logger.Info("Unified scoring configuration is valid")
	return nil
}

// ComputeItemScore computes the unified score for a specific item and user
func (s *SchedulerService) ComputeItemScore(
	ctx context.Context,
	userID, itemID, strategy string,
) (*algorithms.ScoringResult, error) {
	// Create item candidate
	candidate := &algorithms.ItemCandidate{
		ItemID:         itemID,
		Topics:         s.getItemTopicsFromID(itemID),
		Difficulty:     0.5,              // TODO: Get from item metadata
		Discrimination: 1.0,              // TODO: Get from item metadata
		Guessing:       0.0,              // TODO: Get from item metadata
		EstimatedTime:  60 * time.Second, // TODO: Get from item metadata
		AttemptCount:   0,                // TODO: Get from user attempt history
		Metadata:       make(map[string]interface{}),
	}

	// Get SM-2 state
	sm2State, err := s.sm2Manager.GetState(ctx, userID, itemID)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Debug("Failed to get SM-2 state, using default")
		sm2State = s.sm2Algorithm.InitializeState()
	}

	// Get user's BKT states
	userBKTStates, err := s.bktManager.GetUserStates(ctx, userID)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to get user BKT states")
		userBKTStates = make(map[string]*algorithms.BKTState)
	}

	// Get user's IRT states - we'll need to get them per topic as needed
	// For now, create an empty map and populate as needed
	userIRTStates := make(map[string]*algorithms.IRTState)

	// Create minimal session context
	sessionContext := &algorithms.SessionContext{
		SessionID:         "scoring_" + userID,
		SessionType:       "practice",
		ElapsedTime:       0,
		ItemsCompleted:    0,
		CorrectCount:      0,
		TopicsPracticed:   []string{},
		RecentItems:       []string{},
		AverageDifficulty: 0.5,
		TargetItemCount:   1,
		TimeRemaining:     45 * time.Minute,
	}

	// Compute unified score
	result, err := s.unifiedScoring.ComputeUnifiedScore(
		ctx,
		candidate,
		sm2State,
		userBKTStates,
		userIRTStates,
		sessionContext,
		strategy,
	)

	if err != nil {
		s.logger.WithContext(ctx).WithError(err).WithFields(map[string]interface{}{
			"user_id":  userID,
			"item_id":  itemID,
			"strategy": strategy,
		}).Error("Failed to compute unified score")
		return nil, err
	}

	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":       userID,
		"item_id":       itemID,
		"strategy":      strategy,
		"unified_score": result.UnifiedScore,
	}).Debug("Computed unified score for item")

	return result, nil
}

// GetOptimalScoringStrategy determines the best scoring strategy for a user based on their learning patterns
func (s *SchedulerService) GetOptimalScoringStrategy(ctx context.Context, userID string) (string, error) {
	// TODO: Implement strategy selection logic based on user performance and preferences
	// This could use contextual bandit algorithms or simple heuristics

	// Get user's learning statistics
	userBKTStates, err := s.bktManager.GetUserStates(ctx, userID)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Debug("Failed to get BKT states for strategy selection")
		return "balanced", nil // Default strategy
	}

	// Simple heuristic: choose strategy based on overall mastery level
	totalMastery := 0.0
	masteryCount := 0
	for _, state := range userBKTStates {
		totalMastery += state.ProbKnowledge
		masteryCount++
	}

	if masteryCount == 0 {
		return "balanced", nil
	}

	averageMastery := totalMastery / float64(masteryCount)

	// Strategy selection based on mastery level
	var strategy string
	switch {
	case averageMastery < 0.3:
		strategy = "mastery_focused" // Focus on building knowledge
	case averageMastery < 0.6:
		strategy = "balanced" // Balanced approach
	case averageMastery < 0.8:
		strategy = "adaptive_challenge" // Focus on optimal challenge
	default:
		strategy = "urgency_focused" // Focus on spaced repetition
	}

	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":           userID,
		"average_mastery":   averageMastery,
		"selected_strategy": strategy,
	}).Debug("Selected optimal scoring strategy")

	return strategy, nil
}

// TrackScoringPerformance tracks the performance of different scoring strategies
func (s *SchedulerService) TrackScoringPerformance(
	ctx context.Context,
	userID, strategy string,
	sessionResults map[string]interface{},
) error {
	// TODO: Implement performance tracking for A/B testing
	// This would store results in a database for later analysis

	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"user_id":         userID,
		"strategy":        strategy,
		"session_results": sessionResults,
	}).Info("Tracked scoring strategy performance")

	// Update metrics if available
	if s.metrics != nil {
		// Track strategy usage
		// s.metrics.ScoringStrategyUsage.WithLabelValues(strategy).Inc()

		// Track performance metrics
		if accuracy, ok := sessionResults["accuracy"].(float64); ok {
			// s.metrics.ScoringStrategyAccuracy.WithLabelValues(strategy).Observe(accuracy)
			_ = accuracy // Placeholder to avoid unused variable error
		}
	}

	return nil
}

// GetSessionConstraints returns the current session constraints for the unified scoring algorithm
func (s *SchedulerService) GetSessionConstraints() map[string]interface{} {
	return map[string]interface{}{
		"max_session_time":       s.unifiedScoring.MaxSessionTime.Minutes(),
		"min_topic_interleaving": s.unifiedScoring.MinTopicInterleaving,
		"max_consecutive_topic":  s.unifiedScoring.MaxConsecutiveTopic,
		"difficulty_variance":    s.unifiedScoring.DifficultyVariance,
		"recent_items_window":    s.unifiedScoring.RecentItemsWindow,
	}
}

// UpdateSessionConstraints updates the session constraints for the unified scoring algorithm
func (s *SchedulerService) UpdateSessionConstraints(constraints map[string]interface{}) error {
	if maxTime, ok := constraints["max_session_time"].(float64); ok {
		s.unifiedScoring.MaxSessionTime = time.Duration(maxTime) * time.Minute
	}

	if minInterleaving, ok := constraints["min_topic_interleaving"].(int); ok {
		s.unifiedScoring.MinTopicInterleaving = minInterleaving
	}

	if maxConsecutive, ok := constraints["max_consecutive_topic"].(int); ok {
		s.unifiedScoring.MaxConsecutiveTopic = maxConsecutive
	}

	if diffVariance, ok := constraints["difficulty_variance"].(float64); ok {
		s.unifiedScoring.DifficultyVariance = diffVariance
	}

	if recentWindow, ok := constraints["recent_items_window"].(int); ok {
		s.unifiedScoring.RecentItemsWindow = recentWindow
	}

	// Validate updated configuration
	err := s.unifiedScoring.ValidateConfiguration()
	if err != nil {
		s.logger.WithError(err).Error("Invalid session constraints update")
		return err
	}

	s.logger.WithFields(map[string]interface{}{
		"constraints": constraints,
	}).Info("Updated session constraints")

	return nil
}
