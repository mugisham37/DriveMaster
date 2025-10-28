'use client'

/**
 * Legacy authentication hook for backward compatibility
 * 
 * This hook provides backward compatibility with the existing NextAuth.js setup
 * while gradually migrating to the new auth-service integration.
 * 
 * For new code, use the AuthContext directly via useAuth from @/contexts/AuthContext
 */

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAuth as useNewAuth } from '@/contexts/AuthContext'
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
 * Client-side authentication hook with backward compatibility
 * 
 * This hook tries to use the new auth context first, then falls back to NextAuth.js
 * Use this in existing Client Components during the migration period
 */
export function useAuth(): UseAuthReturn {
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

/**
 * Hook to require authentication on client side
 * Redirects to sign in page if not authenticated
 */
export function useRequireAuth(redirectTo?: string): UseAuthReturn {
  const auth = useAuth()
  const router = useRouter()
  
  if (!auth.isLoading && !auth.isAuthenticated) {
    const callbackUrl = redirectTo || window.location.pathname
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }
  
  return auth
}

/**
 * Hook to require mentor privileges
 * Redirects to dashboard if not a mentor
 */
export function useRequireMentor(): UseAuthReturn {
  const auth = useAuth()
  const router = useRouter()
  
  if (!auth.isLoading && auth.isAuthenticated && !auth.isMentor) {
    router.push('/dashboard')
  }
  
  return auth
}

/**
 * Hook to require insider privileges
 * Redirects to appropriate page if not an insider
 */
export function useRequireInsider(): UseAuthReturn {
  const auth = useAuth()
  const router = useRouter()
  
  if (!auth.isLoading && auth.isAuthenticated && !auth.isInsider) {
    router.push('/dashboard')
  }
  
  return auth
}