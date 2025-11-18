"use client";

import React, { useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NotificationBadge } from "../atoms/NotificationBadge";
import { NotificationCard } from "../molecules/NotificationCard";
import { NotificationSkeleton } from "../molecules/NotificationSkeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationCounts } from "@/hooks/useNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Link from "next/link";

export interface NotificationCenterProps {
  trigger?: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  maxHeight?: number;
  showPreferences?: boolean;
  className?: string;
}

export function NotificationCenter({
  trigger,
  position = "bottom",
  maxHeight = 600,
  showPreferences = true,
  className = "",
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Fetch recent notifications (limit 50)
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useNotifications(
    { limit: 50, status: "all" },
    { enabled: true }
  );

  // Get unread count
  const { data: counts } = useNotificationCounts({ enabled: true });
  const unreadCount = counts?.unread ?? 0;

  // Real-time updates
  useRealtimeNotifications("", {
    enabled: open,
    onNotification: () => refetch(),
  });

  const notifications = data?.pages[0]?.results ?? [];

  const handleMarkAllRead = useCallback(() => {
    // Implementation would call mutation hook
    console.log("Mark all as read");
    refetch();
  }, [refetch]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Default trigger
  const defaultTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={`Notifications, ${unreadCount} unread`}
      aria-expanded={open}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <NotificationBadge
          count={unreadCount}
          variant="urgent"
          className="absolute -top-1 -right-1"
        />
      )}
    </Button>
  );

  const content = (
    <div className="notification-center-content" style={{ maxHeight }}>
      {/* Header */}
      <div className="notification-center-header flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
          {showPreferences && (
            <Link href="/settings/notifications">
              <Button variant="ghost" size="sm">
                Settings
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="notification-center-list overflow-y-auto" style={{ maxHeight: maxHeight - 120 }}>
        {isLoading ? (
          <div className="p-4">
            <NotificationSkeleton count={3} compact />
          </div>
        ) : isError ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>Failed to load notifications</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
              Try Again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                compact
                showActions={false}
                onClick={handleClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="notification-center-footer border-t p-4 text-center">
        <Link href="/notifications" onClick={handleClose}>
          <Button variant="link" className="w-full">
            View All Notifications
          </Button>
        </Link>
      </div>
    </div>
  );

  // Mobile: Use Sheet (bottom drawer)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger ?? defaultTrigger}
        </SheetTrigger>
        <SheetContent side="bottom" className={`h-[80vh] ${className}`}>
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? defaultTrigger}
      </PopoverTrigger>
      <PopoverContent
        side={position}
        align="end"
        className={`w-[400px] p-0 ${className}`}
        onEscapeKeyDown={handleClose}
        onInteractOutside={handleClose}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationCenter;
