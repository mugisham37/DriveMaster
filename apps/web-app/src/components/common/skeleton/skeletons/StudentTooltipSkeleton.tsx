'use client'

import React from 'react'

export function StudentTooltipSkeleton(): JSX.Element {
  return (
    <div className="p-4 w-full max-w-sm">
      <div className="animate-pulse">
        <div className="flex items-center space-x-3 mb-3">
          <div className="rounded-full bg-gray-300 h-8 w-8"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-2/3 mb-1"></div>
            <div className="h-3 bg-gray-300 rounded w-1/3"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded w-full"></div>
          <div className="h-3 bg-gray-300 rounded w-4/5"></div>
        </div>
      </div>
    </div>
  )
}

export default StudentTooltipSkeleton