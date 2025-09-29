import { describe, it, expect } from '@jest/globals'
import { AuthService } from '../auth.service'

describe('AuthService Basic Tests', () => {
  describe('Password Hashing', () => {
    it('should hash passwords', async () => {
      const password = 'testpassword123'
      const hash = await AuthService.hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are typically 60 chars
    })

    it('should verify correct passwords', async () => {
      const password = 'testpassword123'
      const hash = await AuthService.hashPassword(password)

      const isValid = await AuthService.verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect passwords', async () => {
      const password = 'testpassword123'
      const wrongPassword = 'wrongpassword'
      const hash = await AuthService.hashPassword(password)

      const isValid = await AuthService.verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })
  })

  describe('JWT Token Generation', () => {
    it('should generate access tokens', () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        roles: ['user'],
      }

      const token = AuthService.generateAccessToken(payload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should generate refresh tokens', () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        roles: ['user'],
      }

      const token = AuthService.generateRefreshToken(payload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should verify valid tokens', () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        roles: ['user'],
      }

      const token = AuthService.generateAccessToken(payload)
      const decoded = AuthService.verifyToken(token, 'access')

      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.email).toBe(payload.email)
      expect(decoded.roles).toEqual(payload.roles)
      expect(decoded.type).toBe('access')
    })
  })

  describe('Role and Permission Management', () => {
    it('should check user permissions correctly', () => {
      const userContext = {
        userId: 'user123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read:own_profile', 'update:own_profile'],
      }

      expect(AuthService.hasPermission(userContext, 'read:own_profile')).toBe(true)
      expect(AuthService.hasPermission(userContext, 'delete:users')).toBe(false)
    })

    it('should check user roles correctly', () => {
      const userContext = {
        userId: 'user123',
        email: 'test@example.com',
        roles: ['user', 'premium'],
        permissions: [],
      }

      expect(AuthService.hasRole(userContext, ['user'])).toBe(true)
      expect(AuthService.hasRole(userContext, ['premium'])).toBe(true)
      expect(AuthService.hasRole(userContext, ['admin'])).toBe(false)
      expect(AuthService.hasRole(userContext, ['user', 'admin'])).toBe(true) // Has at least one
    })
  })
})
