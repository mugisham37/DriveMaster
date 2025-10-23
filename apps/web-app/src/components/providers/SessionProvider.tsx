'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

interface SessionProviderProps {
  children: ReactNode
  session?: Record<string, unknown> | null
}

/**
 * Session provider component that wraps the app to provide authentication context
 * This preserves the exact session behavior from the Rails implementation
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider 
      session={session}
      // Preserve exact session refetch behavior
      refetchInterval={5 * 60} // 5 minutes (matching Rails session check interval)
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      {children}
    </NextAuthSessionProvider>
  )
}