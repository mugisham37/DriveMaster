import React, { useEffect, useState } from 'react'

interface ImpactStatProps {
  metricType: string
  initialValue: number
}

export function ImpactStat({ metricType, initialValue }: ImpactStatProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    // In a real implementation, this would connect to a WebSocket
    // For now, we'll just use the initial value
    setValue(initialValue)
  }, [initialValue])

  return (
    <span className="impact-stat" data-metric-type={metricType}>
      {value.toLocaleString()}
    </span>
  )
}