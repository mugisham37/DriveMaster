/**
 * Notification Service TypeScript Type Definitions
 * Comprehensive types for notification service integration
 */

// ============================================================================
// Core Notification Types
// ============================================================================

export type NotificationType = 
  | 'achievement'
  | 'spaced_repetition'
  | 'streak_reminder'
  | 'mock_test_reminder'
  | 'system'
  | 'mentoring'
  | 'course_update'
  | 'community'
  | 'marketing'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type DeliveryChannel = 'push' | 'email' | 'in_app' | 'sms'

export interface NotificationStatus {
  isRead: boolean
  isDelivered: boolean
  deliveredAt?: Date
  readAt?: Date
  clickedAt?: Date
  dismissedAt?: Date
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, any>
  status: NotificationStatus
  priority: NotificationPriority
  channels: DeliveryChannel[]
  templateId?: string
  templateData?: Record<string, any>
  scheduledFor?: Date
  expiresAt?: Date
  actionUrl?: string
  imageUrl?: string
  iconUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface NotificationList {
  results: Notification[]
  meta: {
    total: number
    unreadCount: number
    hasMore: boolean
    nextCursor?: string
  }
}

export interface NotificationQueryParams {
  userId?: string
  type?: NotificationType | NotificationType[]
  status?: 'read' | 'unread' | 'all'
  priority?: NotificationPriority | NotificationPriority[]
  limit?: number
  cursor?: string
  startDate?: Date
  endDate?: Date
  channels?: DeliveryChannel[]
}

// ============================================================================
// Device Token Management
// ============================================================================

export interface DeviceToken {
  id: string
  userId: string
  token: string
  platform: 'ios' | 'android' | 'web'
  isActive: boolean
  lastUsedAt: Date
  metadata?: DeviceMetadata
  createdAt: Date
  updatedAt: Date
}

export interface DeviceMetadata {
  userAgent?: string
  appVersion?: string
  osVersion?: string
  deviceModel?: string
  browserName?: string
  browserVersion?: string
  timezone?: string
  language?: string
}

export interface DeviceTokenRequest {
  userId: string
  token: string
  platform: 'ios' | 'android' | 'web'
  metadata?: DeviceMetadata
}

export interface DeviceTokenResponse {
  id: string
  success: boolean
  message?: string
}

// ============================================================================
// Notification Templates
// ============================================================================

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  titleTemplate: string
  bodyTemplate: string
  defaultData?: Record<string, any>
  requiredVariables?: string[]
  supportedChannels: DeliveryChannel[]
  isActive: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface RenderedNotification {
  title: string
  body: string
  data?: Record<string, any>
  actionUrl?: string
  imageUrl?: string
  iconUrl?: string
}

export interface TemplateRenderRequest {
  templateId: string
  data: Record<string, any>
  userId?: string
}

// ============================================================================
// Scheduling
// ============================================================================

export interface ScheduledNotification {
  id: string
  userId: string
  templateId?: string
  notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  scheduledFor: Date
  timezone?: string
  isRecurring: boolean
  recurringPattern?: RecurringPattern
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  createdAt: Date
  updatedAt: Date
}

export interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  interval: number
  daysOfWeek?: number[] // 0-6, Sunday = 0
  dayOfMonth?: number
  endDate?: Date
  maxOccurrences?: number
}

export interface ScheduleNotificationRequest {
  userId: string
  templateId?: string
  notification?: Partial<Notification>
  scheduledFor: Date
  timezone?: string
  isRecurring?: boolean
  recurringPattern?: RecurringPattern
}

// ============================================================================
// Analytics and Tracking
// ============================================================================

export interface DeliveryResult {
  success: boolean
  channel: DeliveryChannel
  timestamp: Date
  error?: string
  metadata?: Record<string, any>
}

export interface NotificationAnalytics {
  notificationId: string
  userId: string
  type: NotificationType
  deliveryResults: DeliveryResult[]
  openedAt?: Date
  clickedAt?: Date
  dismissedAt?: Date
  engagementScore: number
  metadata?: Record<string, any>
}

export interface AnalyticsQueryParams {
  userId?: string
  notificationId?: string
  type?: NotificationType | NotificationType[]
  startDate: Date
  endDate: Date
  groupBy?: 'day' | 'week' | 'month' | 'type' | 'channel'
  metrics?: AnalyticsMetric[]
}

export type AnalyticsMetric = 
  | 'delivery_rate'
  | 'open_rate'
  | 'click_rate'
  | 'engagement_score'
  | 'conversion_rate'

export interface AnalyticsData {
  period: string
  metrics: Record<AnalyticsMetric, number>
  breakdown?: Record<string, Record<AnalyticsMetric, number>>
}

// ============================================================================
// Preferences Management
// ============================================================================

export interface NotificationPreferences {
  userId: string
  enabledTypes: NotificationType[]
  quietHours?: QuietHours
  frequency: Record<NotificationType, FrequencySettings>
  channels: Record<NotificationType, DeliveryChannel[]>
  globalSettings: GlobalNotificationSettings
  updatedAt: Date
}

export interface QuietHours {
  enabled: boolean
  start: string // HH:mm format
  end: string   // HH:mm format
  timezone: string
  daysOfWeek?: number[] // 0-6, Sunday = 0
}

export interface FrequencySettings {
  type: 'immediate' | 'batched' | 'daily' | 'weekly' | 'disabled'
  batchInterval?: number // minutes for batched
  dailyTime?: string // HH:mm for daily
  weeklyDay?: number // 0-6 for weekly
  weeklyTime?: string // HH:mm for weekly
}

export interface GlobalNotificationSettings {
  enabled: boolean
  maxPerDay?: number
  maxPerHour?: number
  respectQuietHours: boolean
  allowCriticalOverride: boolean
}

// ============================================================================
// Real-Time Communication
// ============================================================================

export type NotificationEventType = 
  | 'notification.received'
  | 'notification.updated'
  | 'notification.deleted'
  | 'preferences.updated'
  | 'connection.status'

export interface NotificationEvent {
  type: NotificationEventType
  data: any
  timestamp: Date
  correlationId?: string
}

export interface RealtimeNotification extends Notification {
  isRealtime: boolean
  showToast?: boolean
  playSound?: boolean
  vibrate?: boolean
}

export interface WebSocketMessage {
  event: NotificationEventType
  data: any
  timestamp: string
  correlationId?: string
}

export type EventHandler = (data: any) => void

// ============================================================================
// Learning-Specific Notifications
// ============================================================================

export interface AchievementNotificationRequest {
  userId: string
  achievementName: string
  achievementDescription: string
  achievementIcon?: string
  points?: number
  badgeUrl?: string
  shareUrl?: string
}

export interface SpacedRepetitionRequest {
  userId: string
  topicName: string
  itemCount: number
  dueDate: Date
  difficulty: 'easy' | 'medium' | 'hard'
  lastReviewDate?: Date
  nextReviewDate?: Date
}

export interface StreakReminderRequest {
  userId: string
  streakCount: number
  streakType: 'daily' | 'weekly' | 'monthly'
  reminderTime: Date
  motivationalMessage?: string
  streakGoal?: number
}

export interface MockTestReminderRequest {
  userId: string
  testType: string
  testName: string
  passRate: number
  reminderTime: Date
  preparationTips?: string[]
  estimatedDuration?: number
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'
}

// ============================================================================
// Error Handling
// ============================================================================

export type NotificationErrorType = 
  | 'network'
  | 'authentication'
  | 'validation'
  | 'service'
  | 'permission'
  | 'quota'
  | 'template'
  | 'device'
  | 'websocket'

export interface NotificationError {
  type: NotificationErrorType
  message: string
  code?: string
  details?: Record<string, any>
  recoverable: boolean
  retryAfter?: number
  correlationId?: string
  timestamp: Date
}

export interface ErrorContext {
  operation: string
  userId?: string
  notificationId?: string
  retryCount: number
  correlationId?: string
}

export interface ErrorHandlingResult {
  shouldRetry: boolean
  retryDelay?: number
  fallbackAction?: string
  userMessage?: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: NotificationError
  meta?: {
    timestamp: string
    correlationId?: string
    version?: string
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
    nextCursor?: string
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface NotificationServiceClientConfig {
  baseUrl: string
  wsUrl?: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  enableCircuitBreaker: boolean
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
  enableCaching: boolean
  cacheTTL: number
  enableAnalytics: boolean
  vapidPublicKey?: string
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
}

export type CacheType = 'notifications' | 'preferences' | 'templates' | 'deviceTokens' | 'analytics'

// ============================================================================
// Circuit Breaker Types
// ============================================================================

export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState
  failureCount: number
  successCount: number
  lastFailureTime?: Date
  nextRetryTime?: Date
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>