import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/middleware'

async function resendConfirmationHandler(request: NextRequest) {
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

    // TODO: Implement actual email sending logic
    // This would typically:
    // 1. Check if user exists with this email
    // 2. Generate a new confirmation token
    // 3. Send confirmation email
    // 4. Update user record with new token
    
    // For now, simulate the process
    console.log(`Resending confirmation email to: ${email}`)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      message: 'If an account with that email exists, we\'ve sent you a confirmation link.',
      success: true
    })

  } catch (error) {
    console.error('Resend confirmation error:', error)
    return NextResponse.json(
      { error: 'Failed to send confirmation email' },
      { status: 500 }
    )
  }
}

export const POST = withErrorHandling(resendConfirmationHandler)