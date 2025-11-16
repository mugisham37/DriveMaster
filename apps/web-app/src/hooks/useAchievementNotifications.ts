/**
 * Achievement Notifications Hook
 * 
 * Manages real-time achievement notifications:
 * - th comprehensive tracking and user engagement features.
 *
 * Requirements: 3.1
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";
import { notificationApiClient } from "@/lib/notification-service";
import { useAuth } from "./useAuth";
// import useNotificationToast from '@/components/notifications/NotificationToastSystem'
import { requireStringUserId } from "@/utils/user-id-helpers";
import type {
  AchievementNotificationRequest,
  NotificationError,
} from "@/types/notification-service";

// ============================================================================
// Types
// ============================================================================

export interface AchievementNotificationDisplay
  extends AchievementNotificationRequest {
  id: string;
  timestamp: Date;
  isVisible: boolean;
}

export interface UseAchievementNotificationsOptions {
  enableAutoDisplay?: boolean;
  enableSounds?: boolean;
  enableVibration?: boolean;
  maxConcurrentDisplays?: number;
  autoCloseDelay?: number;
}

export interface UseAchievementNotificationsResult {
  // State
  activeAchievements: AchievementNotificationDisplay[];
  isPending: boolean;
  error: NotificationError | null;

  // Actions
  sendAchievementNotification: (
    achievement: AchievementNotificationRequest,
  ) => Promise<void>;
  displayAchievement: (achievement: AchievementNotificationRequest) => void;
  dismissAchievement: (achievementId: string) => void;
  dismissAllAchievements: () => void;

  // Analytics
  trackAchievementView: (achievementId: string) => void;
  trackAchievementShare: (achievementId: string, platform: string) => void;
  trackAchievementDismiss: (achievementId: string) => void;

  // Predefined helpers
  sendCourseCompletionAchievement: (
    courseName: string,
    points?: number,
  ) => Promise<void>;
  sendStreakAchievement: (
    streakCount: number,
    streakType?: "daily" | "weekly",
  ) => Promise<void>;
  sendScoreAchievement: (
    testName: string,
    score: number,
    isPersonalBest?: boolean,
  ) => Promise<void>;
  sendMilestoneAchievement: (
    milestone: string,
    description: string,
    points?: number,
  ) => Promise<void>;
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: Required<UseAchievementNotificationsOptions> = {
  enableAutoDisplay: true,
  enableSounds: true,
  enableVibration: true,
  maxConcurrentDisplays: 3,
  autoCloseDelay: 8000,
};

// ============================================================================
// Main Hook
// ============================================================================

export function useAchievementNotifications(
  options: UseAchievementNotificationsOptions = {},
): UseAchievementNotificationsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // const { showToast } = useNotificationToast() // TODO: Implement useNotificationToast hook
  const showToast = (message: unknown) => console.log("Toast:", message); // Temporary placeholder

  const config = { ...DEFAULT_OPTIONS, ...options };

  // ============================================================================
  // State Management
  // ============================================================================

  const [activeAchievements, setActiveAchievements] = useState<
    AchievementNotificationDisplay[]
  >([]);
  const achievementIdCounter = useRef(0);
  const soundRef = useRef<HTMLAudioElement | null>(null);

  // ============================================================================
  // Sound and Vibration Setup
  // ============================================================================

  useEffect(() => {
    if (config.enableSounds && typeof window !== "undefined") {
      // Create achievement sound (you might want to load an actual sound file)
      soundRef.current = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
      );
      soundRef.current.volume = 0.3;
    }
  }, [config.enableSounds]);

  // ============================================================================
  // API Mutations
  // ============================================================================

  const sendAchievementMutation = useMutation({
    mutationFn: async (achievement: AchievementNotificationRequest) => {
      if (!user?.id) {
        throw new Error(
          "User must be authenticated to send achievement notifications",
        );
      }

      const achievementWithUser: AchievementNotificationRequest = {
        ...achievement,
        userId: requireStringUserId(user.id),
      };

      await notificationApiClient.sendAchievementNotification(
        achievementWithUser,
      );

      // If auto-display is enabled, show the achievement immediately
      if (config.enableAutoDisplay) {
        displayAchievement(achievementWithUser);
      }

      return achievementWithUser;
    },
    onSuccess: (achievement) => {
      // Invalidate notifications cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // Track the achievement send event
      trackAchievementView(achievement.userId);
    },
    onError: (error: NotificationError) => {
      console.error("Failed to send achievement notification:", error);

      // Show error toast
      if (user?.id) {
        showToast({
          id: `error-${Date.now()}`,
          userId: requireStringUserId(user.id),
          type: "system",
          title: "Achievement Error",
          body: "Failed to send achievement notification. Please try again.",
          priority: "normal",
          channels: ["in_app"],
          status: {
            isRead: false,
            isDelivered: true,
            deliveredAt: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        // Toast duration option would be passed here when the actual hook is implemented
      }
    },
  });

  // ============================================================================
  // Achievement Display Management
  // ============================================================================

  const displayAchievement = useCallback(
    (achievement: AchievementNotificationRequest) => {
      const achievementId = `achievement-${++achievementIdCounter.current}`;

      const displayAchievement: AchievementNotificationDisplay = {
        ...achievement,
        id: achievementId,
        timestamp: new Date(),
        isVisible: true,
      };

      setActiveAchievements((prev) => {
        // Remove oldest achievements if we exceed the max concurrent displays
        const newAchievements = [...prev, displayAchievement];
        if (newAchievements.length > config.maxConcurrentDisplays) {
          return newAchievements.slice(-config.maxConcurrentDisplays);
        }
        return newAchievements;
      });

      // Play sound effect
      if (config.enableSounds && soundRef.current) {
        soundRef.current.currentTime = 0;
        soundRef.current.play().catch(console.warn);
      }

      // Trigger vibration
      if (config.enableVibration && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // Track the display event
      trackAchievementView(achievementId);

      // Auto-dismiss after delay
      setTimeout(() => {
        dismissAchievement(achievementId);
      }, config.autoCloseDelay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismissAchievement and trackAchievementView are defined later in the file and adding them causes circular dependency
    [
      config.enableSounds,
      config.enableVibration,
      config.maxConcurrentDisplays,
      config.autoCloseDelay,
    ],
  );

  const dismissAchievement = useCallback((achievementId: string) => {
    setActiveAchievements((prev) =>
      prev.filter((achievement) => achievement.id !== achievementId),
    );

    // Track the dismiss event
    trackAchievementDismiss(achievementId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissAllAchievements = useCallback(() => {
    const currentAchievements = activeAchievements;
    setActiveAchievements([]);

    // Track dismiss events for all achievements
    currentAchievements.forEach((achievement) => {
      trackAchievementDismiss(achievement.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAchievements]);

  // ============================================================================
  // Analytics Tracking
  // ============================================================================

  const trackAchievementView = useCallback(
    (achievementId: string) => {
      if (!user?.id) return;

      // Track with notification service analytics
      notificationApiClient
        .trackOpen(achievementId, requireStringUserId(user.id))
        .catch((error) => {
          console.warn("Failed to track achievement view:", error);
        });
    },
    [user?.id],
  );

  const trackAchievementShare = useCallback(
    (achievementId: string, platform: string) => {
      if (!user?.id) return;

      // Track with notification service analytics
      notificationApiClient
        .trackClick(
          achievementId,
          requireStringUserId(user.id),
          `share_${platform}`,
        )
        .catch((error) => {
          console.warn("Failed to track achievement share:", error);
        });
    },
    [user?.id],
  );

  const trackAchievementDismiss = useCallback(
    (achievementId: string) => {
      if (!user?.id) return;

      // Track with notification service analytics
      notificationApiClient
        .trackClick(achievementId, requireStringUserId(user.id), "dismiss")
        .catch((error) => {
          console.warn("Failed to track achievement dismiss:", error);
        });
    },
    [user?.id],
  );

  // ============================================================================
  // Predefined Achievement Helpers
  // ============================================================================

  const sendCourseCompletionAchievement = useCallback(
    async (courseName: string, points: number = 100) => {
      if (!user?.id) return;

      await sendAchievementMutation.mutateAsync({
        userId: requireStringUserId(user.id),
        achievementName: "Course Completed",
        achievementDescription: `Congratulations! You've successfully completed the "${courseName}" course. Keep up the great work!`,
        achievementIcon: "🎓",
        points,
        badgeUrl: "/images/badges/course-completion.png",
      });
    },
    [user?.id, sendAchievementMutation],
  );

  const sendStreakAchievement = useCallback(
    async (streakCount: number, streakType: "daily" | "weekly" = "daily") => {
      if (!user?.id) return;

      const streakText = streakType === "daily" ? "day" : "week";
      const points = streakCount * (streakType === "daily" ? 10 : 50);

      await sendAchievementMutation.mutateAsync({
        userId: requireStringUserId(user.id),
        achievementName: `${streakCount} ${streakText.charAt(0).toUpperCase() + streakText.slice(1)} Streak`,
        achievementDescription: `Amazing! You've maintained a ${streakCount} ${streakText} learning streak. Your consistency is paying off!`,
        achievementIcon: "🔥",
        points,
        badgeUrl: `/images/badges/streak-${streakCount}.png`,
      });
    },
    [user?.id, sendAchievementMutation],
  );

  const sendScoreAchievement = useCallback(
    async (
      testName: string,
      score: number,
      isPersonalBest: boolean = false,
    ) => {
      if (!user?.id) return;

      const achievementName = isPersonalBest
        ? "Personal Best!"
        : "Great Score!";
      const description = isPersonalBest
        ? `New personal best! You scored ${score}% on "${testName}". You're getting better every time!`
        : `Excellent work! You scored ${score}% on "${testName}". Keep pushing your limits!`;

      await sendAchievementMutation.mutateAsync({
        userId: requireStringUserId(user.id),
        achievementName,
        achievementDescription: description,
        achievementIcon: isPersonalBest ? "🏆" : "⭐",
        points: Math.floor(score * 2),
        badgeUrl: isPersonalBest
          ? "/images/badges/personal-best.png"
          : "/images/badges/high-score.png",
      });
    },
    [user?.id, sendAchievementMutation],
  );

  const sendMilestoneAchievement = useCallback(
    async (milestone: string, description: string, points: number = 200) => {
      if (!user?.id) return;

      await sendAchievementMutation.mutateAsync({
        userId: requireStringUserId(user.id),
        achievementName: milestone,
        achievementDescription: description,
        achievementIcon: "🎯",
        points,
        badgeUrl: "/images/badges/milestone.png",
      });
    },
    [user?.id, sendAchievementMutation],
  );

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    // State
    activeAchievements,
    isPending: sendAchievementMutation.isPending,
    error: sendAchievementMutation.error as NotificationError | null,

    // Actions
    sendAchievementNotification: async (
      achievement: AchievementNotificationRequest,
    ) => {
      await sendAchievementMutation.mutateAsync(achievement);
    },
    displayAchievement,
    dismissAchievement,
    dismissAllAchievements,

    // Analytics
    trackAchievementView,
    trackAchievementShare,
    trackAchievementDismiss,

    // Predefined helpers
    sendCourseCompletionAchievement,
    sendStreakAchievement,
    sendScoreAchievement,
    sendMilestoneAchievement,
  };
}

export default useAchievementNotifications;
