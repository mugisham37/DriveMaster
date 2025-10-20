'use client'

import React from 'react'
import { TooltipBase } from './TooltipBase'

interface ExerciseTooltipProps {
  endpoint: string
}

/**
 * Exercise-specific tooltip component
 * Displays exercise information in a tooltip format
 */
export function ExerciseTooltip({ endpoint }: ExerciseTooltipProps): React.JSX.Element {
  // For now, we'll show a placeholder. In a real implementation,
  // this would fetch data from the endpoint and display exercise details
  return (
    <TooltipBase width={250}>
      <div className="exercise-tooltip">
        <div className="text-sm text-gray-600">
          Loading exercise information...
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Endpoint: {endpoint}
        </div>
      </div>
    </TooltipBase>
  )
}

export default ExerciseTooltip