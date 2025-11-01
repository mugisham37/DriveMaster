/**
 * Mock Test Reminder Component
 * 
 * Displays mock test reminders with preparation tips, performance analysis,
 * and test scheduling integration for comprehensive test preparation.
 * 
 * Requirements: 3.4
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Icon } from '@/components/common/Icon'
import { FormButton } from '@/components/common/forms/FormButton'
import type { MockTestReminderRequest } from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface MockTestReminderProps {
  reminder: MockTestReminderRequest & {
    id?: string
    timestamp?: Date
    lastTestScore?: number
    averageScore?: number
    testsCompleted?: number
    improvementTrend?: number
  }
  onStartTest?: () => void
  onScheduleTest?: (time: Date) => void
  onViewAnalytics?: () => void
  onDismiss?: () => void
  showPreparationTips?: boolean
  showPerformanceStats?: boolean
  className?: string
}

interface DifficultyConfig {
  color: string
  bgColor: string
  icon: string
  label: string
  description: string
  recommendedPrepTime: string
}

interface TestTypeConfig {
  icon: string
  color: string
  bgColor: string
  label: string
  description: string
}

// ============================================================================
// Configuration
// ============================================================================

const DIFFICULTY_CONFIG: Record<'beginner' | 'intermediate' | 'advanced', DifficultyConfig> = {
  beginner: {
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    icon: 'academic-cap',
    label: 'Beginner Level',
    description: 'Foundation concepts and basic understanding',
    recommendedPrepTime: '30-45 minutes'
  },
  intermediate: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: 'chart-bar',
    label: 'Intermediate Level',
    description: 'Applied knowledge and problem-solving skills',
    recommendedPrepTime: '45-60 minutes'
  },
  advanced: {
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    icon: 'fire',
    label: 'Advanced Level',
    description: 'Complex scenarios and expert-level concepts',
    recommendedPrepTime: '60-90 minutes'
  }
}

const TEST_TYPE_CONFIG: Record<string, TestTypeConfig> = {
  'practice': {
    icon: 'pencil',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Practice Test',
    description: 'Skill building and concept reinforcement'
  },
  'mock': {
    icon: 'document-text',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    label: 'Mock Exam',
    description: 'Full exam simulation with time constraints'
  },
  'assessment': {
    icon: 'clipboard-document-check',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50 border-indigo-200',
    label: 'Assessment',
    description: 'Evaluate your current knowledge level'
  },
  'certification': {
    icon: 'trophy',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    label: 'Certification Test',
    description: 'Official certification examination'
  }
}

const SCHEDULE_OPTIONS = [
  { label: 'In 30 minutes', value: 0.5 },
  { label: 'In 1 hour', value: 1 },
  { label: 'In 2 hours', value: 2 },
  { label: 'In 4 hours', value: 4 },
  { label: 'Tomorrow morning', value: 16 },
  { label: 'Tomorrow evening', value: 24 }
]

// ============================================================================
// Main Component
// ============================================================================

export function MockTestReminder({
  reminder,
  onStartTest,
  onScheduleTest,
  onViewAnalytics,
  onDismiss,
  showPreparationTips = true,
  showPerformanceStats = true,
  className = ''
}: MockTestReminderProps): React.JSX.Element {
  // ============================================================================
  // State Management
  // ============================================================================

  const [showScheduleMenu, setShowScheduleMenu] = useState(false)
  const [timeUntilTest, setTimeUntilTest] = useState<string>('')
  const [isOverdue, setIsOverdue] = useState(false)
  const [expandedTips, setExpandedTips] = useState(false)

  const difficultyConfig = DIFFICULTY_CONFIG[reminder.difficultyLevel || 'intermediate']
  const testTypeConfig = TEST_TYPE_CONFIG[reminder.testType.toLowerCase()] || TEST_TYPE_CONFIG['practice']!

  // ============================================================================
  // Time Calculations
  // ============================================================================

  useEffect(() => {
    const updateTimeUntilTest = () => {
      const now = new Date()
      const testTime = new Date(reminder.reminderTime)
      const timeDiff = testTime.getTime() - now.getTime()
      
      setIsOverdue(timeDiff < 0)
      
      if (timeDiff < 0) {
        const overdueDiff = Math.abs(timeDiff)
        const hours = Math.floor(overdueDiff / (1000 * 60 * 60))
        const minutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60))
        
        if (hours > 24) {
          const days = Math.floor(hours / 24)
          setTimeUntilTest(`${days} day${days > 1 ? 's' : ''} overdue`)
        } else if (hours > 0) {
          setTimeUntilTest(`${hours}h ${minutes}m overdue`)
        } else {
          setTimeUntilTest(`${minutes}m overdue`)
        }
      } else {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        
        if (hours > 24) {
          const days = Math.floor(hours / 24)
          setTimeUntilTest(`in ${days} day${days > 1 ? 's' : ''}`)
        } else if (hours > 0) {
          setTimeUntilTest(`in ${hours}h ${minutes}m`)
        } else if (minutes > 0) {
          setTimeUntilTest(`in ${minutes}m`)
        } else {
          setTimeUntilTest('now')
        }
      }
    }

    updateTimeUntilTest()
    const interval = setInterval(updateTimeUntilTest, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [reminder.reminderTime])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleStartTest = () => {
    onStartTest?.()
  }

  const handleScheduleTest = (hours: number) => {
    const newTestTime = new Date(Date.now() + hours * 60 * 60 * 1000)
    onScheduleTest?.(newTestTime)
    setShowScheduleMenu(false)
  }

  const handleViewAnalytics = () => {
    onViewAnalytics?.()
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  // ============================================================================
  // Performance Analysis
  // ============================================================================

  const getPerformanceStatus = () => {
    const passRate = reminder.passRate
    
    if (passRate >= 80) {
      return {
        status: 'Excellent',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: 'check-circle',
        message: 'You\'re performing exceptionally well!'
      }
    } else if (passRate >= 70) {
      return {
        status: 'Good',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        icon: 'thumb-up',
        message: 'Solid performance, keep it up!'
      }
    } else if (passRate >= 60) {
      return {
        status: 'Improving',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        icon: 'arrow-trending-up',
        message: 'You\'re making progress!'
      }
    } else {
      return {
        status: 'Needs Focus',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: 'exclamation-triangle',
        message: 'Extra preparation recommended'
      }
    }
  }

  const performanceStatus = getPerformanceStatus()

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderScheduleMenu = () => (
    <div className="absolute top-full right-0 mt-2 bg-white rounded-8 shadow-lg border border-borderColor6 py-2 min-w-[180px] z-10">
      {SCHEDULE_OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => handleScheduleTest(option.value)}
          className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
        >
          {option.label}
        </button>
      ))}
    </div>
  )

  const renderPerformanceStats = () => {
    if (!showPerformanceStats) return null

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-semibold text-gray-800">Performance Overview</h5>
          {onViewAnalytics && (
            <button
              onClick={handleViewAnalytics}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Details
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className={`p-3 rounded-8 ${performanceStatus.bgColor}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon icon={performanceStatus.icon} className={`w-4 h-4 ${performanceStatus.color}`} />
              <span className={`text-sm font-medium ${performanceStatus.color}`}>
                {performanceStatus.status}
              </span>
            </div>
            <p className="text-xs text-gray-600">{performanceStatus.message}</p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-8">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon="chart-bar" className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">
                {reminder.passRate}% Pass Rate
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {reminder.testsCompleted || 0} tests completed
            </p>
          </div>
        </div>
        
        {reminder.improvementTrend !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <Icon 
              icon={reminder.improvementTrend >= 0 ? 'arrow-trending-up' : 'arrow-trending-down'} 
              className={`w-4 h-4 ${reminder.improvementTrend >= 0 ? 'text-green-600' : 'text-red-600'}`} 
            />
            <span className={reminder.improvementTrend >= 0 ? 'text-green-600' : 'text-red-600'}>
              {reminder.improvementTrend >= 0 ? '+' : ''}{reminder.improvementTrend}% trend
            </span>
            <span className="text-gray-600">vs last 5 tests</span>
          </div>
        )}
      </div>
    )
  }

  const renderPreparationTips = () => {
    if (!showPreparationTips || !reminder.preparationTips?.length) return null

    const visibleTips = expandedTips ? reminder.preparationTips : reminder.preparationTips.slice(0, 3)

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-8">
        <div className="flex items-start gap-2 mb-2">
          <Icon icon="light-bulb" className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Preparation Tips
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              {visibleTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Icon icon="chevron-right" className="w-3 h-3 mt-0.5 text-blue-600" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            
            {reminder.preparationTips.length > 3 && (
              <button
                onClick={() => setExpandedTips(!expandedTips)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
              >
                {expandedTips ? 'Show less' : `Show ${reminder.preparationTips.length - 3} more tips`}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderTestInfo = () => (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${testTypeConfig.bgColor} rounded-full flex items-center justify-center border-2 ${testTypeConfig.color.replace('text-', 'border-')}`}>
          <Icon icon={testTypeConfig.icon} className={`w-5 h-5 ${testTypeConfig.color}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 mb-1">
            {reminder.testName}
          </h4>
          <p className="text-sm text-gray-600">
            {testTypeConfig.description}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Icon icon="clock" className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600">
            {reminder.estimatedDuration ? `${reminder.estimatedDuration} min` : 'Duration varies'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Icon icon={difficultyConfig.icon} className={`w-4 h-4 ${difficultyConfig.color}`} />
          <span className={difficultyConfig.color}>
            {difficultyConfig.label}
          </span>
        </div>
      </div>
    </div>
  )

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={`mock-test-reminder ${testTypeConfig.bgColor} border rounded-12 p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${testTypeConfig.bgColor} rounded-full flex items-center justify-center border-2 ${testTypeConfig.color.replace('text-', 'border-')}`}>
            <Icon icon="document-text" className={`w-5 h-5 ${testTypeConfig.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">
              📝 Test Reminder
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${testTypeConfig.bgColor} ${testTypeConfig.color}`}>
                {testTypeConfig.label}
              </span>
              <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                {timeUntilTest}
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

      {/* Test Information */}
      {renderTestInfo()}

      {/* Performance Stats */}
      {renderPerformanceStats()}

      {/* Preparation Tips */}
      {renderPreparationTips()}

      {/* Recommended Preparation Time */}
      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-8">
        <div className="flex items-start gap-2">
          <Icon icon="clock" className="w-4 h-4 text-purple-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-800 mb-1">
              Recommended Preparation
            </p>
            <p className="text-sm text-purple-700">
              {difficultyConfig.recommendedPrepTime} of focused study before taking this {reminder.testType.toLowerCase()}.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FormButton
            onClick={handleStartTest}
            className={`btn-primary btn-s ${isOverdue ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            <Icon icon="play" className="w-4 h-4 mr-1" />
            {isOverdue ? 'Start Now' : 'Begin Test'}
          </FormButton>
          
          {onViewAnalytics && (
            <FormButton
              onClick={handleViewAnalytics}
              className="btn-ghost btn-s"
            >
              <Icon icon="chart-bar" className="w-4 h-4 mr-1" />
              Analytics
            </FormButton>
          )}
        </div>

        <div className="relative">
          <FormButton
            onClick={() => setShowScheduleMenu(!showScheduleMenu)}
            className="btn-secondary btn-s"
          >
            <Icon icon="calendar" className="w-4 h-4 mr-1" />
            Reschedule
          </FormButton>
          
          {showScheduleMenu && renderScheduleMenu()}
        </div>
      </div>

      {/* Click outside to close schedule menu */}
      {showScheduleMenu && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowScheduleMenu(false)}
        />
      )}
    </div>
  )
}

export default MockTestReminder