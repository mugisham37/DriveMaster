import Redis from 'ioredis'
import type { UserContext } from './auth.service'

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
}

// Session configuration
const SESSION_PREFIX = 'session:'
const USER_SESSIONS_PREFIX = 'user_sessions:'
const SESSION_TTL = parseInt(process.env.SESSION_TTL || '86400') // 24 hours in seconds
const MAX_SESSIONS_PER_USER = parseInt(process.env.MAX_SESSIONS_PER_USER || '5')

export interface SessionData {
  userId: string
  email: string
  roles: string[]
  deviceInfo?: {
    userAgent?: string
    ip?: string
    deviceType?: 'mobile' | 'tablet' | 'desktop'
  }
  createdAt: Date
  lastAccessedAt: Date
  expiresAt: Date
}

export interface CreateSessionOptions {
  userId: string
  email: string
  roles: string[]
  deviceInfo?: SessionData['deviceInfo']
  ttl?: number
}

export class SessionService {
  private static redis: Redis

  /**
   * Initialize Redis connection
   */
  static async initialize(): Promise<void> {
    if (!this.redis) {
      this.redis = new Redis(redisConfig)

      this.redis.on('connect', () => {
        console.log('✅ Redis connected for session management')
      })

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error)
      })

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...')
      })

      // Test connection
      await this.redis.ping()
    }
  }

  /**
   * Create a new session
   */
  static async createSession(options: CreateSessionOptions): Promise<string> {
    await this.initialize()

    const sessionId = this.generateSessionId()
    const now = new Date()
    const ttl = options.ttl || SESSION_TTL
    const expiresAt = new Date(now.getTime() + ttl * 1000)

    const sessionData: SessionData = {
      userId: options.userId,
      email: options.email,
      roles: options.roles,
      deviceInfo: options.deviceInfo,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
    }

    // Store session data
    const sessionKey = `${SESSION_PREFIX}${sessionId}`
    await this.redis.setex(sessionKey, ttl, JSON.stringify(sessionData))

    // Track user sessions for management
    await this.addUserSession(options.userId, sessionId, ttl)

    // Enforce session limit per user
    await this.enforceSessionLimit(options.userId)

    return sessionId
  }

  /**
   * Get session data by session ID
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    await this.initialize()

    const sessionKey = `${SESSION_PREFIX}${sessionId}`
    const sessionDataStr = await this.redis.get(sessionKey)

    if (!sessionDataStr) {
      return null
    }

    try {
      const sessionData = JSON.parse(sessionDataStr) as SessionData

      // Check if session has expired
      if (new Date() > new Date(sessionData.expiresAt)) {
        await this.deleteSession(sessionId)
        return null
      }

      // Update last accessed time
      sessionData.lastAccessedAt = new Date()
      await this.redis.setex(sessionKey, SESSION_TTL, JSON.stringify(sessionData))

      return sessionData
    } catch (error) {
      console.error('Error parsing session data:', error)
      await this.deleteSession(sessionId)
      return null
    }
  }

  /**
   * Update session data
   */
  static async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<boolean> {
    await this.initialize()

    const sessionData = await this.getSession(sessionId)
    if (!sessionData) {
      return false
    }

    const updatedData = {
      ...sessionData,
      ...updates,
      lastAccessedAt: new Date(),
    }

    const sessionKey = `${SESSION_PREFIX}${sessionId}`
    await this.redis.setex(sessionKey, SESSION_TTL, JSON.stringify(updatedData))

    return true
  }

  /**
   * Delete a session
   */
  static async deleteSession(sessionId: string): Promise<boolean> {
    await this.initialize()

    const sessionData = await this.getSession(sessionId)
    if (sessionData) {
      await this.removeUserSession(sessionData.userId, sessionId)
    }

    const sessionKey = `${SESSION_PREFIX}${sessionId}`
    const result = await this.redis.del(sessionKey)

    return result > 0
  }

  /**
   * Delete all sessions for a user
   */
  static async deleteUserSessions(userId: string): Promise<number> {
    await this.initialize()

    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`
    const sessionIds = await this.redis.smembers(userSessionsKey)

    if (sessionIds.length === 0) {
      return 0
    }

    // Delete all session data
    const sessionKeys = sessionIds.map((id) => `${SESSION_PREFIX}${id}`)
    const deletedCount = await this.redis.del(...sessionKeys)

    // Clear user sessions set
    await this.redis.del(userSessionsKey)

    return deletedCount
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    await this.initialize()

    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`
    const sessionIds = await this.redis.smembers(userSessionsKey)

    const sessions: SessionData[] = []

    for (const sessionId of sessionIds) {
      const sessionData = await this.getSession(sessionId)
      if (sessionData) {
        sessions.push(sessionData)
      }
    }

    return sessions
  }

  /**
   * Validate session and return user context
   */
  static async validateSession(sessionId: string): Promise<UserContext | null> {
    const sessionData = await this.getSession(sessionId)

    if (!sessionData) {
      return null
    }

    return {
      userId: sessionData.userId,
      email: sessionData.email,
      roles: sessionData.roles,
      permissions: [], // Will be populated by AuthService
    }
  }

  /**
   * Extend session TTL
   */
  static async extendSession(
    sessionId: string,
    additionalTtl: number = SESSION_TTL,
  ): Promise<boolean> {
    await this.initialize()

    const sessionKey = `${SESSION_PREFIX}${sessionId}`
    const exists = await this.redis.exists(sessionKey)

    if (!exists) {
      return false
    }

    await this.redis.expire(sessionKey, additionalTtl)
    return true
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    await this.initialize()

    // This is a simplified cleanup - in production, you'd want a more sophisticated approach
    // using Redis keyspace notifications or a background job

    let cleanedCount = 0
    const pattern = `${SESSION_PREFIX}*`
    const keys = await this.redis.keys(pattern)

    for (const key of keys) {
      const ttl = await this.redis.ttl(key)
      if (ttl === -2) {
        // Key doesn't exist
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(): Promise<{
    totalActiveSessions: number
    sessionsByUser: Record<string, number>
  }> {
    await this.initialize()

    const pattern = `${SESSION_PREFIX}*`
    const sessionKeys = await this.redis.keys(pattern)

    const sessionsByUser: Record<string, number> = {}

    for (const key of sessionKeys) {
      const sessionDataStr = await this.redis.get(key)
      if (sessionDataStr) {
        try {
          const sessionData = JSON.parse(sessionDataStr) as SessionData
          sessionsByUser[sessionData.userId] = (sessionsByUser[sessionData.userId] || 0) + 1
        } catch (error) {
          // Invalid session data, skip
        }
      }
    }

    return {
      totalActiveSessions: sessionKeys.length,
      sessionsByUser,
    }
  }

  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2, 15)
    return `${timestamp}_${randomPart}`
  }

  /**
   * Add session to user's session set
   */
  private static async addUserSession(
    userId: string,
    sessionId: string,
    ttl: number,
  ): Promise<void> {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`
    await this.redis.sadd(userSessionsKey, sessionId)
    await this.redis.expire(userSessionsKey, ttl + 3600) // Extra hour buffer
  }

  /**
   * Remove session from user's session set
   */
  private static async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`
    await this.redis.srem(userSessionsKey, sessionId)
  }

  /**
   * Enforce maximum sessions per user
   */
  private static async enforceSessionLimit(userId: string): Promise<void> {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`
    const sessionIds = await this.redis.smembers(userSessionsKey)

    if (sessionIds.length > MAX_SESSIONS_PER_USER) {
      // Remove oldest sessions
      const sessions: Array<{ id: string; createdAt: Date }> = []

      for (const sessionId of sessionIds) {
        const sessionData = await this.getSession(sessionId)
        if (sessionData) {
          sessions.push({
            id: sessionId,
            createdAt: new Date(sessionData.createdAt),
          })
        }
      }

      // Sort by creation time (oldest first)
      sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

      // Remove excess sessions
      const sessionsToRemove = sessions.slice(0, sessions.length - MAX_SESSIONS_PER_USER)

      for (const session of sessionsToRemove) {
        await this.deleteSession(session.id)
      }
    }
  }

  /**
   * Close Redis connection
   */
  static async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
}
