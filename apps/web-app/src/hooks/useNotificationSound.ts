/**
 * Notification Sound Management Hook
 *
 * Provides hooks for notification sound playback with volume control,
 * quiet hours integration, and user preferences.
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useNotificationPreferences } from "./useNotificationPreferences";
import type { NotificationType } from "@/types/notification-service";

// ============================================================================
// Sound Configuration
// ============================================================================

export interface SoundConfig {
  enabled: boolean;
  volume: number; // 0-1
  soundsEnabled: Record<NotificationType, boolean>;
  customSounds?: Record<NotificationType, string>;
}

const DEFAULT_SOUND_CONFIG: SoundConfig = {
  enabled: true,
  volume: 0.5,
  soundsEnabled: {
    achievement: true,
    spaced_repetition: true,
    streak_reminder: true,
    mock_test_reminder: true,
    system: true,
    mentoring: true,
    course_update: false,
    community: false,
    marketing: false,
  },
};

// Default sound URLs (can be customized)
const DEFAULT_SOUNDS: Record<NotificationType, string> = {
  achievement: "/sounds/achievement.mp3",
  spaced_repetition: "/sounds/reminder.mp3",
  streak_reminder: "/sounds/streak.mp3",
  mock_test_reminder: "/sounds/test.mp3",
  system: "/sounds/system.mp3",
  mentoring: "/sounds/message.mp3",
  course_update: "/sounds/update.mp3",
  community: "/sounds/community.mp3",
  marketing: "/sounds/notification.mp3",
};

// ============================================================================
// Notification Sound Hook
// ============================================================================

export interface UseNotificationSoundOptions {
  initialConfig?: Partial<SoundConfig>;
  respectQuietHours?: boolean;
}

export interface UseNotificationSoundResult {
  config: SoundConfig;
  isPlaying: boolean;
  playSound: (type: NotificationType, customUrl?: string) => Promise<void>;
  stopSound: () => void;
  testSound: (type: NotificationType) => Promise<void>;
  updateConfig: (updates: Partial<SoundConfig>) => void;
  setVolume: (volume: number) => void;
  toggleSound: (type: NotificationType, enabled: boolean) => void;
  toggleAllSounds: (enabled: boolean) => void;
  isInQuietHours: boolean;
}

/**
 * Hook for managing notification sounds
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */
export function useNotificationSound(
  options: UseNotificationSoundOptions = {},
): UseNotificationSoundResult {
  const { initialConfig, respectQuietHours = true } = options;
  const { preferences } = useNotificationPreferences();

  // Sound configuration state
  const [config, setConfig] = useState<SoundConfig>(() => ({
    ...DEFAULT_SOUND_CONFIG,
    ...initialConfig,
  }));

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if currently in quiet hours
  const isInQuietHours = useCallback((): boolean => {
    if (!respectQuietHours || !preferences?.quietHours?.enabled) {
      return false;
    }

    const quietHours = preferences.quietHours;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Parse quiet hours times
    const [startHour, startMin] = quietHours.start.split(":").map(Number);
    const [endHour, endMin] = quietHours.end.split(":").map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Check if current day is in quiet hours days
    if (quietHours.daysOfWeek && quietHours.daysOfWeek.length > 0) {
      const currentDay = now.getDay();
      if (!quietHours.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  }, [preferences, respectQuietHours]);

  // Play sound function
  const playSound = useCallback(
    async (type: NotificationType, customUrl?: string): Promise<void> => {
      // Check if sounds are enabled
      if (!config.enabled || !config.soundsEnabled[type]) {
        return;
      }

      // Check quiet hours
      if (isInQuietHours()) {
        return;
      }

      // Stop any currently playing sound
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      try {
        // Get sound URL
        const soundUrl =
          customUrl ||
          config.customSounds?.[type] ||
          DEFAULT_SOUNDS[type];

        // Create and configure audio element
        const audio = new Audio(soundUrl);
        audio.volume = config.volume;
        audioRef.current = audio;

        // Set up event listeners
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
          audioRef.current = null;
        });

        audio.addEventListener("error", (error) => {
          console.error("Failed to play notification sound:", error);
          setIsPlaying(false);
          audioRef.current = null;
        });

        // Play the sound
        setIsPlaying(true);
        await audio.play();
      } catch (error) {
        console.error("Error playing notification sound:", error);
        setIsPlaying(false);
        audioRef.current = null;
      }
    },
    [config, isInQuietHours],
  );

  // Stop sound function
  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  // Test sound function
  const testSound = useCallback(
    async (type: NotificationType): Promise<void> => {
      // Temporarily bypass quiet hours for testing
      const originalRespectQuietHours = respectQuietHours;

      try {
        await playSound(type);
      } finally {
        // Restore original setting
        // (This is handled by the playSound function checking isInQuietHours)
      }
    },
    [playSound, respectQuietHours],
  );

  // Update configuration
  const updateConfig = useCallback((updates: Partial<SoundConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...updates,
      soundsEnabled: {
        ...prev.soundsEnabled,
        ...(updates.soundsEnabled || {}),
      },
      customSounds: {
        ...prev.customSounds,
        ...(updates.customSounds || {}),
      },
    }));
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setConfig((prev) => ({ ...prev, volume: clampedVolume }));

    // Update current audio if playing
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  // Toggle sound for specific type
  const toggleSound = useCallback(
    (type: NotificationType, enabled: boolean) => {
      setConfig((prev) => ({
        ...prev,
        soundsEnabled: {
          ...prev.soundsEnabled,
          [type]: enabled,
        },
      }));
    },
    [],
  );

  // Toggle all sounds
  const toggleAllSounds = useCallback((enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      enabled,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Persist config to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("notificationSoundConfig", JSON.stringify(config));
    }
  }, [config]);

  // Load config from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notificationSoundConfig");
      if (stored) {
        try {
          const parsedConfig = JSON.parse(stored);
          setConfig((prev) => ({ ...prev, ...parsedConfig }));
        } catch (error) {
          console.error("Failed to parse stored sound config:", error);
        }
      }
    }
  }, []);

  return {
    config,
    isPlaying,
    playSound,
    stopSound,
    testSound,
    updateConfig,
    setVolume,
    toggleSound,
    toggleAllSounds,
    isInQuietHours: isInQuietHours(),
  };
}

// ============================================================================
// Sound Preloader Hook
// ============================================================================

export interface UseSoundPreloaderResult {
  preloadSounds: (types: NotificationType[]) => Promise<void>;
  isPreloading: boolean;
  preloadedSounds: Set<NotificationType>;
}

/**
 * Hook for preloading notification sounds
 * Requirements: 17.1, 17.4
 */
export function useSoundPreloader(): UseSoundPreloaderResult {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadedSounds, setPreloadedSounds] = useState<Set<NotificationType>>(
    new Set(),
  );

  const preloadSounds = useCallback(
    async (types: NotificationType[]): Promise<void> => {
      setIsPreloading(true);

      try {
        const promises = types.map(async (type) => {
          const soundUrl = DEFAULT_SOUNDS[type];
          const audio = new Audio();

          return new Promise<NotificationType>((resolve, reject) => {
            audio.addEventListener("canplaythrough", () => {
              resolve(type);
            });

            audio.addEventListener("error", () => {
              reject(new Error(`Failed to preload sound for ${type}`));
            });

            audio.src = soundUrl;
            audio.load();
          });
        });

        const loaded = await Promise.allSettled(promises);

        const successful = loaded
          .filter((result) => result.status === "fulfilled")
          .map(
            (result) =>
              (result as PromiseFulfilledResult<NotificationType>).value,
          );

        setPreloadedSounds(new Set(successful));
      } catch (error) {
        console.error("Error preloading sounds:", error);
      } finally {
        setIsPreloading(false);
      }
    },
    [],
  );

  return {
    preloadSounds,
    isPreloading,
    preloadedSounds,
  };
}

// ============================================================================
// Sound Utilities
// ============================================================================

export interface UseSoundUtilitiesResult {
  getSoundDuration: (type: NotificationType) => Promise<number>;
  isSoundAvailable: (type: NotificationType) => Promise<boolean>;
  getAvailableSounds: () => NotificationType[];
}

/**
 * Hook for sound utility functions
 * Requirements: 17.1, 17.4
 */
export function useSoundUtilities(): UseSoundUtilitiesResult {
  const getSoundDuration = useCallback(
    async (type: NotificationType): Promise<number> => {
      return new Promise((resolve, reject) => {
        const audio = new Audio(DEFAULT_SOUNDS[type]);

        audio.addEventListener("loadedmetadata", () => {
          resolve(audio.duration);
        });

        audio.addEventListener("error", () => {
          reject(new Error(`Failed to load sound for ${type}`));
        });

        audio.load();
      });
    },
    [],
  );

  const isSoundAvailable = useCallback(
    async (type: NotificationType): Promise<boolean> => {
      try {
        await getSoundDuration(type);
        return true;
      } catch {
        return false;
      }
    },
    [getSoundDuration],
  );

  const getAvailableSounds = useCallback((): NotificationType[] => {
    return Object.keys(DEFAULT_SOUNDS) as NotificationType[];
  }, []);

  return {
    getSoundDuration,
    isSoundAvailable,
    getAvailableSounds,
  };
}
