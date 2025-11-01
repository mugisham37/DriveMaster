/**
 * Notification Analytics Dashboard Component
 * 
 * Provides visualization and monitoring of notification performance metrics
 * with real-time updates and interactive charts.
 * 
 * Requirements: 5.4, 5.5 (Optional Task 7.4)
 */

'use client'

import React, { useState, useMemo } from 'react'
import { 
  useAnalyticsData, 
  useRealtimeAnalytics, 
  useAnalyticsSummary,
  useAnalyticsMetrics 
} from '../../hooks/useNotificationAnalytics'
import { AnalyticsQueryParams, AnalyticsMetric } from '../../types/notification-service'

// ============================================================================
// Types
// ============================================================================

interface NotificationAnalyticsDashboardProps {
  userId?: string
  className?: string
  showRealtime?: boolean
  defaultDateRange?: {
    startDate: Date
    endDate: Date
  }
}

interface MetricCardProps {
  title: string
  value: number | string
  change?: number
  format?: 'number' | 'percentage' | 'currency'
  isLoading?: boolean
}

interface ChartData {
  period: string
  [key: string]: number | string
}

// ============================================================================
// Utility Functions
// ============================================================================

const formatMetricValue = (value: number, format: 'number' | 'percentage' | 'currency' = 'number'): string => {
  switch (format) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`
    case 'currency':
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(value)
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(value)
  }
}

const getChangeColor = (change: number): string => {
  if (change > 0) return 'text-green-600'
  if (change < 0) return 'text-red-600'
  return 'text-gray-600'
}

const getChangeIcon = (change: number): string => {
  if (change > 0) return '↗'
  if (change < 0) return '↘'
  return '→'
}

// ============================================================================
// Components
// ============================================================================

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  format = 'number',
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    )
  }

  const formattedValue = typeof value === 'number' ? formatMetricValue(value, format) : value

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {formattedValue}
      </div>
      {change !== undefined && (
        <div className={`text-sm ${getChangeColor(change)} flex items-center`}>
          <span className="mr-1">{getChangeIcon(change)}</span>
          {Math.abs(change).toFixed(1)}% from last period
        </div>
      )}
    </div>
  )
}

const SimpleChart: React.FC<{ data: ChartData[], metric: string }> = ({ data, metric }) => {
  const maxValue = Math.max(...data.map(d => Number(d[metric]) || 0))
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Trend
      </h3>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-20 text-sm text-gray-600 mr-4">
              {item.period}
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-4 mr-4">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ 
                  width: `${maxValue > 0 ? (Number(item[metric]) / maxValue) * 100 : 0}%` 
                }}
              />
            </div>
            <div className="w-16 text-sm text-gray-900 text-right">
              {formatMetricValue(Number(item[metric]) || 0, 
                metric.includes('rate') ? 'percentage' : 'number')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export const NotificationAnalyticsDashboard: React.FC<NotificationAnalyticsDashboardProps> = ({
  userId,
  className = '',
  showRealtime = false,
  defaultDateRange = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date()
  }
}) => {
  const [dateRange, setDateRange] = useState(defaultDateRange)
  const selectedMetrics: AnalyticsMetric[] = [
    'delivery_rate',
    'open_rate',
    'click_rate',
    'conversion_rate'
  ]

  // Analytics query parameters
  const analyticsParams: AnalyticsQueryParams = {
    ...(userId && { userId }),
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    groupBy: 'day',
    metrics: selectedMetrics
  }

  // Hooks for data fetching
  const { data, isLoading, isError, error } = useAnalyticsData({
    ...analyticsParams,
    refetchInterval: showRealtime ? 30000 : 300000 // 30s for realtime, 5min otherwise
  })

  const { summary, isLoading: summaryLoading } = useAnalyticsSummary(analyticsParams)
  const { metrics: serviceMetrics } = useAnalyticsMetrics()

  // Real-time analytics (optional)
  const { 
    data: realtimeData, 
    isConnected: realtimeConnected 
  } = useRealtimeAnalytics({
    ...analyticsParams,
    enabled: showRealtime
  })

  // Use real-time data if available, otherwise use regular data
  const displayData = showRealtime && realtimeData ? realtimeData : data

  // Memoized chart data
  const chartData = useMemo(() => {
    if (!displayData) return []
    
    return displayData.map(item => ({
      period: new Date(item.period).toLocaleDateString(),
      ...item.metrics
    }))
  }, [displayData])

  // Error state
  if (isError) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-red-800 mb-2">
          Failed to Load Analytics
        </h3>
        <p className="text-red-600">
          {error?.message || 'An error occurred while loading analytics data.'}
        </p>
        <button 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Notification Analytics
        </h2>
        {showRealtime && (
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              realtimeConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600">
              {realtimeConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        )}
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({
                ...prev,
                startDate: new Date(e.target.value)
              }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({
                ...prev,
                endDate: new Date(e.target.value)
              }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Notifications"
          value={summary?.totalNotifications || 0}
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Delivery Rate"
          value={summary?.averageDeliveryRate || 0}
          format="percentage"
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Open Rate"
          value={summary?.averageOpenRate || 0}
          format="percentage"
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Click Rate"
          value={summary?.averageClickRate || 0}
          format="percentage"
          isLoading={summaryLoading}
        />
      </div>

      {/* Service Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Service Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {serviceMetrics.eventsQueued}
            </div>
            <div className="text-sm text-gray-600">Queued</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {serviceMetrics.eventsSent}
            </div>
            <div className="text-sm text-gray-600">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {serviceMetrics.eventsFailedToSend}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {serviceMetrics.batchesSent}
            </div>
            <div className="text-sm text-gray-600">Batches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {serviceMetrics.averageBatchSize.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Avg Batch</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {serviceMetrics.offlineQueueSize}
            </div>
            <div className="text-sm text-gray-600">Offline</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SimpleChart data={chartData} metric="delivery_rate" />
          <SimpleChart data={chartData} metric="open_rate" />
          <SimpleChart data={chartData} metric="click_rate" />
          <SimpleChart data={chartData} metric="conversion_rate" />
        </div>
      )}

      {/* Loading State */}
      {isLoading && chartData.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!isLoading && chartData.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Analytics Data
          </h3>
          <p className="text-gray-600">
            No notification analytics data available for the selected date range.
          </p>
        </div>
      )}
    </div>
  )
}

export default NotificationAnalyticsDashboard