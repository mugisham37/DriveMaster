/**
 * Learning Notification System
 * 
 * Comprehensive system that manages and displays all specialized learning notifications
 * including achievements, spaced repetition reminders, streak reminders, and mock test reminders.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

'use client'

import React, { useState } from 'react'
import { AchievementNotification } from './AchievementNotification'
import { SpacedRepetitionReminder } from './SpacedRepetitionReminder'
import { StreakReminder } from './StreakReminder'
import { MockTestReminder } from './MockTestReminder'
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications'
import { useSpacedRepetitionReminders } from '@/hooks/useSpacedRepetitionReminders'
import { useStreakReminders } from '@/hooks/useStreakReminders'
import { useMockTestReminders } from '@/hooks/useMockTestReminders'
import { Icon } from '@/components/common/Icon'
import { FormButton } from '@/components/common/forms/FormButton'

// ============================================================================
// Types
// ============================================================================

export interface LearningNotificationSystemProps {
  userId?: string
  enableAchievements?: boolean
  enableSpacedRepetition?: boolean
  enableStreakReminders?: boolean
  enableMockTestReminders?: boolean
  maxVisibleNotifications?: number
  autoCloseDelay?: number
  className?: string
}

type NotificationTab = 'all' | 'achievements' | 'reminders' | 'tests'

// ============================================================================
// Main Component
// ============================================================================

export function LearningNotificationSystem({
  enableAchievements = true,
  enableSpacedRepetition = true,
  enableStreakReminders = true,
  enableMockTestReminders = true,
  maxVisibleNotifications = 5,
  className = ''
}: LearningNotificationSystemProps): React.JSX.Element {
  // ============================================================================
  // State Management
  // ============================================================================

  const [activeTab, setActiveTab] = useState<NotificationTab>('all')
  const [isExpanded, setIsExpanded] = useState(false)
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set())

  // ============================================================================
  // Hooks
  // ============================================================================

  const achievements = useAchievementNotifications({
    enableAutoDisplay: false, // We'll handle display manually
    maxConcurrentDisplays: maxVisibleNotifications
  })

  const spacedRepetition = useSpacedRepetitionReminders({
    enableIntelligentScheduling: true,
    enablePerformanceTracking: true
  })

  const streakReminders = useStreakReminders({
    enableSmartReminders: true,
    enableMotivationalMessages: true
  })

  const mockTestReminders = useMockTestReminders({
    enableSmartScheduling: true,
    enablePerformanceTracking: true
  })

  // ============================================================================
  // Computed Values
  // ============================================================================

  const allNotifications = [
    ...(enableAchievements ? achievements.activeAchievements.map(achievement => ({
      id: achievement.id,
      type: 'achievement' as const,
      priority: 1,
      timestamp: achievement.timestamp || new Date(),
      component: achievement
    })) : []),
    
    ...(enableSpacedRepetition ? spacedRepetition.activeReminders.map(reminder => ({
      id: reminder.id,
      type: 'spaced_repetition' as const,
      priority: 2,
      timestamp: new Date(reminder.dueDate),
      component: reminder
    })) : []),
    
    ...(enableStreakReminders ? streakReminders.activeReminders.map(reminder => ({
      id: reminder.id,
      type: 'streak_reminder' as const,
      priority: 3,
      timestamp: new Date(reminder.reminderTime),
      component: reminder
    })) : []),
    
    ...(enableMockTestReminders ? mockTestReminders.activeReminders.map(reminder => ({
      id: reminder.id,
      type: 'mock_test_reminder' as const,
      priority: 4,
      timestamp: new Date(reminder.reminderTime),
      component: reminder
    })) : [])
  ]

  const filteredNotifications = allNotifications
    .filter(notification => !dismissedNotifications.has(notification.id))
    .filter(notification => {
      switch (activeTab) {
        case 'achievements':
          return notification.type === 'achievement'
        case 'reminders':
          return notification.type === 'spaced_repetition' || notification.type === 'streak_reminder'
        case 'tests':
          return notification.type === 'mock_test_reminder'
        default:
          return true
      }
    })
    .sort((a, b) => {
      // Sort by priority first, then by timestamp
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return b.timestamp.getTime() - a.timestamp.getTime()
    })
    .slice(0, isExpanded ? undefined : maxVisibleNotifications)

  const totalCount = allNotifications.filter(n => !dismissedNotifications.has(n.id)).length
  const hasMoreNotifications = totalCount > maxVisibleNotifications

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDismissNotification = (notificationId: string) => {
    setDismissedNotifications(prev => new Set(prev).add(notificationId))
  }

  const handleDismissAll = () => {
    const allIds = allNotifications.map(n => n.id)
    setDismissedNotifications(new Set(allIds))
  }

  const handleTabChange = (tab: NotificationTab) => {
    setActiveTab(tab)
  }

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // ============================================================================
  // Notification Handlers
  // ============================================================================

  const handleAchievementShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'copy') => {
    // Handle achievement sharing
    console.log('Sharing achievement on:', platform)
  }

  const handleSpacedRepetitionStart = (reminderId: string) => {
    // Navigate to review session or trigger review start
    console.log('Starting spaced repetition review:', reminderId)
  }

  const handleSpacedRepetitionSnooze = (reminderId: string, duration: number) => {
    spacedRepetition.snoozeReminder(reminderId, duration)
  }

  const handleStreakActivity = (streakType: 'daily' | 'weekly' | 'monthly') => {
    streakReminders.recordActivity(streakType)
  }

  const handleStreakReminderSet = (reminderId: string, time: Date) => {
    streakReminders.snoozeStreakReminder(reminderId, Math.floor((time.getTime() - Date.now()) / (1000 * 60)))
  }

  const handleMockTestStart = (reminderId: string) => {
    // Navigate to test or trigger test start
    console.log('Starting mock test:', reminderId)
  }

  const handleMockTestSchedule = (reminderId: string, time: Date) => {
    mockTestReminders.rescheduleReminder(reminderId, time)
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderTabButton = (tab: NotificationTab, label: string, icon: string) => {
    const count = allNotifications.filter(n => {
      if (!dismissedNotifications.has(n.id)) {
        switch (tab) {
          case 'achievements':
            return n.type === 'achievement'
          case 'reminders':
            return n.type === 'spaced_repetition' || n.type === 'streak_reminder'
          case 'tests':
            return n.type === 'mock_test_reminder'
          default:
            return true
        }
      }
      return false
    }).length

    return (
      <button
        onClick={() => handleTabChange(tab)}
        className={`flex items-center gap-2 px-3 py-2 rounded-8 text-sm font-medium transition-colors ${
          activeTab === tab
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        <Icon icon={icon} className="w-4 h-4" />
        <span>{label}</span>
        {count > 0 && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            activeTab === tab ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'
          }`}>
            {count}
          </span>
        )}
      </button>
    )
  }

  const renderNotification = (notification: { id: string; type: string; component: Record<string, unknown> }) => {
    const commonProps = {
      key: notification.id,
      onDismiss: () => handleDismissNotification(notification.id),
      className: 'mb-4'
    }

    switch (notification.type) {
      case 'achievement':
        return (
          <AchievementNotification
            {...commonProps}
            achievement={notification.component}
            onShare={handleAchievementShare}
            autoClose={false}
            showAnimation={true}
          />
        )

      case 'spaced_repetition':
        return (
          <SpacedRepetitionReminder
            {...commonProps}
            reminder={notification.component}
            onStartReview={() => handleSpacedRepetitionStart(notification.id)}
            onSnooze={(duration) => handleSpacedRepetitionSnooze(notification.id, duration)}
            showProgress={true}
          />
        )

      case 'streak_reminder':
        return (
          <StreakReminder
            {...commonProps}
            reminder={notification.component}
            onStartActivity={() => handleStreakActivity(notification.component.streakType)}
            onSetReminder={(time) => handleStreakReminderSet(notification.id, time)}
            showMotivation={true}
          />
        )

      case 'mock_test_reminder':
        return (
          <MockTestReminder
            {...commonProps}
            reminder={notification.component}
            onStartTest={() => handleMockTestStart(notification.id)}
            onScheduleTest={(time) => handleMockTestSchedule(notification.id, time)}
            showPreparationTips={true}
            showPerformanceStats={true}
          />
        )

      default:
        return null
    }
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  if (filteredNotifications.length === 0) {
    return (
      <div className={`learning-notification-system bg-gray-50 border border-gray-200 rounded-12 p-6 text-center ${className}`}>
        <Icon icon="bell-slash" className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">No active learning notifications</p>
        <p className="text-gray-500 text-xs mt-1">
          Complete activities to earn achievements and receive personalized reminders
        </p>
      </div>
    )
  }

  return (
    <div className={`learning-notification-system bg-white border border-gray-200 rounded-12 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">
            Learning Notifications
          </h3>
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <FormButton
                onClick={handleDismissAll}
                className="btn-ghost btn-xs"
              >
                <Icon icon="x-mark" className="w-3 h-3 mr-1" />
                Dismiss All
              </FormButton>
            )}
            {hasMoreNotifications && (
              <FormButton
                onClick={handleToggleExpanded}
                className="btn-secondary btn-xs"
              >
                <Icon icon={isExpanded ? 'chevron-up' : 'chevron-down'} className="w-3 h-3 mr-1" />
                {isExpanded ? 'Show Less' : `Show All (${totalCount})`}
              </FormButton>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {renderTabButton('all', 'All', 'bell')}
          {enableAchievements && renderTabButton('achievements', 'Achievements', 'trophy')}
          {(enableSpacedRepetition || enableStreakReminders) && 
            renderTabButton('reminders', 'Reminders', 'clock')}
          {enableMockTestReminders && renderTabButton('tests', 'Tests', 'document-text')}
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Icon icon="inbox" className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">
              No notifications in this category
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map(renderNotification)}
          </div>
        )}
      </div>
    </div>
  )
}

export default LearningNotificationSystem