/**
 * Streak Reminder Component
 * 
 * Displays streak reminders with motivational messaging, progress visualization,
 * and streak recovery suggestions for maintaining learning engagement.
 * 
 * Requirements: 3.3
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Icon } from '@/components/common/Icon'
import { FormButton } from '@/components/common/forms/FormButton'
import type { StreakReminderRequest } from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface StreakReminderProps {
  reminder: StreakReminderRequest & {
    id?: string
    timestamp?: Date
    streakGoal?: number
    isStreakBroken?: boolean
    daysSinceLastActivity?: number
  }
  onStartActivity?: () => void
  onSetReminder?: (time: Date) => void
  onDismiss?: () => void
  onViewProgress?: () => void
  showMotivation?: boolean
  className?: string
}

interface StreakTypeConfig {
  icon: string
  color: string
  bgColor: string
  label: string
  description: string
  encouragement: string
}

// ============================================================================
// Configuration
// ============================================================================

const STREAK_TYPE_CONFIG: Record<'daily' | 'weekly' | 'monthly', StreakTypeConfig> = {
  daily: {
    icon: 'fire',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    label: 'Daily Streak',
    description: 'Keep your daily learning momentum going',
    encouragement: 'Every day counts! Small consistent steps lead to big achievements.'
  },
  weekly: {
    icon: 'calendar-days',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Weekly Streak',
    description: 'Maintain your weekly learning routine',
    encouragement: 'Consistency over intensity! You\'re building lasting habits.'
  },
  monthly: {
    icon: 'chart-bar',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    label: 'Monthly Streak',
    description: 'Stay committed to your monthly goals',
    encouragement: 'Long-term dedication pays off! You\'re in it for the journey.'
  }
}

const MOTIVATIONAL_MESSAGES = {
  daily: [
    "You're on fire! 🔥 Keep the momentum going!",
    "Another day, another step forward! 💪",
    "Consistency is your superpower! ⚡",
    "You're building something amazing! 🌟",
    "Small steps, big dreams! 🚀"
  ],
  weekly: [
    "Week after week, you're getting stronger! 💪",
    "Your dedication is inspiring! 🌟",
    "Building habits that last! 🏗️",
    "Steady progress is the best progress! 📈",
    "You're in the zone! Keep it up! 🎯"
  ],
  monthly: [
    "Month by month, you're transforming! 🦋",
    "Your persistence is remarkable! 🏆",
    "Playing the long game like a champion! 👑",
    "Consistency over months shows true commitment! 💎",
    "You're building a legacy of learning! 📚"
  ]
}

const STREAK_RECOVERY_SUGGESTIONS = [
  "Start with just 5 minutes today",
  "Review something you learned recently",
  "Try a quick practice session",
  "Set a smaller, achievable goal",
  "Focus on one topic you enjoy"
]

// ============================================================================
// Main Component
// ============================================================================

export function StreakReminder({
  reminder,
  onStartActivity,
  onSetReminder,
  onDismiss,
  onViewProgress,
  showMotivation = true,
  className = ''
}: StreakReminderProps): React.JSX.Element {
  // ============================================================================
  // State Management
  // ============================================================================

  const [currentMotivation, setCurrentMotivation] = useState('')
  const [showReminderPicker, setShowReminderPicker] = useState(false)
  const [timeUntilDeadline, setTimeUntilDeadline] = useState('')
  const [streakStatus, setStreakStatus] = useState<'active' | 'at-risk' | 'broken'>('active')

  const streakConfig = STREAK_TYPE_CONFIG[reminder.streakType]

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    // Set random motivational message
    const messages = MOTIVATIONAL_MESSAGES[reminder.streakType]
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]
    setCurrentMotivation(reminder.motivationalMessage || randomMessage)
  }, [reminder.streakType, reminder.motivationalMessage])

  useEffect(() => {
    // Calculate time until deadline and streak status
    const updateStatus = () => {
      const now = new Date()
      const reminderTime = new Date(reminder.reminderTime)
      const timeDiff = reminderTime.getTime() - now.getTime()

      // Determine streak status
      if (reminder.isStreakBroken) {
        setStreakStatus('broken')
      } else if (timeDiff < 2 * 60 * 60 * 1000) { // Less than 2 hours
        setStreakStatus('at-risk')
      } else {
        setStreakStatus('active')
      }

      // Calculate time until deadline
      if (timeDiff > 0) {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        
        if (hours > 0) {
          setTimeUntilDeadline(`${hours}h ${minutes}m remaining`)
        } else {
          setTimeUntilDeadline(`${minutes}m remaining`)
        }
      } else {
        setTimeUntilDeadline('Time expired')
      }
    }

    updateStatus()
    const interval = setInterval(updateStatus, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [reminder.reminderTime, reminder.isStreakBroken])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleStartActivity = () => {
    onStartActivity?.()
  }

  const handleSetReminder = (hours: number) => {
    const newReminderTime = new Date(Date.now() + hours * 60 * 60 * 1000)
    onSetReminder?.(newReminderTime)
    setShowReminderPicker(false)
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  const handleViewProgress = () => {
    onViewProgress?.()
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const getStreakStatusColor = () => {
    switch (streakStatus) {
      case 'broken':
        return 'text-red-600'
      case 'at-risk':
        return 'text-yellow-600'
      default:
        return streakConfig.color
    }
  }

  const getStreakStatusIcon = () => {
    switch (streakStatus) {
      case 'broken':
        return 'x-circle'
      case 'at-risk':
        return 'exclamation-triangle'
      default:
        return streakConfig.icon
    }
  }

  const renderProgressVisualization = () => {
    const progressPercentage = reminder.streakGoal 
      ? Math.min((reminder.streakCount / reminder.streakGoal) * 100, 100)
      : 0

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Streak Progress
          </span>
          {reminder.streakGoal && (
            <span className="text-sm text-gray-600">
              {reminder.streakCount} / {reminder.streakGoal}
            </span>
          )}
        </div>
        
        {reminder.streakGoal && (
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                streakStatus === 'broken' ? 'bg-red-500' :
                streakStatus === 'at-risk' ? 'bg-yellow-500' : 'bg-orange-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Started</span>
          {reminder.streakGoal && (
            <span>{Math.round(progressPercentage)}% complete</span>
          )}
          <span>Goal</span>
        </div>
      </div>
    )
  }

  const renderReminderPicker = () => (
    <div className="absolute top-full right-0 mt-2 bg-white rounded-8 shadow-lg border border-borderColor6 py-2 min-w-[160px] z-10">
      <button
        onClick={() => handleSetReminder(1)}
        className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
      >
        In 1 hour
      </button>
      <button
        onClick={() => handleSetReminder(3)}
        className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
      >
        In 3 hours
      </button>
      <button
        onClick={() => handleSetReminder(6)}
        className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
      >
        In 6 hours
      </button>
      <button
        onClick={() => handleSetReminder(24)}
        className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
      >
        Tomorrow
      </button>
    </div>
  )

  const renderStreakRecovery = () => {
    if (!reminder.isStreakBroken) return null

    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-8">
        <div className="flex items-start gap-2 mb-2">
          <Icon icon="heart" className="w-4 h-4 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 mb-1">
              Don't worry, streaks can be rebuilt! 💪
            </p>
            <p className="text-sm text-red-700 mb-2">
              {reminder.daysSinceLastActivity 
                ? `It's been ${reminder.daysSinceLastActivity} days since your last activity.`
                : 'Your streak was broken, but you can start fresh today!'
              }
            </p>
          </div>
        </div>
        
        <div className="ml-6">
          <p className="text-xs font-medium text-red-800 mb-1">Quick recovery tips:</p>
          <ul className="text-xs text-red-700 space-y-1">
            {STREAK_RECOVERY_SUGGESTIONS.slice(0, 3).map((suggestion, index) => (
              <li key={index} className="flex items-center gap-1">
                <Icon icon="chevron-right" className="w-3 h-3" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  const renderMotivationalMessage = () => {
    if (!showMotivation || !currentMotivation) return null

    return (
      <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-8">
        <div className="flex items-start gap-2">
          <Icon icon="sparkles" className="w-4 h-4 text-purple-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-800 mb-1">
              Motivation Boost
            </p>
            <p className="text-sm text-purple-700">
              {currentMotivation}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={`streak-reminder ${streakConfig.bgColor} border rounded-12 p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${streakConfig.bgColor} rounded-full flex items-center justify-center border-2 ${streakConfig.color.replace('text-', 'border-')}`}>
            <Icon icon={getStreakStatusIcon()} className={`w-5 h-5 ${getStreakStatusColor()}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">
              {reminder.isStreakBroken ? '💔 Streak Recovery' : '🔥 Streak Reminder'}
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${streakConfig.bgColor} ${streakConfig.color}`}>
                {streakConfig.label}
              </span>
              <span className={`text-sm ${getStreakStatusColor()}`}>
                {timeUntilDeadline}
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Icon icon="x-mark" className="w-5 h-5" />
        </button>
      </div>

      {/* Streak Information */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-800">
            {reminder.isStreakBroken 
              ? `Previous streak: ${reminder.streakCount} ${reminder.streakType === 'daily' ? 'days' : reminder.streakType === 'weekly' ? 'weeks' : 'months'}`
              : `Current streak: ${reminder.streakCount} ${reminder.streakType === 'daily' ? 'days' : reminder.streakType === 'weekly' ? 'weeks' : 'months'}`
            }
          </h4>
          <button
            onClick={handleViewProgress}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">
          {streakConfig.description}
        </p>
      </div>

      {/* Progress Visualization */}
      {reminder.streakGoal && renderProgressVisualization()}

      {/* Streak Recovery Section */}
      {renderStreakRecovery()}

      {/* Motivational Message */}
      {renderMotivationalMessage()}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FormButton
            onClick={handleStartActivity}
            className={`btn-primary btn-s ${
              reminder.isStreakBroken ? 'bg-green-600 hover:bg-green-700' : ''
            }`}
          >
            <Icon icon={reminder.isStreakBroken ? 'arrow-path' : 'play'} className="w-4 h-4 mr-1" />
            {reminder.isStreakBroken ? 'Start Fresh' : 'Continue Streak'}
          </FormButton>
          
          {onViewProgress && (
            <FormButton
              onClick={handleViewProgress}
              className="btn-ghost btn-s"
            >
              <Icon icon="chart-bar" className="w-4 h-4 mr-1" />
              Progress
            </FormButton>
          )}
        </div>

        <div className="relative">
          <FormButton
            onClick={() => setShowReminderPicker(!showReminderPicker)}
            className="btn-secondary btn-s"
          >
            <Icon icon="bell" className="w-4 h-4 mr-1" />
            Remind Later
          </FormButton>
          
          {showReminderPicker && renderReminderPicker()}
        </div>
      </div>

      {/* Click outside to close reminder picker */}
      {showReminderPicker && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowReminderPicker(false)}
        />
      )}
    </div>
  )
}

export default StreakReminder