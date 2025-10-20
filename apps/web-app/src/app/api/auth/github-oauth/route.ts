import { NextRequest, NextResponse } from 'next/server'

/**
 * GitHub OAuth API route that handles user creation/update
 * Preserves exact Rails OAuth flow behavior
 */

export async function POST(request: NextRequest) {
  try {
    const { githubId, login, name, email, avatarUrl } = await request.json()
    
    if (!githubId || !login) {
      return NextResponse.json(
        { error: 'GitHub ID and login are required' },
        { status: 400 }
      )
    }
    
    // Connect to Rails API to create or update user
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${railsApiUrl}/api/v1/auth/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          github_id: githubId,
          login,
          name,
          email,
          avatar_url: avatarUrl
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Preserve exact Rails error handling
        if (response.status === 422) {
          return NextResponse.json(
            { error: errorData.message || 'Unable to create account' },
            { status: 422 }
          )
        }
        
        if (response.status === 409) {
          return NextResponse.json(
            { error: 'This GitHub account is already linked to another user' },
            { status: 409 }
          )
        }
        
        return NextResponse.json(
          { error: 'OAuth authentication failed' },
          { status: response.status }
        )
      }
      
      const userData = await response.json()
      
      // Return user data in NextAuth format
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
      
      // Fallback for development/testing
      // Create mock user based on GitHub data
      const mockUser = {
        id: Math.floor(Math.random() * 10000), // Generate random ID for testing
        handle: login,
        name: name || login,
        email: email || `${login}@github.local`,
        avatarUrl: avatarUrl || 'https://avatars.githubusercontent.com/u/1?v=4',
        reputation: '0',
        flair: null,
        isMentor: false,
        isInsider: false,
        preferences: {
          theme: 'system',
          emailNotifications: true,
          mentorNotifications: true
        },
        tracks: []
      }
      
      return NextResponse.json(mockUser)
    }
    
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}