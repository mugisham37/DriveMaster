import React from 'react'

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
  children?: React.ReactNode
  className?: string
}

export function ErrorFallback({ 
  error, 
  resetError, 
  children,
  className = ''
}: ErrorFallbackProps): React.ReactElement {
  if (error) {
    return (
      <div className={`error-fallback p-4 border border-red-300 bg-red-50 rounded ${className}`}>
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Something went wrong
        </h2>
        <p className="text-red-700 mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        {resetError && (
          <button 
            onClick={resetError}
            className="btn btn-primary"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  return <>{children}</>
}