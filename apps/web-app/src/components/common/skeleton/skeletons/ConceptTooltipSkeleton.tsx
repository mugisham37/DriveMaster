'use client'

import React from 'react'

export function ConceptTooltipSkeleton(): JSX.Element {
  return (
    <div className="p-4 w-full max-w-md">
      <div className="animate-pulse">
        <div className="h-5 bg-gray-300 rounded w-2/3 mb-3"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded"></div>
          <div className="h-3 bg-gray-300 rounded w-5/6"></div>
          <div className="h-3 bg-gray-300 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  )
}

export default ConceptTooltipSkeleton