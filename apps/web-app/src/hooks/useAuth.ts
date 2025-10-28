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

// Legacy compatibility exports (deprecated - use new hooks above)
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAuth as useNewAuth } from './useAuthHooks'
import type { ExercismUser } from '@/lib/auth'

export interface UseAuthReturn {
  user: ExercismUser | null
  isLoading: boolean
  isAuthenticated: boolean
  isMentor: boolean
  isInsider: boolean
  signIn: typeof signIn
  signOut: typeof signOut
  redirectToSignIn: (callbackUrl?: string) => void
}

/**
 * @deprecated Use the new useAuth hook from useAuthHooks instead
 * Legacy authentication hook for backward compatibility
 */
export function useLegacyAuth(): UseAuthReturn {
  const router = useRouter()
  
  // Always call useSession to avoid conditional hook calls
  const { data: session, status } = useSession()
  
  // Always call useNewAuth to avoid conditional hook calls
  const newAuth = useNewAuth()
  const hasNewAuth = newAuth.isInitialized
  
  // Use new auth context if available and initialized
  if (hasNewAuth && newAuth && newAuth.isInitialized) {
    const user: ExercismUser | null = newAuth.user ? {
      id: newAuth.user.id,
      handle: newAuth.user.handle,
      ...(newAuth.user.name && { name: newAuth.user.name }),
      email: newAuth.user.email,
      avatarUrl: newAuth.user.avatarUrl,
      reputation: newAuth.user.reputation,
      flair: newAuth.user.flair,
      isMentor: newAuth.user.isMentor,
      isInsider: newAuth.user.isInsider,
      preferences: newAuth.user.preferences,
      tracks: newAuth.user.tracks
    } : null
    
    const redirectToSignIn = (callbackUrl?: string) => {
      const url = callbackUrl || window.location.pathname
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(url)}`)
    }
    
    return {
      user,
      isLoading: newAuth.isLoading,
      isAuthenticated: newAuth.isAuthenticated,
      isMentor: newAuth.isMentor,
      isInsider: newAuth.isInsider,
      signIn,
      signOut: async () => {
        await newAuth.logout()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return undefined as any
      },
      redirectToSignIn
    }
  }
  
  // Fallback to NextAuth.js
  const isLoading = status === 'loading'
  const isAuthenticated = !!session?.user
  
  const user: ExercismUser | null = session?.user ? {
    id: session.user.id,
    handle: session.user.handle,
    ...(session.user.name && { name: session.user.name }),
    email: session.user.email,
    avatarUrl: session.user.avatarUrl,
    reputation: session.user.reputation,
    flair: session.user.flair,
    isMentor: session.user.isMentor,
    isInsider: session.user.isInsider,
    preferences: {
      theme: 'system',
      emailNotifications: true,
      mentorNotifications: true
    },
    tracks: []
  } : null
  
  const redirectToSignIn = (callbackUrl?: string) => {
    const url = callbackUrl || window.location.pathname
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(url)}`)
  }
  
  return {
    user,
    isLoading,
    isAuthenticated,
    isMentor: user?.isMentor ?? false,
    isInsider: user?.isInsider ?? false,
    signIn,
    signOut,
    redirectToSignIn
  }
}