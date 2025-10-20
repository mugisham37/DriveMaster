'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PaymentPendingProps {
  endpoint: string
  insidersRedirectPath: string
}

export function PaymentPending({ endpoint, insidersRedirectPath }: PaymentPendingProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(endpoint)
        const data = await response.json()

        if (data.status === 'active') {
          // Payment confirmed, redirect to insiders page
          router.push(insidersRedirectPath)
        } else {
          // Still pending, check again in 5 seconds
          setTimeout(checkPaymentStatus, 5000)
        }
      } catch (error) {
        console.error('Payment status check error:', error)
        // Retry in 10 seconds on error
        setTimeout(checkPaymentStatus, 10000)
      }
    }

    // Start checking after 3 seconds
    const timer = setTimeout(checkPaymentStatus, 3000)

    return () => clearTimeout(timer)
  }, [endpoint, insidersRedirectPath, router])

  return (
    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center">
        <div className="text-blue-600 text-2xl mb-3">⏳</div>
        <h3 className="text-blue-800 font-semibold mb-2">Processing Payment</h3>
        <p className="text-blue-700 text-sm">
          We're confirming your payment with our payment processor. 
          This usually takes just a few moments.
        </p>
        <p className="text-blue-600 text-xs mt-2">
          You'll be automatically redirected once confirmed.
        </p>
      </div>
    </div>
  )
}