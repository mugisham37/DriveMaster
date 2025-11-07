'use client'

import React from 'react'

interface ImpactChartProps {
  usersPerMonth: string
  milestones: string
}

export function ImpactChart({ usersPerMonth, milestones }: ImpactChartProps) {
  const usersData = usersPerMonth ? JSON.parse(usersPerMonth) : {}
  const milestonesData = milestones ? JSON.parse(milestones) : []
  
  return (
    <div className="impact-chart">
      <div className="impact-chart-content">
        {/* Chart visualization would go here */}
        <p>Users: {Object.keys(usersData).length} months</p>
        <p>Milestones: {milestonesData.length}</p>
      </div>
    </div>
  )
}
