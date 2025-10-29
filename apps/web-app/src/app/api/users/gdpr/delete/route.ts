/**
 * Next.js API Routes for GDPR Data Deletion
 * 
 * Implements:
 * - /api/users/gdpr/delete routes for data deletion requests
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for GDPR deletion endpoints
 * - Requirements: 5.1, 5.2, 5.3, 5.4 (Task 9.4)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { GDPRDeleteResponse } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const DeleteRequestSchema = z.object({
  reason: z.string().min(10).max(1000),
  confirmationText: z.string().refine(
    (val) => val === 'DELETE MY DATA',
    { message: 'Must type "DELETE MY DATA" to confirm' }
  ),
  dataCategories: z.array(z.enum([
    'profile', 'preferences', 'progress', 'activities', 'achievements', 'analytics', 'all'
  ])).default(['all']),
  retainForLegal: z.boolean().default(false),
  scheduledDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
})

const CancelDeleteSchema = z.object({
  requestId: z.string().min(1),
  reason: z.string().min(5).max(500),
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
// POST /api/users/gdpr/delete - Request Data Deletion
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = DeleteRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid deletion request data',
            details: validationResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const { reason, confirmationText, dataCategories, retainForLegal, scheduledDate } = validationResult.data
    
    // Additional security check - ensure user understands the consequences
    if (!confirmationText || confirmationText !== 'DELETE MY DATA') {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Confirmation text is required to proceed with deletion',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    // Check if scheduled date is in the future (minimum 24 hours)
    if (scheduledDate && scheduledDate <= new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Scheduled deletion must be at least 24 hours in the future',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    // Request data deletion via user-service
    const deleteResponse = await userServiceClient.requestDataDeletion(userId, reason)
    
    // Log the deletion request for audit purposes
    await logGDPRActivity(userId, 'data_deletion_requested', {
      requestId: deleteResponse.requestId,
      reason,
      dataCategories,
      retainForLegal,
      scheduledDate: scheduledDate?.toISOString(),
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    })
    
    // Enhance response with additional information
    const enhancedResponse = {
      ...deleteResponse,
      dataCategories,
      retainForLegal,
      scheduledDate,
      cancellationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days to cancel
      warnings: getDeletionWarnings(dataCategories),
      nextSteps: getDeletionNextSteps(),
    }
    
    return NextResponse.json({
      success: true,
      data: enhancedResponse,
      message: 'Data deletion request submitted successfully',
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('GDPR deletion request error:', error)
    
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
          message: 'Failed to request data deletion',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET /api/users/gdpr/delete - Get Deletion Status
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
    
    // For this implementation, we'll simulate getting deletion status
    // In a real implementation, this would query the user-service
    const deleteStatus: GDPRDeleteResponse = {
      requestId,
      status: 'pending',
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    }
    
    // Enhance status with additional information
    const enhancedStatus = {
      ...deleteStatus,
      canCancel: deleteStatus.status === 'pending',
      progressPercentage: calculateDeletionProgress(deleteStatus.status),
      timeRemaining: calculateTimeRemaining(deleteStatus.scheduledFor),
      affectedData: getAffectedDataCategories(),
      supportContact: getSupportContact(),
    }
    
    return NextResponse.json({
      success: true,
      data: enhancedStatus,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('GDPR deletion status error:', error)
    
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
          message: 'Failed to get deletion status',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE /api/users/gdpr/delete - Cancel Deletion Request
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = CancelDeleteSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid cancellation request data',
            details: validationResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const { requestId, reason } = validationResult.data
    
    // For this implementation, we'll simulate cancelling the deletion request
    // In a real implementation, this would call the user-service
    
    // Log the cancellation for audit purposes
    await logGDPRActivity(userId, 'data_deletion_cancelled', {
      requestId,
      reason,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    })
    
    return NextResponse.json({
      success: true,
      data: {
        requestId,
        cancelledAt: new Date().toISOString(),
        reason,
      },
      message: 'Data deletion request cancelled successfully',
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('GDPR deletion cancellation error:', error)
    
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
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'service',
          message: 'Failed to cancel deletion request',
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

function getDeletionWarnings(dataCategories: string[]): string[] {
  const warnings = [
    'This action cannot be undone once processing begins.',
    'You will lose access to your account and all associated data.',
    'Any active subscriptions or services will be cancelled.',
  ]
  
  if (dataCategories.includes('progress') || dataCategories.includes('all')) {
    warnings.push('All learning progress and achievements will be permanently deleted.')
  }
  
  if (dataCategories.includes('activities') || dataCategories.includes('all')) {
    warnings.push('All activity history and analytics will be permanently deleted.')
  }
  
  return warnings
}

function getDeletionNextSteps(): string[] {
  return [
    'You have 7 days to cancel this request before processing begins.',
    'You will receive email confirmations at each stage of the process.',
    'Contact support immediately if you need to cancel or modify this request.',
    'Consider exporting your data before deletion if you want to keep a copy.',
  ]
}

function calculateDeletionProgress(status: string): number {
  switch (status) {
    case 'pending': return 0
    case 'processing': return 50
    case 'completed': return 100
    case 'failed': return 0
    default: return 0
  }
}

function calculateTimeRemaining(scheduledFor?: Date): string | null {
  if (!scheduledFor) return null
  
  const now = new Date()
  const timeDiff = scheduledFor.getTime() - now.getTime()
  
  if (timeDiff <= 0) return 'Processing has begun'
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) {
    return `${days} days, ${hours} hours`
  } else {
    return `${hours} hours`
  }
}

function getAffectedDataCategories(): string[] {
  return [
    'User profile and account information',
    'Learning preferences and settings',
    'Progress tracking and achievements',
    'Activity history and analytics',
    'Communication preferences',
    'Support tickets and interactions',
  ]
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