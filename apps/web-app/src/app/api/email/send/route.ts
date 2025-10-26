import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { mailer, emailQueue } from '@/lib/email/mailer'
import { withErrorHandling, withAuth } from '@/lib/api/middleware'

async function sendEmailHandler(request: NextRequest) {
  const session = await getServerAuthSession()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

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
        handle: session.user.handle,
        name: session.user.name,
        email: session.user.email
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
  const session = await getServerAuthSession()
  
  // Only allow admins to check queue status
  if (!session?.user || !session.user.isInsider) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  const status = emailQueue.getQueueStatus()
  
  return NextResponse.json({
    queue: status,
    timestamp: new Date().toISOString()
  })
}

export const POST = withErrorHandling(withAuth(sendEmailHandler))
export const GET = withErrorHandling(getEmailQueueStatus)