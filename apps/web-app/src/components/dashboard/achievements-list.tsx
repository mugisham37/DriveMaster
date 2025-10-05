"use client";

import { Achievement } from "@/types/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { clsx } from "clsx";
import { format, parseISO } from "date-fns";

interface AchievementsListProps {
  achievements: Achievement[];
}

export function AchievementsList({ achievements }: AchievementsListProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "accuracy":
        return "bg-green-100 text-green-800 border-green-200";
      case "streak":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "mastery":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "speed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "milestone":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "accuracy":
        return "🎯";
      case "streak":
        return "🔥";
      case "mastery":
        return "🎓";
      case "speed":
        return "⚡";
      case "milestone":
        return "🏆";
      default:
        return "⭐";
    }
  };

  const unlockedAchievements = achievements.filter((a) => a.unlockedAt);
  const progressAchievements = achievements.filter(
    (a) => !a.unlockedAt && a.progress !== undefined
  );

  const sortedUnlocked = unlockedAchievements.sort(
    (a, b) =>
      new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
  );

  const sortedProgress = progressAchievements.sort(
    (a, b) => (b.progress || 0) - (a.progress || 0)
  );

  return (
    <div className="space-y-6">
      {/* Recently Unlocked */}
      {sortedUnlocked.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Unlocked Achievements ({sortedUnlocked.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedUnlocked.map((achievement) => (
              <Card
                key={achievement.id}
                className={clsx(
                  "relative overflow-hidden transition-all duration-200 hover:shadow-md",
                  achievement.isRare && "ring-2 ring-yellow-400"
                )}
              >
                {achievement.isRare && (
                  <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 px-2 py-1 text-xs font-medium rounded-bl-lg">
                    Rare
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">
                      {achievement.icon ||
                        getCategoryIcon(achievement.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {achievement.title}
                        </h4>
                        <span
                          className={clsx(
                            "px-2 py-1 rounded-full text-xs font-medium border",
                            getCategoryColor(achievement.category)
                          )}
                        >
                          {achievement.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {achievement.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        Unlocked{" "}
                        {format(
                          parseISO(achievement.unlockedAt),
                          "MMM d, yyyy"
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* In Progress */}
      {sortedProgress.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            In Progress ({sortedProgress.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedProgress.map((achievement) => (
              <Card
                key={achievement.id}
                className="opacity-75 hover:opacity-90 transition-opacity"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl grayscale">
                      {achievement.icon ||
                        getCategoryIcon(achievement.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-700 truncate">
                          {achievement.title}
                        </h4>
                        <span
                          className={clsx(
                            "px-2 py-1 rounded-full text-xs font-medium border opacity-60",
                            getCategoryColor(achievement.category)
                          )}
                        >
                          {achievement.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {achievement.description}
                      </p>

                      {/* Progress Bar */}
                      {achievement.progress !== undefined &&
                        achievement.target && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Progress</span>
                              <span>
                                {Math.round(
                                  (achievement.progress || 0) *
                                    achievement.target
                                )}{" "}
                                / {achievement.target}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${
                                    (achievement.progress || 0) * 100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {achievements.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Achievements Yet
          </h3>
          <p className="text-gray-600">
            Start practicing to unlock your first achievement!
          </p>
        </div>
      )}

      {/* Achievement Categories Legend */}
      {achievements.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Categories</h4>
          <div className="flex flex-wrap gap-2">
            {["accuracy", "streak", "mastery", "speed", "milestone"].map(
              (category) => (
                <div key={category} className="flex items-center gap-1">
                  <span className="text-sm">{getCategoryIcon(category)}</span>
                  <span className="text-xs text-gray-600 capitalize">
                    {category}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
