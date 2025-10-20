'use client'

import React from 'react'

/**
 * Skeleton loading component for User Tooltip
 */
export function UserTooltipSkeleton(): JSX.Element {
  return (
    <div className="p-4 w-full max-w-sm">
      <div className="animate-pulse">
        <div className="flex items-center space-x-3 mb-3">
          <div className="rounded-full bg-gray-300 h-10 w-10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded"></div>
          <div className="h-3 bg-gray-300 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  )
}

export default UserTooltipSkeleton