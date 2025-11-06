import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

/**
 * User API route that fetches user data with Rails-compatible format
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const userId = params.id
    
    // Users can only access their own data or mentors can access any user data
    if (user.id.toString() !== userId && !user.isMentor) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Connect to Rails API to fetch user data
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${railsApiUrl}/api/v1/users/${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer mock-token`
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }
        
        return NextResponse.json(
          { error: 'Failed to fetch user data' },
          { status: response.status }
        )
      }
      
      const userData = await response.json()
      
      // Return user data in consistent format
      return NextResponse.json({
        id: userData.id,
        handle: userData.handle,
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.avatar_url,
        reputation: userData.reputation,
        flair: userData.flair,
        isMentor: userData.is_mentor,
        isInsider: userData.is_insider,
        preferences: userData.preferences || {
          theme: 'system',
          emailNotifications: true,
          mentorNotifications: true
        },
        tracks: userData.tracks || [],
        badges: userData.badges || [],
        testimonials: userData.testimonials || [],
        stats: userData.stats || {
          totalExercisesCompleted: 0,
          totalLanguages: 0,
          totalMentoringSessions: 0
        }
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Fallback for development/testing
      if (userId === user.id.toString()) {
        return NextResponse.json({
          id: user.id,
          handle: user.handle,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          reputation: user.reputation,
          flair: user.flair,
          isMentor: user.isMentor,
          isInsider: user.isInsider,
          preferences: {
            theme: 'system',
            emailNotifications: true,
            mentorNotifications: true
          },
          tracks: [],
          badges: [],
          testimonials: [],
          stats: {
            totalExercisesCompleted: 0,
            totalLanguages: 0,
            totalMentoringSessions: 0
          }
        })
      }
      
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('User fetch error:', error)
    
    // Handle authentication errors with appropriate status codes
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const userId = params.id
    
    // Users can only update their own data
    if (user.id.toString() !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    const updateData = await request.json()
    
    // Connect to Rails API to update user data
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${railsApiUrl}/api/v1/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer mock-token`
        },
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 422) {
          return NextResponse.json(
            { error: errorData.message || 'Validation failed' },
            { status: 422 }
          )
        }
        
        return NextResponse.json(
          { error: 'Failed to update user data' },
          { status: response.status }
        )
      }
      
      const userData = await response.json()
      
      return NextResponse.json({
        id: userData.id,
        handle: userData.handle,
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.avatar_url,
        reputation: userData.reputation,
        flair: userData.flair,
        isMentor: userData.is_mentor,
        isInsider: userData.is_insider,
        preferences: userData.preferences,
        tracks: userData.tracks
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      return NextResponse.json(
        { error: 'Failed to update user data' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('User update error:', error)
    
    // Handle authentication errors with appropriate status codes
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}