'use client';

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBadge } from '../atoms/NotificationBadge';
import { NotificationCenter } from './NotificationCenter';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { cn } from '@/lib/utils';

export interface NotificationBellIconProps {
  position?: 'left' | 'center' | 'right';
  showBadge?: boolean;
  badgeVariant?: 'unread' | 'urgent' | 'normal';
  className?: string;
}

export function NotificationBellIcon({
  position = 'right',
  showBadge = true,
  badgeVariant = 'unread',
  className = '',
}: NotificationBellIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);

  const { unreadCount, urgentCount, isLoading } = useNotificationCounts();

  // Determine which count to display based on variant
  const displayCount = badgeVariant === 'urgent' ? urgentCount : unreadCount;

  // Shake animation when new notifications arrive
  useEffect(() => {
    if (displayCount > previousCount && previousCount > 0) {
      setShouldShake(true);
      
      // Reset shake animation after it completes
      const timer = setTimeout(() => {
        setShouldShake(false);
      }, 500);

      return () => clearTimeout(timer);
    }
    setPreviousCount(displayCount);
  }, [displayCount, previousCount]);

  // Keyboard accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'relative',
          shouldShake && 'animate-shake',
          isOpen && 'bg-accent'
        )}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-label={`Notifications${displayCount > 0 ? `, ${displayCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" />
        
        {showBadge && displayCount > 0 && (
          <div className="absolute -top-1 -right-1">
            <NotificationBadge
              count={displayCount}
              variant={badgeVariant}
              maxCount={99}
              showZero={false}
            />
          </div>
        )}
      </Button>

      {/* NotificationCenter Popover/Sheet */}
      <NotificationCenter
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        trigger={null} // We're controlling it manually
      />

      <style jsx>{`
        @keyframes shake {
          0%, 100% {
            transform: rotate(0deg);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: rotate(-10deg);
          }
          20%, 40%, 60%, 80% {
            transform: rotate(10deg);
          }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default NotificationBellIcon;
