'use client'

import React from 'react'

interface TooltipBaseProps {
  width?: number
  children: React.ReactNode
  className?: string
}

/**
 * Base tooltip container component
 * Provides consistent styling for all tooltip content
 */
export function TooltipBase({ 
  width = 300, 
  children, 
  className = '' 
}: TooltipBaseProps): React.JSX.Element {
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg shadow-lg p-4 ${className}`}
      style={{ width: `${width}px` }}
    >
      {children}
    </div>
  )
}

export default TooltipBase