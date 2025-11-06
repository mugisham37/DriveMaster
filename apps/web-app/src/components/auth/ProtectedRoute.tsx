'use client'

/**
 * ProtectedRoute Component for Authentication and Authorization
 * 
 * Implements:
 * - Basic authentication requirement with automatic redirect
 * - Role-based access control (mentor, insider)
 * - Loading states during authentication checks
 * - Error handling with proper error display
 * - Return URL preservation for post-login redirect
 * - Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import React from 'react'
import { useRequireAuth, useRequireMentor, useRequireInsider } from '@/hooks/useAuthHooks'
import type { 
  UseRequireAuthOptions, 
  UseRequireMentorOptions, 
  UseRequireInsiderOptions 
} from '@/hooks/useAuthHooks'

// ============================================================================
// Loading Component
// ============================================================================

interface LoadingSpinnerProps {
  message?: string
}

function LoadingSpinner({ message = 'Checking authentication...' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED]"></div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Error Component
// ============================================================================

interface ErrorDisplayProps {
  error: string
  onRetry?: () => void
}

function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="text-red-500">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-[#7C3AED] text-white rounded-md hover:bg-[#6D28D9] transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Base ProtectedRoute Component
// ============================================================================

export interface ProtectedRouteProps {
  children: React.ReactNode
  /** Custom loading component */
  loadingComponent?: React.ComponentType<{ message?: string }>
  /** Custom error component */
  errorComponent?: React.ComponentType<{ error: string; onRetry?: () => void }>
  /** Loading message */
  loadingMessage?: string
  /** Whether to show error details */
  showErrorDetails?: boolean
}

export interface BasicProtectedRouteProps extends ProtectedRouteProps, UseRequireAuthOptions {}

/**
 * Basic ProtectedRoute component that requires authentication
 * Redirects to sign-in page if user is not authenticated
 */
export function ProtectedRoute({
  children,
  loadingComponent: LoadingComponent = LoadingSpinner,
  errorComponent: ErrorComponent = ErrorDisplay,
  loadingMessage = 'Checking authentication...',
  showErrorDetails = true,
  ...authOptions
}: BasicProtectedRouteProps) {
  const { shouldRender, isRedirecting, state, checkAuthStatus } = useRequireAuth(authOptions)

  // Show loading during authentication check or redirect
  if (!shouldRender || isRedirecting) {
    return <LoadingComponent message={loadingMessage} />
  }

  // Show error if authentication failed
  if (state.error && showErrorDetails) {
    return (
      <ErrorComponent 
        error={state.error.message} 
        onRetry={state.error.recoverable ? checkAuthStatus : undefined}
      />
    )
  }

  // Render protected content
  return <>{children}</>
}

// ============================================================================
// Role-Based Protected Route Components
// ============================================================================

export interface MentorProtectedRouteProps extends ProtectedRouteProps, UseRequireMentorOptions {}

/**
 * ProtectedRoute component that requires mentor privileges
 * First ensures authentication, then checks mentor status
 */
export function MentorProtectedRoute({
  children,
  loadingComponent: LoadingComponent = LoadingSpinner,
  errorComponent: ErrorComponent = ErrorDisplay,
  loadingMessage = 'Checking mentor privileges...',
  showErrorDetails = true,
  ...mentorOptions
}: MentorProtectedRouteProps) {
  const { shouldRender, isRedirecting, isMentorRedirecting, state, checkAuthStatus } = useRequireMentor(mentorOptions)

  // Show loading during authentication check or redirect
  if (!shouldRender || isRedirecting || isMentorRedirecting) {
    return <LoadingComponent message={loadingMessage} />
  }

  // Show error if authentication or mentor check failed
  if (state.error && showErrorDetails) {
    const errorMessage = state.error.type === 'authorization' 
      ? 'You need mentor privileges to access this page.'
      : state.error.message

    return (
      <ErrorComponent 
        error={errorMessage} 
        onRetry={state.error.recoverable ? checkAuthStatus : undefined}
      />
    )
  }

  // Render mentor-protected content
  return <>{children}</>
}

export interface InsiderProtectedRouteProps extends ProtectedRouteProps, UseRequireInsiderOptions {}

/**
 * ProtectedRoute component that requires insider privileges
 * First ensures authentication, then checks insider status
 */
export function InsiderProtectedRoute({
  children,
  loadingComponent: LoadingComponent = LoadingSpinner,
  errorComponent: ErrorComponent = ErrorDisplay,
  loadingMessage = 'Checking insider privileges...',
  showErrorDetails = true,
  ...insiderOptions
}: InsiderProtectedRouteProps) {
  const { shouldRender, isRedirecting, isInsiderRedirecting, state, checkAuthStatus } = useRequireInsider(insiderOptions)

  // Show loading during authentication check or redirect
  if (!shouldRender || isRedirecting || isInsiderRedirecting) {
    return <LoadingComponent message={loadingMessage} />
  }

  // Show error if authentication or insider check failed
  if (state.error && showErrorDetails) {
    const errorMessage = state.error.type === 'authorization' 
      ? 'You need insider privileges to access this page.'
      : state.error.message

    return (
      <ErrorComponent 
        error={errorMessage} 
        onRetry={state.error.recoverable ? checkAuthStatus : undefined}
      />
    )
  }

  // Render insider-protected content
  return <>{children}</>
}

// ============================================================================
// Flexible ProtectedRoute with Multiple Requirements
// ============================================================================

export interface FlexibleProtectedRouteProps extends ProtectedRouteProps {
  /** Require basic authentication */
  requireAuth?: boolean
  /** Require mentor privileges */
  requireMentor?: boolean
  /** Require insider privileges */
  requireInsider?: boolean
  /** Authentication options */
  authOptions?: UseRequireAuthOptions
  /** Mentor options */
  mentorOptions?: UseRequireMentorOptions
  /** Insider options */
  insiderOptions?: UseRequireInsiderOptions
}

/**
 * Flexible ProtectedRoute component that can handle multiple requirements
 * Supports combinations of authentication, mentor, and insider requirements
 */
export function FlexibleProtectedRoute({
  children,
  requireAuth = true,
  requireMentor = false,
  requireInsider = false,
  authOptions = {},
  mentorOptions = {},
  insiderOptions = {},
  loadingComponent: LoadingComponent = LoadingSpinner,
  errorComponent: ErrorComponent = ErrorDisplay,
  loadingMessage,
  showErrorDetails = true
}: FlexibleProtectedRouteProps) {
  // Determine which hook to use based on requirements
  if (requireMentor) {
    return (
      <MentorProtectedRoute
        {...mentorOptions}
        loadingComponent={LoadingComponent}
        errorComponent={ErrorComponent}
        loadingMessage={loadingMessage || 'Checking mentor privileges...'}
        showErrorDetails={showErrorDetails}
      >
        {children}
      </MentorProtectedRoute>
    )
  }

  if (requireInsider) {
    return (
      <InsiderProtectedRoute
        {...insiderOptions}
        loadingComponent={LoadingComponent}
        errorComponent={ErrorComponent}
        loadingMessage={loadingMessage || 'Checking insider privileges...'}
        showErrorDetails={showErrorDetails}
      >
        {children}
      </InsiderProtectedRoute>
    )
  }

  if (requireAuth) {
    return (
      <ProtectedRoute
        {...authOptions}
        loadingComponent={LoadingComponent}
        errorComponent={ErrorComponent}
        loadingMessage={loadingMessage || 'Checking authentication...'}
        showErrorDetails={showErrorDetails}
      >
        {children}
      </ProtectedRoute>
    )
  }

  // No protection required, render children directly
  return <>{children}</>
}

// ============================================================================
// Convenience Exports
// ============================================================================

// Export default as the basic ProtectedRoute
export default ProtectedRoute

// Export all variants for specific use cases
export {
  ProtectedRoute as BasicProtectedRoute,
  MentorProtectedRoute,
  InsiderProtectedRoute,
  FlexibleProtectedRoute
}

// Export utility components
export {
  LoadingSpinner,
  ErrorDisplay
}