'use client'

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { UnauthenticatedOnly } from '@/components/auth/ProtectedRoute'

/**
 * Reset password page using auth-service integration
 * Requirements: 1.4, 7.4
 */

export default function ResetPasswordPage() {
  return (
    <UnauthenticatedOnly>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <ResetPasswordForm />
        </div>
      </div>
    </UnauthenticatedOnly>
  )
}