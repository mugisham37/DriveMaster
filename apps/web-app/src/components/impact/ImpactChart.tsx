import React from 'react'
import Chart from './Chart'

interface ImpactChartProps {
  usersPerMonth: string
  milestones: string
}

export function ImpactChart({ usersPerMonth, milestones }: ImpactChartProps) {
  // Use the sophisticated Chart component with Chart.js
  return <Chart data={{ usersPerMonth, milestones }} />
}