/**
 * Enhanced Notification List Component
 * 
 * Implements virtual scrolling for large datasets, notification grouping,
 * infinite scroll pagination, and accessibility features.
 * 
 * Requirements: 1.2, 7.4
 */

'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
// @ts-expect-error - react-window types issue
import { FixedSizeList } from 'react-window'
import { NotificationItem } from './NotificationItem'
import { Loading } from '@/components/common/Loading'
import { Icon } from '@/components/common/Icon'
import { FormButton } from '@/components/common/forms/FormButton'
import type { Notification as LocalNotification } from './types'

// ============================================================================
// Types
// ============================================================================

export interface NotificationGroup {
  id: string
  title: string
  date: Date
  notifications: LocalNotification[]
  type?: 'date' | 'type' | 'priority'
}

export interface EnhancedNotificationListProps {
  notifications: LocalNotification[]
  isLoading?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  onNotificationClick?: (notification: LocalNotification) => void
  onNotificationAction?: (notification: LocalNotification, action: string) => void
  groupBy?: 'date' | 'type' | 'priority' | 'none'
  showGroupHeaders?: boolean
  enableVirtualScrolling?: boolean
  itemHeight?: number
  maxHeight?: number
  enableKeyboardNavigation?: boolean
  showBulkActions?: boolean
  onBulkAction?: (action: string, notificationIds: string[]) => void
  className?: string
}

// ============================================================================
// Utility Functions
// ============================================================================

function groupNotifications(
  notifications: LocalNotification[], 
  groupBy: 'date' | 'type' | 'priority' | 'none'
): NotificationGroup[] {
  if (groupBy === 'none') {
    return [{
      id: 'all',
      title: 'All Notifications',
      date: new Date(),
      notifications,
      type: 'date'
    }]
  }

  const groups = new Map<string, NotificationGroup>()

  notifications.forEach(notification => {
    let groupKey: string
    let groupTitle: string
    let groupDate: Date

    switch (groupBy) {
      case 'date':
        const date = new Date(notification.timestamp)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        if (date.toDateString() === today.toDateString()) {
          groupKey = 'today'
          groupTitle = 'Today'
          groupDate = today
        } else if (date.toDateString() === yesterday.toDateString()) {
          groupKey = 'yesterday'
          groupTitle = 'Yesterday'
          groupDate = yesterday
        } else {
          groupKey = date.toDateString()
          groupTitle = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
          groupDate = date
        }
        break

      case 'type':
        groupKey = notification.type
        groupTitle = notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        groupDate = new Date(notification.timestamp)
        break

      case 'priority':
        // LocalNotification doesn't have priority, use type as fallback
        groupKey = notification.type
        groupTitle = `${notification.type.charAt(0).toUpperCase()}${notification.type.slice(1)} Priority`
        groupDate = new Date(notification.timestamp)
        break

      default:
        groupKey = 'all'
        groupTitle = 'All Notifications'
        groupDate = new Date(notification.timestamp)
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        id: groupKey,
        title: groupTitle,
        date: groupDate,
        notifications: [],
        type: groupBy
      })
    }

    groups.get(groupKey)!.notifications.push(notification)
  })

  // Sort groups by date (newest first)
  return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime())
}

// ============================================================================
// Virtual List Item Component
// ============================================================================

interface VirtualListItemProps {
  index: number
  style: React.CSSProperties
  data: {
    items: Array<NotificationGroup | LocalNotification>
    onNotificationClick?: (notification: LocalNotification) => void
    onNotificationAction?: (notification: LocalNotification, action: string) => void
    selectedIds: Set<string>
    onToggleSelection: (id: string) => void
    showBulkActions: boolean
  }
}

const VirtualListItem: React.FC<VirtualListItemProps> = ({ index, style, data }) => {
  const item = data.items[index]
  
  if (!item) return null
  
  if ('notifications' in item) {
    // Group header
    const group = item as NotificationGroup
    return (
      <div style={style} className="notification-group-header">
        <div className="sticky top-0 bg-backgroundColorA border-b border-borderColor6 px-4 py-2 z-10">
          <h3 className="text-sm font-semibold text-textColor4 flex items-center gap-2">
            <Icon 
              icon={group.type === 'date' ? 'calendar' : group.type === 'type' ? 'tag' : 'flag'} 
              className="w-4 h-4" 
            />
            {group.title}
            <span className="text-xs text-textColor6 font-normal">
              ({group.notifications.length})
            </span>
          </h3>
        </div>
      </div>
    )
  } else {
    // Notification item
    const notification = item as LocalNotification
    const isSelected = data.selectedIds.has(notification.id)
    
    return (
      <div style={style} className="notification-list-item">
        <div className="flex items-start gap-3 px-4 py-2">
          {data.showBulkActions && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => data.onToggleSelection(notification.id)}
              className="mt-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              aria-label={`Select notification: ${notification.title}`}
            />
          )}
          <div className="flex-1">
            <NotificationItem
              notification={notification}
              onMarkAsRead={() => data.onNotificationAction?.(notification, 'mark_read')}
              onClick={() => data.onNotificationClick?.(notification)}
            />
          </div>
        </div>
      </div>
    )
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function EnhancedNotificationList({
  notifications,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  onNotificationClick,
  onNotificationAction,
  groupBy = 'date',
  showGroupHeaders = true,
  enableVirtualScrolling = true,
  itemHeight = 120,
  maxHeight = 600,
  enableKeyboardNavigation = true,
  showBulkActions = false,
  onBulkAction,
  className = ''
}: EnhancedNotificationListProps): React.JSX.Element {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const virtualListRef = useRef<any>(null)

  // ============================================================================
  // Data Processing
  // ============================================================================

  const groupedNotifications = useMemo(() => {
    return groupNotifications(notifications, groupBy)
  }, [notifications, groupBy])

  // Flatten groups and notifications for virtual scrolling
  const flattenedItems = useMemo(() => {
    if (!showGroupHeaders || groupBy === 'none') {
      return notifications
    }

    const items: Array<NotificationGroup | LocalNotification> = []
    groupedNotifications.forEach(group => {
      items.push(group) // Group header
      items.push(...group.notifications) // Group notifications
    })
    return items
  }, [groupedNotifications, showGroupHeaders, groupBy, notifications])

  // ============================================================================
  // Selection Management
  // ============================================================================

  const handleToggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(notifications.map(n => n.id))
    setSelectedIds(allIds)
  }, [notifications])

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkAction = useCallback((action: string) => {
    if (selectedIds.size > 0) {
      onBulkAction?.(action, Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }, [selectedIds, onBulkAction])

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enableKeyboardNavigation) return

    const notificationItems = flattenedItems.filter(item => !('notifications' in item))
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, notificationItems.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < notificationItems.length) {
          const notification = notificationItems[focusedIndex] as LocalNotification
          onNotificationClick?.(notification)
        }
        break
      case 'Escape':
        setFocusedIndex(-1)
        break
    }
  }, [enableKeyboardNavigation, flattenedItems, focusedIndex, onNotificationClick])

  // ============================================================================
  // Infinite Scroll
  // ============================================================================

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!hasNextPage || isFetchingNextPage || !onLoadMore) return

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

    if (scrollPercentage > 0.8) {
      onLoadMore()
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderBulkActions = () => {
    if (!showBulkActions || selectedIds.size === 0) return null

    return (
      <div className="bulk-actions bg-blue-50 border-b border-blue-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedIds.size} notification{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <FormButton
              onClick={() => handleBulkAction('mark_read')}
              className="btn-secondary btn-xs"
            >
              Mark as Read
            </FormButton>
            <FormButton
              onClick={() => handleBulkAction('delete')}
              className="btn-danger btn-xs"
            >
              Delete
            </FormButton>
            <FormButton
              onClick={handleDeselectAll}
              className="btn-ghost btn-xs"
            >
              Cancel
            </FormButton>
          </div>
        </div>
      </div>
    )
  }

  const renderSelectionControls = () => {
    if (!showBulkActions) return null

    return (
      <div className="selection-controls border-b border-borderColor6 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === notifications.length && notifications.length > 0}
              onChange={selectedIds.size === notifications.length ? handleDeselectAll : handleSelectAll}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              aria-label="Select all notifications"
            />
            <span className="text-sm text-textColor6">
              Select all ({notifications.length})
            </span>
          </div>
          <div className="text-xs text-textColor6">
            {selectedIds.size > 0 && `${selectedIds.size} selected`}
          </div>
        </div>
      </div>
    )
  }

  const renderVirtualList = () => {
    if (!enableVirtualScrolling || flattenedItems.length < 50) {
      return renderRegularList()
    }

    return (
      <FixedSizeList
        ref={virtualListRef}
        height={maxHeight}
        itemCount={flattenedItems.length}
        itemSize={itemHeight}
        itemData={{
          items: flattenedItems,
          onNotificationClick,
          onNotificationAction,
          selectedIds,
          onToggleSelection: handleToggleSelection,
          showBulkActions
        }}
        onScroll={handleScroll}
      >
        {VirtualListItem}
      </FixedSizeList>
    )
  }

  const renderRegularList = () => {
    return (
      <div 
        className="notification-list-container"
        style={{ maxHeight, overflowY: 'auto' }}
        onScroll={handleScroll}
      >
        {groupedNotifications.map(group => (
          <div key={group.id} className="notification-group">
            {showGroupHeaders && groupBy !== 'none' && (
              <div className="notification-group-header sticky top-0 bg-backgroundColorA border-b border-borderColor6 px-4 py-2 z-10">
                <h3 className="text-sm font-semibold text-textColor4 flex items-center gap-2">
                  <Icon 
                    icon={group.type === 'date' ? 'calendar' : group.type === 'type' ? 'tag' : 'flag'} 
                    className="w-4 h-4" 
                  />
                  {group.title}
                  <span className="text-xs text-textColor6 font-normal">
                    ({group.notifications.length})
                  </span>
                </h3>
              </div>
            )}
            <div className="notification-group-items">
              {group.notifications.map((notification, index) => {
                const isSelected = selectedIds.has(notification.id)
                const isFocused = enableKeyboardNavigation && 
                  flattenedItems.findIndex(item => 
                    !('notifications' in item) && (item as LocalNotification).id === notification.id
                  ) === focusedIndex

                return (
                  <div 
                    key={notification.id}
                    className={`notification-list-item ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="flex items-start gap-3 px-4 py-2">
                      {showBulkActions && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelection(notification.id)}
                          className="mt-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          aria-label={`Select notification: ${notification.title}`}
                        />
                      )}
                      <div className="flex-1">
                        <NotificationItem
                          notification={notification}
                          onMarkAsRead={() => onNotificationAction?.(notification, 'mark_read')}
                          onClick={() => onNotificationClick?.(notification)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderLoadMoreButton = () => {
    if (!hasNextPage) return null

    return (
      <div className="load-more-container border-t border-borderColor6 p-4 text-center">
        <FormButton
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="btn-secondary btn-s"
        >
          {isFetchingNextPage ? (
            <>
              <Icon icon="arrow-path" className="w-4 h-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            <>
              <Icon icon="chevron-down" className="w-4 h-4 mr-2" />
              Load More
            </>
          )}
        </FormButton>
      </div>
    )
  }

  const renderEmptyState = () => (
    <div className="notification-empty-state text-center py-12">
      <Icon icon="bell-slash" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-600 mb-2">No notifications</h3>
      <p className="text-gray-500 text-sm">
        You&apos;re all caught up! New notifications will appear here.
      </p>
    </div>
  )

  // ============================================================================
  // Main Render
  // ============================================================================

  if (isLoading && notifications.length === 0) {
    return (
      <div className={`enhanced-notification-list ${className}`}>
        <div className="loading-state py-12">
          <Loading />
          <p className="text-center text-textColor6 mt-4">Loading notifications...</p>
        </div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className={`enhanced-notification-list ${className}`}>
        {renderEmptyState()}
      </div>
    )
  }

  return (
    <div 
      className={`enhanced-notification-list ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={enableKeyboardNavigation ? 0 : -1}
      role="listbox"
      aria-label="Notifications list"
      ref={listRef}
    >
      {renderBulkActions()}
      {renderSelectionControls()}
      
      <div className="notification-list-content">
        {enableVirtualScrolling && flattenedItems.length >= 50 ? renderVirtualList() : renderRegularList()}
      </div>

      {renderLoadMoreButton()}

      {/* Accessibility announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedIds.size > 0 && `${selectedIds.size} notifications selected`}
        {isFetchingNextPage && 'Loading more notifications'}
      </div>
    </div>
  )
}

export default EnhancedNotificationList