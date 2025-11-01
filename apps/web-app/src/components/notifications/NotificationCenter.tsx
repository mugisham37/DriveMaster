/**
 * Notification Center Component
 * 
 * Comprehensive notification interface with filtering, sorting, search functionality,
 * bulk actions, and responsive design for mobile and desktop experiences.
 * 
 * Requirements: 1.1, 1.2, 1.4
 */

'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useNotifications, useNotificationMutations } from '@/hooks'
import { EnhancedNotificationList } from './EnhancedNotificationList'
import { NotificationToastSystem } from './NotificationToastSystem'
import { PushPermissionFlow } from './PushPermissionFlow'
import { Icon } from '@/components/common/Icon'
import { FormButton } from '@/components/common/forms/FormButton'
import { Loading } from '@/components/common/Loading'
import type { 
  Notification as ServiceNotification, 
  NotificationType,
  NotificationPriority,
  NotificationQueryParams 
} from '@/types/notification-service'
import type { Notification as LocalNotification } from './types'

// ============================================================================
// Types
// ============================================================================

export interface NotificationCenterProps {
  userId?: string
  className?: string
  showHeader?: boolean
  showFilters?: boolean
  showSearch?: boolean
  showBulkActions?: boolean
  defaultView?: 'list' | 'grid'
  maxHeight?: number
  enableRealtime?: boolean
  onNotificationClick?: (notification: ServiceNotification) => void
  onClose?: () => void
}

interface FilterState {
  type: NotificationType | 'all'
  status: 'all' | 'read' | 'unread'
  priority: NotificationPriority | 'all'
  dateRange: 'all' | 'today' | 'week' | 'month'
}

interface SortState {
  field: 'createdAt' | 'priority' | 'type'
  direction: 'asc' | 'desc'
}

// ============================================================================
// Constants
// ============================================================================

const NOTIFICATION_TYPES: { value: NotificationType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All Types', icon: 'bell' },
  { value: 'achievement', label: 'Achievements', icon: 'trophy' },
  { value: 'spaced_repetition', label: 'Study Reminders', icon: 'academic-cap' },
  { value: 'streak_reminder', label: 'Streak Reminders', icon: 'fire' },
  { value: 'mock_test_reminder', label: 'Test Reminders', icon: 'clipboard-document-check' },
  { value: 'system', label: 'System', icon: 'cog' },
  { value: 'mentoring', label: 'Mentoring', icon: 'users' },
  { value: 'course_update', label: 'Course Updates', icon: 'document-text' },
  { value: 'community', label: 'Community', icon: 'chat-bubble-left-right' },
  { value: 'marketing', label: 'Marketing', icon: 'megaphone' }
]

const PRIORITY_OPTIONS: { value: NotificationPriority | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Priorities', color: 'gray' },
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' }
]

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' }
] as const

// ============================================================================
// Main Component
// ============================================================================

export function NotificationCenter({
  userId,
  className = '',
  showHeader = true,
  showFilters = true,
  showSearch = true,
  showBulkActions = true,
  defaultView = 'list',
  maxHeight = 600,
  enableRealtime = true,
  onNotificationClick,
  onClose
}: NotificationCenterProps): React.JSX.Element {
  // ============================================================================
  // State Management
  // ============================================================================

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    status: 'all',
    priority: 'all',
    dateRange: 'all'
  })
  const [sort, setSort] = useState<SortState>({
    field: 'createdAt',
    direction: 'desc'
  })
  const [view, setView] = useState<'list' | 'grid'>(defaultView)
  const [showPushPermission, setShowPushPermission] = useState(false)

  
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ============================================================================
  // Data Fetching
  // ============================================================================

  // Build query parameters from filters
  const queryParams = useMemo((): NotificationQueryParams => {
    const params: NotificationQueryParams = {
      limit: 50
    }
    
    if (userId) {
      params.userId = userId
    }

    if (filters.type !== 'all') {
      params.type = filters.type
    }

    if (filters.status !== 'all') {
      params.status = filters.status === 'unread' ? 'unread' : 'read'
    }

    if (filters.priority !== 'all') {
      params.priority = filters.priority
    }

    if (filters.dateRange !== 'all') {
      const now = new Date()
      switch (filters.dateRange) {
        case 'today':
          params.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          params.startDate = weekStart
          break
        case 'month':
          params.startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
      }
    }

    return params
  }, [userId, filters])

  const {
    notifications,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    unreadCount,
    totalCount
  } = useNotifications(queryParams)

  const {
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationMutations()

  // ============================================================================
  // Type Conversion
  // ============================================================================

  // Convert service notifications to local component format
  const localNotifications = useMemo(() => {
    return notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      timestamp: new Date(notification.createdAt),
      isRead: notification.status.isRead,
      ...(notification.actionUrl && { actionUrl: notification.actionUrl }),
      ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
      ...(notification.iconUrl && { iconUrl: notification.iconUrl }),
      ...(notification.data && { data: notification.data })
    }))
  }, [notifications])

  // ============================================================================
  // Filtering and Sorting
  // ============================================================================

  const filteredAndSortedNotifications = useMemo(() => {
    let filtered = [...localNotifications]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(notification => 
        notification.title.toLowerCase().includes(query) ||
        notification.body.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sort.field) {
        case 'createdAt':
          comparison = a.timestamp.getTime() - b.timestamp.getTime()
          break
        case 'priority':
          // Since local notifications don't have priority, sort by type
          comparison = a.type.localeCompare(b.type)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }

      return sort.direction === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [localNotifications, searchQuery, sort])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSortChange = useCallback((field: SortState['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }, [])

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }, [])

  const handleNotificationClick = useCallback((notification: LocalNotification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      markAsRead.mutate(notification.id)
    }
    
    // Convert back to service notification format for callback
    const serviceNotification = notifications.find(n => n.id === notification.id)
    if (serviceNotification) {
      onNotificationClick?.(serviceNotification)
    }
  }, [markAsRead, onNotificationClick, notifications])

  const handleNotificationAction = useCallback((notification: LocalNotification, action: string) => {
    switch (action) {
      case 'mark_read':
        markAsRead.mutate(notification.id)
        break
      case 'delete':
        deleteNotification.mutate(notification.id)
        break
    }
  }, [markAsRead, deleteNotification])

  const handleBulkAction = useCallback((action: string, notificationIds: string[]) => {
    switch (action) {
      case 'mark_read':
        // Mark each notification individually
        notificationIds.forEach(id => markAsRead.mutate(id))
        break
      case 'delete':
        // Delete each notification individually
        notificationIds.forEach(id => deleteNotification.mutate(id))
        break
    }
    // Selections cleared automatically by individual mutations
  }, [markAsRead, deleteNotification])

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead.mutate()
  }, [markAllAsRead])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }, [])

  const handleResetFilters = useCallback(() => {
    setFilters({
      type: 'all',
      status: 'all',
      priority: 'all',
      dateRange: 'all'
    })
    setSearchQuery('')
  }, [])

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
      
      // Escape to clear search or close
      if (event.key === 'Escape') {
        if (searchQuery) {
          setSearchQuery('')
        } else {
          onClose?.()
        }
      }
      
      // Cmd/Ctrl + A to mark all as read
      if ((event.metaKey || event.ctrlKey) && event.key === 'a' && event.shiftKey) {
        event.preventDefault()
        handleMarkAllAsRead()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery, onClose, handleMarkAllAsRead])

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderHeader = () => {
    if (!showHeader) return null

    return (
      <div className="notification-center-header border-b border-borderColor6 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon icon="bell" className="w-6 h-6 text-textColor4" />
            <div>
              <h2 className="text-lg font-semibold text-textColor2">Notifications</h2>
              <p className="text-sm text-textColor6">
                {totalCount} total, {unreadCount} unread
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-8 p-1">
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded-6 transition-colors ${
                  view === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
                aria-label="List view"
              >
                <Icon icon="list-bullet" className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={`p-2 rounded-6 transition-colors ${
                  view === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
                aria-label="Grid view"
              >
                <Icon icon="squares-2x2" className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <FormButton
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || markAllAsRead.isLoading}
              className="btn-secondary btn-s"
            >
              {markAllAsRead.isLoading ? (
                <Icon icon="arrow-path" className="w-4 h-4 animate-spin" />
              ) : (
                <Icon icon="check-circle" className="w-4 h-4" />
              )}
              Mark All Read
            </FormButton>

            <FormButton
              onClick={() => setShowPushPermission(true)}
              className="btn-ghost btn-s"
            >
              <Icon icon="cog" className="w-4 h-4" />
            </FormButton>

            {onClose && (
              <FormButton
                onClick={onClose}
                className="btn-ghost btn-s"
              >
                <Icon icon="x-mark" className="w-4 h-4" />
              </FormButton>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        {(showSearch || showFilters) && (
          <div className="space-y-3">
            {/* Search */}
            {showSearch && (
              <div className="relative">
                <Icon icon="magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-textColor6" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search notifications... (⌘K)"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-10 py-2 border border-borderColor6 rounded-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-textColor6 hover:text-textColor4"
                  >
                    <Icon icon="x-mark" className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-2">
                {/* Type Filter */}
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="px-3 py-1 text-sm border border-borderColor6 rounded-6 focus:ring-2 focus:ring-blue-500"
                >
                  {NOTIFICATION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-1 text-sm border border-borderColor6 rounded-6 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="px-3 py-1 text-sm border border-borderColor6 rounded-6 focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITY_OPTIONS.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>

                {/* Date Range Filter */}
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="px-3 py-1 text-sm border border-borderColor6 rounded-6 focus:ring-2 focus:ring-blue-500"
                >
                  {DATE_RANGES.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>

                {/* Reset Filters */}
                <FormButton
                  onClick={handleResetFilters}
                  className="btn-ghost btn-xs"
                >
                  <Icon icon="arrow-path" className="w-3 h-3 mr-1" />
                  Reset
                </FormButton>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderSortControls = () => (
    <div className="sort-controls border-b border-borderColor6 px-4 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-textColor6">Sort by:</span>
        {(['createdAt', 'priority', 'type'] as const).map(field => (
          <button
            key={field}
            onClick={() => handleSortChange(field)}
            className={`flex items-center gap-1 px-2 py-1 rounded-4 transition-colors ${
              sort.field === field 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-100 text-textColor6'
            }`}
          >
            {field === 'createdAt' ? 'Date' : field.charAt(0).toUpperCase() + field.slice(1)}
            {sort.field === field && (
              <Icon 
                icon={sort.direction === 'desc' ? 'chevron-down' : 'chevron-up'} 
                className="w-3 h-3" 
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )

  const renderEmptyState = () => (
    <div className="notification-center-empty text-center py-12">
      <Icon icon="bell-slash" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-600 mb-2">
        {searchQuery || filters.type !== 'all' || filters.status !== 'all' 
          ? 'No matching notifications' 
          : 'No notifications yet'
        }
      </h3>
      <p className="text-gray-500 text-sm mb-4">
        {searchQuery || filters.type !== 'all' || filters.status !== 'all'
          ? 'Try adjusting your search or filters'
          : 'New notifications will appear here when they arrive'
        }
      </p>
      {(searchQuery || filters.type !== 'all' || filters.status !== 'all') && (
        <FormButton
          onClick={handleResetFilters}
          className="btn-secondary btn-s"
        >
          Clear Filters
        </FormButton>
      )}
    </div>
  )

  const renderErrorState = () => (
    <div className="notification-center-error text-center py-12">
      <Icon icon="exclamation-triangle" className="w-16 h-16 text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-red-600 mb-2">Failed to load notifications</h3>
      <p className="text-red-500 text-sm mb-4">
        {error?.message || 'An error occurred while fetching notifications'}
      </p>
      <FormButton
        onClick={() => refetch()}
        className="btn-secondary btn-s"
      >
        <Icon icon="arrow-path" className="w-4 h-4 mr-2" />
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
    <div className={`notification-center bg-white rounded-12 shadow-lg ${className}`}>
      {renderHeader()}
      {renderSortControls()}
      
      <div className="notification-center-content" style={{ maxHeight }}>
        {isLoading && filteredAndSortedNotifications.length === 0 ? (
          <div className="loading-state py-12">
            <Loading />
            <p className="text-center text-textColor6 mt-4">Loading notifications...</p>
          </div>
        ) : filteredAndSortedNotifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <EnhancedNotificationList
            notifications={filteredAndSortedNotifications}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            onNotificationClick={handleNotificationClick}
            onNotificationAction={handleNotificationAction}
            groupBy="date"
            showGroupHeaders={true}
            enableVirtualScrolling={filteredAndSortedNotifications.length > 50}
            maxHeight={maxHeight - 200} // Account for header and controls
            enableKeyboardNavigation={true}
            showBulkActions={showBulkActions}
            onBulkAction={handleBulkAction}
          />
        )}
      </div>

      {/* Toast System */}
      {enableRealtime && (
        <NotificationToastSystem
          position="top-right"
          maxVisible={3}
          enableSounds={true}
          enableVibration={true}
          enableGrouping={true}
        />
      )}

      {/* Push Permission Flow */}
      <PushPermissionFlow
        isOpen={showPushPermission}
        onClose={() => setShowPushPermission(false)}
        onPermissionGranted={() => setShowPushPermission(false)}
        showBenefits={true}
        autoRegisterOnGrant={true}
        trigger="manual"
      />
    </div>
  )
}

export default NotificationCenter