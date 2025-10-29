/**
 * Activity Dashboard Component
 * 
 * Demonstrates the new activity monitoring and analytics capabilities
 * implemented in tasks 7.1, 7.2, 7.3, and 7.4
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useActivity } from '@/contexts/ActivityContext'
import type {
  ActivityType,
  DateRange
} from '@/types/user-service'
import type {
  EngagementTrend,
  ActivityReport,
  UsageAnalytics
} from '@/contexts/ActivityContext'

interface ActivityDashboardProps {
  className?: string
}

export function ActivityDashboard({ className = '' }: ActivityDashboardProps) {
  const {
    summary,
    engagementMetrics,
    insights,
    recommendations,
    currentSession,
    isLoading,
    error,
    recordActivity,
    calculateEngagementTrends,
    detectBehaviorPatterns,
    generateActivityReport,
    getUsageAnalytics,
    exportActivityData,
    enableBatching,
    getSessionStats,
    state,
  } = useActivity()

  // State for analytics data
  const [engagementTrends, setEngagementTrends] = useState<EngagementTrend[]>([])
  const [activityReport, setActivityReport] = useState<ActivityReport | null>(null)
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null)
  const [selectedDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date(),
  })
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')

  // Load analytics data
  useEffect(() => {
    if (!summary) return

    const loadAnalytics = async () => {
      setIsAnalyticsLoading(true)
      try {
        // Load engagement trends
        const trends = await calculateEngagementTrends(7)
        setEngagementTrends(trends)

        // Generate activity report
        const report = await generateActivityReport(selectedDateRange)
        setActivityReport(report)

        // Get usage analytics
        const analytics = await getUsageAnalytics()
        setUsageAnalytics(analytics)

        // Detect behavior patterns
        await detectBehaviorPatterns()

      } catch (error) {
        console.error('Failed to load analytics data:', error)
      } finally {
        setIsAnalyticsLoading(false)
      }
    }

    loadAnalytics()
  }, [summary, selectedDateRange, calculateEngagementTrends, generateActivityReport, getUsageAnalytics, detectBehaviorPatterns])

  // Handle activity recording for demo purposes
  const handleRecordActivity = async (activityType: ActivityType) => {
    try {
      await recordActivity(activityType, {
        source: 'dashboard_demo',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to record activity:', error)
    }
  }

  // Handle data export
  const handleExportData = async () => {
    try {
      const exportedData = await exportActivityData(exportFormat)
      
      // Create download link
      const blob = new Blob([exportedData], { 
        type: exportFormat === 'json' ? 'application/json' : 'text/csv' 
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `activity-data-${new Date().toISOString().split('T')[0]}.${exportFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export data:', error)
    }
  }

  const sessionStats = getSessionStats()

  if (isLoading) {
    return (
      <div className={`activity-dashboard ${className}`}>
        <div className="loading-state">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`activity-dashboard ${className}`}>
        <div className="error-state text-center py-8">
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Activity Data</h3>
          <p className="text-red-600">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className={`activity-dashboard ${className}`}>
        <div className="empty-state text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Data</h3>
          <p className="text-gray-600">Start using the platform to see your activity dashboard.</p>
          <div className="mt-4 space-x-2">
            <button
              onClick={() => handleRecordActivity('practice_start')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              Record Practice Activity
            </button>
            <button
              onClick={() => handleRecordActivity('navigation')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700"
            >
              Record Navigation
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`activity-dashboard ${className}`}>
      <div className="dashboard-header mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Activity Dashboard</h2>
        <p className="text-gray-600">
          Comprehensive insights into your learning activity and engagement patterns
        </p>
      </div>

      {isAnalyticsLoading && (
        <div className="loading-overlay mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-800 text-sm">Loading analytics...</span>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Activity Overview */}
        <div className="overview-card bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Activities</span>
              <span className="font-medium">{summary.totalActivities.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Days</span>
              <span className="font-medium">{Object.keys(summary.dailyDistribution).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Top Topics</span>
              <span className="font-medium">{summary.topTopics.length}</span>
            </div>
            {engagementMetrics && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Streak</span>
                  <span className="font-medium">{engagementMetrics.dailyActiveStreak} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Session</span>
                  <span className="font-medium">
                    {Math.round((engagementMetrics.averageSessionDuration || engagementMetrics.averageSessionLength) / 60)} min
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Current Session */}
        {currentSession && (
          <div className="session-card bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Session</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Started</span>
                <span className="font-medium">
                  {currentSession.startTime.toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">
                  {Math.round((Date.now() - currentSession.startTime.getTime()) / 60000)} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Activities</span>
                <span className="font-medium">{currentSession.activities.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Device</span>
                <span className="font-medium capitalize">{currentSession.metadata.deviceType}</span>
              </div>
            </div>
          </div>
        )}

        {/* Session Statistics */}
        <div className="session-stats-card bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Sessions</span>
              <span className="font-medium">{sessionStats.totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Duration</span>
              <span className="font-medium">
                {Math.round(sessionStats.averageDuration / 60000)} min
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Longest Session</span>
              <span className="font-medium">
                {Math.round(sessionStats.longestSession / 60000)} min
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Sessions</span>
              <span className="font-medium">{sessionStats.activeSessions}</span>
            </div>
          </div>
        </div>

        {/* Engagement Trends */}
        {engagementTrends.length > 0 && (
          <div className="trends-card bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Trends (Last 7 Days)</h3>
            <div className="space-y-3">
              {engagementTrends.slice(-5).map((trend, index) => (
                <div key={index} className="trend-item border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">
                      {trend.date.toLocaleDateString()}
                    </span>
                    <span className={`text-sm font-medium ${
                      trend.engagementScore > 0.7 ? 'text-green-600' : 
                      trend.engagementScore > 0.4 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(trend.engagementScore * 100)}% engaged
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{trend.activityCount} activities</span>
                    <span>{Math.round(trend.sessionDuration / 60)} min session</span>
                  </div>
                  {trend.topActivities.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      Top: {trend.topActivities.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Insights */}
        {insights.length > 0 && (
          <div className="insights-card bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Insights</h3>
            <div className="space-y-3">
              {insights.slice(0, 4).map((insight) => (
                <div key={insight.id} className="insight-item border-l-4 border-blue-400 pl-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      insight.priority >= 8 ? 'bg-red-100 text-red-800' :
                      insight.priority >= 6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {insight.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      Priority: {insight.priority}/10
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm">{insight.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Recommendations */}
        {recommendations.length > 0 && (
          <div className="recommendations-card bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
            <div className="space-y-3">
              {recommendations.slice(0, 4).map((recommendation) => (
                <div key={recommendation.id} className="recommendation-item border-l-4 border-green-400 pl-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      recommendation.priority >= 8 ? 'bg-red-100 text-red-800' :
                      recommendation.priority >= 6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {recommendation.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      Impact: {Math.round(recommendation.estimatedImpact * 100)}%
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm">{recommendation.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{recommendation.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Analytics */}
        {usageAnalytics && (
          <div className="usage-analytics-card bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Analytics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Engagement Score</span>
                <span className="font-medium">
                  {Math.round(usageAnalytics.engagementScore * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Retention Rate</span>
                <span className="font-medium">
                  {Math.round(usageAnalytics.retentionRate * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Sessions</span>
                <span className="font-medium">{usageAnalytics.averageSessionsPerUser}</span>
              </div>
              {usageAnalytics.mostActiveHours.length > 0 && (
                <div>
                  <span className="text-gray-600 text-sm">Most Active Hours:</span>
                  <div className="mt-1 text-sm font-medium">
                    {usageAnalytics.mostActiveHours.map(hour => `${hour}:00`).join(', ')}
                  </div>
                </div>
              )}
              {usageAnalytics.topFeatures.length > 0 && (
                <div>
                  <span className="text-gray-600 text-sm">Top Features:</span>
                  <div className="mt-1 text-sm font-medium">
                    {usageAnalytics.topFeatures.slice(0, 3).join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Report Summary */}
        {activityReport && (
          <div className="report-card bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Report</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Report Period</span>
                <span className="font-medium text-sm">
                  {activityReport.dateRange.start.toLocaleDateString()} - {activityReport.dateRange.end.toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Activities</span>
                <span className="font-medium">{activityReport.totalActivities}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unique Days</span>
                <span className="font-medium">{activityReport.uniqueDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Session</span>
                <span className="font-medium">
                  {Math.round(activityReport.averageSessionDuration / 60)} min
                </span>
              </div>
              {activityReport.topActivities.length > 0 && activityReport.topActivities[0] && (
                <div>
                  <span className="text-gray-600 text-sm">Top Activity:</span>
                  <div className="mt-1 text-sm font-medium">
                    {activityReport.topActivities[0].type} ({activityReport.topActivities[0].count})
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Performance Controls */}
        <div className="controls-card bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Controls</h3>
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={state.batchingEnabled}
                  onChange={(e) => enableBatching(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Enable Activity Batching</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Batch activities for better performance
              </p>
            </div>
            
            <div>
              <span className="text-sm text-gray-600">Pending Activities:</span>
              <span className="ml-2 font-medium">{state.pendingActivities.length}</span>
            </div>
            
            <div>
              <span className="text-sm text-gray-600">Last Batch:</span>
              <span className="ml-2 font-medium text-xs">
                {state.lastBatchTime ? state.lastBatchTime.toLocaleTimeString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Data Export */}
        <div className="export-card bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Export</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            
            <button
              onClick={handleExportData}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Export Activity Data
            </button>
            
            <div className="text-xs text-gray-500">
              Exports recent activities, sessions, and metrics
            </div>
          </div>
        </div>

        {/* Demo Activity Recording */}
        <div className="demo-card bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Activities</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleRecordActivity('practice')}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm hover:bg-green-700"
            >
              Record Practice
            </button>
            <button
              onClick={() => handleRecordActivity('review')}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md text-sm hover:bg-yellow-700"
            >
              Record Review
            </button>
            <button
              onClick={() => handleRecordActivity('assessment')}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md text-sm hover:bg-purple-700"
            >
              Record Assessment
            </button>
            <button
              onClick={() => handleRecordActivity('navigation')}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md text-sm hover:bg-gray-700"
            >
              Record Navigation
            </button>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Click buttons to record demo activities and see real-time updates
          </div>
        </div>

      </div>

      {/* Debug Information */}
      <div className="debug-info mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Debug Information</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Analytics loaded: {isAnalyticsLoading ? 'Loading...' : 'Complete'}</div>
          <div>Insights: {insights.length} items</div>
          <div>Recommendations: {recommendations.length} items</div>
          <div>Engagement trends: {engagementTrends.length} items</div>
          <div>Current session: {currentSession ? 'Active' : 'None'}</div>
          <div>Total activities: {summary.totalActivities}</div>
          <div>Batching enabled: {state.batchingEnabled ? 'Yes' : 'No'}</div>
          <div>Pending activities: {state.pendingActivities.length}</div>
          <div>Real-time enabled: {state.isRealTimeEnabled ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
  )
}

export default ActivityDashboard