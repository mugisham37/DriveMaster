import { NextRequest, NextResponse } from 'next/server'

/**
 * Token refresh API route
 * 
 * Handles token refresh requests by communicating with the auth-service
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    // Get auth-service URL from environment
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001'
    
    // Call auth-service to refresh tokens
    const response = await fetch(`${authServiceUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Exercism-Frontend/1.0',
      },
      body: JSON.stringify({
        refreshToken
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid or expired refresh token' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Token refresh failed',
          details: errorData.message || 'Unknown error'
        },
        { status: response.status }
      )
    }

    const tokenData = await response.json()

    // Return the new tokens
    return NextResponse.json({
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresIn: tokenData.expiresIn
    })

  } catch (error) {
    console.error('Token refresh API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process token refresh request'
      },
      { status: 500 }
    )
  }
}