'use client'

import { SignUpForm } from '@/components/auth/SignUpForm'
import { UnauthenticatedOnly } from '@/components/auth/ProtectedRoute'

/**
 * Sign up page using auth-service integration
 * Requirements: 1.1, 1.2, 1.4, 7.4
 */

export default function SignUpPage() {
  return (
    <UnauthenticatedOnly>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <SignUpForm 
            showOAuth={true}
            oauthProviders={['google', 'github', 'apple', 'facebook', 'microsoft']}
            oauthFlow="redirect"
          />
        </div>
      </div>
    </UnauthenticatedOnly>
  )
}