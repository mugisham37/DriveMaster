'use client'

/**
 * Authentication System Error Boundary
 * Provides comprehensive error handling for the entire authentication system
 */

import React from 'react'
import { AuthErrorBoundary } from '@/lib/auth/error-boundary'
import { AuthHealthIndicator } from './AuthHealthStatus'
import { authResilience } from '@/lib/auth/resilience-integration'
import type { AuthError } from '@/types/auth-service'

interface AuthSystemBoundaryProps {
  children: React.ReactNode
  showHealthIndicator?: boolean
  fallbackComponent?: React.ComponentType<AuthSystemFallbackProps>
}

interface AuthSystemFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  authError: AuthError
  recoverySuggestions: string[]
}

/**
 * Enhanced fallback component for authentication system errors
 */
function AuthSystemFallback({ 
  resetErrorBoundary, 
  authError, 
  recoverySuggestions 
}: AuthSystemFallbackProps): React.ReactElement {
  const [isRecovering, setIsRecovering] = React.useState(false)

  const handleForceRecovery = async () => {
    setIsRecovering(true)
    try {
      await authResilience.forceRecovery()
      // Wait a moment for systems to stabilize
      setTimeout(() => {
        resetErrorBoundary()
        setIsRecovering(false)
      }, 2000)
    } catch (error) {
      console.error('Force recovery failed:', error)
      setIsRecovering(false)
    }
  }

  const handleRefreshPage = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <svg 
            className="mx-auto h-12 w-12 text-red-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication System Error
          </h2>
          
          <p className="mt-2 text-sm text-gray-600">
            {authError.message}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {/* Error Details */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              What happened?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The authentication system encountered an error that prevented normal operation.
            </p>
            
            <div className="bg-gray-50 rounded-md p-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Error Type:</div>
              <div className="text-sm text-gray-900 capitalize">{authError.type}</div>
              
              {authError.code && (
                <>
                  <div className="text-xs font-medium text-gray-700 mb-1 mt-2">Error Code:</div>
                  <div className="text-sm text-gray-900 font-mono">{authError.code}</div>
                </>
              )}
            </div>
          </div>

          {/* Recovery Suggestions */}
          {recoverySuggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                What you can try:
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                {recoverySuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {authError.recoverable && (
              <button
                type="button"
                onClick={resetErrorBoundary}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            )}
            
            <button
              type="button"
              onClick={handleForceRecovery}
              disabled={isRecovering}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRecovering ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Recovering System...
                </>
              ) : (
                'Force System Recovery'
              )}
            </button>
            
            <button
              type="button"
              onClick={handleRefreshPage}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh Page
            </button>
          </div>

          {/* Support Information */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              If this problem persists, please contact support with the error details above.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Main authentication system boundary component
 */
export function AuthSystemBoundary({
  children,
  showHealthIndicator = false,
  fallbackComponent: FallbackComponent = AuthSystemFallback
}: AuthSystemBoundaryProps): React.ReactElement {
  const handleError = React.useCallback((error: AuthError, errorInfo: React.ErrorInfo) => {
    // Log the error with additional context
    console.error('Authentication system error:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })

    // Get resilience status for additional context
    try {
      const resilienceStatus = authResilience.getResilienceStatus()
      console.error('System resilience status at time of error:', resilienceStatus)
    } catch (statusError) {
      console.error('Failed to get resilience status:', statusError)
    }
  }, [])

  return (
    <div className="relative">
      {/* Health Indicator */}
      {showHealthIndicator && (
        <div className="fixed top-4 right-4 z-50">
          <AuthHealthIndicator />
        </div>
      )}

      {/* Error Boundary */}
      <AuthErrorBoundary
        context="authentication_system"
        onError={handleError}
        fallback={FallbackComponent}
        resetKeys={[]} // Add any keys that should trigger reset
      >
        {children}
      </AuthErrorBoundary>
    </div>
  )
}

/**
 * Higher-order component for wrapping components with auth system boundary
 */
export function withAuthSystemBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthSystemBoundaryProps, 'children'> = {}
): React.ComponentType<P> {
  const WithAuthSystemBoundaryComponent: React.FC<P> = (props) => {
    return (
      <AuthSystemBoundary {...options}>
        <Component {...props} />
      </AuthSystemBoundary>
    )
  }

  WithAuthSystemBoundaryComponent.displayName = `withAuthSystemBoundary(${Component.displayName || Component.name})`

  return WithAuthSystemBoundaryComponent
}

/**
 * Hook for manually triggering system recovery
 */
export function useAuthSystemRecovery() {
  const [isRecovering, setIsRecovering] = React.useState(false)

  const forceRecovery = React.useCallback(async () => {
    setIsRecovering(true)
    try {
      await authResilience.forceRecovery()
      return true
    } catch (error) {
      console.error('System recovery failed:', error)
      return false
    } finally {
      setIsRecovering(false)
    }
  }, [])

  const getSystemStatus = React.useCallback(() => {
    try {
      return authResilience.getResilienceStatus()
    } catch (error) {
      console.error('Failed to get system status:', error)
      return null
    }
  }, [])

  return {
    forceRecovery,
    getSystemStatus,
    isRecovering
  }
}