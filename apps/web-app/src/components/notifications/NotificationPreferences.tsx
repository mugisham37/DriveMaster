/**
 * Notification Preferences Component
 * 
 * Comprehensive UI for managing user notification preferences including
 * notification types, channels, quiet hours, and frequency controls.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

'use client'

import React, { useState, useCallback } from 'react'
import { 
  useNotificationPreferences, 
  usePreferenceValidation 
} from '@/hooks/useNotificationPreferences'
import { FormButton } from '@/components/common/forms/FormButton'
import { Loading } from '@/components/common/Loading'
import { Icon } from '@/components/common/Icon'
import type {
  NotificationType,
  DeliveryChannel,
  QuietHours,
  FrequencySettings,
  GlobalNotificationSettings
} from '@/types/notification-service'

// ============================================================================
// Types and Constants
// ============================================================================

interface NotificationTypeConfig {
  type: NotificationType
  label: string
  description: string
  icon: string
  defaultChannels: DeliveryChannel[]
  allowedChannels: DeliveryChannel[]
  critical?: boolean
}

const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  {
    type: 'achievement',
    label: 'Achievements',
    description: 'When you earn badges, complete milestones, or unlock new features',
    icon: 'trophy',
    defaultChannels: ['push', 'in_app'],
    allowedChannels: ['push', 'in_app', 'email']
  },
  {
    type: 'spaced_repetition',
    label: 'Learning Reminders',
    description: 'Personalized reminders to review concepts and practice exercises',
    icon: 'brain',
    defaultChannels: ['push', 'in_app'],
    allowedChannels: ['push', 'in_app', 'email']
  },
  {
    type: 'streak_reminder',
    label: 'Streak Reminders',
    description: 'Daily reminders to maintain your learning streak',
    icon: 'fire',
    defaultChannels: ['push', 'in_app'],
    allowedChannels: ['push', 'in_app']
  },
  {
    type: 'mock_test_reminder',
    label: 'Test Reminders',
    description: 'Reminders for scheduled mock tests and practice sessions',
    icon: 'clipboard-check',
    defaultChannels: ['push', 'in_app', 'email'],
    allowedChannels: ['push', 'in_app', 'email']
  },
  {
    type: 'mentoring',
    label: 'Mentoring',
    description: 'Updates about mentoring sessions, feedback, and discussions',
    icon: 'user-group',
    defaultChannels: ['push', 'in_app', 'email'],
    allowedChannels: ['push', 'in_app', 'email']
  },
  {
    type: 'course_update',
    label: 'Course Updates',
    description: 'New lessons, course announcements, and progress updates',
    icon: 'academic-cap',
    defaultChannels: ['in_app', 'email'],
    allowedChannels: ['push', 'in_app', 'email']
  },
  {
    type: 'community',
    label: 'Community',
    description: 'Community discussions, events, and social interactions',
    icon: 'chat-bubble-left-right',
    defaultChannels: ['in_app'],
    allowedChannels: ['push', 'in_app', 'email']
  },
  {
    type: 'system',
    label: 'System Notifications',
    description: 'Important system updates, maintenance, and security alerts',
    icon: 'cog-6-tooth',
    defaultChannels: ['push', 'in_app', 'email'],
    allowedChannels: ['push', 'in_app', 'email'],
    critical: true
  },
  {
    type: 'marketing',
    label: 'Marketing & Updates',
    description: 'Product updates, feature announcements, and promotional content',
    icon: 'megaphone',
    defaultChannels: ['email'],
    allowedChannels: ['in_app', 'email']
  }
]

const CHANNEL_LABELS: Record<DeliveryChannel, string> = {
  push: 'Push Notifications',
  in_app: 'In-App Notifications',
  email: 'Email',
  sms: 'SMS'
}

// Removed unused CHANNEL_DESCRIPTIONS

const FREQUENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediately', description: 'Receive notifications as they happen' },
  { value: 'batched', label: 'Batched', description: 'Group notifications together' },
  { value: 'daily', label: 'Daily Digest', description: 'Once per day summary' },
  { value: 'weekly', label: 'Weekly Digest', description: 'Once per week summary' },
  { value: 'disabled', label: 'Disabled', description: 'No notifications for this type' }
] as const

// ============================================================================
// Main Component
// ============================================================================

export function NotificationPreferences(): React.JSX.Element {
  const {
    preferences,
    isLoading,
    isError,
    error,
    updateEnabledTypes,
    updateQuietHours,
    updateFrequency,
    updateChannels,
    updateGlobalSettings,
    resetToDefaults
  } = useNotificationPreferences()

  const { validateQuietHours, validateFrequencySettings, validateGlobalSettings } = usePreferenceValidation()

  const [activeTab, setActiveTab] = useState<'types' | 'channels' | 'schedule' | 'advanced'>('types')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleTypeToggle = useCallback(async (type: NotificationType, enabled: boolean) => {
    if (!preferences) return

    const newEnabledTypes = enabled
      ? [...preferences.enabledTypes, type]
      : preferences.enabledTypes.filter(t => t !== type)

    try {
      await updateEnabledTypes(newEnabledTypes)
    } catch (error) {
      console.error('Failed to update enabled types:', error)
    }
  }, [preferences, updateEnabledTypes])

  const handleChannelToggle = useCallback(async (type: NotificationType, channel: DeliveryChannel, enabled: boolean) => {
    if (!preferences) return

    const currentChannels = preferences.channels[type] || []
    const newChannels = enabled
      ? [...currentChannels, channel]
      : currentChannels.filter(c => c !== channel)

    try {
      await updateChannels(type, newChannels)
    } catch (error) {
      console.error('Failed to update channels:', error)
    }
  }, [preferences, updateChannels])

  const handleFrequencyChange = useCallback(async (type: NotificationType, frequency: FrequencySettings) => {
    const validation = validateFrequencySettings(frequency)
    if (!validation.isValid) {
      setValidationErrors(prev => ({ ...prev, [type]: validation.errors }))
      return
    }

    setValidationErrors(prev => ({ ...prev, [type]: [] }))

    try {
      await updateFrequency(type, frequency)
    } catch (error) {
      console.error('Failed to update frequency:', error)
    }
  }, [updateFrequency, validateFrequencySettings])

  const handleQuietHoursChange = useCallback(async (quietHours: QuietHours) => {
    const validation = validateQuietHours(quietHours)
    if (!validation.isValid) {
      setValidationErrors(prev => ({ ...prev, quietHours: validation.errors }))
      return
    }

    setValidationErrors(prev => ({ ...prev, quietHours: [] }))

    try {
      await updateQuietHours(quietHours)
    } catch (error) {
      console.error('Failed to update quiet hours:', error)
    }
  }, [updateQuietHours, validateQuietHours])

  const handleGlobalSettingsChange = useCallback(async (settings: GlobalNotificationSettings) => {
    const validation = validateGlobalSettings(settings)
    if (!validation.isValid) {
      setValidationErrors(prev => ({ ...prev, global: validation.errors }))
      return
    }

    setValidationErrors(prev => ({ ...prev, global: [] }))

    try {
      await updateGlobalSettings(settings)
    } catch (error) {
      console.error('Failed to update global settings:', error)
    }
  }, [updateGlobalSettings, validateGlobalSettings])

  const handleResetToDefaults = useCallback(async () => {
    if (!confirm('Are you sure you want to reset all notification preferences to their default values?')) {
      return
    }

    setIsSubmitting(true)
    try {
      await resetToDefaults()
    } catch (error) {
      console.error('Failed to reset preferences:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [resetToDefaults])

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderValidationErrors = (key: string) => {
    const errors = validationErrors[key]
    if (!errors || errors.length === 0) return null

    return (
      <div className="validation-errors mt-2">
        {errors.map((error, index) => (
          <div key={index} className="text-red-600 text-sm flex items-center gap-1">
            <Icon icon="exclamation-triangle" className="w-4 h-4" />
            {error}
          </div>
        ))}
      </div>
    )
  }

  const renderNotificationTypes = () => (
    <div className="notification-types space-y-6">
      <div className="section-header">
        <h3 className="text-h4 mb-2">Notification Types</h3>
        <p className="text-textColor6">
          Choose which types of notifications you want to receive. Critical system notifications cannot be disabled.
        </p>
      </div>

      {NOTIFICATION_TYPES.map((typeConfig) => {
        const isEnabled = preferences?.enabledTypes.includes(typeConfig.type) || false
        const channels = preferences?.channels[typeConfig.type] || []
        const frequency = preferences?.frequency[typeConfig.type] || { type: 'immediate' }

        return (
          <div key={typeConfig.type} className="notification-type-card border border-borderColor6 rounded-8 p-4">
            <div className="type-header flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <Icon icon={typeConfig.icon} className="w-6 h-6 text-textColor6 mt-1" />
                <div>
                  <h4 className="font-semibold text-textColor2 mb-1">{typeConfig.label}</h4>
                  <p className="text-sm text-textColor6">{typeConfig.description}</p>
                  {typeConfig.critical && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-orange-600">
                      <Icon icon="shield-exclamation" className="w-3 h-3" />
                      Critical - Cannot be disabled
                    </span>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  disabled={typeConfig.critical}
                  onChange={(e) => handleTypeToggle(typeConfig.type, e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-sm">Enabled</span>
              </label>
            </div>

            {isEnabled && (
              <div className="type-settings space-y-4 ml-9">
                {/* Delivery Channels */}
                <div>
                  <h5 className="text-sm font-medium text-textColor2 mb-2">Delivery Channels</h5>
                  <div className="channels-grid grid grid-cols-2 gap-2">
                    {typeConfig.allowedChannels.map((channel) => (
                      <label key={channel} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={channels.includes(channel)}
                          onChange={(e) => handleChannelToggle(typeConfig.type, channel, e.target.checked)}
                          className="form-checkbox"
                        />
                        {CHANNEL_LABELS[channel]}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Frequency Settings */}
                <div>
                  <h5 className="text-sm font-medium text-textColor2 mb-2">Frequency</h5>
                  <select
                    value={frequency.type}
                    onChange={(e) => handleFrequencyChange(typeConfig.type, { 
                      type: e.target.value as FrequencySettings['type']
                    })}
                    className="form-select text-sm"
                  >
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  
                  {/* Additional frequency settings based on type */}
                  {frequency.type === 'batched' && (
                    <div className="mt-2">
                      <label className="block text-xs text-textColor6 mb-1">Batch Interval (minutes)</label>
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        value={frequency.batchInterval || 60}
                        onChange={(e) => handleFrequencyChange(typeConfig.type, {
                          ...frequency,
                          batchInterval: parseInt(e.target.value)
                        })}
                        className="form-input text-sm w-20"
                      />
                    </div>
                  )}
                  
                  {frequency.type === 'daily' && (
                    <div className="mt-2">
                      <label className="block text-xs text-textColor6 mb-1">Daily Time</label>
                      <input
                        type="time"
                        value={frequency.dailyTime || '09:00'}
                        onChange={(e) => handleFrequencyChange(typeConfig.type, {
                          ...frequency,
                          dailyTime: e.target.value
                        })}
                        className="form-input text-sm"
                      />
                    </div>
                  )}
                  
                  {frequency.type === 'weekly' && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="block text-xs text-textColor6 mb-1">Day of Week</label>
                        <select
                          value={frequency.weeklyDay || 1}
                          onChange={(e) => handleFrequencyChange(typeConfig.type, {
                            ...frequency,
                            weeklyDay: parseInt(e.target.value)
                          })}
                          className="form-select text-sm"
                        >
                          <option value={0}>Sunday</option>
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-textColor6 mb-1">Time</label>
                        <input
                          type="time"
                          value={frequency.weeklyTime || '10:00'}
                          onChange={(e) => handleFrequencyChange(typeConfig.type, {
                            ...frequency,
                            weeklyTime: e.target.value
                          })}
                          className="form-input text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {renderValidationErrors(typeConfig.type)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const renderQuietHours = () => (
    <div className="quiet-hours space-y-6">
      <div className="section-header">
        <h3 className="text-h4 mb-2">Quiet Hours</h3>
        <p className="text-textColor6">
          Set times when you don&apos;t want to receive non-critical notifications.
        </p>
      </div>

      <div className="quiet-hours-card border border-borderColor6 rounded-8 p-4">
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={preferences?.quietHours?.enabled || false}
            onChange={(e) => handleQuietHoursChange({
              enabled: e.target.checked,
              start: preferences?.quietHours?.start || '22:00',
              end: preferences?.quietHours?.end || '08:00',
              timezone: preferences?.quietHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
            })}
            className="form-checkbox"
          />
          <span className="font-medium">Enable Quiet Hours</span>
        </label>

        {preferences?.quietHours?.enabled && (
          <div className="quiet-hours-settings space-y-4 ml-6">
            <div className="time-range grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textColor2 mb-1">Start Time</label>
                <input
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) => handleQuietHoursChange({
                    enabled: preferences.quietHours?.enabled || false,
                    start: e.target.value,
                    end: preferences.quietHours?.end || '08:00',
                    timezone: preferences.quietHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
                  })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textColor2 mb-1">End Time</label>
                <input
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) => handleQuietHoursChange({
                    enabled: preferences.quietHours?.enabled || false,
                    start: preferences.quietHours?.start || '22:00',
                    end: e.target.value,
                    timezone: preferences.quietHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
                  })}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-textColor2 mb-1">Timezone</label>
              <select
                value={preferences.quietHours.timezone}
                onChange={(e) => handleQuietHoursChange({
                  enabled: preferences.quietHours?.enabled || false,
                  start: preferences.quietHours?.start || '22:00',
                  end: preferences.quietHours?.end || '08:00',
                  timezone: e.target.value
                })}
                className="form-select"
              >
                {Intl.supportedValuesOf('timeZone').map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            {preferences.quietHours.daysOfWeek !== undefined && (
              <div>
                <label className="block text-sm font-medium text-textColor2 mb-2">Days of Week</label>
                <div className="days-grid grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <label key={day} className="flex flex-col items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={preferences.quietHours?.daysOfWeek?.includes(index) || false}
                        onChange={(e) => {
                          const currentDays = preferences.quietHours?.daysOfWeek || []
                          const newDays = e.target.checked
                            ? [...currentDays, index]
                            : currentDays.filter(d => d !== index)
                          
                          handleQuietHoursChange({
                            ...preferences.quietHours!,
                            daysOfWeek: newDays
                          })
                        }}
                        className="form-checkbox"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {renderValidationErrors('quietHours')}
          </div>
        )}
      </div>
    </div>
  )

  const renderAdvancedSettings = () => (
    <div className="advanced-settings space-y-6">
      <div className="section-header">
        <h3 className="text-h4 mb-2">Advanced Settings</h3>
        <p className="text-textColor6">
          Global notification limits and behavior settings.
        </p>
      </div>

      <div className="global-settings-card border border-borderColor6 rounded-8 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-textColor2 mb-1">
            Maximum Notifications per Day
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={preferences?.globalSettings?.maxPerDay || 50}
            onChange={(e) => handleGlobalSettingsChange({
              enabled: preferences?.globalSettings?.enabled || true,
              maxPerDay: parseInt(e.target.value),
              maxPerHour: preferences?.globalSettings?.maxPerHour || 10,
              respectQuietHours: preferences?.globalSettings?.respectQuietHours || true,
              allowCriticalOverride: preferences?.globalSettings?.allowCriticalOverride || true
            })}
            className="form-input w-24"
          />
          <p className="text-xs text-textColor6 mt-1">
            Limit the total number of notifications you receive per day
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-textColor2 mb-1">
            Maximum Notifications per Hour
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={preferences?.globalSettings?.maxPerHour || 10}
            onChange={(e) => handleGlobalSettingsChange({
              enabled: preferences?.globalSettings?.enabled || true,
              maxPerDay: preferences?.globalSettings?.maxPerDay || 50,
              maxPerHour: parseInt(e.target.value),
              respectQuietHours: preferences?.globalSettings?.respectQuietHours || true,
              allowCriticalOverride: preferences?.globalSettings?.allowCriticalOverride || true
            })}
            className="form-input w-24"
          />
          <p className="text-xs text-textColor6 mt-1">
            Limit notifications to prevent overwhelming bursts
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences?.globalSettings?.respectQuietHours || true}
              onChange={(e) => handleGlobalSettingsChange({
                enabled: preferences?.globalSettings?.enabled || true,
                maxPerDay: preferences?.globalSettings?.maxPerDay || 50,
                maxPerHour: preferences?.globalSettings?.maxPerHour || 10,
                respectQuietHours: e.target.checked,
                allowCriticalOverride: preferences?.globalSettings?.allowCriticalOverride || true
              })}
              className="form-checkbox"
            />
            <span className="text-sm">Respect quiet hours for all notifications</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences?.globalSettings?.allowCriticalOverride || true}
              onChange={(e) => handleGlobalSettingsChange({
                enabled: preferences?.globalSettings?.enabled || true,
                maxPerDay: preferences?.globalSettings?.maxPerDay || 50,
                maxPerHour: preferences?.globalSettings?.maxPerHour || 10,
                respectQuietHours: preferences?.globalSettings?.respectQuietHours || true,
                allowCriticalOverride: e.target.checked
              })}
              className="form-checkbox"
            />
            <span className="text-sm">Allow critical notifications during quiet hours</span>
          </label>
        </div>

        {renderValidationErrors('global')}
      </div>

      <div className="reset-section border border-red-200 rounded-8 p-4 bg-red-50">
        <h4 className="text-red-800 font-semibold mb-2">Reset Preferences</h4>
        <p className="text-red-700 text-sm mb-3">
          This will reset all your notification preferences to their default values. This action cannot be undone.
        </p>
        <FormButton
          onClick={handleResetToDefaults}
          disabled={isSubmitting}
          className="btn-danger btn-s"
        >
          {isSubmitting ? 'Resetting...' : 'Reset to Defaults'}
        </FormButton>
      </div>
    </div>
  )

  // ============================================================================
  // Main Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="notification-preferences-loading">
        <Loading />
        <p className="text-center text-textColor6 mt-4">Loading notification preferences...</p>
      </div>
    )
  }

  if (isError || !preferences) {
    return (
      <div className="notification-preferences-error text-center py-8">
        <Icon icon="exclamation-triangle" className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-h4 text-red-600 mb-2">Failed to Load Preferences</h3>
        <p className="text-textColor6 mb-4">
          {error?.message || 'Unable to load your notification preferences. Please try again.'}
        </p>
        <FormButton onClick={() => window.location.reload()} className="btn-primary btn-m">
          Retry
        </FormButton>
      </div>
    )
  }

  return (
    <div className="notification-preferences">
      <div className="preferences-header mb-6">
        <h2 className="text-h3 mb-2">Notification Preferences</h2>
        <p className="text-textColor6">
          Customize how and when you receive notifications from Exercism. 
          Changes are saved automatically.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="preferences-tabs border-b border-borderColor6 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'types', label: 'Notification Types', icon: 'bell' },
            { key: 'channels', label: 'Delivery Channels', icon: 'device-phone-mobile' },
            { key: 'schedule', label: 'Quiet Hours', icon: 'moon' },
            { key: 'advanced', label: 'Advanced', icon: 'cog-6-tooth' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-textColor6 hover:text-textColor2'
              }`}
            >
              <Icon icon={tab.icon} className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="preferences-content">
        {activeTab === 'types' && renderNotificationTypes()}
        {activeTab === 'channels' && renderNotificationTypes()} {/* Same as types for now */}
        {activeTab === 'schedule' && renderQuietHours()}
        {activeTab === 'advanced' && renderAdvancedSettings()}
      </div>
    </div>
  )
}

export default NotificationPreferences