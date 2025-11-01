/**
 * Notification Center Component
 * 
 * Main notification interface with preference-aware filtering,
 * quiet hours display, and comprehensive notification management.
 * 
 * Requirements: 1.1, 1.2, 9.3, 9.4
 */

'use client'

import React, { useState, useMemo } from 'react'
import { useNotificationFiltering, useNotificationInsights } from '@/hooks'
import { NotificationsList } from './NotificationsList'
import { NotificationFilters } from './NotificationFilters'
import { Icon } from '@/components/common/Icon'
import { Loading } from '@/components/common/Loading'
import { FormButton } from '@/components/common/forms/FormButton'
import type { NotificationType, DeliveryChannel } from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

interface NotificationCenterProps {
  className?: string
  showFilters?: boolean
  showInsights?: boolean
  defaultChannel?: DeliveryChannel
  maxHeight?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationCenter({
  className = '',
  showFilters = true,
  showInsights = true,
  defaultChannel = 'in_app',
  maxHeight = '600px'
}: NotificationCenterProps): React.JSX.Element {
  const [selectedChannel, setSelectedChannel] = useState<DeliveryChannel>(defaultChannel)
  const [selectedTypes, setSelectedTypes] = useState<NotificationType[]>([])
  const [showBlocked, setShowBlocked] = useState(false)

  // Get filtered notifications
  const {
    notifications,
    blockedNotifications,
    totalCount,
    allowedCount,
    blockedCount,
    isLoading,
    isError,
    error,
    isInQuietHours,
    preferences,
    refreshNotifications,
    batchedNotifications,
    nextBatchTimes
  } = useNotificationFiltering({
    channel: selectedChannel,
    type: selectedTypes.length > 0 ? selectedTypes : undefined,
    includeBlocked: showBlocked
  })

  // Get insights
  const insights = useNotificationInsights()

  // ============================================================================
  // Computed Values
  // ============================================================================

  const displayNotifications = useMemo(() => {
    if (showBlocked) {
      return [
        ...notifications,
        ...blockedNotifications.map(b => ({
          ...b.notification,
          _isBlocked: true,
          _blockReason: b.blockReason
        }))
      ]
    }
    return notifications
  }, [notifications, blockedNotifications, showBlocked])

  const hasBatchedNotifications = Object.keys(batchedNotifications).length > 0

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleChannelChange = (channel: DeliveryChannel) => {
    setSelectedChannel(channel)
  }

  const handleTypeFilter = (types: NotificationType[]) => {
    setSelectedTypes(types)
  }

  const handleToggleBlocked = () => {
    setShowBlocked(!showBlocked)
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderHeader = () => (
    <div className="notification-center-header border-b border-borderColor6 pb-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-h4 flex items-center gap-2">
          <Icon icon="bell" className="w-5 h-5" />
          Notifications
          {totalCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {allowedCount}
              {blockedCount > 0 && ` (+${blockedCount} filtered)`}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {isInQuietHours && (
            <div className="flex items-center gap-1 text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
              <Icon icon="moon" className="w-4 h-4" />
              Quiet Hours
            </div>
          )}
          <FormButton
            onClick={refreshNotifications}
            className="btn-secondary btn-xs"
            disabled={isLoading}
          >
            <Icon icon="arrow-path" className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </FormButton>
        </div>
      </div>

      {/* Channel Selector */}
      <div className="channel-selector">
        <div className="flex items-center gap-1 text-sm">
          <span className="text-textColor6 mr-2">Channel:</span>
          {(['in_app', 'push', 'email'] as DeliveryChannel[]).map((channel) => (
            <button
              key={channel}
              onClick={() => handleChannelChange(channel)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                selectedChannel === channel
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {channel === 'in_app' ? 'In-App' : channel === 'push' ? 'Push' : 'Email'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderInsights = () => {
    if (!showInsights || !preferences) return null

    return (
      <div className="notification-insights bg-blue-50 border border-blue-200 rounded-8 p-4 mb-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1">
          <Icon icon="chart-bar" className="w-4 h-4" />
          Notification Insights
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-blue-600 font-medium">{insights.enabledTypes}</div>
            <div className="text-blue-700">Types Enabled</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">{allowedCount}</div>
            <div className="text-blue-700">Allowed Today</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">{blockedCount}</div>
            <div className="text-blue-700">Filtered Out</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">
              {insights.mostActiveChannel || 'None'}
            </div>
            <div className="text-blue-700">Top Channel</div>
          </div>
        </div>
        
        {insights.quietHoursActive && (
          <div className="mt-2 text-xs text-blue-700">
            <Icon icon="moon" className="w-3 h-3 inline mr-1" />
            Quiet hours are configured
          </div>
        )}
      </div>
    )
  }

  const renderBatchedNotifications = () => {
    if (!hasBatchedNotifications) return null

    return (
      <div className="batched-notifications bg-yellow-50 border border-yellow-200 rounded-8 p-4 mb-4">
        <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-1">
          <Icon icon="clock" className="w-4 h-4" />
          Batched Notifications
        </h3>
        <div className="space-y-2">
          {Object.entries(batchedNotifications).map(([type, notifications]) => {
            const nextTime = nextBatchTimes[type as NotificationType]
            return (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="text-yellow-700">
                  {notifications.length} {type} notifications
                </span>
                {nextTime && (
                  <span className="text-yellow-600">
                    Next: {nextTime.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderFilters = () => {
    if (!showFilters) return null

    return (
      <div className="notification-filters mb-4">
        <NotificationFilters
          selectedTypes={selectedTypes}
          onTypeChange={handleTypeFilter}
          showBlockedToggle={blockedCount > 0}
          showBlocked={showBlocked}
          onToggleBlocked={handleToggleBlocked}
        />
      </div>
    )
  }

  const renderEmptyState = () => (
    <div className="notification-empty-state text-center py-8">
      <Icon icon="bell-slash" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-600 mb-2">No notifications</h3>
      <p className="text-gray-500 text-sm">
        {isInQuietHours 
          ? "You're in quiet hours. Notifications will resume later."
          : selectedTypes.length > 0
          ? "No notifications match your current filters."
          : "You're all caught up! New notifications will appear here."
        }
      </p>
      {blockedCount > 0 && !showBlocked && (
        <button
          onClick={handleToggleBlocked}
          className="mt-3 text-blue-600 hover:text-blue-700 text-sm underline"
        >
          Show {blockedCount} filtered notifications
        </button>
      )}
    </div>
  )

  const renderErrorState = () => (
    <div className="notification-error-state text-center py-8">
      <Icon icon="exclamation-triangle" className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-red-600 mb-2">Failed to load notifications</h3>
      <p className="text-red-500 text-sm mb-4">
        {error?.message || 'Something went wrong while loading your notifications.'}
      </p>
      <FormButton onClick={refreshNotifications} className="btn-primary btn-s">
        Try Again
      </FormButton>
    </div>
  )

  // ============================================================================
  // Main Render
  // ============================================================================

  if (isError) {
    return (
      <div className={`notification-center ${className}`}>
        {renderHeader()}
        {renderErrorState()}
      </div>
    )
  }

  return (
    <div className={`notification-center ${className}`}>
      {renderHeader()}
      {renderInsights()}
      {renderBatchedNotifications()}
      {renderFilters()}
      
      <div className="notification-content" style={{ maxHeight, overflowY: 'auto' }}>
        {isLoading ? (
          <div className="notification-loading py-8">
            <Loading />
            <p className="text-center text-textColor6 mt-4">Loading notifications...</p>
          </div>
        ) : displayNotifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <NotificationsList
            notifications={displayNotifications}
            showBlockedIndicator={showBlocked}
            onNotificationClick={(notification) => {
              // Handle notification click
              console.log('Notification clicked:', notification)
            }}
          />
        )}
      </div>

      {/* Footer with preference info */}
      {preferences && (
        <div className="notification-footer border-t border-borderColor6 pt-3 mt-4">
          <div className="flex items-center justify-between text-xs text-textColor6">
            <span>
              {preferences.enabledTypes.length} notification types enabled
            </span>
            <button
              onClick={() => {
                // Navigate to preferences
                window.location.href = '/settings/notifications'
              }}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Manage preferences
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationCenter