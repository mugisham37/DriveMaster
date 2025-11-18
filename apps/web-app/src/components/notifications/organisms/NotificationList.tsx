"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { FixedSizeList } from "react-window";
import { NotificationCard } from "../molecules/NotificationCard";
import { NotificationFilterBar } from "../molecules/NotificationFilterBar";
import { NotificationGroupHeader } from "../molecules/NotificationGroupHeader";
import { EmptyNotificationState } from "../molecules/EmptyNotificationState";
import { NotificationSkeleton } from "../molecules/NotificationSkeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import type { Notification, NotificationQueryParams, NotificationType } from "@/types/notification-service";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export interface NotificationListProps {
  userId: string;
  initialFilters?: NotificationQueryParams;
  groupBy?: "none" | "date" | "type";
  pageSize?: number;
  enableRealtime?: boolean;
  className?: string;
}

interface GroupedNotifications {
  [key: string]: Notification[];
}

export function NotificationList({
  userId,
  initialFilters = {},
  groupBy = "date",
  pageSize = 50,
  enableRealtime = true,
  className = "",
}: NotificationListProps) {
  const [filters, setFilters] = useState<NotificationQueryParams>({
    userId,
    limit: pageSize,
    ...initialFilters,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const { ref: loadMoreRef, inView } = useInView();

  // Fetch notifications with pagination
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useNotifications(filters, { enabled: true });

  // Real-time updates
  useRealtimeNotifications(userId, {
    enabled: enableRealtime,
    onNotification: () => refetch(),
  });

  // Flatten paginated data
  const notifications = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  // Group notifications
  const groupedNotifications = useMemo<GroupedNotifications>(() => {
    if (groupBy === "none") {
      return { all: notifications };
    }

    if (groupBy === "date") {
      const groups: GroupedNotifications = {
        Today: [],
        Yesterday: [],
        "This Week": [],
        Older: [],
      };

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);

      notifications.forEach((notif) => {
        const notifDate = new Date(notif.createdAt);
        if (notifDate >= today) {
          groups.Today.push(notif);
        } else if (notifDate >= yesterday) {
          groups.Yesterday.push(notif);
        } else if (notifDate >= weekStart) {
          groups["This Week"].push(notif);
        } else {
          groups.Older.push(notif);
        }
      });

      return groups;
    }

    if (groupBy === "type") {
      return notifications.reduce<GroupedNotifications>((acc, notif) => {
        const type = notif.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(notif);
        return acc;
      }, {});
    }

    return { all: notifications };
  }, [notifications, groupBy]);

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Bulk actions
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  }, [notifications, selectedIds]);

  const handleBulkMarkRead = useCallback(() => {
    // Implementation would call mutation hook
    console.log("Mark as read:", Array.from(selectedIds));
    setSelectedIds(new Set());
    setBulkMode(false);
  }, [selectedIds]);

  const handleBulkDelete = useCallback(() => {
    // Implementation would call mutation hook
    console.log("Delete:", Array.from(selectedIds));
    setSelectedIds(new Set());
    setBulkMode(false);
  }, [selectedIds]);

  const handleNotificationSelect = useCallback(
    (id: string, selected: boolean) => {
      const newSelected = new Set(selectedIds);
      if (selected) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      setSelectedIds(newSelected);
    },
    [selectedIds]
  );

  // Pull to refresh (mobile)
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Available types for filter
  const availableTypes: NotificationType[] = [
    "achievement",
    "spaced_repetition",
    "streak_reminder",
    "mock_test_reminder",
    "system",
    "mentoring",
    "course_update",
    "community",
    "marketing",
  ];

  if (isError) {
    return (
      <div className={`notification-list-error ${className}`}>
        <EmptyNotificationState type="error" onAction={handleRefresh} />
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "Failed to load notifications"}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`notification-list-loading ${className}`}>
        <NotificationSkeleton count={5} />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={`notification-list-empty ${className}`}>
        <NotificationFilterBar
          filters={filters}
          onFilterChange={setFilters}
          availableTypes={availableTypes}
          showSearch
        />
        <EmptyNotificationState
          type={filters.type || filters.status ? "filtered-empty" : "no-notifications"}
          onAction={() => setFilters({ userId, limit: pageSize })}
        />
      </div>
    );
  }

  const useVirtualScrolling = notifications.length > 50;

  return (
    <div className={`notification-list ${className}`}>
      {/* Filter Bar */}
      <NotificationFilterBar
        filters={filters}
        onFilterChange={setFilters}
        availableTypes={availableTypes}
        showSearch
        className="mb-4"
      />

      {/* Bulk Actions Toolbar */}
      {bulkMode && (
        <div className="bulk-actions-toolbar flex items-center gap-4 p-4 bg-muted rounded-lg mb-4">
          <Checkbox
            checked={selectedIds.size === notifications.length}
            onCheckedChange={handleSelectAll}
            aria-label="Select all notifications"
          />
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkMarkRead}
              disabled={selectedIds.size === 0}
            >
              Mark as Read
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0}
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBulkMode(false);
                setSelectedIds(new Set());
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Toggle Bulk Mode */}
      {!bulkMode && notifications.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button variant="ghost" size="sm" onClick={() => setBulkMode(true)}>
            Select Multiple
          </Button>
        </div>
      )}

      {/* Notification Groups */}
      <div className="notification-groups space-y-4">
        {Object.entries(groupedNotifications).map(([groupKey, groupNotifications]) => {
          if (groupNotifications.length === 0) return null;

          return (
            <div key={groupKey} className="notification-group">
              {groupBy !== "none" && (
                <NotificationGroupHeader
                  title={groupKey}
                  count={groupNotifications.length}
                  collapsible
                  defaultExpanded
                />
              )}

              {/* Virtual Scrolling for large lists */}
              {useVirtualScrolling && groupBy === "none" ? (
                <FixedSizeList
                  height={600}
                  itemCount={groupNotifications.length}
                  itemSize={120}
                  width="100%"
                  className="notification-virtual-list"
                >
                  {({ index, style }) => (
                    <div style={style}>
                      <NotificationCard
                        notification={groupNotifications[index]}
                        showActions
                        compact={false}
                        selectable={bulkMode}
                        selected={selectedIds.has(groupNotifications[index].id)}
                        onSelect={(selected) =>
                          handleNotificationSelect(groupNotifications[index].id, selected)
                        }
                      />
                    </div>
                  )}
                </FixedSizeList>
              ) : (
                <div className="notification-list-items space-y-2">
                  {groupNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      showActions
                      compact={false}
                      selectable={bulkMode}
                      selected={selectedIds.has(notification.id)}
                      onSelect={(selected) =>
                        handleNotificationSelect(notification.id, selected)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="load-more-trigger py-4 text-center">
          {isFetchingNextPage ? (
            <NotificationSkeleton count={2} />
          ) : (
            <Button variant="ghost" onClick={() => fetchNextPage()}>
              Load More
            </Button>
          )}
        </div>
      )}

      {/* Pull to Refresh Indicator (Mobile) */}
      <div className="pull-to-refresh-indicator" aria-live="polite" aria-atomic="true">
        {/* Mobile pull-to-refresh would be implemented here */}
      </div>
    </div>
  );
}

export default NotificationList;
