'use client'

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { UnauthenticatedOnly } from '@/components/auth/ProtectedRoute'

/**
 * Forgot password page using auth-service integration
 * Requirements: 1.4, 7.4
 */

export default function ForgotPasswordPage() {
  return (
    <UnauthenticatedOnly>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <ForgotPasswordForm />
        </div>
      </div>
    </UnauthenticatedOnly>
  )
}