/**
 * Next.js API Routes for Activity Recommendations
 * 
 * Implements:
 * - /api/users/recommendations routes for activity recommendations
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for recommendations endpoints
 * - Requirements: 4.1, 4.2, 4.3, 4.4 (Task 9.3)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { ActivityRecommendation } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const RecommendationsQuerySchema = z.object({
  category: z.enum(['study_schedule', 'content', 'strategy', 'timing', 'improvement', 'engagement']).optional(),
  priority: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  includeApplied: z.string().optional().transform(val => val === 'true'),
  includeExpired: z.string().optional().transform(val => val === 'true'),
})

const ApplyRecommendationSchema = z.object({
  recommendationId: z.string().min(1),
  actionType: z.enum(['navigate', 'schedule', 'practice', 'review']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
// GET /api/users/recommendations - Fetch Activity Recommendations
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = RecommendationsQuerySchema.safeParse({
      category: searchParams.get('category'),
      priority: searchParams.get('priority'),
      limit: searchParams.get('limit'),
      includeApplied: searchParams.get('includeApplied'),
      includeExpired: searchParams.get('includeExpired'),
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
    
    const { category, priority, limit, includeApplied, includeExpired } = queryValidation.data
    
    // Fetch recommendations from user-service
    const recommendations = await userServiceClient.getActivityRecommendations(userId)
    
    // Filter recommendations based on query parameters
    let filteredRecommendations = recommendations
    
    if (category) {
      filteredRecommendations = filteredRecommendations.filter(rec => rec.category === category)
    }
    
    if (priority !== undefined) {
      filteredRecommendations = filteredRecommendations.filter(rec => rec.priority >= priority)
    }
    
    if (!includeApplied) {
      filteredRecommendations = filteredRecommendations.filter(rec => !rec.applied)
    }
    
    if (!includeExpired) {
      const now = new Date()
      filteredRecommendations = filteredRecommendations.filter(rec => 
        !rec.expiresAt || rec.expiresAt > now
      )
    }
    
    // Sort by priority and estimated impact
    filteredRecommendations.sort((a, b) => {
      // First by priority (higher priority first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      // Then by estimated impact (higher impact first)
      return b.estimatedImpact - a.estimatedImpact
    })
    
    // Limit results
    filteredRecommendations = filteredRecommendations.slice(0, limit)
    
    // Enhance recommendations with computed fields
    const enhancedRecommendations = filteredRecommendations.map(recommendation => ({
      ...recommendation,
      isExpired: recommendation.expiresAt ? recommendation.expiresAt < new Date() : false,
      daysUntilExpiry: recommendation.expiresAt ? 
        Math.ceil((recommendation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      priorityLevel: getPriorityLevel(recommendation.priority),
      impactLevel: getImpactLevel(recommendation.estimatedImpact),
      categoryIcon: getCategoryIcon(recommendation.category),
      timeToApply: estimateTimeToApply(recommendation),
    }))
    
    // Calculate summary statistics
    const summary = {
      total: recommendations.length,
      byCategory: {
        study_schedule: recommendations.filter(r => r.category === 'study_schedule').length,
        content: recommendations.filter(r => r.category === 'content').length,
        strategy: recommendations.filter(r => r.category === 'strategy').length,
        timing: recommendations.filter(r => r.category === 'timing').length,
        improvement: recommendations.filter(r => r.category === 'improvement').length,
        engagement: recommendations.filter(r => r.category === 'engagement').length,
      },
      byPriority: {
        high: recommendations.filter(r => r.priority >= 8).length,
        medium: recommendations.filter(r => r.priority >= 5 && r.priority < 8).length,
        low: recommendations.filter(r => r.priority < 5).length,
      },
      actionable: recommendations.filter(r => r.actionable).length,
      applied: recommendations.filter(r => r.applied).length,
      expired: recommendations.filter(r => r.expiresAt && r.expiresAt < new Date()).length,
    }
    
    return NextResponse.json({
      success: true,
      data: {
        recommendations: enhancedRecommendations,
        summary,
      },
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Recommendations fetch error:', error)
    
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
          message: 'Failed to fetch recommendations',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/users/recommendations/apply - Apply a Recommendation
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = ApplyRecommendationSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid recommendation application data',
            details: validationResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const { recommendationId, actionType, metadata } = validationResult.data
    
    // For this implementation, we'll simulate applying the recommendation
    // In a real implementation, this would update the recommendation status in the user-service
    
    // Record the application as an activity
    await userServiceClient.recordActivity({
      id: `rec_apply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      activityType: 'navigation', // or appropriate type based on actionType
      metadata: {
        recommendationId,
        actionType,
        appliedAt: new Date().toISOString(),
        ...metadata,
      },
      deviceType: 'web',
      appVersion: '1.0.0',
      platform: 'web',
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: getClientIP(request),
      timestamp: new Date(),
    })
    
    return NextResponse.json({
      success: true,
      data: {
        recommendationId,
        appliedAt: new Date().toISOString(),
        actionType,
      },
      message: 'Recommendation applied successfully',
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Recommendation application error:', error)
    
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
          message: 'Failed to apply recommendation',
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

function getPriorityLevel(priority: number): 'low' | 'medium' | 'high' | 'urgent' {
  if (priority >= 8) return 'urgent'
  if (priority >= 6) return 'high'
  if (priority >= 4) return 'medium'
  return 'low'
}

function getImpactLevel(impact: number): 'low' | 'medium' | 'high' {
  if (impact >= 0.7) return 'high'
  if (impact >= 0.4) return 'medium'
  return 'low'
}

function getCategoryIcon(category: string): string {
  switch (category) {
    case 'study_schedule': return '📅'
    case 'content': return '📚'
    case 'strategy': return '🎯'
    case 'timing': return '⏰'
    case 'improvement': return '📈'
    case 'engagement': return '🎮'
    default: return '💡'
  }
}

function estimateTimeToApply(recommendation: ActivityRecommendation): string {
  // Estimate based on category and actions
  const actionCount = recommendation.actions.length
  
  switch (recommendation.category) {
    case 'study_schedule':
      return '2-5 minutes'
    case 'content':
      return '10-30 minutes'
    case 'strategy':
      return '5-15 minutes'
    case 'timing':
      return '1-3 minutes'
    case 'improvement':
      return actionCount > 2 ? '15-45 minutes' : '5-15 minutes'
    case 'engagement':
      return '5-20 minutes'
    default:
      return '5-10 minutes'
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