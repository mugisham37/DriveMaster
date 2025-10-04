package handlers

import (
	"context"

	"user-service/internal/logger"
	"user-service/internal/models"
	"user-service/internal/service"
	"user-service/internal/validation"
	pb "user-service/proto"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type SchedulerStateHandler struct {
	pb.UnimplementedSchedulerStateServiceServer
	schedulerStateService service.SchedulerStateService
}

func NewSchedulerStateHandler(schedulerStateService service.SchedulerStateService) *SchedulerStateHandler {
	return &SchedulerStateHandler{
		schedulerStateService: schedulerStateService,
	}
}

func (h *SchedulerStateHandler) GetSchedulerState(ctx context.Context, req *pb.GetSchedulerStateRequest) (*pb.GetSchedulerStateResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "GetSchedulerState")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	state, err := h.schedulerStateService.GetSchedulerState(ctx, userID)
	if err != nil {
		if err == models.ErrSchedulerStateNotFound {
			return nil, status.Errorf(codes.NotFound, "scheduler state not found")
		}
		log.WithError(err).Error("Failed to get scheduler state")
		return nil, status.Errorf(codes.Internal, "failed to get scheduler state: %v", err)
	}

	pbState, err := h.convertSchedulerStateToPB(state)
	if err != nil {
		log.WithError(err).Error("Failed to convert scheduler state to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert scheduler state")
	}

	return &pb.GetSchedulerStateResponse{
		State: pbState,
	}, nil
}

func (h *SchedulerStateHandler) CreateSchedulerState(ctx context.Context, req *pb.CreateSchedulerStateRequest) (*pb.CreateSchedulerStateResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "CreateSchedulerState")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	state, err := h.schedulerStateService.CreateSchedulerState(ctx, userID)
	if err != nil {
		log.WithError(err).Error("Failed to create scheduler state")
		return nil, status.Errorf(codes.Internal, "failed to create scheduler state: %v", err)
	}

	pbState, err := h.convertSchedulerStateToPB(state)
	if err != nil {
		log.WithError(err).Error("Failed to convert scheduler state to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert scheduler state")
	}

	return &pb.CreateSchedulerStateResponse{
		State: pbState,
	}, nil
}

func (h *SchedulerStateHandler) UpdateSM2State(ctx context.Context, req *pb.UpdateSM2StateRequest) (*pb.UpdateSM2StateResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "UpdateSM2State")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	if req.ItemId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "item ID is required")
	}

	if req.Quality < 0 || req.Quality > 5 {
		return nil, status.Errorf(codes.InvalidArgument, "quality must be between 0 and 5")
	}

	state, err := h.schedulerStateService.UpdateSM2State(ctx, userID, req.ItemId, int(req.Quality))
	if err != nil {
		log.WithError(err).Error("Failed to update SM2 state")
		return nil, status.Errorf(codes.Internal, "failed to update SM2 state: %v", err)
	}

	pbState, err := h.convertSchedulerStateToPB(state)
	if err != nil {
		log.WithError(err).Error("Failed to convert scheduler state to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert scheduler state")
	}

	return &pb.UpdateSM2StateResponse{
		State: pbState,
	}, nil
}

func (h *SchedulerStateHandler) UpdateBKTState(ctx context.Context, req *pb.UpdateBKTStateRequest) (*pb.UpdateBKTStateResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "UpdateBKTState")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	if req.Topic == "" {
		return nil, status.Errorf(codes.InvalidArgument, "topic is required")
	}

	state, err := h.schedulerStateService.UpdateBKTState(ctx, userID, req.Topic, req.Correct)
	if err != nil {
		log.WithError(err).Error("Failed to update BKT state")
		return nil, status.Errorf(codes.Internal, "failed to update BKT state: %v", err)
	}

	pbState, err := h.convertSchedulerStateToPB(state)
	if err != nil {
		log.WithError(err).Error("Failed to convert scheduler state to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert scheduler state")
	}

	return &pb.UpdateBKTStateResponse{
		State: pbState,
	}, nil
}

func (h *SchedulerStateHandler) UpdateAbility(ctx context.Context, req *pb.UpdateAbilityRequest) (*pb.UpdateAbilityResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "UpdateAbility")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	if req.Topic == "" {
		return nil, status.Errorf(codes.InvalidArgument, "topic is required")
	}

	state, err := h.schedulerStateService.UpdateAbility(ctx, userID, req.Topic, req.Ability, req.Confidence)
	if err != nil {
		log.WithError(err).Error("Failed to update ability")
		return nil, status.Errorf(codes.Internal, "failed to update ability: %v", err)
	}

	pbState, err := h.convertSchedulerStateToPB(state)
	if err != nil {
		log.WithError(err).Error("Failed to convert scheduler state to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert scheduler state")
	}

	return &pb.UpdateAbilityResponse{
		State: pbState,
	}, nil
}

func (h *SchedulerStateHandler) StartSession(ctx context.Context, req *pb.StartSessionRequest) (*pb.StartSessionResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "StartSession")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	sessionID, err := uuid.Parse(req.SessionId)
	if err != nil {
		log.WithError(err).Error("Invalid session ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid session ID: %v", err)
	}

	state, err := h.schedulerStateService.StartSession(ctx, userID, sessionID)
	if err != nil {
		log.WithError(err).Error("Failed to start session")
		return nil, status.Errorf(codes.Internal, "failed to start session: %v", err)
	}

	pbState, err := h.convertSchedulerStateToPB(state)
	if err != nil {
		log.WithError(err).Error("Failed to convert scheduler state to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert scheduler state")
	}

	return &pb.StartSessionResponse{
		State: pbState,
	}, nil
}

func (h *SchedulerStateHandler) EndSession(ctx context.Context, req *pb.EndSessionRequest) (*pb.EndSessionResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "EndSession")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	if req.StudyTimeMs < 0 {
		return nil, status.Errorf(codes.InvalidArgument, "study time cannot be negative")
	}

	state, err := h.schedulerStateService.EndSession(ctx, userID, req.StudyTimeMs)
	if err != nil {
		log.WithError(err).Error("Failed to end session")
		return nil, status.Errorf(codes.Internal, "failed to end session: %v", err)
	}

	pbState, err := h.convertSchedulerStateToPB(state)
	if err != nil {
		log.WithError(err).Error("Failed to convert scheduler state to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert scheduler state")
	}

	return &pb.EndSessionResponse{
		State: pbState,
	}, nil
}

func (h *SchedulerStateHandler) CreateBackup(ctx context.Context, req *pb.CreateBackupRequest) (*pb.CreateBackupResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "CreateBackup")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	backup, err := h.schedulerStateService.CreateBackup(ctx, userID, req.Reason)
	if err != nil {
		log.WithError(err).Error("Failed to create backup")
		return nil, status.Errorf(codes.Internal, "failed to create backup: %v", err)
	}

	return &pb.CreateBackupResponse{
		BackupId:  backup.ID.String(),
		CreatedAt: timestamppb.New(backup.CreatedAt),
	}, nil
}

func (h *SchedulerStateHandler) RestoreFromBackup(ctx context.Context, req *pb.RestoreFromBackupRequest) (*pb.RestoreFromBackupResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "RestoreFromBackup")

	backupID, err := uuid.Parse(req.BackupId)
	if err != nil {
		log.WithError(err).Error("Invalid backup ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid backup ID: %v", err)
	}

	state, err := h.schedulerStateService.RestoreFromBackup(ctx, backupID)
	if err != nil {
		log.WithError(err).Error("Failed to restore from backup")
		return nil, status.Errorf(codes.Internal, "failed to restore from backup: %v", err)
	}

	pbState, err := h.convertSchedulerStateToPB(state)
	if err != nil {
		log.WithError(err).Error("Failed to convert scheduler state to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert scheduler state")
	}

	return &pb.RestoreFromBackupResponse{
		State: pbState,
	}, nil
}

// Helper function to convert scheduler state to protobuf
func (h *SchedulerStateHandler) convertSchedulerStateToPB(state *models.UserSchedulerState) (*pb.SchedulerState, error) {
	// Convert ability vector
	abilityVector, err := structpb.NewStruct(convertFloatMapToAny(state.AbilityVector))
	if err != nil {
		return nil, err
	}

	// Convert ability confidence
	abilityConfidence, err := structpb.NewStruct(convertFloatMapToAny(state.AbilityConfidence))
	if err != nil {
		return nil, err
	}

	// Convert SM2 states
	sm2StatesMap := make(map[string]any)
	for itemID, sm2State := range state.SM2States {
		sm2Data := map[string]any{
			"easiness_factor": sm2State.EasinessFactor,
			"interval":        sm2State.Interval,
			"repetition":      sm2State.Repetition,
			"next_due":        sm2State.NextDue.Unix(),
			"last_reviewed":   sm2State.LastReviewed.Unix(),
			"quality":         sm2State.Quality,
		}
		sm2StatesMap[itemID] = sm2Data
	}
	sm2States, err := structpb.NewStruct(sm2StatesMap)
	if err != nil {
		return nil, err
	}

	// Convert BKT states
	bktStatesMap := make(map[string]any)
	for topic, bktState := range state.BKTStates {
		bktData := map[string]any{
			"prob_knowledge": bktState.ProbKnowledge,
			"prob_guess":     bktState.ProbGuess,
			"prob_slip":      bktState.ProbSlip,
			"prob_learn":     bktState.ProbLearn,
			"last_updated":   bktState.LastUpdated.Unix(),
		}
		bktStatesMap[topic] = bktData
	}
	bktStates, err := structpb.NewStruct(bktStatesMap)
	if err != nil {
		return nil, err
	}

	// Convert bandit state
	var banditState *structpb.Struct
	if state.BanditState != nil {
		banditData := map[string]any{
			"strategy_weights": convertFloatMapToAny(state.BanditState.StrategyWeights),
			"exploration_rate": state.BanditState.ExplorationRate,
			"total_reward":     state.BanditState.TotalReward,
			"total_attempts":   state.BanditState.TotalAttempts,
			"last_updated":     state.BanditState.LastUpdated.Unix(),
		}
		banditState, err = structpb.NewStruct(banditData)
		if err != nil {
			return nil, err
		}
	}

	pbState := &pb.SchedulerState{
		UserId:            state.UserID.String(),
		AbilityVector:     abilityVector,
		AbilityConfidence: abilityConfidence,
		Sm2States:         sm2States,
		BktStates:         bktStates,
		BanditState:       banditState,
		ConsecutiveDays:   int32(state.ConsecutiveDays),
		TotalStudyTimeMs:  state.TotalStudyTimeMs,
		Version:           int32(state.Version),
		LastUpdated:       timestamppb.New(state.LastUpdated),
		CreatedAt:         timestamppb.New(state.CreatedAt),
	}

	if state.CurrentSessionID != nil {
		pbState.CurrentSessionId = state.CurrentSessionID.String()
	}

	if state.LastSessionEnd != nil {
		pbState.LastSessionEnd = timestamppb.New(*state.LastSessionEnd)
	}

	return pbState, nil
}

// Helper function to convert float64 map to any map
func convertFloatMapToAny(floatMap map[string]float64) map[string]any {
	anyMap := make(map[string]any)
	for k, v := range floatMap {
		anyMap[k] = v
	}
	return anyMap
}
