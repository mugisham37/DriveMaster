import React from 'react'

interface ImpactChartProps {
  usersPerMonth: string
  milestones: string
}

export function ImpactChart({ usersPerMonth, milestones }: ImpactChartProps) {
  // Use the sophisticated Chart component with Chart.js
  const { default: ImpactChart } = require('./Chart')
  return <ImpactChart data={{ usersPerMonth, milestones }} />
}