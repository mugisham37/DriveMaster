/**
 * Achievement Toast Notification Component
 * 
 * Displays toast notifications for achievement unlocks with celebration animations
 * 
 * Requirements: 10.4
 */

import React, { useState, useEffect } from 'react';
import { Trophy, X, Sparkles } from 'lucide-react';
import type { AchievementNotification } from '@/hooks/useAchievementNotifications';

export interface AchievementToastProps {
  notification: AchievementNotification;
  onClick?: () => void;
  onDismiss?: () => void;
}

export function AchievementToast({ 
  notification, 
  onClick, 
  onDismiss 
}: AchievementToastProps) {
  const { milestone } = notification;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  return (
    <div
      className={`relative w-full max-w-sm bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg shadow-lg overflow-hidden cursor-pointer transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-12 scale-95'
      }`}
      onClick={onClick}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Celebration sparkles animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-sparkle"
            style={{
              left: '50%',
              top: '50%',
              animationDelay: `${i * 50}ms`,
            }}
          >
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-yellow-400 dark:bg-yellow-600 rounded-full flex items-center justify-center animate-bounce-in">
          <Trophy className="w-6 h-6 text-white" />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 animate-fade-in-left" style={{ animationDelay: '100ms' }}>
            Achievement Unlocked!
          </p>
          <p className="text-base font-bold text-yellow-950 dark:text-yellow-50 mt-0.5 animate-fade-in-left" style={{ animationDelay: '200ms' }}>
            {milestone.title}
          </p>
          {milestone.description && (
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1 animate-fade-in-left" style={{ animationDelay: '300ms' }}>
              {milestone.description}
            </p>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
          className="flex-shrink-0 p-1 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4 text-yellow-700 dark:text-yellow-300" />
        </button>
      </div>

      {/* Progress bar for auto-hide */}
      <div className="h-1 bg-yellow-400 dark:bg-yellow-600 origin-left animate-shrink" />

      <style jsx>{`
        @keyframes sparkle {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0);
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--x, 0px)), calc(-50% + var(--y, 0px))) scale(1);
          }
        }
        @keyframes bounce-in {
          0% {
            transform: rotate(-180deg) scale(0);
          }
          50% {
            transform: rotate(10deg) scale(1.1);
          }
          100% {
            transform: rotate(0deg) scale(1);
          }
        }
        @keyframes fade-in-left {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
        .animate-sparkle {
          animation: sparkle 1s ease-out forwards;
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.2s forwards;
          transform: rotate(-180deg) scale(0);
        }
        .animate-fade-in-left {
          animation: fade-in-left 0.3s ease-out forwards;
          opacity: 0;
        }
        .animate-shrink {
          animation: shrink 5s linear forwards;
        }
      `}</style>
    </div>
  );
}

export interface AchievementToastContainerProps {
  notifications: AchievementNotification[];
  onNotificationClick?: (notification: AchievementNotification) => void;
  onDismiss?: (notificationId: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export function AchievementToastContainer({
  notifications,
  onNotificationClick,
  onDismiss,
  position = 'top-right',
}: AchievementToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-3 pointer-events-none`}
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications
        .filter(n => !n.viewed)
        .map(notification => (
          <div key={notification.id} className="pointer-events-auto">
            <AchievementToast
              notification={notification}
              onClick={() => onNotificationClick?.(notification)}
              onDismiss={() => onDismiss?.(notification.id)}
            />
          </div>
        ))}
    </div>
  );
}
