/**
 * Next.js API Routes for GDPR Data Export
 * 
 * Implements:
 * - /api/users/gdpr/export routes for data export functionality
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for GDPR export endpoints
 * - Requirements: 5.1, 5.2, 5.3, 5.4 (Task 9.4)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { GDPRExportResponse } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const ExportRequestSchema = z.object({
  format: z.enum(['json', 'csv', 'xml']).default('json'),
  includeMetadata: z.boolean().default(true),
  dataCategories: z.array(z.enum([
    'profile', 'preferences', 'progress', 'activities', 'achievements', 'analytics'
  ])).optional(),
  reason: z.string().min(10).max(500).optional(),
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
// POST /api/users/gdpr/export - Request Data Export
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse and validate request body
    const body = await request.json().catch(() => ({}))
    const validationResult = ExportRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid export request data',
            details: validationResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const { format, includeMetadata, dataCategories, reason } = validationResult.data
    
    // Check for existing pending export requests
    // In a real implementation, you'd check the database for pending requests
    
    // Request data export via user-service
    const exportResponse = await userServiceClient.exportUserData(userId)
    
    // Log the export request for audit purposes
    await logGDPRActivity(userId, 'data_export_requested', {
      requestId: exportResponse.requestId,
      format,
      includeMetadata,
      dataCategories,
      reason,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    })
    
    // Enhance response with additional information
    const enhancedResponse = {
      ...exportResponse,
      format,
      includeMetadata,
      dataCategories: dataCategories || ['profile', 'preferences', 'progress', 'activities'],
      estimatedCompletionTime: calculateEstimatedCompletionTime(dataCategories),
      instructions: getExportInstructions(),
    }
    
    return NextResponse.json({
      success: true,
      data: enhancedResponse,
      message: 'Data export request submitted successfully',
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('GDPR export request error:', error)
    
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
          message: 'Failed to request data export',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET /api/users/gdpr/export - Get Export Status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    
    if (!requestId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Request ID is required',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    // Get export status from user-service
    const exportStatus = await userServiceClient.getGdprExportStatus(requestId)
    
    // Enhance status with additional information
    const enhancedStatus = {
      ...exportStatus,
      progressPercentage: calculateProgressPercentage(exportStatus.status),
      nextSteps: getNextSteps(exportStatus.status),
      supportContact: getSupportContact(),
    }
    
    return NextResponse.json({
      success: true,
      data: enhancedStatus,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('GDPR export status error:', error)
    
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
          message: 'Failed to get export status',
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

async function logGDPRActivity(
  userId: string, 
  action: string, 
  details: Record<string, unknown>
): Promise<void> {
  try {
    await userServiceClient.recordActivity({
      id: `gdpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      activityType: 'profile_update', // Closest available type
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

function calculateEstimatedCompletionTime(dataCategories?: string[]): string {
  const categoryCount = dataCategories?.length || 4
  
  if (categoryCount <= 2) {
    return '15-30 minutes'
  } else if (categoryCount <= 4) {
    return '30-60 minutes'
  } else {
    return '1-2 hours'
  }
}

function getExportInstructions(): string[] {
  return [
    'Your data export request has been submitted and is being processed.',
    'You will receive an email notification when your export is ready for download.',
    'The download link will be valid for 7 days after completion.',
    'For security reasons, the download link will expire after the first download.',
    'If you have any questions, please contact our support team.',
  ]
}

function calculateProgressPercentage(status: string): number {
  switch (status) {
    case 'pending': return 0
    case 'processing': return 50
    case 'completed': return 100
    case 'failed': return 0
    default: return 0
  }
}

function getNextSteps(status: string): string[] {
  switch (status) {
    case 'pending':
      return [
        'Your request is in the queue and will be processed shortly.',
        'You will receive an email notification when processing begins.',
      ]
    case 'processing':
      return [
        'Your data is currently being compiled.',
        'This process may take some time depending on the amount of data.',
        'You will receive an email when the export is complete.',
      ]
    case 'completed':
      return [
        'Your data export is ready for download.',
        'Use the download link provided to access your data.',
        'The link will expire in 7 days or after first download.',
      ]
    case 'failed':
      return [
        'There was an error processing your export request.',
        'Please try again or contact support if the problem persists.',
        'You can submit a new export request at any time.',
      ]
    default:
      return ['Please check back later for updates on your request.']
  }
}

function getSupportContact(): { email: string; phone?: string } {
  return {
    email: 'privacy@example.com',
    phone: '+1-800-PRIVACY',
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = request.headers.get('x-client-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  } else if (realIP) {
    return realIP
  } else if (clientIP) {
    return clientIP
  } else {
    return '0.0.0.0'
  }
}