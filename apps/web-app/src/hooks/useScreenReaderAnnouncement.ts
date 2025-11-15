/**
 * useScreenReaderAnnouncement Hook
 * 
 * Provides screen reader announcement functionality using ARIA live regions.
 * Implements WCAG 2.1 screen reader accessibility requirements.
 * 
 * Requirements: 10.4, 10.5, 10.6, 10.7
 * Task: 13.2
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { announceToScreenReader } from '@/utils/accessibility';

// ============================================================================
// Types
// ============================================================================

export interface UseScreenReaderAnnouncementOptions {
  /**
   * Priority level for announcements
   * - polite: Wait for current speech to finish
   * - assertive: Interrupt current speech
   */
  priority?: 'polite' | 'assertive';

  /**
   * Debounce delay in milliseconds
   * Prevents rapid-fire announcements
   */
  debounceMs?: number;
}

export interface UseScreenReaderAnnouncementReturn {
  /**
   * Announce a message to screen readers
   */
  announce: (message: string, priority?: 'polite' | 'assertive') => void;

  /**
   * Clear any pending announcements
   */
  clearAnnouncements: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useScreenReaderAnnouncement(
  options: UseScreenReaderAnnouncementOptions = {}
): UseScreenReaderAnnouncementReturn {
  const {
    priority: defaultPriority = 'polite',
    debounceMs = 100,
  } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncementRef = useRef<string>('');

  // ============================================================================
  // Announcement Function
  // ============================================================================

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = defaultPriority) => {
      // Skip if message is empty or same as last announcement
      if (!message || message === lastAnnouncementRef.current) {
        return;
      }

      // Clear any pending announcement
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the announcement
      timeoutRef.current = setTimeout(() => {
        announceToScreenReader(message, priority);
        lastAnnouncementRef.current = message;
      }, debounceMs);
    },
    [defaultPriority, debounceMs]
  );

  // ============================================================================
  // Clear Function
  // ============================================================================

  const clearAnnouncements = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lastAnnouncementRef.current = '';
  }, []);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    announce,
    clearAnnouncements,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for announcing form validation errors
 */
export function useFormErrorAnnouncement() {
  const { announce } = useScreenReaderAnnouncement({
    priority: 'assertive',
    debounceMs: 200,
  });

  const announceError = useCallback(
    (fieldName: string, errorMessage: string) => {
      announce(`${fieldName}: ${errorMessage}`);
    },
    [announce]
  );

  const announceErrors = useCallback(
    (errors: Record<string, string>) => {
      const errorCount = Object.keys(errors).length;
      if (errorCount === 0) return;

      const message =
        errorCount === 1
          ? `Form has 1 error: ${Object.values(errors)[0]}`
          : `Form has ${errorCount} errors. Please review and correct them.`;

      announce(message);
    },
    [announce]
  );

  return {
    announceError,
    announceErrors,
  };
}

/**
 * Hook for announcing loading states
 */
export function useLoadingAnnouncement() {
  const { announce } = useScreenReaderAnnouncement({
    priority: 'polite',
    debounceMs: 500, // Wait a bit before announcing loading
  });

  const announceLoading = useCallback(
    (resourceName: string = 'content') => {
      announce(`Loading ${resourceName}, please wait`);
    },
    [announce]
  );

  const announceLoaded = useCallback(
    (resourceName: string = 'content') => {
      announce(`${resourceName} loaded successfully`);
    },
    [announce]
  );

  const announceError = useCallback(
    (resourceName: string = 'content', error?: string) => {
      const message = error
        ? `Failed to load ${resourceName}: ${error}`
        : `Failed to load ${resourceName}`;
      announce(message);
    },
    [announce]
  );

  return {
    announceLoading,
    announceLoaded,
    announceError,
  };
}

/**
 * Hook for announcing progress updates
 */
export function useProgressAnnouncement() {
  const { announce } = useScreenReaderAnnouncement({
    priority: 'polite',
    debounceMs: 1000, // Don't announce too frequently
  });

  const announceProgress = useCallback(
    (current: number, total: number, unit: string = 'items') => {
      const percentage = Math.round((current / total) * 100);
      announce(`Progress: ${current} of ${total} ${unit}, ${percentage} percent complete`);
    },
    [announce]
  );

  const announceCompletion = useCallback(
    (taskName: string = 'Task') => {
      announce(`${taskName} completed successfully`);
    },
    [announce]
  );

  return {
    announceProgress,
    announceCompletion,
  };
}

/**
 * Hook for announcing navigation changes
 */
export function useNavigationAnnouncement() {
  const { announce } = useScreenReaderAnnouncement({
    priority: 'polite',
    debounceMs: 100,
  });

  const announcePageChange = useCallback(
    (pageName: string) => {
      announce(`Navigated to ${pageName} page`);
    },
    [announce]
  );

  const announceTabChange = useCallback(
    (tabName: string) => {
      announce(`${tabName} tab selected`);
    },
    [announce]
  );

  const announceModalOpen = useCallback(
    (modalName: string) => {
      announce(`${modalName} dialog opened`);
    },
    [announce]
  );

  const announceModalClose = useCallback(
    (modalName: string) => {
      announce(`${modalName} dialog closed`);
    },
    [announce]
  );

  return {
    announcePageChange,
    announceTabChange,
    announceModalOpen,
    announceModalClose,
  };
}

/**
 * Hook for announcing data updates
 */
export function useDataUpdateAnnouncement() {
  const { announce } = useScreenReaderAnnouncement({
    priority: 'polite',
    debounceMs: 500,
  });

  const announceSaved = useCallback(
    (itemName: string = 'Changes') => {
      announce(`${itemName} saved successfully`);
    },
    [announce]
  );

  const announceDeleted = useCallback(
    (itemName: string) => {
      announce(`${itemName} deleted successfully`);
    },
    [announce]
  );

  const announceCreated = useCallback(
    (itemName: string) => {
      announce(`${itemName} created successfully`);
    },
    [announce]
  );

  const announceUpdated = useCallback(
    (itemName: string) => {
      announce(`${itemName} updated successfully`);
    },
    [announce]
  );

  return {
    announceSaved,
    announceDeleted,
    announceCreated,
    announceUpdated,
  };
}

/**
 * Hook for announcing notifications
 */
export function useNotificationAnnouncement() {
  const { announce } = useScreenReaderAnnouncement({
    priority: 'assertive', // Notifications should interrupt
    debounceMs: 100,
  });

  const announceNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      const prefix = type === 'error' ? 'Error: ' : type === 'warning' ? 'Warning: ' : '';
      announce(`${prefix}${message}`);
    },
    [announce]
  );

  return {
    announceNotification,
  };
}
