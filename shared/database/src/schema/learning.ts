import { pgTable, uuid, varchar, jsonb, real, integer, timestamptz, boolean, bigint, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { items } from './content';

// Enums
export const sessionTypeEnum = pgEnum('session_type', ['practice', 'review', 'mock_test', 'placement']);

// Attempts table (partitioned by date for scalability)
export const attempts = pgTable('attempts', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').notNull(),

    // Response data
    selected: jsonb('selected').notNull(), // user's answer
    correct: boolean('correct').notNull(), // computed result
    quality: integer('quality'), // SM-2 quality (0-5)
    confidence: integer('confidence'), // user confidence (1-5)
    timeTakenMs: integer('time_taken_ms').notNull(),
    hintsUsed: integer('hints_used').default(0),

    // Context
    clientAttemptId: uuid('client_attempt_id').notNull().unique(), // for idempotency
    deviceType: varchar('device_type', { length: 20 }),
    appVersion: varchar('app_version', { length: 20 }),
    ipAddress: varchar('ip_address', { length: 45 }), // IPv6 compatible
    userAgent: varchar('user_agent'),

    // Algorithm state snapshots for ML training and debugging
    sm2StateBefore: jsonb('sm2_state_before'),
    sm2StateAfter: jsonb('sm2_state_after'),
    bktStateBefore: jsonb('bkt_state_before'),
    bktStateAfter: jsonb('bkt_state_after'),
    irtAbilityBefore: jsonb('irt_ability_before'),
    irtAbilityAfter: jsonb('irt_ability_after'),

    // Audit
    timestamp: timestamptz('timestamp').default(sql`NOW()`),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
});

// Learning sessions
export const sessions = pgTable('sessions', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    sessionType: sessionTypeEnum('session_type').notNull(),

    // Session metadata
    startTime: timestamptz('start_time').default(sql`NOW()`),
    endTime: timestamptz('end_time'),
    itemsAttempted: integer('items_attempted').default(0),
    correctCount: integer('correct_count').default(0),
    totalTimeMs: bigint('total_time_ms', { mode: 'number' }).default(0),

    // Context
    deviceType: varchar('device_type', { length: 20 }),
    appVersion: varchar('app_version', { length: 20 }),

    // Analytics
    topicsPracticed: jsonb('topics_practiced').default([]),
    averageDifficulty: real('average_difficulty'),

    // Audit
    createdAt: timestamptz('created_at').default(sql`NOW()`),
    updatedAt: timestamptz('updated_at').default(sql`NOW()`),
});

// Skill mastery tracking
export const skillMastery = pgTable('skill_mastery', {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    topic: varchar('topic', { length: 100 }).notNull(),
    mastery: real('mastery').notNull(), // 0.0 to 1.0
    confidence: real('confidence').default(0.5), // uncertainty in mastery estimate
    lastPracticed: timestamptz('last_practiced').notNull(),
    practiceCount: integer('practice_count').default(0),
    correctStreak: integer('correct_streak').default(0),
    longestStreak: integer('longest_streak').default(0),
    totalTimeMs: bigint('total_time_ms', { mode: 'number' }).default(0),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
    updatedAt: timestamptz('updated_at').default(sql`NOW()`),
}, (table) => ({
    // Composite primary key
    pk: sql`PRIMARY KEY (${table.userId}, ${table.topic})`,
}));

// User scheduler state for adaptive algorithms
export const userSchedulerState = pgTable('user_scheduler_state', {
    userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),

    // IRT ability parameters per topic
    abilityVector: jsonb('ability_vector').notNull().default({}), // topic -> theta
    abilityConfidence: jsonb('ability_confidence').default({}), // topic -> confidence interval

    // SM-2 state per item
    sm2States: jsonb('sm2_states').notNull().default({}), // item_id -> SM2State

    // BKT state per topic
    bktStates: jsonb('bkt_states').notNull().default({}), // topic -> BKTState

    // Contextual bandit state
    banditState: jsonb('bandit_state').default({}), // strategy preferences and exploration

    // Session context
    currentSessionId: uuid('current_session_id'),
    lastSessionEnd: timestamptz('last_session_end'),
    consecutiveDays: integer('consecutive_days').default(0),
    totalStudyTimeMs: bigint('total_study_time_ms', { mode: 'number' }).default(0),

    // Versioning for optimistic locking
    version: integer('version').default(1),
    lastUpdated: timestamptz('last_updated').default(sql`NOW()`),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
});

// Placement test results
export const placementTests = pgTable('placement_tests', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').notNull().references(() => sessions.id),

    // Test configuration
    topics: jsonb('topics').notNull(), // topics being tested
    itemCount: integer('item_count').notNull(),

    // Results
    abilityEstimates: jsonb('ability_estimates').notNull(), // topic -> theta estimate
    confidenceIntervals: jsonb('confidence_intervals').notNull(), // topic -> [lower, upper]
    standardError: jsonb('standard_error').notNull(), // topic -> SE

    // Test metadata
    completedAt: timestamptz('completed_at').default(sql`NOW()`),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
});

// Learning goals and milestones
export const learningGoals = pgTable('learning_goals', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Goal definition
    title: varchar('title', { length: 255 }).notNull(),
    description: varchar('description'),
    targetTopics: jsonb('target_topics').notNull(), // topics to master
    targetMastery: real('target_mastery').default(0.8), // target mastery level
    targetDate: timestamptz('target_date'),

    // Progress tracking
    currentMastery: real('current_mastery').default(0.0),
    isCompleted: boolean('is_completed').default(false),
    completedAt: timestamptz('completed_at'),

    // Audit
    createdAt: timestamptz('created_at').default(sql`NOW()`),
    updatedAt: timestamptz('updated_at').default(sql`NOW()`),
});

// Types for TypeScript
export type Attempt = typeof attempts.$inferSelect;
export type NewAttempt = typeof attempts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SkillMastery = typeof skillMastery.$inferSelect;
export type NewSkillMastery = typeof skillMastery.$inferInsert;
export type UserSchedulerState = typeof userSchedulerState.$inferSelect;
export type NewUserSchedulerState = typeof userSchedulerState.$inferInsert;
export type PlacementTest = typeof placementTests.$inferSelect;
export type NewPlacementTest = typeof placementTests.$inferInsert;
export type LearningGoal = typeof learningGoals.$inferSelect;
export type NewLearningGoal = typeof learningGoals.$inferInsert;