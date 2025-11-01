/**
 * Notification Performance Example Component
 * Demonstrates Task 12 implementation with performance monitoring
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// Simple icon components
const Activity = ({ className }: { className?: string }) => <span className={className}>📊</span>
const Zap = ({ className }: { className?: string }) => <span className={className}>⚡</span>
const Database = ({ className }: { className?: string }) => <span className={className}>💾</span>
const Globe = ({ className }: { className?: string }) => <span className={className}>🌐</span>
const RefreshCw = ({ className }: { className?: string }) => <span className={className}>🔄</span>

// Mock performance data for demonstration
const mockPerformanceStats = {
  monitoring: {
    totalRequests: 1247,
    averageResponseTime: 342,
    errorRate: 0.023,
    cacheHitRate: 0.87,
    alertCount: 2
  },
  optimization: {
    batchedRequests: 156,
    debouncedRequests: 89,
    deduplicatedRequests: 34,
    bandwidthSaved: 2.4 * 1024 * 1024 // 2.4MB
  },
  lazyLoading: {
    componentsLoaded: 12,
    imagesLoaded: 45,
    bytesLoaded: 1.8 * 1024 * 1024, // 1.8MB
    cacheHits: 23
  },
  webVitals: {
    lcp: 1850,
    inp: 120,
    cls: 0.08,
    fcp: 1200,
    ttfb: 450
  },
  overall: {
    performanceScore: 87,
    health: 'good' as const,
    recommendations: [
      'Consider implementing more aggressive caching for static assets',
      'Optimize image loading for better LCP scores'
    ]
  }
}

export function NotificationPerformanceExample() {
  const [stats, setStats] = useState(mockPerformanceStats)
  const [isLoading, setIsLoading] = useState(false)

  const refreshStats = () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setStats({
        ...mockPerformanceStats,
        monitoring: {
          ...mockPerformanceStats.monitoring,
          totalRequests: mockPerformanceStats.monitoring.totalRequests + Math.floor(Math.random() * 10),
          averageResponseTime: mockPerformanceStats.monitoring.averageResponseTime + Math.floor(Math.random() * 100) - 50
        }
      })
      setIsLoading(false)
    }, 1000)
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-50'
      case 'good': return 'text-blue-600 bg-blue-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Performance Monitor</h2>
          <p className="text-gray-600">
            Task 12 Implementation - Performance Optimization and Monitoring
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshStats}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Overall Performance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${stats.overall.performanceScore}%` }}
                />
              </div>
            </div>
            <div className="ml-4 text-right">
              <div className="text-2xl font-bold">
                {stats.overall.performanceScore}/100
              </div>
              <Badge className={getHealthColor(stats.overall.health)}>
                {stats.overall.health.toUpperCase()}
              </Badge>
            </div>
          </div>
          {stats.overall.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Recommendations:</h4>
              <ul className="space-y-1">
                {stats.overall.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Response Time</p>
                <p className="text-2xl font-bold">
                  {stats.monitoring.averageResponseTime}
                  <span className="text-sm font-normal ml-1">ms</span>
                </p>
              </div>
              <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                <Activity className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold">
                  {(stats.monitoring.errorRate * 100).toFixed(1)}
                  <span className="text-sm font-normal ml-1">%</span>
                </p>
              </div>
              <div className="p-2 rounded-full bg-red-50 text-red-600">
                <Globe className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cache Hit Rate</p>
                <p className="text-2xl font-bold">
                  {(stats.monitoring.cacheHitRate * 100).toFixed(0)}
                  <span className="text-sm font-normal ml-1">%</span>
                </p>
              </div>
              <div className="p-2 rounded-full bg-green-50 text-green-600">
                <Database className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">
                  {stats.monitoring.totalRequests.toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-full bg-purple-50 text-purple-600">
                <Zap className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Stats */}
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

      {/* Web Vitals */}
      <Card>
        <CardHeader>
          <CardTitle>Core Web Vitals</CardTitle>
          <CardDescription>Performance metrics for user experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(stats.webVitals).map(([metric, value]) => (
              <div key={metric} className="text-center">
                <div className="text-2xl font-bold">
                  {value?.toFixed(metric === 'cls' ? 3 : 0)}
                  <span className="text-sm font-normal ml-1">
                    {metric === 'cls' ? '' : 'ms'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {metric.toUpperCase()}
                </div>
                <div className="text-xs text-gray-500">
                  {metric === 'lcp' && 'Largest Contentful Paint'}
                  {metric === 'inp' && 'Interaction to Next Paint'}
                  {metric === 'cls' && 'Cumulative Layout Shift'}
                  {metric === 'fcp' && 'First Contentful Paint'}
                  {metric === 'ttfb' && 'Time to First Byte'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Status */}
      <Card>
        <CardHeader>
          <CardTitle>Task 12 Implementation Status</CardTitle>
          <CardDescription>Performance Optimization and Monitoring Components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">✅ Completed Components:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Performance Monitor (12.1)</li>
                <li>• Request Optimizer (12.2)</li>
                <li>• Lazy Loader (12.3)</li>
                <li>• Performance Manager</li>
                <li>• Performance Dashboard (12.4)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🚀 Features Implemented:</h4>
              <ul className="space-y-1 text-sm">
                <li>• API request performance tracking</li>
                <li>• Request batching and debouncing</li>
                <li>• Component lazy loading</li>
                <li>• Web Vitals monitoring</li>
                <li>• Performance budgets and alerting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}