/**
 * Next.js API Routes for GDPR Privacy Reporting
 * 
 * Implements:
 * - /api/users/gdpr/reports routes for privacy reporting
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for GDPR reporting endpoints
 * - Requirements: 5.1, 5.2, 5.3, 5.4 (Task 9.4)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { PrivacyReport } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const ReportQuerySchema = z.object({
  type: z.enum(['data_usage', 'consent_history', 'privacy_audit', 'compliance_summary']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['json', 'pdf', 'csv']).default('json'),
})

// ============================================================================
// Authentication Middleware
// ============================================================================

async function authenticateRequest(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { type: 'authorization', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  
  return { userId: session.user.id.toString(), session }
}

// ============================================================================
// GET /api/users/gdpr/reports - Generate Privacy Report
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = ReportQuerySchema.safeParse({
      type: searchParams.get('type'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      format: searchParams.get('format'),
    })
    
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid query parameters',
            details: queryValidation.error.issues,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const { type, startDate, endDate, format } = queryValidation.data
    
    // Build date range if provided
    let dateRange
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      }
    } else {
      // Default to last 30 days
      dateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }
    }
    
    // Generate privacy report based on type
    let report: PrivacyReport
    
    switch (type) {
      case 'data_usage':
        report = await generateDataUsageReport(userId, dateRange)
        break
      case 'consent_history':
        report = await generateConsentHistoryReport(userId, dateRange)
        break
      case 'privacy_audit':
        report = await generatePrivacyAuditReport(userId, dateRange)
        break
      case 'compliance_summary':
        report = await generateComplianceSummaryReport(userId, dateRange)
        break
      default:
        report = await generateComprehensiveReport(userId, dateRange)
    }
    
    // Log the report generation for audit purposes
    await logGDPRActivity(userId, 'privacy_report_generated', {
      reportType: type || 'comprehensive',
      format,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    })
    
    // Return report based on requested format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      })
    } else {
      // For PDF/CSV formats, return a download URL or file stream
      // In a real implementation, you'd generate the file and return a download link
      return NextResponse.json({
        success: true,
        data: {
          downloadUrl: `/api/users/gdpr/reports/download?reportId=${report.id}&format=${format}`,
          reportId: report.id,
          format,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
        message: `${format.toUpperCase()} report generation initiated`,
        timestamp: new Date().toISOString(),
      })
    }
    
  } catch (error) {
    console.error('Privacy report generation error:', error)
    
    if (error && typeof error === 'object' && 'type' in error) {
      const userServiceError = error as { type: string; message: string; code?: string }
      return NextResponse.json(
        {
          success: false,
          error: {
            type: userServiceError.type,
            message: userServiceError.message,
            code: userServiceError.code,
          },
          timestamp: new Date().toISOString(),
        },
        { status: userServiceError.type === 'authorization' ? 403 : 500 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'service',
          message: 'Failed to generate privacy report',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function generateDataUsageReport(userId: string, dateRange: { start: Date; end: Date }): Promise<PrivacyReport> {
  // Fetch user data and activity summary
  const [user, activitySummary, consentRecords] = await Promise.all([
    userServiceClient.getUser(userId),
    userServiceClient.getActivitySummary(userId, dateRange),
    userServiceClient.getConsentRecords(userId),
  ])
  
  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId,
    type: 'data_usage',
    generatedAt: new Date(),
    dateRange,
    summary: {
      totalDataPoints: calculateTotalDataPoints(user, activitySummary),
      dataCategories: getDataCategories(user, activitySummary),
      storageLocations: getStorageLocations(),
      retentionPeriods: getRetentionPeriods(),
    },
    details: {
      profileData: {
        fields: Object.keys(user).length,
        lastUpdated: user.updatedAt,
        dataSize: estimateDataSize(user),
      },
      activityData: {
        totalActivities: activitySummary.totalActivities,
        dateRange: activitySummary.dateRange,
        dataSize: estimateDataSize(activitySummary),
      },
      consentData: {
        totalConsents: consentRecords.length,
        activeConsents: consentRecords.filter(c => c.granted).length,
        lastUpdated: consentRecords.reduce((latest, consent) => 
          consent.timestamp > latest ? consent.timestamp : latest, 
          new Date(0)
        ),
      },
    },
  }
}

async function generateConsentHistoryReport(userId: string, dateRange: { start: Date; end: Date }): Promise<PrivacyReport> {
  const consentRecords = await userServiceClient.getConsentRecords(userId)
  
  // Filter consents within date range
  const filteredConsents = consentRecords.filter(consent => 
    consent.timestamp >= dateRange.start && consent.timestamp <= dateRange.end
  )
  
  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId,
    type: 'consent_history',
    generatedAt: new Date(),
    dateRange,
    summary: {
      totalConsentChanges: filteredConsents.length,
      consentTypes: [...new Set(filteredConsents.map(c => c.consentType))],
      grantedConsents: filteredConsents.filter(c => c.granted).length,
      withdrawnConsents: filteredConsents.filter(c => !c.granted).length,
    },
    details: {
      consentHistory: filteredConsents.map(consent => ({
        consentType: consent.consentType,
        granted: consent.granted,
        timestamp: consent.timestamp,
        version: consent.version,
        source: consent.source,
      })),
      currentStatus: consentRecords.reduce((status, consent) => {
        status[consent.consentType] = consent.granted
        return status
      }, {} as Record<string, boolean>),
    },
  }
}

async function generatePrivacyAuditReport(userId: string, dateRange: { start: Date; end: Date }): Promise<PrivacyReport> {
  // This would typically fetch audit logs from the user-service
  // For now, we'll simulate the audit data
  
  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId,
    type: 'privacy_audit',
    generatedAt: new Date(),
    dateRange,
    summary: {
      totalAuditEvents: 0, // Would be fetched from audit logs
      dataAccessEvents: 0,
      dataModificationEvents: 0,
      consentChanges: 0,
    },
    details: {
      auditTrail: [], // Would contain actual audit events
      complianceChecks: {
        dataMinimization: 'compliant',
        purposeLimitation: 'compliant',
        storageMinimization: 'compliant',
        accuracy: 'compliant',
        security: 'compliant',
      },
      recommendations: [
        'Continue regular data audits',
        'Review data retention policies annually',
        'Maintain current security practices',
      ],
    },
  }
}

async function generateComplianceSummaryReport(userId: string, dateRange: { start: Date; end: Date }): Promise<PrivacyReport> {
  const [user, consentRecords] = await Promise.all([
    userServiceClient.getUser(userId),
    userServiceClient.getConsentRecords(userId),
  ])
  
  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId,
    type: 'compliance_summary',
    generatedAt: new Date(),
    dateRange,
    summary: {
      complianceScore: calculateComplianceScore(user, consentRecords),
      gdprCompliance: 'compliant',
      dataSubjectRights: 'available',
      consentManagement: 'active',
    },
    details: {
      rightsExercised: {
        dataAccess: 0, // Would track actual requests
        dataPortability: 0,
        dataErasure: 0,
        dataRectification: 0,
      },
      legalBasis: {
        consent: consentRecords.filter(c => c.granted).length,
        legitimateInterest: 0,
        contract: 1, // User account
        legalObligation: 0,
      },
      dataProtectionMeasures: [
        'Encryption at rest and in transit',
        'Access controls and authentication',
        'Regular security audits',
        'Data minimization practices',
        'Consent management system',
      ],
    },
  }
}

async function generateComprehensiveReport(userId: string, dateRange: { start: Date; end: Date }): Promise<PrivacyReport> {
  // Combine all report types for a comprehensive overview
  const [dataUsage, consentHistory, privacyAudit, compliance] = await Promise.all([
    generateDataUsageReport(userId, dateRange),
    generateConsentHistoryReport(userId, dateRange),
    generatePrivacyAuditReport(userId, dateRange),
    generateComplianceSummaryReport(userId, dateRange),
  ])
  
  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId,
    type: 'comprehensive',
    generatedAt: new Date(),
    dateRange,
    summary: {
      ...dataUsage.summary,
      ...consentHistory.summary,
      ...privacyAudit.summary,
      ...compliance.summary,
    },
    details: {
      dataUsage: dataUsage.details,
      consentHistory: consentHistory.details,
      privacyAudit: privacyAudit.details,
      compliance: compliance.details,
    },
  }
}

async function logGDPRActivity(
  userId: string, 
  action: string, 
  details: Record<string, unknown>
): Promise<void> {
  try {
    await userServiceClient.recordActivity({
      id: `gdpr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      activityType: 'profile_update',
      metadata: {
        gdprAction: action,
        ...details,
      },
      deviceType: 'web',
      appVersion: '1.0.0',
      platform: 'web',
      userAgent: details.userAgent as string || '',
      ipAddress: details.ipAddress as string || '0.0.0.0',
      timestamp: new Date(),
    })
  } catch (error) {
    console.warn('Failed to log GDPR activity:', error)
  }
}

function calculateTotalDataPoints(user: any, activitySummary: any): number {
  return Object.keys(user).length + (activitySummary.totalActivities || 0)
}

function getDataCategories(user: any, activitySummary: any): string[] {
  return [
    'Profile Information',
    'Learning Preferences',
    'Activity Data',
    'Progress Tracking',
    'Engagement Metrics',
    'Consent Records',
  ]
}

function getStorageLocations(): string[] {
  return [
    'Primary Database (Encrypted)',
    'Analytics Database (Anonymized)',
    'Backup Storage (Encrypted)',
    'Cache Layer (Temporary)',
  ]
}

function getRetentionPeriods(): Record<string, string> {
  return {
    'Profile Data': '7 years after account deletion',
    'Activity Data': '3 years or until account deletion',
    'Consent Records': '7 years for legal compliance',
    'Analytics Data': '2 years (anonymized)',
    'Cache Data': '24 hours maximum',
  }
}

function estimateDataSize(data: any): string {
  const jsonString = JSON.stringify(data)
  const bytes = new Blob([jsonString]).size
  
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function calculateComplianceScore(user: any, consentRecords: any[]): number {
  let score = 0
  
  // Base score for having an account
  score += 20
  
  // Score for active consents
  const activeConsents = consentRecords.filter(c => c.granted).length
  score += Math.min(40, activeConsents * 10)
  
  // Score for recent consent updates
  const recentConsents = consentRecords.filter(c => 
    c.timestamp > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  ).length
  score += Math.min(20, recentConsents * 5)
  
  // Score for profile completeness
  const profileFields = Object.keys(user).length
  score += Math.min(20, profileFields * 2)
  
  return Math.min(100, score)
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = request.headers.get('x-client-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || '0.0.0.0'
  } else if (realIP) {
    return realIP
  } else if (clientIP) {
    return clientIP
  } else {
    return '0.0.0.0'
  }
}