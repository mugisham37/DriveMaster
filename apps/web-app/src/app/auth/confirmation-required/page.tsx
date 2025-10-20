'use client'

import Link from 'next/link'
import { UnauthenticatedOnly } from '@/components/auth/ProtectedRoute'

/**
 * Email confirmation required page that preserves exact Rails confirmation flow
 */

export default function ConfirmationRequiredPage() {
  return (
    <UnauthenticatedOnly>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-auto flex justify-center">
              <svg className="h-12 w-12 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Welcome! Check your email
            </h2>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <div className="text-sm text-blue-700 space-y-3">
                  <p className="font-medium">
                    We've sent you an email with a confirmation link.
                  </p>
                  <p>
                    Please check your email and click the confirmation link to activate your account. 
                    This helps us verify that the email address belongs to you.
                  </p>
                  <p>
                    Didn't receive the email? Check your spam folder or{' '}
                    <Link 
                      href="/auth/confirm-email" 
                      className="font-medium text-blue-600 hover:text-blue-500 underline"
                    >
                      resend it
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link 
              href="/auth/signin" 
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </UnauthenticatedOnly>
  )
}