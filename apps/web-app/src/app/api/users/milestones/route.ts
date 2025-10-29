/**
 * Next.js API Routes for Achievement Milestone Monitoring
 * 
 * Implements:
 * - /api/users/milestones routes for achievement monitoring
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for milestone endpoints
 * - Requirements: 3.1, 3.2, 3.4, 11.1 (Task 9.2)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { Milestone } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const MilestoneQuerySchema = z.object({
  type: z.enum(['mastery', 'streak', 'time', 'attempts']).optional(),
  achieved: z.string().optional().transform(val => val === 'true'),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
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
// GET /api/users/milestones - Fetch Achievement Milestones
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = MilestoneQuerySchema.safeParse({
      type: searchParams.get('type'),
      achieved: searchParams.get('achieved'),
      limit: searchParams.get('limit'),
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
    
    const { type, achieved, limit } = queryValidation.data
    
    // Fetch milestones from user-service
    const milestones = await userServiceClient.getMilestones(userId)
    
    // Filter milestones based on query parameters
    let filteredMilestones = milestones
    
    if (type) {
      filteredMilestones = filteredMilestones.filter(m => m.type === type)
    }
    
    if (achieved !== undefined) {
      filteredMilestones = filteredMilestones.filter(m => m.achieved === achieved)
    }
    
    // Limit results
    filteredMilestones = filteredMilestones.slice(0, limit)
    
    // Enhance milestones with computed fields
    const enhancedMilestones = filteredMilestones.map(milestone => ({
      ...milestone,
      progressPercentage: Math.round(milestone.progress * 100),
      timeToCompletion: estimateTimeToCompletion(milestone),
      difficulty: getMilestoneDifficulty(milestone),
      category: getMilestoneCategory(milestone),
    }))
    
    // Calculate summary statistics
    const summary = {
      total: milestones.length,
      achieved: milestones.filter(m => m.achieved).length,
      inProgress: milestones.filter(m => !m.achieved && m.progress > 0).length,
      notStarted: milestones.filter(m => !m.achieved && m.progress === 0).length,
      byType: {
        mastery: milestones.filter(m => m.type === 'mastery').length,
        streak: milestones.filter(m => m.type === 'streak').length,
        time: milestones.filter(m => m.type === 'time').length,
        attempts: milestones.filter(m => m.type === 'attempts').length,
      },
    }
    
    return NextResponse.json({
      success: true,
      data: {
        milestones: enhancedMilestones,
        summary,
      },
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Milestones fetch error:', error)
    
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
          message: 'Failed to fetch milestone data',
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

function estimateTimeToCompletion(milestone: Milestone): string | null {
  if (milestone.achieved) {
    return null
  }
  
  const remaining = milestone.target - milestone.value
  const progressRate = milestone.progress > 0 ? milestone.value / Math.max(1, milestone.progress) : 1
  
  switch (milestone.type) {
    case 'streak':
      return `${remaining} days`
    
    case 'time':
      const hoursRemaining = remaining / (1000 * 60 * 60)
      if (hoursRemaining < 24) {
        return `${Math.ceil(hoursRemaining)} hours`
      } else {
        return `${Math.ceil(hoursRemaining / 24)} days`
      }
    
    case 'attempts':
      const attemptsPerDay = Math.max(1, progressRate)
      const daysRemaining = Math.ceil(remaining / attemptsPerDay)
      return `${daysRemaining} days`
    
    case 'mastery':
      const masteryPerWeek = Math.max(0.1, progressRate * 7)
      const weeksRemaining = Math.ceil(remaining / masteryPerWeek)
      return `${weeksRemaining} weeks`
    
    default:
      return 'Unknown'
  }
}

function getMilestoneDifficulty(milestone: Milestone): 'easy' | 'medium' | 'hard' | 'expert' {
  switch (milestone.type) {
    case 'streak':
      if (milestone.target <= 7) return 'easy'
      if (milestone.target <= 30) return 'medium'
      if (milestone.target <= 100) return 'hard'
      return 'expert'
    
    case 'time':
      const hours = milestone.target / (1000 * 60 * 60)
      if (hours <= 10) return 'easy'
      if (hours <= 50) return 'medium'
      if (hours <= 200) return 'hard'
      return 'expert'
    
    case 'attempts':
      if (milestone.target <= 100) return 'easy'
      if (milestone.target <= 500) return 'medium'
      if (milestone.target <= 2000) return 'hard'
      return 'expert'
    
    case 'mastery':
      if (milestone.target <= 0.5) return 'easy'
      if (milestone.target <= 0.75) return 'medium'
      if (milestone.target <= 0.9) return 'hard'
      return 'expert'
    
    default:
      return 'medium'
  }
}

function getMilestoneCategory(milestone: Milestone): string {
  const title = milestone.title.toLowerCase()
  
  if (title.includes('streak') || title.includes('consecutive')) {
    return 'Consistency'
  } else if (title.includes('mastery') || title.includes('skill')) {
    return 'Skill Development'
  } else if (title.includes('time') || title.includes('hour')) {
    return 'Time Investment'
  } else if (title.includes('attempt') || title.includes('practice')) {
    return 'Practice Volume'
  } else if (title.includes('topic') || title.includes('subject')) {
    return 'Knowledge Breadth'
  } else {
    return 'General Achievement'
  }
}