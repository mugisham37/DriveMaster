import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/middleware'

async function unlockAccountHandler(request: NextRequest) {
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

    // TODO: Implement actual unlock logic
    // This would typically:
    // 1. Check if user exists with this email
    // 2. Check if account is actually locked
    // 3. Generate unlock token
    // 4. Send unlock email
    // 5. Update user record
    
    // For now, simulate the process
    console.log(`Sending unlock instructions to: ${email}`)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      message: 'If an account with that email exists and is locked, we\'ve sent you unlock instructions.',
      success: true
    })

  } catch (error) {
    console.error('Unlock account error:', error)
    return NextResponse.json(
      { error: 'Failed to send unlock instructions' },
      { status: 500 }
    )
  }
}

export const POST = withErrorHandling(unlockAccountHandler)