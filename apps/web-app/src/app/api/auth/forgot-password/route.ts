import { NextRequest, NextResponse } from 'next/server'

/**
 * Forgot password API route that preserves Rails password reset behavior
 */

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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
    
    // Connect to Rails API for password reset
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      await fetch(`${railsApiUrl}/api/v1/auth/forgot_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
      })
      
      // Always return success message for security (Rails behavior)
      // Don't reveal whether email exists or not
      return NextResponse.json({
        message: 'If an account with that email exists, we\'ve sent you a password reset link.'
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Always return success message even on error (security best practice)
      return NextResponse.json({
        message: 'If an account with that email exists, we\'ve sent you a password reset link.'
      })
    }
    
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}