'use client'

/**
 * Main authentication hooks export
 * 
 * This file exports the primary authentication hooks for component use.
 * It provides a clean interface for the new auth-service integration.
 */

// Export the new authentication hooks
export {
  useAuth,
  useRequireAuth,
  useRequireMentor,
  useRequireInsider,
  useAuthActions,
  useAuthStatus,
  useAuthRedirect,
  useAuthStateChange,
  useConditionalAuth,
  withAuth,
  withAuthActions,
  withRequireAuth,
  withRequireMentor,
  withRequireInsider
} from './useAuthHooks'

// Export types for external use
export type {
  UseRequireAuthOptions,
  UseRequireAuthReturn,
  UseRequireMentorOptions,
  UseRequireMentorReturn,
  UseRequireInsiderOptions,
  UseRequireInsiderReturn,
  WithAuthProps,
  WithAuthActionsProps
} from './useAuthHooks'

// Legacy compatibility - now just re-exports the new auth system
import { useRouter } from 'next/navigation'
import { useAuth as useNewAuth } from './useAuthHooks'
import type { UserProfile } from '@/types/auth-service'

export type ExercismUser = UserProfile

export interface UseAuthReturn {
  user: ExercismUser | null
  isLoading: boolean
  isAuthenticated: boolean
  isMentor: boolean
  isInsider: boolean
  signIn: (provider?: string, options?: Record<string, unknown>) => Promise<{ ok: boolean; error: string | null }>
  signOut: () => Promise<void>
  redirectToSignIn: (callbackUrl?: string) => void
}

/**
 * @deprecated Use the new useAuth hook from useAuthHooks instead
 * Legacy authentication hook for backward compatibility
 */
export function useLegacyAuth(): UseAuthReturn {
  const router = useRouter()
  const newAuth = useNewAuth()
  
  const redirectToSignIn = (callbackUrl?: string) => {
    const url = callbackUrl || window.location.pathname
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(url)}`)
  }
  
  return {
    user: newAuth.user,
    isLoading: newAuth.isLoading,
    isAuthenticated: newAuth.isAuthenticated,
    isMentor: newAuth.isMentor,
    isInsider: newAuth.isInsider,
    signIn: async (_provider?: string, options?: Record<string, unknown>) => {
      // Redirect to sign in page for compatibility
      const callbackUrl = typeof options?.callbackUrl === 'string' ? options.callbackUrl : undefined
      redirectToSignIn(callbackUrl)
      return { ok: true, error: null }
    },
    signOut: newAuth.logout,
    redirectToSignIn
  }
}