/**
 * Next.js API Routes for User Preferences Operations
 * 
 * Implements:
 * - /api/users/preferences routes for preference handling
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for preference endpoints
 * - Requirements: 1.1, 1.2, 1.4, 11.1 (Task 9.1)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { UserPreferences, PreferencesData } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const NotificationPreferencesSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  inApp: z.boolean(),
  marketing: z.boolean(),
  reminders: z.boolean(),
})

const PrivacyPreferencesSchema = z.object({
  profileVisibility: z.enum(['public', 'private', 'friends']),
  activityTracking: z.boolean(),
  dataSharing: z.boolean(),
  analytics: z.boolean(),
})

const LearningPreferencesSchema = z.object({
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  pace: z.enum(['slow', 'normal', 'fast']),
  reminders: z.boolean(),
  streakNotifications: z.boolean(),
})

const AccessibilityPreferencesSchema = z.object({
  highContrast: z.boolean(),
  largeText: z.boolean(),
  reducedMotion: z.boolean(),
  screenReader: z.boolean(),
})

const PreferencesUpdateSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().min(2).max(5).optional(),
  notifications: NotificationPreferencesSchema.partial().optional(),
  privacy: PrivacyPreferencesSchema.partial().optional(),
  learning: LearningPreferencesSchema.partial().optional(),
  accessibility: AccessibilityPreferencesSchema.partial().optional(),
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
// GET /api/users/preferences - Fetch User Preferences
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Fetch user preferences from user-service
    const preferences = await userServiceClient.getUserPreferences(userId)
    
    return NextResponse.json({
      success: true,
      data: preferences,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Preferences fetch error:', error)
    
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
          message: 'Failed to fetch user preferences',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH /api/users/preferences - Update User Preferences
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = PreferencesUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid preferences data',
            details: validationResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const preferencesUpdate: Partial<PreferencesData> = validationResult.data
    
    // Update user preferences via user-service
    const updatedPreferences = await userServiceClient.updatePreferences(userId, preferencesUpdate)
    
    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: 'Preferences updated successfully',
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Preferences update error:', error)
    
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
          message: 'Failed to update user preferences',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/users/preferences/reset - Reset Preferences to Defaults
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Define default preferences
    const defaultPreferences: Partial<PreferencesData> = {
      theme: 'system',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        inApp: true,
        marketing: false,
        reminders: true,
      },
      privacy: {
        profileVisibility: 'private',
        activityTracking: true,
        dataSharing: false,
        analytics: true,
      },
      learning: {
        difficulty: 'intermediate',
        pace: 'normal',
        reminders: true,
        streakNotifications: true,
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false,
      },
    }
    
    // Update preferences to defaults
    const updatedPreferences = await userServiceClient.updatePreferences(userId, defaultPreferences)
    
    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: 'Preferences reset to defaults successfully',
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Preferences reset error:', error)
    
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
          message: 'Failed to reset preferences',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}