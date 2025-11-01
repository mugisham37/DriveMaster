/**
 * Spaced Repetition Reminder Component
 * 
 * Displays intelligent spaced repetition reminders with topic-specific information,
 * difficulty-based scheduling, and learning optimization features.
 * 
 * Requirements: 3.2
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Icon } from '@/components/common/Icon'
import { FormButton } from '@/components/common/forms/FormButton'
import type { SpacedRepetitionRequest } from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface SpacedRepetitionReminderProps {
  reminder: SpacedRepetitionRequest & {
    id?: string
    timestamp?: Date
    nextReviewDate?: Date
  }
  onStartReview?: () => void
  onSnooze?: (duration: number) => void // duration in minutes
  onDismiss?: () => void
  onCustomizeSchedule?: () => void
  showProgress?: boolean
  className?: string
}

interface DifficultyConfig {
  color: string
  bgColor: string
  icon: string
  label: string
  description: string
  suggestedInterval: string
}

// ============================================================================
// Configuration
// ============================================================================

const DIFFICULTY_CONFIG: Record<'easy' | 'medium' | 'hard', DifficultyConfig> = {
  easy: {
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    icon: 'check-circle',
    label: 'Easy Review',
    description: 'Quick refresher for well-understood concepts',
    suggestedInterval: '7 days'
  },
  medium: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: 'clock',
    label: 'Standard Review',
    description: 'Regular practice for developing understanding',
    suggestedInterval: '3 days'
  },
  hard: {
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    icon: 'exclamation-triangle',
    label: 'Intensive Review',
    description: 'Focused study for challenging material',
    suggestedInterval: '1 day'
  }
}

const SNOOZE_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '1 hour', value: 60 },
  { label: '4 hours', value: 240 },
  { label: 'Tomorrow', value: 1440 }
]

// ============================================================================
// Main Component
// ============================================================================

export function SpacedRepetitionReminder({
  reminder,
  onStartReview,
  onSnooze,
  onDismiss,
  onCustomizeSchedule,
  showProgress = true,
  className = ''
}: SpacedRepetitionReminderProps): React.JSX.Element {
  // ============================================================================
  // State Management
  // ============================================================================

  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false)
  const [timeUntilDue, setTimeUntilDue] = useState<string>('')
  const [isOverdue, setIsOverdue] = useState(false)

  const difficultyConfig = DIFFICULTY_CONFIG[reminder.difficulty]

  // ============================================================================
  // Time Calculations
  // ============================================================================

  useEffect(() => {
    const updateTimeUntilDue = () => {
      const now = new Date()
      const dueDate = new Date(reminder.dueDate)
      const timeDiff = dueDate.getTime() - now.getTime()
      
      setIsOverdue(timeDiff < 0)
      
      if (timeDiff < 0) {
        const overdueDiff = Math.abs(timeDiff)
        const hours = Math.floor(overdueDiff / (1000 * 60 * 60))
        const minutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60))
        
        if (hours > 24) {
          const days = Math.floor(hours / 24)
          setTimeUntilDue(`${days} day${days > 1 ? 's' : ''} overdue`)
        } else if (hours > 0) {
          setTimeUntilDue(`${hours}h ${minutes}m overdue`)
        } else {
          setTimeUntilDue(`${minutes}m overdue`)
        }
      } else {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        
        if (hours > 24) {
          const days = Math.floor(hours / 24)
          setTimeUntilDue(`in ${days} day${days > 1 ? 's' : ''}`)
        } else if (hours > 0) {
          setTimeUntilDue(`in ${hours}h ${minutes}m`)
        } else if (minutes > 0) {
          setTimeUntilDue(`in ${minutes}m`)
        } else {
          setTimeUntilDue('now')
        }
      }
    }

    updateTimeUntilDue()
    const interval = setInterval(updateTimeUntilDue, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [reminder.dueDate])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleStartReview = () => {
    onStartReview?.()
  }

  const handleSnooze = (duration: number) => {
    onSnooze?.(duration)
    setShowSnoozeMenu(false)
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  const handleCustomizeSchedule = () => {
    onCustomizeSchedule?.()
  }

  // ============================================================================
  // Progress Calculation
  // ============================================================================

  const getProgressInfo = () => {
    if (!reminder.lastReviewDate) {
      return {
        progress: 0,
        status: 'Not started',
        description: 'Begin your first review session'
      }
    }

    const lastReview = new Date(reminder.lastReviewDate)
    const dueDate = new Date(reminder.dueDate)
    const now = new Date()

    // Calculate retention curve progress
    const totalInterval = dueDate.getTime() - lastReview.getTime()
    const elapsed = now.getTime() - lastReview.getTime()
    const progress = Math.min((elapsed / totalInterval) * 100, 100)

    let status = 'On track'
    let description = 'Good timing for optimal retention'

    if (isOverdue) {
      status = 'Overdue'
      description = 'Review now to maintain learning progress'
    } else if (progress > 80) {
      status = 'Due soon'
      description = 'Perfect time to reinforce your memory'
    } else if (progress < 50) {
      status = 'Early'
      description = 'Still fresh in memory, but review if you have time'
    }

    return { progress, status, description }
  }

  const progressInfo = showProgress ? getProgressInfo() : null

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderSnoozeMenu = () => (
    <div className="absolute top-full right-0 mt-2 bg-white rounded-8 shadow-lg border border-borderColor6 py-2 min-w-[140px] z-10">
      {SNOOZE_OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => handleSnooze(option.value)}
          className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
        >
          {option.label}
        </button>
      ))}
    </div>
  )

  const renderProgressBar = () => {
    if (!progressInfo) return null

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Retention Progress
          </span>
          <span className={`text-sm font-medium ${
            isOverdue ? 'text-red-600' : 
            progressInfo.progress > 80 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {progressInfo.status}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isOverdue ? 'bg-red-500' :
              progressInfo.progress > 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(progressInfo.progress, 100)}%` }}
          />
        </div>
        
        <p className="text-xs text-gray-600">
          {progressInfo.description}
        </p>
      </div>
    )
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={`spaced-repetition-reminder ${difficultyConfig.bgColor} border rounded-12 p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${difficultyConfig.bgColor} rounded-full flex items-center justify-center border-2 ${difficultyConfig.color.replace('text-', 'border-')}`}>
            <Icon icon={difficultyConfig.icon} className={`w-5 h-5 ${difficultyConfig.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">
              📚 Spaced Repetition Review
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyConfig.bgColor} ${difficultyConfig.color}`}>
                {difficultyConfig.label}
              </span>
              <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                {timeUntilDue}
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

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Topic Information */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-800 mb-2">
          {reminder.topicName}
        </h4>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Icon icon="document-text" className="w-4 h-4" />
            <span>{reminder.itemCount} item{reminder.itemCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <Icon icon="chart-bar" className="w-4 h-4" />
            <span>Difficulty: {reminder.difficulty}</span>
          </div>
          {reminder.lastReviewDate && (
            <div className="flex items-center gap-1">
              <Icon icon="clock" className="w-4 h-4" />
              <span>Last: {new Date(reminder.lastReviewDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Learning Tips */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-8">
        <div className="flex items-start gap-2">
          <Icon icon="light-bulb" className="w-4 h-4 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 mb-1">
              Optimal Learning Tip
            </p>
            <p className="text-sm text-blue-700">
              {difficultyConfig.description}. Next review suggested {difficultyConfig.suggestedInterval} after completion.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FormButton
            onClick={handleStartReview}
            className={`btn-primary btn-s ${isOverdue ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            <Icon icon="play" className="w-4 h-4 mr-1" />
            {isOverdue ? 'Review Now' : 'Start Review'}
          </FormButton>
          
          <FormButton
            onClick={handleCustomizeSchedule}
            className="btn-ghost btn-s"
          >
            <Icon icon="cog" className="w-4 h-4 mr-1" />
            Customize
          </FormButton>
        </div>

        <div className="relative">
          <FormButton
            onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
            className="btn-secondary btn-s"
          >
            <Icon icon="clock" className="w-4 h-4 mr-1" />
            Snooze
          </FormButton>
          
          {showSnoozeMenu && renderSnoozeMenu()}
        </div>
      </div>

      {/* Click outside to close snooze menu */}
      {showSnoozeMenu && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowSnoozeMenu(false)}
        />
      )}
    </div>
  )
}

export default SpacedRepetitionReminder