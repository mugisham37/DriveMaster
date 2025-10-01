import crypto from 'crypto'

import type { FastifyInstance } from 'fastify'

import { AuthMiddleware } from '../middleware/auth.middleware'
import { RateLimitHandler } from '../middleware/rate-limit-handler.middleware'
import { SecurityMiddleware } from '../middleware/security.middleware'
import { ValidationSchemas } from '../schemas/validation.schemas'
import { ComplianceService } from '../services/compliance.service'
import type { UserContext } from '../types/auth.types'

export function complianceRoutes(server: FastifyInstance): void {
  // Update user consent preferences
  server.post(
    '/consent',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true }),
        RateLimitHandler.authRateLimit(),
        SecurityMiddleware.securityHeaders(),
        SecurityMiddleware.csrfProtection(),
        SecurityMiddleware.validateInput(ValidationSchemas.Compliance.consentUpdate),
      ],
      schema: {
        tags: ['Compliance', 'GDPR'],
        summary: 'Update user consent preferences',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            marketingConsent: { type: 'boolean' },
            analyticsConsent: { type: 'boolean' },
            functionalConsent: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  consentsUpdated: { type: 'array', items: { type: 'string' } },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { marketingConsent, analyticsConsent, functionalConsent } = request.body as {
          marketingConsent?: boolean
          analyticsConsent?: boolean
          functionalConsent?: boolean
        }

        const consentsUpdated: string[] = []

        // Update each consent type if provided
        const user = request.user as UserContext | undefined
        if (user?.userId === undefined || user.userId === null || user.userId === '') {
          throw new Error('User ID not found in request')
        }

        if (marketingConsent !== undefined) {
          await ComplianceService.updateConsent(user.userId, {
            consentType: 'marketing',
            granted: marketingConsent,
          })
          consentsUpdated.push('marketing')
        }

        if (analyticsConsent !== undefined) {
          await ComplianceService.updateConsent(user.userId, {
            consentType: 'analytics',
            granted: analyticsConsent,
          })
          consentsUpdated.push('analytics')
        }

        if (functionalConsent !== undefined) {
          await ComplianceService.updateConsent(user.userId, {
            consentType: 'functional',
            granted: functionalConsent,
          })
          consentsUpdated.push('functional')
        }

        return reply.send({
          success: true,
          data: {
            consentsUpdated,
            timestamp: new Date().toISOString(),
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Consent update failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'CONSENT_UPDATE_FAILED',
            message: 'Failed to update consent preferences',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Get user consent history
  server.get(
    '/consent',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true }),
        SecurityMiddleware.securityHeaders(),
      ],
      schema: {
        tags: ['Compliance', 'GDPR'],
        summary: 'Get user consent history',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  consents: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        consentType: { type: 'string' },
                        granted: { type: 'boolean' },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string' },
                      },
                    },
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
        const user = request.user as UserContext | undefined
        if (user?.userId === undefined || user.userId === null || user.userId === '') {
          throw new Error('User ID not found in request')
        }

        const consents = await ComplianceService.getUserConsents(user.userId)

        return reply.send({
          success: true,
          data: {
            consents: consents.map((consent) => ({
              consentType: consent.consentType,
              granted: consent.granted,
              timestamp: consent.timestamp.toISOString(),
              version: consent.version,
            })),
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Failed to get consent history')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'CONSENT_HISTORY_FAILED',
            message: 'Failed to retrieve consent history',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Request data export (GDPR Article 20 - Data Portability)
  server.post(
    '/data-export',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true }),
        RateLimitHandler.authRateLimit(),
        SecurityMiddleware.securityHeaders(),
        SecurityMiddleware.csrfProtection(),
        SecurityMiddleware.validateInput(ValidationSchemas.Compliance.dataExportRequest),
      ],
      schema: {
        tags: ['Compliance', 'GDPR'],
        summary: 'Request user data export',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['json', 'csv', 'xml'] },
            includePersonalData: { type: 'boolean' },
            includeActivityData: { type: 'boolean' },
            includeAnalytics: { type: 'boolean' },
          },
          required: ['format'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  exportId: { type: 'string' },
                  downloadUrl: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' },
                  estimatedSize: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Extract request parameters (currently not used in mock implementation)
        // const { format, includePersonalData, includeActivityData, includeAnalytics } = request.body

        const user = request.user as UserContext | undefined
        if (user?.userId === undefined || user.userId === null || user.userId === '') {
          throw new Error('User ID not found in request')
        }

        const exportData = await ComplianceService.exportUserData(user.userId)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        return reply.send({
          success: true,
          data: {
            exportId: crypto.randomUUID(),
            downloadUrl: `/api/v1/compliance/export/${exportData.userId}`,
            expiresAt: expiresAt.toISOString(),
            estimatedSize: 'Processing...',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Data export request failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'DATA_EXPORT_FAILED',
            message: 'Failed to process data export request',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Request data deletion (GDPR Article 17 - Right to be Forgotten)
  server.post(
    '/data-deletion',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true }),
        RateLimitHandler.authRateLimit(),
        SecurityMiddleware.securityHeaders(),
        SecurityMiddleware.csrfProtection(),
        SecurityMiddleware.validateInput(ValidationSchemas.Compliance.dataDeletionRequest),
      ],
      schema: {
        tags: ['Compliance', 'GDPR'],
        summary: 'Request account and data deletion',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              enum: [
                'no_longer_needed',
                'withdraw_consent',
                'object_to_processing',
                'unlawful_processing',
                'other',
              ],
            },
            confirmDeletion: { type: 'boolean' },
            keepAnonymizedData: { type: 'boolean' },
          },
          required: ['reason', 'confirmDeletion'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  deletionId: { type: 'string' },
                  scheduledFor: { type: 'string', format: 'date-time' },
                  confirmationToken: { type: 'string' },
                  gracePeriodDays: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { confirmDeletion } = request.body as {
          reason: string
          confirmDeletion: boolean
          keepAnonymizedData?: boolean
        }

        if (!confirmDeletion) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'DELETION_NOT_CONFIRMED',
              message: 'Deletion must be explicitly confirmed',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        // Variables for future implementation
        // const gracePeriodDays = 30
        // const scheduledFor = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000)
        // const confirmationToken = crypto.randomUUID()

        const user = request.user as UserContext | undefined
        if (user?.userId === undefined || user.userId === null || user.userId === '') {
          throw new Error('User ID not found in request')
        }

        const deletionRequest = await ComplianceService.requestDataDeletion(user.userId)

        return reply.send({
          success: true,
          data: {
            deletionId: deletionRequest.userId,
            scheduledFor: deletionRequest.requestedAt.toISOString(),
            status: deletionRequest.status,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Data deletion request failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'DATA_DELETION_FAILED',
            message: 'Failed to process data deletion request',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Get audit logs for user (GDPR Article 15 - Right of Access)
  server.get(
    '/audit-logs',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true }),
        SecurityMiddleware.securityHeaders(),
      ],
      schema: {
        tags: ['Compliance', 'GDPR'],
        summary: 'Get user audit logs',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            action: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  auditLogs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        action: { type: 'string' },
                        resourceType: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        ipAddress: { type: 'string' },
                        metadata: { type: 'object' },
                      },
                    },
                  },
                  totalCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          startDate,
          endDate,
          action,
          // limit = 100, // Not used in current implementation
        } = request.query as {
          startDate?: string
          endDate?: string
          action?: string
          limit?: number
        }

        const user = request.user as UserContext | undefined
        if (user?.userId === undefined || user.userId === null || user.userId === '') {
          throw new Error('User ID not found in request')
        }

        const auditLogs = await ComplianceService.getUserAuditLogs(
          user.userId,
          startDate !== undefined && startDate !== null && startDate !== ''
            ? new Date(startDate)
            : undefined,
          endDate !== undefined && endDate !== null && endDate !== ''
            ? new Date(endDate)
            : undefined,
          action,
        )

        // Logs are already filtered by action in the service call

        return reply.send({
          success: true,
          data: {
            auditLogs: auditLogs.map((log) => ({
              action: log.action,
              resourceType: log.resourceType,
              timestamp: log.timestamp.toISOString(),
              ipAddress: log.ipAddress,
              metadata: log.metadata,
            })),
            totalCount: auditLogs.length,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Failed to get audit logs')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'AUDIT_LOGS_FAILED',
            message: 'Failed to retrieve audit logs',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Admin: Generate compliance report
  server.get(
    '/admin/compliance-report',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true, roles: ['admin'] }),
        SecurityMiddleware.securityHeaders(),
      ],
      schema: {
        tags: ['Compliance', 'Admin'],
        summary: 'Generate compliance report',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  totalUsers: { type: 'number' },
                  activeConsents: { type: 'number' },
                  pendingDeletions: { type: 'number' },
                  completedExports: { type: 'number' },
                  auditLogEntries: { type: 'number' },
                  dataRetentionCompliance: { type: 'boolean' },
                  lastComplianceCheck: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const user = request.user as UserContext | undefined
        if (user?.userId === undefined || user.userId === null || user.userId === '') {
          throw new Error('User ID not found in request')
        }

        const report = await ComplianceService.generateComplianceReport('general')

        // Log compliance report generation
        await ComplianceService.logAuditEvent({
          userId: user.userId,
          action: 'compliance_report_generated',
          resourceType: 'compliance_report',
          resourceId: 'system',
          metadata: {
            reportData: report,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          timestamp: new Date(),
        })

        return reply.send({
          success: true,
          data: report,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Compliance report generation failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'COMPLIANCE_REPORT_FAILED',
            message: 'Failed to generate compliance report',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )

  // Admin: Check data retention compliance
  server.get(
    '/admin/data-retention-check',
    {
      preHandler: [
        AuthMiddleware.authenticate({ required: true, roles: ['admin'] }),
        SecurityMiddleware.securityHeaders(),
      ],
      schema: {
        tags: ['Compliance', 'Admin'],
        summary: 'Check data retention compliance',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  compliant: { type: 'boolean' },
                  issues: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const user = request.user as UserContext | undefined
        if (user?.userId === undefined || user.userId === null || user.userId === '') {
          throw new Error('User ID not found in request')
        }

        const complianceCheck = await ComplianceService.checkDataRetentionCompliance()

        // Log compliance check
        await ComplianceService.logAuditEvent({
          userId: user.userId,
          action: 'data_retention_check',
          resourceType: 'compliance_check',
          resourceId: 'system',
          metadata: {
            compliant: complianceCheck.compliant,
            issueCount: complianceCheck.issues.length,
            recommendationCount: complianceCheck.recommendations.length,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          timestamp: new Date(),
        })

        return reply.send({
          success: true,
          data: complianceCheck,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      } catch (error) {
        request.log.error(error, 'Data retention check failed')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'DATA_RETENTION_CHECK_FAILED',
            message: 'Failed to check data retention compliance',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    },
  )
}
