"use client";

import { SessionProgress as SessionProgressType } from "@/types/practice";
import { Card, CardContent } from "@/components/ui/card";
import { clsx } from "clsx";

interface SessionProgressProps {
  progress: SessionProgressType;
  sessionType: "practice" | "review" | "mock_test";
}

export function SessionProgress({
  progress,
  sessionType,
}: SessionProgressProps) {
  const progressPercentage =
    (progress.currentItemIndex / progress.totalItems) * 100;
  const accuracyPercentage =
    progress.totalItems > 0
      ? (progress.correctAnswers / progress.currentItemIndex) * 100
      : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case "practice":
        return "Practice Session";
      case "review":
        return "Review Session";
      case "mock_test":
        return "Mock Test";
      default:
        return "Session";
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600";
    if (accuracy >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {getSessionTypeLabel(sessionType)}
          </h2>
          <div className="text-sm text-gray-600">
            Question {progress.currentItemIndex} of {progress.totalItems}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {progress.correctAnswers}
            </div>
            <div className="text-xs text-gray-600">Correct</div>
          </div>

          <div>
            <div
              className={clsx(
                "text-2xl font-bold",
                getAccuracyColor(accuracyPercentage)
              )}
            >
              {progress.currentItemIndex > 0
                ? Math.round(accuracyPercentage)
                : 0}
              %
            </div>
            <div className="text-xs text-gray-600">Accuracy</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(progress.timeElapsed)}
            </div>
            <div className="text-xs text-gray-600">Time</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(progress.averageTimePerItem)}
            </div>
            <div className="text-xs text-gray-600">Avg/Question</div>
          </div>
        </div>

        {/* Topics Progress */}
        {Object.keys(progress.topicsProgress).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Topic Progress
            </h3>
            <div className="space-y-2">
              {Object.entries(progress.topicsProgress).map(([topic, stats]) => {
                const topicAccuracy =
                  stats.attempted > 0
                    ? (stats.correct / stats.attempted) * 100
                    : 0;

                return (
                  <div
                    key={topic}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700 truncate flex-1 mr-2">
                      {topic}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">
                        {stats.correct}/{stats.attempted}
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={clsx(
                            "h-1.5 rounded-full transition-all duration-300",
                            topicAccuracy >= 80
                              ? "bg-green-500"
                              : topicAccuracy >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          )}
                          style={{
                            width: `${Math.min(100, stats.mastery * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
