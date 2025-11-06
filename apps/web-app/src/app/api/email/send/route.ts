import { NextRequest, NextResponse } from 'next/server'
import { requireInsider } from '@/lib/auth'
import { mailer, emailQueue } from '@/lib/email/mailer'
import { withErrorHandling, type AuthenticatedRequest } from '@/lib/api/middleware'

async function sendEmailHandler(request: AuthenticatedRequest) {
  // User is guaranteed to be authenticated by withAuth middleware
  const user = request.user!

  try {
    const { template, to, context, scheduled } = await request.json()

    if (!template || !to || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: template, to, context' },
        { status: 400 }
      )
    }

    // Add user context if not provided
    if (!context.user) {
      context.user = {
        handle: user.handle,
        name: user.name,
        email: user.email
      }
    }

    let emailId: string

    if (scheduled) {
      // Add to queue for scheduled sending
      emailId = await emailQueue.addToQueue(
        { to, template, context },
        new Date(scheduled)
      )
    } else {
      // Send immediately
      const success = await mailer.sendEmail({ to, template, context })
      
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to send email' },
          { status: 500 }
        )
      }

      emailId = `immediate_${Date.now()}`
    }

    return NextResponse.json({
      success: true,
      emailId,
      message: scheduled ? 'Email scheduled successfully' : 'Email sent successfully'
    })

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: 'Failed to process email request' },
      { status: 500 }
    )
  }
}

async function getEmailQueueStatus(_: NextRequest) {
  const user = await requireInsider()
  
  // User is guaranteed to be authenticated and have insider privileges

  const status = emailQueue.getQueueStatus()
  
  return NextResponse.json({
    queue: status,
    timestamp: new Date().toISOString()
  })
}

export const POST = withErrorHandling(sendEmailHandler)
export const GET = withErrorHandling(getEmailQueueStatus)