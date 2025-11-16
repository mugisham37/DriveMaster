'use client';

/**
 * Learning Path Content Component
 * 
 * Main content for the Learning Path page with data fetching and state management
 * Requirements: 5.1, 5.2, 14.1
 */

import React, { useState, useMemo } from 'react';
import { useProgress } from '@/contexts/ProgressContext';
import { LearningPathHeader } from './components/LearningPathHeader';
import { LearningPathVisualization } from './components/LearningPathVisualization';
import { LearningPathSidebar } from './components/LearningPathSidebar';
import { FeatureErrorBoundary } from '@/components/error-boundaries';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import type { Curriculum } from '@/types/learning-platform';

// Mock data for now - will be replaced with actual API calls
const mockCurriculum: Curriculum = {
  id: 'curriculum-1',
  title: 'Driver\'s License Preparation',
  jurisdiction: 'CA',
  units: [
    {
      id: 'unit-1',
      title: 'Traffic Signs and Signals',
      description: 'Learn to recognize and understand all traffic signs and signals',
      icon: '🚦',
      order: 1,
      lessons: [],
      prerequisites: [],
      estimatedTimeMinutes: 120,
      jurisdiction: 'CA',
    },
    {
      id: 'unit-2',
      title: 'Rules of the Road',
      description: 'Master the fundamental rules and regulations',
      icon: '📋',
      order: 2,
      lessons: [],
      prerequisites: ['unit-1'],
      estimatedTimeMinutes: 180,
      jurisdiction: 'CA',
    },
    {
      id: 'unit-3',
      title: 'Safe Driving Practices',
      description: 'Learn defensive driving and safety techniques',
      icon: '🛡️',
      order: 3,
      lessons: [],
      prerequisites: ['unit-1', 'unit-2'],
      estimatedTimeMinutes: 150,
      jurisdiction: 'CA',
    },
  ],
  totalLessons: 0,
  totalQuestions: 0,
  estimatedTimeHours: 7.5,
};

export function LearningPathContent() {
  const progressContext = useProgress();
  
  // State for jurisdiction selection
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('CA');

  // State for expanded units
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);

  // Mock data - in real implementation, this would use useContentQuery
  const [curriculum] = useState<Curriculum>(mockCurriculum);
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (!progressContext?.state.summary) return 0;
    
    // Calculate based on completed lessons vs total lessons
    const totalLessons = curriculum.totalLessons || curriculum.units.reduce(
      (sum, unit) => sum + unit.lessons.length,
      0
    );
    
    if (totalLessons === 0) return 0;
    
    // This would come from actual progress data
    return 0;
  }, [progressContext?.state.summary, curriculum]);

  // Calculate estimated time to completion
  const estimatedTimeToCompletion = useMemo(() => {
    if (!progressContext?.state.summary) return curriculum.estimatedTimeHours;
    
    const remainingPercentage = (100 - overallProgress) / 100;
    return curriculum.estimatedTimeHours * remainingPercentage;
  }, [overallProgress, curriculum.estimatedTimeHours, progressContext?.state.summary]);

  // Handle jurisdiction change
  const handleJurisdictionChange = (jurisdiction: string) => {
    setSelectedJurisdiction(jurisdiction);
    // In real implementation, this would trigger a refetch with new filters
  };

  // Handle unit expansion
  const handleUnitClick = (unitId: string) => {
    setExpandedUnitId(expandedUnitId === unitId ? null : unitId);
  };

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Failed to load learning path. {error.message}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => window.location.reload()}
          className="mt-4"
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header with jurisdiction selector */}
      <LearningPathHeader
        curriculum={curriculum}
        selectedJurisdiction={selectedJurisdiction}
        onJurisdictionChange={handleJurisdictionChange}
        overallProgress={overallProgress}
        estimatedTimeToCompletion={estimatedTimeToCompletion}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
        {/* Main content area */}
        <div className="lg:col-span-3">
          <FeatureErrorBoundary>
            <LearningPathVisualization
              units={curriculum.units}
              expandedUnitId={expandedUnitId}
              onUnitClick={handleUnitClick}
              isLoading={isLoading}
            />
          </FeatureErrorBoundary>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <FeatureErrorBoundary>
            <LearningPathSidebar
              units={curriculum.units}
              overallProgress={overallProgress}
              estimatedTimeToCompletion={estimatedTimeToCompletion}
            />
          </FeatureErrorBoundary>
        </div>
      </div>
    </div>
  );
}
