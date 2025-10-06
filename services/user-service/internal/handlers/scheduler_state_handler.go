package handlers

import (
	"context"

	"user-service/internal/service"

	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// SchedulerStateHandler handles gRPC requests for scheduler state management
// NOTE: This is a stub implementation because SchedulerStateService protobuf types
// are not generated. Run `protoc` with the proto file to generate the missing types.
type SchedulerStateHandler struct {
	schedulerStateService service.SchedulerStateService
	logger                *logrus.Logger
}

// NewSchedulerStateHandler creates a new scheduler state handler
func NewSchedulerStateHandler(schedulerStateService service.SchedulerStateService) *SchedulerStateHandler {
	return &SchedulerStateHandler{
		schedulerStateService: schedulerStateService,
		logger:                logrus.New(),
	}
}

// Stub methods that return "not implemented" until protobuf types are generated
// These methods have generic signatures to avoid compilation errors

func (h *SchedulerStateHandler) GetSchedulerState(ctx context.Context, req interface{}) (interface{}, error) {
	h.logger.Warn("GetSchedulerState called but SchedulerStateService protobuf types are not generated")
	return nil, status.Errorf(codes.Unimplemented, "SchedulerStateService protobuf types not generated - run protoc to generate missing types")
}

func (h *SchedulerStateHandler) CreateSchedulerState(ctx context.Context, req interface{}) (interface{}, error) {
	h.logger.Warn("CreateSchedulerState called but SchedulerStateService protobuf types are not generated")
	return nil, status.Errorf(codes.Unimplemented, "SchedulerStateService protobuf types not generated - run protoc to generate missing types")
}

func (h *SchedulerStateHandler) UpdateSM2State(ctx context.Context, req interface{}) (interface{}, error) {
	h.logger.Warn("UpdateSM2State called but SchedulerStateService protobuf types are not generated")
	return nil, status.Errorf(codes.Unimplemented, "SchedulerStateService protobuf types not generated - run protoc to generate missing types")
}

func (h *SchedulerStateHandler) UpdateBKTState(ctx context.Context, req interface{}) (interface{}, error) {
	h.logger.Warn("UpdateBKTState called but SchedulerStateService protobuf types are not generated")
	return nil, status.Errorf(codes.Unimplemented, "SchedulerStateService protobuf types not generated - run protoc to generate missing types")
}

func (h *SchedulerStateHandler) UpdateAbility(ctx context.Context, req interface{}) (interface{}, error) {
	h.logger.Warn("UpdateAbility called but SchedulerStateService protobuf types are not generated")
	return nil, status.Errorf(codes.Unimplemented, "SchedulerStateService protobuf types not generated - run protoc to generate missing types")
}

func (h *SchedulerStateHandler) StartSession(ctx context.Context, req interface{}) (interface{}, error) {
	h.logger.Warn("StartSession called but SchedulerStateService protobuf types are not generated")
	return nil, status.Errorf(codes.Unimplemented, "SchedulerStateService protobuf types not generated - run protoc to generate missing types")
}

func (h *SchedulerStateHandler) EndSession(ctx context.Context, req interface{}) (interface{}, error) {
	h.logger.Warn("EndSession called but SchedulerStateService protobuf types are not generated")
	return nil, status.Errorf(codes.Unimplemented, "SchedulerStateService protobuf types not generated - run protoc to generate missing types")
}

func (h *SchedulerStateHandler) CreateBackup(ctx context.Context, req interface{}) (interface{}, error) {
	h.logger.Warn("CreateBackup called but SchedulerStateService protobuf types are not generated")
	return nil, status.Errorf(codes.Unimplemented, "SchedulerStateService protobuf types not generated - run protoc to generate missing types")
}

func (h *SchedulerStateHandler) RestoreFromBackup(ctx context.Context, req interface{}) (interface{}, error) {
	h.logger.Warn("RestoreFromBackup called but SchedulerStateService protobuf types are not generated")
	return nil, status.Errorf(codes.Unimplemented, "SchedulerStateService protobuf types not generated - run protoc to generate missing types")
}

// TODO: Once protobuf types are generated, replace this file with proper implementation
// The proper implementation should:
// 1. Import the generated pb types
// 2. Embed pb.UnimplementedSchedulerStateServiceServer
// 3. Implement all methods with proper request/response types
// 4. Add proper validation and error handling
// 5. Convert between internal models and protobuf messages