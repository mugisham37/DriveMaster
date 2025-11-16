'use client';

/**
 * Learning Path Header Component
 * 
 * Header with jurisdiction selector and overall progress
 * Requirement: 5.5
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProgressBar } from '@/components/learning-platform/layer-3-ui/ProgressBar';
import { Clock, MapPin } from 'lucide-react';
import type { Curriculum } from '@/types/learning-platform';

interface LearningPathHeaderProps {
  curriculum: Curriculum;
  selectedJurisdiction: string;
  onJurisdictionChange: (jurisdiction: string) => void;
  overallProgress: number;
  estimatedTimeToCompletion: number;
}

const JURISDICTIONS = [
  { value: 'CA', label: 'California' },
  { value: 'NY', label: 'New York' },
  { value: 'TX', label: 'Texas' },
  { value: 'FL', label: 'Florida' },
  { value: 'IL', label: 'Illinois' },
];

export function LearningPathHeader({
  curriculum,
  selectedJurisdiction,
  onJurisdictionChange,
  overallProgress,
  estimatedTimeToCompletion,
}: LearningPathHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title and Jurisdiction Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {curriculum.title}
          </h1>
          <p className="text-gray-600 mt-1">
            Follow your personalized learning path to master driving knowledge
          </p>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-500" />
          <Select
            value={selectedJurisdiction}
            onValueChange={onJurisdictionChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              {JURISDICTIONS.map((jurisdiction) => (
                <SelectItem key={jurisdiction.value} value={jurisdiction.value}>
                  {jurisdiction.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Overall Progress
            </h2>
            <p className="text-sm text-gray-600">
              {overallProgress.toFixed(0)}% complete
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              {estimatedTimeToCompletion.toFixed(1)} hours remaining
            </span>
          </div>
        </div>

        <ProgressBar
          value={overallProgress}
          size="lg"
          showLabel={false}
          animated
        />
      </div>
    </div>
  );
}
