package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
	"user-service/internal/models"
	"user-service/internal/service"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ActivityHandler handles gRPC requests for activity tracking
type ActivityHandler struct {
	activityService service.ActivityService
	logger          *logrus.Logger
}

// NewActivityHandler creates a new activity handler
func NewActivityHandler(activityService service.ActivityService, logger *logrus.Logger) *ActivityHandler {
	return &ActivityHandler{
		activityService: activityService,
		logger:          logger,
	}
}

// RecordActivity records a single user activity
func (h *ActivityHandler) RecordActivity(ctx context.Context, req *RecordActivityRequest) (*RecordActivityResponse, error) {
	// Validate request
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	if req.ActivityType == "" {
		return nil, status.Error(codes.InvalidArgument, "activity_type is required")
	}

	// Parse user ID
	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid user_id format")
	}

	// Create activity model
	activity := &models.UserActivity{
		UserID:       userID,
		ActivityType: models.ActivityType(req.ActivityType),
		DeviceType:   req.DeviceType,
		AppVersion:   req.AppVersion,
		Platform:     req.Platform,
		UserAgent:    req.UserAgent,
		IPAddress:    req.IpAddress,
	}

	// Parse optional fields
	if req.SessionId != "" {
		sessionID, err := uuid.Parse(req.SessionId)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid session_id format")
		}
		activity.SessionID = &sessionID
	}

	if req.ItemId != "" {
		itemID, err := uuid.Parse(req.ItemId)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid item_id format")
		}
		activity.ItemID = &itemID
	}

	if req.TopicId != "" {
		activity.TopicID = &req.TopicId
	}

	if req.DurationMs > 0 {
		duration := int64(req.DurationMs)
		activity.Duration = &duration
	}

	if req.Timestamp != nil {
		activity.Timestamp = req.Timestamp.AsTime()
	}

	// Parse metadata
	if req.Metadata != "" {
		var metadata map[string]interface{}
		if err := json.Unmarshal([]byte(req.Metadata), &metadata); err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid metadata format")
		}
		activity.Metadata = metadata
	}

	// Record the activity
	if err := h.activityService.RecordActivity(ctx, activity); err != nil {
		h.logger.Error("Failed to record activity", "error", err, "user_id", userID)
		return nil, status.Error(codes.Internal, "failed to record activity")
	}

	return &RecordActivityResponse{
		ActivityId: activity.ID.String(),
		Success:    true,
	}, nil
}

// RecordActivitiesBatch records multiple activities in a batch
func (h *ActivityHandler) RecordActivitiesBatch(ctx context.Context, req *RecordActivitiesBatchRequest) (*RecordActivitiesBatchResponse, error) {
	if len(req.Activities) == 0 {
		return nil, status.Error(codes.InvalidArgument, "activities list cannot be empty")
	}

	if len(req.Activities) > 100 {
		return nil, status.Error(codes.InvalidArgument, "batch size cannot exceed 100 activities")
	}

	var activities []models.UserActivity

	// Convert proto activities to models
	for i, protoActivity := range req.Activities {
		if protoActivity.UserId == "" {
			return nil, status.Error(codes.InvalidArgument, fmt.Sprintf("user_id is required for activity %d", i))
		}

		if protoActivity.ActivityType == "" {
			return nil, status.Error(codes.InvalidArgument, fmt.Sprintf("activity_type is required for activity %d", i))
		}

		userID, err := uuid.Parse(protoActivity.UserId)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, fmt.Sprintf("invalid user_id format for activity %d", i))
		}

		activity := models.UserActivity{
			UserID:       userID,
			ActivityType: models.ActivityType(protoActivity.ActivityType),
			DeviceType:   protoActivity.DeviceType,
			AppVersion:   protoActivity.AppVersion,
			Platform:     protoActivity.Platform,
			UserAgent:    protoActivity.UserAgent,
			IPAddress:    protoActivity.IpAddress,
		}

		// Parse optional fields
		if protoActivity.SessionId != "" {
			sessionID, err := uuid.Parse(protoActivity.SessionId)
			if err != nil {
				return nil, status.Error(codes.InvalidArgument, fmt.Sprintf("invalid session_id format for activity %d", i))
			}
			activity.SessionID = &sessionID
		}

		if protoActivity.ItemId != "" {
			itemID, err := uuid.Parse(protoActivity.ItemId)
			if err != nil {
				return nil, status.Error(codes.InvalidArgument, fmt.Sprintf("invalid item_id format for activity %d", i))
			}
			activity.ItemID = &itemID
		}

		if protoActivity.TopicId != "" {
			activity.TopicID = &protoActivity.TopicId
		}

		if protoActivity.DurationMs > 0 {
			duration := int64(protoActivity.DurationMs)
			activity.Duration = &duration
		}

		if protoActivity.Timestamp != nil {
			activity.Timestamp = protoActivity.Timestamp.AsTime()
		}

		// Parse metadata
		if protoActivity.Metadata != "" {
			var metadata map[string]interface{}
			if err := json.Unmarshal([]byte(protoActivity.Metadata), &metadata); err != nil {
				return nil, status.Error(codes.InvalidArgument, fmt.Sprintf("invalid metadata format for activity %d", i))
			}
			activity.Metadata = metadata
		}

		activities = append(activities, activity)
	}

	// Record activities batch
	if err := h.activityService.RecordActivitiesBatch(ctx, activities); err != nil {
		h.logger.Error("Failed to record activities batch", "error", err, "count", len(activities))
		return nil, status.Error(codes.Internal, "failed to record activities batch")
	}

	// Collect activity IDs
	var activityIDs []string
	for _, activity := range activities {
		activityIDs = append(activityIDs, activity.ID.String())
	}

	return &RecordActivitiesBatchResponse{
		ActivityIds: activityIDs,
		Success:     true,
		Count:       int32(len(activities)),
	}, nil
}

// GetUserActivities retrieves activities for a user
func (h *ActivityHandler) GetUserActivities(ctx context.Context, req *GetUserActivitiesRequest) (*GetUserActivitiesResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid user_id format")
	}

	// Build filters
	filters := &models.ActivityFilters{
		UserID: &userID,
		Limit:  int(req.Limit),
		Offset: int(req.Offset),
	}

	if req.ActivityType != "" {
		activityType := models.ActivityType(req.ActivityType)
		filters.ActivityType = &activityType
	}

	if req.SessionId != "" {
		sessionID, err := uuid.Parse(req.SessionId)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid session_id format")
		}
		filters.SessionID = &sessionID
	}

	if req.DateFrom != nil {
		dateFrom := req.DateFrom.AsTime()
		filters.DateFrom = &dateFrom
	}

	if req.DateTo != nil {
		dateTo := req.DateTo.AsTime()
		filters.DateTo = &dateTo
	}

	// Get activities
	activities, err := h.activityService.GetUserActivities(ctx, userID, filters)
	if err != nil {
		h.logger.Error("Failed to get user activities", "error", err, "user_id", userID)
		return nil, status.Error(codes.Internal, "failed to get user activities")
	}

	// Convert to proto format
	var protoActivities []*Activity
	for _, activity := range activities {
		protoActivity := h.convertActivityToProto(&activity)
		protoActivities = append(protoActivities, protoActivity)
	}

	return &GetUserActivitiesResponse{
		Activities: protoActivities,
		Total:      int32(len(protoActivities)),
	}, nil
}

// GetActivitySummary generates an activity summary for a user
func (h *ActivityHandler) GetActivitySummary(ctx context.Context, req *GetActivitySummaryRequest) (*GetActivitySummaryResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid user_id format")
	}

	// Parse date range
	dateRange := models.DateRange{
		Start: time.Now().AddDate(0, 0, -30), // Default to last 30 days
		End:   time.Now(),
	}

	if req.DateFrom != nil {
		dateRange.Start = req.DateFrom.AsTime()
	}

	if req.DateTo != nil {
		dateRange.End = req.DateTo.AsTime()
	}

	// Get activity summary
	summary, err := h.activityService.GetActivitySummary(ctx, userID, dateRange)
	if err != nil {
		h.logger.Error("Failed to get activity summary", "error", err, "user_id", userID)
		return nil, status.Error(codes.Internal, "failed to get activity summary")
	}

	// Convert to proto format
	protoSummary := h.convertActivitySummaryToProto(summary)

	return &GetActivitySummaryResponse{
		Summary: protoSummary,
	}, nil
}

// GetEngagementMetrics retrieves engagement metrics for a user
func (h *ActivityHandler) GetEngagementMetrics(ctx context.Context, req *GetEngagementMetricsRequest) (*GetEngagementMetricsResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid user_id format")
	}

	days := int(req.Days)
	if days <= 0 {
		days = 30 // Default to 30 days
	}

	// Get engagement metrics
	metrics, err := h.activityService.GetEngagementMetrics(ctx, userID, days)
	if err != nil {
		h.logger.Error("Failed to get engagement metrics", "error", err, "user_id", userID)
		return nil, status.Error(codes.Internal, "failed to get engagement metrics")
	}

	// Convert to proto format
	protoMetrics := &EngagementMetrics{
		DailyActiveStreak:    int32(metrics.DailyActiveStreak),
		WeeklyActiveStreak:   int32(metrics.WeeklyActiveStreak),
		AverageSessionLength: metrics.AverageSessionLength,
		SessionsPerDay:       metrics.SessionsPerDay,
		ActivitiesPerSession: metrics.ActivitiesPerSession,
		ReturnRate:           metrics.ReturnRate,
		EngagementScore:      metrics.EngagementScore,
		ChurnRisk:            metrics.ChurnRisk,
	}

	return &GetEngagementMetricsResponse{
		Metrics: protoMetrics,
	}, nil
}

// GetActivityInsights retrieves activity insights for a user
func (h *ActivityHandler) GetActivityInsights(ctx context.Context, req *GetActivityInsightsRequest) (*GetActivityInsightsResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid user_id format")
	}

	// Get insights
	insights, err := h.activityService.GetActivityInsights(ctx, userID)
	if err != nil {
		h.logger.Error("Failed to get activity insights", "error", err, "user_id", userID)
		return nil, status.Error(codes.Internal, "failed to get activity insights")
	}

	// Convert to proto format
	var protoInsights []*ActivityInsight
	for _, insight := range insights {
		protoInsight := h.convertInsightToProto(&insight)
		protoInsights = append(protoInsights, protoInsight)
	}

	return &GetActivityInsightsResponse{
		Insights: protoInsights,
	}, nil
}

// GetActivityRecommendations retrieves activity recommendations for a user
func (h *ActivityHandler) GetActivityRecommendations(ctx context.Context, req *GetActivityRecommendationsRequest) (*GetActivityRecommendationsResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid user_id format")
	}

	// Get recommendations
	recommendations, err := h.activityService.GetActivityRecommendations(ctx, userID)
	if err != nil {
		h.logger.Error("Failed to get activity recommendations", "error", err, "user_id", userID)
		return nil, status.Error(codes.Internal, "failed to get activity recommendations")
	}

	// Convert to proto format
	var protoRecommendations []*ActivityRecommendation
	for _, rec := range recommendations {
		protoRec := h.convertRecommendationToProto(&rec)
		protoRecommendations = append(protoRecommendations, protoRec)
	}

	return &GetActivityRecommendationsResponse{
		Recommendations: protoRecommendations,
	}, nil
}

// GenerateInsights generates new activity insights for a user
func (h *ActivityHandler) GenerateInsights(ctx context.Context, req *GenerateInsightsRequest) (*GenerateInsightsResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid user_id format")
	}

	// Generate insights
	insights, err := h.activityService.GenerateActivityInsights(ctx, userID)
	if err != nil {
		h.logger.Error("Failed to generate activity insights", "error", err, "user_id", userID)
		return nil, status.Error(codes.Internal, "failed to generate activity insights")
	}

	// Convert to proto format
	var protoInsights []*ActivityInsight
	for _, insight := range insights {
		protoInsight := h.convertInsightToProto(&insight)
		protoInsights = append(protoInsights, protoInsight)
	}

	return &GenerateInsightsResponse{
		Insights: protoInsights,
		Count:    int32(len(insights)),
	}, nil
}

// GenerateRecommendations generates new activity recommendations for a user
func (h *ActivityHandler) GenerateRecommendations(ctx context.Context, req *GenerateRecommendationsRequest) (*GenerateRecommendationsResponse, error) {
	if req.UserId == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid user_id format")
	}

	// Generate recommendations
	recommendations, err := h.activityService.GenerateActivityRecommendations(ctx, userID)
	if err != nil {
		h.logger.Error("Failed to generate activity recommendations", "error", err, "user_id", userID)
		return nil, status.Error(codes.Internal, "failed to generate activity recommendations")
	}

	// Convert to proto format
	var protoRecommendations []*ActivityRecommendation
	for _, rec := range recommendations {
		protoRec := h.convertRecommendationToProto(&rec)
		protoRecommendations = append(protoRecommendations, protoRec)
	}

	return &GenerateRecommendationsResponse{
		Recommendations: protoRecommendations,
		Count:           int32(len(recommendations)),
	}, nil
}

// Helper methods for proto conversion

func (h *ActivityHandler) convertActivityToProto(activity *models.UserActivity) *Activity {
	protoActivity := &Activity{
		Id:           activity.ID.String(),
		UserId:       activity.UserID.String(),
		ActivityType: string(activity.ActivityType),
		DeviceType:   activity.DeviceType,
		AppVersion:   activity.AppVersion,
		Platform:     activity.Platform,
		UserAgent:    activity.UserAgent,
		IpAddress:    activity.IPAddress,
		Timestamp:    timestamppb.New(activity.Timestamp),
		CreatedAt:    timestamppb.New(activity.CreatedAt),
	}

	if activity.SessionID != nil {
		protoActivity.SessionId = activity.SessionID.String()
	}

	if activity.ItemID != nil {
		protoActivity.ItemId = activity.ItemID.String()
	}

	if activity.TopicID != nil {
		protoActivity.TopicId = *activity.TopicID
	}

	if activity.Duration != nil {
		protoActivity.DurationMs = int64(*activity.Duration)
	}

	if activity.Metadata != nil {
		metadataJSON, _ := json.Marshal(activity.Metadata)
		protoActivity.Metadata = string(metadataJSON)
	}

	return protoActivity
}

func (h *ActivityHandler) convertActivitySummaryToProto(summary *models.ActivitySummary) *ActivitySummary {
	protoSummary := &ActivitySummary{
		UserId:             summary.UserID.String(),
		TotalActivities:    int32(summary.TotalActivities),
		SessionCount:       int32(summary.SessionCount),
		TotalSessionTime:   summary.TotalSessionTime,
		AverageSessionTime: summary.AverageSessionTime,
		GeneratedAt:        timestamppb.New(summary.GeneratedAt),
	}

	// Convert activity breakdown
	protoSummary.ActivityBreakdown = make(map[string]int32)
	for actType, count := range summary.ActivityBreakdown {
		protoSummary.ActivityBreakdown[string(actType)] = int32(count)
	}

	// Convert device breakdown
	protoSummary.DeviceBreakdown = make(map[string]int32)
	for device, count := range summary.DeviceBreakdown {
		protoSummary.DeviceBreakdown[device] = int32(count)
	}

	// Convert hourly distribution
	protoSummary.HourlyDistribution = make(map[int32]int32)
	for hour, count := range summary.HourlyDistribution {
		protoSummary.HourlyDistribution[int32(hour)] = int32(count)
	}

	// Convert engagement metrics
	protoSummary.EngagementMetrics = &EngagementMetrics{
		DailyActiveStreak:    int32(summary.EngagementMetrics.DailyActiveStreak),
		WeeklyActiveStreak:   int32(summary.EngagementMetrics.WeeklyActiveStreak),
		AverageSessionLength: summary.EngagementMetrics.AverageSessionLength,
		SessionsPerDay:       summary.EngagementMetrics.SessionsPerDay,
		ActivitiesPerSession: summary.EngagementMetrics.ActivitiesPerSession,
		ReturnRate:           summary.EngagementMetrics.ReturnRate,
		EngagementScore:      summary.EngagementMetrics.EngagementScore,
		ChurnRisk:            summary.EngagementMetrics.ChurnRisk,
	}

	return protoSummary
}

func (h *ActivityHandler) convertInsightToProto(insight *models.ActivityInsight) *ActivityInsight {
	protoInsight := &ActivityInsight{
		Id:          insight.ID,
		UserId:      insight.UserID.String(),
		Type:        insight.Type,
		Title:       insight.Title,
		Description: insight.Description,
		Severity:    insight.Severity,
		Category:    insight.Category,
		ActionItems: insight.ActionItems,
		GeneratedAt: timestamppb.New(insight.GeneratedAt),
	}

	if insight.Metadata != nil {
		metadataJSON, _ := json.Marshal(insight.Metadata)
		protoInsight.Metadata = string(metadataJSON)
	}

	if insight.ExpiresAt != nil {
		protoInsight.ExpiresAt = timestamppb.New(*insight.ExpiresAt)
	}

	return protoInsight
}

func (h *ActivityHandler) convertRecommendationToProto(rec *models.ActivityRecommendation) *ActivityRecommendation {
	protoRec := &ActivityRecommendation{
		Id:          rec.ID,
		UserId:      rec.UserID.String(),
		Type:        rec.Type,
		Title:       rec.Title,
		Description: rec.Description,
		Priority:    int32(rec.Priority),
		Category:    rec.Category,
		GeneratedAt: timestamppb.New(rec.GeneratedAt),
		Applied:     rec.Applied,
	}

	if rec.Metadata != nil {
		metadataJSON, _ := json.Marshal(rec.Metadata)
		protoRec.Metadata = string(metadataJSON)
	}

	if rec.ExpiresAt != nil {
		protoRec.ExpiresAt = timestamppb.New(*rec.ExpiresAt)
	}

	if rec.AppliedAt != nil {
		protoRec.AppliedAt = timestamppb.New(*rec.AppliedAt)
	}

	// Convert actions
	for _, action := range rec.Actions {
		protoAction := &RecommendationAction{
			Id:          action.ID,
			Type:        action.Type,
			Title:       action.Title,
			Description: action.Description,
			Url:         action.URL,
		}

		if action.Metadata != nil {
			metadataJSON, _ := json.Marshal(action.Metadata)
			protoAction.Metadata = string(metadataJSON)
		}

		protoRec.Actions = append(protoRec.Actions, protoAction)
	}

	return protoRec
}

// Proto message definitions (these would normally be generated from .proto files)
// Including them here for completeness

type RecordActivityRequest struct {
	UserId       string                 `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	ActivityType string                 `protobuf:"bytes,2,opt,name=activity_type,json=activityType,proto3" json:"activity_type,omitempty"`
	SessionId    string                 `protobuf:"bytes,3,opt,name=session_id,json=sessionId,proto3" json:"session_id,omitempty"`
	ItemId       string                 `protobuf:"bytes,4,opt,name=item_id,json=itemId,proto3" json:"item_id,omitempty"`
	TopicId      string                 `protobuf:"bytes,5,opt,name=topic_id,json=topicId,proto3" json:"topic_id,omitempty"`
	Metadata     string                 `protobuf:"bytes,6,opt,name=metadata,proto3" json:"metadata,omitempty"`
	DeviceType   string                 `protobuf:"bytes,7,opt,name=device_type,json=deviceType,proto3" json:"device_type,omitempty"`
	AppVersion   string                 `protobuf:"bytes,8,opt,name=app_version,json=appVersion,proto3" json:"app_version,omitempty"`
	Platform     string                 `protobuf:"bytes,9,opt,name=platform,proto3" json:"platform,omitempty"`
	UserAgent    string                 `protobuf:"bytes,10,opt,name=user_agent,json=userAgent,proto3" json:"user_agent,omitempty"`
	IpAddress    string                 `protobuf:"bytes,11,opt,name=ip_address,json=ipAddress,proto3" json:"ip_address,omitempty"`
	DurationMs   int64                  `protobuf:"varint,12,opt,name=duration_ms,json=durationMs,proto3" json:"duration_ms,omitempty"`
	Timestamp    *timestamppb.Timestamp `protobuf:"bytes,13,opt,name=timestamp,proto3" json:"timestamp,omitempty"`
}

type RecordActivityResponse struct {
	ActivityId string `protobuf:"bytes,1,opt,name=activity_id,json=activityId,proto3" json:"activity_id,omitempty"`
	Success    bool   `protobuf:"varint,2,opt,name=success,proto3" json:"success,omitempty"`
}

type RecordActivitiesBatchRequest struct {
	Activities []*RecordActivityRequest `protobuf:"bytes,1,rep,name=activities,proto3" json:"activities,omitempty"`
}

type RecordActivitiesBatchResponse struct {
	ActivityIds []string `protobuf:"bytes,1,rep,name=activity_ids,json=activityIds,proto3" json:"activity_ids,omitempty"`
	Success     bool     `protobuf:"varint,2,opt,name=success,proto3" json:"success,omitempty"`
	Count       int32    `protobuf:"varint,3,opt,name=count,proto3" json:"count,omitempty"`
}

type GetUserActivitiesRequest struct {
	UserId       string                 `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	ActivityType string                 `protobuf:"bytes,2,opt,name=activity_type,json=activityType,proto3" json:"activity_type,omitempty"`
	SessionId    string                 `protobuf:"bytes,3,opt,name=session_id,json=sessionId,proto3" json:"session_id,omitempty"`
	DateFrom     *timestamppb.Timestamp `protobuf:"bytes,4,opt,name=date_from,json=dateFrom,proto3" json:"date_from,omitempty"`
	DateTo       *timestamppb.Timestamp `protobuf:"bytes,5,opt,name=date_to,json=dateTo,proto3" json:"date_to,omitempty"`
	Limit        int32                  `protobuf:"varint,6,opt,name=limit,proto3" json:"limit,omitempty"`
	Offset       int32                  `protobuf:"varint,7,opt,name=offset,proto3" json:"offset,omitempty"`
}

type GetUserActivitiesResponse struct {
	Activities []*Activity `protobuf:"bytes,1,rep,name=activities,proto3" json:"activities,omitempty"`
	Total      int32       `protobuf:"varint,2,opt,name=total,proto3" json:"total,omitempty"`
}

type Activity struct {
	Id           string                 `protobuf:"bytes,1,opt,name=id,proto3" json:"id,omitempty"`
	UserId       string                 `protobuf:"bytes,2,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	ActivityType string                 `protobuf:"bytes,3,opt,name=activity_type,json=activityType,proto3" json:"activity_type,omitempty"`
	SessionId    string                 `protobuf:"bytes,4,opt,name=session_id,json=sessionId,proto3" json:"session_id,omitempty"`
	ItemId       string                 `protobuf:"bytes,5,opt,name=item_id,json=itemId,proto3" json:"item_id,omitempty"`
	TopicId      string                 `protobuf:"bytes,6,opt,name=topic_id,json=topicId,proto3" json:"topic_id,omitempty"`
	Metadata     string                 `protobuf:"bytes,7,opt,name=metadata,proto3" json:"metadata,omitempty"`
	DeviceType   string                 `protobuf:"bytes,8,opt,name=device_type,json=deviceType,proto3" json:"device_type,omitempty"`
	AppVersion   string                 `protobuf:"bytes,9,opt,name=app_version,json=appVersion,proto3" json:"app_version,omitempty"`
	Platform     string                 `protobuf:"bytes,10,opt,name=platform,proto3" json:"platform,omitempty"`
	UserAgent    string                 `protobuf:"bytes,11,opt,name=user_agent,json=userAgent,proto3" json:"user_agent,omitempty"`
	IpAddress    string                 `protobuf:"bytes,12,opt,name=ip_address,json=ipAddress,proto3" json:"ip_address,omitempty"`
	DurationMs   int64                  `protobuf:"varint,13,opt,name=duration_ms,json=durationMs,proto3" json:"duration_ms,omitempty"`
	Timestamp    *timestamppb.Timestamp `protobuf:"bytes,14,opt,name=timestamp,proto3" json:"timestamp,omitempty"`
	CreatedAt    *timestamppb.Timestamp `protobuf:"bytes,15,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
}

type GetActivitySummaryRequest struct {
	UserId   string                 `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	DateFrom *timestamppb.Timestamp `protobuf:"bytes,2,opt,name=date_from,json=dateFrom,proto3" json:"date_from,omitempty"`
	DateTo   *timestamppb.Timestamp `protobuf:"bytes,3,opt,name=date_to,json=dateTo,proto3" json:"date_to,omitempty"`
}

type GetActivitySummaryResponse struct {
	Summary *ActivitySummary `protobuf:"bytes,1,opt,name=summary,proto3" json:"summary,omitempty"`
}

type ActivitySummary struct {
	UserId             string                 `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	TotalActivities    int32                  `protobuf:"varint,2,opt,name=total_activities,json=totalActivities,proto3" json:"total_activities,omitempty"`
	ActivityBreakdown  map[string]int32       `protobuf:"bytes,3,rep,name=activity_breakdown,json=activityBreakdown,proto3" json:"activity_breakdown,omitempty"`
	SessionCount       int32                  `protobuf:"varint,4,opt,name=session_count,json=sessionCount,proto3" json:"session_count,omitempty"`
	TotalSessionTime   int64                  `protobuf:"varint,5,opt,name=total_session_time,json=totalSessionTime,proto3" json:"total_session_time,omitempty"`
	AverageSessionTime int64                  `protobuf:"varint,6,opt,name=average_session_time,json=averageSessionTime,proto3" json:"average_session_time,omitempty"`
	DeviceBreakdown    map[string]int32       `protobuf:"bytes,7,rep,name=device_breakdown,json=deviceBreakdown,proto3" json:"device_breakdown,omitempty"`
	HourlyDistribution map[int32]int32        `protobuf:"bytes,8,rep,name=hourly_distribution,json=hourlyDistribution,proto3" json:"hourly_distribution,omitempty"`
	EngagementMetrics  *EngagementMetrics     `protobuf:"bytes,9,opt,name=engagement_metrics,json=engagementMetrics,proto3" json:"engagement_metrics,omitempty"`
	GeneratedAt        *timestamppb.Timestamp `protobuf:"bytes,10,opt,name=generated_at,json=generatedAt,proto3" json:"generated_at,omitempty"`
}

type GetEngagementMetricsRequest struct {
	UserId string `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	Days   int32  `protobuf:"varint,2,opt,name=days,proto3" json:"days,omitempty"`
}

type GetEngagementMetricsResponse struct {
	Metrics *EngagementMetrics `protobuf:"bytes,1,opt,name=metrics,proto3" json:"metrics,omitempty"`
}

type EngagementMetrics struct {
	DailyActiveStreak    int32   `protobuf:"varint,1,opt,name=daily_active_streak,json=dailyActiveStreak,proto3" json:"daily_active_streak,omitempty"`
	WeeklyActiveStreak   int32   `protobuf:"varint,2,opt,name=weekly_active_streak,json=weeklyActiveStreak,proto3" json:"weekly_active_streak,omitempty"`
	AverageSessionLength int64   `protobuf:"varint,3,opt,name=average_session_length,json=averageSessionLength,proto3" json:"average_session_length,omitempty"`
	SessionsPerDay       float64 `protobuf:"fixed64,4,opt,name=sessions_per_day,json=sessionsPerDay,proto3" json:"sessions_per_day,omitempty"`
	ActivitiesPerSession float64 `protobuf:"fixed64,5,opt,name=activities_per_session,json=activitiesPerSession,proto3" json:"activities_per_session,omitempty"`
	ReturnRate           float64 `protobuf:"fixed64,6,opt,name=return_rate,json=returnRate,proto3" json:"return_rate,omitempty"`
	EngagementScore      float64 `protobuf:"fixed64,7,opt,name=engagement_score,json=engagementScore,proto3" json:"engagement_score,omitempty"`
	ChurnRisk            string  `protobuf:"bytes,8,opt,name=churn_risk,json=churnRisk,proto3" json:"churn_risk,omitempty"`
}

type GetActivityInsightsRequest struct {
	UserId string `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
}

type GetActivityInsightsResponse struct {
	Insights []*ActivityInsight `protobuf:"bytes,1,rep,name=insights,proto3" json:"insights,omitempty"`
}

type ActivityInsight struct {
	Id          string                 `protobuf:"bytes,1,opt,name=id,proto3" json:"id,omitempty"`
	UserId      string                 `protobuf:"bytes,2,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	Type        string                 `protobuf:"bytes,3,opt,name=type,proto3" json:"type,omitempty"`
	Title       string                 `protobuf:"bytes,4,opt,name=title,proto3" json:"title,omitempty"`
	Description string                 `protobuf:"bytes,5,opt,name=description,proto3" json:"description,omitempty"`
	Severity    string                 `protobuf:"bytes,6,opt,name=severity,proto3" json:"severity,omitempty"`
	Category    string                 `protobuf:"bytes,7,opt,name=category,proto3" json:"category,omitempty"`
	Metadata    string                 `protobuf:"bytes,8,opt,name=metadata,proto3" json:"metadata,omitempty"`
	ActionItems []string               `protobuf:"bytes,9,rep,name=action_items,json=actionItems,proto3" json:"action_items,omitempty"`
	GeneratedAt *timestamppb.Timestamp `protobuf:"bytes,10,opt,name=generated_at,json=generatedAt,proto3" json:"generated_at,omitempty"`
	ExpiresAt   *timestamppb.Timestamp `protobuf:"bytes,11,opt,name=expires_at,json=expiresAt,proto3" json:"expires_at,omitempty"`
}

type GetActivityRecommendationsRequest struct {
	UserId string `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
}

type GetActivityRecommendationsResponse struct {
	Recommendations []*ActivityRecommendation `protobuf:"bytes,1,rep,name=recommendations,proto3" json:"recommendations,omitempty"`
}

type ActivityRecommendation struct {
	Id          string                  `protobuf:"bytes,1,opt,name=id,proto3" json:"id,omitempty"`
	UserId      string                  `protobuf:"bytes,2,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	Type        string                  `protobuf:"bytes,3,opt,name=type,proto3" json:"type,omitempty"`
	Title       string                  `protobuf:"bytes,4,opt,name=title,proto3" json:"title,omitempty"`
	Description string                  `protobuf:"bytes,5,opt,name=description,proto3" json:"description,omitempty"`
	Priority    int32                   `protobuf:"varint,6,opt,name=priority,proto3" json:"priority,omitempty"`
	Category    string                  `protobuf:"bytes,7,opt,name=category,proto3" json:"category,omitempty"`
	Metadata    string                  `protobuf:"bytes,8,opt,name=metadata,proto3" json:"metadata,omitempty"`
	Actions     []*RecommendationAction `protobuf:"bytes,9,rep,name=actions,proto3" json:"actions,omitempty"`
	GeneratedAt *timestamppb.Timestamp  `protobuf:"bytes,10,opt,name=generated_at,json=generatedAt,proto3" json:"generated_at,omitempty"`
	ExpiresAt   *timestamppb.Timestamp  `protobuf:"bytes,11,opt,name=expires_at,json=expiresAt,proto3" json:"expires_at,omitempty"`
	Applied     bool                    `protobuf:"varint,12,opt,name=applied,proto3" json:"applied,omitempty"`
	AppliedAt   *timestamppb.Timestamp  `protobuf:"bytes,13,opt,name=applied_at,json=appliedAt,proto3" json:"applied_at,omitempty"`
}

type RecommendationAction struct {
	Id          string `protobuf:"bytes,1,opt,name=id,proto3" json:"id,omitempty"`
	Type        string `protobuf:"bytes,2,opt,name=type,proto3" json:"type,omitempty"`
	Title       string `protobuf:"bytes,3,opt,name=title,proto3" json:"title,omitempty"`
	Description string `protobuf:"bytes,4,opt,name=description,proto3" json:"description,omitempty"`
	Url         string `protobuf:"bytes,5,opt,name=url,proto3" json:"url,omitempty"`
	Metadata    string `protobuf:"bytes,6,opt,name=metadata,proto3" json:"metadata,omitempty"`
}

type GenerateInsightsRequest struct {
	UserId string `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
}

type GenerateInsightsResponse struct {
	Insights []*ActivityInsight `protobuf:"bytes,1,rep,name=insights,proto3" json:"insights,omitempty"`
	Count    int32              `protobuf:"varint,2,opt,name=count,proto3" json:"count,omitempty"`
}

type GenerateRecommendationsRequest struct {
	UserId string `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
}

type GenerateRecommendationsResponse struct {
	Recommendations []*ActivityRecommendation `protobuf:"bytes,1,rep,name=recommendations,proto3" json:"recommendations,omitempty"`
	Count           int32                     `protobuf:"varint,2,opt,name=count,proto3" json:"count,omitempty"`
}
