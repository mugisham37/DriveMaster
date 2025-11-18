'use client';

import { useState, useCallback, useEffect } from 'react';
import type { NotificationType } from '@/types/notifications';

interface UseNotificationSoundReturn {
  playSound: (type: NotificationType) => void;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  testSound: (type: NotificationType) => void;
}

// Sound file mappings for different notification types
const SOUND_FILES: Record<NotificationType, string> = {
  achievement: '/sounds/achievement.mp3',
  streak_reminder: '/sounds/reminder.mp3',
  spaced_repetition: '/sounds/reminder.mp3',
  mock_test_reminder: '/sounds/reminder.mp3',
  system: '/sounds/notification.mp3',
  mentoring: '/sounds/message.mp3',
  course_update: '/sounds/notification.mp3',
};

export function useNotificationSound(): UseNotificationSoundReturn {
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [audioCache, setAudioCache] = useState<Map<NotificationType, HTMLAudioElement>>(new Map());

  // Load sound preferences from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedEnabled = localStorage.getItem('notificationSoundEnabled');
    const savedVolume = localStorage.getItem('notificationSoundVolume');

    if (savedEnabled !== null) {
      setIsEnabled(savedEnabled === 'true');
    }

    if (savedVolume !== null) {
      const parsedVolume = parseFloat(savedVolume);
      if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1) {
        setVolume(parsedVolume);
      }
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem('notificationSoundEnabled', String(isEnabled));
    localStorage.setItem('notificationSoundVolume', String(volume));
  }, [isEnabled, volume]);

  // Preload audio files
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cache = new Map<NotificationType, HTMLAudioElement>();

    Object.entries(SOUND_FILES).forEach(([type, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = volume;
      cache.set(type as NotificationType, audio);
    });

    setAudioCache(cache);

    // Cleanup
    return () => {
      cache.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  // Update volume for all cached audio elements
  useEffect(() => {
    audioCache.forEach((audio) => {
      audio.volume = volume;
    });
  }, [volume, audioCache]);

  // Play sound for notification type
  const playSound = useCallback(
    (type: NotificationType) => {
      if (!isEnabled || typeof window === 'undefined') return;

      // Check quiet hours (if implemented)
      // TODO: Integrate with user preferences for quiet hours

      const audio = audioCache.get(type);
      if (audio) {
        // Reset audio to start if already playing
        audio.currentTime = 0;
        
        // Play with error handling
        audio.play().catch((error) => {
          console.warn('Failed to play notification sound:', error);
        });
      } else {
        // Fallback: create new audio element if not cached
        const fallbackAudio = new Audio(SOUND_FILES[type] || SOUND_FILES.system);
        fallbackAudio.volume = volume;
        fallbackAudio.play().catch((error) => {
          console.warn('Failed to play notification sound:', error);
        });
      }
    },
    [isEnabled, volume, audioCache]
  );

  // Test sound (for settings preview)
  const testSound = useCallback(
    (type: NotificationType) => {
      playSound(type);
    },
    [playSound]
  );

  // Set enabled with validation
  const setEnabledWithValidation = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
  }, []);

  // Set volume with validation
  const setVolumeWithValidation = useCallback((newVolume: number) => {
    if (newVolume < 0 || newVolume > 1) {
      console.warn('Volume must be between 0 and 1');
      return;
    }
    setVolume(newVolume);
  }, []);

  return {
    playSound,
    isEnabled,
    setEnabled: setEnabledWithValidation,
    volume,
    setVolume: setVolumeWithValidation,
    testSound,
  };
}
