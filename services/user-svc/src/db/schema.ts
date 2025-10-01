import { relations } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  boolean,
  integer,
  real,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core'

// Enums for type safety
export const contentCategoryEnum = pgEnum('content_category', [
  'traffic_signs',
  'road_rules',
  'safety_procedures',
  'situational_judgment',
  'vehicle_operations',
  'parking_maneuvers',
  'hazard_perception',
])

export const eventTypeEnum = pgEnum('event_type', [
  'question_answered',
  'session_started',
  'session_ended',
  'concept_mastered',
  'achievement_unlocked',
  'streak_updated',
  'review_scheduled',
])

export const processingStatusEnum = pgEnum('processing_status', [
  'pending',
  'processing',
  'completed',
  'failed',
])

export const difficultyLevelEnum = pgEnum('difficulty_level', [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'reminder',
  'achievement',
  'social',
  'system',
  'marketing',
])

// Core Types for JSONB fields
export interface CognitivePatterns {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  processingSpeed: number // 0.1 to 2.0
  attentionSpan: number // minutes
  preferredSessionLength: number // minutes
  optimalTimeOfDay: string[] // ['morning', 'afternoon', 'evening']
  difficultyPreference: 'gradual' | 'challenging' | 'mixed'
  feedbackPreference: 'immediate' | 'delayed' | 'summary'
}

export interface LearningPreferences {
  enableNotifications: boolean
  notificationFrequency: 'low' | 'medium' | 'high'
  studyReminders: boolean
  socialFeatures: boolean
  gamificationEnabled: boolean
  preferredLanguage: string
  accessibilityOptions: {
    highContrast: boolean
    largeText: boolean
    screenReader: boolean
    reducedMotion: boolean
  }
}

export interface ContentMetadata {
  tags: string[]
  estimatedTime: number // seconds
  mediaType: 'text' | 'image' | 'video' | 'interactive'
  accessibility: {
    altText?: string
    captions?: boolean
    transcript?: boolean
  }
  lastReviewed: string
  reviewerNotes?: string
}

export interface ResponseData {
  selectedAnswer?: string
  isCorrect: boolean
  responseTime: number // milliseconds
  confidenceLevel?: number // 0-1
  hintsUsed: number
  attemptsCount: number
}

export interface ContextData {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  sessionId: string
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  networkCondition: 'excellent' | 'good' | 'poor' | 'offline'
  batteryLevel?: number
  location?: {
    country: string
    timezone: string
  }
}

// Users table - Core user information and cognitive patterns
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    dateOfBirth: timestamp('date_of_birth'),
    cognitivePatterns: jsonb('cognitive_patterns').$type<CognitivePatterns>(),
    learningPreferences: jsonb('learning_preferences').$type<LearningPreferences>(),
    totalXP: integer('total_xp').default(0),
    currentStreak: integer('current_streak').default(0),
    longestStreak: integer('longest_streak').default(0),
    lastActiveAt: timestamp('last_active_at'),
    isActive: boolean('is_active').default(true),
    emailVerified: boolean('email_verified').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    cognitiveIdx: index('users_cognitive_idx').on(table.cognitivePatterns),
    preferencesIdx: index('users_preferences_idx').on(table.learningPreferences),
    activeUsersIdx: index('users_active_idx').on(table.isActive, table.lastActiveAt),
    xpIdx: index('users_xp_idx').on(table.totalXP),
  }),
)

// Concepts table - Hierarchical knowledge structure
export const concepts = pgTable(
  'concepts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: contentCategoryEnum('category').notNull(),
    parentConceptId: uuid('parent_concept_id'),
    prerequisites: jsonb('prerequisites').$type<string[]>().default([]),
    baseDifficulty: real('base_difficulty').notNull().default(0.5), // 0-1 scale
    estimatedLearningTime: integer('estimated_learning_time'), // minutes
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    keyIdx: uniqueIndex('concepts_key_idx').on(table.key),
    categoryIdx: index('concepts_category_idx').on(table.category),
    parentIdx: index('concepts_parent_idx').on(table.parentConceptId),
    difficultyIdx: index('concepts_difficulty_idx').on(table.baseDifficulty),
    activeConceptsIdx: index('concepts_active_idx').on(table.isActive),
    prerequisitesIdx: index('concepts_prerequisites_idx').on(table.prerequisites),
  }),
)

// Knowledge States table - Bayesian Knowledge Tracing data (partitioned by user_id)
export const knowledgeStates = pgTable(
  'knowledge_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    conceptId: uuid('concept_id')
      .references(() => concepts.id, { onDelete: 'cascade' })
      .notNull(),
    // BKT Parameters
    initialKnowledge: real('initial_knowledge').notNull().default(0.1),
    learningRate: real('learning_rate').notNull().default(0.3),
    guessParameter: real('guess_parameter').notNull().default(0.25),
    slipParameter: real('slip_parameter').notNull().default(0.1),
    masteryProbability: real('mastery_probability').notNull().default(0.1),
    // Temporal factors
    temporalDecay: real('temporal_decay').default(0.95),
    lastInteraction: timestamp('last_interaction'),
    interactionCount: integer('interaction_count').default(0),
    correctCount: integer('correct_count').default(0),
    // Personalization factors
    personalLearningVelocity: real('personal_learning_velocity').default(1.0),
    confidenceLevel: real('confidence_level').default(0.5),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userConceptIdx: uniqueIndex('knowledge_states_user_concept_idx').on(
      table.userId,
      table.conceptId,
    ),
    masteryIdx: index('knowledge_states_mastery_idx').on(table.masteryProbability),
    userMasteryIdx: index('knowledge_states_user_mastery_idx').on(
      table.userId,
      table.masteryProbability,
    ),
    lastInteractionIdx: index('knowledge_states_last_interaction_idx').on(table.lastInteraction),
    conceptMasteryIdx: index('knowledge_states_concept_mastery_idx').on(
      table.conceptId,
      table.masteryProbability,
    ),
  }),
)

// Content table - Learning materials with versioning and IRT parameters
export const content = pgTable(
  'content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conceptId: uuid('concept_id')
      .references(() => concepts.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    category: contentCategoryEnum('category').notNull(),
    // IRT Parameters
    difficulty: real('difficulty').notNull().default(0.0), // -3 to +3 scale
    discrimination: real('discrimination').notNull().default(1.0), // 0.5 to 2.5 scale
    guessParameter: real('guess_parameter').notNull().default(0.25), // 0 to 0.5 scale
    // Content management
    version: integer('version').default(1),
    parentContentId: uuid('parent_content_id'), // For A/B testing variants
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata').$type<ContentMetadata>(),
    // Performance tracking
    totalAttempts: integer('total_attempts').default(0),
    correctAttempts: integer('correct_attempts').default(0),
    averageResponseTime: real('average_response_time'), // milliseconds
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    conceptIdx: index('content_concept_idx').on(table.conceptId),
    categoryDifficultyIdx: index('content_category_difficulty_idx').on(
      table.category,
      table.difficulty,
    ),
    activeContentIdx: index('content_active_idx').on(table.isActive),
    versionIdx: index('content_version_idx').on(table.parentContentId, table.version),
    performanceIdx: index('content_performance_idx').on(table.totalAttempts, table.correctAttempts),
    metadataIdx: index('content_metadata_idx').on(table.metadata),
  }),
)

// Learning Events table - Time-series data (partitioned by timestamp)
export const learningEvents = pgTable(
  'learning_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    sessionId: uuid('session_id').notNull(),
    eventType: eventTypeEnum('event_type').notNull(),
    conceptId: uuid('concept_id').references(() => concepts.id, { onDelete: 'set null' }),
    contentId: uuid('content_id').references(() => content.id, { onDelete: 'set null' }),
    responseData: jsonb('response_data').$type<ResponseData>(),
    contextData: jsonb('context_data').$type<ContextData>(),
    // Analytics fields
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    processingStatus: processingStatusEnum('processing_status').default('pending'),
    processedAt: timestamp('processed_at'),
    // Performance metrics
    sessionPosition: integer('session_position'), // Order within session
    cumulativeTime: integer('cumulative_time'), // Total session time in seconds
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userTimestampIdx: index('learning_events_user_timestamp_idx').on(table.userId, table.timestamp),
    sessionIdx: index('learning_events_session_idx').on(table.sessionId),
    eventTypeIdx: index('learning_events_event_type_idx').on(table.eventType),
    processingIdx: index('learning_events_processing_idx').on(table.processingStatus),
    conceptEventIdx: index('learning_events_concept_event_idx').on(
      table.conceptId,
      table.eventType,
    ),
    timestampPartitionIdx: index('learning_events_timestamp_partition_idx').on(table.timestamp),
    responseDataIdx: index('learning_events_response_data_idx').on(table.responseData),
    contextDataIdx: index('learning_events_context_data_idx').on(table.contextData),
  }),
)

// User Sessions table - Session tracking and analytics
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    sessionId: uuid('session_id').unique().notNull(),
    startTime: timestamp('start_time').defaultNow().notNull(),
    endTime: timestamp('end_time'),
    duration: integer('duration'), // seconds
    questionsAttempted: integer('questions_attempted').default(0),
    questionsCorrect: integer('questions_correct').default(0),
    xpEarned: integer('xp_earned').default(0),
    conceptsStudied: jsonb('concepts_studied').$type<string[]>().default([]),
    deviceInfo: jsonb('device_info').$type<ContextData>(),
    isCompleted: boolean('is_completed').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userSessionIdx: index('user_sessions_user_idx').on(table.userId, table.startTime),
    sessionIdIdx: uniqueIndex('user_sessions_session_id_idx').on(table.sessionId),
    completedSessionsIdx: index('user_sessions_completed_idx').on(table.isCompleted, table.endTime),
    performanceIdx: index('user_sessions_performance_idx').on(
      table.questionsAttempted,
      table.questionsCorrect,
    ),
  }),
)

// Friendships table - Social connections
export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    addresseeId: uuid('addressee_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, accepted, blocked
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    requesterAddresseeIdx: uniqueIndex('friendships_requester_addressee_idx').on(
      table.requesterId,
      table.addresseeId,
    ),
    addresseeRequesterIdx: index('friendships_addressee_requester_idx').on(
      table.addresseeId,
      table.requesterId,
    ),
    statusIdx: index('friendships_status_idx').on(table.status),
  }),
)

// Achievements table - Gamification achievements
export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }).notNull(),
    xpReward: integer('xp_reward').default(0),
    badgeIcon: varchar('badge_icon', { length: 255 }),
    requirements: jsonb('requirements'), // Flexible achievement criteria
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    keyIdx: uniqueIndex('achievements_key_idx').on(table.key),
    categoryIdx: index('achievements_category_idx').on(table.category),
    activeIdx: index('achievements_active_idx').on(table.isActive),
  }),
)

// User Achievements table - User achievement progress
export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    achievementId: uuid('achievement_id')
      .references(() => achievements.id, { onDelete: 'cascade' })
      .notNull(),
    progress: real('progress').default(0), // 0-1 scale
    isCompleted: boolean('is_completed').default(false),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userAchievementIdx: uniqueIndex('user_achievements_user_achievement_idx').on(
      table.userId,
      table.achievementId,
    ),
    userCompletedIdx: index('user_achievements_user_completed_idx').on(
      table.userId,
      table.isCompleted,
    ),
    completedAtIdx: index('user_achievements_completed_at_idx').on(table.completedAt),
  }),
)

// Spaced Repetition table - Review scheduling
export const spacedRepetition = pgTable(
  'spaced_repetition',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    conceptId: uuid('concept_id')
      .references(() => concepts.id, { onDelete: 'cascade' })
      .notNull(),
    interval: integer('interval').notNull().default(1), // days
    repetition: integer('repetition').notNull().default(0),
    easeFactor: real('ease_factor').notNull().default(2.5),
    nextReview: timestamp('next_review').notNull(),
    lastReview: timestamp('last_review'),
    quality: integer('quality'), // 0-5 SuperMemo quality rating
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userConceptIdx: uniqueIndex('spaced_repetition_user_concept_idx').on(
      table.userId,
      table.conceptId,
    ),
    nextReviewIdx: index('spaced_repetition_next_review_idx').on(table.nextReview),
    userNextReviewIdx: index('spaced_repetition_user_next_review_idx').on(
      table.userId,
      table.nextReview,
    ),
    activeReviewsIdx: index('spaced_repetition_active_idx').on(table.isActive, table.nextReview),
  }),
)

// Notifications table - Push notification management
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    data: jsonb('data'), // Additional notification payload
    scheduledFor: timestamp('scheduled_for'),
    sentAt: timestamp('sent_at'),
    readAt: timestamp('read_at'),
    isRead: boolean('is_read').default(false),
    deliveryStatus: varchar('delivery_status', { length: 20 }).default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userNotificationsIdx: index('notifications_user_idx').on(table.userId, table.createdAt),
    scheduledIdx: index('notifications_scheduled_idx').on(table.scheduledFor),
    unreadIdx: index('notifications_unread_idx').on(table.userId, table.isRead),
    deliveryStatusIdx: index('notifications_delivery_status_idx').on(table.deliveryStatus),
  }),
)

// Relations for better query experience
export const usersRelations = relations(users, ({ many }) => ({
  knowledgeStates: many(knowledgeStates),
  learningEvents: many(learningEvents),
  userSessions: many(userSessions),
  sentFriendRequests: many(friendships, { relationName: 'requester' }),
  receivedFriendRequests: many(friendships, { relationName: 'addressee' }),
  userAchievements: many(userAchievements),
  spacedRepetitions: many(spacedRepetition),
  notifications: many(notifications),
}))

export const conceptsRelations = relations(concepts, ({ one, many }) => ({
  parentConcept: one(concepts, {
    fields: [concepts.parentConceptId],
    references: [concepts.id],
    relationName: 'parent',
  }),
  childConcepts: many(concepts, { relationName: 'parent' }),
  knowledgeStates: many(knowledgeStates),
  content: many(content),
  learningEvents: many(learningEvents),
  spacedRepetitions: many(spacedRepetition),
}))

export const knowledgeStatesRelations = relations(knowledgeStates, ({ one }) => ({
  user: one(users, {
    fields: [knowledgeStates.userId],
    references: [users.id],
  }),
  concept: one(concepts, {
    fields: [knowledgeStates.conceptId],
    references: [concepts.id],
  }),
}))

export const contentRelations = relations(content, ({ one, many }) => ({
  concept: one(concepts, {
    fields: [content.conceptId],
    references: [concepts.id],
  }),
  parentContent: one(content, {
    fields: [content.parentContentId],
    references: [content.id],
    relationName: 'variants',
  }),
  variants: many(content, { relationName: 'variants' }),
  learningEvents: many(learningEvents),
}))

export const learningEventsRelations = relations(learningEvents, ({ one }) => ({
  user: one(users, {
    fields: [learningEvents.userId],
    references: [users.id],
  }),
  concept: one(concepts, {
    fields: [learningEvents.conceptId],
    references: [concepts.id],
  }),
  content: one(content, {
    fields: [learningEvents.contentId],
    references: [content.id],
  }),
  session: one(userSessions, {
    fields: [learningEvents.sessionId],
    references: [userSessions.sessionId],
  }),
}))

export const userSessionsRelations = relations(userSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
  learningEvents: many(learningEvents),
}))

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, {
    fields: [friendships.requesterId],
    references: [users.id],
    relationName: 'requester',
  }),
  addressee: one(users, {
    fields: [friendships.addresseeId],
    references: [users.id],
    relationName: 'addressee',
  }),
}))

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}))

export const spacedRepetitionRelations = relations(spacedRepetition, ({ one }) => ({
  user: one(users, {
    fields: [spacedRepetition.userId],
    references: [users.id],
  }),
  concept: one(concepts, {
    fields: [spacedRepetition.conceptId],
    references: [concepts.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

// GDPR/CCPA Compliance Tables

// User Consents table - GDPR consent tracking
export const userConsents = pgTable(
  'user_consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    consentType: varchar('consent_type', { length: 50 }).notNull(), // marketing, analytics, functional, necessary
    granted: boolean('granted').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: text('user_agent').notNull(),
    version: varchar('version', { length: 10 }).notNull(), // consent version
    withdrawnAt: timestamp('withdrawn_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userConsentTypeIdx: index('user_consents_user_consent_type_idx').on(
      table.userId,
      table.consentType,
    ),
    timestampIdx: index('user_consents_timestamp_idx').on(table.timestamp),
    grantedIdx: index('user_consents_granted_idx').on(table.granted),
  }),
)

// Data Deletion Requests table - Right to be forgotten
export const dataDeletionRequests = pgTable(
  'data_deletion_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    reason: text('reason').notNull(),
    requestedAt: timestamp('requested_at').defaultNow().notNull(),
    scheduledFor: timestamp('scheduled_for').notNull(),
    completedAt: timestamp('completed_at'),
    keepAnonymizedData: boolean('keep_anonymized_data').default(false),
    confirmationToken: varchar('confirmation_token', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).default('pending'), // pending, confirmed, processing, completed, cancelled
    processingNotes: text('processing_notes'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdx: index('data_deletion_requests_user_idx').on(table.userId),
    statusIdx: index('data_deletion_requests_status_idx').on(table.status),
    scheduledIdx: index('data_deletion_requests_scheduled_idx').on(table.scheduledFor),
    confirmationTokenIdx: uniqueIndex('data_deletion_requests_token_idx').on(
      table.confirmationToken,
    ),
  }),
)

// Audit Logs table - Comprehensive audit trail
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'), // Can be null for system actions
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceId: varchar('resource_id', { length: 255 }).notNull(),
    oldValues: text('old_values'), // JSON string of old values
    newValues: text('new_values'), // JSON string of new values
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: text('user_agent').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    metadata: text('metadata'), // Additional context as JSON
    severity: varchar('severity', { length: 20 }).default('info'), // info, warning, error, critical
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userActionIdx: index('audit_logs_user_action_idx').on(table.userId, table.action),
    resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
    timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    severityIdx: index('audit_logs_severity_idx').on(table.severity),
  }),
)

// Data Export Requests table - GDPR data portability
export const dataExportRequests = pgTable(
  'data_export_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    format: varchar('format', { length: 10 }).notNull(), // json, csv, xml
    includePersonalData: boolean('include_personal_data').default(true),
    includeActivityData: boolean('include_activity_data').default(true),
    includeAnalytics: boolean('include_analytics').default(false),
    requestedAt: timestamp('requested_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    downloadUrl: text('download_url'),
    expiresAt: timestamp('expires_at'),
    status: varchar('status', { length: 20 }).default('pending'), // pending, processing, completed, expired, failed
    fileSize: integer('file_size'), // bytes
    downloadCount: integer('download_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdx: index('data_export_requests_user_idx').on(table.userId),
    statusIdx: index('data_export_requests_status_idx').on(table.status),
    expiresIdx: index('data_export_requests_expires_idx').on(table.expiresAt),
  }),
)

// Security Events table - Security monitoring and incident tracking
export const securityEvents = pgTable(
  'security_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'), // Can be null for system-wide events
    eventType: varchar('event_type', { length: 50 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull(), // low, medium, high, critical
    description: text('description').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'), // Additional event data
    resolved: boolean('resolved').default(false),
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: uuid('resolved_by'), // Admin user who resolved
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userEventIdx: index('security_events_user_event_idx').on(table.userId, table.eventType),
    severityIdx: index('security_events_severity_idx').on(table.severity),
    timestampIdx: index('security_events_timestamp_idx').on(table.timestamp),
    resolvedIdx: index('security_events_resolved_idx').on(table.resolved),
    eventTypeIdx: index('security_events_event_type_idx').on(table.eventType),
  }),
)

// Compliance Relations
export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(users, {
    fields: [userConsents.userId],
    references: [users.id],
  }),
}))

export const dataDeletionRequestsRelations = relations(dataDeletionRequests, ({ one }) => ({
  user: one(users, {
    fields: [dataDeletionRequests.userId],
    references: [users.id],
  }),
}))

export const dataExportRequestsRelations = relations(dataExportRequests, ({ one }) => ({
  user: one(users, {
    fields: [dataExportRequests.userId],
    references: [users.id],
  }),
}))

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  user: one(users, {
    fields: [securityEvents.userId],
    references: [users.id],
  }),
}))
