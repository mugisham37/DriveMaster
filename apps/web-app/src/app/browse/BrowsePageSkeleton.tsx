'use client';

/**
 * BrowsePageSkeleton Component
 * 
 * Loading skeleton for the Browse page
 * Requirements: 13.2
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function BrowsePageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-9 bg-muted rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-5 bg-muted rounded w-96 animate-pulse"></div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="mb-6">
        <div className="h-12 bg-muted rounded-lg animate-pulse"></div>
      </div>

      <div className="flex gap-6">
        {/* Filter Sidebar Skeleton */}
        <div className="w-64 flex-shrink-0 space-y-6">
          <div>
            <div className="h-6 bg-muted rounded w-24 mb-3 animate-pulse"></div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Area Skeleton */}
        <div className="flex-1 space-y-4">
          {/* Results Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-5 bg-muted rounded w-32 animate-pulse"></div>
            <div className="h-9 bg-muted rounded w-40 animate-pulse"></div>
          </div>

          {/* Results Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="w-full h-40 bg-muted rounded-t-lg"></div>
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-4">
                    <div className="h-4 bg-muted rounded w-20"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
