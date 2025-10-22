import React, { useEffect, useState, useRef } from 'react'

interface Milestone {
  date: string
  text: string
  emoji: string
}

interface ImpactChartProps {
  usersPerMonth: string
  milestones: string
}

export function ImpactChart({ usersPerMonth, milestones }: ImpactChartProps) {
  // Use the sophisticated Chart component with Chart.js
  const { default: ImpactChart } = require('./Chart')
  return <ImpactChart data={{ usersPerMonth, milestones }} />
}