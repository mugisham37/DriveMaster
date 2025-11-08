/**
 * Notification Service Lazy Loader
 * Simplified version - implements code splitting and lazy loading for notification components
 * Requirements: 7.4
 */

import type { ComponentType } from "react";

export interface LazyLoadConfig {
  threshold: number;
  rootMargin: string;
  enableImageLazyLoading: boolean;
  enableComponentLazyLoading: boolean;
  enableUtilityLazyLoading: boolean;
  chunkPrefetchDelay: number;
}

export interface LazyLoadStats {
  componentsLoaded: number;
  imagesLoaded: number;
  utilitiesLoaded: number;
  bytesLoaded: number;
  loadTime: number;
  cacheHits: number;
}

export class NotificationLazyLoader {
  private config: LazyLoadConfig;
  private stats: LazyLoadStats;
  private componentCache: Map<string, ComponentType> = new Map();
  private loadingPromises: Map<string, Promise<ComponentType>> = new Map();

  constructor(config: Partial<LazyLoadConfig> = {}) {
    this.config = {
      threshold: 0.1,
      rootMargin: "50px",
      enableImageLazyLoading: true,
      enableComponentLazyLoading: true,
      enableUtilityLazyLoading: true,
      chunkPrefetchDelay: 2000,
      ...config,
    };

    this.stats = {
      componentsLoaded: 0,
      imagesLoaded: 0,
      utilitiesLoaded: 0,
      bytesLoaded: 0,
      loadTime: 0,
      cacheHits: 0,
    };

    this.prefetchCriticalChunks();
  }

  /**
   * Prefetch critical notification chunks
   */
  private prefetchCriticalChunks(): void {
    if (!this.config.enableComponentLazyLoading) {
      return;
    }

    setTimeout(() => {
      void this.getComponent("NotificationCenter");
      void this.getComponent("NotificationsList");
    }, this.config.chunkPrefetchDelay);
  }

  /**
   * Get component with caching
   */
  public async getComponent(componentName: string): Promise<ComponentType> {
    // Check cache first
    if (this.componentCache.has(componentName)) {
      this.stats.cacheHits++;
      return this.componentCache.get(componentName)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName)!;
    }

    // Dynamic import map
    const componentMap: Record<
      string,
      () => Promise<{ default: ComponentType }>
    > = {
      NotificationCenter: () =>
        import("@/components/notifications/NotificationCenter") as Promise<{
          default: ComponentType;
        }>,
      NotificationsList: () =>
        import("@/components/notifications/NotificationsList") as Promise<{
          default: ComponentType;
        }>,
      NotificationPreferences: () =>
        import(
          "@/components/notifications/NotificationPreferences"
        ) as Promise<{ default: ComponentType }>,
      NotificationToastSystem: () =>
        import(
          "@/components/notifications/NotificationToastSystem"
        ) as Promise<{ default: ComponentType }>,
      AchievementNotification: () =>
        import(
          "@/components/notifications/AchievementNotification"
        ) as Promise<{ default: ComponentType }>,
      SpacedRepetitionReminder: () =>
        import(
          "@/components/notifications/SpacedRepetitionReminder"
        ) as Promise<{ default: ComponentType }>,
      StreakReminder: () =>
        import("@/components/notifications/StreakReminder") as Promise<{
          default: ComponentType;
        }>,
      MockTestReminder: () =>
        import("@/components/notifications/MockTestReminder") as Promise<{
          default: ComponentType;
        }>,
      NotificationAnalyticsDashboard: () =>
        import(
          "@/components/notifications/NotificationAnalyticsDashboard"
        ) as Promise<{ default: ComponentType }>,
      PushPermissionFlow: () =>
        import("@/components/notifications/PushPermissionFlow") as Promise<{
          default: ComponentType;
        }>,
    };

    const importFn = componentMap[componentName];
    if (!importFn) {
      throw new Error(`Unknown notification component: ${componentName}`);
    }

    // Start loading
    const loadPromise = importFn().then((mod) => {
      this.componentCache.set(componentName, mod.default);
      this.stats.componentsLoaded++;
      this.loadingPromises.delete(componentName);
      return mod.default;
    });

    this.loadingPromises.set(componentName, loadPromise);
    return loadPromise;
  }

  /**
   * Get statistics
   */
  public getStats(): LazyLoadStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      componentsLoaded: 0,
      imagesLoaded: 0,
      utilitiesLoaded: 0,
      bytesLoaded: 0,
      loadTime: 0,
      cacheHits: 0,
    };
  }

  /**
   * Clear caches
   */
  public clearCaches(): void {
    this.componentCache.clear();
  }

  /**
   * Destroy lazy loader and cleanup
   */
  public destroy(): void {
    this.clearCaches();
    this.loadingPromises.clear();
  }
}

// Singleton instance
let lazyLoaderInstance: NotificationLazyLoader | null = null;

/**
 * Get lazy loader instance
 */
export function getNotificationLazyLoader(): NotificationLazyLoader {
  if (!lazyLoaderInstance) {
    lazyLoaderInstance = new NotificationLazyLoader();
  }
  return lazyLoaderInstance;
}
