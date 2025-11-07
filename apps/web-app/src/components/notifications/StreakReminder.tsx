'use client'

import React from 'react'

export interface StreakReminderProps {
  currentStreak?: number
  onContinue?: () => void
}

export function StreakReminder({ currentStreak = 0, onContinue }: StreakReminderProps) {
  return (
    <div className="streak-reminder">
      <p>Current Streak: {currentStreak} days</p>
      <button onClick={onContinue}>Continue Streak</button>
    </div>
  )
}

export default StreakReminder
