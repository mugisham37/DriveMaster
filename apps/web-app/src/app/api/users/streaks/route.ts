/**
 * Next.js API Routes for Learning Streak Tracking
 * 
 * Implements:
 * - /api/users/streaks routes for learning streak tracking
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for streak endpoints
 * - Requirements: 3.1, 3.2, 3.4, 11.1 (Task 9.2)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import type { LearningStreak } from '@/types/user-service'

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
// GET /api/users/streaks - Fetch Learning Streak Information
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Fetch learning streak from user-service
    const learningStreak = await userServiceClient.getLearningStreak(userId)
    
    // Enhance with computed fields
    const enhancedStreak = {
      ...learningStreak,
      streakStatus: getStreakStatus(learningStreak),
      motivationalMessage: getMotivationalMessage(learningStreak),
      nextMilestone: getNextStreakMilestone(learningStreak.currentStreak),
      streakHealth: calculateStreakHealth(learningStreak),
    }
    
    return NextResponse.json({
      success: true,
      data: enhancedStreak,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Streak fetch error:', error)
    
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
          message: 'Failed to fetch learning streak data',
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

function getStreakStatus(streak: LearningStreak): 'active' | 'at_risk' | 'broken' {
  const daysSinceLastActive = Math.floor(
    (Date.now() - streak.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (daysSinceLastActive === 0) {
    return 'active'
  } else if (daysSinceLastActive === 1) {
    return 'at_risk'
  } else {
    return 'broken'
  }
}

function getMotivationalMessage(streak: LearningStreak): string {
  const status = getStreakStatus(streak)
  const currentStreak = streak.currentStreak
  
  if (status === 'broken') {
    return "Don't worry! Every expert was once a beginner. Start a new streak today!"
  } else if (status === 'at_risk') {
    return `You're at ${currentStreak} days! Don't break the streak - practice something today!`
  } else {
    if (currentStreak === 1) {
      return "Great start! You've begun your learning journey. Keep it up!"
    } else if (currentStreak < 7) {
      return `${currentStreak} days strong! You're building a great habit!`
    } else if (currentStreak < 30) {
      return `Amazing! ${currentStreak} days of consistent learning. You're on fire! 🔥`
    } else if (currentStreak < 100) {
      return `Incredible dedication! ${currentStreak} days of learning. You're a true learner! 🌟`
    } else {
      return `Legendary! ${currentStreak} days of consistent learning. You're an inspiration! 🏆`
    }
  }
}

function getNextStreakMilestone(currentStreak: number): { days: number; description: string; reward?: string } {
  const milestones = [
    { days: 3, description: 'First milestone', reward: 'Consistency Badge' },
    { days: 7, description: 'One week streak', reward: 'Weekly Warrior Badge' },
    { days: 14, description: 'Two week streak', reward: 'Dedication Badge' },
    { days: 30, description: 'One month streak', reward: 'Monthly Master Badge' },
    { days: 60, description: 'Two month streak', reward: 'Persistence Badge' },
    { days: 100, description: 'Century streak', reward: 'Century Club Badge' },
    { days: 365, description: 'One year streak', reward: 'Annual Achiever Badge' },
  ]
  
  const nextMilestone = milestones.find(m => m.days > currentStreak)
  
  if (nextMilestone) {
    return nextMilestone
  } else {
    // For streaks beyond 365 days
    const nextCentury = Math.ceil((currentStreak + 1) / 100) * 100
    return {
      days: nextCentury,
      description: `${nextCentury} day milestone`,
      reward: 'Elite Learner Badge'
    }
  }
}

function calculateStreakHealth(streak: LearningStreak): {
  score: number
  status: 'excellent' | 'good' | 'fair' | 'poor'
  factors: string[]
} {
  let score = 0
  const factors: string[] = []
  
  // Current streak contribution (0-40 points)
  const streakScore = Math.min(40, streak.currentStreak * 2)
  score += streakScore
  if (streakScore >= 30) factors.push('Strong current streak')
  
  // Longest streak contribution (0-30 points)
  const longestScore = Math.min(30, streak.longestStreak * 1.5)
  score += longestScore
  if (longestScore >= 20) factors.push('Impressive longest streak')
  
  // Recency contribution (0-30 points)
  const daysSinceLastActive = Math.floor(
    (Date.now() - streak.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const recencyScore = Math.max(0, 30 - daysSinceLastActive * 10)
  score += recencyScore
  if (recencyScore >= 25) factors.push('Recently active')
  
  // Determine status
  let status: 'excellent' | 'good' | 'fair' | 'poor'
  if (score >= 80) {
    status = 'excellent'
  } else if (score >= 60) {
    status = 'good'
  } else if (score >= 40) {
    status = 'fair'
  } else {
    status = 'poor'
  }
  
  return { score, status, factors }
}