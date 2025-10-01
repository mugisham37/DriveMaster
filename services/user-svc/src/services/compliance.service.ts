import { db } from '../db/connection'
import { users, auditLogs, userConsents, dataDeletionRequests } from '../db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import EncryptionService from './encryption.service'

export interface ConsentRecord {
  userId: string
  consentType: 'marketing' | 'analytics' | 'functional' | 'necessary'
  granted: boolean
  timestamp: Date
  ipAddress: string
  userAgent: string
  version: string
}

export interface DataExportRequest {
  userId: string
  format: 'json' | 'csv' | 'xml'
  includePersonalData: boolean
  includeActivityData: boolean
  includeAnalytics: boolean
  requestedAt: Date
  completedAt?: Date
  downloadUrl?: string
}

export interface DataDeletionRequest {
  userId: string
  reason: string
  requestedAt: Date
  scheduledFor: Date
  completedAt?: Date
  keepAnonymizedData: boolean
  confirmationToken: string
}

export interface AuditLogEntry {
  userId: string
  action: string
  resourceType: string
  resourceId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ComplianceReport {
  totalUsers: number
  activeConsents: number
  pendingDeletions: number
  completedExports: number
  auditLogEntries: number
  dataRetentionCompliance: boolean
  lastComplianceCheck: Date
}

export class ComplianceService {
  /**
   * Record user consent for GDPR compliance
   */
  static async recordConsent(consentData: ConsentRecord): Promise<void> {
    try {
      await db.insert(userConsents).values({
        id: crypto.randomUUID(),
        userId: consentData.userId,
        consentType: consentData.consentType,
        granted: consentData.granted,
        timestamp: consentData.timestamp,
        ipAddress: consentData.ipAddress,
        userAgent: consentData.userAgent,
        version: consentData.version,
      })

      // Log the consent action
      await this.logAuditEvent({
        userId: consentData.userId,
        action: 'consent_updated',
        resourceType: 'user_consent',
        resourceId: consentData.userId,
        newValues: {
          consentType: consentData.consentType,
          granted: consentData.granted,
        },
        ipAddress: consentData.ipAddress,
        userAgent: consentData.userAgent,
        timestamp: new Date(),
      })
    } catch (error) {
      throw new Error(
        `Failed to record consent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Get current consent status for a user
   */
  static async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    try {
      const consents = await db
        .select()
        .from(userConsents)
        .where(eq(userConsents.userId, userId))
        .orderBy(desc(userConsents.timestamp))

      return consents.map((consent) => ({
        userId: consent.userId,
        consentType: consent.consentType as ConsentRecord['consentType'],
        granted: consent.granted,
        timestamp: consent.timestamp,
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent,
        version: consent.version,
      }))
    } catch (error) {
      throw new Error(
        `Failed to get user consents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Update user consent preferences
   */
  static async updateConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    metadata: { ipAddress: string; userAgent: string },
  ): Promise<void> {
    await this.recordConsent({
      userId,
      consentType,
      granted,
      timestamp: new Date(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      version: '1.0',
    })
  }

  /**
   * Export user data for GDPR compliance
   */
  static async exportUserData(request: DataExportRequest): Promise<string> {
    try {
      const userData: Record<string, any> = {}

      if (request.includePersonalData) {
        const user = await db.select().from(users).where(eq(users.id, request.userId)).limit(1)

        if (user.length > 0) {
          userData.personalData = {
            id: user[0].id,
            email: user[0].email,
            createdAt: user[0].createdAt,
            updatedAt: user[0].updatedAt,
            cognitivePatterns: user[0].cognitivePatterns,
            learningPreferences: user[0].learningPreferences,
          }
        }
      }

      if (request.includeActivityData) {
        // Get learning events, sessions, progress data
        userData.activityData = await this.getUserActivityData(request.userId)
      }

      if (request.includeAnalytics) {
        // Get anonymized analytics data
        userData.analyticsData = await this.getUserAnalyticsData(request.userId)
      }

      // Get consent history
      userData.consentHistory = await this.getUserConsents(request.userId)

      // Format data according to requested format
      let exportData: string
      switch (request.format) {
        case 'json':
          exportData = JSON.stringify(userData, null, 2)
          break
        case 'csv':
          exportData = this.convertToCSV(userData)
          break
        case 'xml':
          exportData = this.convertToXML(userData)
          break
        default:
          throw new Error('Unsupported export format')
      }

      // Store export file securely and return download URL
      const exportId = crypto.randomUUID()
      const encryptedData = EncryptionService.encryptForStorage(exportData)

      // In production, this would be stored in secure cloud storage
      const downloadUrl = await this.storeExportFile(exportId, encryptedData)

      // Log the export request
      await this.logAuditEvent({
        userId: request.userId,
        action: 'data_exported',
        resourceType: 'user_data',
        resourceId: request.userId,
        metadata: {
          format: request.format,
          includePersonalData: request.includePersonalData,
          includeActivityData: request.includeActivityData,
          includeAnalytics: request.includeAnalytics,
          exportId,
        },
        ipAddress: '0.0.0.0', // Would be passed from request
        userAgent: 'system',
        timestamp: new Date(),
      })

      return downloadUrl
    } catch (error) {
      throw new Error(
        `Failed to export user data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Request user data deletion (GDPR Right to be Forgotten)
   */
  static async requestDataDeletion(request: DataDeletionRequest): Promise<string> {
    try {
      const deletionId = crypto.randomUUID()

      await db.insert(dataDeletionRequests).values({
        id: deletionId,
        userId: request.userId,
        reason: request.reason,
        requestedAt: request.requestedAt,
        scheduledFor: request.scheduledFor,
        keepAnonymizedData: request.keepAnonymizedData,
        confirmationToken: request.confirmationToken,
        status: 'pending',
      })

      // Log the deletion request
      await this.logAuditEvent({
        userId: request.userId,
        action: 'deletion_requested',
        resourceType: 'user_data',
        resourceId: request.userId,
        metadata: {
          reason: request.reason,
          scheduledFor: request.scheduledFor,
          keepAnonymizedData: request.keepAnonymizedData,
          deletionId,
        },
        ipAddress: '0.0.0.0', // Would be passed from request
        userAgent: 'system',
        timestamp: new Date(),
      })

      return deletionId
    } catch (error) {
      throw new Error(
        `Failed to request data deletion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Execute scheduled data deletions
   */
  static async executeScheduledDeletions(): Promise<void> {
    try {
      const pendingDeletions = await db
        .select()
        .from(dataDeletionRequests)
        .where(
          and(
            eq(dataDeletionRequests.status, 'pending'),
            lte(dataDeletionRequests.scheduledFor, new Date()),
          ),
        )

      for (const deletion of pendingDeletions) {
        await this.executeUserDeletion(deletion.userId, deletion.keepAnonymizedData)

        // Update deletion request status
        await db
          .update(dataDeletionRequests)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(dataDeletionRequests.id, deletion.id))
      }
    } catch (error) {
      throw new Error(
        `Failed to execute scheduled deletions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Execute user data deletion
   */
  private static async executeUserDeletion(
    userId: string,
    keepAnonymizedData: boolean,
  ): Promise<void> {
    try {
      if (keepAnonymizedData) {
        // Anonymize user data instead of deleting
        await this.anonymizeUserData(userId)
      } else {
        // Complete deletion
        await this.deleteUserData(userId)
      }

      // Log the deletion completion
      await this.logAuditEvent({
        userId,
        action: 'data_deleted',
        resourceType: 'user_data',
        resourceId: userId,
        metadata: {
          keepAnonymizedData,
          deletionType: keepAnonymizedData ? 'anonymized' : 'complete',
        },
        ipAddress: 'system',
        userAgent: 'system',
        timestamp: new Date(),
      })
    } catch (error) {
      throw new Error(
        `Failed to execute user deletion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Anonymize user data while preserving analytics value
   */
  private static async anonymizeUserData(userId: string): Promise<void> {
    const anonymizedId = `anon_${crypto.randomUUID()}`

    // Update user record with anonymized data
    await db
      .update(users)
      .set({
        email: `${anonymizedId}@anonymized.local`,
        cognitivePatterns: null,
        learningPreferences: null,
      })
      .where(eq(users.id, userId))

    // Anonymize related data in other tables
    // This would include learning events, sessions, etc.
  }

  /**
   * Complete deletion of user data
   */
  private static async deleteUserData(userId: string): Promise<void> {
    // Delete user and all related data
    await db.delete(users).where(eq(users.id, userId))
    // Additional deletions for related tables would go here
  }

  /**
   * Log audit events for compliance tracking
   */
  static async logAuditEvent(event: AuditLogEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: event.userId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        oldValues: event.oldValues ? JSON.stringify(event.oldValues) : null,
        newValues: event.newValues ? JSON.stringify(event.newValues) : null,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: event.timestamp,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      })
    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw here to avoid breaking the main operation
    }
  }

  /**
   * Get audit logs for a user
   */
  static async getUserAuditLogs(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<AuditLogEntry[]> {
    try {
      let query = db.select().from(auditLogs).where(eq(auditLogs.userId, userId))

      if (startDate) {
        query = query.where(gte(auditLogs.timestamp, startDate))
      }

      if (endDate) {
        query = query.where(lte(auditLogs.timestamp, endDate))
      }

      const logs = await query.orderBy(desc(auditLogs.timestamp)).limit(limit)

      return logs.map((log) => ({
        userId: log.userId,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        oldValues: log.oldValues ? JSON.parse(log.oldValues) : undefined,
        newValues: log.newValues ? JSON.parse(log.newValues) : undefined,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
      }))
    } catch (error) {
      throw new Error(
        `Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(): Promise<ComplianceReport> {
    try {
      const [totalUsers] = await db.select({ count: users.id }).from(users)
      const [activeConsents] = await db.select({ count: userConsents.id }).from(userConsents)
      const [pendingDeletions] = await db
        .select({ count: dataDeletionRequests.id })
        .from(dataDeletionRequests)
        .where(eq(dataDeletionRequests.status, 'pending'))

      return {
        totalUsers: totalUsers?.count || 0,
        activeConsents: activeConsents?.count || 0,
        pendingDeletions: pendingDeletions?.count || 0,
        completedExports: 0, // Would be tracked in exports table
        auditLogEntries: 0, // Would be counted from audit logs
        dataRetentionCompliance: true, // Would be calculated based on retention policies
        lastComplianceCheck: new Date(),
      }
    } catch (error) {
      throw new Error(
        `Failed to generate compliance report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Check data retention compliance
   */
  static async checkDataRetentionCompliance(): Promise<{
    compliant: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    try {
      // Check for users with old data that should be deleted
      const retentionPeriod = new Date()
      retentionPeriod.setFullYear(retentionPeriod.getFullYear() - 7) // 7 years retention

      const oldUsers = await db.select().from(users).where(lte(users.updatedAt, retentionPeriod))

      if (oldUsers.length > 0) {
        issues.push(`${oldUsers.length} users have data older than retention period`)
        recommendations.push('Schedule data deletion for inactive users')
      }

      // Check for missing consent records
      const usersWithoutConsent = await db
        .select()
        .from(users)
        .leftJoin(userConsents, eq(users.id, userConsents.userId))
        .where(eq(userConsents.userId, null))

      if (usersWithoutConsent.length > 0) {
        issues.push(`${usersWithoutConsent.length} users missing consent records`)
        recommendations.push('Request consent from users without consent records')
      }

      return {
        compliant: issues.length === 0,
        issues,
        recommendations,
      }
    } catch (error) {
      return {
        compliant: false,
        issues: ['Failed to check compliance'],
        recommendations: ['Review compliance checking system'],
      }
    }
  }

  /**
   * Helper methods for data export
   */
  private static async getUserActivityData(userId: string): Promise<any> {
    // Implementation would fetch learning events, sessions, progress, etc.
    return {
      learningEvents: [],
      sessions: [],
      progress: [],
    }
  }

  private static async getUserAnalyticsData(userId: string): Promise<any> {
    // Implementation would fetch anonymized analytics data
    return {
      performanceMetrics: [],
      learningPatterns: [],
    }
  }

  private static convertToCSV(data: Record<string, any>): string {
    // Simple CSV conversion - would be more sophisticated in production
    const rows: string[] = []

    function flattenObject(obj: any, prefix = ''): Record<string, any> {
      const flattened: Record<string, any> = {}

      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, flattenObject(value, newKey))
        } else {
          flattened[newKey] = value
        }
      }

      return flattened
    }

    const flattened = flattenObject(data)
    const headers = Object.keys(flattened)
    rows.push(headers.join(','))
    rows.push(headers.map((header) => flattened[header] || '').join(','))

    return rows.join('\n')
  }

  private static convertToXML(data: Record<string, any>): string {
    // Simple XML conversion - would be more sophisticated in production
    function objectToXML(obj: any, rootName = 'data'): string {
      let xml = `<${rootName}>`

      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          xml += objectToXML(value, key)
        } else if (Array.isArray(value)) {
          xml += `<${key}>`
          value.forEach((item) => {
            xml += objectToXML(item, 'item')
          })
          xml += `</${key}>`
        } else {
          xml += `<${key}>${value}</${key}>`
        }
      }

      xml += `</${rootName}>`
      return xml
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n${objectToXML(data, 'userData')}`
  }

  private static async storeExportFile(exportId: string, encryptedData: string): Promise<string> {
    // In production, this would store the file in secure cloud storage
    // and return a signed URL for download
    return `https://secure-exports.drivemaster.com/download/${exportId}`
  }
}
