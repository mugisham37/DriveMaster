/**
 * Content Cache Hook
 * 
 * Provides easy access to offline content caching.
 * Automatically caches content when loaded online.
 * Retrieves cached content when offline.
 * 
 * Requirements: 11.2
 * Task: 12.3
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useOffline } from "@/contexts/OfflineContext";
import {
  getContentCacheManager,
  isContentCachingSupported,
  type CachedContent,
  type CacheOptions,
} from "@/lib/offline/content-cache";

// ============================================================================
// Types
// ============================================================================

export interface ContentCacheState {
  isSupported: boolean;
  totalCached: number;
  cacheStats: {
    totalItems: number;
    byType: Record<string, number>;
    totalSize: number;
  } | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useContentCache() {
  const { isOffline } = useOffline();
  const [state, setState] = useState<ContentCacheState>({
    isSupported: isContentCachingSupported(),
    totalCached: 0,
    cacheStats: null,
  });

  const cacheManagerRef = useRef(getContentCacheManager());
  const isInitializedRef = useRef(false);

  // ============================================================================
  // Update Stats
  // ============================================================================

  const updateStats = useCallback(async () => {
    if (!isInitializedRef.current) return;

    try {
      const stats = await cacheManagerRef.current.getStats();

      setState((prev) => ({
        ...prev,
        totalCached: stats.totalItems,
        cacheStats: {
          totalItems: stats.totalItems,
          byType: stats.byType,
          totalSize: stats.totalSize,
        },
      }));
    } catch (error) {
      console.error("[ContentCache] Failed to update stats:", error);
    }
  }, []);

  // ============================================================================
  // Initialize
  // ============================================================================

  useEffect(() => {
    if (!isContentCachingSupported() || isInitializedRef.current) {
      return;
    }

    const init = async () => {
      try {
        await cacheManagerRef.current.init();
        isInitializedRef.current = true;

        // Load initial stats
        await updateStats();
      } catch (error) {
        console.error("[ContentCache] Failed to initialize:", error);
      }
    };

    init();
  }, [updateStats]);

  // ============================================================================
  // Cache Content
  // ============================================================================

  const cacheContent = useCallback(
    async (
      id: string,
      type: CachedContent["type"],
      data: unknown,
      options?: CacheOptions
    ): Promise<void> => {
      if (!isInitializedRef.current) {
        throw new Error("Content cache not initialized");
      }

      try {
        await cacheManagerRef.current.cacheContent(id, type, data, options);
        await updateStats();

        console.log("[ContentCache] Content cached:", id, type);
      } catch (error) {
        console.error("[ContentCache] Failed to cache content:", error);
        throw error;
      }
    },
    [updateStats]
  );

  // ============================================================================
  // Get Cached Content
  // ============================================================================

  const getCachedContent = useCallback(
    async (id: string): Promise<CachedContent | null> => {
      if (!isInitializedRef.current) {
        return null;
      }

      try {
        const content = await cacheManagerRef.current.getCachedContent(id);

        if (content) {
          console.log("[ContentCache] Retrieved cached content:", id);
        }

        return content;
      } catch (error) {
        console.error("[ContentCache] Failed to get cached content:", error);
        return null;
      }
    },
    []
  );

  // ============================================================================
  // Get Content with Fallback
  // ============================================================================

  const getContentWithFallback = useCallback(
    async <T,>(
      id: string,
      fetchFn: () => Promise<T>,
      type: CachedContent["type"],
      options?: CacheOptions
    ): Promise<{ data: T | null; fromCache: boolean }> => {
      // Try to fetch from network first if online
      if (!isOffline) {
        try {
          const data = await fetchFn();

          // Cache the fetched data
          await cacheContent(id, type, data, options);

          return { data, fromCache: false };
        } catch (error) {
          console.warn("[ContentCache] Network fetch failed, trying cache:", error);
        }
      }

      // Fallback to cache
      const cached = await getCachedContent(id);

      if (cached) {
        return { data: cached.data as T, fromCache: true };
      }

      return { data: null, fromCache: false };
    },
    [isOffline, cacheContent, getCachedContent]
  );

  // ============================================================================
  // Check if Cached
  // ============================================================================

  const isCached = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isInitializedRef.current) {
        return false;
      }

      try {
        return await cacheManagerRef.current.isCached(id);
      } catch (error) {
        console.error("[ContentCache] Failed to check if cached:", error);
        return false;
      }
    },
    []
  );

  // ============================================================================
  // Clear Cache
  // ============================================================================

  const clearCache = useCallback(async () => {
    if (!isInitializedRef.current) return;

    try {
      await cacheManagerRef.current.clearAll();
      await updateStats();

      console.log("[ContentCache] Cache cleared");
    } catch (error) {
      console.error("[ContentCache] Failed to clear cache:", error);
    }
  }, [updateStats]);

  // ============================================================================
  // Clear Expired
  // ============================================================================

  const clearExpired = useCallback(async () => {
    if (!isInitializedRef.current) return;

    try {
      const deletedCount = await cacheManagerRef.current.clearExpired();
      await updateStats();

      console.log(`[ContentCache] Cleared ${deletedCount} expired items`);
    } catch (error) {
      console.error("[ContentCache] Failed to clear expired:", error);
    }
  }, [updateStats]);

  // ============================================================================
  // Get Cached Content by Type
  // ============================================================================

  const getCachedContentByType = useCallback(
    async (type: CachedContent["type"]): Promise<CachedContent[]> => {
      if (!isInitializedRef.current) {
        return [];
      }

      try {
        return await cacheManagerRef.current.getCachedContentByType(type);
      } catch (error) {
        console.error("[ContentCache] Failed to get cached content by type:", error);
        return [];
      }
    },
    []
  );

  // ============================================================================
  // Periodic cleanup of expired content
  // ============================================================================

  useEffect(() => {
    if (!isInitializedRef.current) return;

    // Clear expired content every hour
    const interval = setInterval(() => {
      clearExpired();
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [clearExpired]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    state,
    cacheContent,
    getCachedContent,
    getContentWithFallback,
    isCached,
    clearCache,
    clearExpired,
    getCachedContentByType,
    isOffline,
  };
}

/**
 * Hook for caching and retrieving lesson data
 */
export function useLessonCache(lessonId: string | undefined) {
  const { cacheContent, getCachedContent, getContentWithFallback } = useContentCache();
  const { isOffline } = useOffline();

  const cacheLesson = useCallback(
    async (lessonData: unknown) => {
      if (!lessonId) return;

      await cacheContent(
        `lesson_${lessonId}`,
        "lesson",
        lessonData,
        {
          ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
          metadata: { lessonId },
        }
      );
    },
    [lessonId, cacheContent]
  );

  const getCachedLesson = useCallback(async () => {
    if (!lessonId) return null;

    const cached = await getCachedContent(`lesson_${lessonId}`);
    return cached?.data || null;
  }, [lessonId, getCachedContent]);

  const getLessonWithFallback = useCallback(
    async <T,>(fetchFn: () => Promise<T>) => {
      if (!lessonId) {
        return { data: null, fromCache: false };
      }

      return getContentWithFallback(
        `lesson_${lessonId}`,
        fetchFn,
        "lesson",
        {
          ttl: 7 * 24 * 60 * 60 * 1000,
          metadata: { lessonId },
        }
      );
    },
    [lessonId, getContentWithFallback]
  );

  return {
    cacheLesson,
    getCachedLesson,
    getLessonWithFallback,
    isOffline,
  };
}

/**
 * Hook for caching and retrieving user progress
 */
export function useProgressCache(userId: string | undefined) {
  const { cacheContent, getCachedContent } = useContentCache();

  const cacheProgress = useCallback(
    async (progressData: unknown) => {
      if (!userId) return;

      await cacheContent(
        `progress_${userId}`,
        "progress",
        progressData,
        {
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          userId,
          metadata: { lastSynced: new Date().toISOString() },
        }
      );
    },
    [userId, cacheContent]
  );

  const getCachedProgress = useCallback(async () => {
    if (!userId) return null;

    const cached = await getCachedContent(`progress_${userId}`);
    return cached?.data || null;
  }, [userId, getCachedContent]);

  return {
    cacheProgress,
    getCachedProgress,
  };
}
