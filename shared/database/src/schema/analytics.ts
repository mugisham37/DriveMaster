import { pgTable, uuid, varchar, jsonb, real, integer, timestamptz, boolean, bigint } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { items } from './content';

// User activity tracking
export const userActivity = pgTable('user_activity', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Activity details
    activityType: varchar('activity_type', { length: 50 }).notNull(), // 'login', 'logout', 'practice', 'review', etc.
    activityData: jsonb('activity_data').default({}), // additional activity-specific data

    // Context
    deviceType: varchar('device_type', { length: 20 }),
    appVersion: varchar('app_version', { length: 20 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent'),

    // Timing
    duration: integer('duration'), // duration in milliseconds if applicable
    timestamp: timestamptz('timestamp').default(sql`NOW()`),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
});

// Item performance analytics
export const itemAnalytics = pgTable('item_analytics', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),

    // Time period for this analytics record
    periodStart: timestamptz('period_start').notNull(),
    periodEnd: timestamptz('period_end').notNull(),

    // Performance metrics
    totalAttempts: integer('total_attempts').default(0),
    correctAttempts: integer('correct_attempts').default(0),
    successRate: real('success_rate').default(0.0),
    averageTimeMs: integer('average_time_ms').default(0),
    averageHintsUsed: real('average_hints_used').default(0.0),

    // IRT parameter updates
    difficultyEstimate: real('difficulty_estimate'),
    discriminationEstimate: real('discrimination_estimate'),
    guessingEstimate: real('guessing_estimate'),

    // User distribution
    uniqueUsers: integer('unique_users').default(0),
    newUsers: integer('new_users').default(0),
    returningUsers: integer('returning_users').default(0),

    // Audit
    calculatedAt: timestamptz('calculated_at').default(sql`NOW()`),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
});

// Topic performance analytics
export const topicAnalytics = pgTable('topic_analytics', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    topic: varchar('topic', { length: 100 }).notNull(),

    // Time period
    periodStart: timestamptz('period_start').notNull(),
    periodEnd: timestamptz('period_end').notNull(),

    // Performance metrics
    totalAttempts: integer('total_attempts').default(0),
    correctAttempts: integer('correct_attempts').default(0),
    successRate: real('success_rate').default(0.0),
    averageTimeMs: integer('average_time_ms').default(0),

    // Mastery metrics
    averageMastery: real('average_mastery').default(0.0),
    usersAboveThreshold: integer('users_above_threshold').default(0), // users with mastery > 0.8
    totalActiveUsers: integer('total_active_users').default(0),

    // Learning progression
    averageTimeToMastery: bigint('average_time_to_mastery', { mode: 'number' }), // milliseconds
    averageAttemptsToMastery: integer('average_attempts_to_mastery'),

    // Audit
    calculatedAt: timestamptz('calculated_at').default(sql`NOW()`),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
});

// User engagement analytics
export const userEngagement = pgTable('user_engagement', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Time period
    periodStart: timestamptz('period_start').notNull(),
    periodEnd: timestamptz('period_end').notNull(),

    // Engagement metrics
    sessionsCount: integer('sessions_count').default(0),
    totalStudyTimeMs: bigint('total_study_time_ms', { mode: 'number' }).default(0),
    averageSessionTimeMs: integer('average_session_time_ms').default(0),
    totalAttempts: integer('total_attempts').default(0),
    correctAttempts: integer('correct_attempts').default(0),

    // Streak and consistency
    longestStreak: integer('longest_streak').default(0),
    currentStreak: integer('current_streak').default(0),
    activeDays: integer('active_days').default(0),

    // Progress metrics
    topicsMastered: integer('topics_mastered').default(0),
    averageMasteryGain: real('average_mastery_gain').default(0.0),

    // Retention indicators
    isRetained: boolean('is_retained').default(true), // active in this period
    riskScore: real('risk_score').default(0.0), // churn risk (0-1)

    // Audit
    calculatedAt: timestamptz('calculated_at').default(sql`NOW()`),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
});

// System performance metrics
export const systemMetrics = pgTable('system_metrics', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),

    // Metric identification
    metricName: varchar('metric_name', { length: 100 }).notNull(),
    metricType: varchar('metric_type', { length: 50 }).notNull(), // 'counter', 'gauge', 'histogram'

    // Metric value
    value: real('value').notNull(),
    unit: varchar('unit', { length: 20 }), // 'ms', 'count', 'percent', etc.

    // Context
    service: varchar('service', { length: 50 }), // which service reported this metric
    environment: varchar('environment', { length: 20 }).default('development'),
    tags: jsonb('tags').default({}), // additional tags for filtering

    // Timing
    timestamp: timestamptz('timestamp').default(sql`NOW()`),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
});

// A/B test results
export const abTestResults = pgTable('ab_test_results', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),

    // Test identification
    testName: varchar('test_name', { length: 100 }).notNull(),
    variant: varchar('variant', { length: 50 }).notNull(), // 'control', 'treatment_a', etc.

    // User assignment
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

    // Outcome metrics
    conversionEvent: varchar('conversion_event', { length: 100 }), // what event we're measuring
    converted: boolean('converted').default(false),
    conversionValue: real('conversion_value'), // numeric value if applicable

    // Context
    assignedAt: timestamptz('assigned_at').default(sql`NOW()`),
    convertedAt: timestamptz('converted_at'),

    // Additional data
    metadata: jsonb('metadata').default({}),

    // Audit
    createdAt: timestamptz('created_at').default(sql`NOW()`),
});

// Types for TypeScript
export type UserActivity = typeof userActivity.$inferSelect;
export type NewUserActivity = typeof userActivity.$inferInsert;
export type ItemAnalytics = typeof itemAnalytics.$inferSelect;
export type NewItemAnalytics = typeof itemAnalytics.$inferInsert;
export type TopicAnalytics = typeof topicAnalytics.$inferSelect;
export type NewTopicAnalytics = typeof topicAnalytics.$inferInsert;
export type UserEngagement = typeof userEngagement.$inferSelect;
export type NewUserEngagement = typeof userEngagement.$inferInsert;
export type SystemMetrics = typeof systemMetrics.$inferSelect;
export type NewSystemMetrics = typeof systemMetrics.$inferInsert;
export type AbTestResults = typeof abTestResults.$inferSelect;
export type NewAbTestResults = typeof abTestResults.$inferInsert;