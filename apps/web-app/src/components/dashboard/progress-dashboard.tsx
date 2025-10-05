"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { analyticsApi } from "@/lib/api/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressChart } from "./progress-chart";
import { TopicMasteryGrid } from "./topic-mastery-grid";
import { AchievementsList } from "./achievements-list";
import { StudyGoals } from "./study-goals";
import { PerformanceInsights } from "./performance-insights";
import { LearningPathSelector } from "./learning-path-selector";
import { SocialLeaderboard } from "./social-leaderboard";
import {
  ChartBarIcon,
  TrophyIcon,
  AcademicCapIcon,
  ClockIcon,
  FireIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

interface ProgressDashboardProps {
  timeframe?: "week" | "month" | "quarter" | "year";
  onCreateGoal?: (goal: any) => Promise<void>;
  onUpdateGoal?: (goalId: string, updates: any) => Promise<void>;
  onDeleteGoal?: (goalId: string) => Promise<void>;
  onDismissInsight?: (insightId: string) => Promise<void>;
  onSelectLearningPath?: (pathId: string) => Promise<void>;
}

export function ProgressDashboard({
  timeframe = "month",
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  onDismissInsight,
  onSelectLearningPath,
}: ProgressDashboardProps) {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "topics" | "achievements" | "goals" | "social"
  >("overview");

  // Fetch user statistics
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ["userStats", user?.id],
    queryFn: () => (user ? analyticsApi.getUserStats(user.id) : null),
    enabled: !!user,
  });

  // Fetch topic mastery
  const { data: topicMastery, isLoading: masteryLoading } = useQuery({
    queryKey: ["topicMastery", user?.id],
    queryFn: () => (user ? analyticsApi.getTopicMastery(user.id) : null),
    enabled: !!user,
  });

  // Fetch progress timeline
  const { data: progressTimeline, isLoading: timelineLoading } = useQuery({
    queryKey: ["progressTimeline", user?.id, timeframe],
    queryFn: () =>
      user
        ? analyticsApi.getProgressTimeline(user.id, {
            granularity: timeframe === "week" ? "day" : "week",
            startDate: getStartDate(timeframe),
          })
        : null,
    enabled: !!user,
  });

  // Fetch achievements
  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["achievements", user?.id],
    queryFn: () => (user ? analyticsApi.getAchievements(user.id) : null),
    enabled: !!user,
  });

  // Fetch study goals
  const { data: studyGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ["studyGoals", user?.id],
    queryFn: () => (user ? analyticsApi.getStudyGoals(user.id) : null),
    enabled: !!user,
  });

  // Fetch performance insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["performanceInsights", user?.id],
    queryFn: () => (user ? analyticsApi.getPerformanceInsights(user.id) : null),
    enabled: !!user,
  });

  // Fetch learning paths
  const { data: learningPaths, isLoading: pathsLoading } = useQuery({
    queryKey: ["learningPaths", user?.id],
    queryFn: () => (user ? analyticsApi.getLearningPaths(user.id) : null),
    enabled: !!user,
  });

  function getStartDate(timeframe: string): string {
    const now = new Date();
    switch (timeframe) {
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case "quarter":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case "year":
        return new Date(
          now.getTime() - 365 * 24 * 60 * 60 * 1000
        ).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  if (statsLoading || !userStats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: ChartBarIcon },
    { id: "topics", label: "Topics", icon: AcademicCapIcon },
    { id: "achievements", label: "Achievements", icon: TrophyIcon },
    { id: "goals", label: "Goals", icon: ClockIcon },
    { id: "social", label: "Leaderboard", icon: ArrowTrendingUpIcon },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Accuracy
            </CardTitle>
            <TrophyIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats.accuracy.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              +{userStats.improvementRate.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <FireIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats.studyStreak} days
            </div>
            <p className="text-xs text-muted-foreground">
              {userStats.questionsPerDay.toFixed(1)} questions/day avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Topics Mastered
            </CardTitle>
            <AcademicCapIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats.masteredTopics}/{userStats.totalTopics}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (userStats.masteredTopics / userStats.totalTopics) *
                100
              ).toFixed(0)}
              % complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.timeStudied}h</div>
            <p className="text-xs text-muted-foreground">
              {userStats.averageSessionTime} min avg session
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {selectedTab === "overview" && (
          <>
            {/* Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Progress Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {progressTimeline && !timelineLoading ? (
                  <ProgressChart
                    data={progressTimeline}
                    timeframe={timeframe}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Learning Path and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Learning Path</CardTitle>
                </CardHeader>
                <CardContent>
                  {learningPaths && !pathsLoading ? (
                    <LearningPathSelector
                      paths={learningPaths}
                      onSelectPath={onSelectLearningPath}
                    />
                  ) : (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  {insights && !insightsLoading ? (
                    <PerformanceInsights
                      insights={insights}
                      onDismiss={onDismissInsight}
                    />
                  ) : (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {selectedTab === "topics" && (
          <Card>
            <CardHeader>
              <CardTitle>Topic Mastery</CardTitle>
            </CardHeader>
            <CardContent>
              {topicMastery && !masteryLoading ? (
                <TopicMasteryGrid topics={topicMastery} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedTab === "achievements" && (
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {achievements && !achievementsLoading ? (
                <AchievementsList achievements={achievements} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedTab === "goals" && (
          <Card>
            <CardHeader>
              <CardTitle>Study Goals</CardTitle>
            </CardHeader>
            <CardContent>
              {studyGoals && !goalsLoading ? (
                <StudyGoals
                  goals={studyGoals}
                  onCreateGoal={onCreateGoal}
                  onUpdateGoal={onUpdateGoal}
                  onDeleteGoal={onDeleteGoal}
                />
              ) : (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedTab === "social" && (
          <SocialLeaderboard timeframe="week" category="overall" />
        )}
      </div>
    </div>
  );
}
