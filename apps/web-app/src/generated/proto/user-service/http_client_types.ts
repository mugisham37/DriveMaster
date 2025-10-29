// HTTP REST API endpoint interfaces for user-service
// This file is auto-generated. Do not edit manually.

import type {
  UserProfile,
  UserPreferences,
  SkillMastery,
  ProgressSummary,
  ActivityRecord,
  ActivitySummary,
  EngagementMetrics,
  ActivityInsight,
  ActivityRecommendation,
  GDPRExportResponse,
  GDPRDeleteResponse,
  ConsentPreferences,
  PrivacyReport,
  ServiceHealthStatus,
  ServiceInfo,
  UserServiceError,
  DateRange
} from '../../../types/user-service';

// ============================================================================
// HTTP Request/Response Types
// ============================================================================

export interface HttpResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: UserServiceError;
  message?: string;
  timestamp: string;
  correlationId?: string;
}

export interface PaginatedResponse<T> extends HttpResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// User Profile Endpoints
// ============================================================================

export interface GetUserProfileRequest {
  userId: string;
}

export type GetUserProfileResponse = HttpResponse<UserProfile>;

export interface UpdateUserProfileRequest {
  userId: string;
  timezone?: string;
  language?: string;
  preferences?: Record<string, unknown>;
  gdprConsent?: boolean;
  version: number;
}

export type UpdateUserProfileResponse = HttpResponse<UserProfile>;

export interface GetUserPreferencesRequest {
  userId: string;
}

export type GetUserPreferencesResponse = HttpResponse<UserPreferences>;

export interface UpdateUserPreferencesRequest {
  userId: string;
  preferences: Record<string, unknown>;
}

export type UpdateUserPreferencesResponse = HttpResponse<UserPreferences>;

export interface DeactivateUserRequest {
  userId: string;
  reason: string;
  confirmationCode?: string;
}

export type DeactivateUserResponse = HttpResponse<{ success: boolean }>;

// ============================================================================
// Progress Tracking Endpoints
// ============================================================================

export interface GetProgressSummaryRequest {
  userId: string;
  includeHistory?: boolean;
  timeRange?: DateRange;
}

export type GetProgressSummaryResponse = HttpResponse<ProgressSummary>;

export interface GetSkillMasteryRequest {
  userId: string;
  topics?: string[];
  includeHistory?: boolean;
}

export type GetSkillMasteryResponse = HttpResponse<SkillMastery[]>;

export interface UpdateSkillMasteryRequest {
  userId: string;
  topic: string;
  mastery: number;
  confidence?: number;
  attempts?: Array<{
    correct: boolean;
    timeTakenMs: number;
    hintsUsed: number;
    quality?: number;
  }>;
}

export type UpdateSkillMasteryResponse = HttpResponse<SkillMastery>;

export interface GetLearningStreakRequest {
  userId: string;
  includeHistory?: boolean;
  days?: number;
}

export type GetLearningStreakResponse = HttpResponse<{
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
  streakStartDate: Date;
  history?: Array<{
    date: Date;
    active: boolean;
    studyTimeMs: number;
  }>;
}>;

export interface GetMilestonesRequest {
  userId: string;
  type?: 'mastery' | 'streak' | 'time' | 'attempts';
  achieved?: boolean;
}

export type GetMilestonesResponse = HttpResponse<Array<{
  id: string;
  type: 'mastery' | 'streak' | 'time' | 'attempts';
  title: string;
  description: string;
  value: number;
  target: number;
  achieved: boolean;
  achievedAt?: Date;
  progress: number;
}>>;

export interface GetWeeklyProgressRequest {
  userId: string;
  weeks: number;
}

export type GetWeeklyProgressResponse = HttpResponse<Array<{
  week: string;
  mastery: number;
  studyTime: number;
  attempts: number;
  accuracy: number;
}>>;

// ============================================================================
// Activity Monitoring Endpoints
// ============================================================================

export interface RecordActivityRequest {
  activity: Omit<ActivityRecord, 'timestamp'> & {
    timestamp?: Date | string;
  };
}

export type RecordActivityResponse = HttpResponse<{ activityId: string }>;

export interface RecordActivitiesBatchRequest {
  activities: Array<Omit<ActivityRecord, 'timestamp'> & {
    timestamp?: Date | string;
  }>;
}

export type RecordActivitiesBatchResponse = HttpResponse<{ activityIds: string[] }>;

export interface GetActivitySummaryRequest {
  userId: string;
  dateRange: DateRange;
  groupBy?: 'day' | 'week' | 'month';
}

export type GetActivitySummaryResponse = HttpResponse<ActivitySummary>;

export interface GetEngagementMetricsRequest {
  userId: string;
  days: number;
}

export type GetEngagementMetricsResponse = HttpResponse<EngagementMetrics>;

export interface GenerateInsightsRequest {
  userId: string;
  categories?: Array<'engagement' | 'performance' | 'behavior'>;
  limit?: number;
}

export type GenerateInsightsResponse = HttpResponse<ActivityInsight[]>;

export interface GenerateRecommendationsRequest {
  userId: string;
  categories?: Array<'study_schedule' | 'content' | 'strategy'>;
  limit?: number;
}

export type GenerateRecommendationsResponse = HttpResponse<ActivityRecommendation[]>;

export interface ApplyRecommendationRequest {
  userId: string;
  recommendationId: string;
  metadata?: Record<string, unknown>;
}

export type ApplyRecommendationResponse = HttpResponse<{ success: boolean }>;

// ============================================================================
// GDPR Compliance Endpoints
// ============================================================================

export interface ExportUserDataRequest {
  userId: string;
  format?: 'json' | 'csv' | 'xml';
  categories?: string[];
}

export type ExportUserDataResponse = HttpResponse<GDPRExportResponse>;

export interface GetExportStatusRequest {
  userId: string;
  requestId: string;
}

export type GetExportStatusResponse = HttpResponse<GDPRExportResponse>;

export interface DownloadExportRequest {
  userId: string;
  requestId: string;
}

export interface DeleteUserDataRequest {
  userId: string;
  reason: string;
  categories?: string[];
  scheduledFor?: Date;
}

export type DeleteUserDataResponse = HttpResponse<GDPRDeleteResponse>;

export interface GetDeletionStatusRequest {
  userId: string;
  requestId: string;
}

export type GetDeletionStatusResponse = HttpResponse<GDPRDeleteResponse>;

export interface UpdateConsentRequest {
  userId: string;
  consent: ConsentPreferences;
}

export type UpdateConsentResponse = HttpResponse<{ success: boolean }>;

export interface GetConsentHistoryRequest {
  userId: string;
  limit?: number;
  offset?: number;
}

export type GetConsentHistoryResponse = PaginatedResponse<{
  id: string;
  userId: string;
  consentType: string;
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}>;

export interface GeneratePrivacyReportRequest {
  userId: string;
  includeHistory?: boolean;
}

export type GeneratePrivacyReportResponse = HttpResponse<PrivacyReport>;

// ============================================================================
// Health and Service Info Endpoints
// ============================================================================

export type HealthCheckRequest = Record<string, never>;

export type HealthCheckResponse = HttpResponse<ServiceHealthStatus>;

export type GetServiceInfoRequest = Record<string, never>;

export type GetServiceInfoResponse = HttpResponse<ServiceInfo>;

// ============================================================================
// HTTP Client Configuration
// ============================================================================

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  interceptors?: {
    request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
    response?: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>;
    error?: (error: unknown) => unknown | Promise<unknown>;
  };
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  timeout?: number;
  retryAttempts?: number;
}

// ============================================================================
// HTTP Endpoint Definitions
// ============================================================================

export const HTTP_ENDPOINTS = {
  // User Profile
  GET_USER_PROFILE: '/api/users/{userId}/profile',
  UPDATE_USER_PROFILE: '/api/users/{userId}/profile',
  GET_USER_PREFERENCES: '/api/users/{userId}/preferences',
  UPDATE_USER_PREFERENCES: '/api/users/{userId}/preferences',
  DEACTIVATE_USER: '/api/users/{userId}/deactivate',

  // Progress Tracking
  GET_PROGRESS_SUMMARY: '/api/users/{userId}/progress',
  GET_SKILL_MASTERY: '/api/users/{userId}/mastery',
  UPDATE_SKILL_MASTERY: '/api/users/{userId}/mastery/{topic}',
  GET_LEARNING_STREAK: '/api/users/{userId}/streak',
  GET_MILESTONES: '/api/users/{userId}/milestones',
  GET_WEEKLY_PROGRESS: '/api/users/{userId}/progress/weekly',

  // Activity Monitoring
  RECORD_ACTIVITY: '/api/users/{userId}/activities',
  RECORD_ACTIVITIES_BATCH: '/api/users/{userId}/activities/batch',
  GET_ACTIVITY_SUMMARY: '/api/users/{userId}/activities/summary',
  GET_ENGAGEMENT_METRICS: '/api/users/{userId}/engagement',
  GENERATE_INSIGHTS: '/api/users/{userId}/insights',
  GENERATE_RECOMMENDATIONS: '/api/users/{userId}/recommendations',
  APPLY_RECOMMENDATION: '/api/users/{userId}/recommendations/{recommendationId}/apply',

  // GDPR Compliance
  EXPORT_USER_DATA: '/api/users/{userId}/gdpr/export',
  GET_EXPORT_STATUS: '/api/users/{userId}/gdpr/export/{requestId}',
  DOWNLOAD_EXPORT: '/api/users/{userId}/gdpr/export/{requestId}/download',
  DELETE_USER_DATA: '/api/users/{userId}/gdpr/delete',
  GET_DELETION_STATUS: '/api/users/{userId}/gdpr/delete/{requestId}',
  UPDATE_CONSENT: '/api/users/{userId}/gdpr/consent',
  GET_CONSENT_HISTORY: '/api/users/{userId}/gdpr/consent/history',
  GENERATE_PRIVACY_REPORT: '/api/users/{userId}/gdpr/report',

  // Health and Service Info
  HEALTH_CHECK: '/api/health',
  SERVICE_INFO: '/api/info'
} as const;

export type HttpEndpoint = typeof HTTP_ENDPOINTS[keyof typeof HTTP_ENDPOINTS];

// ============================================================================
// Utility Types
// ============================================================================

export interface PathParams {
  userId?: string;
  topic?: string;
  requestId?: string;
  recommendationId?: string;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  offset?: number;
  includeHistory?: boolean;
  timeRange?: string;
  topics?: string;
  categories?: string;
  format?: string;
  groupBy?: string;
  days?: number;
  weeks?: number;
  type?: string;
  achieved?: boolean;
}

// Helper function to build URLs with path parameters
export const buildUrl = (endpoint: string, pathParams: PathParams = {}): string => {
  let url = endpoint;
  
  Object.entries(pathParams).forEach(([key, value]) => {
    if (value !== undefined) {
      url = url.replace(`{${key}}`, encodeURIComponent(value.toString()));
    }
  });
  
  return url;
};

// Helper function to build query string
export const buildQueryString = (params: QueryParams = {}): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};