'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireMentor?: boolean
  requireInsider?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requireMentor = false, 
  requireInsider = false,
  redirectTo = '/auth/signin' 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    if (requireMentor && !session.user.isMentor) {
      router.push('/dashboard?error=mentor-required')
      return
    }

    if (requireInsider && !session.user.isInsider) {
      router.push('/insiders?error=insider-required')
      return
    }
  }, [session, status, router, requireMentor, requireInsider, redirectTo])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  if (requireMentor && !session.user.isMentor) {
    return null
  }

  if (requireInsider && !session.user.isInsider) {
    return null
  }

  return <>{children}</>
}

interface UnauthenticatedOnlyProps {
  children: React.ReactNode
  redirectTo?: string
}

export function AuthenticatedOnly({ 
  children, 
  redirectTo = '/auth/signin' 
}: ProtectedRouteProps) {
  return <ProtectedRoute redirectTo={redirectTo}>{children}</ProtectedRoute>
}

export function UnauthenticatedOnly({ 
  children, 
  redirectTo = '/dashboard' 
}: UnauthenticatedOnlyProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user) {
      router.push(redirectTo)
      return
    }
  }, [session, status, router, redirectTo])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (session?.user) {
    return null
  }

  return <>{children}</>
}