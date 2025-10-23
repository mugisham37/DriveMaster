import React from 'react'

interface LoadingSpinnerProps {
  className?: string
  size?: 'small' | 'medium' | 'large'
}

export function LoadingSpinner({ 
  className = '', 
  size = 'medium' 
}: LoadingSpinnerProps): React.JSX.Element {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  return (
    <div className={`loading-spinner ${className}`}>
      <div 
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}