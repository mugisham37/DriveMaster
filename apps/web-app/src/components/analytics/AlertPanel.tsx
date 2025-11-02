/**
 * AlertPanel Component
 * 
 * Displays system alerts and notifications with severity levels,
 * filtering, and real-time updates.
 * 
 * Requirements: 3.1, 3.2, 6.3
 */

'use client'

import React, { memo, useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/common/Icon'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { Alert, AlertSeverity } from '@/types/analytics-service'

// ============================================================================
// Types
// ============================================================================

export interface AlertPanelProps {
  alerts: Alert[]
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  isRealtime?: boolean
  lastUpdated?: Date
  maxHeight?: number
  showFilters?: boolean
  onAlertClick?: (alert: Alert) => void
  onAlertResolve?: (alertId: string) => void
  onAlertDismiss?: (alertId: string) => void
  className?: string
}

export interface AlertItemProps {
  alert: Alert
  onAlertClick?: (alert: Alert) => void
  onAlertResolve?: (alertId: string) => void
  onAlertDismiss?: (alertId: string) => void
}

// ============================================================================
// Alert Severity Configuration
// ============================================================================

const severityConfig = {
  info: {
    icon: 'info',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeVariant: 'default' as const
  },
  warning: {
    icon: 'alert-triangle',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badgeVariant: 'secondary' as const
  },
  error: {
    icon: 'alert-circle',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeVariant: 'destructive' as const
  },
  critical: {
    icon: 'alert-octagon',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    badgeVariant: 'destructive' as const
  }
}

// ============================================================================
// Alert Item Component
// ============================================================================

const AlertItem = memo<AlertItemProps>(({
  alert,
  onAlertClick,
  onAlertResolve,
  onAlertDismiss
}) => {
  const config = severityConfig[alert.severity]
  const [isResolving, setIsResolving] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)

  const handleResolve = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAlertResolve && !isResolving) {
      setIsResolving(true)
      try {
        await onAlertResolve(alert.id)
      } finally {
        setIsResolving(false)
      }
    }
  }

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAlertDismiss && !isDismissing) {
      setIsDismissing(true)
      try {
        await onAlertDismiss(alert.id)
      } finally {
        setIsDismissing(false)
      }
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      className={cn(
        'p-4 border rounded-lg transition-all duration-200',
        config.bgColor,
        config.borderColor,
        alert.resolved ? 'opacity-60' : 'hover:shadow-sm',
        onAlertClick && 'cursor-pointer',
        'relative'
      )}
      onClick={() => onAlertClick?.(alert)}
    >
      {/* Alert Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon 
            icon={config.icon} 
            className={cn('w-4 h-4', config.color)} 
          />
          <Badge variant={config.badgeVariant} className="text-xs">
            {alert.severity.toUpperCase()}
          </Badge>
          {alert.resolved && (
            <Badge variant="outline" className="text-xs">
              RESOLVED
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {formatTimestamp(alert.timestamp)}
        </span>
      </div>

      {/* Alert Content */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">{alert.title}</h4>
        <p className="text-sm text-gray-700">{alert.message}</p>
        
        {/* Alert Details */}
        {alert.details && Object.keys(alert.details).length > 0 && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
            <details>
              <summary className="cursor-pointer font-medium text-gray-600">
                View Details
              </summary>
              <div className="mt-2 space-y-1">
                {Object.entries(alert.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500">{key}:</span>
                    <span className="text-gray-700 font-mono">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Alert Actions */}
      {!alert.resolved && (onAlertResolve || onAlertDismiss) && (
        <div className="flex items-center justify-end space-x-2 mt-3 pt-2 border-t border-gray-200">
          {onAlertDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={isDismissing}
              className="text-xs"
            >
              {isDismissing ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <Icon icon="x" className="w-3 h-3 mr-1" />
                  Dismiss
                </>
              )}
            </Button>
          )}
          {onAlertResolve && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResolve}
              disabled={isResolving}
              className="text-xs"
            >
              {isResolving ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <Icon icon="check" className="w-3 h-3 mr-1" />
                  Resolve
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Resolved Info */}
      {alert.resolved && alert.resolvedBy && alert.resolvedAt && (
        <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
          Resolved by {alert.resolvedBy} at {new Date(alert.resolvedAt).toLocaleString()}
        </div>
      )}
    </div>
  )
})

AlertItem.displayName = 'AlertItem'

// ============================================================================
// Main Alert Panel Component
// ============================================================================

export const AlertPanel = memo<AlertPanelProps>(({
  alerts,
  isLoading = false,
  isError = false,
  errorMessage,
  isRealtime = false,
  lastUpdated,
  maxHeight = 400,
  showFilters = true,
  onAlertClick,
  onAlertResolve,
  onAlertDismiss,
  className
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all')
  const [showResolved, setShowResolved] = useState(false)

  // Filter alerts based on selected criteria
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const severityMatch = selectedSeverity === 'all' || alert.severity === selectedSeverity
      const resolvedMatch = showResolved || !alert.resolved
      return severityMatch && resolvedMatch
    })
  }, [alerts, selectedSeverity, showResolved])

  // Group alerts by severity for summary
  const alertSummary = useMemo(() => {
    const summary = {
      critical: 0,
      error: 0,
      warning: 0,
      info: 0,
      resolved: 0
    }

    alerts.forEach(alert => {
      if (alert.resolved) {
        summary.resolved++
      } else {
        summary[alert.severity]++
      }
    })

    return summary
  }, [alerts])

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
          {isRealtime && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
          )}
          <Badge variant="outline" className="text-xs">
            {filteredAlerts.length} alerts
          </Badge>
        </div>
        
        {lastUpdated && !isLoading && (
          <span className="text-xs text-gray-500">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {Object.entries(alertSummary).map(([severity, count]) => (
          <div key={severity} className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-gray-900">{count}</div>
            <div className="text-xs text-gray-500 capitalize">{severity}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center space-x-4 mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as AlertSeverity | 'all')}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Show resolved</span>
          </label>
        </div>
      )}

      {/* Alert List */}
      <div 
        className="space-y-3 overflow-y-auto"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <LoadingSpinner size="large" />
              <p className="mt-2 text-sm text-gray-500">Loading alerts...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-red-600">
              <Icon icon="alert-circle" className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">Failed to load alerts</p>
              {errorMessage && (
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
              )}
            </div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-gray-500">
              <Icon icon="check-circle" className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">No alerts</p>
              <p className="text-sm">All systems are running normally</p>
            </div>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAlertClick={onAlertClick}
              onAlertResolve={onAlertResolve}
              onAlertDismiss={onAlertDismiss}
            />
          ))
        )}
      </div>
    </Card>
  )
})

AlertPanel.displayName = 'AlertPanel'