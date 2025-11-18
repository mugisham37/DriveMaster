/**
 * NotificationBellIcon Component
 * 
 * Global notification trigger with real-time badge updates
 * 
 * Features:
 * - Bell icon with unread count badge
 * - Shake animation on new notifications
 * - Opens NotificationCenter on click
 * - Keyboard accessible
 * - Real-time badge updates via WebSocket
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 * Task: 8.1
 */

'use client';

import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationCenter } from './NotificationCenter';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface NotificationBellIconProps {
  position?: 'left' | 'center' | 'right';
  showBadge?: boolean;
  badgeVariant?: 'unread' | 'urgent' | 'normal';
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function NotificationBellIcon({
  position = 'right',
  showBadge = true,
  badgeVariant = 'unread',
  className,
}: NotificationBellIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const { data: counts, isLoading } = useNotificationCounts();

  const unreadCount = counts?.unread || 0;
  const hasUnread = unreadCount > 0;

  // Trigger shake animation when unread count increases
  React.useEffect(() => {
    if (hasUnread && !isOpen) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [unreadCount, hasUnread, isOpen]);

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'relative',
          shouldShake && 'animate-shake'
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${hasUnread ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" />
        {showBadge && hasUnread && !isLoading && (
          <Badge
            variant={badgeVariant === 'urgent' ? 'destructive' : 'default'}
            className={cn(
              'absolute -top-1 -right-1 h-5 min-w-[1.25rem] rounded-full p-0 flex items-center justify-center text-xs',
              badgeVariant === 'urgent' && 'animate-pulse'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <NotificationCenter
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          position={position}
        />
      )}
    </div>
  );
}
