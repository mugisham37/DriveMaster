"use client";

/**
 * Achievement Notifications Context
 * 
 * Provides achievement notification management at the application level:
 * - Manages achievement notifications state
 * - Provides notification display functions
 * - Handles achievement modal state
 * 
 * Requirements: 10.4
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications';
import { AchievementToastContainer } from '@/components/learning-platform/notifications';
import { AchievementModal } from '@/components/learning-platform/notifications';
import type { AchievementNotification } from '@/hooks/useAchievementNotifications';
import type { Milestone } from '@/types/user-service';

// ============================================================================
// Context Types
// ============================================================================

export interface AchievementNotificationsContextValue {
  notifications: AchievementNotification[];
  activeNotifications: AchievementNotification[];
  recentAchievements: Milestone[];
  selectedAchievement: Milestone | null;
  handleNotificationClick: (notification: AchievementNotification) => void;
  dismissNotification: (notificationId: string) => void;
  dismissAllNotifications: () => void;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  closeAchievementModal: () => void;
}

const AchievementNotificationsContext = createContext<AchievementNotificationsContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface AchievementNotificationsProviderProps {
  children: ReactNode;
  enabled?: boolean;
  showToast?: boolean;
  autoHideDelay?: number;
  toastPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  onAchievementUnlocked?: (milestone: Milestone) => void;
  onNotificationClick?: (milestone: Milestone) => void;
}

export function AchievementNotificationsProvider({ 
  children, 
  enabled = true,
  showToast = true,
  autoHideDelay = 5000,
  toastPosition = 'top-right',
  onAchievementUnlocked,
  onNotificationClick,
}: AchievementNotificationsProviderProps) {
  const {
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
  } = useAchievementNotifications({
    enabled,
    showToast,
    autoHideDelay,
    ...(onAchievementUnlocked && { onAchievementUnlocked }),
    ...(onNotificationClick && { onNotificationClick }),
  });

  const contextValue: AchievementNotificationsContextValue = {
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

  return (
    <AchievementNotificationsContext.Provider value={contextValue}>
      {children}
      
      {/* Toast notifications */}
      {showToast && (
        <AchievementToastContainer
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onDismiss={dismissNotification}
          position={toastPosition}
        />
      )}

      {/* Achievement modal */}
      <AchievementModal
        achievement={selectedAchievement}
        isOpen={!!selectedAchievement}
        onClose={closeAchievementModal}
      />
    </AchievementNotificationsContext.Provider>
  );
}

// ============================================================================
// Hook to use AchievementNotifications context
// ============================================================================

export function useAchievementNotificationsContext(): AchievementNotificationsContextValue {
  const context = useContext(AchievementNotificationsContext);

  if (!context) {
    throw new Error('useAchievementNotificationsContext must be used within an AchievementNotificationsProvider');
  }

  return context;
}
