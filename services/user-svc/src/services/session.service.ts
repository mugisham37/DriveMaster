export interface SessionContext {
  userId: string
  email: string
  roles: string[]
  lastAccessedAt: Date
}

export interface SessionUpdateData {
  lastAccessedAt: Date
}

export class SessionService {
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
