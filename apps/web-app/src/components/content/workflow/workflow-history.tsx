/**
 * Workflow History Component
 * 
 * Displays detailed workflow history and audit trails
 * Requirements: 5.3
 */

'use client'

import React, { useState } from 'react'
import { useWorkflowHistory } from '../../hooks/use-workflow-operations'
import type { WorkflowTransition } from '../../types'

// ============================================================================
// Extended Types for UI
// ============================================================================

interface ExtendedWorkflowTransition extends WorkflowTransition {
  action: string
  comment?: string | undefined
  metadata?: {
    performedBy?: string
    fromStatus?: string
    toStatus?: string
  }
  data?: Record<string, unknown>
  createdAt: Date
}

// ============================================================================
// Types
// ============================================================================

export interface WorkflowHistoryProps {
  itemId: string
  compact?: boolean
  showFilters?: boolean
  maxItems?: number
  className?: string
}

export interface WorkflowTransitionCardProps {
  transition: ExtendedWorkflowTransition
  isLatest?: boolean
  compact?: boolean
}

export interface HistoryFiltersProps {
  onFilterChange: (filters: HistoryFilters) => void
  onReset: () => void
}

interface HistoryFilters {
  action?: string
  dateRange?: 'all' | 'week' | 'month' | 'quarter'
  user?: string
}

// ============================================================================
// Workflow Transition Card Component
// ============================================================================

export function WorkflowTransitionCard({ 
  transition, 
  isLatest = false, 
  compact = false 
}: WorkflowTransitionCardProps) {
  const getActionConfig = (action: string) => {
    switch (action) {
      case 'created':
        return {
          icon: '✨',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Created'
        }
      case 'submitted_for_review':
        return {
          icon: '📝',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Submitted for Review'
        }
      case 'approved':
        return {
          icon: '✅',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Approved'
        }
      case 'rejected':
        return {
          icon: '❌',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Rejected'
        }
      case 'published':
        return {
          icon: '🚀',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          label: 'Published'
        }
      case 'archived':
        return {
          icon: '📦',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Archived'
        }
      case 'restored':
        return {
          icon: '♻️',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Restored'
        }
      default:
        return {
          icon: '📄',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
    }
  }

  const config = getActionConfig(transition.action)
  const timeAgo = getTimeAgo(transition.createdAt)

  if (compact) {
    return (
      <div className="flex items-center space-x-3 py-2">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor} ${config.borderColor} border`}>
          <span className="text-sm">{config.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${config.color}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
            {isLatest && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Latest
              </span>
            )}
          </div>
          {transition.comment && (
            <p className="text-sm text-gray-600 truncate">{transition.comment}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg p-4 ${config.bgColor} ${config.borderColor} ${isLatest ? 'ring-2 ring-blue-500 ring-opacity-20' : ''}`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor} ${config.borderColor} border-2`}>
          <span className="text-lg">{config.icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h4 className={`text-base font-medium ${config.color}`}>
                {config.label}
              </h4>
              {isLatest && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <span className="mr-1">🔥</span>
                  Latest
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {transition.createdAt.toLocaleString()}
            </div>
          </div>

          {/* Metadata */}
          {transition.metadata && (
            <div className="mt-2 text-sm text-gray-600">
              {transition.metadata.performedBy && (
                <div>
                  <span className="font-medium">By:</span> {transition.metadata.performedBy}
                </div>
              )}
              {transition.metadata.fromStatus && transition.metadata.toStatus && (
                <div>
                  <span className="font-medium">Status Change:</span> {transition.metadata.fromStatus} → {transition.metadata.toStatus}
                </div>
              )}
            </div>
          )}

          {/* Comment */}
          {transition.comment && (
            <div className="mt-3">
              <p className="text-sm text-gray-700 bg-white bg-opacity-50 rounded p-2 border">
                {transition.comment}
              </p>
            </div>
          )}

          {/* Additional Data */}
          {transition.data && Object.keys(transition.data).length > 0 && (
            <div className="mt-3">
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  Additional Details
                </summary>
                <div className="mt-2 bg-white bg-opacity-50 rounded p-2 border">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(transition.data, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// History Filters Component
// ============================================================================

function HistoryFilters({ onFilterChange, onReset }: HistoryFiltersProps) {
  const [filters, setFilters] = useState<HistoryFilters>({
    dateRange: 'all'
  })

  const updateFilter = (key: keyof HistoryFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const resetFilters: HistoryFilters = {
      dateRange: 'all'
    }
    setFilters(resetFilters)
    onReset()
  }

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Filter History</h3>
        <button
          onClick={handleReset}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Action Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Action
          </label>
          <select
            value={filters.action || ''}
            onChange={(e) => updateFilter('action', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Actions</option>
            <option value="created">Created</option>
            <option value="submitted_for_review">Submitted for Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
            <option value="restored">Restored</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => updateFilter('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>
        </div>

        {/* User Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User
          </label>
          <input
            type="text"
            value={filters.user || ''}
            onChange={(e) => updateFilter('user', e.target.value || undefined)}
            placeholder="Filter by user..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString()
  }
}

function filterTransitions(transitions: ExtendedWorkflowTransition[], filters: HistoryFilters): ExtendedWorkflowTransition[] {
  return transitions.filter(transition => {
    // Action filter
    if (filters.action && transition.action !== filters.action) {
      return false
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const transitionDate = transition.createdAt
      const now = new Date()
      let cutoffDate: Date

      switch (filters.dateRange) {
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'quarter':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          cutoffDate = new Date(0)
      }

      if (transitionDate < cutoffDate) {
        return false
      }
    }

    // User filter
    if (filters.user && transition.metadata?.performedBy) {
      const performedBy = transition.metadata.performedBy.toLowerCase()
      const filterUser = filters.user.toLowerCase()
      if (!performedBy.includes(filterUser)) {
        return false
      }
    }

    return true
  })
}

// ============================================================================
// Main Workflow History Component
// ============================================================================

export function WorkflowHistory({
  itemId,
  compact = false,
  showFilters = true,
  maxItems,
  className = ''
}: WorkflowHistoryProps) {
  const { history, isLoading, error, refresh } = useWorkflowHistory(itemId)
  const [filters, setFilters] = useState<HistoryFilters>({})

  // Apply filters
  const filteredHistory = React.useMemo(() => {
    if (!history) return []
    
    // Convert WorkflowTransition to ExtendedWorkflowTransition for UI
    const extendedHistory: ExtendedWorkflowTransition[] = history.map(transition => ({
      ...transition,
      action: `${transition.fromStatus}_to_${transition.toStatus}`,
      comment: transition.notes,
      metadata: {
        performedBy: transition.userId,
        fromStatus: transition.fromStatus,
        toStatus: transition.toStatus
      },
      createdAt: new Date(transition.timestamp)
    }))
    
    let filtered = filterTransitions(extendedHistory, filters)
    
    // Apply max items limit
    if (maxItems && filtered.length > maxItems) {
      filtered = filtered.slice(0, maxItems)
    }
    
    return filtered
  }, [history, filters, maxItems])

  const handleFilterChange = (newFilters: HistoryFilters) => {
    setFilters(newFilters)
  }

  const handleFilterReset = () => {
    setFilters({})
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error Loading History
            </h3>
            <p className="mt-1 text-sm text-red-700">{error.message}</p>
            <button
              onClick={refresh}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className={`text-center p-6 ${className}`}>
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">No History Available</h3>
        <p className="text-sm text-gray-500">
          Workflow history will appear here as actions are performed on this content.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Workflow History ({filteredHistory.length})
          </h3>
          <button
            onClick={refresh}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Refresh history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      {showFilters && !compact && (
        <HistoryFilters
          onFilterChange={handleFilterChange}
          onReset={handleFilterReset}
        />
      )}

      {/* History Timeline */}
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        {filteredHistory.map((transition, index) => (
          <WorkflowTransitionCard
            key={transition.id}
            transition={transition}
            isLatest={index === 0}
            compact={compact}
          />
        ))}
      </div>

      {/* Show More */}
      {maxItems && history.length > maxItems && (
        <div className="text-center">
          <button
            onClick={() => {/* Implement show more logic */}}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Show {Math.min(10, history.length - maxItems)} more items
          </button>
        </div>
      )}
    </div>
  )
}