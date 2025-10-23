import React from 'react'
import Stat from './stat'

interface ImpactStatProps {
  metricType: string
  initialValue: number
}

export function ImpactStat({ metricType, initialValue }: ImpactStatProps) {
  // Use the sophisticated Stat component with real-time WebSocket updates
  return <Stat metricType={metricType} initialValue={initialValue} />
}