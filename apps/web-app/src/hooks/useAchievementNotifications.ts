/**
 * Achievement Notifications Hook
 * 
 * Manages real-time achievement notifications:
 * - Subscribes to achievement channel for real-time achievement unlocks
 * - Displays toast notifications with celebration animations
 * - Shows achievement details in modal on click
 * - Broadcasts achievement to all tabs
 * - Tracks viewed achievements to prevent duplicate notifications
 * 
 * Requirements: 10.4
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useProgress } from '@/contexts/ProgressContext';
import { useCrossTabSyncContext } from '@/contexts/CrossTabSyncContext';
import type { Milestone } from '@/types/user-service';

// ============================================================================
// Types
// ============================================================================

export interface AchievementNotification {
  id: string;
  milestone: Milestone;
  timestamp: number;
  viewed: boolean;
}

export interface UseAchievementNotificationsOptions {
  enabled?: boolean;
  onAchievementUnlocked?: (milestone: Milestone) => void;
  onNotificationClick?: (milestone: Milestone) => void;
  showToast?: boolean;
  autoHideDelay?: number;
}

/**
 * Hook to manage achievement notifications
 */
export function useAchievementNotifications(options: UseAchievementNotificationsOptions = {}) {
  const {
    enabled = true,
    onAchievementUnlocked,
    onNotificationClick,
    showToast = true,
    autoHideDelay = 5000,
  } = options;

  const { state } = useProgress();
  const { broadcastMilestoneAchieved } = useCrossTabSyncContext();
  
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<Milestone | null>(null);
  const viewedAchievementsRef = useRef<Set<string>>(new Set());
  const previousMilestonesRef = useRef<Milestone[]>([]);

  // Check for new achievements
  useEffect(() => {
    if (!enabled || !state.milestones) {
      return;
    }

    const currentMilestones = state.milestones;
    const previousMilestones = previousMilestonesRef.current;

    // Find newly achieved milestones
    const newAchievements = currentMilestones.filter(milestone => {
      // Check if milestone is achieved
      if (!milestone.achieved) {
        return false;
      }

      // Check if it's a new achievement (not in previous list or was not achieved before)
      const wasInPrevious = previousMilestones.find(m => m.id === milestone.id);
      if (!wasInPrevious) {
        return true;
      }

      // Check if it was just achieved (was not achieved before)
      if (!wasInPrevious.achieved) {
        return true;
      }

      return false;
    });

    // Process new achievements
    newAchievements.forEach(milestone => {
      // Skip if already viewed
      if (viewedAchievementsRef.current.has(milestone.id)) {
        return;
      }

      // Mark as viewed
      viewedAchievementsRef.current.add(milestone.id);

      // Create notification
      const notification: AchievementNotification = {
        id: `achievement_${milestone.id}_${Date.now()}`,
        milestone,
        timestamp: Date.now(),
        viewed: false,
      };

      // Add to notifications list
      setNotifications(prev => [...prev, notification]);

      // Broadcast to other tabs
      broadcastMilestoneAchieved({
        milestoneId: milestone.id,
        title: milestone.title,
        description: milestone.description,
        timestamp: Date.now(),
      });

      // Call custom handler
      onAchievementUnlocked?.(milestone);

      // Auto-hide notification after delay
      if (showToast && autoHideDelay > 0) {
        setTimeout(() => {
          setNotifications(prev => 
            prev.map(n => 
              n.id === notification.id ? { ...n, viewed: true } : n
            )
          );
        }, autoHideDelay);
      }
    });

    // Update previous milestones reference
    previousMilestonesRef.current = currentMilestones;
  }, [enabled, state.milestones, broadcastMilestoneAchieved, onAchievementUnlocked, showToast, autoHideDelay]);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: AchievementNotification) => {
    // Mark as viewed
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, viewed: true } : n
      )
    );

    // Set selected achievement for modal
    setSelectedAchievement(notification.milestone);

    // Call custom handler
    onNotificationClick?.(notification.milestone);
  }, [onNotificationClick]);

  // Dismiss notification
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, viewed: true } : n
      )
    );
  }, []);

  // Dismiss all notifications
  const dismissAllNotifications = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, viewed: true }))
    );
  }, []);

  // Clear notification
  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Close achievement modal
  const closeAchievementModal = useCallback(() => {
    setSelectedAchievement(null);
  }, []);

  // Get active (unviewed) notifications
  const activeNotifications = notifications.filter(n => !n.viewed);

  // Get recent achievements (last 10)
  const recentAchievements = state.milestones
    .filter(m => m.achieved)
    .sort((a, b) => {
      const dateA = a.achievedAt ? new Date(a.achievedAt).getTime() : 0;
      const dateB = b.achievedAt ? new Date(b.achievedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 10);

  return {
    notifications,
    activeNotifications,
    recentAchievements,
    selectedAchievement,
    handleNotificationClick,
    dismissNotification,
    dismissAllNotifications,
    clearNotification,
    clearAllNotifications,
    closeAchievementModal,
  };
}
