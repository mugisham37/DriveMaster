'use client'

import React from 'react'

export function TracksListSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="flex items-center space-x-4 mb-4">
              <div className="rounded bg-gray-300 h-12 w-12"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-300 rounded"></div>
              <div className="h-3 bg-gray-300 rounded w-5/6"></div>
            </div>
            <div className="mt-4 h-8 bg-gray-300 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TracksListSkeleton