/**
 * Mobile Notification Sheet
 * 
 * Bottom sheet for mobile notification center
 * Requirements: 30.1, 30.2, 30.3, 30.4, 30.5
 */

"use client";

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, RefreshCw } from 'lucide-react';
import { AccessibleNotificationCard } from './AccessibleNotificationCard';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { announceToScreenReader } from '@/utils/accessibility';

export interface MobileNotificationSheetProps {
  userId: string;
  onSettingsClick?: () => void;
}

export function MobileNotificationSheet({
  userId,
  onSettingsClick,
}: MobileNotificationSheetProps) {
  const [open, setOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const { trigger: triggerHaptic } = useHapticFeedback();

  const { data: notifications = [], isLoading, refetch } = useNotifications({
    userId,
    limit: 50,
    status: 'all',
  });

  const { data: counts } = useNotificationCounts(userId);
  const unreadCount = counts?.unread || 0;

  // Pull to refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop === 0) {
      setPullDistance(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop === 0 && pullDistance >= 0) {
      const distance = Math.min(touch.clientY - 100, 100);
      setPullDistance(distance);

      if (distance > 80) {
        triggerHaptic('light');
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      triggerHaptic('medium');
      announceToScreenReader('Refreshing notifications', 'polite');
      
      await refetch();
      
      setTimeout(() => {
        setIsRefreshing(false);
        announceToScreenReader('Notifications refreshed', 'polite');
      }, 500);
    }
    setPullDistance(0);
  };

  // Announce when opened
  useEffect(() => {
    if (open) {
      announceToScreenReader(
        `Notification center opened. ${unreadCount} unread notifications`,
        'polite'
      );
    }
  }, [open, unreadCount]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative min-h-[44px] min-w-[44px]"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-2xl"
        aria-describedby="notification-sheet-description"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription id="notification-sheet-description">
                {unreadCount > 0 
                  ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                  : 'No unread notifications'
                }
              </SheetDescription>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              className="min-h-[44px] min-w-[44px]"
              aria-label="Notification settings"
            >
              <Settings className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
        </SheetHeader>

        {/* Pull to refresh indicator */}
        {pullDistance > 0 && (
          <div 
            className="flex items-center justify-center py-2 transition-opacity"
            style={{ opacity: pullDistance / 100 }}
            aria-live="polite"
            aria-atomic="true"
          >
            <RefreshCw 
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span className="ml-2 text-sm text-muted-foreground">
              {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
            </span>
          </div>
        )}

        {/* Notification list */}
        <div
          className="overflow-y-auto h-full pb-20 space-y-2"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="feed"
          aria-label="Notification feed"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" aria-hidden="true" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading notifications...
              </span>
            </div>
          ) : notifications.length === 0 ? (
            <div 
              className="flex flex-col items-center justify-center py-12 text-center"
              role="status"
            >
              <Bell className="w-12 h-12 text-muted-foreground mb-4" aria-hidden="true" />
              <p className="text-lg font-semibold">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <AccessibleNotificationCard
                key={notification.id}
                notification={notification}
                compact
                showActions
                onClick={() => {
                  triggerHaptic('light');
                  // Handle notification click
                }}
              />
            ))
          )}
        </div>

        {/* View all button */}
        {notifications.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
            <Button
              variant="outline"
              className="w-full min-h-[44px]"
              onClick={() => {
                triggerHaptic('light');
                setOpen(false);
                // Navigate to full notifications page
              }}
            >
              View All Notifications
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default MobileNotificationSheet;
