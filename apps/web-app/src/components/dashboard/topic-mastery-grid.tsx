"use client";

import { TopicMastery } from "@/types/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

interface TopicMasteryGridProps {
  topics: TopicMastery[];
}

export function TopicMasteryGrid({ topics }: TopicMasteryGridProps) {
  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.8) return "bg-green-500";
    if (mastery >= 0.6) return "bg-yellow-500";
    if (mastery >= 0.4) return "bg-orange-500";
    return "bg-red-500";
  };

  const getMasteryLabel = (mastery: number) => {
    if (mastery >= 0.8) return "Mastered";
    if (mastery >= 0.6) return "Good";
    if (mastery >= 0.4) return "Learning";
    return "Needs Work";
  };

  const getMasteryTextColor = (mastery: number) => {
    if (mastery >= 0.8) return "text-green-700";
    if (mastery >= 0.6) return "text-yellow-700";
    if (mastery >= 0.4) return "text-orange-700";
    return "text-red-700";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />;
      case "declining":
        return <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />;
      default:
        return <MinusIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatLastPracticed = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const sortedTopics = [...topics].sort((a, b) => {
    // Sort by mastery level (lowest first for priority)
    if (a.mastery !== b.mastery) {
      return a.mastery - b.mastery;
    }
    // Then by trend (declining first)
    if (a.trend !== b.trend) {
      if (a.trend === "declining") return -1;
      if (b.trend === "declining") return 1;
      if (a.trend === "improving") return 1;
      if (b.trend === "improving") return -1;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-700">
            {topics.filter((t) => t.mastery >= 0.8).length}
          </div>
          <div className="text-sm text-green-600">Mastered</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-700">
            {topics.filter((t) => t.mastery >= 0.6 && t.mastery < 0.8).length}
          </div>
          <div className="text-sm text-yellow-600">Good Progress</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-700">
            {topics.filter((t) => t.mastery >= 0.4 && t.mastery < 0.6).length}
          </div>
          <div className="text-sm text-orange-600">Learning</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-700">
            {topics.filter((t) => t.mastery < 0.4).length}
          </div>
          <div className="text-sm text-red-600">Needs Work</div>
        </div>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedTopics.map((topic) => (
          <Card key={topic.topic} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 truncate">
                      {topic.topic}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={clsx(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          getDifficultyColor(topic.difficulty)
                        )}
                      >
                        {topic.difficulty}
                      </span>
                      {getTrendIcon(topic.trend)}
                    </div>
                  </div>

                  {/* Mastery Icon */}
                  <div className="flex-shrink-0">
                    {topic.mastery >= 0.8 ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-500" />
                    ) : topic.mastery < 0.4 ? (
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                    ) : (
                      <ClockIcon className="w-6 h-6 text-yellow-500" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className={getMasteryTextColor(topic.mastery)}>
                      {getMasteryLabel(topic.mastery)}
                    </span>
                    <span className="text-gray-600">
                      {Math.round(topic.mastery * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={clsx(
                        "h-2 rounded-full transition-all duration-300",
                        getMasteryColor(topic.mastery)
                      )}
                      style={{ width: `${topic.mastery * 100}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">
                      {topic.accuracy.toFixed(0)}%
                    </span>
                    <span className="block">Accuracy</span>
                  </div>
                  <div>
                    <span className="font-medium">
                      {topic.questionsAttempted}
                    </span>
                    <span className="block">Questions</span>
                  </div>
                </div>

                {/* Last Practiced */}
                <div className="text-xs text-gray-500">
                  Last practiced: {formatLastPracticed(topic.lastPracticed)}
                </div>

                {/* Action Button */}
                <Link
                  href={`/practice?type=practice&topic=${encodeURIComponent(
                    topic.topic
                  )}`}
                >
                  <Button
                    size="sm"
                    fullWidth
                    variant={topic.mastery < 0.6 ? "default" : "outline"}
                  >
                    {topic.mastery < 0.4
                      ? "Start Learning"
                      : topic.mastery < 0.6
                      ? "Continue Practice"
                      : "Review"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {topics.length === 0 && (
        <div className="text-center py-12">
          <AcademicCapIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Topics Yet
          </h3>
          <p className="text-gray-600 mb-4">
            Start practicing to see your topic mastery progress here.
          </p>
          <Link href="/practice?type=practice">
            <Button>Start Practicing</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
