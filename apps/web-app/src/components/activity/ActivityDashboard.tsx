'use client'

/**
 * Activity Dashboard Component
 * 
 * Implements comprehensive activity monitoring with:
 * - Real-time activity data and engagement metrics
 * - Interactive activity visualization and trends
 * - Personalized insights and recommendations
 * - Session tracking and analytics
 * - Requirements: 4.1, 4.2, 4.3, 4.4
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useActivity } from '@/contexts/ActivityContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Loader2, 
  Activity, 
  TrendingUp, 
  Clock, 
  Target,
  BarChart3,
  Calendar,
  Lightbulb,
  RefreshCw,
  Play,
  Pause,
  Users
} from 'lucide-react'
import type { DateRange, ActivityType } from '@/types/user-service'

export interface ActivityDashboardProps {
  className?: string
  showRecommendations?: boolean
  showInsights?: boolean
}

export function ActivityDashboard({ 
  className,
  showRecommendations = true,
  showInsights = true
}: ActivityDashboardProps) {
  const {
    summary,
    engagementMetrics,
    insights,
    recommendations,
    currentSession,
    recentActivities,
    isLoading,
    error,
    fetchActivitySummary,
    fetchEngagementMetrics,
    getCurrentSessionDuration,
    getActivityCount,
    getSessionStats,
    clearError,
  } = useActivity()

  const [selectedDateRange, setSelectedDateRange] = useState<string>('last-30-days')
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType | 'all'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const dateRange: DateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
      await Promise.all([
        fetchActivitySummary(dateRange),
        fetchEngagementMetrics(dateRange)
      ])
    } catch (error) {
      console.error('Failed to refresh activity data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchActivitySummary, fetchEngagementMetrics])

  const handleDateRangeChange = useCallback(async (range: string) => {
    setSelectedDateRange(range)
    
    let days = 30
    switch (range) {
      case 'last-7-days': days = 7; break
      case 'last-30-days': days = 30; break
      case 'last-90-days': days = 90; break
      case 'last-year': days = 365; break
    }

    const dateRange: DateRange = {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date()
    }

    try {
      await Promise.all([
        fetchActivitySummary(dateRange),
        fetchEngagementMetrics(dateRange)
      ])
    } catch (error) {
      console.error('Failed to fetch activity data:', error)
    }
  }, [fetchActivitySummary, fetchEngagementMetrics])

  const sessionStats = getSessionStats()
  const currentSessionDuration = getCurrentSessionDuration()

  const filteredActivities = useMemo(() => {
    if (selectedActivityType === 'all') {
      return recentActivities
    }
    return recentActivities.filter(activity => activity.activityType === selectedActivityType)
  }, [recentActivities, selectedActivityType])

  const topActivities = useMemo(() => {
    if (!summary?.topActivities) return []
    return summary.topActivities.slice(0, 5)
  }, [summary])

  const formatDuration = useCallback((milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }, [])

  const getEngagementLevel = useCallback((score: number) => {
    if (score >= 0.8) return { label: 'Excellent', color: 'text-green-600' }
    if (score >= 0.6) return { label: 'Good', color: 'text-blue-600' }
    if (score >= 0.4) return { label: 'Fair', color: 'text-yellow-600' }
    return { label: 'Low', color: 'text-red-600' }
  }, [])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading activity data...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <Activity className="h-4 w-4" />
          <AlertDescription>
            {error.message}
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2"
              onClick={() => clearError()}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor your learning activities and engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedDateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
              <SelectItem value="last-year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Current Session Card */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentSession.isActive ? (
                <Play className="h-5 w-5 text-green-500" />
              ) : (
                <Pause className="h-5 w-5 text-gray-500" />
              )}
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-2xl font-bold">
                  {formatDuration(currentSessionDuration)}
                </div>
                <p className="text-sm text-muted-foreground">Duration</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {currentSession.activities.length}
                </div>
                <p className="text-sm text-muted-foreground">Activities</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {currentSession.metadata.deviceType}
                </div>
                <p className="text-sm text-muted-foreground">Device</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalActivities || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.dailyAverage || 0} per day average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {engagementMetrics ? Math.round(engagementMetrics.overallScore * 100) : 0}%
            </div>
            {engagementMetrics && (
              <p className={`text-xs ${getEngagementLevel(engagementMetrics.overallScore).color}`}>
                {getEngagementLevel(engagementMetrics.overallScore).label}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.activeDays || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.streakDays || 0} day streak
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatDuration(summary.totalTimeSpent * 60000) : '0m'}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {summary ? formatDuration(summary.averageSessionDuration * 60000) : '0m'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Recent Activities</TabsTrigger>
          {showInsights && <TabsTrigger value="insights">Insights</TabsTrigger>}
          {showRecommendations && <TabsTrigger value="recommendations">Recommendations</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topActivities.length > 0 ? (
                  <div className="space-y-3">
                    {topActivities.map((activity, index) => (
                      <div key={activity.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <span className="font-medium">{activity.type}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{activity.count}</div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round((activity.count / (summary?.totalActivities || 1)) * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No activity data available yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Session Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Total Sessions</span>
                    <span className="font-medium">{sessionStats.totalSessions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average Duration</span>
                    <span className="font-medium">
                      {formatDuration(sessionStats.averageDuration)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Longest Session</span>
                    <span className="font-medium">
                      {formatDuration(sessionStats.longestSession)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active Sessions</span>
                    <Badge variant={sessionStats.activeSessions > 0 ? "default" : "secondary"}>
                      {sessionStats.activeSessions}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {engagementMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Engagement Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Frequency</span>
                      <span className="text-sm font-medium">
                        {Math.round(engagementMetrics.frequencyScore * 100)}%
                      </span>
                    </div>
                    <Progress value={engagementMetrics.frequencyScore * 100} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Duration</span>
                      <span className="text-sm font-medium">
                        {Math.round(engagementMetrics.durationScore * 100)}%
                      </span>
                    </div>
                    <Progress value={engagementMetrics.durationScore * 100} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Consistency</span>
                      <span className="text-sm font-medium">
                        {Math.round(engagementMetrics.consistencyScore * 100)}%
                      </span>
                    </div>
                    <Progress value={engagementMetrics.consistencyScore * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select 
              value={selectedActivityType} 
              onValueChange={(value: ActivityType | 'all') => setSelectedActivityType(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="exercise_start">Exercise Start</SelectItem>
                <SelectItem value="exercise_complete">Exercise Complete</SelectItem>
                <SelectItem value="lesson_view">Lesson View</SelectItem>
                <SelectItem value="solution_submit">Solution Submit</SelectItem>
                <SelectItem value="hint_request">Hint Request</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredActivities.length > 0 ? (
                <div className="space-y-3">
                  {filteredActivities.slice(0, 20).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{activity.activityType}</div>
                          <div className="text-sm text-muted-foreground">
                            {activity.metadata?.topic || 'General activity'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No activities found for the selected filter.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {showInsights && (
          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Personalized Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.length > 0 ? (
                  <div className="space-y-4">
                    {insights.map((insight) => (
                      <div key={insight.id} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Lightbulb className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{insight.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {insight.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{insight.category}</Badge>
                              <Badge variant="secondary">{insight.confidence}% confidence</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No insights available yet. Keep learning to generate personalized insights!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {showRecommendations && (
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.map((recommendation) => (
                      <div key={recommendation.id} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Target className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{recommendation.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {recommendation.description}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              <Button size="sm">
                                {recommendation.actionText}
                              </Button>
                              <Badge variant="outline">{recommendation.priority}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No recommendations available yet. Continue your learning journey to get personalized suggestions!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default ActivityDashboard