/**
 * RealtimeDataVisualization Component
 * 
 * Provides real-time data visualization with live updating charts,
 * pause/resume controls, and data freshness indicators.
 * 
 * Requirements: 3.2, 4.3, 6.3
 */

'use client'

import React, { memo, useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/common/Icon'
import { AnalyticsChart } from './AnalyticsChart'
import { MetricCard } from './MetricCard'
import { cn } from '@/lib/utils'
import { useRealtimeMetrics } from '@/hooks/useAnalytics'
import type { 
  ChartDataset,
  ChartDataPoint,
  MetricCardProps
} from '@/components/analytics'

// ============================================================================
// Types
// ============================================================================

export interface RealtimeVisualizationProps {
  title: string
  maxDataPoints?: number
  updateInterval?: number
  showControls?: boolean
  showFreshnessIndicator?: boolean
  autoScale?: boolean
  className?: string
}

export interface RealtimeMetricDisplayProps {
  title: string
  getValue: (data: any) => number | string
  getUnit?: (data: any) => string
  getTrend?: (current: number, previous: number) => 'up' | 'down' | 'neutral'
  icon?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  className?: string
}

export interface RealtimeChartProps {
  title: string
  dataKey: string
  color?: string
  chartType?: 'line' | 'area' | 'bar'
  maxDataPoints?: number
  showGrid?: boolean
  className?: string
}

// ============================================================================
// Realtime Metric Display Component
// ============================================================================

const RealtimeMetricDisplay = memo<RealtimeMetricDisplayProps>(({
  title,
  getValue,
  getUnit,
  getTrend,
  icon,
  variant = 'default',
  className
}) => {
  const { isConnected } = useRealtimeMetrics()
  const [currentValue, setCurrentValue] = useState<number | string>(0)
  const [previousValue, setPreviousValue] = useState<number | string>(0)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral')

  // Mock data updates for demonstration
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      const mockData = {
        activeUsers: Math.floor(Math.random() * 1000) + 500,
        responseTime: Math.floor(Math.random() * 100) + 50,
        errorRate: Math.random() * 0.05,
        throughput: Math.floor(Math.random() * 500) + 200
      }

      const newValue = getValue(mockData)
      const unit = getUnit?.(mockData)

      setPreviousValue(currentValue)
      setCurrentValue(newValue)
      setLastUpdated(new Date())

      if (getTrend && typeof newValue === 'number' && typeof currentValue === 'number') {
        setTrend(getTrend(newValue, currentValue))
      }
    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [isConnected, currentValue, getValue, getUnit, getTrend])

  const trendPercentage = useMemo(() => {
    if (typeof currentValue === 'number' && typeof previousValue === 'number' && previousValue > 0) {
      return ((currentValue - previousValue) / previousValue) * 100
    }
    return 0
  }, [currentValue, previousValue])

  return (
    <MetricCard
      title={title}
      value={currentValue}
      previousValue={previousValue}
      unit={getUnit?.({ currentValue })}
      icon={icon}
      trend={trend}
      trendPercentage={Math.abs(trendPercentage)}
      isRealtime={isConnected}
      lastUpdated={lastUpdated}
      variant={variant}
      className={className}
    />
  )
})

RealtimeMetricDisplay.displayName = 'RealtimeMetricDisplay'

// ============================================================================
// Realtime Chart Component
// ============================================================================

const RealtimeChart = memo<RealtimeChartProps>(({
  title,
  dataKey,
  color = '#3B82F6',
  chartType = 'line',
  maxDataPoints = 50,
  showGrid = true,
  className
}) => {
  const { isConnected } = useRealtimeMetrics()
  const [dataPoints, setDataPoints] = useState<ChartDataPoint[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Generate mock real-time data
  useEffect(() => {
    if (!isConnected || isPaused) return

    const interval = setInterval(() => {
      const now = new Date()
      const value = Math.floor(Math.random() * 100) + Math.sin(Date.now() / 10000) * 50 + 100

      setDataPoints(prev => {
        const newPoints = [...prev, { x: now, y: value }]
        return newPoints.slice(-maxDataPoints)
      })
      setLastUpdated(now)
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [isConnected, isPaused, maxDataPoints])

  const dataset: ChartDataset = {
    label: title,
    data: dataPoints,
    color,
    fill: chartType === 'area'
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium">{title}</h3>
          {isConnected && (
            <Badge variant="default" className="text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
              Live
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPaused(!isPaused)}
          className="text-xs"
        >
          <Icon name={isPaused ? "play" : "pause"} className="w-3 h-3 mr-1" />
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>

      <AnalyticsChart
        title=""
        type={chartType}
        datasets={[dataset]}
        isRealtime={isConnected && !isPaused}
        lastUpdated={lastUpdated}
        height={200}
        showLegend={false}
        showGrid={showGrid}
        animate={!isPaused}
      />
    </div>
  )
})

RealtimeChart.displayName = 'RealtimeChart'

// ============================================================================
// Main Realtime Visualization Component
// ============================================================================

export const RealtimeDataVisualization = memo<RealtimeVisualizationProps>(({
  title,
  maxDataPoints = 50,
  updateInterval = 1000,
  showControls = true,
  showFreshnessIndicator = true,
  autoScale = true,
  className
}) => {
  const { isConnected } = useRealtimeMetrics()
  const [isPaused, setIsPaused] = useState(false)
  const [dataBuffer, setDataBuffer] = useState<any[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const updateCountRef = useRef(0)

  // Data freshness indicator
  const [freshnessStatus, setFreshnessStatus] = useState<'fresh' | 'stale' | 'offline'>('fresh')

  useEffect(() => {
    if (!isConnected) {
      setFreshnessStatus('offline')
      return
    }

    const checkFreshness = setInterval(() => {
      const timeSinceUpdate = Date.now() - lastUpdate.getTime()
      if (timeSinceUpdate > updateInterval * 3) {
        setFreshnessStatus('stale')
      } else {
        setFreshnessStatus('fresh')
      }
    }, 1000)

    return () => clearInterval(checkFreshness)
  }, [isConnected, lastUpdate, updateInterval])

  const handlePauseResume = useCallback(() => {
    setIsPaused(prev => !prev)
  }, [])

  const handleClearData = useCallback(() => {
    setDataBuffer([])
    updateCountRef.current = 0
  }, [])

  const getFreshnessColor = () => {
    switch (freshnessStatus) {
      case 'fresh':
        return 'text-green-600'
      case 'stale':
        return 'text-yellow-600'
      case 'offline':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getFreshnessIcon = () => {
    switch (freshnessStatus) {
      case 'fresh':
        return 'check-circle'
      case 'stale':
        return 'clock'
      case 'offline':
        return 'wifi-off'
      default:
        return 'help-circle'
    }
  }

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {isConnected && (
            <Badge variant="default" className="text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
              Live Updates
            </Badge>
          )}
        </div>

        {showControls && (
          <div className="flex items-center space-x-2">
            {showFreshnessIndicator && (
              <div className="flex items-center space-x-1">
                <Icon 
                  name={getFreshnessIcon()} 
                  className={cn('w-4 h-4', getFreshnessColor())} 
                />
                <span className={cn('text-xs', getFreshnessColor())}>
                  {freshnessStatus === 'fresh' ? 'Live' : 
                   freshnessStatus === 'stale' ? 'Delayed' : 'Offline'}
                </span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseResume}
              disabled={!isConnected}
            >
              <Icon name={isPaused ? "play" : "pause"} className="w-4 h-4 mr-1" />
              {isPaused ? 'Resume' : 'Pause'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearData}
            >
              <Icon name="trash-2" className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <RealtimeMetricDisplay
          title="Active Users"
          getValue={(data) => data.activeUsers}
          getTrend={(current, previous) => current > previous ? 'up' : current < previous ? 'down' : 'neutral'}
          icon="users"
          variant="default"
        />
        
        <RealtimeMetricDisplay
          title="Response Time"
          getValue={(data) => data.responseTime}
          getUnit={() => 'ms'}
          getTrend={(current, previous) => current < previous ? 'up' : current > previous ? 'down' : 'neutral'}
          icon="zap"
          variant="success"
        />
        
        <RealtimeMetricDisplay
          title="Error Rate"
          getValue={(data) => `${(data.errorRate * 100).toFixed(2)}%`}
          getTrend={(current, previous) => current < previous ? 'up' : current > previous ? 'down' : 'neutral'}
          icon="alert-triangle"
          variant="warning"
        />
        
        <RealtimeMetricDisplay
          title="Throughput"
          getValue={(data) => data.throughput}
          getUnit={() => 'req/s'}
          getTrend={(current, previous) => current > previous ? 'up' : current < previous ? 'down' : 'neutral'}
          icon="activity"
          variant="default"
        />
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealtimeChart
          title="User Activity"
          dataKey="activeUsers"
          color="#3B82F6"
          chartType="area"
          maxDataPoints={maxDataPoints}
        />
        
        <RealtimeChart
          title="System Performance"
          dataKey="responseTime"
          color="#10B981"
          chartType="line"
          maxDataPoints={maxDataPoints}
        />
      </div>

      {/* Data Statistics */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{updateCountRef.current}</div>
            <div className="text-xs text-gray-500">Updates Received</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {lastUpdate.toLocaleTimeString()}
            </div>
            <div className="text-xs text-gray-500">Last Update</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="text-xs text-gray-500">Connection Status</div>
          </div>
        </div>
      </div>

      {/* Offline Notice */}
      {!isConnected && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Icon name="wifi-off" className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Real-time Updates Unavailable</p>
              <p className="text-sm text-yellow-700">
                Connection to analytics service lost. Displaying last known data.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
})

RealtimeDataVisualization.displayName = 'RealtimeDataVisualization'