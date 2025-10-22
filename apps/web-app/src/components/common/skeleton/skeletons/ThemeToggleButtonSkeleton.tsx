'use client'

import React from 'react'

export function ThemeToggleButtonSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-8 bg-gray-300 rounded"></div>
    </div>
  )
}

export default ThemeToggleButtonSkeleton