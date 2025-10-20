'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface PaymentReturnHandlerProps {
  className?: string
}

interface SessionStatus {
  status: 'open' | 'complete' | 'expired'
  customer_email?: string
}

export function PaymentReturnHandler({ className = '' }: PaymentReturnHandlerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initialize = async () => {
      // Check if we're on the enrollment page
      if (window.location.pathname !== '/courses/enrolled') {
        setLoading(false)
        return
      }

      const sessionId = searchParams.get('session_id')
      const enrollmentUuid = searchParams.get('enrollment_uuid')
      let failurePath = searchParams.get('failure_path')
      
      if (!failurePath || !failurePath.startsWith('/courses/')) {
        failurePath = '/bootcamp'
      }

      if (!sessionId) {
        router.replace(failurePath)
        return
      }

      try {
        const response = await fetch(
          `/courses/stripe/session-status?session_id=${sessionId}&enrollment_uuid=${enrollmentUuid}`
        )
        const session: SessionStatus = await response.json()

        if (session.status === 'open') {
          router.replace(failurePath)
        } else if (session.status === 'complete') {
          setSessionStatus(session)
          
          // Hide pending and show success
          const pendingElement = document.getElementById('pending')
          const successElement = document.getElementById('success')
          const customerEmailElement = document.getElementById('customer-email')
          
          if (pendingElement) pendingElement.classList.add('hidden')
          if (successElement) successElement.classList.remove('hidden')
          if (customerEmailElement && session.customer_email) {
            customerEmailElement.textContent = session.customer_email
          }
        }
      } catch (error) {
        console.error('Failed to check session status:', error)
        router.replace(failurePath)
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [router, searchParams])

  if (loading) {
    return (
      <div className={`payment-return-handler ${className}`}>
        <div id="pending">
          <h2>Processing your enrollment...</h2>
          <p>Please wait while we confirm your payment.</p>
        </div>
      </div>
    )
  }

  if (!sessionStatus) {
    return null
  }

  return (
    <div className={`payment-return-handler ${className}`}>
      <div id="pending" className="hidden">
        <h2>Processing your enrollment...</h2>
        <p>Please wait while we confirm your payment.</p>
      </div>
      
      <div id="success" className="hidden">
        <h2>Enrollment Successful!</h2>
        <p>Welcome to the bootcamp! A confirmation email has been sent to:</p>
        <p><strong id="customer-email"></strong></p>
      </div>
    </div>
  )
}