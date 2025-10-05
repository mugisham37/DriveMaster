"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ProgressDashboard } from "@/components/dashboard/progress-dashboard";
import { analyticsApi } from "@/lib/api/analytics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  BookOpenIcon,
  ChartBarIcon,
  ClockIcon,
  TrophyIcon,
  FireIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState<"overview" | "detailed">(
    "overview"
  );

  // Mock data - in real implementation, this would come from API
  const stats = {
    totalQuestions: 1247,
    correctAnswers: 892,
    accuracy: 71.5,
    studyStreak: 7,
    timeStudied: 45, // hours
    masteredTopics: 12,
    totalTopics: 18,
  };

  const recentActivity = [
    { topic: "Traffic Signs", questions: 15, accuracy: 80, date: "2024-01-15" },
    { topic: "Road Rules", questions: 12, accuracy: 75, date: "2024-01-14" },
    { topic: "Parking", questions: 8, accuracy: 87.5, date: "2024-01-13" },
  ];

  const upcomingReviews = [
    { topic: "Speed Limits", dueIn: "2 hours", difficulty: "Medium" },
    { topic: "Right of Way", dueIn: "4 hours", difficulty: "Hard" },
    { topic: "Emergency Procedures", dueIn: "1 day", difficulty: "Easy" },
  ];

  // Mutations for goal management
  const createGoalMutation = useMutation({
    mutationFn: (goal: any) => analyticsApi.createStudyGoal(user!.id, goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studyGoals", user?.id] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, updates }: { goalId: string; updates: any }) =>
      analyticsApi.updateStudyGoal(user!.id, goalId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studyGoals", user?.id] });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: string) =>
      analyticsApi.deleteStudyGoal(user!.id, goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studyGoals", user?.id] });
    },
  });

  const dismissInsightMutation = useMutation({
    mutationFn: (insightId: string) =>
      analyticsApi.dismissInsight(user!.id, insightId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["performanceInsights", user?.id],
      });
    },
  });

  const selectLearningPathMutation = useMutation({
    mutationFn: (pathId: string) =>
      analyticsApi.updateLearningPath(user!.id, pathId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learningPaths", user?.id] });
    },
  });

  return (
    <MainLayout
      title="Dashboard"
      description="Welcome back! Here's your learning progress overview."
    >
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {user?.email?.split("@")[0]}! 👋
              </h2>
              <p className="text-blue-100">
                You're on a {stats.studyStreak}-day study streak! Keep up the
                great work.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedView === "overview" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedView("overview")}
                className={
                  selectedView === "overview"
                    ? ""
                    : "text-white border-white hover:bg-white hover:text-blue-600"
                }
              >
                Overview
              </Button>
              <Button
                variant={selectedView === "detailed" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedView("detailed")}
                className={
                  selectedView === "detailed"
                    ? ""
                    : "text-white border-white hover:bg-white hover:text-blue-600"
                }
              >
                <ChartBarIcon className="w-4 h-4 mr-1" />
                Detailed
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/practice?type=practice">
              <Button variant="secondary" size="lg">
                <BookOpenIcon className="w-5 h-5 mr-2" />
                Continue Learning
              </Button>
            </Link>
            <Link href="/practice?type=review">
              <Button
                variant="outline"
                size="lg"
                className="text-white border-white hover:bg-white hover:text-blue-600"
              >
                <ClockIcon className="w-5 h-5 mr-2" />
                Review Session
              </Button>
            </Link>
          </div>
        </div>

        {/* Conditional Content Based on View */}
        {selectedView === "overview" ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Questions
                  </CardTitle>
                  <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalQuestions.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.correctAnswers} correct answers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Accuracy
                  </CardTitle>
                  <TrophyIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.accuracy}%</div>
                  <p className="text-xs text-muted-foreground">
                    +2.1% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Study Streak
                  </CardTitle>
                  <FireIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.studyStreak} days
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Personal best: 12 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Mastered Topics
                  </CardTitle>
                  <AcademicCapIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.masteredTopics}/{stats.totalTopics}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(
                      (stats.masteredTopics / stats.totalTopics) * 100
                    )}
                    % complete
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your practice sessions from the last few days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{activity.topic}</h4>
                          <p className="text-sm text-gray-600">
                            {activity.questions} questions • {activity.accuracy}
                            % accuracy
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(activity.date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => setSelectedView("detailed")}
                    >
                      View Detailed Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Reviews</CardTitle>
                  <CardDescription>
                    Topics scheduled for spaced repetition review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingReviews.map((review, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{review.topic}</h4>
                          <p className="text-sm text-gray-600">
                            Difficulty: {review.difficulty}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          {review.dueIn}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Link href="/practice?type=review">
                      <Button fullWidth>Start Review Session</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Jump into different learning modes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/practice?type=practice">
                    <Button
                      variant="outline"
                      fullWidth
                      className="h-20 flex-col"
                    >
                      <BookOpenIcon className="w-6 h-6 mb-2" />
                      Adaptive Practice
                    </Button>
                  </Link>
                  <Link href="/practice?type=review">
                    <Button
                      variant="outline"
                      fullWidth
                      className="h-20 flex-col"
                    >
                      <ClockIcon className="w-6 h-6 mb-2" />
                      Spaced Review
                    </Button>
                  </Link>
                  <Link href="/practice?type=mock_test">
                    <Button
                      variant="outline"
                      fullWidth
                      className="h-20 flex-col"
                    >
                      <TrophyIcon className="w-6 h-6 mb-2" />
                      Mock Test
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Detailed Analytics View */
          <ProgressDashboard
            timeframe="month"
            onCreateGoal={async (goal) => {
              await createGoalMutation.mutateAsync(goal);
            }}
            onUpdateGoal={async (goalId, updates) => {
              await updateGoalMutation.mutateAsync({ goalId, updates });
            }}
            onDeleteGoal={async (goalId) => {
              await deleteGoalMutation.mutateAsync(goalId);
            }}
            onDismissInsight={async (insightId) => {
              await dismissInsightMutation.mutateAsync(insightId);
            }}
            onSelectLearningPath={async (pathId) => {
              await selectLearningPathMutation.mutateAsync(pathId);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}
