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

	config       *config.Config
	logger       *logger.Logger
	metrics      *metrics.Metrics
	db           *database.DB
	cache        *cache.RedisClient
	sm2Algorithm *algorithms.SM2Algorithm
	sm2Manager   *state.SM2StateManager
	bktAlgorithm *algorithms.BKTAlgorithm
	bktManager   *state.BKTStateManager
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

	return &SchedulerService{
		config:       cfg,
		logger:       log,
		metrics:      metrics,
		db:           db,
		cache:        cache,
		sm2Algorithm: sm2Algorithm,
		sm2Manager:   sm2Manager,
		bktAlgorithm: bktAlgorithm,
		bktManager:   bktManager,
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

	// Select items based on SM-2 urgency, BKT mastery gaps, and session constraints
	selectedItems := s.selectItemsWithBKT(ctx, req, urgencyScores, dueItems, masteryGaps, currentTime)

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

	// Update BKT states for all topics associated with this item
	// TODO: Get item topics from item metadata - for now using placeholder topics
	itemTopics := []string{"general"} // This should come from item metadata
	masteryChanges := make(map[string]float64)

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
	}

	// Create state update response
	stateUpdate := &pb.UserStateUpdate{
		MasteryChanges: masteryChanges,
		AbilityChanges: map[string]float64{
			// TODO: Implement ability changes based on IRT
		},
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

// selectItemsWithBKT selects items based on SM-2 urgency, BKT mastery gaps, and session constraints
func (s *SchedulerService) selectItemsWithBKT(
	ctx context.Context,
	req *pb.NextItemsRequest,
	urgencyScores map[string]float64,
	dueItems []string,
	masteryGaps map[string]float64,
	currentTime time.Time,
) []*pb.RecommendedItem {
	var items []*pb.RecommendedItem

	// Create a map for quick lookup of due items
	dueItemsMap := make(map[string]bool)
	for _, itemID := range dueItems {
		dueItemsMap[itemID] = true
	}

	// Sort items by urgency score (highest first)
	type itemScore struct {
		itemID string
		score  float64
		isDue  bool
	}

	var scoredItems []itemScore
	for itemID, score := range urgencyScores {
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

		scoredItems = append(scoredItems, itemScore{
			itemID: itemID,
			score:  score,
			isDue:  dueItemsMap[itemID],
		})
	}

	// Calculate combined scores incorporating BKT mastery gaps
	for i := range scoredItems {
		// TODO: Get item topics from item metadata
		// For now, assume each item maps to a topic with the same name
		itemTopic := scoredItems[i].itemID // Placeholder - should be actual topic mapping

		masteryGap := 0.5 // Default gap if topic not found
		if gap, exists := masteryGaps[itemTopic]; exists {
			masteryGap = gap
		}

		// Combine SM-2 urgency (40%) and BKT mastery gap (60%)
		combinedScore := 0.4*scoredItems[i].score + 0.6*masteryGap
		scoredItems[i].score = combinedScore
	}

	// Sort by priority: due items first, then by combined score
	for i := 0; i < len(scoredItems)-1; i++ {
		for j := i + 1; j < len(scoredItems); j++ {
			// Prioritize due items
			if scoredItems[i].isDue != scoredItems[j].isDue {
				if scoredItems[j].isDue {
					scoredItems[i], scoredItems[j] = scoredItems[j], scoredItems[i]
				}
			} else if scoredItems[j].score > scoredItems[i].score {
				// Within same due status, sort by combined score
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

		// Get SM-2 state for additional information
		state, err := s.sm2Manager.GetState(ctx, req.UserId, item.itemID)
		if err != nil {
			s.logger.WithContext(ctx).WithError(err).WithField("item_id", item.itemID).Warn("Failed to get SM-2 state for item")
			continue
		}

		// Calculate predicted correctness based on retention probability
		predictedCorrectness := s.sm2Algorithm.GetRetentionProbability(state, currentTime)

		// Generate reason for recommendation
		reason := s.generateRecommendationReason(state, item.isDue, currentTime)

		recommendedItem := &pb.RecommendedItem{
			ItemId:               item.itemID,
			Score:                item.score,
			Reason:               reason,
			Topics:               []string{}, // TODO: Get from item metadata
			Difficulty:           0.5,        // TODO: Get from item metadata
			PredictedCorrectness: predictedCorrectness,
		}

		items = append(items, recommendedItem)
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
