'use client'

/**
 * Skill Mastery Chart Component
 * 
 * Implements interactive mastery visualization with:
 * - Real-time skill mastery data visualization
 * - Interactive charts and progress tracking
 * - Confidence levels and practice history
 * - Comparative analysis and trends
 * - Requirements: 3.1, 3.2, 3.4, 3.5
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useProgress } from '@/contexts/ProgressContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Loader2, 
  BarChart3, 
  TrendingUp, 
  Target, 
  Clock,
  Award,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react'
import type { SkillMastery } from '@/types/user-service'

export interface SkillMasteryChartProps {
  className?: string
  showConfidence?: boolean
  showPracticeCount?: boolean
  maxSkills?: number
}

type SortOption = 'mastery' | 'confidence' | 'practice-count' | 'last-practiced' | 'alphabetical'
type FilterOption = 'all' | 'mastered' | 'in-progress' | 'not-started'

export function SkillMasteryChart({ 
  className,
  showConfidence = true,
  showPracticeCount = true,
  maxSkills = 20
}: SkillMasteryChartProps) {
  const {
    skillMasteries,
    isLoading,
    error,
    getSkillMastery,
    isTopicMastered,
    clearError,
  } = useProgress()

  const [sortBy, setSortBy] = useState<SortOption>('mastery')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart')

  const skills = useMemo(() => {
    let skillsArray = Array.from(skillMasteries.values())

    // Apply filters
    switch (filterBy) {
      case 'mastered':
        skillsArray = skillsArray.filter(skill => isTopicMastered(skill.topic))
        break
      case 'in-progress':
        skillsArray = skillsArray.filter(skill => 
          skill.mastery > 0 && !isTopicMastered(skill.topic)
        )
        break
      case 'not-started':
        skillsArray = skillsArray.filter(skill => skill.mastery === 0)
        break
    }

    // Apply sorting
    switch (sortBy) {
      case 'mastery':
        skillsArray.sort((a, b) => b.mastery - a.mastery)
        break
      case 'confidence':
        skillsArray.sort((a, b) => b.confidence - a.confidence)
        break
      case 'practice-count':
        skillsArray.sort((a, b) => b.practiceCount - a.practiceCount)
        break
      case 'last-practiced':
        skillsArray.sort((a, b) => {
          const aTime = a.lastPracticed ? new Date(a.lastPracticed).getTime() : 0
          const bTime = b.lastPracticed ? new Date(b.lastPracticed).getTime() : 0
          return bTime - aTime
        })
        break
      case 'alphabetical':
        skillsArray.sort((a, b) => a.topic.localeCompare(b.topic))
        break
    }

    return skillsArray.slice(0, maxSkills)
  }, [skillMasteries, sortBy, filterBy, maxSkills, isTopicMastered])

  const stats = useMemo(() => {
    const allSkills = Array.from(skillMasteries.values())
    return {
      total: allSkills.length,
      mastered: allSkills.filter(skill => isTopicMastered(skill.topic)).length,
      inProgress: allSkills.filter(skill => 
        skill.mastery > 0 && !isTopicMastered(skill.topic)
      ).length,
      notStarted: allSkills.filter(skill => skill.mastery === 0).length,
      averageMastery: allSkills.length > 0 
        ? allSkills.reduce((sum, skill) => sum + skill.mastery, 0) / allSkills.length
        : 0,
      averageConfidence: allSkills.length > 0
        ? allSkills.reduce((sum, skill) => sum + skill.confidence, 0) / allSkills.length
        : 0,
    }
  }, [skillMasteries, isTopicMastered])

  const handleSkillClick = useCallback((skillTopic: string) => {
    setShowDetails(showDetails === skillTopic ? null : skillTopic)
  }, [showDetails])

  const getMasteryColor = useCallback((mastery: number) => {
    if (mastery >= 0.8) return 'bg-green-500'
    if (mastery >= 0.6) return 'bg-blue-500'
    if (mastery >= 0.4) return 'bg-yellow-500'
    if (mastery >= 0.2) return 'bg-orange-500'
    return 'bg-gray-300'
  }, [])

  const getMasteryLabel = useCallback((mastery: number) => {
    if (mastery >= 0.8) return 'Mastered'
    if (mastery >= 0.6) return 'Advanced'
    if (mastery >= 0.4) return 'Intermediate'
    if (mastery >= 0.2) return 'Beginner'
    return 'Not Started'
  }, [])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading skill mastery data...</span>
        </CardContent>
      </Card>
    )
  }

  if (skills.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              No skill mastery data available yet. Start practicing to see your progress!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Skill Mastery Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'chart' ? 'list' : 'chart')}
            >
              {viewMode === 'chart' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.mastered}</div>
            <div className="text-xs text-muted-foreground">Mastered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(stats.averageMastery * 100)}%</div>
            <div className="text-xs text-muted-foreground">Avg Mastery</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(stats.averageConfidence * 100)}%</div>
            <div className="text-xs text-muted-foreground">Avg Confidence</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <BarChart3 className="h-4 w-4" />
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

        {/* Controls */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                <SelectItem value="mastered">Mastered</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mastery">By Mastery</SelectItem>
              <SelectItem value="confidence">By Confidence</SelectItem>
              <SelectItem value="practice-count">By Practice Count</SelectItem>
              <SelectItem value="last-practiced">By Last Practiced</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewMode} onValueChange={(value: 'chart' | 'list') => setViewMode(value)}>
          <TabsList>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <div className="space-y-4">
              {skills.map((skill) => (
                <div key={skill.topic} className="space-y-2">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                    onClick={() => handleSkillClick(skill.topic)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{skill.topic}</span>
                        <Badge variant="outline" className={getMasteryColor(skill.mastery)}>
                          {getMasteryLabel(skill.mastery)}
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Mastery</span>
                          <span>{Math.round(skill.mastery * 100)}%</span>
                        </div>
                        <Progress value={skill.mastery * 100} className="h-2" />
                      </div>
                      {showConfidence && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Confidence</span>
                            <span>{Math.round(skill.confidence * 100)}%</span>
                          </div>
                          <Progress value={skill.confidence * 100} className="h-1" />
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      {showPracticeCount && (
                        <div className="text-sm text-muted-foreground">
                          {skill.practiceCount} practices
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {skill.lastPracticed 
                          ? new Date(skill.lastPracticed).toLocaleDateString()
                          : 'Never practiced'
                        }
                      </div>
                    </div>
                  </div>

                  {showDetails === skill.topic && (
                    <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Mastery Level</div>
                          <div className="text-muted-foreground">
                            {Math.round(skill.mastery * 100)}% ({getMasteryLabel(skill.mastery)})
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Confidence</div>
                          <div className="text-muted-foreground">
                            {Math.round(skill.confidence * 100)}%
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Practice Sessions</div>
                          <div className="text-muted-foreground">
                            {skill.practiceCount} total
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Last Practiced</div>
                          <div className="text-muted-foreground">
                            {skill.lastPracticed 
                              ? new Date(skill.lastPracticed).toLocaleDateString()
                              : 'Never'
                            }
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Target className="h-4 w-4 mr-2" />
                          Practice Now
                        </Button>
                        <Button size="sm" variant="outline">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          View Progress
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Skill</th>
                    <th className="text-left p-2">Mastery</th>
                    {showConfidence && <th className="text-left p-2">Confidence</th>}
                    {showPracticeCount && <th className="text-left p-2">Practices</th>}
                    <th className="text-left p-2">Last Practiced</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((skill) => (
                    <tr key={skill.topic} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{skill.topic}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Progress value={skill.mastery * 100} className="w-20 h-2" />
                          <span className="text-sm">{Math.round(skill.mastery * 100)}%</span>
                        </div>
                      </td>
                      {showConfidence && (
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Progress value={skill.confidence * 100} className="w-20 h-2" />
                            <span className="text-sm">{Math.round(skill.confidence * 100)}%</span>
                          </div>
                        </td>
                      )}
                      {showPracticeCount && (
                        <td className="p-2 text-sm">{skill.practiceCount}</td>
                      )}
                      <td className="p-2 text-sm text-muted-foreground">
                        {skill.lastPracticed 
                          ? new Date(skill.lastPracticed).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className={getMasteryColor(skill.mastery)}>
                          {getMasteryLabel(skill.mastery)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        {skills.length === maxSkills && (
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              Showing top {maxSkills} skills. Use filters to see more specific results.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default SkillMasteryChart