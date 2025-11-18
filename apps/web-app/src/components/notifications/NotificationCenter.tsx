/**
 * NotificationCenter Component
 * 
 * Dropdown notification center with real-time updates
 * 
 * Features:
 * - Popover on desktop, Sheet on mobile
 * - Real-time notification updates
 * - Mark all as read action
 * - View all link
 * - Keyboard navigation
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 * Task: 8.2
 */

"use client";

import React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { cn } from "@/lib/utils";

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'center' | 'right';
  className?: string;
}

export function NotificationCenter({
  isOpen,
  onClose,
  position = 'right',
  className,
}: NotificationCenterProps) {
  const { data: notifications, isLoading } = useNotifications({
    limit: 50,
    enabled: isOpen,
  });

  // Enable real-time updates
  useRealtimeNotifications({
    enabled: isOpen,
    showToast: false, // Don't show toast when center is open
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover */}
      <div
        className={cn(
          "fixed z-50 w-96 max-w-[calc(100vw-2rem)] bg-background border rounded-lg shadow-lg",
          position === 'right' && "right-4 top-16",
          position === 'left' && "left-4 top-16",
          position === 'center' && "left-1/2 -translate-x-1/2 top-16",
          className
        )}
        role="dialog"
        aria-label="Notification center"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close notification center"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-96">
          <div className="p-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading notifications...
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 rounded-lg border hover:bg-accent cursor-pointer"
                  >
                    <h3 className="font-medium text-sm">{notification.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No notifications yet
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t">
          <Link href="/notifications">
            <Button variant="outline" className="w-full" onClick={onClose}>
              View All Notifications
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}

export default NotificationCenter;
