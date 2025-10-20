'use client'

import React from 'react'

interface ReputationDropdownSkeletonProps {
  reputation?: string
}

export function ReputationDropdownSkeleton({ reputation }: ReputationDropdownSkeletonProps): JSX.Element {
  return (
    <div className="animate-pulse flex items-center space-x-2">
      <div className="h-6 w-16 bg-gray-300 rounded"></div>
      {reputation && (
        <span className="text-sm text-gray-500">{reputation}</span>
      )}
    </div>
  )
}

export default ReputationDropdownSkeleton