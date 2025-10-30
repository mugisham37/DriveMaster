'use client'

/**
 * Progress Dashboard Component
 * 
 * Implements comprehensive progress overview with:
 * - Real-time progress data from user-service integration
 * - Interactive progress visualization
 * - Skill mastery tracking and trends
 * - Learning streak display and motivation
 * - Requirements: 3.1, 3.2, 3.4, 3.5
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useProgress } from '@/contexts/ProgressContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Loader2, 
  TrendingUp, 
  Target, 
  Award, 
  Calendar, 
  BarChart3,
  Flame,
  Trophy,
  Clock,
  RefreshCw
} from 'lucide-react'
import type { TimeRange } from '@/types/user-service'

export interface ProgressDashboardProps {
  className?: string
  showDetailedView?: boolean
}

export function ProgressDashboard({ 
  className, 
  showDetailedView = true 
}: ProgressDashboardProps) {
  const {
    summary,
    skillMasteries,
    learningStreak,
    milestones,
    weeklyProgress,
    isLoading,
    error,
    fetchProgressSummary,
    getProgressTrends,
    getOverallProgress,
    clearError,
  } = useProgress()

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('last-30-days')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true)
      await fetchProgressSummary()
    } catch (error) {
      console.error('Failed to refresh progress:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchProgressSummary])

  const handleTimeRangeChange = useCallback(async (range: TimeRange) => {
    setSelectedTimeRange(range)
    try {
      await getProgressTrends(range)
    } catch (error) {
      console.error('Failed to fetch trends:', error)
    }
  }, [getProgressTrends])

  const overallProgress = getOverallProgress()
  
  const topSkills = useMemo(() => {
    return Array.from(skillMasteries.values())
      .sort((a, b) => b.mastery - a.mastery)
      .slice(0, 5)
  }, [skillMasteries])

  const recentMilestones = useMemo(() => {
    return milestones
      .filter(m => m.achieved)
      .sort((a, b) => new Date(b.achievedAt || 0).getTime() - new Date(a.achievedAt || 0).getTime())
      .slice(0, 3)
  }, [milestones])

  const upcomingMilestones = useMemo(() => {
    return milestones
      .filter(m => !m.achieved)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3)
  }, [milestones])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading progress data...</span>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              No progress data available yet. Start learning to see your progress here!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <TrendingUp className="h-4 w-4" />
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
          <h2 className="text-2xl font-bold">Progress Dashboard</h2>
          <p className="text-muted-foreground">
            Track your learning journey and achievements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={handleTimeRangeChange}>
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

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
            <Progress value={overallProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {summary.totalTopicsStarted} topics started
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learningStreak?.currentStreak || 0}</div>
            <p className="text-xs text-muted-foreground">
              days • Best: {learningStreak?.longestStreak || 0} days
            </p>
            <div className="flex items-center mt-2">
              <Badge variant={learningStreak?.isActive ? "default" : "secondary"}>
                {learningStreak?.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Topics Mastered</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTopicsMastered}</div>
            <p className="text-xs text-muted-foreground">
              of {summary.totalTopicsStarted} started
            </p>
            <Progress 
              value={(summary.totalTopicsMastered / Math.max(summary.totalTopicsStarted, 1)) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(summary.totalStudyTimeMinutes / 60)}h
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalStudyTimeMinutes} minutes total
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {Math.round(summary.averageSessionDuration)} min/session
            </p>
          </CardContent>
        </Card>
      </div>

      {showDetailedView && (
        <Tabs defaultValue="skills" className="space-y-4">
          <TabsList>
            <TabsTrigger value="skills">Top Skills</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Skills by Mastery
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topSkills.length > 0 ? (
                  <div className="space-y-4">
                    {topSkills.map((skill) => (
                      <div key={skill.topic} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{skill.topic}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {Math.round(skill.mastery * 100)}%
                            </Badge>
                            <Badge variant="secondary">
                              {skill.practiceCount} practices
                            </Badge>
                          </div>
                        </div>
                        <Progress value={skill.mastery * 100} />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Confidence: {Math.round(skill.confidence * 100)}%</span>
                          <span>
                            Last practiced: {
                              skill.lastPracticed 
                                ? new Date(skill.lastPracticed).toLocaleDateString()
                                : 'Never'
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No skills data available yet. Start practicing to see your progress!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="milestones" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentMilestones.length > 0 ? (
                    <div className="space-y-3">
                      {recentMilestones.map((milestone) => (
                        <div key={milestone.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Trophy className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{milestone.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {milestone.achievedAt 
                                ? new Date(milestone.achievedAt).toLocaleDateString()
                                : 'Recently achieved'
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No achievements yet. Keep learning to unlock milestones!
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Upcoming Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingMilestones.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingMilestones.map((milestone) => (
                        <div key={milestone.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{milestone.title}</span>
                            <Badge variant="outline">
                              {Math.round(milestone.progress * 100)}%
                            </Badge>
                          </div>
                          <Progress value={milestone.progress * 100} />
                          <p className="text-xs text-muted-foreground">
                            {milestone.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      All milestones achieved! Great job!
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weekly Progress Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyProgress.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="text-xs font-medium text-muted-foreground">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {weeklyProgress.slice(-7).map((point, index) => (
                        <div 
                          key={index}
                          className="aspect-square rounded bg-gray-100 flex items-center justify-center text-xs font-medium"
                          style={{
                            backgroundColor: point.practiceMinutes > 0 
                              ? `hsl(142, 76%, ${Math.max(30, 90 - (point.practiceMinutes / 60) * 20)}%)`
                              : undefined
                          }}
                        >
                          {point.practiceMinutes > 0 ? Math.round(point.practiceMinutes) : ''}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Less</span>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((level) => (
                          <div 
                            key={level}
                            className="w-3 h-3 rounded"
                            style={{
                              backgroundColor: level === 0 
                                ? '#f3f4f6' 
                                : `hsl(142, 76%, ${90 - level * 15}%)`
                            }}
                          />
                        ))}
                      </div>
                      <span>More</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No weekly progress data available yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default ProgressDashboard