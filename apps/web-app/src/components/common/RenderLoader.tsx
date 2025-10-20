'use client'

import React from 'react'

/**
 * Simple loading component for Suspense fallbacks
 * Provides consistent loading UI across the application
 */
export function RenderLoader(): JSX.Element {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">Loading...</span>
    </div>
  )
}

export default RenderLoader