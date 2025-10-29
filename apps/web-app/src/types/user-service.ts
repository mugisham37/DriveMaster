/**
 * TypeScript interfaces for User Service API integration
 * These types match the Go user-service DTOs and response types
 */

// ============================================================================
// Core User Service Types
// ============================================================================

export interface UserProfile {
  id: string
  email: string
  emailVerified: boolean
  countryCode: string
  timezone: string
  language: string
  userRole: 'learner' | 'mentor' | 'admin'
  mfaEnabled: boolean
  gdprConsent: boolean
  createdAt: Date
  updatedAt: Date
  lastActiveAt: Date
  isActive: boolean
  version: number
}

export interface UserUpdateRequest {
  timezone?: string
  language?: string
  preferences?: Record<string, unknown>
  gdprConsent?: boolean
  version: number
}

export interface UserPreferences {
  userId: string
  preferences: PreferencesData
  updatedAt: Date
}

export interface PreferencesData {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: NotificationPreferences
  privacy: PrivacyPreferences
  learning: LearningPreferences
  accessibility: AccessibilityPreferences
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  inApp: boolean
  marketing: boolean
  reminders: boolean
}

export interface PrivacyPreferences {
  profileVisibility: 'public' | 'private' | 'friends'
  activityTracking: boolean
  dataSharing: boolean
  analytics: boolean
}

export interface LearningPreferences {
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  pace: 'slow' | 'normal' | 'fast'
  reminders: boolean
  streakNotifications: boolean
}

export interface AccessibilityPreferences {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  screenReader: boolean
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

export interface ProgressSummary {
  userId: string
  overallMastery: number
  totalTopics: number
  masteredTopics: number
  topicMasteries: Record<string, SkillMastery>
  recentAttempts: AttemptRecord[]
  learningStreak: number
  totalStudyTimeMs: number
  totalAttempts: number
  correctAttempts: number
  accuracyRate: number
  weeklyProgress: WeeklyProgressPoint[]
  topicProgress: TopicProgressPoint[]
  milestones: Milestone[]
  recommendations: string[]
  lastActiveDate: Date
  consecutiveDays: number
  generatedAt: Date
}

export interface SkillMastery {
  userId: string
  topic: string
  mastery: number // 0.0 to 1.0
  confidence: number // 0.0 to 1.0
  lastPracticed: Date
  practiceCount: number
  correctStreak: number
  longestStreak: number
  totalTimeMs: number
  createdAt: Date
  updatedAt: Date
}

export interface AttemptRecord {
  id: string
  userId: string
  itemId: string
  sessionId: string
  selected: Record<string, unknown>
  correct: boolean
  quality?: number
  confidence?: number
  timeTakenMs: number
  hintsUsed: number
  clientAttemptId: string
  deviceType: string
  appVersion: string
  timestamp: Date
  createdAt: Date
}

export interface LearningStreak {
  userId: string
  currentStreak: number
  longestStreak: number
  lastActiveDate: Date
  streakStartDate: Date
}

export interface Milestone {
  id: string
  type: 'mastery' | 'streak' | 'time' | 'attempts'
  title: string
  description: string
  value: number
  target: number
  achieved: boolean
  achievedAt?: Date
  progress: number // 0.0 to 1.0
}

export interface WeeklyProgressPoint {
  week: string
  mastery: number
  studyTime: number
  attempts: number
  accuracy: number
}

export interface TopicProgressPoint {
  topic: string
  mastery: number
  lastPracticed: Date
  practiceCount: number
}

// ============================================================================
// Activity Monitoring Types
// ============================================================================

export type ActivityType = 
  | 'lesson_start' | 'lesson_complete' | 'lesson_abandon'
  | 'exercise_start' | 'exercise_complete' | 'exercise_abandon'
  | 'quiz_start' | 'quiz_complete' | 'quiz_abandon'
  | 'video_start' | 'video_complete' | 'video_pause' | 'video_seek'
  | 'reading_start' | 'reading_complete'
  | 'practice_start' | 'practice_complete' | 'practice' | 'review' | 'assessment'
  | 'login' | 'logout' | 'session_timeout' | 'session_start' | 'session_end'
  | 'profile_update' | 'preferences_update'
  | 'search' | 'navigation' | 'help_request'

export interface ActivityRecord {
  id?: string
  userId: string
  activityType: ActivityType
  sessionId?: string
  itemId?: string
  topicId?: string
  metadata: Record<string, unknown>
  deviceType: string
  appVersion: string
  platform: string
  userAgent: string
  ipAddress: string
  durationMs?: number
  timestamp: Date
}

export interface ActivitySummary {
  userId: string
  dateRange: DateRange
  totalActivities: number
  activityBreakdown: Record<ActivityType, number>
  sessionCount: number
  totalSessionTime: number
  averageSessionTime: number
  deviceBreakdown: Record<string, number>
  platformBreakdown: Record<string, number>
  hourlyDistribution: Record<number, number>
  dailyDistribution: Record<string, number>
  topTopics: TopicActivitySummary[]
  engagementMetrics: EngagementMetrics
  behaviorPatterns: BehaviorPattern[]
  generatedAt: Date
}

export interface EngagementMetrics {
  dailyActiveStreak: number
  weeklyActiveStreak: number
  averageSessionLength: number
  averageSessionDuration: number
  sessionsPerDay: number
  activitiesPerSession: number
  returnRate: number
  engagementScore: number
  churnRisk: 'low' | 'medium' | 'high'
}

export interface ActivityInsight {
  id: string
  userId: string
  type: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  category: 'engagement' | 'performance' | 'behavior' | 'progress' | 'optimization'
  priority: number
  actionable: boolean
  metadata: Record<string, unknown>
  actionItems: string[]
  generatedAt: Date
  expiresAt?: Date
}

export interface ActivityRecommendation {
  id: string
  userId: string
  type: string
  title: string
  description: string
  priority: number // 1-10
  category: 'study_schedule' | 'content' | 'strategy' | 'timing' | 'improvement' | 'engagement'
  estimatedImpact: number
  actionable: boolean
  metadata: Record<string, unknown>
  actions: RecommendationAction[]
  generatedAt: Date
  expiresAt?: Date
  applied: boolean
  appliedAt?: Date
}

export interface RecommendationAction {
  type: 'navigate' | 'schedule' | 'practice' | 'review'
  label: string
  url?: string
  metadata?: Record<string, unknown>
}

export interface TopicActivitySummary {
  topic: string
  activities: number
  timeSpent: number
  lastActivity: Date
  averageScore: number
}

export interface BehaviorPattern {
  pattern: string
  frequency: number
  confidence: number
  description: string
  type: string
  name: string
  metadata: Record<string, unknown>
}

// ============================================================================
// GDPR Compliance Types
// ============================================================================

export interface GDPRExportResponse {
  requestId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  expiresAt?: Date
  createdAt: Date
}

export interface GDPRDeleteResponse {
  requestId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  scheduledFor?: Date
  createdAt: Date
}

export interface ConsentPreferences {
  analytics: boolean
  marketing: boolean
  personalization: boolean
  thirdPartySharing: boolean
  dataRetention: DataRetentionPreference
  communicationChannels: CommunicationPreferences
}

export interface DataRetentionPreference {
  profile: number // days
  activity: number // days
  progress: number // days
}

export interface CommunicationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  inApp: boolean
}

export interface PrivacyReport {
  userId: string
  generatedAt: Date
  dataCategories: DataCategoryReport[]
  processingActivities: ProcessingActivity[]
  thirdPartySharing: ThirdPartySharing[]
  retentionPolicies: RetentionPolicy[]
  userRights: UserRightsStatus
  complianceStatus: ComplianceStatus
}

export interface DataCategoryReport {
  category: string
  dataTypes: string[]
  purpose: string
  legalBasis: string
  retention: string
}

export interface ProcessingActivity {
  activity: string
  purpose: string
  legalBasis: string
  dataTypes: string[]
  recipients: string[]
}

export interface ThirdPartySharing {
  recipient: string
  purpose: string
  dataTypes: string[]
  legalBasis: string
  safeguards: string[]
}

export interface RetentionPolicy {
  dataType: string
  retentionPeriod: string
  deletionMethod: string
}

export interface UserRightsStatus {
  access: boolean
  rectification: boolean
  erasure: boolean
  portability: boolean
  restriction: boolean
  objection: boolean
}

export interface ComplianceStatus {
  overall: 'compliant' | 'non_compliant' | 'partial'
  issues: string[]
  recommendations: string[]
}

// ============================================================================
// Utility Types
// ============================================================================

export interface DateRange {
  start: Date
  end: Date
}

export interface TimeRange {
  days: number
  weeks?: number
  months?: number
}

// ============================================================================
// Error Types
// ============================================================================

export type UserServiceErrorType = 'network' | 'validation' | 'authorization' | 'service' | 'timeout' | 'circuit_breaker'

export interface UserServiceError {
  type: UserServiceErrorType
  message: string
  code?: string
  details?: Record<string, unknown>
  recoverable: boolean
  retryAfter?: number
  correlationId?: string
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailureTime?: Date
  nextAttemptTime?: Date
  successCount: number
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    database: 'healthy' | 'unhealthy'
    redis: 'healthy' | 'unhealthy'
    kafka: 'healthy' | 'unhealthy'
  }
  responseTime: number
  timestamp: Date
}

export interface ServiceInfo {
  name: string
  version: string
  environment: string
  uptime: number
  protocols: {
    http: boolean
    grpc: boolean
  }
  endpoints: {
    health: string
    metrics: string
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface UserServiceConfig {
  httpUrl: string
  grpcUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
  healthCheckInterval: number
  protocolSelection: 'http' | 'grpc' | 'auto'
}

export type ProtocolType = 'http' | 'grpc'

export interface ServiceDiscoveryConfig {
  enabled: boolean
  refreshInterval: number
  fallbackUrls: {
    http: string
    grpc: string
  }
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: UserServiceError
  message?: string
  timestamp: string
}

export type UserProfileResponse = ApiResponse<UserProfile>
export type UserPreferencesResponse = ApiResponse<UserPreferences>
export type ProgressSummaryResponse = ApiResponse<ProgressSummary>
export type SkillMasteryResponse = ApiResponse<SkillMastery[]>
export type ActivitySummaryResponse = ApiResponse<ActivitySummary>
export type EngagementMetricsResponse = ApiResponse<EngagementMetrics>
export type ActivityInsightsResponse = ApiResponse<ActivityInsight[]>
export type ActivityRecommendationsResponse = ApiResponse<ActivityRecommendation[]>
export type HealthResponse = ApiResponse<ServiceHealthStatus>
export type ServiceInfoResponse = ApiResponse<ServiceInfo>

// ============================================================================
// Type Guards
// ============================================================================

export const isUserServiceError = (error: unknown): error is UserServiceError => {
  return typeof error === 'object' && error !== null && 'type' in error && 'message' in error
}

export const isNetworkError = (error: UserServiceError): boolean => error.type === 'network'
export const isValidationError = (error: UserServiceError): boolean => error.type === 'validation'
export const isAuthorizationError = (error: UserServiceError): boolean => error.type === 'authorization'
export const isServiceError = (error: UserServiceError): boolean => error.type === 'service'
export const isTimeoutError = (error: UserServiceError): boolean => error.type === 'timeout'
export const isCircuitBreakerError = (error: UserServiceError): boolean => error.type === 'circuit_breaker'