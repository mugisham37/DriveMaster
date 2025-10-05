"use client";

import { PerformanceInsight } from "@/types/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import { format, parseISO } from "date-fns";
import {
  LightBulbIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  ChartBarIcon,
  XMarkIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

interface PerformanceInsightsProps {
  insights: PerformanceInsight[];
  onDismiss?: (insightId: string) => Promise<void>;
}

export function PerformanceInsights({
  insights,
  onDismiss,
}: PerformanceInsightsProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case "strength":
        return <TrophyIcon className="w-5 h-5 text-green-600" />;
      case "weakness":
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case "recommendation":
        return <LightBulbIcon className="w-5 h-5 text-blue-600" />;
      case "milestone":
        return <ChartBarIcon className="w-5 h-5 text-purple-600" />;
      default:
        return <LightBulbIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getInsightColor = (type: string, priority: string) => {
    const baseColors = {
      strength: "bg-green-50 border-green-200",
      weakness: "bg-red-50 border-red-200",
      recommendation: "bg-blue-50 border-blue-200",
      milestone: "bg-purple-50 border-purple-200",
    };

    const priorityIntensity = {
      high: "ring-2 ring-opacity-50",
      medium: "ring-1 ring-opacity-30",
      low: "",
    };

    const ringColor = {
      strength: "ring-green-400",
      weakness: "ring-red-400",
      recommendation: "ring-blue-400",
      milestone: "ring-purple-400",
    };

    return clsx(
      baseColors[type as keyof typeof baseColors] ||
        "bg-gray-50 border-gray-200",
      priorityIntensity[priority as keyof typeof priorityIntensity],
      priority !== "low" && ringColor[type as keyof typeof ringColor]
    );
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "High Priority";
      case "medium":
        return "Medium Priority";
      case "low":
        return "Low Priority";
      default:
        return "";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionableLink = (insight: PerformanceInsight) => {
    if (!insight.actionable) return null;

    // Generate practice links based on insight type and related topics
    if (insight.type === "weakness" && insight.relatedTopics.length > 0) {
      const topic = insight.relatedTopics[0];
      return `/practice?type=practice&topic=${encodeURIComponent(topic)}`;
    }

    if (insight.type === "recommendation") {
      return "/practice?type=practice";
    }

    return null;
  };

  const sortedInsights = [...insights].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority =
      priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bPriority =
      priorityOrder[b.priority as keyof typeof priorityOrder] || 0;

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    // Sort by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-4">
      {sortedInsights.length > 0 ? (
        <div className="space-y-3">
          {sortedInsights.map((insight) => {
            const actionLink = getActionableLink(insight);

            return (
              <Card
                key={insight.id}
                className={clsx(
                  "transition-all duration-200 hover:shadow-md",
                  getInsightColor(insight.type, insight.priority)
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getInsightIcon(insight.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {insight.title}
                          </h4>
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={clsx(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                getPriorityColor(insight.priority)
                              )}
                            >
                              {getPriorityLabel(insight.priority)}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">
                              {insight.type}
                            </span>
                          </div>
                        </div>

                        {onDismiss && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDismiss(insight.id)}
                            className="flex-shrink-0"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <p className="text-sm text-gray-700 mb-3">
                        {insight.description}
                      </p>

                      {/* Related Topics */}
                      {insight.relatedTopics.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 mb-1">
                            Related topics:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {insight.relatedTopics.map((topic) => (
                              <span
                                key={topic}
                                className="px-2 py-1 bg-white bg-opacity-60 rounded text-xs text-gray-700"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {format(parseISO(insight.createdAt), "MMM d, yyyy")}
                        </span>

                        {insight.actionable && actionLink && (
                          <Link href={actionLink}>
                            <Button size="sm" variant="outline">
                              Take Action
                              <ArrowRightIcon className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <LightBulbIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Insights Yet
          </h3>
          <p className="text-gray-600">
            Keep practicing to get personalized insights about your learning
            progress.
          </p>
        </div>
      )}

      {/* Insights Summary */}
      {insights.length > 0 && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-700">
                {insights.filter((i) => i.type === "strength").length}
              </div>
              <div className="text-xs text-gray-600">Strengths</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-700">
                {insights.filter((i) => i.type === "weakness").length}
              </div>
              <div className="text-xs text-gray-600">Areas to Improve</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-700">
                {insights.filter((i) => i.type === "recommendation").length}
              </div>
              <div className="text-xs text-gray-600">Recommendations</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-700">
                {insights.filter((i) => i.type === "milestone").length}
              </div>
              <div className="text-xs text-gray-600">Milestones</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
