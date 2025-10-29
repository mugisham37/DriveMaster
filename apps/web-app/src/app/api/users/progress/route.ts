/**
 * Next.js API Routes for Progress Tracking Operations
 * 
 * Implements:
 * - /api/users/progress routes for progress data access
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for progress endpoints
 * - Requirements: 3.1, 3.2, 3.4, 11.1 (Task 9.2)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { ProgressSummary, WeeklyProgressPoint } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const ProgressQuerySchema = z.object({
  weeks: z.string().optional().transform(val => val ? parseInt(val, 10) : 12),
  includeDetails: z.string().optional().transform(val => val === 'true'),
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
// GET /api/users/progress - Fetch Progress Summary
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = ProgressQuerySchema.safeParse({
      weeks: searchParams.get('weeks'),
      includeDetails: searchParams.get('includeDetails'),
    })
    
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid query parameters',
            details: queryValidation.error.errors,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const { weeks, includeDetails } = queryValidation.data
    
    // Fetch progress summary from user-service
    const progressSummary = await userServiceClient.getProgressSummary(userId)
    
    // Optionally fetch weekly progress data
    let weeklyProgress: WeeklyProgressPoint[] = []
    if (includeDetails) {
      weeklyProgress = await userServiceClient.getWeeklyProgress(userId, weeks)
    }
    
    const response = {
      summary: progressSummary,
      ...(includeDetails && { weeklyProgress }),
    }
    
    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Progress fetch error:', error)
    
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
          message: 'Failed to fetch progress data',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}