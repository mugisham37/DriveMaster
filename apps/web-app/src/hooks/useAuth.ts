'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
 * Client-side authentication hook
 * Use this in Client Components to access user session
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession()
  const router = useRouter()
  
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