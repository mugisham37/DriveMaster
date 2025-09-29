export interface NotificationPreferences {
  enablePushNotifications: boolean
  enableEmailNotifications: boolean
  enableSMSNotifications: boolean
  studyReminders: boolean
  achievementNotifications: boolean
  socialNotifications: boolean
  streakReminders: boolean
  quietHours: {
    enabled: boolean
    startTime: string // HH:MM format
    endTime: string // HH:MM format
    timezone: string
  }
  frequency: {
    studyReminders: 'never' | 'daily' | 'twice_daily' | 'custom'
    achievementNotifications: 'immediate' | 'daily_digest' | 'weekly_digest'
    socialNotifications: 'immediate' | 'hourly' | 'daily_digest'
  }
}

export interface UserActivityPattern {
  userId: string
  peakHours: number[] // Hours of day (0-23) when user is most active
  preferredDays: number[] // Days of week (0-6) when user is most active
  averageSessionDuration: number // in minutes
  lastActiveTime: Date
  timezone: string
  studyStreak: number
  totalSessions: number
}

export interface NotificationContext {
  userId: string
  type: NotificationType
  priority: NotificationPriority
  content: NotificationContent
  scheduledFor?: Date
  expiresAt?: Date
  metadata?: Record<string, any>
}

export interface NotificationContent {
  title: string
  body: string
  actionUrl?: string
  imageUrl?: string
  customData?: Record<string, any>
}

export enum NotificationType {
  STUDY_REMINDER = 'study_reminder',
  STREAK_REMINDER = 'streak_reminder',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  FRIEND_CHALLENGE = 'friend_challenge',
  PROGRESS_MILESTONE = 'progress_milestone',
  COMEBACK_BONUS = 'comeback_bonus',
  PERSONALIZED_TIP = 'personalized_tip',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationSchedule {
  id: string
  userId: string
  notificationId: string
  scheduledFor: Date
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  retryCount: number
  maxRetries: number
  createdAt: Date
  updatedAt: Date
}

export interface NotificationDeliveryResult {
  success: boolean
  deliveryId?: string
  error?: string
  timestamp: Date
  platform: 'push' | 'email' | 'sms'
}

export interface EngagementMetrics {
  notificationId: string
  userId: string
  delivered: boolean
  opened: boolean
  clicked: boolean
  actionTaken: boolean
  deliveryTime: Date
  openTime?: Date
  clickTime?: Date
  actionTime?: Date
  platform: 'push' | 'email' | 'sms'
}

export interface OptimalTiming {
  recommendedTime: Date
  confidence: number
  reasoning: string
  alternativeTimes: Date[]
}

export interface NotificationTemplate {
  id: string
  type: NotificationType
  title: string
  body: string
  variables: string[]
  personalizationRules: PersonalizationRule[]
  isActive: boolean
}

export interface PersonalizationRule {
  condition: string
  titleModifier?: string
  bodyModifier?: string
  priority?: NotificationPriority
  timing?: 'immediate' | 'optimal' | 'delayed'
}
