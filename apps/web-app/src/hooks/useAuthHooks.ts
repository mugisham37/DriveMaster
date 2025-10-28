'use client'

/**
 * Authentication Hooks for Component Use
 * 
 * Implements:
 * - useAuth hook for general authentication state access
 * - useRequireAuth hook with automatic redirect handling
 * - useRequireMentor and useRequireInsider hooks
 * - useAuthActions hook for authentication operations
 * - Requirements: 4.1, 4.2, 4.3, 4.4
 */

import React, { useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth as useAuthContext } from '@/contexts/AuthContext'
import { useAuthActions as useAuthActionsHook } from '@/hooks/useAuthActions'
import type { AuthContextValue } from '@/contexts/AuthContext'
import type { UseAuthActionsReturn } from '@/hooks/useAuthActions'

// ============================================================================
// Core Authentication Hook
// ============================================================================

/**
 * Hook for general authentication state access
 * Provides access to authentication state and basic user information
 * 
 * @returns AuthContextValue - Complete authentication context
 */
export function useAuth(): AuthContextValue {
  const context = useAuthContext()
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// ============================================================================
// Authentication Requirement Hook
// ============================================================================

export interface UseRequireAuthOptions {
  /** URL to redirect to if not authenticated */
  redirectTo?: string
  /** Whether to preserve the current URL as callback */
  preserveCallback?: boolean
  /** Custom loading component while checking auth */
  loadingComponent?: React.ComponentType
}

export interface UseRequireAuthReturn extends AuthContextValue {
  /** Whether a redirect is in progress */
  isRedirecting: boolean
  /** Whether the component should render (authenticated and not redirecting) */
  shouldRender: boolean
}

/**
 * Hook with automatic redirect handling for authentication requirement
 * Redirects to sign-in page if user is not authenticated
 * 
 * @param options - Configuration options for redirect behavior
 * @returns Extended auth context with redirect state
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}): UseRequireAuthReturn {
  const {
    redirectTo = '/auth/signin',
    preserveCallback = true
  } = options

  const auth = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Determine if we should redirect
  const shouldRedirect = auth.isInitialized && !auth.isAuthenticated
  const isRedirecting = shouldRedirect
  const shouldRender = auth.isInitialized && auth.isAuthenticated && !isRedirecting

  useEffect(() => {
    // Don't redirect if still initializing
    if (!auth.isInitialized) return

    // Don't redirect if already authenticated
    if (auth.isAuthenticated) return

    // Perform redirect
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    const callbackUrl = preserveCallback ? encodeURIComponent(currentUrl) : ''
    const finalUrl = callbackUrl ? `${redirectTo}?callbackUrl=${callbackUrl}` : redirectTo
    
    router.push(finalUrl)
  }, [
    auth.isInitialized,
    auth.isAuthenticated,
    redirectTo,
    preserveCallback,
    pathname,
    searchParams,
    router
  ])

  return {
    ...auth,
    isRedirecting,
    shouldRender
  }
}

// ============================================================================
// Mentor Requirement Hook
// ============================================================================

export interface UseRequireMentorOptions extends UseRequireAuthOptions {
  /** URL to redirect to if not a mentor (after authentication) */
  mentorRedirectTo?: string
}

export interface UseRequireMentorReturn extends UseRequireAuthReturn {
  /** Whether a mentor-specific redirect is in progress */
  isMentorRedirecting: boolean
}

/**
 * Hook that requires mentor privileges with automatic redirect handling
 * First ensures authentication, then checks mentor status
 * 
 * @param options - Configuration options for redirect behavior
 * @returns Extended auth context with mentor-specific redirect state
 */
export function useRequireMentor(options: UseRequireMentorOptions = {}): UseRequireMentorReturn {
  const {
    redirectTo = '/auth/signin',
    mentorRedirectTo = '/dashboard?error=mentor-required',
    preserveCallback = true
  } = options

  // First require authentication
  const authResult = useRequireAuth({ redirectTo, preserveCallback })
  const router = useRouter()

  // Check mentor status after authentication
  const shouldMentorRedirect = authResult.isAuthenticated && !authResult.isMentor
  const isMentorRedirecting = shouldMentorRedirect
  const shouldRender = authResult.shouldRender && authResult.isMentor

  useEffect(() => {
    // Don't check mentor status if still initializing or not authenticated
    if (!authResult.isInitialized || !authResult.isAuthenticated) return

    // Don't redirect if already redirecting for auth
    if (authResult.isRedirecting) return

    // Redirect if not a mentor
    if (!authResult.isMentor) {
      router.push(mentorRedirectTo)
    }
  }, [
    authResult.isInitialized,
    authResult.isAuthenticated,
    authResult.isMentor,
    authResult.isRedirecting,
    mentorRedirectTo,
    router
  ])

  return {
    ...authResult,
    isMentorRedirecting,
    shouldRender
  }
}

// ============================================================================
// Insider Requirement Hook
// ============================================================================

export interface UseRequireInsiderOptions extends UseRequireAuthOptions {
  /** URL to redirect to if not an insider (after authentication) */
  insiderRedirectTo?: string
}

export interface UseRequireInsiderReturn extends UseRequireAuthReturn {
  /** Whether an insider-specific redirect is in progress */
  isInsiderRedirecting: boolean
}

/**
 * Hook that requires insider privileges with automatic redirect handling
 * First ensures authentication, then checks insider status
 * 
 * @param options - Configuration options for redirect behavior
 * @returns Extended auth context with insider-specific redirect state
 */
export function useRequireInsider(options: UseRequireInsiderOptions = {}): UseRequireInsiderReturn {
  const {
    redirectTo = '/auth/signin',
    insiderRedirectTo = '/insiders?error=insider-required',
    preserveCallback = true
  } = options

  // First require authentication
  const authResult = useRequireAuth({ redirectTo, preserveCallback })
  const router = useRouter()

  // Check insider status after authentication
  const shouldInsiderRedirect = authResult.isAuthenticated && !authResult.isInsider
  const isInsiderRedirecting = shouldInsiderRedirect
  const shouldRender = authResult.shouldRender && authResult.isInsider

  useEffect(() => {
    // Don't check insider status if still initializing or not authenticated
    if (!authResult.isInitialized || !authResult.isAuthenticated) return

    // Don't redirect if already redirecting for auth
    if (authResult.isRedirecting) return

    // Redirect if not an insider
    if (!authResult.isInsider) {
      router.push(insiderRedirectTo)
    }
  }, [
    authResult.isInitialized,
    authResult.isAuthenticated,
    authResult.isInsider,
    authResult.isRedirecting,
    insiderRedirectTo,
    router
  ])

  return {
    ...authResult,
    isInsiderRedirecting,
    shouldRender
  }
}

// ============================================================================
// Authentication Actions Hook
// ============================================================================

/**
 * Hook for authentication operations
 * Provides access to login, register, logout, and OAuth operations
 * 
 * @returns UseAuthActionsReturn - Authentication action methods
 */
export function useAuthActions(): UseAuthActionsReturn {
  return useAuthActionsHook()
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for checking authentication status without redirects
 * Useful for components that need to know auth state but handle redirects themselves
 */
export function useAuthStatus() {
  const auth = useAuth()

  return {
    // Basic state
    isInitialized: auth.isInitialized,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    user: auth.user,
    
    // Role checks
    isMentor: auth.isMentor,
    isInsider: auth.isInsider,
    
    // Error state
    error: auth.state.error,
    hasError: !!auth.state.error,
    
    // Computed status
    isReady: auth.isInitialized && !auth.isLoading,
    
    // Permission checks
    canAccessMentoring: auth.isAuthenticated && auth.isMentor,
    canAccessInsiderFeatures: auth.isAuthenticated && auth.isInsider,
    canAccessDashboard: auth.isAuthenticated,
    
    // Role validation helper
    hasRole: (role: 'mentor' | 'insider' | 'user') => {
      switch (role) {
        case 'mentor':
          return auth.isAuthenticated && auth.isMentor
        case 'insider':
          return auth.isAuthenticated && auth.isInsider
        case 'user':
          return auth.isAuthenticated
        default:
          return false
      }
    }
  }
}

/**
 * Hook for handling authentication redirects manually
 * Provides redirect utilities for custom authentication flows
 */
export function useAuthRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const redirectToLogin = useCallback((customRedirectTo?: string) => {
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    const redirectTo = customRedirectTo || '/auth/signin'
    const callbackUrl = encodeURIComponent(currentUrl)
    const finalUrl = `${redirectTo}?callbackUrl=${callbackUrl}`
    
    router.push(finalUrl)
  }, [router, pathname, searchParams])

  const redirectToDashboard = useCallback((error?: string) => {
    const dashboardUrl = error ? `/dashboard?error=${encodeURIComponent(error)}` : '/dashboard'
    router.push(dashboardUrl)
  }, [router])

  const redirectToInsiders = useCallback((error?: string) => {
    const insidersUrl = error ? `/insiders?error=${encodeURIComponent(error)}` : '/insiders'
    router.push(insidersUrl)
  }, [router])

  const redirectWithCallback = useCallback((redirectTo: string, preserveCallback = true) => {
    if (preserveCallback) {
      const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
      const callbackUrl = encodeURIComponent(currentUrl)
      const finalUrl = `${redirectTo}?callbackUrl=${callbackUrl}`
      router.push(finalUrl)
    } else {
      router.push(redirectTo)
    }
  }, [router, pathname, searchParams])

  return {
    redirectToLogin,
    redirectToDashboard,
    redirectToInsiders,
    redirectWithCallback
  }
}

/**
 * Hook for authentication state changes
 * Allows components to react to authentication state changes
 */
export function useAuthStateChange(
  callback: (isAuthenticated: boolean, user: AuthContextValue['user']) => void
) {
  const auth = useAuth()

  useEffect(() => {
    if (auth.isInitialized) {
      callback(auth.isAuthenticated, auth.user)
    }
  }, [auth.isInitialized, auth.isAuthenticated, auth.user, callback])
}

/**
 * Hook for conditional authentication requirements
 * Allows dynamic authentication requirements based on conditions
 */
export function useConditionalAuth(
  condition: boolean,
  options: UseRequireAuthOptions = {}
): UseRequireAuthReturn {
  const auth = useAuth()
  const authResult = useRequireAuth(options)
  
  // If condition is false, return auth state without redirect logic
  if (!condition) {
    return {
      ...auth,
      isRedirecting: false,
      shouldRender: true
    }
  }
  
  // If condition is true, return the require auth result
  return authResult
}

// ============================================================================
// Higher-Order Component Helpers
// ============================================================================

export interface WithAuthProps {
  auth: AuthContextValue
}

export interface WithAuthActionsProps {
  authActions: UseAuthActionsReturn
}

/**
 * Higher-order component that provides authentication context
 */
export function withAuth<P extends WithAuthProps>(
  Component: React.ComponentType<P>
): React.ComponentType<Omit<P, 'auth'>> {
  const WithAuthComponent: React.FC<Omit<P, 'auth'>> = (props) => {
    const auth = useAuth()
    
    return React.createElement(Component, { ...props, auth } as P)
  }
  
  WithAuthComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  
  return WithAuthComponent
}

/**
 * Higher-order component that provides authentication actions
 */
export function withAuthActions<P extends WithAuthActionsProps>(
  Component: React.ComponentType<P>
): React.ComponentType<Omit<P, 'authActions'>> {
  const WithAuthActionsComponent: React.FC<Omit<P, 'authActions'>> = (props) => {
    const authActions = useAuthActions()
    
    return React.createElement(Component, { ...props, authActions } as P)
  }
  
  WithAuthActionsComponent.displayName = `withAuthActions(${Component.displayName || Component.name})`
  
  return WithAuthActionsComponent
}

/**
 * Higher-order component that requires authentication
 */
export function withRequireAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: UseRequireAuthOptions = {}
): React.ComponentType<P> {
  const WithRequireAuthComponent: React.FC<P> = (props) => {
    const { shouldRender } = useRequireAuth(options)
    
    if (!shouldRender) {
      return null // or a loading component
    }
    
    return React.createElement(Component, props)
  }
  
  WithRequireAuthComponent.displayName = `withRequireAuth(${Component.displayName || Component.name})`
  
  return WithRequireAuthComponent
}

/**
 * Higher-order component that requires mentor privileges
 */
export function withRequireMentor<P extends object>(
  Component: React.ComponentType<P>,
  options: UseRequireMentorOptions = {}
): React.ComponentType<P> {
  const WithRequireMentorComponent: React.FC<P> = (props) => {
    const { shouldRender } = useRequireMentor(options)
    
    if (!shouldRender) {
      return null // or a loading component
    }
    
    return React.createElement(Component, props)
  }
  
  WithRequireMentorComponent.displayName = `withRequireMentor(${Component.displayName || Component.name})`
  
  return WithRequireMentorComponent
}

/**
 * Higher-order component that requires insider privileges
 */
export function withRequireInsider<P extends object>(
  Component: React.ComponentType<P>,
  options: UseRequireInsiderOptions = {}
): React.ComponentType<P> {
  const WithRequireInsiderComponent: React.FC<P> = (props) => {
    const { shouldRender } = useRequireInsider(options)
    
    if (!shouldRender) {
      return null // or a loading component
    }
    
    return React.createElement(Component, props)
  }
  
  WithRequireInsiderComponent.displayName = `withRequireInsider(${Component.displayName || Component.name})`
  
  return WithRequireInsiderComponent
}