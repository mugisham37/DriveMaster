/**
 * Next.js API Routes for Personalized Insights
 * 
 * Implements:
 * - /api/users/insights routes for personalized insights
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for insights endpoints
 * - Requirements: 4.1, 4.2, 4.3, 4.4 (Task 9.3)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { ActivityInsight } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const InsightsQuerySchema = z.object({
  category: z.enum(['engagement', 'performance', 'behavior', 'progress', 'optimization']).optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  includeExpired: z.string().optional().transform(val => val === 'true'),
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
// GET /api/users/insights - Fetch Personalized Insights
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = InsightsQuerySchema.safeParse({
      category: searchParams.get('category'),
      severity: searchParams.get('severity'),
      limit: searchParams.get('limit'),
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
    
    const { category, severity, limit, includeExpired } = queryValidation.data
    
    // Fetch insights from user-service
    const insights = await userServiceClient.getActivityInsights(userId)
    
    // Filter insights based on query parameters
    let filteredInsights = insights
    
    if (category) {
      filteredInsights = filteredInsights.filter(insight => insight.category === category)
    }
    
    if (severity) {
      filteredInsights = filteredInsights.filter(insight => insight.severity === severity)
    }
    
    if (!includeExpired) {
      const now = new Date()
      filteredInsights = filteredInsights.filter(insight => 
        !insight.expiresAt || insight.expiresAt > now
      )
    }
    
    // Sort by priority and creation date
    filteredInsights.sort((a, b) => {
      // First by priority (higher priority first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      // Then by creation date (newer first)
      return b.generatedAt.getTime() - a.generatedAt.getTime()
    })
    
    // Limit results
    filteredInsights = filteredInsights.slice(0, limit)
    
    // Enhance insights with computed fields
    const enhancedInsights = filteredInsights.map(insight => ({
      ...insight,
      isExpired: insight.expiresAt ? insight.expiresAt < new Date() : false,
      daysUntilExpiry: insight.expiresAt ? 
        Math.ceil((insight.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      priorityLevel: getPriorityLevel(insight.priority),
      categoryIcon: getCategoryIcon(insight.category),
      severityColor: getSeverityColor(insight.severity),
    }))
    
    // Calculate summary statistics
    const summary = {
      total: insights.length,
      byCategory: {
        engagement: insights.filter(i => i.category === 'engagement').length,
        performance: insights.filter(i => i.category === 'performance').length,
        behavior: insights.filter(i => i.category === 'behavior').length,
        progress: insights.filter(i => i.category === 'progress').length,
        optimization: insights.filter(i => i.category === 'optimization').length,
      },
      bySeverity: {
        info: insights.filter(i => i.severity === 'info').length,
        warning: insights.filter(i => i.severity === 'warning').length,
        critical: insights.filter(i => i.severity === 'critical').length,
      },
      actionable: insights.filter(i => i.actionable).length,
      expired: insights.filter(i => i.expiresAt && i.expiresAt < new Date()).length,
    }
    
    return NextResponse.json({
      success: true,
      data: {
        insights: enhancedInsights,
        summary,
      },
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Insights fetch error:', error)
    
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
          message: 'Failed to fetch insights',
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

function getCategoryIcon(category: string): string {
  switch (category) {
    case 'engagement': return '📊'
    case 'performance': return '🎯'
    case 'behavior': return '🧠'
    case 'progress': return '📈'
    case 'optimization': return '⚡'
    default: return '💡'
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'info': return 'blue'
    case 'warning': return 'yellow'
    case 'critical': return 'red'
    default: return 'gray'
  }
}