import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { buildServer } from '../index'
import type { FastifyInstance } from 'fastify'

describe('Authentication Integration Tests', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = await buildServer()
  })

  afterAll(async () => {
    await server.close()
  })

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('LOGIN_FAILED')
    })

    it('should return 400 for missing email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          password: 'password123',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 for missing password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /auth/register', () => {
    it('should return 400 for missing email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          password: 'password123',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 for missing password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 for invalid email format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'password123',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 for short password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: '123',
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /auth/refresh', () => {
    it('should return 401 for missing refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 401 for invalid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('TOKEN_REFRESH_FAILED')
    })
  })

  describe('GET /auth/validate', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/validate',
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('MISSING_TOKEN')
    })

    it('should return 401 for invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/validate',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('INVALID_TOKEN')
    })
  })

  describe('POST /auth/logout', () => {
    it('should return 200 even without authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/logout',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.message).toBe('Logged out successfully')
    })
  })

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('healthy')
      expect(body.service).toBe('user-svc')
    })
  })

  describe('GET /ready', () => {
    it('should return ready status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/ready',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('ready')
    })
  })
})
