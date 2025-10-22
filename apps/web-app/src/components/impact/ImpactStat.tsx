import React, { useEffect, useState } from 'react'

interface ImpactStatProps {
  metricType: string
  initialValue: number
}

export function ImpactStat({ metricType, initialValue }: ImpactStatProps) {
  // Use the sophisticated Stat component with real-time WebSocket updates
  const { default: ImpactStat } = require('./stat')
  return <ImpactStat metricType={metricType} initialValue={initialValue} />
}