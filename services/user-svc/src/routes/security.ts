import type { FastifyInstance } from 'fastify'

import { validateSecurityConfig } from '../config/security.config'
import { AuthMiddleware } from '../middleware/auth.middleware'
import { RateLimitHandler } from '../middleware/rate-limit-handler.middleware'
import { SecurityMiddleware } from '../middleware/security.middleware'
import { ValidationSchemas } from '../schemas/validation.schemas'
import { ComplianceService } from '../services/compliance.service'
import { EncryptionService } from '../services/encryption.service'
import { SecurityTestingService } from '../services/security-testing.service'

// Type definitions for request bodies
interface SecurityValidationRequest {
  data: Record<string, unknown>
  validationType: 'user_input' | 'content' | 'search_query' | 'form_data'
}

interface SecurityEventRequest {
  eventType:
    | 'login_attempt'
    | 'password_change'
    | 'suspicious_activity'
    | 'data_access'
    | 'permission_change'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metadata?: Record<string, unknown>
}

interface EncryptionTestRequest {
  plaintext: string
  testType: 'basic_encryption' | 'pii_encryption' | 'password_hashing'
}

// Type guard for authenticated user
function isAuthenticatedUser(user: unknown): user is { userId: string } {
  return (
    typeof user === 'object' &&
    user !== null &&
    'userId' in user &&
    typeof (user as { userId: unknown }).userId === 'string'
  )
}

export function securityRoutes(server: FastifyInstance): void {
  // CSRF Token endpoint
  server.get(
    '/csrf-token',
    {
      preHandler: [RateLimitHandler.authRateLimit(), SecurityMiddleware.securityHeaders()],
      schema: {
        tags: ['Security'],
        summary: 'Get CSRF token for form submissions',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  csrfToken: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  requestId: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const csrfToken = SecurityMiddleware.generateCSRFToken()
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        // Set CSRF token in cookie
        await reply.setCookie('csrf-token', csrfToken, {
          httpOnly: true,
          secure: request.protocol === 'https',
          sameSite: 'strict',
          maxAge: 60 * 60, // 1 hour
        })

        return reply.send({
          success: true,
          data: {
            csrfToken,
            expiresAt: expiresAt.toISOString(),
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'CSRF token generation failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'CSRF_TOKEN_GENERATION_FAILED',
            message: 'Failed to generate CSRF token',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Security validation endpoint
  server.post(
    '/validate-input',
    {
      preHandler: [
        RateLimitHandler.authRateLimit(),
        SecurityMiddleware.securityHeaders(),
        SecurityMiddleware.csrfProtection(),
        SecurityMiddleware.xssProtection(),
        SecurityMiddleware.sqlInjectionProtection(),
      ],
      schema: {
        tags: ['Security'],
        summary: 'Validate user input for security compliance',
        body: {
          type: 'object',
          properties: {
            data: { type: 'object' },
            validationType: {
              type: 'string',
              enum: ['user_input', 'content', 'search_query', 'form_data'],
            },
          },
          required: ['data', 'validationType'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  isValid: { type: 'boolean' },
                  errors: { type: 'array', items: { type: 'string' } },
                  sanitizedData: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { data, validationType } = request.body as SecurityValidationRequest

        const validationResult = SecurityMiddleware.validateSecurityCompliance(data)

        // Log security validation attempt
        await ComplianceService.logAuditEvent({
          userId: isAuthenticatedUser(request.user) ? request.user.userId : 'anonymous',
          action: 'security_validation',
          resourceType: 'user_input',
          resourceId: validationType,
          metadata: {
            validationType,
            isValid: validationResult.isValid,
            errorCount: validationResult.errors.length,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          timestamp: new Date(),
        })

        return reply.send({
          success: true,
          data: validationResult,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Security validation failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'SECURITY_VALIDATION_FAILED',
            message: 'Security validation failed',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Security event reporting endpoint
  server.post(
    '/report-security-event',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true }),
        RateLimitHandler.authRateLimit(),
        SecurityMiddleware.securityHeaders(),
        SecurityMiddleware.validateInput(ValidationSchemas.Security.securityEvent),
      ],
      schema: {
        tags: ['Security'],
        summary: 'Report a security event or incident',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            eventType: {
              type: 'string',
              enum: [
                'login_attempt',
                'password_change',
                'suspicious_activity',
                'data_access',
                'permission_change',
              ],
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            description: { type: 'string', maxLength: 1000 },
            metadata: { type: 'object' },
          },
          required: ['eventType', 'severity', 'description'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { eventType, severity, description, metadata } = request.body as SecurityEventRequest

        // Ensure user is authenticated
        if (!isAuthenticatedUser(request.user)) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        // Log the security event
        await ComplianceService.logAuditEvent({
          userId: request.user.userId,
          action: 'security_event_reported',
          resourceType: 'security_event',
          resourceId: eventType,
          metadata: {
            eventType,
            severity,
            description,
            reportedMetadata: metadata,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          timestamp: new Date(),
        })

        return reply.send({
          success: true,
          data: {
            eventId: crypto.randomUUID(),
            status: 'reported',
            message: 'Security event reported successfully',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Security event reporting failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'SECURITY_EVENT_REPORTING_FAILED',
            message: 'Failed to report security event',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Encryption test endpoint (for development/testing)
  server.post(
    '/test-encryption',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true, roles: ['admin'] }),
        SecurityMiddleware.securityHeaders(),
      ],
      schema: {
        tags: ['Security', 'Development'],
        summary: 'Test encryption/decryption functionality',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            plaintext: { type: 'string', maxLength: 1000 },
            testType: {
              type: 'string',
              enum: ['basic_encryption', 'pii_encryption', 'password_hashing'],
            },
          },
          required: ['plaintext', 'testType'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { plaintext, testType } = request.body as EncryptionTestRequest

        // Ensure user is authenticated
        if (!isAuthenticatedUser(request.user)) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        let result: Record<string, unknown>

        switch (testType) {
          case 'basic_encryption': {
            const encrypted = EncryptionService.encryptData(plaintext)
            const decrypted = EncryptionService.decryptData(encrypted)
            result = {
              original: plaintext,
              encrypted: encrypted.data.substring(0, 32) + '...',
              decrypted,
              matches: plaintext === decrypted,
            }
            break
          }

          case 'pii_encryption': {
            const piiData = { sensitiveField: plaintext }
            const encryptedPII = EncryptionService.encryptPII(piiData)
            const decryptedPII = EncryptionService.decryptPII(encryptedPII)
            result = {
              original: piiData,
              encrypted: Object.keys(encryptedPII),
              decrypted: decryptedPII,
              matches: piiData.sensitiveField === decryptedPII.sensitiveField,
            }
            break
          }

          case 'password_hashing': {
            const hash = await EncryptionService.hashPassword(plaintext)
            const isValid = await EncryptionService.verifyPassword(plaintext, hash)
            result = {
              original: plaintext,
              hash: hash.substring(0, 32) + '...',
              verified: isValid,
            }
            break
          }

          default:
            throw new Error('Invalid test type')
        }

        // Log encryption test
        await ComplianceService.logAuditEvent({
          userId: request.user.userId,
          action: 'encryption_test',
          resourceType: 'security_test',
          resourceId: testType,
          metadata: {
            testType,
            success: true,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          timestamp: new Date(),
        })

        return reply.send({
          success: true,
          data: result,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Encryption test failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'ENCRYPTION_TEST_FAILED',
            message: 'Encryption test failed',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Security configuration validation endpoint
  server.get(
    '/validate-configuration',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true, roles: ['admin'] }),
        SecurityMiddleware.securityHeaders(),
      ],
      schema: {
        tags: ['Security', 'Admin'],
        summary: 'Validate security configuration',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  encryptionValid: { type: 'boolean' },
                  securityHeadersEnabled: { type: 'boolean' },
                  rateLimitingEnabled: { type: 'boolean' },
                  auditLoggingEnabled: { type: 'boolean' },
                  recommendations: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Ensure user is authenticated
        if (!isAuthenticatedUser(request.user)) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        const encryptionValid = EncryptionService.validateConfiguration()
        const recommendations: string[] = []

        // Check various security configurations
        if (
          typeof process.env.MASTER_ENCRYPTION_KEY !== 'string' ||
          process.env.MASTER_ENCRYPTION_KEY.length === 0
        ) {
          recommendations.push('Set MASTER_ENCRYPTION_KEY environment variable')
        }

        if (typeof process.env.JWT_SECRET !== 'string' || process.env.JWT_SECRET.length === 0) {
          recommendations.push('Set JWT_SECRET environment variable')
        }

        if (request.protocol !== 'https' && process.env.NODE_ENV === 'production') {
          recommendations.push('Enable HTTPS in production')
        }

        // Log configuration validation
        await ComplianceService.logAuditEvent({
          userId: request.user.userId,
          action: 'security_configuration_validated',
          resourceType: 'security_config',
          resourceId: 'system',
          metadata: {
            encryptionValid,
            recommendationCount: recommendations.length,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          timestamp: new Date(),
        })

        return reply.send({
          success: true,
          data: {
            encryptionValid,
            securityHeadersEnabled: true,
            rateLimitingEnabled: true,
            auditLoggingEnabled: true,
            recommendations,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Security configuration validation failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'SECURITY_CONFIG_VALIDATION_FAILED',
            message: 'Security configuration validation failed',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Advanced security audit endpoint (admin only)
  server.get(
    '/audit',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true, roles: ['admin'] }),
        SecurityMiddleware.securityHeaders(),
      ],
      schema: {
        tags: ['Security', 'Admin'],
        summary: 'Run comprehensive security audit',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  overallScore: { type: 'number' },
                  totalTests: { type: 'number' },
                  passedTests: { type: 'number' },
                  failedTests: { type: 'number' },
                  criticalIssues: { type: 'number' },
                  highIssues: { type: 'number' },
                  mediumIssues: { type: 'number' },
                  lowIssues: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Ensure user is authenticated
        if (!isAuthenticatedUser(request.user)) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        // Only allow in non-production environments for security
        if (process.env.NODE_ENV === 'production') {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Security audit endpoint is restricted in production',
            },
          })
        }

        const auditReport = await SecurityTestingService.runSecurityAudit(server)

        // Log security audit
        await ComplianceService.logAuditEvent({
          userId: request.user.userId,
          action: 'security_audit_performed',
          resourceType: 'security_audit',
          resourceId: 'system',
          metadata: {
            overallScore: auditReport.overallScore,
            totalTests: auditReport.totalTests,
            criticalIssues: auditReport.criticalIssues,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          timestamp: new Date(),
        })

        return reply.send({
          success: true,
          data: auditReport,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Security audit failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'SECURITY_AUDIT_FAILED',
            message: 'Security audit could not be completed',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Penetration testing endpoint (admin only)
  server.get(
    '/pentest',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true, roles: ['admin'] }),
        SecurityMiddleware.securityHeaders(),
      ],
      schema: {
        tags: ['Security', 'Admin'],
        summary: 'Run penetration testing suite',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  totalTests: { type: 'number' },
                  vulnerabilities: { type: 'number' },
                  criticalVulns: { type: 'number' },
                  highVulns: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Ensure user is authenticated
        if (!isAuthenticatedUser(request.user)) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        if (process.env.NODE_ENV === 'production') {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Penetration testing endpoint is restricted in production',
            },
          })
        }

        const pentestResults = await SecurityTestingService.runPenetrationTests(server)

        const summary = {
          totalTests: pentestResults.length,
          vulnerabilities: pentestResults.filter((r) => r.vulnerability).length,
          criticalVulns: pentestResults.filter((r) => r.vulnerability && r.severity === 'critical')
            .length,
          highVulns: pentestResults.filter((r) => r.vulnerability && r.severity === 'high').length,
        }

        // Log penetration test
        await ComplianceService.logAuditEvent({
          userId: request.user.userId,
          action: 'penetration_test_performed',
          resourceType: 'security_pentest',
          resourceId: 'system',
          metadata: summary,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          timestamp: new Date(),
        })

        return reply.send({
          success: true,
          data: {
            results: pentestResults,
            summary,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Penetration testing failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'PENTEST_FAILED',
            message: 'Penetration testing could not be completed',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Security report generation
  server.get(
    '/report',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true, roles: ['admin'] }),
        SecurityMiddleware.securityHeaders(),
      ],
      schema: {
        tags: ['Security', 'Admin'],
        summary: 'Generate comprehensive security report',
        security: [{ bearerAuth: [] }],
        produces: ['text/markdown'],
      },
    },
    async (request, reply) => {
      try {
        // Ensure user is authenticated
        if (!isAuthenticatedUser(request.user)) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        if (process.env.NODE_ENV === 'production') {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Security report endpoint is restricted in production',
            },
          })
        }

        const auditReport = await SecurityTestingService.runSecurityAudit(server)
        const pentestResults = await SecurityTestingService.runPenetrationTests(server)
        const report = SecurityTestingService.generateSecurityReport(auditReport, pentestResults)

        // Log report generation
        await ComplianceService.logAuditEvent({
          userId: request.user.userId,
          action: 'security_report_generated',
          resourceType: 'security_report',
          resourceId: 'system',
          metadata: {
            auditScore: auditReport.overallScore,
            vulnerabilityCount: pentestResults.filter((r) => r.vulnerability).length,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          timestamp: new Date(),
        })

        await reply.header('Content-Type', 'text/markdown')
        await reply.header(
          'Content-Disposition',
          `attachment; filename="security-report-${new Date().toISOString().split('T')[0]}.md"`,
        )

        return reply.send(report)
      } catch (error) {
        request.log.error(error, 'Security report generation failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'REPORT_FAILED',
            message: 'Security report could not be generated',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Enhanced security configuration validation
  server.get(
    '/config/validate-enhanced',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true, roles: ['admin'] }),
        SecurityMiddleware.securityHeaders(),
      ],
      schema: {
        tags: ['Security', 'Admin'],
        summary: 'Enhanced security configuration validation',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Ensure user is authenticated
        if (!isAuthenticatedUser(request.user)) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        const configValidation = validateSecurityConfig()
        const encryptionValid = EncryptionService.validateConfiguration()

        const enhancedValidation = {
          ...configValidation,
          encryptionValid,
          environment: process.env.NODE_ENV,
          httpsEnabled: request.protocol === 'https',
          securityFeatures: {
            helmet: server.hasPlugin('@fastify/helmet'),
            cors: server.hasPlugin('@fastify/cors'),
            rateLimit: server.hasPlugin('@fastify/rate-limit'),
            csrf: true, // Our custom implementation
            xss: true, // Our custom implementation
            sqlInjection: true, // Our custom implementation
          },
        }

        // Log configuration validation
        await ComplianceService.logAuditEvent({
          userId: request.user.userId,
          action: 'enhanced_security_config_validated',
          resourceType: 'security_config',
          resourceId: 'system',
          metadata: enhancedValidation,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          timestamp: new Date(),
        })

        return reply.send({
          success: configValidation.valid && encryptionValid,
          data: enhancedValidation,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Enhanced security configuration validation failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'ENHANCED_CONFIG_VALIDATION_FAILED',
            message: 'Enhanced security configuration validation failed',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Security headers test endpoint
  server.get(
    '/headers/test',
    {
      preHandler: [SecurityMiddleware.securityHeaders()],
      schema: {
        tags: ['Security'],
        summary: 'Test security headers implementation',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  headers: { type: 'object' },
                  recommendations: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const headers = reply.getHeaders()
      const recommendations: string[] = []

      // Check for important security headers
      if (typeof headers['x-content-type-options'] !== 'string') {
        recommendations.push('Add X-Content-Type-Options header')
      }
      if (typeof headers['x-frame-options'] !== 'string') {
        recommendations.push('Add X-Frame-Options header')
      }
      if (typeof headers['content-security-policy'] !== 'string') {
        recommendations.push('Add Content-Security-Policy header')
      }
      if (
        request.protocol === 'https' &&
        typeof headers['strict-transport-security'] !== 'string'
      ) {
        recommendations.push('Add Strict-Transport-Security header for HTTPS')
      }

      return reply.send({
        success: true,
        data: {
          headers: Object.fromEntries(
            Object.entries(headers).filter(
              ([key]) =>
                key.toLowerCase().startsWith('x-') ||
                key.toLowerCase().includes('security') ||
                key.toLowerCase().includes('content-security-policy') ||
                key.toLowerCase().includes('strict-transport-security'),
            ),
          ),
          recommendations,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      })
    },
  )
}
