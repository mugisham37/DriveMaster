export interface SessionContext {
  userId: string
  email: string
  roles: string[]
  lastAccessedAt: Date
}

export interface SessionUpdateData {
  lastAccessedAt: Date
}

export interface CreateSessionData {
  userId: string
  email: string
  roles: string[]
  deviceInfo: {
    userAgent?: string
    ip: string
    deviceType: 'mobile' | 'tablet' | 'desktop'
  }
}

export interface SessionInfo {
  sessionId: string
  userId: string
  email: string
  deviceInfo: {
    userAgent?: string
    ip: string
    deviceType: 'mobile' | 'tablet' | 'desktop'
  }
  createdAt: Date
  lastAccessedAt: Date
}

export class SessionService {
  /**
   * Create a new session
   */
  static createSession(data: CreateSessionData): Promise<string> {
    // Mock implementation - in production this would create session in Redis/database
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`

    // eslint-disable-next-line no-console
    console.log('Session created:', { sessionId, userId: data.userId, email: data.email })

    return Promise.resolve(sessionId)
  }

  /**
   * Delete a session
   */
  static deleteSession(sessionId: string): Promise<void> {
    // Mock implementation - in production this would delete from Redis/database
    // eslint-disable-next-line no-console
    console.log('Session deleted:', { sessionId })

    return Promise.resolve()
  }

  /**
   * Get all sessions for a user
   */
  static getUserSessions(userId: string): Promise<SessionInfo[]> {
    // Mock implementation - in production this would query Redis/database
    // eslint-disable-next-line no-console
    console.log('Getting sessions for user:', { userId })

    return Promise.resolve([
      {
        sessionId: `session_${Date.now()}_mock`,
        userId,
        email: 'user@example.com',
        deviceInfo: {
          userAgent: 'Mock User Agent',
          ip: '127.0.0.1',
          deviceType: 'desktop',
        },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      },
    ])
  }

  /**
   * Validate session and return session context
   */
  static validateSession(sessionId: string): Promise<SessionContext | null> {
    // Mock implementation - in production this would check Redis/database
    if (sessionId.length < 32) {
      return Promise.resolve(null)
    }

    // Return mock session context
    return Promise.resolve({
      userId: 'mock-user-id',
      email: 'user@example.com',
      roles: ['user'],
      lastAccessedAt: new Date(),
    })
  }

  /**
   * Update session data
   */
  static updateSession(sessionId: string, data: SessionUpdateData): Promise<void> {
    // Mock implementation - in production this would update Redis/database
    // eslint-disable-next-line no-console
    console.log('Session updated:', { sessionId, data })

    return Promise.resolve()
  }
}
