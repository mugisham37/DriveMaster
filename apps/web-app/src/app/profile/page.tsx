'use client'

import { ProfileManagement } from '@/components/auth/ProfileManagement'
import { AuthenticatedOnly } from '@/components/auth/ProtectedRoute'

/**
 * Profile management page using auth-service integration
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

export default function ProfilePage() {
  return (
    <AuthenticatedOnly>
      <div className="min-h-screen bg-gray-50 py-8">
        <ProfileManagement />
      </div>
    </AuthenticatedOnly>
  )
}