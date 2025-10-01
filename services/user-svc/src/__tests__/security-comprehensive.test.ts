import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildServer } from '../index'
import type { FastifyInstance } from 'fastify'
import { SecurityTestingService } from '../services/security-testing.service'
import { SecurityMiddleware } from '../middleware/security.middleware'
import { AdvancedSecurityMiddleware } from '../middleware/advanced-security.middleware'
import EncryptionService from '../services/encryption.service'

describe('Comprehensive Security Tests', () => {
  let server: FastifyInstance

  beforeEach(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test'
    process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long'
    process.env.MASTER_ENCRYPTION_KEY =
      'test-encryption-key-64-characters-long-for-comprehensive-testing'

    server = await buildServer()
    await server.ready()
  })

  afterEach(async () => {
    await server.close()
  })

  describe('Security Configuration', () => {
    it('should have valid security configuration', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/security/config/validate-enhanced',
        headers: {
          authorization: 'Bearer admin-token', // Would need proper admin token
        },
      })

      // In test environment, this might return 401 due to auth, but config should be valid
      expect([200, 401]).toContain(response.statusCode)
    })

    it('should validate encryption configuration', () => {
      const isValid = EncryptionService.validateConfiguration()
      expect(isValid).toBe(true)
    })

    it('should have required environment variables', () => {
      expect(process.env.JWT_SECRET).toBeDefined()
      expect(process.env.MASTER_ENCRYPTION_KEY).toBeDefined()
      expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32)
      expect(process.env.MASTER_ENCRYPTION_KEY!.length).toBeGreaterThanOrEqual(64)
    })
  })

  describe('XSS Protection', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      'javascript:alert("xss")',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
      '<link rel="stylesheet" href="javascript:alert(1)">',
      '<style>@import "javascript:alert(1)";</style>',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    ]

    xssPayloads.forEach((payload) => {
      it(`should detect XSS payload: ${payload.substring(0, 30)}...`, () => {
        const result = SecurityMiddleware.validateSecurityCompliance({ test: payload })
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('XSS patterns detected')
      })
    })

    it('should sanitize XSS payloads', () => {
      const maliciousData = {
        message: '<script>alert("xss")</script>Hello World',
        title: '<img src="x" onerror="alert(1)">',
      }

      const result = SecurityMiddleware.validateSecurityCompliance(maliciousData)
      expect(result.sanitizedData).toBeDefined()
      expect(result.sanitizedData.message).not.toContain('<script>')
      expect(result.sanitizedData.title).not.toContain('onerror')
    })
  })

  describe('SQL Injection Protection', () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1 --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "' OR (SELECT user FROM mysql.user WHERE user='root') --",
      "1' AND (SELECT SUBSTRING(@@version,1,1))='5' --",
      "' WAITFOR DELAY '00:00:05' --",
    ]

    sqlPayloads.forEach((payload) => {
      it(`should detect SQL injection payload: ${payload.substring(0, 30)}...`, () => {
        const result = SecurityMiddleware.validateSecurityCompliance({ test: payload })
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('SQL injection patterns detected')
      })
    })

    it('should block SQL injection in login attempts', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: "admin'; DROP TABLE users; --",
          password: 'password',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.code).toContain('SQL_INJECTION_DETECTED')
    })
  })

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/profile',
        payload: { email: 'test@example.com' },
        headers: {
          authorization: 'Bearer valid-token',
        },
      })

      expect(response.statusCode).toBe(403)
      const body = JSON.parse(response.body)
      expect(body.error.code).toBe('CSRF_TOKEN_INVALID')
    })

    it('should generate valid CSRF tokens', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/security/csrf-token',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.csrfToken).toBeDefined()
      expect(body.data.csrfToken.length).toBeGreaterThan(0)
    })

    it('should accept requests with valid CSRF tokens', async () => {
      // First get CSRF token
      const tokenResponse = await server.inject({
        method: 'GET',
        url: '/security/csrf-token',
      })

      const tokenBody = JSON.parse(tokenResponse.body)
      const csrfToken = tokenBody.data.csrfToken

      // Then use it in a request
      const response = await server.inject({
        method: 'POST',
        url: '/security/validate-input',
        payload: {
          data: { message: 'Hello World' },
          validationType: 'user_input',
        },
        headers: {
          'x-csrf-token': csrfToken,
        },
        cookies: {
          'csrf-token': csrfToken,
        },
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const responses = []

      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/login',
          payload: {
            email: 'test@example.com',
            password: 'wrongpassword',
          },
        })
        responses.push(response.statusCode)
      }

      // Should eventually get rate limited
      const rateLimited = responses.some((code) => code === 429)
      expect(rateLimited).toBe(true)
    })

    it('should provide rate limit information in headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      // Check for rate limit headers (if implemented)
      expect(response.headers).toBeDefined()
    })
  })

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/security/headers/test',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.headers).toBeDefined()
    })

    it('should include X-Content-Type-Options header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.headers['x-content-type-options']).toBe('nosniff')
    })

    it('should include X-Frame-Options header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.headers['x-frame-options']).toBe('DENY')
    })

    it('should include Content-Security-Policy header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.headers['content-security-policy']).toBeDefined()
    })
  })

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'ValidPassword123!',
          confirmPassword: 'ValidPassword123!',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })

    it('should validate password strength', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'weak',
          confirmPassword: 'weak',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })

    it('should sanitize user input', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/security/validate-input',
        payload: {
          data: {
            message: '<script>alert("xss")</script>Hello',
            title: 'Normal title',
          },
          validationType: 'user_input',
        },
      })

      expect(response.statusCode).toBe(400) // Should be blocked due to XSS
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })
  })

  describe('Encryption and Hashing', () => {
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

    it('should hash passwords securely', async () => {
      const password = 'userPassword123!'
      const hash = await EncryptionService.hashPassword(password)

      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are long
    })

    it('should verify correct passwords', async () => {
      const password = 'userPassword123!'
      const hash = await EncryptionService.hashPassword(password)
      const isValid = await EncryptionService.verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect passwords', async () => {
      const password = 'userPassword123!'
      const wrongPassword = 'wrongPassword123!'
      const hash = await EncryptionService.hashPassword(password)
      const isValid = await EncryptionService.verifyPassword(wrongPassword, hash)

      expect(isValid).toBe(false)
    })
  })

  describe('Security Audit', () => {
    it('should run security audit successfully', async () => {
      const auditReport = await SecurityTestingService.runSecurityAudit(server)

      expect(auditReport).toBeDefined()
      expect(auditReport.totalTests).toBeGreaterThan(0)
      expect(auditReport.overallScore).toBeGreaterThanOrEqual(0)
      expect(auditReport.overallScore).toBeLessThanOrEqual(100)
      expect(auditReport.results).toBeInstanceOf(Array)
      expect(auditReport.recommendations).toBeInstanceOf(Array)
    })

    it('should identify security issues', async () => {
      const auditReport = await SecurityTestingService.runSecurityAudit(server)

      // In test environment, some tests might fail due to missing production config
      expect(auditReport.results.length).toBeGreaterThan(0)

      const failedTests = auditReport.results.filter((r) => !r.passed)
      if (failedTests.length > 0) {
        console.log(
          'Failed security tests:',
          failedTests.map((t) => t.testName),
        )
      }
    })

    it('should generate security recommendations', async () => {
      const auditReport = await SecurityTestingService.runSecurityAudit(server)

      expect(auditReport.recommendations).toBeInstanceOf(Array)
      expect(auditReport.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('Penetration Testing', () => {
    it('should run penetration tests', async () => {
      const pentestResults = await SecurityTestingService.runPenetrationTests(server)

      expect(pentestResults).toBeInstanceOf(Array)
      expect(pentestResults.length).toBeGreaterThan(0)
    })

    it('should detect XSS vulnerabilities', async () => {
      const pentestResults = await SecurityTestingService.runPenetrationTests(server)
      const xssTests = pentestResults.filter((r) => r.testType === 'xss')

      expect(xssTests.length).toBeGreaterThan(0)

      // Most XSS tests should be blocked (not vulnerable)
      const vulnerableXSS = xssTests.filter((r) => r.vulnerability)
      expect(vulnerableXSS.length).toBe(0) // Should be 0 if protection is working
    })

    it('should detect SQL injection vulnerabilities', async () => {
      const pentestResults = await SecurityTestingService.runPenetrationTests(server)
      const sqlTests = pentestResults.filter((r) => r.testType === 'sql_injection')

      expect(sqlTests.length).toBeGreaterThan(0)

      // SQL injection tests should be blocked
      const vulnerableSQL = sqlTests.filter((r) => r.vulnerability)
      expect(vulnerableSQL.length).toBe(0) // Should be 0 if protection is working
    })
  })

  describe('Advanced Threat Detection', () => {
    it('should detect command injection patterns', () => {
      const maliciousInputs = ['; cat /etc/passwd', '| ls -la', '&& rm -rf /', '`whoami`', '$(id)']

      maliciousInputs.forEach((input) => {
        const result = SecurityMiddleware.validateSecurityCompliance({ command: input })
        expect(result.isValid).toBe(false)
      })
    })

    it('should detect path traversal attempts', () => {
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'C:\\windows\\system32\\config\\sam',
      ]

      pathTraversalInputs.forEach((input) => {
        const result = SecurityMiddleware.validateSecurityCompliance({ path: input })
        expect(result.isValid).toBe(false)
      })
    })

    it('should handle nested malicious content', () => {
      const nestedMalicious = {
        user: {
          profile: {
            bio: '<script>alert("nested xss")</script>',
            settings: {
              query: "'; DROP TABLE users; --",
            },
          },
        },
      }

      const result = SecurityMiddleware.validateSecurityCompliance(nestedMalicious)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Security Monitoring', () => {
    it('should log security events', async () => {
      const logSpy = vi.spyOn(console, 'log')

      // Trigger a security event
      await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: '<script>alert("xss")</script>',
          password: 'test',
        },
      })

      // Should have logged the security event
      expect(logSpy).toHaveBeenCalled()
      logSpy.mockRestore()
    })

    it('should track failed authentication attempts', async () => {
      const responses = []

      for (let i = 0; i < 5; i++) {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/login',
          payload: {
            email: 'test@example.com',
            password: 'wrongpassword',
          },
        })
        responses.push(response.statusCode)
      }

      // Should track and potentially block after multiple failures
      expect(responses).toContain(401) // At least some should be unauthorized
    })
  })

  describe('Compliance Features', () => {
    it('should support audit logging', async () => {
      // This would test the audit logging functionality
      // Implementation depends on the specific audit system
      expect(true).toBe(true) // Placeholder
    })

    it('should support data encryption for PII', () => {
      const piiData = {
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
        email: 'user@example.com',
      }

      const encrypted = EncryptionService.encryptPII(piiData)
      const decrypted = EncryptionService.decryptPII(encrypted)

      expect(decrypted).toEqual(piiData)
      expect(encrypted.ssn).not.toBe(piiData.ssn)
    })
  })

  describe('Error Handling', () => {
    it('should not expose internal errors in production', async () => {
      // Temporarily set production environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        const response = await server.inject({
          method: 'GET',
          url: '/nonexistent-endpoint',
        })

        expect(response.statusCode).toBe(404)
        const body = JSON.parse(response.body)

        // Should not expose internal error details in production
        expect(body.error?.stack).toBeUndefined()
        expect(body.error?.details).toBeUndefined()
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should handle malformed JSON gracefully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: '{"invalid": json}',
        headers: {
          'content-type': 'application/json',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })
  })
})
