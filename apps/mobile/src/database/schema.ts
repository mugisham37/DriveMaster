import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Users table for offline storage
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  cognitivePatterns: text('cognitive_patterns'), // JSON string
  learningPreferences: text('learning_preferences'), // JSON string
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: text('last_synced_at'),
})

// Questions table for offline access
export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(),
  difficulty: real('difficulty').notNull(),
  options: text('options'), // JSON string
  correctAnswer: text('correct_answer'),
  explanation: text('explanation'),
  mediaUrl: text('media_url'),
  version: integer('version').default(1),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: text('last_synced_at'),
})

// Learning sessions for offline tracking
export const learningSessions = sqliteTable('learning_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  questionsAnswered: integer('questions_answered').default(0),
  correctAnswers: integer('correct_answers').default(0),
  totalScore: integer('total_score').default(0),
  category: text('category'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// User responses for offline storage
export const userResponses = sqliteTable('user_responses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull(),
  sessionId: text('session_id'),
  selectedAnswer: text('selected_answer').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  responseTime: integer('response_time').notNull(), // milliseconds
  confidence: real('confidence'),
  timestamp: text('timestamp').notNull(),
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false),
})

// Knowledge states for offline tracking
export const knowledgeStates = sqliteTable('knowledge_states', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  conceptId: text('concept_id').notNull(),
  masteryProbability: real('mastery_probability').notNull(),
  lastUpdated: text('last_updated').notNull(),
  reviewCount: integer('review_count').default(0),
  nextReviewDate: text('next_review_date'),
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false),
})

// Achievements for offline storage
export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  iconUrl: text('icon_url'),
  unlockedAt: text('unlocked_at'),
  progress: real('progress').default(0),
  category: text('category').notNull(),
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false),
})

// Friends for offline storage
export const friends = sqliteTable('friends', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  friendId: text('friend_id').notNull(),
  friendEmail: text('friend_email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  currentStreak: integer('current_streak').default(0),
  totalXP: integer('total_xp').default(0),
  isOnline: integer('is_online', { mode: 'boolean' }).default(false),
  addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`),
  isSynced: integer('is_synced', { mode: 'boolean' }).default(false),
})

// Offline actions queue
export const offlineActions = sqliteTable('offline_actions', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  payload: text('payload').notNull(), // JSON string
  timestamp: text('timestamp').notNull(),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  status: text('status').default('pending'), // pending, processing, completed, failed
})

// Sync metadata
export const syncMetadata = sqliteTable('sync_metadata', {
  id: text('id').primaryKey(),
  tableName: text('table_name').notNull().unique(),
  lastSyncTime: text('last_sync_time'),
  syncVersion: integer('sync_version').default(1),
  conflictResolutionStrategy: text('conflict_resolution_strategy').default('SERVER_WINS'),
})

// Content cache for offline access
export const contentCache = sqliteTable('content_cache', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  data: text('data').notNull(), // JSON string
  expiresAt: text('expires_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  accessCount: integer('access_count').default(0),
  lastAccessedAt: text('last_accessed_at'),
})

// Media files for offline access
export const mediaFiles = sqliteTable('media_files', {
  id: text('id').primaryKey(),
  url: text('url').notNull().unique(),
  localPath: text('local_path'),
  mimeType: text('mime_type'),
  size: integer('size'),
  downloadedAt: text('downloaded_at'),
  lastAccessedAt: text('last_accessed_at'),
  isDownloaded: integer('is_downloaded', { mode: 'boolean' }).default(false),
})
