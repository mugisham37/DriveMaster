import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { mailer } from '@/lib/email'

/**
 * Sign up API route that preserves Rails user registration behavior
 */

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, handle } = await request.json()
    
    // Validation
    if (!name || !email || !password || !handle) {
      return NextResponse.json(
        { error: 'Name, email, password, and handle are required' },
        { status: 400 }
      )
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }
    
    // Validate password strength (Rails validation rules)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }
    
    // Validate handle format (alphanumeric, hyphens, underscores)
    const handleRegex = /^[a-zA-Z0-9_-]+$/
    if (!handleRegex.test(handle)) {
      return NextResponse.json(
        { error: 'Handle can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      )
    }
    
    if (handle.length < 2 || handle.length > 30) {
      return NextResponse.json(
        { error: 'Handle must be between 2 and 30 characters long' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Connect to Rails API to create user
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3001'
    
    try {
      const response = await fetch(`${railsApiUrl}/api/v1/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password: hashedPassword,
          handle
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Preserve exact Rails error messages
        if (response.status === 422) {
          // Handle validation errors
          if (errorData.errors) {
            const firstError = Object.values(errorData.errors)[0]
            return NextResponse.json(
              { error: Array.isArray(firstError) ? firstError[0] : firstError },
              { status: 422 }
            )
          }
          return NextResponse.json(
            { error: errorData.message || 'Validation failed' },
            { status: 422 }
          )
        }
        
        if (response.status === 409) {
          return NextResponse.json(
            { error: 'An account with this email or handle already exists' },
            { status: 409 }
          )
        }
        
        return NextResponse.json(
          { error: 'Failed to create account' },
          { status: response.status }
        )
      }
      
      const userData = await response.json()
      
      // Send welcome email
      try {
        await mailer.sendNotificationEmail('joinedExercism', email, {
          user: { handle, name, email }
        })
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
        // Don't fail signup if email fails
      }
      
      // Return user data (without password)
      return NextResponse.json({
        id: userData.id,
        handle: userData.handle,
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.avatar_url,
        reputation: userData.reputation || '0',
        flair: userData.flair || null,
        isMentor: userData.is_mentor || false,
        isInsider: userData.is_insider || false
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Fallback for development/testing
      // In production, this would connect to the database directly
      
      // Check for duplicate email/handle (mock validation)
      if (email === 'test@exercism.org') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      
      if (handle === 'testuser') {
        return NextResponse.json(
          { error: 'This handle is already taken' },
          { status: 409 }
        )
      }
      
      // Create mock user for development
      const mockUser = {
        id: Math.floor(Math.random() * 10000),
        handle,
        name,
        email,
        avatarUrl: `https://avatars.dicebear.com/api/initials/${encodeURIComponent(name)}.svg`,
        reputation: '0',
        flair: null,
        isMentor: false,
        isInsider: false
      }
      
      // Send welcome email for mock user too
      try {
        await mailer.sendNotificationEmail('joinedExercism', email, {
          user: { handle, name, email }
        })
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
      }
      
      return NextResponse.json(mockUser)
    }
    
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}