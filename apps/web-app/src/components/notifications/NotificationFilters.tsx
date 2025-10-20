'use client'

import React from 'react'
import { Tab } from '@/components/common/Tab'

interface NotificationFiltersProps {
  status: string
  type: string
  unreadCount: number
  onStatusChange: (status: string) => void
  onTypeChange: (type: string) => void
  onMarkAllAsRead: () => void
}

export function NotificationFilters({
  status,
  type,
  unreadCount,
  onStatusChange,
  onTypeChange,
  onMarkAllAsRead
}: NotificationFiltersProps) {
  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: `Unread (${unreadCount})` },
    { value: 'read', label: 'Read' }
  ]

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'acquired_badge', label: 'Badges' },
    { value: 'mentor_started_discussion', label: 'Mentoring' },
    { value: 'mentor_replied_to_discussion', label: 'Mentor Replies' },
    { value: 'student_replied_to_discussion', label: 'Student Replies' },
    { value: 'approach_introduction_approved', label: 'Contributions' }
  ]

  return (
    <div className="notification-filters mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {statusOptions.map((option) => (
              <Tab
                key={option.value}
                active={status === option.value}
                onClick={() => onStatusChange(option.value)}
              >
                {option.label}
              </Tab>
            ))}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="btn-secondary btn-xs"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="type-filter" className="text-14 text-textColor6">
          Filter by type:
        </label>
        <select
          id="type-filter"
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
          className="form-select text-14"
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}