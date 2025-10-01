import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SecurityMiddleware, ValidationSchemas } from '../middleware/security.middleware'
import EncryptionService from '../services/encryption.service'
import { ValidationHelpers } from '../schemas/validation.schemas'
import type { FastifyRequest, FastifyReply } from 'fastify'

// Mock Fastify request and reply objects
const createMockRequest = (overrides: Partial<FastifyRequest> = {}): FastifyRequest =>
  ({
    id: 'test-request-id',
    method: 'POST',
    url: '/test',
    headers: {},
    body: {},
    query: {},
    params: {},
    cookies: {},
    ip: '127.0.0.1',
    protocol: 'https',
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    ...overrides,
  }) as any

const createMockReply = (): FastifyReply =>
  ({
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    sent: false,
  }) as any

describe('Security Middleware Tests', () => {
  describe('XSS Protection', () => {
    it('should detect script injection attempts', async () => {
      const request = createMockRequest({
        body: {
          message: '<script>alert("xss")</script>',
          content: 'Normal content',
        },
      })
      const reply = createMockReply()

      const middleware = SecurityMiddleware.xssProtection()
      await middleware(request, reply)

      expect(reply.code).toHaveBeenCalledWith(400)
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'XSS_DETECTED',
          }),
        }),
      )
    })

    it('should allow safe content', async () => {
      const request = createMockRequest({
        body: {
          message: 'This is safe content',
          email: 'user@example.com',
        },
      })
      const reply = createMockReply()

      const middleware = SecurityMiddleware.xssProtection()
      await middleware(request, reply)

      expect(reply.code).not.toHaveBeenCalled()
    })
  })

  describe('CSRF Protection', () => {
    it('should reject requests without CSRF token', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: {},
        cookies: {},
      })
      const reply = createMockReply()

      const middleware = SecurityMiddleware.csrfProtection()
      await middleware(request, reply)

      expect(reply.code).toHaveBeenCalledWith(403)
    })

    it('should allow requests with matching CSRF tokens', async () => {
      const token = SecurityMiddleware.generateCSRFToken()
      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-csrf-token': token,
        },
        cookies: {
          'csrf-token': token,
        },
      })
      const reply = createMockReply()

      const middleware = SecurityMiddleware.csrfProtection()
      await middleware(request, reply)

      expect(reply.code).not.toHaveBeenCalled()
    })
  })
})

describe('Encryption Service Tests', () => {
  describe('Data Encryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'sensitive user data'
      const encrypted = EncryptionService.encryptData(plaintext)
      const decrypted = EncryptionService.decryptData(encrypted)

      expect(decrypted).toBe(plaintext)
      expect(encrypted.data).not.toBe(plaintext)
    })

    it('should generate different ciphertext for same plaintext', () => {
      const plaintext = 'test data'
      const encrypted1 = EncryptionService.encryptData(plaintext)
      const encrypted2 = EncryptionService.encryptData(plaintext)

      expect(encrypted1.data).not.toBe(encrypted2.data)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
    })
  })

  describe('Password Hashing', () => {
    it('should hash passwords securely', async () => {
      const password = 'userPassword123!'
      const hash = await EncryptionService.hashPassword(password)

      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50)
    })

    it('should verify correct passwords', async () => {
      const password = 'userPassword123!'
      const hash = await EncryptionService.hashPassword(password)
      const isValid = await EncryptionService.verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })
  })
})
