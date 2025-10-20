'use client'

import React from 'react'

export function ExerciseStatusChartSkeleton(): JSX.Element {
  return (
    <div className="w-full h-64 bg-gray-100 rounded-lg">
      <div className="animate-pulse h-full p-4">
        <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="flex items-end space-x-2 h-40">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="bg-gray-300 rounded-t flex-1"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ExerciseStatusChartSkeleton