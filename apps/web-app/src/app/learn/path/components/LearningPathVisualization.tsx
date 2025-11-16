'use client';

/**
 * Learning Path Visualization Component
 * 
 * Visual path layout with unit nodes and connection lines
 * Requirements: 5.1, 5.2, 5.4, 5.5
 */

import React from 'react';
import { UnitCard } from './UnitCard';
import { UnitLessonsList } from './UnitLessonsList';
import type { Unit } from '@/types/learning-platform';

interface LearningPathVisualizationProps {
  units: Unit[];
  expandedUnitId: string | null;
  onUnitClick: (unitId: string) => void;
  isLoading?: boolean;
}

export function LearningPathVisualization({
  units,
  expandedUnitId,
  onUnitClick,
  isLoading = false,
}: LearningPathVisualizationProps) {
  // Sort units by order
  const sortedUnits = [...units].sort((a, b) => a.order - b.order);

  // Calculate which units are unlocked based on prerequisites
  const unlockedUnits = new Set<string>();
  
  // First unit is always unlocked
  const firstUnit = sortedUnits[0];
  if (firstUnit) {
    unlockedUnits.add(firstUnit.id);
  }

  // Check prerequisites for each unit
  // In real implementation, this would check actual completion status
  sortedUnits.forEach((unit) => {
    if (unit.prerequisites.length === 0) {
      unlockedUnits.add(unit.id);
    } else {
      // For now, assume prerequisites are met if they're earlier in the order
      const allPrereqsMet = unit.prerequisites.every((prereqId) => {
        const prereqUnit = sortedUnits.find((u) => u.id === prereqId);
        return prereqUnit ? prereqUnit.order < unit.order : false;
      });
      
      if (allPrereqsMet) {
        unlockedUnits.add(unit.id);
      }
    }
  });

  return (
    <div className="space-y-6">
      {sortedUnits.map((unit, index) => {
        const isUnlocked = unlockedUnits.has(unit.id);
        const isExpanded = expandedUnitId === unit.id;
        const showConnector = index < sortedUnits.length - 1;

        return (
          <div key={unit.id} className="relative">
            {/* Unit Card */}
            <UnitCard
              unit={unit}
              isUnlocked={isUnlocked}
              isExpanded={isExpanded}
              onClick={() => onUnitClick(unit.id)}
              progress={0} // Will be calculated from actual progress data
            />

            {/* Expanded Lessons List */}
            {isExpanded && isUnlocked && (
              <div className="mt-4 ml-8 pl-6 border-l-2 border-gray-200">
                <UnitLessonsList
                  lessons={unit.lessons}
                />
              </div>
            )}

            {/* Connection Line to Next Unit */}
            {showConnector && (
              <div className="flex justify-center my-4">
                <div className="w-0.5 h-8 bg-gray-300" />
              </div>
            )}
          </div>
        );
      })}

      {sortedUnits.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <p>No units available for this jurisdiction.</p>
          <p className="text-sm mt-2">Try selecting a different jurisdiction.</p>
        </div>
      )}
    </div>
  );
}
