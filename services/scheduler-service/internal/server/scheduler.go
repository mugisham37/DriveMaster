package server

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	"scheduler-service/internal/cache"
	"scheduler-service/internal/config"
	"scheduler-service/internal/database"
	"scheduler-service/internal/logger"
	"scheduler-service/internal/metrics"
	pb "scheduler-service/proto"
)

// SchedulerService implements the gRPC SchedulerService interface
type SchedulerService struct {
	pb.UnimplementedSchedulerServiceServer

	config  *config.Config
	logger  *logger.Logger
	metrics *metrics.Metrics
	db      *database.DB
	cache   *cache.RedisClient
}

// NewSchedulerService creates a new scheduler service instance
func NewSchedulerService(
	cfg *config.Config,
	log *logger.Logger,
	metrics *metrics.Metrics,
	db *database.DB,
	cache *cache.RedisClient,
) *SchedulerService {
	return &SchedulerService{
		config:  cfg,
		logger:  log,
		metrics: metrics,
		db:      db,
		cache:   cache,
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

	s.logger.WithContext(ctx).WithField("user_id", req.UserId).Info("Getting next items")

	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}
	if req.Count <= 0 || req.Count > 50 {
		return nil, status.Error(codes.InvalidArgument, "count must be between 1 and 50")
	}

	// TODO: Implement actual item selection logic
	// For now, return a placeholder response
	items := []*pb.RecommendedItem{
		{
			ItemId:               "item_1",
			Score:                0.85,
			Reason:               "High mastery gap in traffic signs",
			Topics:               []string{"traffic_signs"},
			Difficulty:           0.6,
			PredictedCorrectness: 0.75,
		},
	}

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

	if s.metrics != nil && s.metrics.ItemsRecommended != nil {
		s.metrics.ItemsRecommended.Add(float64(len(items)))
	}

	return &pb.NextItemsResponse{
		Items:          items,
		SessionContext: sessionContext,
		Strategy:       "adaptive_practice",
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

	// TODO: Implement actual attempt processing
	// For now, return a placeholder response
	stateUpdate := &pb.UserStateUpdate{
		MasteryChanges: map[string]float64{
			"traffic_signs": 0.05,
		},
		AbilityChanges: map[string]float64{
			"traffic_signs": 0.1,
		},
		Sm2Update: &pb.SM2StateUpdate{
			EasinessFactor: 2.5,
			Interval:       1,
			Repetition:     1,
			NextDue:        timestamppb.New(time.Now().AddDate(0, 0, 1)),
		},
	}

	// Update metrics
	if s.metrics != nil && s.metrics.MasteryUpdates != nil {
		s.metrics.MasteryUpdates.Inc()
	}
	if req.GetCorrect() {
		// Track correct attempts
	}

	return &pb.AttemptResponse{
		Success:     true,
		Message:     "Attempt recorded successfully",
		StateUpdate: stateUpdate,
	}, nil
}

// InitializeUser initializes scheduler state for a new user
func (s *SchedulerService) InitializeUser(ctx context.Context, req *pb.InitializeUserRequest) (*pb.InitializeUserResponse, error) {
	s.logger.WithContext(ctx).WithField("user_id", req.UserId).Info("Initializing user")

	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}
	if req.CountryCode == "" {
		return nil, status.Error(codes.InvalidArgument, "country_code is required")
	}

	// TODO: Implement actual user initialization
	// For now, return a placeholder state
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

	return &pb.InitializeUserResponse{
		Success:      true,
		Message:      "User initialized successfully",
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

	// TODO: Implement actual state retrieval
	// For now, return a placeholder state
	state := &pb.UserSchedulerState{
		UserId:            req.UserId,
		AbilityVector:     map[string]float64{},
		AbilityConfidence: map[string]float64{},
		Sm2States:         map[string]*pb.SM2State{},
		BktStates:         map[string]*pb.BKTState{},
		BanditState: &pb.BanditState{
			StrategyWeights: map[string]float64{},
			StrategyCounts:  map[string]int32{},
			StrategyRewards: map[string]float64{},
			ExplorationRate: 0.1,
		},
		ConsecutiveDays:  0,
		TotalStudyTimeMs: 0,
		Version:          1,
		LastUpdated:      timestamppb.Now(),
	}

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

	// TODO: Implement actual mastery retrieval
	// For now, return placeholder values
	return &pb.GetTopicMasteryResponse{
		Mastery:       0.7,
		Confidence:    0.8,
		PracticeCount: 25,
		LastPracticed: timestamppb.New(time.Now().AddDate(0, 0, -1)),
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
