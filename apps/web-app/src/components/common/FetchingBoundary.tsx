import React from 'react'
import { Loading } from './Loading'

interface FetchingBoundaryProps {
  status: 'loading' | 'error' | 'success'
  error?: Error | null
  defaultError?: Error
  children: React.ReactNode
}

export const FetchingBoundary: React.FC<FetchingBoundaryProps> = ({
  status,
  error,
  defaultError,
  children
}) => {
  if (status === 'loading') {
    return <Loading />
  }

  if (status === 'error') {
    const errorMessage = error?.message || defaultError?.message || 'An error occurred'
    return (
      <div className="error-boundary">
        <p className="error-message">{errorMessage}</p>
      </div>
    )
  }

  return <>{children}</>
}