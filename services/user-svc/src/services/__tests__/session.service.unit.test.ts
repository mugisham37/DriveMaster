import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock Redis completely
const mockRedis = {
  ping: jest.fn().mockResolvedValue('PONG'),
  setex: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  del: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
  ttl: jest.fn(),
  multi: jest.fn().mockReturnThis(),
  incr: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
  quit: jest.fn().mockResolvedValue('OK'),
  on: jest.fn(),
}

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis)
})

import { SessionService } from '../session.service'

describe('SessionService - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the static redis instance
    ;(SessionService as any).redis = null
  })

  describe('initialize', () => {
    it('should initialize Redis connection', async () => {
      await SessionService.initialize()

      expect(mockRedis.ping).toHaveBeenCalled()
    })
  })

  describe('createSession', () => {
    beforeEach(async () => {
      await SessionService.initialize()
    })

    it('should create a new session successfully', async () => {
      const options = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          ip: '127.0.0.1',
          deviceType: 'desktop' as const,
        },
      }

      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.sadd.mockResolvedValue(1)
      mockRedis.expire.mockResolvedValue(1)
      mockRedis.smembers.mockResolvedValue([])

      const sessionId = await SessionService.createSession(options)

      expect(sessionId).toMatch(/^\d+_[a-z0-9]+$/)
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `session:${sessionId}`,
        86400,
        expect.stringContaining(options.userId),
      )
      expect(mockRedis.sadd).toHaveBeenCalledWith(`user_sessions:${options.userId}`, sessionId)
    })

    it('should use custom TTL when provided', async () => {
      const options = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        ttl: 3600, // 1 hour
      }

      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.sadd.mockResolvedValue(1)
      mockRedis.expire.mockResolvedValue(1)
      mockRedis.smembers.mockResolvedValue([])

      const sessionId = await SessionService.createSession(options)

      expect(mockRedis.setex).toHaveBeenCalledWith(`session:${sessionId}`, 3600, expect.any(String))
    })
  })

  describe('getSession', () => {
    beforeEach(async () => {
      await SessionService.initialize()
    })

    it('should retrieve valid session data', async () => {
      const sessionId = 'test-session-id'
      const sessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData))
      mockRedis.setex.mockResolvedValue('OK')

      const result = await SessionService.getSession(sessionId)

      expect(result).toEqual(
        expect.objectContaining({
          userId: sessionData.userId,
          email: sessionData.email,
          roles: sessionData.roles,
        }),
      )
      expect(mockRedis.get).toHaveBeenCalledWith(`session:${sessionId}`)
    })

    it('should return null for non-existent session', async () => {
      const sessionId = 'non-existent-session'

      mockRedis.get.mockResolvedValue(null)

      const result = await SessionService.getSession(sessionId)

      expect(result).toBeNull()
    })

    it('should return null and delete expired session', async () => {
      const sessionId = 'expired-session'
      const expiredSessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(expiredSessionData))
      mockRedis.del.mockResolvedValue(1)
      mockRedis.srem.mockResolvedValue(1)

      const result = await SessionService.getSession(sessionId)

      expect(result).toBeNull()
      expect(mockRedis.del).toHaveBeenCalledWith(`session:${sessionId}`)
    })

    it('should handle invalid JSON and delete corrupted session', async () => {
      const sessionId = 'corrupted-session'

      mockRedis.get.mockResolvedValue('invalid-json')
      mockRedis.del.mockResolvedValue(1)
      mockRedis.srem.mockResolvedValue(1)

      const result = await SessionService.getSession(sessionId)

      expect(result).toBeNull()
      expect(mockRedis.del).toHaveBeenCalledWith(`session:${sessionId}`)
    })
  })

  describe('deleteSession', () => {
    beforeEach(async () => {
      await SessionService.initialize()
    })

    it('should delete existing session', async () => {
      const sessionId = 'test-session-id'
      const sessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData))
      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.srem.mockResolvedValue(1)
      mockRedis.del.mockResolvedValue(1)

      const result = await SessionService.deleteSession(sessionId)

      expect(result).toBe(true)
      expect(mockRedis.del).toHaveBeenCalledWith(`session:${sessionId}`)
      expect(mockRedis.srem).toHaveBeenCalledWith(`user_sessions:${sessionData.userId}`, sessionId)
    })

    it('should return false for non-existent session', async () => {
      const sessionId = 'non-existent-session'

      mockRedis.get.mockResolvedValue(null)
      mockRedis.del.mockResolvedValue(0)

      const result = await SessionService.deleteSession(sessionId)

      expect(result).toBe(false)
    })
  })

  describe('validateSession', () => {
    beforeEach(async () => {
      await SessionService.initialize()
    })

    it('should validate session and return user context', async () => {
      const sessionId = 'valid-session'
      const sessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData))
      mockRedis.setex.mockResolvedValue('OK')

      const result = await SessionService.validateSession(sessionId)

      expect(result).toEqual({
        userId: sessionData.userId,
        email: sessionData.email,
        roles: sessionData.roles,
        permissions: [],
      })
    })

    it('should return null for invalid session', async () => {
      const sessionId = 'invalid-session'

      mockRedis.get.mockResolvedValue(null)

      const result = await SessionService.validateSession(sessionId)

      expect(result).toBeNull()
    })
  })

  describe('close', () => {
    it('should close Redis connection', async () => {
      await SessionService.initialize()

      await SessionService.close()

      expect(mockRedis.quit).toHaveBeenCalled()
    })
  })
})
