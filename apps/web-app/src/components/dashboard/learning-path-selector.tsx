"use client";

import { useState } from "react";
import { LearningPath } from "@/types/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  StarIcon,
  ArrowRightIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

interface LearningPathSelectorProps {
  paths: LearningPath[];
  onSelectPath?: (pathId: string) => Promise<void>;
}

export function LearningPathSelector({ 
  paths, 
  onSelectPath 
}: LearningPathSelectorProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getDifficultyStars = (difficulty: string) => {
    const levels = { beginner: 1, intermediate: 2, advanced: 3 };
    const level = levels[difficulty as keyof typeof levels] || 1;
    
    return Array.from({ length: 3 }, (_, i) => (
      <span key={i}>
        {i < level ? (
          <StarIconSolid className="w-3 h-3 text-yellow-400" />
        ) : (
          <StarIcon className="w-3 h-3 text-gray-300" />
        )}
      </span>
    ));
  };

  const handleSelectPath = async (pathId: string) => {
    if (!onSelectPath) return;
    
    try {
      setIsSelecting(true);
      setSelectedPath(pathId);
      await onSelectPath(pathId);
    } catch (error) {
      console.error("Failed to select learning path:", error);
    } finally {
      setIsSelecting(false);
    }
  };

  // Split paths into recommended and others
  const recommendedPaths = paths.filter(path => path.isRecommended);
  const otherPaths = paths.filter(path => !path.isRecommended);

  return (
    <div className="space-y-6">
      {/* Current Path Progress */}
      {selectedPath && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Current Path</h4>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                    <h5 className="font-medium text-blue-900">
                      {paths.find(p => p.id === selectedPath)?.name}
                    </h5>
                  </div>
                  <span className="text-sm text-blue-700">
                    {Math.round((paths.find(p => p.id === selectedPath)?.progress || 0) * 100)}% Complete
                  </span>
                </div>

                <Progress 
                  value={(paths.find(p => p.id === selectedPath)?.progress || 0) * 100} 
                  className="h-2"
                />

                <div className="flex items-center justify-between text-sm text-blue-700">
                  <span>
                    {paths.find(p => p.id === selectedPath)?.topics.length} topics
                  </span>
                  <span>
                    {paths.find(p => p.id === selectedPath)?.estimatedHours}h estimated
                  </span>
                </div>

                <Button className="w-full mt-3">
                  Continue Learning
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommended Paths */}
      {recommendedPaths.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Recommended for You
          </h4>
          <div className="space-y-3">
            {recommendedPaths.map((path) => (
              <Card
                key={path.id}
                className={cn(
                  "transition-all duration-200 hover:shadow-md cursor-pointer",
                  selectedPath === path.id && "ring-2 ring-blue-500"
                )}
                onClick={() => handleSelectPath(path.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <AcademicCapIcon className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-gray-900">
                              {path.name}
                            </h5>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              Recommended
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {path.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {path.estimatedHours}h
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpenIcon className="w-3 h-3" />
                          {path.topics.length} topics
                        </div>
                        <div className="flex items-center gap-1">
                          {getDifficultyStars(path.difficulty)}
                          <span className="ml-1 capitalize">
                            {path.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Prerequisites */}
                      {path.prerequisites.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 mb-1">
                            Prerequisites:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {path.prerequisites.map((prereq) => (
                              <span
                                key={prereq}
                                className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                              >
                                {prereq}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isSelecting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPath(path.id);
                        }}
                      >
                        {isSelecting && selectedPath === path.id
                          ? "Selecting..."
                          : "Start This Path"}
                        <ArrowRightIcon className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Available Paths */}
      {otherPaths.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Other Paths</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otherPaths.map((path) => (
              <Card
                key={path.id}
                className="transition-all duration-200 hover:shadow-md cursor-pointer"
                onClick={() => handleSelectPath(path.id)}
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-900 text-sm">
                        {path.name}
                      </h5>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium border",
                          getDifficultyColor(path.difficulty)
                        )}
                      >
                        {path.difficulty}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2">
                      {path.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{path.estimatedHours}h • {path.topics.length} topics</span>
                      <Button size="sm" variant="outline">
                        Select
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {paths.length === 0 && (
        <div className="text-center py-8">
          <AcademicCapIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Learning Paths Available
          </h3>
          <p className="text-gray-600">
            Learning paths will be recommended based on your progress and goals.
          </p>
        </div>
      )}
    </div>
  );
}