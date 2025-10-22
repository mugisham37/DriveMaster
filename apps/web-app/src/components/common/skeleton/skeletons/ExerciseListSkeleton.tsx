'use client'

import React from 'react'

export function ExerciseListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4">
          <div className="animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="rounded bg-gray-300 h-10 w-10"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-3/4"></div>
              </div>
              <div className="h-8 bg-gray-300 rounded w-20"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ExerciseListSkeleton