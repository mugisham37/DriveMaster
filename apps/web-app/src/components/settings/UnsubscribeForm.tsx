'use client'

import { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import Link from 'next/link'

interface UnsubscribeFormProps {
  email?: string | undefined
  token?: string | undefined
  type?: string | undefined
}

interface EmailPreference {
  id: string
  name: string
  description: string
  enabled: boolean
  required: boolean
}

export function UnsubscribeForm({ email, token }: UnsubscribeFormProps) {
  const [preferences, setPreferences] = useState<EmailPreference[]>([
    {
      id: 'marketing',
      name: 'Marketing & Updates',
      description: 'Product updates, new features, and community highlights',
      enabled: true,
      required: false
    },
    {
      id: 'mentoring',
      name: 'Mentoring Notifications',
      description: 'Notifications about mentoring discussions and requests',
      enabled: true,
      required: false
    },
    {
      id: 'progress',
      name: 'Progress Reports',
      description: 'Weekly summaries of your learning progress',
      enabled: true,
      required: false
    },
    {
      id: 'community',
      name: 'Community Updates',
      description: 'Community events, challenges, and success stories',
      enabled: true,
      required: false
    },
    {
      id: 'security',
      name: 'Security & Account',
      description: 'Critical security alerts and account notifications',
      enabled: true,
      required: true
    }
  ])

  const [emailInput, setEmailInput] = useState(email || '')
  const [isUnsubscribed, setIsUnsubscribed] = useState(false)

  const { submit, isSubmitting, error } = useFormSubmission({
    endpoint: '/api/unsubscribe',
    method: 'POST',
    onSuccess: () => {
      setIsUnsubscribed(true)
    }
  })

  const handlePreferenceChange = (id: string, enabled: boolean) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.id === id ? { ...pref, enabled } : pref
      )
    )
  }

  const handleUnsubscribeAll = async () => {
    await submit({
      email: emailInput,
      token,
      type: 'all',
      preferences: preferences.reduce((acc, pref) => ({
        ...acc,
        [pref.id]: false
      }), {})
    })
  }

  const handleUpdatePreferences = async () => {
    await submit({
      email: emailInput,
      token,
      type: 'selective',
      preferences: preferences.reduce((acc, pref) => ({
        ...acc,
        [pref.id]: pref.enabled
      }), {})
    })
  }

  if (isUnsubscribed) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-h2 mb-4 text-green-700 dark:text-green-300">
            Preferences Updated
          </h2>
          
          <p className="text-p-base text-green-600 dark:text-green-400 mb-6">
            Your email preferences have been successfully updated. 
            Changes will take effect within 24 hours.
          </p>
          
          <Link
            href="/dashboard"
            className="btn-m btn-primary"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      {!email && (
        <div className="mb-6">
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            placeholder="Enter your email address"
            required
          />
        </div>
      )}

      <div className="space-y-4 mb-8">
        <h3 className="font-semibold text-lg">Email Preferences</h3>
        
        {preferences.map((pref) => (
          <div key={pref.id} className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <input
              type="checkbox"
              id={pref.id}
              checked={pref.enabled}
              onChange={(e) => handlePreferenceChange(pref.id, e.target.checked)}
              disabled={pref.required}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
            <div className="flex-1">
              <label 
                htmlFor={pref.id} 
                className={`font-medium ${pref.required ? 'text-gray-500' : 'cursor-pointer'}`}
              >
                {pref.name}
                {pref.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {pref.description}
              </p>
              {pref.required && (
                <p className="text-xs text-red-500 mt-1">
                  Required for account security
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400 text-sm">{error.message}</p>
        </div>
      )}

      <div className="flex gap-4 justify-center">
        <FormButton
          onClick={handleUpdatePreferences}
          isLoading={isSubmitting}
          className="btn-m btn-primary"
        >
          Update Preferences
        </FormButton>
        
        <FormButton
          onClick={handleUnsubscribeAll}
          isLoading={isSubmitting}
          className="btn-m btn-destructive"
        >
          Unsubscribe from All
        </FormButton>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/settings/notifications"
          className="text-sm text-linkColor hover:underline"
        >
          Manage all notification settings
        </Link>
      </div>
    </div>
  )
}