/**
 * Next.js API Routes for Batch Activity Recording
 * 
 * Implements:
 * - /api/users/activities/batch routes for batch activity recording
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for batch activity endpoints
 * - Requirements: 4.1, 4.2, 4.3, 4.4 (Task 9.3)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { ActivityRecord, ActivityType } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const ActivityRecordSchema = z.object({
  activityType: z.enum([
    'lesson_start', 'lesson_complete', 'lesson_abandon',
    'exercise_start', 'exercise_complete', 'exercise_abandon',
    'quiz_start', 'quiz_complete', 'quiz_abandon',
    'video_start', 'video_complete', 'video_pause', 'video_seek',
    'reading_start', 'reading_complete',
    'practice_start', 'practice_complete', 'practice', 'review', 'assessment',
    'login', 'logout', 'session_timeout', 'session_start', 'session_end',
    'profile_update', 'preferences_update',
    'search', 'navigation', 'help_request'
  ]),
  sessionId: z.string().optional(),
  itemId: z.string().optional(),
  topicId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  durationMs: z.number().int().positive().optional(),
  timestamp: z.string().optional().transform(val => val ? new Date(val) : new Date()),
})

const BatchActivitySchema = z.object({
  activities: z.array(ActivityRecordSchema).min(1).max(100), // Allow up to 100 activities in a batch
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
// POST /api/users/activities/batch - Record Multiple Activities
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = BatchActivitySchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid batch activity data',
            details: validationResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const { activities } = validationResult.data
    
    // Process and sanitize activities
    const processedActivities: Omit<ActivityRecord, 'id' | 'timestamp'>[] = activities.map((activityData, index) => {
      // Sanitize metadata
      const sanitizedMetadata = sanitizeMetadata(activityData.metadata)
      
      return {
        userId,
        activityType: activityData.activityType,
        sessionId: activityData.sessionId,
        itemId: activityData.itemId,
        topicId: activityData.topicId,
        metadata: {
          ...sanitizedMetadata,
          batchIndex: index,
          batchSize: activities.length,
          userAgent: request.headers.get('user-agent') || '',
          ipAddress: getClientIP(request),
          url: request.headers.get('referer') || '',
        },
        deviceType: getDeviceType(request.headers.get('user-agent') || ''),
        appVersion: '1.0.0',
        platform: 'web',
        userAgent: request.headers.get('user-agent') || '',
        ipAddress: getClientIP(request),
        durationMs: activityData.durationMs,
      }
    })
    
    // Record activities via user-service
    const activityIds = await userServiceClient.recordBatchActivities(userId, processedActivities)
    
    // Calculate batch statistics
    const stats = calculateBatchStats(activities)
    
    return NextResponse.json({
      success: true,
      data: {
        ids: activityIds.map(record => record.id),
        count: activityIds.length,
        stats,
      },
      message: `Successfully recorded ${activityIds.length} activities`,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Batch activity recording error:', error)
    
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
        { status: userServiceError.type === 'validation' ? 400 : 500 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'service',
          message: 'Failed to record batch activities',
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

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(metadata)) {
    // Skip potentially dangerous keys
    if (key.startsWith('__') || key.includes('script') || key.includes('eval')) {
      continue
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value
    } else if (value && typeof value === 'object') {
      // Recursively sanitize nested objects (limited depth)
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>)
    }
  }
  
  return sanitized
}

function getDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  if (/Mobile|Android|iPhone/.test(userAgent)) {
    return 'mobile'
  } else if (/iPad|Tablet/.test(userAgent)) {
    return 'tablet'
  } else {
    return 'desktop'
  }
}

function getClientIP(request: NextRequest): string {
  // Try to get real IP from various headers
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

function calculateBatchStats(activities: Array<{ activityType: ActivityType; durationMs?: number }>) {
  const typeCount: Record<string, number> = {}
  let totalDuration = 0
  let activitiesWithDuration = 0
  
  activities.forEach(activity => {
    // Count by type
    typeCount[activity.activityType] = (typeCount[activity.activityType] || 0) + 1
    
    // Sum duration
    if (activity.durationMs) {
      totalDuration += activity.durationMs
      activitiesWithDuration++
    }
  })
  
  return {
    totalActivities: activities.length,
    typeBreakdown: typeCount,
    totalDurationMs: totalDuration,
    averageDurationMs: activitiesWithDuration > 0 ? Math.round(totalDuration / activitiesWithDuration) : 0,
    activitiesWithDuration,
    mostCommonType: Object.entries(typeCount).reduce((a, b) => typeCount[a[0]] > typeCount[b[0]] ? a : b)[0],
  }
}