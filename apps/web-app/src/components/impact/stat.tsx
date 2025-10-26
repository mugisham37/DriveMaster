'use client'

import React, { useEffect, useState } from 'react'

interface ImpactStatProps {
  metricType: string
  initialValue: number
}

export default function ImpactStat({ metricType, initialValue }: ImpactStatProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    // Real-time updates would be handled here
    console.log('Stat component initialized for metric type:', metricType)
    setValue(initialValue)
  }, [metricType, initialValue])

  const formatValue = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  return (
    <div className="impact-stat">
      <div className="stat-container p-6 bg-white rounded-lg shadow-sm">
        <div className="stat-value text-3xl font-bold text-blue-600">
          {formatValue(value)}
        </div>
        <div className="stat-label text-sm text-gray-600 mt-1">
          {metricType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>
      </div>
    </div>
  )
}