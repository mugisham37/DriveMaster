'use client';

/**
 * Learning Path Sidebar Component
 * 
 * Sidebar showing current focus and recommendations
 * Requirement: 5.1, 5.6
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import type { Unit } from '@/types/learning-platform';

interface LearningPathSidebarProps {
  units: Unit[];
  overallProgress: number;
  estimatedTimeToCompletion: number;
}

export function LearningPathSidebar({
  units,
  overallProgress,
  estimatedTimeToCompletion,
}: LearningPathSidebarProps) {
  // Find current unit (first incomplete unit)
  const currentUnit = useMemo(() => {
    // In real implementation, this would check actual completion status
    // For now, return the first unit
    return units.find((unit) => unit.order === 1) || units[0];
  }, [units]);

  // Find next recommended unit
  const nextRecommendedUnit = useMemo(() => {
    // In real implementation, this would be based on progress and recommendations
    // For now, return the second unit
    return units.find((unit) => unit.order === 2) || units[1];
  }, [units]);

  const handleScrollToUnit = (unitId: string) => {
    const element = document.getElementById(`unit-${unitId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-4 sticky top-4">
      {/* Current Focus Card */}
      {currentUnit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Current Focus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{currentUnit.icon}</span>
                <h3 className="font-semibold text-gray-900">
                  {currentUnit.title}
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                {currentUnit.description}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{currentUnit.estimatedTimeMinutes} minutes</span>
            </div>

            <Button
              onClick={() => handleScrollToUnit(currentUnit.id)}
              className="w-full"
              size="sm"
            >
              Go to Unit
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Next Recommended Unit Card */}
      {nextRecommendedUnit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Up Next
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{nextRecommendedUnit.icon}</span>
                <h3 className="font-semibold text-gray-900">
                  {nextRecommendedUnit.title}
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                {nextRecommendedUnit.description}
              </p>
            </div>

            {nextRecommendedUnit.prerequisites.length > 0 && (
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Prerequisites:</p>
                <ul className="list-disc list-inside text-xs">
                  {nextRecommendedUnit.prerequisites.map((prereqId) => {
                    const prereqUnit = units.find((u) => u.id === prereqId);
                    return (
                      <li key={prereqId}>
                        {prereqUnit?.title || prereqId}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overall Completion Estimate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completion Estimate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Overall Progress</span>
              <span className="text-lg font-bold text-blue-600">
                {overallProgress.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Time Remaining</span>
            <span className="font-semibold text-gray-900">
              {estimatedTimeToCompletion.toFixed(1)} hours
            </span>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Based on your current pace, you&apos;re on track to complete the
              curriculum in approximately{' '}
              {Math.ceil(estimatedTimeToCompletion / 2)} weeks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
