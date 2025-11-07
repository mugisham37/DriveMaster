/**
 * Authentication Error Display Components
 * Provides consistent error messaging and recovery options
 */

'use client'

import React from 'react'
import { AuthErrorHandler } from '../../lib/auth/error-handler'
import type { AuthError, OAuthProviderType } from '../../types/auth-service'

interface AuthErrorDisplayProps {
  error: AuthError | Error | null
  context?: string
  showRecovery?: boolean
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

interface ErrorIconProps {
  type: AuthError['type']
  className?: string
}

/**
 * Error type specific icons
 */
function ErrorIcon({ type, className = "h-5 w-5" }: ErrorIconProps): React.ReactElement {
  const iconClasses = `${className} flex-shrink-0`
  
  switch (type) {
    case 'network':
      return (
        <svg className={`${iconClasses} text-orange-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    case 'validation':
      return (
        <svg className={`${iconClasses} text-yellow-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'authentication':
      return (
        <svg className={`${iconClasses} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    case 'authorization':
      return (
        <svg className={`${iconClasses} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )
    case 'oauth':
      return (
        <svg className={`${iconClasses} text-blue-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    case 'server':
      return (
        <svg className={`${iconClasses} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      )
    default:
      return (
        <svg className={`${iconClasses} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}

/**
 * Get error styling based on error type
 */
function getErrorStyling(type: AuthError['type']) {
  switch (type) {
    case 'network':
      return {
        container: 'border-orange-200 bg-orange-50',
        title: 'text-orange-800',
        message: 'text-orange-700',
        button: 'bg-orange-100 text-orange-800 hover:bg-orange-200 focus:ring-orange-500'
      }
    case 'validation':
      return {
        container: 'border-yellow-200 bg-yellow-50',
        title: 'text-yellow-800',
        message: 'text-yellow-700',
        button: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500'
      }
    case 'authentication':
    case 'authorization':
      return {
        container: 'border-red-200 bg-red-50',
        title: 'text-red-800',
        message: 'text-red-700',
        button: 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500'
      }
    case 'oauth':
      return {
        container: 'border-blue-200 bg-blue-50',
        title: 'text-blue-800',
        message: 'text-blue-700',
        button: 'bg-blue-100 text-blue-800 hover:bg-blue-200 focus:ring-blue-500'
      }
    case 'server':
      return {
        container: 'border-gray-200 bg-gray-50',
        title: 'text-gray-800',
        message: 'text-gray-700',
        button: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-500'
      }
    default:
      return {
        container: 'border-red-200 bg-red-50',
        title: 'text-red-800',
        message: 'text-red-700',
        button: 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500'
      }
  }
}

/**
 * Main authentication error display component
 */
export function AuthErrorDisplay({
  error,
  context,
  showRecovery = true,
  onRetry,
  onDismiss,
  className = ''
}: AuthErrorDisplayProps): React.ReactElement | null {
  if (!error) return null

  // Process error through our handler
  const authError = error instanceof Error && !('type' in error)
    ? AuthErrorHandler.processError(error, context)
    : error as AuthError

  const recoverySuggestions = AuthErrorHandler.getRecoverySuggestions(authError)
  const styling = getErrorStyling(authError.type)

  return (
    <div className={`rounded-lg border p-4 ${styling.container} ${className}`}>
      <div className="flex items-start space-x-3">
        <ErrorIcon type={authError.type} />
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium ${styling.title}`}>
            {getErrorTitle(authError.type)}
          </h3>
          
          <div className={`mt-2 text-sm ${styling.message}`}>
            <p>{authError.message}</p>
          </div>

          {showRecovery && recoverySuggestions.length > 0 && (
            <div className="mt-3">
              <h4 className={`text-sm font-medium ${styling.title}`}>
                What you can try:
              </h4>
              <ul className={`mt-1 text-sm ${styling.message} list-disc list-inside space-y-1`}>
                {recoverySuggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {authError.recoverable && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={`px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 ${styling.button}`}
              >
                {authError.retryAfter ? `Try Again (${authError.retryAfter}s)` : 'Try Again'}
              </button>
            )}
            
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="bg-gray-100 text-gray-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={`flex-shrink-0 ${styling.title} hover:opacity-75`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Compact error display for inline use
 */
export function InlineAuthError({
  error,
  context,
  className = ''
}: Pick<AuthErrorDisplayProps, 'error' | 'context' | 'className'>): React.ReactElement | null {
  if (!error) return null

  const authError = error instanceof Error && !('type' in error)
    ? AuthErrorHandler.processError(error, context)
    : error as AuthError

  return (
    <div className={`flex items-center space-x-2 text-sm text-red-600 ${className}`}>
      <ErrorIcon type={authError.type} className="h-4 w-4" />
      <span>{authError.message}</span>
    </div>
  )
}

/**
 * OAuth-specific error display
 */
export function OAuthErrorDisplay({
  error,
  provider,
  onRetry,
  onSwitchMethod
}: {
  error: AuthError | Error | null
  provider?: OAuthProviderType
  onRetry?: () => void
  onSwitchMethod?: () => void
}): React.ReactElement | null {
  if (!error) return null

  const authError = error instanceof Error && !('type' in error)
    ? AuthErrorHandler.processError(error, 'oauth')
    : error as AuthError

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start space-x-3">
        <ErrorIcon type="oauth" />
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            {provider ? `${provider} Login Failed` : 'Social Login Failed'}
          </h3>
          
          <div className="mt-2 text-sm text-blue-700">
            <p>{authError.message}</p>
          </div>

          <div className="mt-4 flex space-x-3">
            {authError.recoverable && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            )}
            
            {onSwitchMethod && (
              <button
                type="button"
                onClick={onSwitchMethod}
                className="bg-gray-100 text-gray-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Use Email Instead
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Get user-friendly error title based on type
 */
function getErrorTitle(type: AuthError['type']): string {
  switch (type) {
    case 'network':
      return 'Connection Problem'
    case 'validation':
      return 'Input Error'
    case 'authentication':
      return 'Authentication Failed'
    case 'authorization':
      return 'Access Denied'
    case 'oauth':
      return 'Social Login Error'
    case 'server':
      return 'Server Error'
    default:
      return 'Error'
  }
}

/**
 * Hook for managing error display state
 */
export function useAuthErrorDisplay() {
  const [error, setError] = React.useState<AuthError | null>(null)
  const [isVisible, setIsVisible] = React.useState(false)

  const showError = React.useCallback((error: AuthError | Error | unknown, context?: string) => {
    const authError = error instanceof Error && !('type' in error)
      ? AuthErrorHandler.processError(error, context)
      : error as AuthError

    setError(authError)
    setIsVisible(true)
  }, [])

  const hideError = React.useCallback(() => {
    setIsVisible(false)
    // Clear error after animation
    setTimeout(() => setError(null), 300)
  }, [])

  const retry = React.useCallback(() => {
    if (error?.recoverable) {
      hideError()
      return true
    }
    return false
  }, [error, hideError])

  return {
    error,
    isVisible,
    showError,
    hideError,
    retry
  }
}