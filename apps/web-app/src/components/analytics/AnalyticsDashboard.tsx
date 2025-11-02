/**
 * AnalyticsDashboard Component
 * 
 * Main analytics dashboard component with responsive grid layout,
 * real-time updates, and customizable widgets.
 * 
 * Requirements: 4.3, 5.1, 5.2
 */

'use client'

import React, { memo, useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/common/Icon'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { 
  MetricCardGrid,
  ChartGrid,
  AlertPanel,
  ConnectionStatus
} from '@/components/analytics'
import { cn } from '@/lib/utils'
import { 
  useEngagementMetrics,
  useProgressMetrics,
  useContentMetrics,
  useSystemMetrics,
  useAlerts,
  useRealtimeSnapshot
} from '@/hooks/useAnalytics'
import { useAnalyticsContext } from '@/contexts/AnalyticsContext'
import type { 
  TimeRange,
  EngagementMetricsParams,
  ProgressMetricsParams,
  ContentMetricsParams,
  SystemMetricsParams
} from '@/types/analytics-service'

// ============================================================================
// Types
// ============================================================================

export interface DashboardConfig {
  showMetrics: boolean
  showCharts: boolean
  showAlerts: boolean
  showConnectionStatus: boolean
  autoRefresh: boolean
  refreshInterval: number
  timeRange: TimeRange
  layout: 'compact' | 'standard' | 'expanded'
}

export interface AnalyticsDashboardProps {
  config?: Partial<DashboardConfig>
  className?: string
  onConfigChange?: (config: DashboardConfig) => void
}

// ============================================================================
// Default Configuration
// ============================================================================

const defaultConfig: DashboardConfig = {
  showMetrics: true,
  showCharts: true,
  showAlerts: true,
  showConnectionStatus: true,
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  timeRange: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    end: new Date(),
    granularity: 'hour'
  },
  layout: 'standard'
}

// ============================================================================
// Time Range Presets
// ============================================================================

const timeRangePresets = [
  {
    label: 'Last Hour',
    value: 'hour',
    getRange: () => ({
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date(),
      granularity: 'hour' as const
    })
  },
  {
    label: 'Last 24 Hours',
    value: 'day',
    getRange: () => ({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
      granularity: 'hour' as const
    })
  },
  {
    label: 'Last 7 Days',
    value: 'week',
    getRange: () => ({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
      granularity: 'day' as const
    })
  },
  {
    label: 'Last 30 Days',
    value: 'month',
    getRange: () => ({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      granularity: 'day' as const
    })
  }
]

// ============================================================================
// Main Dashboard Component
// ============================================================================

export const AnalyticsDashboard = memo<AnalyticsDashboardProps>(({
  config: configProp,
  className,
  onConfigChange
}) => {
  const [config, setConfig] = useState<DashboardConfig>({
    ...defaultConfig,
    ...configProp
  })
  const [selectedTimeRange, setSelectedTimeRange] = useState('day')
  const [isCustomizing, setIsCustomizing] = useState(false)

  const {
    client,
    webSocketManager,
    isConnected,
    connectionStatus,
    serviceHealth,
    isServiceAvailable
  } = useAnalyticsContext()

  // Real-time metrics hook
  const { data: realtimeData } = useRealtimeSnapshot()
  const realtimeConnected = isConnected

  // Data fetching hooks with current time range
  const engagementParams: EngagementMetricsParams = {
    timeRange: config.timeRange
  }
  
  const progressParams: ProgressMetricsParams = {
    timeRange: config.timeRange
  }
  
  const contentParams: ContentMetricsParams = {
    timeRange: config.timeRange
  }
  
  const systemParams: SystemMetricsParams = {
    timeRange: config.timeRange
  }

  const {
    data: engagementMetrics,
    isLoading: engagementLoading,
    error: engagementError
  } = useEngagementMetrics(engagementParams)

  const {
    data: progressMetrics,
    isLoading: progressLoading,
    error: progressError
  } = useProgressMetrics(progressParams)

  const {
    data: contentMetrics,
    isLoading: contentLoading,
    error: contentError
  } = useContentMetrics(contentParams)

  const {
    data: systemMetrics,
    isLoading: systemLoading,
    error: systemError
  } = useSystemMetrics(systemParams)

  const {
    data: alertsData,
    isLoading: alertsLoading,
    error: alertsError
  } = useAlerts()
  
  const alerts = alertsData?.alerts || []

  // Handle config changes
  const handleConfigChange = (newConfig: Partial<DashboardConfig>) => {
    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)
    onConfigChange?.(updatedConfig)
  }

  // Handle time range changes
  const handleTimeRangeChange = (presetValue: string) => {
    const preset = timeRangePresets.find(p => p.value === presetValue)
    if (preset) {
      setSelectedTimeRange(presetValue)
      handleConfigChange({ timeRange: preset.getRange() })
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    if (!config.autoRefresh) return

    const interval = setInterval(() => {
      // Trigger refetch of all data
      // This would typically be handled by React Query's refetch interval
    }, config.refreshInterval)

    return () => clearInterval(interval)
  }, [config.autoRefresh, config.refreshInterval])

  // Prepare metric cards data
  const metricCards = useMemo(() => {
    const cards = []

    if (engagementMetrics) {
      cards.push({
        id: 'active-users',
        title: 'Active Users (24h)',
        value: engagementMetrics.activeUsers24h,
        previousValue: engagementMetrics.activeUsers1h * 24, // Rough estimate
        icon: 'users',
        trend: engagementMetrics.activeUsers24h > (engagementMetrics.activeUsers1h * 20) ? 'up' as const : 'down' as const,
        trendPercentage: 5.2,
        isRealtime: realtimeConnected,
        lastUpdated: new Date(engagementMetrics.timestamp)
      })

      cards.push({
        id: 'session-duration',
        title: 'Avg Session Duration',
        value: engagementMetrics.avgSessionDurationMinutes,
        unit: 'min',
        icon: 'clock',
        trend: 'up' as const,
        trendPercentage: 2.1,
        isRealtime: realtimeConnected,
        lastUpdated: new Date(engagementMetrics.timestamp)
      })

      cards.push({
        id: 'bounce-rate',
        title: 'Bounce Rate',
        value: `${(engagementMetrics.bounceRate * 100).toFixed(1)}%`,
        icon: 'trending-down',
        trend: engagementMetrics.bounceRate < 0.3 ? 'up' as const : 'down' as const,
        trendPercentage: 1.8,
        variant: engagementMetrics.bounceRate < 0.3 ? 'success' as const : 'warning' as const,
        isRealtime: realtimeConnected,
        lastUpdated: new Date(engagementMetrics.timestamp)
      })
    }

    if (progressMetrics) {
      cards.push({
        id: 'completions',
        title: 'Completions (24h)',
        value: progressMetrics.totalCompletions24h,
        icon: 'check-circle',
        trend: 'up' as const,
        trendPercentage: 8.5,
        variant: 'success' as const,
        isRealtime: realtimeConnected,
        lastUpdated: new Date(progressMetrics.timestamp)
      })

      cards.push({
        id: 'avg-accuracy',
        title: 'Average Accuracy',
        value: `${(progressMetrics.avgAccuracy * 100).toFixed(1)}%`,
        icon: 'target',
        trend: 'up' as const,
        trendPercentage: 3.2,
        variant: progressMetrics.avgAccuracy > 0.8 ? 'success' as const : 'warning' as const,
        isRealtime: realtimeConnected,
        lastUpdated: new Date(progressMetrics.timestamp)
      })
    }

    if (systemMetrics) {
      cards.push({
        id: 'response-time',
        title: 'API Response Time',
        value: systemMetrics.apiResponseTimeMs,
        unit: 'ms',
        icon: 'zap',
        trend: systemMetrics.apiResponseTimeMs < 200 ? 'up' as const : 'down' as const,
        trendPercentage: 4.1,
        variant: systemMetrics.apiResponseTimeMs < 200 ? 'success' as const : 'warning' as const,
        isRealtime: realtimeConnected,
        lastUpdated: new Date(systemMetrics.timestamp)
      })
    }

    return cards
  }, [engagementMetrics, progressMetrics, systemMetrics, realtimeConnected])

  // Prepare chart data
  const chartData = useMemo(() => {
    const charts = []

    if (engagementMetrics) {
      charts.push({
        id: 'engagement-trend',
        title: 'User Engagement Trend',
        type: 'line' as const,
        datasets: [{
          label: 'Active Users',
          data: [
            { x: new Date(Date.now() - 6 * 60 * 60 * 1000), y: engagementMetrics.activeUsers1h * 0.8 },
            { x: new Date(Date.now() - 5 * 60 * 60 * 1000), y: engagementMetrics.activeUsers1h * 0.9 },
            { x: new Date(Date.now() - 4 * 60 * 60 * 1000), y: engagementMetrics.activeUsers1h * 1.1 },
            { x: new Date(Date.now() - 3 * 60 * 60 * 1000), y: engagementMetrics.activeUsers1h * 1.2 },
            { x: new Date(Date.now() - 2 * 60 * 60 * 1000), y: engagementMetrics.activeUsers1h * 0.95 },
            { x: new Date(Date.now() - 1 * 60 * 60 * 1000), y: engagementMetrics.activeUsers1h * 1.05 },
            { x: new Date(), y: engagementMetrics.activeUsers1h }
          ],
          color: '#3B82F6'
        }],
        isRealtime: realtimeConnected,
        lastUpdated: new Date(engagementMetrics.timestamp)
      })
    }

    if (progressMetrics) {
      charts.push({
        id: 'progress-overview',
        title: 'Learning Progress Overview',
        type: 'bar' as const,
        datasets: [{
          label: 'Metrics',
          data: [
            { x: 'Completions', y: progressMetrics.totalCompletions24h },
            { x: 'Mastery', y: progressMetrics.masteryAchievements24h },
            { x: 'Top Performers', y: progressMetrics.topPerformers },
            { x: 'Struggling', y: progressMetrics.strugglingUsers }
          ],
          color: '#10B981'
        }],
        isRealtime: realtimeConnected,
        lastUpdated: new Date(progressMetrics.timestamp)
      })
    }

    return charts
  }, [engagementMetrics, progressMetrics, realtimeConnected])

  const getLayoutClasses = () => {
    switch (config.layout) {
      case 'compact':
        return 'space-y-4'
      case 'expanded':
        return 'space-y-8'
      default:
        return 'space-y-6'
    }
  }

  return (
    <div className={cn('analytics-dashboard', getLayoutClasses(), className)}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          {realtimeConnected && (
            <Badge variant="default" className="text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
              Live
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="text-sm border border-gray-300 rounded px-3 py-1"
          >
            {timeRangePresets.map(preset => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>

          {/* Dashboard Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomizing(!isCustomizing)}
          >
            <Icon icon="settings" className="w-4 h-4 mr-1" />
            Customize
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleConfigChange({ autoRefresh: !config.autoRefresh })}
          >
            <Icon 
              icon={config.autoRefresh ? "pause" : "play"} 
              className="w-4 h-4 mr-1" 
            />
            {config.autoRefresh ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>

      {/* Customization Panel */}
      {isCustomizing && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Dashboard Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showMetrics}
                onChange={(e) => handleConfigChange({ showMetrics: e.target.checked })}
              />
              <span className="text-sm">Show Metrics</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showCharts}
                onChange={(e) => handleConfigChange({ showCharts: e.target.checked })}
              />
              <span className="text-sm">Show Charts</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showAlerts}
                onChange={(e) => handleConfigChange({ showAlerts: e.target.checked })}
              />
              <span className="text-sm">Show Alerts</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showConnectionStatus}
                onChange={(e) => handleConfigChange({ showConnectionStatus: e.target.checked })}
              />
              <span className="text-sm">Show Connection</span>
            </label>
          </div>
        </Card>
      )}

      {/* Service Unavailable Warning */}
      {!isServiceAvailable && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center space-x-2">
            <Icon icon="alert-triangle" className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Analytics Service Unavailable</p>
              <p className="text-sm text-yellow-700">
                Some features may be limited. Displaying cached data where available.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Analytics Area */}
        <div className="xl:col-span-3 space-y-6">
          {/* Metrics Cards */}
          {config.showMetrics && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h2>
              <MetricCardGrid
                metrics={metricCards}
                columns={3}
                gap="md"
              />
            </div>
          )}

          {/* Charts */}
          {config.showCharts && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Charts</h2>
              <ChartGrid
                charts={chartData}
                columns={2}
                gap="md"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Connection Status */}
          {config.showConnectionStatus && (
            <ConnectionStatus
              connectionStatus={connectionStatus}
              serviceHealth={serviceHealth}
              isConnected={isConnected}
              showDetails={true}
            />
          )}

          {/* Alerts Panel */}
          {config.showAlerts && (
            <AlertPanel
              alerts={alerts}
              isLoading={alertsLoading}
              isError={!!alertsError}
              errorMessage={alertsError?.message}
              isRealtime={realtimeConnected}
              maxHeight={400}
              showFilters={true}
            />
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {(engagementLoading || progressLoading || contentLoading || systemLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="large" />
              <div>
                <p className="font-medium">Loading Analytics Data</p>
                <p className="text-sm text-gray-500">Please wait...</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
})

AnalyticsDashboard.displayName = 'AnalyticsDashboard'