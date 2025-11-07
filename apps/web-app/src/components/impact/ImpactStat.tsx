'use client'

import React from 'react'

interface ImpactStatProps {
  metricType: string
  initialValue: number
}

export function ImpactStat({ metricType, initialValue }: ImpactStatProps) {
  return (
    <div className="impact-stat" data-metric-type={metricType}>
      <span className="impact-stat-value">{initialValue}</span>
    </div>
  )
}
