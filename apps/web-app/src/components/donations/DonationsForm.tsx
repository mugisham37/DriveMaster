'use client'

import { useState } from 'react'
import { ExercismUser } from '@/lib/auth/config'

interface DonationsFormProps {
  user: ExercismUser
}

export function DonationsForm({ user }: DonationsFormProps) {
  const [amount, setAmount] = useState(10)
  const [isRecurring, setIsRecurring] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const predefinedAmounts = [5, 10, 25, 50, 100]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Implement actual payment processing
      // This would integrate with Stripe or other payment processor
      console.log('Processing donation:', { amount, isRecurring, userId: user.id })
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Redirect to success page
      window.location.href = '/donate/success'
    } catch (error) {
      console.error('Donation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="c-donations-form bg-white p-8 rounded-lg shadow-lg max-w-md">
      <h2 className="text-h4 mb-6">Support Exercism</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choose amount
          </label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {predefinedAmounts.map((presetAmount) => (
              <button
                key={presetAmount}
                type="button"
                onClick={() => setAmount(presetAmount)}
                className={`px-4 py-2 text-sm font-medium rounded-md border ${
                  amount === presetAmount
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                ${presetAmount}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="pl-8 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Custom amount"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Make this a monthly donation
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Monthly donations help us plan and provide steady support
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || amount < 1}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          ) : (
            `Donate $${amount}${isRecurring ? '/month' : ''}`
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Secure payment processing powered by Stripe
        </p>
      </form>
    </div>
  )
}