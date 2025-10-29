/**
 * Next.js API Routes for Topic-Specific Skill Mastery Management
 * 
 * Implements:
 * - /api/users/mastery/[topic] routes for topic-specific mastery management
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for topic mastery endpoints
 * - Requirements: 3.1, 3.2, 3.4, 11.1 (Task 9.2)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { SkillMastery, AttemptRecord } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const AttemptRecordSchema = z.object({
  itemId: z.string().min(1),
  sessionId: z.string().min(1),
  selected: z.record(z.unknown()),
  correct: z.boolean(),
  quality: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  timeTakenMs: z.number().int().positive(),
  hintsUsed: z.number().int().min(0),
  clientAttemptId: z.string().min(1),
  deviceType: z.string().min(1),
  appVersion: z.string().min(1),
})

const MasteryUpdateSchema = z.object({
  attempts: z.array(AttemptRecordSchema).min(1),
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
// GET /api/users/mastery/[topic] - Fetch Topic-Specific Mastery
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { topic: string } }
) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    const topic = decodeURIComponent(params.topic)
    
    // Validate topic parameter
    if (!topic || topic.length < 1 || topic.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid topic parameter',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    // Fetch topic-specific mastery from user-service
    const masteryLevels = await userServiceClient.getSkillMastery(userId, topic)
    const topicMastery = masteryLevels.find(m => m.topic === topic)
    
    if (!topicMastery) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'not_found',
            message: `No mastery data found for topic: ${topic}`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }
    
    // Enhance with computed fields
    const enhancedMastery = {
      ...topicMastery,
      masteryLevel: getMasteryLevel(topicMastery.mastery),
      practiceRecommendation: generatePracticeRecommendation(topicMastery),
      nextMilestone: getNextMilestone(topicMastery.mastery),
      estimatedTimeToMastery: estimateTimeToMastery(topicMastery),
    }
    
    return NextResponse.json({
      success: true,
      data: enhancedMastery,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Topic mastery fetch error:', error)
    
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
          message: 'Failed to fetch topic mastery data',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/users/mastery/[topic] - Update Topic Mastery
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { topic: string } }
) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    const topic = decodeURIComponent(params.topic)
    
    // Validate topic parameter
    if (!topic || topic.length < 1 || topic.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid topic parameter',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = MasteryUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid attempt data',
            details: validationResult.error.errors,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const { attempts } = validationResult.data
    
    // Sanitize and enrich attempt records
    const sanitizedAttempts: AttemptRecord[] = attempts.map(attempt => ({
      ...attempt,
      id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: new Date(),
      createdAt: new Date(),
    }))
    
    // Update skill mastery via user-service
    const updatedMastery = await userServiceClient.updateSkillMastery(
      userId,
      topic,
      sanitizedAttempts
    )
    
    // Enhance response with computed fields
    const enhancedMastery = {
      ...updatedMastery,
      masteryLevel: getMasteryLevel(updatedMastery.mastery),
      practiceRecommendation: generatePracticeRecommendation(updatedMastery),
      nextMilestone: getNextMilestone(updatedMastery.mastery),
      estimatedTimeToMastery: estimateTimeToMastery(updatedMastery),
    }
    
    return NextResponse.json({
      success: true,
      data: enhancedMastery,
      message: `Mastery updated for topic: ${topic}`,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Topic mastery update error:', error)
    
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
          message: 'Failed to update topic mastery',
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

function getMasteryLevel(mastery: number): 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (mastery >= 0.9) return 'expert'
  if (mastery >= 0.75) return 'advanced'
  if (mastery >= 0.5) return 'intermediate'
  if (mastery >= 0.25) return 'beginner'
  return 'novice'
}

function generatePracticeRecommendation(mastery: SkillMastery): string {
  const daysSinceLastPractice = Math.floor(
    (Date.now() - mastery.lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (mastery.mastery >= 0.8) {
    if (daysSinceLastPractice > 7) {
      return 'Great mastery! Consider a quick review to maintain your skills.'
    }
    return 'Excellent mastery! You can move on to more advanced topics.'
  } else if (mastery.mastery >= 0.6) {
    return 'Good progress! Practice a few more exercises to reach mastery.'
  } else if (mastery.mastery >= 0.4) {
    return 'Making progress! Focus on understanding the core concepts.'
  } else {
    return 'Keep practicing! Review the fundamentals and try more exercises.'
  }
}

function getNextMilestone(mastery: number): { level: number; description: string } {
  if (mastery < 0.25) {
    return { level: 0.25, description: 'Reach beginner level' }
  } else if (mastery < 0.5) {
    return { level: 0.5, description: 'Reach intermediate level' }
  } else if (mastery < 0.75) {
    return { level: 0.75, description: 'Reach advanced level' }
  } else if (mastery < 0.9) {
    return { level: 0.9, description: 'Reach expert level' }
  } else {
    return { level: 1.0, description: 'Achieve perfect mastery' }
  }
}

function estimateTimeToMastery(mastery: SkillMastery): string {
  const currentMastery = mastery.mastery
  const practiceRate = mastery.practiceCount / Math.max(1, 
    Math.floor((Date.now() - mastery.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  )
  
  if (currentMastery >= 0.8) {
    return 'Already mastered'
  }
  
  const remainingMastery = 0.8 - currentMastery
  const estimatedDays = Math.ceil(remainingMastery / Math.max(0.01, practiceRate * 0.1))
  
  if (estimatedDays <= 7) {
    return `${estimatedDays} days`
  } else if (estimatedDays <= 30) {
    return `${Math.ceil(estimatedDays / 7)} weeks`
  } else {
    return `${Math.ceil(estimatedDays / 30)} months`
  }
}