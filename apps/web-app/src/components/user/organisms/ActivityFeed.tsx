'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActivityItem } from '../molecules/ActivityItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useActivitySummary } from '@/hooks/useUserService';
import { ActivityRecord, ActivityType } from '@/types/user-service';
import { cn } from '@/lib/utils';
import { Filter, RefreshCw } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ActivityFeedProps {
  userId?: string;
  dateRange?: DateRange;
  activityTypes?: ActivityType[];
  pageSize?: number;
  className?: string;
}

export function ActivityFeed({
  userId,
  dateRange,
  activityTypes,
  pageSize = 20,
  className,
}: ActivityFeedProps) {
  const [selectedType, setSelectedType] = useState<ActivityType | 'all'>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('7days');
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { summary, isLoading, error, refetch } = useActivitySummary(userId);

  const parentRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Filter activities based on selected filters
  useEffect(() => {
    if (!summary?.recentActivities) return;

    let filtered = [...summary.recentActivities];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.activityType === selectedType);
    }

    // Filter by date range
    const now = new Date();
    const rangeStart = new Date();
    switch (selectedDateRange) {
      case '24hours':
        rangeStart.setHours(now.getHours() - 24);
        break;
      case '7days':
        rangeStart.setDate(now.getDate() - 7);
        break;
      case '30days':
        rangeStart.setDate(now.getDate() - 30);
        break;
      case 'all':
      default:
        rangeStart.setFullYear(2000); // Far past
        break;
    }

    filtered = filtered.filter(a => {
      const activityDate = new Date(a.timestamp);
      return activityDate >= rangeStart && activityDate <= now;
    });

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setActivities(filtered);
    setPage(1);
    setHasMore(filtered.length > pageSize);
  }, [summary, selectedType, selectedDateRange, pageSize]);

  // Virtual scrolling for performance with large lists
  const rowVirtualizer = useVirtualizer({
    count: Math.min(activities.length, page * pageSize),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      const nextPage = page + 1;
      setPage(nextPage);
      setHasMore(activities.length > nextPage * pageSize);
      setIsLoadingMore(false);
    }, 500); // Simulate loading delay
  }, [page, activities.length, pageSize, hasMore, isLoadingMore]);

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return <ActivityFeedSkeleton className={className} />;
  }

  if (error) {
    return (
      <div className={cn('rounded-lg border border-destructive bg-destructive/10 p-6', className)}>
        <p className="text-sm text-destructive">Failed to load activity data. Please try again.</p>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const displayedActivities = activities.slice(0, page * pageSize);
  const useVirtualScroll = activities.length > 50;

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header with filters */}
      <div className="border-b p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Activity Feed</h2>
          <div className="flex gap-2">
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="exercise_completed">Exercises</SelectItem>
                <SelectItem value="lesson_viewed">Lessons</SelectItem>
                <SelectItem value="quiz_taken">Quizzes</SelectItem>
                <SelectItem value="achievement_earned">Achievements</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24hours">Last 24 Hours</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Activity list */}
      <div className="p-4">
        {displayedActivities.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">No activities found</p>
            <p className="text-sm text-muted-foreground">
              {selectedType !== 'all' || selectedDateRange !== 'all'
                ? 'Try adjusting your filters'
                : 'Start learning to see your activity here'}
            </p>
          </div>
        ) : useVirtualScroll ? (
          // Virtual scrolling for large lists
          <div
            ref={parentRef}
            className="h-[600px] overflow-auto"
            style={{ contain: 'strict' }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const activity = displayedActivities[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <ActivityItem activity={activity} compact />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Regular scrolling for smaller lists
          <div className="space-y-2">
            {displayedActivities.map((activity, index) => (
              <ActivityItem key={`${activity.activityId}-${index}`} activity={activity} />
            ))}
          </div>
        )}

        {/* Loading more indicator */}
        {hasMore && (
          <div ref={observerTarget} className="mt-4 flex justify-center">
            {isLoadingMore ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading more...
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={loadMore}>
                Load More
              </Button>
            )}
          </div>
        )}

        {/* End of list message */}
        {!hasMore && displayedActivities.length > 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            You've reached the end of your activity history
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityFeedSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[160px]" />
            <Skeleton className="h-10 w-[140px]" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
