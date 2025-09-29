import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import * as schema from './schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import {
  User,
  Question,
  LearningSession,
  UserResponse,
  KnowledgeState,
  Achievement,
  Friend,
  OfflineAction,
} from '../types'

// Database configuration
const DATABASE_NAME = 'drivemaster.db'
const DATABASE_VERSION = 1

class DatabaseManager {
  private db: ReturnType<typeof drizzle>
  private sqliteDb: ReturnType<typeof openDatabaseSync>

  constructor() {
    this.sqliteDb = openDatabaseSync(DATABASE_NAME)
    this.db = drizzle(this.sqliteDb, { schema })
    this.initialize()
  }

  private async initialize() {
    try {
      // Run migrations
      await this.runMigrations()

      // Initialize sync metadata
      await this.initializeSyncMetadata()

      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Database initialization failed:', error)
      throw error
    }
  }

  private async runMigrations() {
    try {
      // Create tables if they don't exist
      await this.sqliteDb.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          cognitive_patterns TEXT,
          learning_preferences TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS questions (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL,
          difficulty REAL NOT NULL,
          options TEXT,
          correct_answer TEXT,
          explanation TEXT,
          media_url TEXT,
          version INTEGER DEFAULT 1,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS learning_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          questions_answered INTEGER DEFAULT 0,
          correct_answers INTEGER DEFAULT 0,
          total_score INTEGER DEFAULT 0,
          category TEXT,
          is_completed INTEGER DEFAULT 0,
          is_synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_responses (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          question_id TEXT NOT NULL,
          session_id TEXT,
          selected_answer TEXT NOT NULL,
          is_correct INTEGER NOT NULL,
          response_time INTEGER NOT NULL,
          confidence REAL,
          timestamp TEXT NOT NULL,
          is_synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS knowledge_states (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          concept_id TEXT NOT NULL,
          mastery_probability REAL NOT NULL,
          last_updated TEXT NOT NULL,
          review_count INTEGER DEFAULT 0,
          next_review_date TEXT,
          is_synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS achievements (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          icon_url TEXT,
          unlocked_at TEXT,
          progress REAL DEFAULT 0,
          category TEXT NOT NULL,
          is_synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS friends (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          friend_id TEXT NOT NULL,
          friend_email TEXT NOT NULL,
          display_name TEXT,
          avatar_url TEXT,
          current_streak INTEGER DEFAULT 0,
          total_xp INTEGER DEFAULT 0,
          is_online INTEGER DEFAULT 0,
          added_at TEXT DEFAULT CURRENT_TIMESTAMP,
          is_synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS offline_actions (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          payload TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3,
          status TEXT DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS sync_metadata (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL UNIQUE,
          last_sync_time TEXT,
          sync_version INTEGER DEFAULT 1,
          conflict_resolution_strategy TEXT DEFAULT 'SERVER_WINS'
        );

        CREATE TABLE IF NOT EXISTS content_cache (
          id TEXT PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          data TEXT NOT NULL,
          expires_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          access_count INTEGER DEFAULT 0,
          last_accessed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS media_files (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL UNIQUE,
          local_path TEXT,
          mime_type TEXT,
          size INTEGER,
          downloaded_at TEXT,
          last_accessed_at TEXT,
          is_downloaded INTEGER DEFAULT 0
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_user_responses_user_id ON user_responses(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_responses_question_id ON user_responses(question_id);
        CREATE INDEX IF NOT EXISTS idx_user_responses_session_id ON user_responses(session_id);
        CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_states_user_id ON knowledge_states(user_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_states_concept_id ON knowledge_states(concept_id);
        CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
        CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
        CREATE INDEX IF NOT EXISTS idx_offline_actions_status ON offline_actions(status);
        CREATE INDEX IF NOT EXISTS idx_content_cache_key ON content_cache(key);
        CREATE INDEX IF NOT EXISTS idx_media_files_url ON media_files(url);
      `)
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }

  private async initializeSyncMetadata() {
    const tables = [
      'users',
      'questions',
      'learning_sessions',
      'user_responses',
      'knowledge_states',
      'achievements',
      'friends',
    ]

    for (const tableName of tables) {
      try {
        await this.db
          .insert(schema.syncMetadata)
          .values({
            id: `sync-${tableName}`,
            tableName,
            lastSyncTime: new Date().toISOString(),
          })
          .onConflictDoNothing()
      } catch (error) {
        // Ignore conflicts - metadata already exists
      }
    }
  }

  // User operations
  async saveUser(user: User): Promise<void> {
    await this.db
      .insert(schema.users)
      .values({
        id: user.id,
        email: user.email,
        cognitivePatterns: user.cognitivePatterns ? JSON.stringify(user.cognitivePatterns) : null,
        learningPreferences: user.learningPreferences
          ? JSON.stringify(user.learningPreferences)
          : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          email: user.email,
          cognitivePatterns: user.cognitivePatterns ? JSON.stringify(user.cognitivePatterns) : null,
          learningPreferences: user.learningPreferences
            ? JSON.stringify(user.learningPreferences)
            : null,
          updatedAt: user.updatedAt,
        },
      })
  }

  async getUser(userId: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
    if (result.length === 0) return null

    const user = result[0]
    return {
      id: user.id,
      email: user.email,
      cognitivePatterns: user.cognitivePatterns ? JSON.parse(user.cognitivePatterns) : undefined,
      learningPreferences: user.learningPreferences
        ? JSON.parse(user.learningPreferences)
        : undefined,
      createdAt: user.createdAt || '',
      updatedAt: user.updatedAt || '',
    }
  }

  // Question operations
  async saveQuestions(questions: Question[]): Promise<void> {
    for (const question of questions) {
      await this.db
        .insert(schema.questions)
        .values({
          id: question.id,
          title: question.title,
          content: question.content,
          category: question.category,
          difficulty: question.difficulty,
          options: question.options ? JSON.stringify(question.options) : null,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          mediaUrl: question.mediaUrl,
          version: question.version,
        })
        .onConflictDoUpdate({
          target: schema.questions.id,
          set: {
            title: question.title,
            content: question.content,
            category: question.category,
            difficulty: question.difficulty,
            options: question.options ? JSON.stringify(question.options) : null,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            mediaUrl: question.mediaUrl,
            version: question.version,
          },
        })
    }
  }

  async getQuestions(category?: string, limit?: number): Promise<Question[]> {
    let query = this.db.select().from(schema.questions).where(eq(schema.questions.isActive, true))

    if (category) {
      query = query.where(
        and(eq(schema.questions.isActive, true), eq(schema.questions.category, category)),
      )
    }

    if (limit) {
      query = query.limit(limit)
    }

    const results = await query
    return results.map((q) => ({
      id: q.id,
      title: q.title,
      content: q.content,
      category: q.category as any,
      difficulty: q.difficulty,
      options: q.options ? JSON.parse(q.options) : undefined,
      correctAnswer: q.correctAnswer || undefined,
      explanation: q.explanation || undefined,
      mediaUrl: q.mediaUrl || undefined,
      version: q.version || 1,
    }))
  }

  // Learning session operations
  async saveLearningSession(session: LearningSession): Promise<void> {
    await this.db
      .insert(schema.learningSessions)
      .values({
        id: session.id,
        userId: session.userId,
        startTime: session.startTime,
        endTime: session.endTime,
        questionsAnswered: session.questionsAnswered,
        correctAnswers: session.correctAnswers,
        totalScore: session.totalScore,
        category: session.category,
        isCompleted: session.isCompleted,
        isSynced: false,
      })
      .onConflictDoUpdate({
        target: schema.learningSessions.id,
        set: {
          endTime: session.endTime,
          questionsAnswered: session.questionsAnswered,
          correctAnswers: session.correctAnswers,
          totalScore: session.totalScore,
          isCompleted: session.isCompleted,
        },
      })
  }

  async getLearningSession(sessionId: string): Promise<LearningSession | null> {
    const result = await this.db
      .select()
      .from(schema.learningSessions)
      .where(eq(schema.learningSessions.id, sessionId))
      .limit(1)

    if (result.length === 0) return null

    const session = result[0]
    return {
      id: session.id,
      userId: session.userId,
      startTime: session.startTime,
      endTime: session.endTime || undefined,
      questionsAnswered: session.questionsAnswered || 0,
      correctAnswers: session.correctAnswers || 0,
      totalScore: session.totalScore || 0,
      category: session.category as any,
      isCompleted: session.isCompleted || false,
    }
  }

  // User response operations
  async saveUserResponse(
    response: UserResponse & { userId: string; sessionId?: string },
  ): Promise<void> {
    await this.db.insert(schema.userResponses).values({
      id: `response-${Date.now()}-${Math.random()}`,
      userId: response.userId,
      questionId: response.questionId,
      sessionId: response.sessionId,
      selectedAnswer: response.selectedAnswer,
      isCorrect: response.isCorrect,
      responseTime: response.responseTime,
      confidence: response.confidence,
      timestamp: response.timestamp,
      isSynced: false,
    })
  }

  // Offline action operations
  async saveOfflineAction(action: OfflineAction): Promise<void> {
    await this.db.insert(schema.offlineActions).values({
      id: action.id,
      type: action.type,
      payload: JSON.stringify(action.payload),
      timestamp: action.timestamp,
      retryCount: action.retryCount,
      maxRetries: action.maxRetries,
      status: 'pending',
    })
  }

  async getPendingOfflineActions(): Promise<OfflineAction[]> {
    const results = await this.db
      .select()
      .from(schema.offlineActions)
      .where(eq(schema.offlineActions.status, 'pending'))
      .orderBy(asc(schema.offlineActions.timestamp))

    return results.map((action) => ({
      id: action.id,
      type: action.type as any,
      payload: JSON.parse(action.payload),
      timestamp: action.timestamp,
      retryCount: action.retryCount || 0,
      maxRetries: action.maxRetries || 3,
    }))
  }

  async updateOfflineActionStatus(
    actionId: string,
    status: string,
    retryCount?: number,
  ): Promise<void> {
    const updateData: any = { status }
    if (retryCount !== undefined) {
      updateData.retryCount = retryCount
    }

    await this.db
      .update(schema.offlineActions)
      .set(updateData)
      .where(eq(schema.offlineActions.id, actionId))
  }

  async deleteOfflineAction(actionId: string): Promise<void> {
    await this.db.delete(schema.offlineActions).where(eq(schema.offlineActions.id, actionId))
  }

  // Cache operations
  async setCache(key: string, data: any, expiresAt?: Date): Promise<void> {
    await this.db
      .insert(schema.contentCache)
      .values({
        id: `cache-${Date.now()}-${Math.random()}`,
        key,
        data: JSON.stringify(data),
        expiresAt: expiresAt?.toISOString(),
        accessCount: 0,
      })
      .onConflictDoUpdate({
        target: schema.contentCache.key,
        set: {
          data: JSON.stringify(data),
          expiresAt: expiresAt?.toISOString(),
          lastAccessedAt: new Date().toISOString(),
        },
      })
  }

  async getCache(key: string): Promise<any | null> {
    const result = await this.db
      .select()
      .from(schema.contentCache)
      .where(eq(schema.contentCache.key, key))
      .limit(1)

    if (result.length === 0) return null

    const cache = result[0]

    // Check if expired
    if (cache.expiresAt && new Date(cache.expiresAt) < new Date()) {
      await this.db.delete(schema.contentCache).where(eq(schema.contentCache.key, key))
      return null
    }

    // Update access count and last accessed time
    await this.db
      .update(schema.contentCache)
      .set({
        accessCount: (cache.accessCount || 0) + 1,
        lastAccessedAt: new Date().toISOString(),
      })
      .where(eq(schema.contentCache.key, key))

    return JSON.parse(cache.data)
  }

  // Cleanup operations
  async cleanupExpiredCache(): Promise<void> {
    const now = new Date().toISOString()
    await this.db.delete(schema.contentCache).where(
      and(
        eq(schema.contentCache.expiresAt, now),
        // Only delete if expires_at is not null and is less than now
      ),
    )
  }

  async getUnsyncedData(tableName: string): Promise<any[]> {
    // This would return unsynced data for a specific table
    // Implementation depends on the table structure
    return []
  }

  async markAsSynced(tableName: string, ids: string[]): Promise<void> {
    // Mark records as synced
    // Implementation depends on the table structure
  }

  // Database maintenance
  async vacuum(): Promise<void> {
    await this.sqliteDb.execAsync('VACUUM')
  }

  async getDbSize(): Promise<number> {
    const result = await this.sqliteDb.execAsync('PRAGMA page_count')
    // Calculate approximate size
    return 0 // Placeholder
  }
}

// Singleton instance
export const database = new DatabaseManager()
export default database
