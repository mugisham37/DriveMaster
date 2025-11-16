'use client';

/**
 * Learning Path Page (Layer 1)
 * 
 * Visual curriculum showing all units and lessons with dependencies and progress.
 * Requirements: 5.1, 13.2, 14.3
 */

import React, { Suspense } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import { LearningPathContent } from './LearningPathContent';
import { LearningPathSkeleton } from './LearningPathSkeleton';

export default function LearningPathPage() {
  // Requirement 5.1: Authentication check
  useRequireAuth({
    redirectTo: '/auth/signin',
  });

  return (
    <RouteErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<LearningPathSkeleton />}>
          <LearningPathContent />
        </Suspense>
      </div>
    </RouteErrorBoundary>
  );
}
