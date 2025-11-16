'use client';

/**
 * Search and Browse Page
 * 
 * Comprehensive content discovery with search, filters, and browsing
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 13.2, 14.3
 */

import React, { Suspense } from 'react';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import { BrowseContent } from './BrowseContent';
import { BrowsePageSkeleton } from './BrowsePageSkeleton';

export default function BrowsePage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<BrowsePageSkeleton />}>
        <BrowseContent />
      </Suspense>
    </RouteErrorBoundary>
  );
}
