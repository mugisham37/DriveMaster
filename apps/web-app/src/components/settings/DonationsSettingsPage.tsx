'use client'

import { ExercismUser } from '@/lib/auth/config'

interface Payment {
  id: number
  amount_in_dollars: number
  created_at: string
  subscription: boolean
  provider: string
  external_receipt_url: string
}

interface Subscription {
  id: string
  provider: string
  amount_in_cents: number
  status: string
  created_at: string
}

interface Totals {
  total_subscription_donations_in_dollars: number
  total_one_off_donations_in_dollars: number
}

interface DonationsSettingsPageProps {
  user: ExercismUser
  payments: Payment[]
  currentSubscription: Subscription | null
  totals: Totals
}

export function DonationsSettingsPage({
  user,
  payments,
  currentSubscription,
  totals
}: DonationsSettingsPageProps) {
  const handleCancelSubscription = async () => {
    if (!currentSubscription) return
    
    if (!confirm('Are you sure you want to cancel your subscription? You will lose Insider benefits at the end of your current billing period.')) {
      return
    }

    try {
      const response = await fetch(`/api/payments/subscriptions/${currentSubscription.id}/cancel`, {
        method: 'DELETE'
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to cancel subscription. Please try again.')
      }
    } catch (error) {
      console.error('Cancel subscription error:', error)
      alert('Failed to cancel subscription. Please try again.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Donation Settings</h1>
        <p className="text-gray-600">
          Manage your donations and subscriptions to Exercism
        </p>
      </div>

      {/* Current Subscription */}
      {currentSubscription && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium text-gray-900">
                ${(currentSubscription.amount_in_cents / 100).toFixed(2)}/month
              </p>
              <p className="text-sm text-gray-500">
                Status: <span className="capitalize">{currentSubscription.status}</span>
              </p>
              <p className="text-sm text-gray-500">
                Started: {new Date(currentSubscription.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={handleCancelSubscription}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      )}

      {/* Donation Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Donation Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Monthly Donations</h3>
            <p className="text-2xl font-bold text-blue-600">
              ${totals.total_subscription_donations_in_dollars.toFixed(2)}
            </p>
            <p className="text-sm text-blue-700">Total recurring donations</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-green-900 mb-2">One-time Donations</h3>
            <p className="text-2xl font-bold text-green-600">
              ${totals.total_one_off_donations_in_dollars.toFixed(2)}
            </p>
            <p className="text-sm text-green-700">Total one-time donations</p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment History</h2>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No payments found.</p>
            <a
              href="/donate"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Make a Donation
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${payment.amount_in_dollars.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.subscription ? 'Subscription' : 'One-time'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {payment.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <a
                        href={payment.external_receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900 underline"
                      >
                        View Receipt
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-4">
        <a
          href="/donate"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Make Another Donation
        </a>
        <a
          href="/settings"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to Settings
        </a>
      </div>
    </div>
  )
}