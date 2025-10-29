/**
 * Next.js API Routes for Skill Mastery Management
 * 
 * Implements:
 * - /api/users/mastery routes for skill mastery management
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for mastery endpoints
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

const MasteryQuerySchema = z.object({
  topic: z.string().optional(),
  includeHistory: z.string().optional().transform(val => val === 'true'),
})

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
// GET /api/users/mastery - Fetch Skill Mastery Levels
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = MasteryQuerySchema.safeParse({
      topic: searchParams.get('topic'),
      includeHistory: searchParams.get('includeHistory'),
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
    
    const { topic, includeHistory } = queryValidation.data
    
    // Fetch skill mastery from user-service
    const masteryLevels = await userServiceClient.getSkillMastery(userId, topic)
    
    // Filter and enhance data based on query parameters
    let responseData = masteryLevels
    
    if (topic) {
      responseData = masteryLevels.filter(mastery => mastery.topic === topic)
    }
    
    // Add computed fields if requested
    if (includeHistory) {
      responseData = responseData.map(mastery => ({
        ...mastery,
        masteryTrend: calculateMasteryTrend(mastery),
        practiceRecommendation: generatePracticeRecommendation(mastery),
      }))
    }
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Mastery fetch error:', error)
    
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
          message: 'Failed to fetch mastery data',
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

function calculateMasteryTrend(mastery: SkillMastery): 'improving' | 'stable' | 'declining' {
  // Simple trend calculation based on recent practice
  const daysSinceLastPractice = Math.floor(
    (Date.now() - mastery.lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (daysSinceLastPractice <= 3 && mastery.correctStreak >= 3) {
    return 'improving'
  } else if (daysSinceLastPractice > 7 || mastery.mastery < 0.5) {
    return 'declining'
  } else {
    return 'stable'
  }
}

function generatePracticeRecommendation(mastery: SkillMastery): string {
  if (mastery.mastery >= 0.8) {
    return 'Excellent mastery! Consider reviewing periodically to maintain proficiency.'
  } else if (mastery.mastery >= 0.6) {
    return 'Good progress! Practice a few more exercises to solidify your understanding.'
  } else if (mastery.mastery >= 0.4) {
    return 'Making progress! Focus on understanding the fundamentals before moving forward.'
  } else {
    return 'Needs attention. Consider reviewing the basics and practicing regularly.'
  }
}