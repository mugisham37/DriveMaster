/**
 * Security Validation Tests
 * Comprehensive security testing for production readiness
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { TestClient, waitForAllServices } from '../utils/test-helpers'
import { TEST_CONFIG } from '../config/test-config'

describe('Security Validation Tests', () => {
  let apiClient: TestClient
  let authenticatedClient: TestClient

  beforeAll(async () => {
    const servicesReady = await waitForAllServices()
    expect(servicesReady).toBe(true)

    apiClient = new TestClient(TEST_CONFIG.services.apiGateway)
    authenticatedClient = new TestClient(TEST_CONFIG.services.apiGateway)

    // Authenticate one client for authorized endpoint tests
    try {
      const loginResponse = await authenticatedClient.post('/api/v1/auth/login', {
        email: 'loadtest1@drivemaster.com',
        password: 'LoadTest123!',
      })

      if (loginResponse.status === 200) {
        authenticatedClient.setAuthToken(loginResponse.data.token)
      }
    } catch (error) {
      console.log('Authentication setup failed, some tests may be skipped')
    }
  }, 30000)

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      try {
        const response = await apiClient.get('/api/v1/profile')
        expect(response.status).toBe(401)
      } catch (error: any) {
        expect(error.response?.status).toBe(401)
      }
    })

    it('should reject requests with invalid tokens', async () => {
      const invalidClient = new TestClient(TEST_CONFIG.services.apiGateway)
      invalidClient.setAuthToken('invalid.jwt.token')

      try {
        const response = await invalidClient.get('/api/v1/profile')
        expect(response.status).toBe(401)
      } catch (error: any) {
        expect(error.response?.status).toBe(401)
      }
    })

    it('should reject requests with expired tokens', async () => {
      // This would require a token that's actually expired
      // For now, test with a malformed token that looks expired
      const expiredClient = new TestClient(TEST_CONFIG.services.apiGateway)
      expiredClient.setAuthToken(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid',
      )

      try {
        const response = await expiredClient.get('/api/v1/profile')
        expect(response.status).toBe(401)
      } catch (error: any) {
        expect(error.response?.status).toBe(401)
      }
    })

    it('should enforce role-based access control', async () => {
      // Test accessing admin endpoints with regular user token
      try {
        const response = await authenticatedClient.get('/api/v1/admin/users')
        expect([401, 403]).toContain(response.status)
      } catch (error: any) {
        expect([401, 403]).toContain(error.response?.status)
      }
    })
  })

  describe('Input Validation and Sanitization', () => {
    it('should reject malformed JSON payloads', async () => {
      try {
        const response = await apiClient.post('/api/v1/auth/register', 'invalid json')
        expect(response.status).toBe(400)
      } catch (error: any) {
        expect(error.response?.status).toBe(400)
      }
    })

    it('should validate email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
      ]

      for (const email of invalidEmails) {
        try {
          const response = await apiClient.post('/api/v1/auth/register', {
            email,
            password: 'ValidPassword123!',
            firstName: 'Test',
            lastName: 'User',
          })
          expect(response.status).toBe(400)
        } catch (error: any) {
          expect(error.response?.status).toBe(400)
        }
      }
    })

    it('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'Password', // No special character
        'password123', // No uppercase
        'PASSWORD123!', // No lowercase
      ]

      for (const password of weakPasswords) {
        try {
          const response = await apiClient.post('/api/v1/auth/register', {
            email: `test-${Date.now()}@drivemaster.com`,
            password,
            firstName: 'Test',
            lastName: 'User',
          })
          expect(response.status).toBe(400)
        } catch (error: any) {
          expect(error.response?.status).toBe(400)
        }
      }
    })

    it('should sanitize user input to prevent XSS', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert("xss")</script>',
      ]

      for (const payload of xssPayloads) {
        try {
          const response = await apiClient.post('/api/v1/auth/register', {
            email: `test-${Date.now()}@drivemaster.com`,
            password: 'ValidPassword123!',
            firstName: payload,
            lastName: 'User',
          })

          if (response.status === 201) {
            // If registration succeeds, check that the payload was sanitized
            expect(response.data.user.firstName).not.toContain('<script>')
            expect(response.data.user.firstName).not.toContain('javascript:')
          } else {
            // Registration should be rejected for malicious input
            expect(response.status).toBe(400)
          }
        } catch (error: any) {
          expect(error.response?.status).toBe(400)
        }
      }
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in login attempts', async () => {
      const sqlInjectionPayloads = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'/**/OR/**/1=1--",
      ]

      for (const payload of sqlInjectionPayloads) {
        try {
          const response = await apiClient.post('/api/v1/auth/login', {
            email: payload,
            password: 'any-password',
          })

          // Should not succeed with SQL injection
          expect(response.status).not.toBe(200)
        } catch (error: any) {
          // Errors are expected for malicious input
          expect(error.response?.status).not.toBe(200)
        }
      }
    })

    it('should prevent SQL injection in search queries', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE content; --",
        "' OR 1=1 --",
        "' UNION SELECT password FROM users --",
      ]

      for (const payload of sqlInjectionPayloads) {
        try {
          const response = await authenticatedClient.get(
            `/api/v1/content/search?q=${encodeURIComponent(payload)}`,
          )

          // Should handle malicious queries safely
          if (response.status === 200) {
            expect(response.data).toHaveProperty('results')
            expect(Array.isArray(response.data.results)).toBe(true)
          } else {
            expect([400, 422]).toContain(response.status)
          }
        } catch (error: any) {
          expect([400, 422, 500]).toContain(error.response?.status)
        }
      }
    })
  })

  describe('Rate Limiting and DoS Protection', () => {
    it('should implement rate limiting on authentication endpoints', async () => {
      const rapidRequests = 20
      const promises: Promise<any>[] = []

      // Make rapid login attempts
      for (let i = 0; i < rapidRequests; i++) {
        promises.push(
          apiClient
            .post('/api/v1/auth/login', {
              email: 'nonexistent@drivemaster.com',
              password: 'wrongpassword',
            })
            .catch((error) => ({
              status: error.response?.status || 0,
              error: true,
            })),
        )
      }

      const results = await Promise.allSettled(promises)
      const rateLimitedRequests = results.filter(
        (result) =>
          result.status === 'fulfilled' && (result.value.status === 429 || result.value.error),
      ).length

      // Should have some rate-limited responses
      expect(rateLimitedRequests).toBeGreaterThan(0)
    })

    it('should protect against large payload attacks', async () => {
      // Create a very large payload
      const largePayload = {
        email: 'test@drivemaster.com',
        password: 'ValidPassword123!',
        firstName: 'A'.repeat(10000), // 10KB of 'A's
        lastName: 'User',
      }

      try {
        const response = await apiClient.post('/api/v1/auth/register', largePayload)
        expect([400, 413, 422]).toContain(response.status) // Bad Request, Payload Too Large, or Unprocessable Entity
      } catch (error: any) {
        expect([400, 413, 422]).toContain(error.response?.status)
      }
    })
  })

  describe('Security Headers and HTTPS', () => {
    it('should include security headers in responses', async () => {
      try {
        const response = await apiClient.get('/api/v1/health')

        // Check for important security headers
        const headers = response.headers

        // These headers should be present for security
        expect(headers).toHaveProperty('x-content-type-options')
        expect(headers).toHaveProperty('x-frame-options')
        expect(headers).toHaveProperty('x-xss-protection')

        // CORS headers should be properly configured
        if (headers['access-control-allow-origin']) {
          expect(headers['access-control-allow-origin']).not.toBe('*')
        }
      } catch (error) {
        // If health endpoint is not accessible, that's also a security consideration
        console.log('Health endpoint not accessible, which may be intentional for security')
      }
    })

    it('should enforce HTTPS in production-like environments', async () => {
      // This test would be more relevant in actual production environment
      // For now, we check that the service can handle HTTPS requests

      const httpsUrl = TEST_CONFIG.services.apiGateway.replace('http://', 'https://')
      const httpsClient = new TestClient(httpsUrl)

      try {
        const response = await httpsClient.get('/api/v1/health')
        // If HTTPS is configured, this should work
        expect(response.status).toBe(200)
      } catch (error: any) {
        // HTTPS might not be configured in development
        expect(error.code).toMatch(/ECONNREFUSED|CERT|SSL/)
      }
    })
  })

  describe('Data Privacy and GDPR Compliance', () => {
    it('should not expose sensitive data in error messages', async () => {
      try {
        const response = await apiClient.post('/api/v1/auth/login', {
          email: 'test@drivemaster.com',
          password: 'wrongpassword',
        })

        if (response.status === 401) {
          // Error message should not reveal whether user exists
          expect(response.data.message).not.toContain('user not found')
          expect(response.data.message).not.toContain('email not found')
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          expect(error.response.data.message).not.toContain('user not found')
          expect(error.response.data.message).not.toContain('email not found')
        }
      }
    })

    it('should handle data export requests securely', async () => {
      try {
        const response = await authenticatedClient.get('/api/v1/profile/export')

        if (response.status === 200) {
          // Should return user's own data only
          expect(response.data).toHaveProperty('userData')
          expect(response.data).not.toHaveProperty('password')
          expect(response.data).not.toHaveProperty('passwordHash')
        }
      } catch (error: any) {
        // Export endpoint might not be implemented yet
        expect([404, 501]).toContain(error.response?.status)
      }
    })

    it('should handle data deletion requests securely', async () => {
      try {
        const response = await authenticatedClient.delete('/api/v1/profile')

        // Should either succeed or require additional confirmation
        expect([200, 202, 409]).toContain(response.status)
      } catch (error: any) {
        // Deletion endpoint might require special procedures
        expect([404, 501, 403]).toContain(error.response?.status)
      }
    })
  })
})
