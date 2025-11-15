/**
 * Success Feedback Configuration
 * Task 18.4: Success feedback improvements
 * 
 * Centralized configuration for success messages, celebrations, and feedback
 */

import { toast } from 'sonner';

export const SUCCESS_MESSAGES = {
  PROFILE: {
    UPDATED: 'Profile updated successfully',
    CREATED: 'Profile created successfully',
    COMPLETED: 'Profile setup complete! Welcome aboard! 🎉',
  },
  PREFERENCES: {
    UPDATED: 'Preferences saved',
    RESET: 'Preferences reset to defaults',
    THEME_CHANGED: 'Theme updated',
    LANGUAGE_CHANGED: 'Language updated',
  },
  PROGRESS: {
    MILESTONE_ACHIEVED: '🎉 Milestone achieved!',
    STREAK_EXTENDED: '🔥 Streak extended!',
    LEVEL_UP: '⬆️ Level up!',
    MASTERY_IMPROVED: '📈 Mastery improved!',
  },
  GDPR: {
    CONSENT_UPDATED: 'Consent preferences updated',
    EXPORT_REQUESTED: 'Data export requested. You\'ll receive an email when ready.',
    EXPORT_READY: 'Your data export is ready for download',
    DELETION_REQUESTED: 'Account deletion requested. You have 30 days to cancel.',
    DELETION_CANCELLED: 'Account deletion cancelled',
  },
  ACTIVITY: {
    RECORDED: 'Activity recorded',
    SYNCED: 'Activities synced successfully',
  },
} as const;

export const CELEBRATION_TRIGGERS = {
  /** Show celebration for profile completion */
  PROFILE_COMPLETE: (completeness: number) => completeness >= 100,
  /** Show celebration for onboarding completion */
  ONBOARDING_COMPLETE: true,
  /** Show celebration for milestone achievements */
  MILESTONE_ACHIEVED: true,
  /** Show celebration for streak milestones (7, 30, 100 days) */
  STREAK_MILESTONE: (streak: number) => [7, 30, 100, 365].includes(streak),
  /** Show celebration for mastery level up */
  MASTERY_LEVEL_UP: (oldLevel: string, newLevel: string) => oldLevel !== newLevel,
} as const;

/**
 * Show success toast with appropriate styling
 */
export function showSuccessToast(
  message: string,
  options?: {
    description?: string;
    duration?: number;
    action?: { label: string; onClick: () => void };
  }
) {
  toast.success(message, {
    duration: options?.duration ?? 3000,
    description: options?.description,
    action: options?.action,
  });
}

/**
 * Show celebration toast with confetti or animation
 */
export function showCelebrationToast(
  message: string,
  options?: {
    description?: string;
    duration?: number;
    icon?: string;
  }
) {
  toast.success(message, {
    duration: options?.duration ?? 5000,
    description: options?.description,
    icon: options?.icon ?? '🎉',
    className: 'celebration-toast',
  });
}

/**
 * Show progress update toast
 */
export function showProgressToast(
  message: string,
  progress: number,
  options?: {
    description?: string;
    duration?: number;
  }
) {
  toast.success(message, {
    duration: options?.duration ?? 3000,
    description: options?.description ?? `${progress}% complete`,
  });
}

/**
 * Show streak update toast with flame emoji
 */
export function showStreakToast(streak: number, isNewRecord = false) {
  const message = isNewRecord
    ? `🔥 New record! ${streak} day streak!`
    : `🔥 ${streak} day streak!`;
  
  const description = isNewRecord
    ? 'You\'re on fire! Keep it up!'
    : 'Keep the momentum going!';
  
  showCelebrationToast(message, {
    description,
    duration: 4000,
    icon: '🔥',
  });
}

/**
 * Show milestone achievement toast
 */
export function showMilestoneToast(
  title: string,
  description?: string,
  options?: {
    icon?: string;
    duration?: number;
  }
) {
  showCelebrationToast(title, {
    description: description ?? 'You\'ve reached a new milestone!',
    duration: options?.duration ?? 5000,
    icon: options?.icon ?? '🏆',
  });
}

/**
 * Show level up toast
 */
export function showLevelUpToast(
  skill: string,
  newLevel: string,
  options?: {
    duration?: number;
  }
) {
  showCelebrationToast(`Level Up: ${skill}`, {
    description: `You've reached ${newLevel} level!`,
    duration: options?.duration ?? 5000,
    icon: '⬆️',
  });
}

/**
 * Show auto-save feedback
 */
export function showAutoSaveToast(status: 'saving' | 'saved' | 'error') {
  switch (status) {
    case 'saving':
      toast.loading('Saving...', { id: 'auto-save' });
      break;
    case 'saved':
      toast.success('Saved', {
        id: 'auto-save',
        duration: 2000,
        icon: '✓',
      });
      break;
    case 'error':
      toast.error('Failed to save', {
        id: 'auto-save',
        duration: 3000,
      });
      break;
  }
}
