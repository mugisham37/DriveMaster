'use client'

import { useState } from 'react'

interface InsidersStatusProps {
  status: 'active' | 'unset'
  insidersStatusRequest: string
  activateInsiderLink: string
  userSignedIn: boolean
  captchaRequired: boolean
  recaptchaSiteKey: string
  amount: number
  links: {
    insiders: string
    paymentPending: string
  }
}

export function InsidersStatus({
  status,
  insidersStatusRequest,
  activateInsiderLink,
  userSignedIn,
  captchaRequired,
  recaptchaSiteKey,
  amount,
  links
}: InsidersStatusProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleActivateInsiders = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement actual Insiders activation
      console.log('Activating Insiders...')
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Redirect to payment pending
      window.location.href = links.paymentPending
    } catch (error) {
      console.error('Insiders activation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'active') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="text-green-600 text-2xl">✅</div>
          <div>
            <h3 className="text-green-800 font-semibold">You're an Insider!</h3>
            <p className="text-green-700">
              Thank you for supporting Exercism. You have access to all Insider benefits.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center gap-4">
        <div className="text-blue-600 text-2xl">💎</div>
        <div className="flex-1">
          <h3 className="text-blue-800 font-semibold mb-2">Become an Insider</h3>
          <p className="text-blue-700 mb-4">
            Support Exercism with a monthly donation of ${amount/100} and get exclusive benefits.
          </p>
          <button
            onClick={handleActivateInsiders}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : `Become an Insider - $${amount/100}/month`}
          </button>
        </div>
      </div>
    </div>
  )
}