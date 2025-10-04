package handlers

import (
	"context"
	"fmt"
	"strings"

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

type UserHandler struct {
	pb.UnimplementedUserServiceServer
	userService     service.UserService
	progressService service.ProgressService
}

func NewUserHandler(userService service.UserService, progressService service.ProgressService) *UserHandler {
	return &UserHandler{
		userService:     userService,
		progressService: progressService,
	}
}

func (h *UserHandler) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "GetUser")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	user, err := h.userService.GetUser(ctx, userID)
	if err != nil {
		if err == models.ErrUserNotFound {
			return nil, status.Errorf(codes.NotFound, "user not found")
		}
		log.WithError(err).Error("Failed to get user")
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}

	pbUser, err := h.modelUserToPB(user)
	if err != nil {
		log.WithError(err).Error("Failed to convert user to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert user: %v", err)
	}

	return &pb.GetUserResponse{User: pbUser}, nil
}

func (h *UserHandler) UpdateUser(ctx context.Context, req *pb.UpdateUserRequest) (*pb.UpdateUserResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "UpdateUser")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	// Build update object
	update := &models.UserUpdate{}

	if req.Timezone != nil {
		update.Timezone = req.Timezone
	}

	if req.Language != nil {
		update.Language = req.Language
	}

	if req.Preferences != nil {
		prefsMap := req.Preferences.AsMap()
		update.Preferences = &prefsMap
	}

	// Get current user to get version for optimistic locking
	currentUser, err := h.userService.GetUser(ctx, userID)
	if err != nil {
		if err == models.ErrUserNotFound {
			return nil, status.Errorf(codes.NotFound, "user not found")
		}
		log.WithError(err).Error("Failed to get current user for version")
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}

	update.Version = currentUser.Version

	user, err := h.userService.UpdateUser(ctx, userID, update)
	if err != nil {
		if err == models.ErrUserNotFound {
			return nil, status.Errorf(codes.NotFound, "user not found")
		}
		if err == models.ErrOptimisticLock {
			return nil, status.Errorf(codes.Aborted, "user was modified by another process, please retry")
		}
		log.WithError(err).Error("Failed to update user")
		return nil, status.Errorf(codes.Internal, "failed to update user: %v", err)
	}

	pbUser, err := h.modelUserToPB(user)
	if err != nil {
		log.WithError(err).Error("Failed to convert updated user to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert user: %v", err)
	}

	return &pb.UpdateUserResponse{User: pbUser}, nil
}

func (h *UserHandler) GetUserPreferences(ctx context.Context, req *pb.GetUserPreferencesRequest) (*pb.GetUserPreferencesResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "GetUserPreferences")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	prefs, err := h.userService.GetUserPreferences(ctx, userID)
	if err != nil {
		if err == models.ErrUserNotFound {
			return nil, status.Errorf(codes.NotFound, "user not found")
		}
		log.WithError(err).Error("Failed to get user preferences")
		return nil, status.Errorf(codes.Internal, "failed to get preferences: %v", err)
	}

	pbPrefs, err := h.modelPreferencesToPB(prefs)
	if err != nil {
		log.WithError(err).Error("Failed to convert preferences to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert preferences: %v", err)
	}

	return &pb.GetUserPreferencesResponse{Preferences: pbPrefs}, nil
}

func (h *UserHandler) UpdatePreferences(ctx context.Context, req *pb.UpdatePreferencesRequest) (*pb.UpdatePreferencesResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "UpdatePreferences")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	prefsMap := req.Preferences.AsMap()
	prefs, err := h.userService.UpdatePreferences(ctx, userID, prefsMap)
	if err != nil {
		if err == models.ErrUserNotFound {
			return nil, status.Errorf(codes.NotFound, "user not found")
		}
		log.WithError(err).Error("Failed to update preferences")
		return nil, status.Errorf(codes.Internal, "failed to update preferences: %v", err)
	}

	pbPrefs, err := h.modelPreferencesToPB(prefs)
	if err != nil {
		log.WithError(err).Error("Failed to convert updated preferences to protobuf")
		return nil, status.Errorf(codes.Internal, "failed to convert preferences: %v", err)
	}

	return &pb.UpdatePreferencesResponse{Preferences: pbPrefs}, nil
}

func (h *UserHandler) DeactivateUser(ctx context.Context, req *pb.DeactivateUserRequest) (*pb.DeactivateUserResponse, error) {
	log := logger.WithContext(ctx).WithField("method", "DeactivateUser")

	userID, err := validation.ValidateUserID(req.UserId)
	if err != nil {
		log.WithError(err).Error("Invalid user ID")
		return nil, status.Errorf(codes.InvalidArgument, "invalid user ID: %v", err)
	}

	err = h.userService.DeactivateUser(ctx, userID, req.Reason)
	if err != nil {
		if err == models.ErrUserNotFound {
			return nil, status.Errorf(codes.NotFound, "user not found")
		}
		log.WithError(err).Error("Failed to deactivate user")
		return nil, status.Errorf(codes.Internal, "failed to deactivate user: %v", err)
	}

	return &pb.DeactivateUserResponse{Success: true}, nil
}

// Additional user management methods will be added when protobuf definitions are updated

func (h *UserHandler) HealthCheck(ctx context.Context, req *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
	return &pb.HealthCheckResponse{
		Status:    "healthy",
		Timestamp: timestamppb.Now(),
	}, nil
}

// Helper functions to convert between models and protobuf

func (h *UserHandler) modelUserToPB(user *models.User) (*pb.User, error) {
	prefsStruct, err := structpb.NewStruct(user.Preferences)
	if err != nil {
		return nil, fmt.Errorf("failed to convert preferences to struct: %w", err)
	}

	return &pb.User{
		Id:            user.ID.String(),
		Email:         user.Email,
		EmailVerified: user.EmailVerified,
		CountryCode:   user.CountryCode,
		Timezone:      user.Timezone,
		Language:      user.Language,
		Preferences:   prefsStruct,
		UserRole:      user.UserRole,
		MfaEnabled:    user.MFAEnabled,
		GdprConsent:   user.GDPRConsent,
		CreatedAt:     timestamppb.New(user.CreatedAt),
		UpdatedAt:     timestamppb.New(user.UpdatedAt),
		LastActiveAt:  timestamppb.New(user.LastActiveAt),
		IsActive:      user.IsActive,
	}, nil
}

func (h *UserHandler) modelPreferencesToPB(prefs *models.UserPreferences) (*pb.UserPreferences, error) {
	prefsStruct, err := structpb.NewStruct(prefs.Preferences)
	if err != nil {
		return nil, fmt.Errorf("failed to convert preferences to struct: %w", err)
	}

	return &pb.UserPreferences{
		UserId:      prefs.UserID.String(),
		Preferences: prefsStruct,
		UpdatedAt:   timestamppb.New(prefs.UpdatedAt),
	}, nil
}

// Validation helpers

func (h *UserHandler) validateUserID(userIDStr string) (uuid.UUID, error) {
	if userIDStr == "" {
		return uuid.Nil, fmt.Errorf("user ID is required")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid user ID format: %w", err)
	}

	return userID, nil
}

func (h *UserHandler) validateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email is required")
	}

	// Basic email validation - in production, use a proper email validation library
	if len(email) < 3 || !strings.Contains(email, "@") {
		return fmt.Errorf("invalid email format")
	}

	return nil
}

func (h *UserHandler) validateCountryCode(countryCode string) error {
	if countryCode == "" {
		return fmt.Errorf("country code is required")
	}

	if len(countryCode) != 2 {
		return fmt.Errorf("country code must be 2 characters")
	}

	return nil
}
