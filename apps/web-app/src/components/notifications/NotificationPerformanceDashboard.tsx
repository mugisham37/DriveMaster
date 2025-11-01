/**
 * Notification Performance Dashboard Component
 * Implements Task 12.4: Performance Metrics Dashboard
 * 
 * Provides comprehensive performance visualization for notification system:
 * - Real-time performance tracking and alerting
 * - Performance comparison and trend analysis capabilities
 * - Performance optimization recommendations based on metrics
 * 
 * Requirements: 7.1, 7.2
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
// Simple chart components using HTML/CSS
const SimpleLineChart = ({ data, dataKey, color = '#8884d8' }: { 
  data: ChartDataPoint[], 
  dataKey: keyof ChartDataPoint, 
  color?: string 
}) => {
  const maxValue = Math.max(...data.map(d => d[dataKey] as number))
  const minValue = Math.min(...data.map(d => d[dataKey] as number))
  const range = maxValue - minValue || 1

  return (
    <div className="relative h-64 w-full">
      <svg className="w-full h-full" viewBox="0 0 400 200">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={data.map((point, index) => {
            const x = (index / (data.length - 1)) * 380 + 10
            const y = 190 - ((point[dataKey] as number - minValue) / range) * 180
            return `${x},${y}`
          }).join(' ')}
        />
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * 380 + 10
          const y = 190 - ((point[dataKey] as number - minValue) / range) * 180
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill={color}
            />
          )
        })}
      </svg>
      <div className="absolute bottom-0 left-0 text-xs text-muted-foreground">
        {minValue.toFixed(1)}
      </div>
      <div className="absolute top-0 left-0 text-xs text-muted-foreground">
        {maxValue.toFixed(1)}
      </div>
    </div>
  )
}

const SimplePieChart = ({ data }: { data: Array<{ name: string, value: number, color: string }> }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = 0

  return (
    <div className="flex items-center justify-center h-64">
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {data.map((item, index) => {
            const percentage = item.value / total
            const angle = percentage * 360
            const startAngle = currentAngle
            const endAngle = currentAngle + angle
            currentAngle += angle

            const startX = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180)
            const startY = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180)
            const endX = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180)
            const endY = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180)
            const largeArc = angle > 180 ? 1 : 0

            return (
              <path
                key={index}
                d={`M 100 100 L ${startX} ${startY} A 80 80 0 ${largeArc} 1 ${endX} ${endY} Z`}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
      </div>
      <div className="ml-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm">{item.name}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
// Simple icon components using text/symbols
const Activity = ({ className }: { className?: string }) => <span className={className}>📊</span>
const AlertTriangle = ({ className }: { className?: string }) => <span className={className}>⚠️</span>
const TrendingUp = ({ className }: { className?: string }) => <span className={className}>📈</span>
const TrendingDown = ({ className }: { className?: string }) => <span className={className}>📉</span>
const Zap = ({ className }: { className?: string }) => <span className={className}>⚡</span>
const RefreshCw = ({ className }: { className?: string }) => <span className={className}>🔄</span>
const Download = ({ className }: { className?: string }) => <span className={className}>💾</span>
import { 
  getNotificationPerformanceManager,
  NotificationPerformanceStats 
} from '@/lib/notification-service/performance-manager'
import { 
  getNotificationPerformanceMonitor,
  PerformanceAlert 
} from '@/lib/notification-service/performance-monitor'

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  status: 'excellent' | 'good' | 'warning' | 'critical'
}

interface ChartDataPoint {
  timestamp: string
  responseTime: number
  errorRate: number
  cacheHitRate: number
  throughput: number
}

export function NotificationPerformanceDashboard() {
  const [stats, setStats] = useState<NotificationPerformanceStats | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const refreshInterval = 30000 // 30 seconds

  // Load performance data
  useEffect(() => {
    loadPerformanceData()
    
    if (autoRefresh) {
      const interval = setInterval(loadPerformanceData, refreshInterval)
      return () => clearInterval(interval)
    }
    return undefined
  }, [autoRefresh, refreshInterval])

  const loadPerformanceData = async (): Promise<void> => {
    try {
      const performanceManager = getNotificationPerformanceManager()
      const performanceMonitor = getNotificationPerformanceMonitor()
      
      const currentStats = performanceManager.getStats()
      const currentAlerts = performanceMonitor.getAlerts(10)
      
      setStats(currentStats)
      setAlerts(currentAlerts)
      
      // Update chart data
      setChartData(prev => {
        const newDataPoint: ChartDataPoint = {
          timestamp: new Date().toLocaleTimeString(),
          responseTime: currentStats.monitoring.averageResponseTime,
          errorRate: currentStats.monitoring.errorRate * 100,
          cacheHitRate: currentStats.monitoring.cacheHitRate * 100,
          throughput: currentStats.monitoring.totalRequests
        }
        
        const updated = [...prev, newDataPoint]
        return updated.slice(-20) // Keep last 20 data points
      })
      
      setIsLoading(false)
    } catch (error) {
      console.error('[PerformanceDashboard] Failed to load data:', error)
      setIsLoading(false)
    }
  }

  // Calculate performance metrics
  const performanceMetrics = useMemo((): PerformanceMetric[] => {
    if (!stats) return []

    return [
      {
        name: 'Response Time',
        value: stats.monitoring.averageResponseTime,
        unit: 'ms',
        trend: stats.monitoring.averageResponseTime < 500 ? 'down' : 'up',
        status: stats.monitoring.averageResponseTime < 500 ? 'excellent' : 
                stats.monitoring.averageResponseTime < 1000 ? 'good' :
                stats.monitoring.averageResponseTime < 2000 ? 'warning' : 'critical'
      },
      {
        name: 'Error Rate',
        value: stats.monitoring.errorRate * 100,
        unit: '%',
        trend: stats.monitoring.errorRate < 0.01 ? 'down' : 'up',
        status: stats.monitoring.errorRate < 0.01 ? 'excellent' :
                stats.monitoring.errorRate < 0.05 ? 'good' :
                stats.monitoring.errorRate < 0.1 ? 'warning' : 'critical'
      },
      {
        name: 'Cache Hit Rate',
        value: stats.monitoring.cacheHitRate * 100,
        unit: '%',
        trend: stats.monitoring.cacheHitRate > 0.8 ? 'up' : 'down',
        status: stats.monitoring.cacheHitRate > 0.9 ? 'excellent' :
                stats.monitoring.cacheHitRate > 0.8 ? 'good' :
                stats.monitoring.cacheHitRate > 0.6 ? 'warning' : 'critical'
      },
      {
        name: 'Throughput',
        value: stats.monitoring.totalRequests,
        unit: 'req',
        trend: 'stable',
        status: 'good'
      }
    ]
  }, [stats])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50'
      case 'good': return 'text-blue-600 bg-blue-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4" />
      case 'down': return <TrendingDown className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  // Export performance data
  const exportData = () => {
    if (!stats) return

    const performanceMonitor = getNotificationPerformanceMonitor()
    const exportData = performanceMonitor.exportData()
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notification-performance-${new Date().toISOString()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    )
  }

  if (!stats) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Performance Data Unavailable</AlertTitle>
        <AlertDescription>
          Unable to load notification performance data. Please ensure the performance monitor is initialized.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and optimize notification system performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Overall Performance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Progress 
                value={stats.overall.performanceScore} 
                className="h-3"
              />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {stats.overall.performanceScore}/100
              </div>
              <Badge className={getStatusColor(stats.overall.health)}>
                {stats.overall.health.toUpperCase()}
              </Badge>
            </div>
          </div>
          {stats.overall.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Recommendations:</h4>
              <ul className="space-y-1">
                {stats.overall.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric) => (
          <Card key={metric.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.name}</p>
                  <p className="text-2xl font-bold">
                    {metric.value.toFixed(metric.name === 'Throughput' ? 0 : 1)}
                    <span className="text-sm font-normal ml-1">{metric.unit}</span>
                  </p>
                </div>
                <div className={`p-2 rounded-full ${getStatusColor(metric.status)}`}>
                  {getTrendIcon(metric.trend)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <Alert key={alert.id} className={alert.type === 'critical' ? 'border-red-200' : 'border-yellow-200'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    {alert.metric.replace(/_/g, ' ').toUpperCase()}
                    <Badge variant={alert.type === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.type}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    {alert.message}
                    <div className="text-xs text-muted-foreground mt-1">
                      {alert.timestamp.toLocaleString()}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Charts */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="resources">Resource Usage</TabsTrigger>
          <TabsTrigger value="webvitals">Web Vitals</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend</CardTitle>
                <CardDescription>Average API response time over time</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleLineChart 
                  data={chartData} 
                  dataKey="responseTime" 
                  color="#8884d8" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate & Cache Performance</CardTitle>
                <CardDescription>Error rate and cache hit rate trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Error Rate (%)</h4>
                    <SimpleLineChart 
                      data={chartData} 
                      dataKey="errorRate" 
                      color="#ff7300" 
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Cache Hit Rate (%)</h4>
                    <SimpleLineChart 
                      data={chartData} 
                      dataKey="cacheHitRate" 
                      color="#00ff00" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Request Optimization</CardTitle>
                <CardDescription>Batching and optimization statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Batched Requests</span>
                    <span className="font-bold">{stats.optimization.batchedRequests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Debounced Requests</span>
                    <span className="font-bold">{stats.optimization.debouncedRequests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Deduplicated Requests</span>
                    <span className="font-bold">{stats.optimization.deduplicatedRequests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Bandwidth Saved</span>
                    <span className="font-bold">
                      {(stats.optimization.bandwidthSaved / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lazy Loading Performance</CardTitle>
                <CardDescription>Code splitting and lazy loading metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Components Loaded</span>
                    <span className="font-bold">{stats.lazyLoading.componentsLoaded}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Images Loaded</span>
                    <span className="font-bold">{stats.lazyLoading.imagesLoaded}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cache Hits</span>
                    <span className="font-bold">{stats.lazyLoading.cacheHits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Data Loaded</span>
                    <span className="font-bold">
                      {(stats.lazyLoading.bytesLoaded / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage Distribution</CardTitle>
              <CardDescription>Breakdown of system resource utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <SimplePieChart 
                data={[
                  { name: 'API Requests', value: stats.monitoring.totalRequests, color: '#0088FE' },
                  { name: 'Cache Operations', value: Math.round(stats.monitoring.cacheHitRate * 100), color: '#00C49F' },
                  { name: 'Lazy Loading', value: stats.lazyLoading.componentsLoaded, color: '#FFBB28' },
                  { name: 'Optimizations', value: stats.optimization.batchedRequests, color: '#FF8042' }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webvitals" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Object.entries(stats.webVitals).map(([metric, value]) => (
              <Card key={metric}>
                <CardHeader>
                  <CardTitle className="text-sm">{metric.toUpperCase()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {value?.toFixed(1) || 'N/A'}
                    <span className="text-sm font-normal ml-1">
                      {metric === 'cls' ? '' : 'ms'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {metric === 'lcp' && 'Largest Contentful Paint'}
                    {metric === 'inp' && 'Interaction to Next Paint'}
                    {metric === 'cls' && 'Cumulative Layout Shift'}
                    {metric === 'fcp' && 'First Contentful Paint'}
                    {metric === 'ttfb' && 'Time to First Byte'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}