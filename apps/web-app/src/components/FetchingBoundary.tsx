import React from 'react'

interface FetchingBoundaryProps {
  children: React.ReactNode
  isLoading?: boolean
  error?: Error | null
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
  status?: 'error' | 'success' | 'pending' | 'idle'
  defaultError?: Error
}

export function FetchingBoundary({
  children,
  isLoading = false,
  error = null,
  fallback = <div>Loading...</div>,
  errorFallback = <div>Something went wrong</div>,
  status,
  // defaultError is available in props but not used in current implementation
}: FetchingBoundaryProps): React.JSX.Element {
  if (error || status === 'error') {
    return <>{errorFallback}</>
  }

  if (isLoading || status === 'pending') {
    return <>{fallback}</>
  }

  return <>{children}</>
}