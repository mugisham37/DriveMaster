/**
 * Haptic Feedback Hook
 * 
 * Provides vibration feedback for mobile devices
 * Requirements: 8.4, 10.1, 30.5
 */

import { useCallback } from 'react';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 50,
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [50, 100, 50, 100, 50],
};

export function useHapticFeedback() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const trigger = useCallback((pattern: HapticPattern = 'light') => {
    if (!isSupported) return false;

    try {
      const vibrationPattern = HAPTIC_PATTERNS[pattern];
      return navigator.vibrate(vibrationPattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  }, [isSupported]);

  const cancel = useCallback(() => {
    if (!isSupported) return false;
    
    try {
      return navigator.vibrate(0);
    } catch (error) {
      console.warn('Failed to cancel haptic feedback:', error);
      return false;
    }
  }, [isSupported]);

  return {
    trigger,
    cancel,
    isSupported,
  };
}

export default useHapticFeedback;
