/**
 * Next.js API Routes for Engagement Metrics
 * 
 * Implements:
 * - /api/users/engagement routes for engagement metrics
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for engagement endpoints
 * - Requirements: 4.1, 4.2, 4.3, 4.4 (Task 9.3)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { EngagementMetrics, DateRange } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const EngagementQuerySchema = z.object({
  days: z.string().optional().transform(val => val ? parseInt(val, 10) : 30),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
// GET /api/users/engagement - Fetch Engagement Metrics
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = EngagementQuerySchema.safeParse({
      days: searchParams.get('days'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
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
    
    const { days, startDate, endDate, includeDetails } = queryValidation.data
    
    // Build date range
    let dateRange: DateRange
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      }
    } else {
      dateRange = {
        start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        end: new Date(),
      }
    }
    
    // Fetch engagement metrics from user-service
    const engagementMetrics = await userServiceClient.getEngagementMetrics(userId, dateRange)
    
    // Enhance with computed fields
    const enhancedMetrics = {
      ...engagementMetrics,
      engagementLevel: getEngagementLevel(engagementMetrics.engagementScore),
      churnRiskLevel: getChurnRiskLevel(engagementMetrics.churnRisk),
      recommendations: generateEngagementRecommendations(engagementMetrics),
      trends: calculateEngagementTrends(engagementMetrics),
    }
    
    // Optionally include detailed breakdown
    if (includeDetails) {
      const activitySummary = await userServiceClient.getActivitySummary(userId, dateRange)
      enhancedMetrics.activityBreakdown = activitySummary.activityBreakdown
      enhancedMetrics.deviceBreakdown = activitySummary.deviceBreakdown
      enhancedMetrics.hourlyDistribution = activitySummary.hourlyDistribution
    }
    
    return NextResponse.json({
      success: true,
      data: enhancedMetrics,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Engagement metrics fetch error:', error)
    
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
          message: 'Failed to fetch engagement metrics',
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

function getEngagementLevel(score: number): 'low' | 'medium' | 'high' | 'excellent' {
  if (score >= 0.8) return 'excellent'
  if (score >= 0.6) return 'high'
  if (score >= 0.4) return 'medium'
  return 'low'
}

function getChurnRiskLevel(churnRisk: 'low' | 'medium' | 'high'): {
  level: 'low' | 'medium' | 'high'
  description: string
  actionRequired: boolean
} {
  switch (churnRisk) {
    case 'low':
      return {
        level: 'low',
        description: 'User is highly engaged and unlikely to churn',
        actionRequired: false,
      }
    case 'medium':
      return {
        level: 'medium',
        description: 'User engagement is declining, consider intervention',
        actionRequired: true,
      }
    case 'high':
      return {
        level: 'high',
        description: 'User is at high risk of churning, immediate action needed',
        actionRequired: true,
      }
  }
}

function generateEngagementRecommendations(metrics: EngagementMetrics): string[] {
  const recommendations: string[] = []
  
  // Session length recommendations
  if (metrics.averageSessionLength < 300000) { // Less than 5 minutes
    recommendations.push('Try to extend your learning sessions for better retention')
  }
  
  // Session frequency recommendations
  if (metrics.sessionsPerDay < 1) {
    recommendations.push('Consider establishing a daily learning routine')
  } else if (metrics.sessionsPerDay > 5) {
    recommendations.push('Great consistency! Consider focusing on quality over quantity')
  }
  
  // Streak recommendations
  if (metrics.dailyActiveStreak < 3) {
    recommendations.push('Build a learning streak by practicing daily')
  } else if (metrics.dailyActiveStreak >= 7) {
    recommendations.push('Excellent streak! Keep up the consistent learning')
  }
  
  // Return rate recommendations
  if (metrics.returnRate < 0.5) {
    recommendations.push('Try setting learning reminders to improve consistency')
  }
  
  // Engagement score recommendations
  if (metrics.engagementScore < 0.4) {
    recommendations.push('Explore different learning activities to find what works best for you')
  } else if (metrics.engagementScore >= 0.8) {
    recommendations.push('Outstanding engagement! Consider challenging yourself with advanced topics')
  }
  
  // Churn risk recommendations
  if (metrics.churnRisk === 'high') {
    recommendations.push('Take a break if needed, but try to maintain some learning momentum')
  } else if (metrics.churnRisk === 'medium') {
    recommendations.push('Mix up your learning routine to maintain interest')
  }
  
  return recommendations
}

function calculateEngagementTrends(metrics: EngagementMetrics): {
  sessionTrend: 'increasing' | 'stable' | 'decreasing'
  streakTrend: 'building' | 'maintaining' | 'declining'
  overallTrend: 'improving' | 'stable' | 'declining'
} {
  // This is a simplified trend calculation
  // In a real implementation, you'd compare with historical data
  
  const sessionTrend = metrics.averageSessionDuration > 600000 ? 'increasing' : 
                      metrics.averageSessionDuration > 300000 ? 'stable' : 'decreasing'
  
  const streakTrend = metrics.dailyActiveStreak >= 7 ? 'building' :
                     metrics.dailyActiveStreak >= 3 ? 'maintaining' : 'declining'
  
  const overallTrend = metrics.engagementScore >= 0.7 ? 'improving' :
                      metrics.engagementScore >= 0.5 ? 'stable' : 'declining'
  
  return {
    sessionTrend,
    streakTrend,
    overallTrend,
  }
}