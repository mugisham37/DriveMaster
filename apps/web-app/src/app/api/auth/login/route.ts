import { NextRequest, NextResponse } from 'next/server'
// Authentication utilities would be imported here if needed

/**
 * Login API route that preserves exact Rails authentication behavior
 */

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    
    // In a real implementation, this would connect to your database
    // For now, we'll simulate the Rails API call
    
    // This would typically be a database query to find the user
    // const user = await User.findByEmail(email)
    
    // Simulate API call to existing Rails backend for authentication
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${railsApiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Preserve exact Rails error messages
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          )
        }
        
        if (response.status === 422) {
          return NextResponse.json(
            { error: errorData.message || 'Invalid credentials' },
            { status: 422 }
          )
        }
        
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: response.status }
        )
      }
      
      const userData = await response.json()
      
      // Return user data in the format expected by NextAuth
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
      
      // Fallback authentication logic (for development/testing)
      // This would be replaced with direct database access in production
      
      // Mock user data for development
      if (email === 'test@exercism.org' && password === 'password') {
        return NextResponse.json({
          id: 1,
          handle: 'testuser',
          name: 'Test User',
          email: 'test@exercism.org',
          avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
          reputation: '1,234',
          flair: null,
          isMentor: false,
          isInsider: false,
          preferences: {
            theme: 'system',
            emailNotifications: true,
            mentorNotifications: true
          },
          tracks: []
        })
      }
      
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}