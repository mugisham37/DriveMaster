'use client'

/**
 * Session Expired Dialog Component
 * 
 * Displays when session has expired with re-authentication option
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// ============================================================================
// Component Props
// ============================================================================

export interface SessionExpiredDialogProps {
  isVisible: boolean
  onReauthenticate?: () => void
  onDismiss?: () => void
  className?: string
  redirectUrl?: string
}

// ============================================================================
// Session Expired Dialog Component
// ============================================================================

export const SessionExpiredDialog: React.FC<SessionExpiredDialogProps> = ({
  isVisible,
  onReauthenticate,
  onDismiss,
  className = '',
  redirectUrl
}) => {
  const router = useRouter()
  const { logout } = useAuth()
  
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  const handleReauthenticate = useCallback(async () => {
    if (isRedirecting) return
    
    setIsRedirecting(true)
    
    try {
      // Clear current session
      await logout()
      
      // Redirect to sign in with callback URL
      const currentUrl = redirectUrl || window.location.pathname + window.location.search
      const signInUrl = `/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`
      
      if (onReauthenticate) {
        onReauthenticate()
      } else {
        router.push(signInUrl)
      }
    } catch (error) {
      console.error('Failed to logout during re-authentication:', error)
      // Still redirect to sign in even if logout fails
      const currentUrl = redirectUrl || window.location.pathname + window.location.search
      const signInUrl = `/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`
      router.push(signInUrl)
    }
  }, [isRedirecting, logout, onReauthenticate, router, redirectUrl])
  
  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss()
    } else {
      // Default behavior: redirect to home page
      router.push('/')
    }
  }, [onDismiss, router])
  
  if (!isVisible) {
    return null
  }
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-description"
      >
        {/* Modal */}
        <div className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 ${className}`}>
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg 
                className="h-8 w-8 text-red-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 
                id="session-expired-title"
                className="text-lg font-medium text-gray-900"
              >
                Session Expired
              </h3>
            </div>
          </div>
          
          {/* Content */}
          <div className="mb-6">
            <p 
              id="session-expired-description"
              className="text-sm text-gray-600 mb-4"
            >
              Your session has expired due to inactivity. For your security, you need to sign in again to continue.
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg 
                    className="h-4 w-4 text-red-600" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">
                    Any unsaved changes may be lost. Please save your work before signing in again.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleReauthenticate}
              disabled={isRedirecting}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRedirecting ? (
                <>
                  <svg 
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Redirecting...
                </>
              ) : (
                'Sign In Again'
              )}
            </button>
            
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isRedirecting}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go to Home
            </button>
          </div>
          
          {/* Footer */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            You will be redirected back to this page after signing in.
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default SessionExpiredDialog