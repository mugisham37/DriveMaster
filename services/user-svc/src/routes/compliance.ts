import type { FastifyInstance } from 'fastify'
import { AuthMiddleware } from '../middleware/auth.middleware'
import { SecurityMiddleware } from '../middleware/security.middleware'
import { RateLimitHandler } from '../middleware/rate-limit-handler.middleware'
import { ComplianceService } from '../services/compliance.service'
import { ValidationSchemas } from '../schemas/validation.schemas'

export async function complianceRoutes(server: FastifyInstance) {
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
        const metadata = {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || 'unknown',
        }

        // Update each consent type if provided
        if (marketingConsent !== undefined) {
          await ComplianceService.updateConsent(
            request.user!.userId,
            'marketing',
            marketingConsent,
            metadata,
          )
          consentsUpdated.push('marketing')
        }

        if (analyticsConsent !== undefined) {
          await ComplianceService.updateConsent(
            request.user!.userId,
            'analytics',
            analyticsConsent,
            metadata,
          )
          consentsUpdated.push('analytics')
        }

        if (functionalConsent !== undefined) {
          await ComplianceService.updateConsent(
            request.user!.userId,
            'functional',
            functionalConsent,
            metadata,
          )
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
        const consents = await ComplianceService.getUserConsents(request.user!.userId)

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
        const {
          format,
          includePersonalData = true,
          includeActivityData = true,
          includeAnalytics = false,
        } = request.body as {
          format: 'json' | 'csv' | 'xml'
          includePersonalData?: boolean
          includeActivityData?: boolean
          includeAnalytics?: boolean
        }

        const exportRequest = {
          userId: request.user!.userId,
          format,
          includePersonalData,
          includeActivityData,
          includeAnalytics,
          requestedAt: new Date(),
        }

        const downloadUrl = await ComplianceService.exportUserData(exportRequest)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        return reply.send({
          success: true,
          data: {
            exportId: crypto.randomUUID(),
            downloadUrl,
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
        const {
          reason,
          confirmDeletion,
          keepAnonymizedData = false,
        } = request.body as {
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

        const gracePeriodDays = 30 // 30-day grace period
        const scheduledFor = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000)
        const confirmationToken = crypto.randomUUID()

        const deletionRequest = {
          userId: request.user!.userId,
          reason,
          requestedAt: new Date(),
          scheduledFor,
          keepAnonymizedData,
          confirmationToken,
        }

        const deletionId = await ComplianceService.requestDataDeletion(deletionRequest)

        return reply.send({
          success: true,
          data: {
            deletionId,
            scheduledFor: scheduledFor.toISOString(),
            confirmationToken,
            gracePeriodDays,
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
          limit = 100,
        } = request.query as {
          startDate?: string
          endDate?: string
          action?: string
          limit?: number
        }

        const auditLogs = await ComplianceService.getUserAuditLogs(
          request.user!.userId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
          limit,
        )

        // Filter by action if specified
        const filteredLogs = action ? auditLogs.filter((log) => log.action === action) : auditLogs

        return reply.send({
          success: true,
          data: {
            auditLogs: filteredLogs.map((log) => ({
              action: log.action,
              resourceType: log.resourceType,
              timestamp: log.timestamp.toISOString(),
              ipAddress: log.ipAddress,
              metadata: log.metadata,
            })),
            totalCount: filteredLogs.length,
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
        const report = await ComplianceService.generateComplianceReport()

        // Log compliance report generation
        await ComplianceService.logAuditEvent({
          userId: request.user!.userId,
          action: 'compliance_report_generated',
          resourceType: 'compliance_report',
          resourceId: 'system',
          metadata: {
            reportData: report,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || 'unknown',
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
        const complianceCheck = await ComplianceService.checkDataRetentionCompliance()

        // Log compliance check
        await ComplianceService.logAuditEvent({
          userId: request.user!.userId,
          action: 'data_retention_check',
          resourceType: 'compliance_check',
          resourceId: 'system',
          metadata: {
            compliant: complianceCheck.compliant,
            issueCount: complianceCheck.issues.length,
            recommendationCount: complianceCheck.recommendations.length,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || 'unknown',
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
