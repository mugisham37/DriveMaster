import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AuthService } from '../auth.service'

// Mock dependencies
jest.mock('bcrypt')
jest.mock('jsonwebtoken')
jest.mock('../../db/connection', () => ({
  db: {},
  readDb: {},
}))

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockJwt = jwt as jest.Mocked<typeof jwt>

describe('AuthService - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testpassword123'
      const hashedPassword = 'hashed_password'

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never)

      const result = await AuthService.hashPassword(password)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })

    it('should handle bcrypt errors', async () => {
      const password = 'testpassword123'
      const error = new Error('Bcrypt error')

      mockBcrypt.hash.mockRejectedValue(error as never)

      await expect(AuthService.hashPassword(password)).rejects.toThrow('Bcrypt error')
    })
  })

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      const password = 'testpassword123'
      const hash = 'hashed_password'

      mockBcrypt.compare.mockResolvedValue(true as never)

      const result = await AuthService.verifyPassword(password, hash)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash)
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const password = 'wrongpassword'
      const hash = 'hashed_password'

      mockBcrypt.compare.mockResolvedValue(false as never)

      const result = await AuthService.verifyPassword(password, hash)

      expect(result).toBe(false)
    })
  })

  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
      }
      const token = 'generated_token'

      mockJwt.sign.mockReturnValue(token as never)

      const result = AuthService.generateAccessToken(payload)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { ...payload, type: 'access' },
        expect.any(String),
        { expiresIn: '15m' },
      )
      expect(result).toBe(token)
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
      }
      const token = 'refresh_token'

      mockJwt.sign.mockReturnValue(token as never)

      const result = AuthService.generateRefreshToken(payload)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { ...payload, type: 'refresh' },
        expect.any(String),
        { expiresIn: '7d' },
      )
      expect(result).toBe(token)
    })
  })

  describe('verifyToken', () => {
    it('should verify valid access token', () => {
      const token = 'valid_token'
      const decoded = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        type: 'access' as const,
        iat: 1234567890,
        exp: 1234567890,
      }

      mockJwt.verify.mockReturnValue(decoded as never)

      const result = AuthService.verifyToken(token, 'access')

      expect(mockJwt.verify).toHaveBeenCalledWith(token, expect.any(String))
      expect(result).toEqual(decoded)
    })

    it('should throw error for expired token', () => {
      const token = 'expired_token'
      const error = new jwt.TokenExpiredError('Token expired', new Date())

      mockJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => AuthService.verifyToken(token)).toThrow('Token has expired')
    })

    it('should throw error for invalid token', () => {
      const token = 'invalid_token'
      const error = new jwt.JsonWebTokenError('Invalid token')

      mockJwt.verify.mockImplementation(() => {
        throw error
      })

      expect(() => AuthService.verifyToken(token)).toThrow('Invalid token')
    })

    it('should throw error for wrong token type', () => {
      const token = 'refresh_token'
      const decoded = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        type: 'refresh' as const,
      }

      mockJwt.verify.mockReturnValue(decoded as never)

      expect(() => AuthService.verifyToken(token, 'access')).toThrow(
        'Invalid token type. Expected access, got refresh',
      )
    })
  })

  describe('RBAC methods', () => {
    const userContext = {
      userId: 'user-123',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:own_profile', 'update:own_profile'],
    }

    describe('hasPermission', () => {
      it('should return true for existing permission', () => {
        const result = AuthService.hasPermission(userContext, 'read:own_profile')
        expect(result).toBe(true)
      })

      it('should return false for non-existing permission', () => {
        const result = AuthService.hasPermission(userContext, 'delete:users')
        expect(result).toBe(false)
      })
    })

    describe('hasRole', () => {
      it('should return true for existing role', () => {
        const result = AuthService.hasRole(userContext, ['user'])
        expect(result).toBe(true)
      })

      it('should return false for non-existing role', () => {
        const result = AuthService.hasRole(userContext, ['admin'])
        expect(result).toBe(false)
      })

      it('should return true if user has any of the specified roles', () => {
        const result = AuthService.hasRole(userContext, ['admin', 'user'])
        expect(result).toBe(true)
      })
    })
  })
})
