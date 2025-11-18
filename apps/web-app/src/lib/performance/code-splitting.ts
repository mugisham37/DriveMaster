/**
 * Code Splitting Configuration
 * Lazy load heavy components for better performance
 */

import { lazy } from 'react';

// Admin Components - Lazy loaded
export const NotificationTemplateManager = lazy(() =>
  import('@/components/notifications/organisms/NotificationTemplateManager').then(
    (mod) => ({ default: mod.NotificationTemplateManager })
  )
);

export const NotificationAnalyticsDashboard = lazy(() =>
  import('@/components/notifications/NotificationAnalyticsDashboard').then(
    (mod) => ({ default: mod.NotificationAnalyticsDashboard })
  )
);

// Specialized Notifications - Lazy loaded
export const AchievementNotification = lazy(() =>
  import('@/components/notifications/AchievementNotification').then(
    (mod) => ({ default: mod.AchievementNotification })
  )
);

export const StreakReminder = lazy(() =>
  import('@/components/notifications/StreakReminder').then(
    (mod) => ({ default: mod.StreakReminder })
  )
);

export const MockTestReminder = lazy(() =>
  import('@/components/notifications/MockTestReminder').then(
    (mod) => ({ default: mod.MockTestReminder })
  )
);

export const SpacedRepetitionReminder = lazy(() =>
  import('@/components/notifications/SpacedRepetitionReminder').then(
    (mod) => ({ default: mod.SpacedRepetitionReminder })
  )
);

export const MentoringNotification = lazy(() =>
  import('@/components/notifications/MentoringNotification').then(
    (mod) => ({ default: mod.MentoringNotification })
  )
);

export const SystemNotification = lazy(() =>
  import('@/components/notifications/SystemNotification').then(
    (mod) => ({ default: mod.SystemNotification })
  )
);

// Chart Library - Lazy loaded
export const loadRecharts = () => import('recharts');

// Confetti - Lazy loaded
export const loadConfetti = () => import('canvas-confetti');

/**
 * Preload critical components
 */
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be needed soon
  import('@/components/notifications/NotificationCenter');
  import('@/components/notifications/NotificationToastSystem');
};

/**
 * Preload admin components when user has admin role
 */
export const preloadAdminComponents = () => {
  import('@/components/notifications/organisms/NotificationTemplateManager');
  import('@/components/notifications/NotificationAnalyticsDashboard');
  loadRecharts();
};
