'use client'

/**
 * Simple Authentication Hook Test Component
 * 
 * This component provides a simple test of the new authentication hooks
 * to verify they work correctly.
 */

import React from 'react'
import { useAuth, useAuthActions, useAuthStatus } from '@/hooks/useAuth'

export function SimpleAuthTest() {
  const auth = useAuth()
  const authActions = useAuthActions()
  const authStatus = useAuthStatus()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Authentication Hook Test</h2>
      
      {/* Basic Auth State */}
      <div className="mb-6 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-2">useAuth() Hook</h3>
        <div className="space-y-1 text-sm">
          <p>Initialized: {auth.isInitialized ? '✅' : '❌'}</p>
          <p>Authenticated: {auth.isAuthenticated ? '✅' : '❌'}</p>
          <p>Loading: {auth.isLoading ? '⏳' : '✅'}</p>
          <p>Is Mentor: {auth.isMentor ? '✅' : '❌'}</p>
          <p>Is Insider: {auth.isInsider ? '✅' : '❌'}</p>
          {auth.user && (
            <p>User Handle: {auth.user.handle}</p>
          )}
        </div>
      </div>

      {/* Auth Status */}
      <div className="mb-6 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-2">useAuthStatus() Hook</h3>
        <div className="space-y-1 text-sm">
          <p>Ready: {authStatus.isReady ? '✅' : '❌'}</p>
          <p>Can Access Dashboard: {authStatus.canAccessDashboard ? '✅' : '❌'}</p>
          <p>Can Access Mentoring: {authStatus.canAccessMentoring ? '✅' : '❌'}</p>
          <p>Can Access Insider Features: {authStatus.canAccessInsiderFeatures ? '✅' : '❌'}</p>
          <p>Has User Role: {authStatus.hasRole('user') ? '✅' : '❌'}</p>
          <p>Has Mentor Role: {authStatus.hasRole('mentor') ? '✅' : '❌'}</p>
          <p>Has Insider Role: {authStatus.hasRole('insider') ? '✅' : '❌'}</p>
        </div>
      </div>

      {/* Auth Actions */}
      <div className="mb-6 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-2">useAuthActions() Hook</h3>
        <div className="space-y-2">
          <p className="text-sm">Available actions:</p>
          <ul className="text-sm space-y-1 ml-4">
            <li>✅ login()</li>
            <li>✅ validateAndLogin()</li>
            <li>✅ register()</li>
            <li>✅ validateAndRegister()</li>
            <li>✅ logout()</li>
            <li>✅ initiateOAuth()</li>
            <li>✅ refreshSession()</li>
          </ul>
        </div>
      </div>

      {/* Error State */}
      {auth.state.error && (
        <div className="mb-6 p-4 border border-red-300 rounded bg-red-50">
          <h3 className="text-lg font-semibold mb-2 text-red-800">Error State</h3>
          <div className="text-sm text-red-700">
            <p>Type: {auth.state.error.type}</p>
            <p>Message: {auth.state.error.message}</p>
            <p>Recoverable: {auth.state.error.recoverable ? 'Yes' : 'No'}</p>
          </div>
        </div>
      )}

      {/* Test Actions */}
      <div className="p-4 border rounded">
        <h3 className="text-lg font-semibold mb-2">Test Actions</h3>
        <div className="space-y-2">
          <button
            onClick={() => auth.clearAllErrors()}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Clear All Errors
          </button>
          <button
            onClick={() => auth.updateActivity()}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
          >
            Update Activity
          </button>
          <button
            onClick={() => auth.checkAuthStatus()}
            className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
          >
            Check Auth Status
          </button>
        </div>
      </div>
    </div>
  )
}

export default SimpleAuthTest