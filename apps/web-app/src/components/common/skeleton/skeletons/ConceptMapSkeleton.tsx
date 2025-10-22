'use client'

import React from 'react'

export function ConceptMapSkeleton(): React.JSX.Element {
  return (
    <div className="w-full h-96 bg-gray-100 rounded-lg">
      <div className="animate-pulse h-full flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-32 mx-auto mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-24 mx-auto"></div>
        </div>
      </div>
    </div>
  )
}

export default ConceptMapSkeleton