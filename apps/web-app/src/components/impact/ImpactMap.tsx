'use client'

import React from 'react'

interface ImpactMapProps {
  initialMetrics: unknown[]
}

export function ImpactMap({ initialMetrics }: ImpactMapProps) {
  return (
    <div className="impact-map">
      <div className="impact-map-content">
        {/* Map visualization would go here */}
        <p>Metrics: {initialMetrics.length}</p>
      </div>
    </div>
  )
}
