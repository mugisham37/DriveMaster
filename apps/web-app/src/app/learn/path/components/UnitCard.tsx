'use client';

/**
 * Unit Card Component
 * 
 * Card displaying unit information with lock/unlock states
 * Requirements: 5.1, 5.2, 5.4
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/learning-platform/layer-3-ui/ProgressBar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lock, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Unit } from '@/types/learning-platform';

interface UnitCardProps {
  unit: Unit;
  isUnlocked: boolean;
  isExpanded: boolean;
  onClick: () => void;
  progress: number; // 0-100
}

export function UnitCard({
  unit,
  isUnlocked,
  isExpanded,
  onClick,
  progress,
}: UnitCardProps) {
  const canExpand = isUnlocked && unit.lessons.length > 0;

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        canExpand && 'cursor-pointer hover:shadow-lg',
        !isUnlocked && 'opacity-60 bg-gray-50'
      )}
      onClick={canExpand ? onClick : undefined}
      role={canExpand ? 'button' : undefined}
      tabIndex={canExpand ? 0 : undefined}
      onKeyDown={
        canExpand
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-expanded={canExpand ? isExpanded : undefined}
      aria-label={`${unit.title} unit${!isUnlocked ? ' (locked)' : ''}`}
    >
      <CardHeader>
        <div className="flex items-center gap-4">
          {/* Unit Icon */}
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full text-2xl',
              isUnlocked
                ? 'bg-blue-100 text-blue-600'
                : 'bg-gray-200 text-gray-400'
            )}
          >
            {unit.icon}
          </div>

          {/* Unit Title and Description */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl flex items-center gap-2">
              {unit.title}
              {!isUnlocked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="w-4 h-4 text-gray-400" aria-label="Locked" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">
                        Complete the following units first:
                      </p>
                      <ul className="text-sm mt-1 list-disc list-inside">
                        {unit.prerequisites.map((prereqId) => (
                          <li key={prereqId}>{prereqId}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{unit.description}</p>
          </div>

          {/* Progress Badge */}
          {isUnlocked && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {progress.toFixed(0)}%
              </span>
              {canExpand && (
                <div className="text-gray-400">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Progress Bar */}
          {isUnlocked && (
            <ProgressBar
              value={progress}
              size="md"
              showLabel={false}
            />
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{unit.estimatedTimeMinutes} min</span>
            </div>
            <div>
              {unit.lessons.length} lesson{unit.lessons.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
