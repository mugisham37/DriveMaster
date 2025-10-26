'use client'

import React, { useEffect, useRef } from 'react'
import { Metric } from '@/components/types'

interface ImpactMapProps {
  initialMetrics: Metric[]
  trackTitle?: string
}

export default function ImpactMap({ initialMetrics, trackTitle }: ImpactMapProps): React.JSX.Element {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Map initialization logic would go here
    console.log('Initializing map with metrics:', initialMetrics.length)
    if (trackTitle) {
      console.log('Track title:', trackTitle)
    }
  }, [initialMetrics, trackTitle])

  return (
    <div ref={mapRef} className="impact-map">
      <div className="map-container">
        <div className="world-map">
          {/* Simplified map placeholder */}
          <svg viewBox="0 0 800 400" className="w-full h-auto">
            <rect width="800" height="400" fill="#f0f0f0" />
            <text x="400" y="200" textAnchor="middle" className="text-lg">
              World Impact Map
            </text>
            <text x="400" y="220" textAnchor="middle" className="text-sm">
              {initialMetrics.length} metrics loaded
            </text>
          </svg>
        </div>
        
        {/* Metric points overlay */}
        <div className="metric-points">
          {initialMetrics.map((metric, index) => (
            <div
              key={metric.id || index}
              className="metric-point"
              style={{
                position: 'absolute',
                left: `${Math.random() * 80 + 10}%`,
                top: `${Math.random() * 60 + 20}%`,
              }}
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}