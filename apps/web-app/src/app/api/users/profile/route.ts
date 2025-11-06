/**
 * Next.js API Routes for User Profile Operations
 * 
 * Implements:
 * - /api/users/profile routes for profile management
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for all user endpoints
 * - Requirements: 1.1, 1.2, 1.4, 11.1 (Task 9.1)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { UserProfile, UserUpdateRequest } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const UserUpdateSchema = z.object({
  timezone: z.string().optional(),
  language: z.string().min(2).max(5).optional(),
  preferences: z.record(z.unknown()).optional(),
  gdprConsent: z.boolean().optional(),
  version: z.number().int().positive(),
})

// ============================================================================
// Authentication Middleware
// ============================================================================

async function authenticateRequest() {
  try {
    const user = await requireAuth()
    return { userId: user.id.toString(), user }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { type: 'authorization', message: 'Authentication required' } },
      { status: 401 }
    )
  }
}

// ============================================================================
// GET /api/users/profile - Fetch User Profile
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest()
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Fetch user profile from user-service
    const profile = await userServiceClient.getUser(userId)
    
    return NextResponse.json({
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Profile fetch error:', error)
    
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
          message: 'Failed to fetch user profile',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH /api/users/profile - Update User Profile
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest()
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = UserUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid request data',
            details: validationResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const updateData: UserUpdateRequest = validationResult.data
    
    // Sanitize preferences if provided
    if (updateData.preferences) {
      // Remove any potentially dangerous keys
      const sanitizedPreferences = Object.fromEntries(
        Object.entries(updateData.preferences).filter(([key]) => 
          !key.startsWith('__') && !key.includes('script') && !key.includes('eval')
        )
      )
      updateData.preferences = sanitizedPreferences
    }
    
    // Update user profile via user-service
    const updatedProfile = await userServiceClient.updateUser(userId, updateData)
    
    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Profile update error:', error)
    
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
          message: 'Failed to update user profile',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE /api/users/profile - Deactivate User Account
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest()
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse request body for deactivation reason
    const body = await request.json()
    const reason = body.reason || 'User requested account deactivation'
    
    // Validate reason
    if (typeof reason !== 'string' || reason.length < 5 || reason.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Deactivation reason must be between 5 and 500 characters',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    // Deactivate user account via user-service
    await userServiceClient.deactivateUser(userId, reason)
    
    return NextResponse.json({
      success: true,
      message: 'Account deactivated successfully',
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Account deactivation error:', error)
    
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
          message: 'Failed to deactivate account',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}