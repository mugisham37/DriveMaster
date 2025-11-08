/**
 * Content Service Prefetching and Cache Warming
 *
 * Implements intelligent prefetching and cache warming strategies
 * Requirements: 6.5
 */

import { contentServiceClient } from "../client";
import { contentServiceCache } from "./content-service-cache";
import type { ContentItem, QueryItemsDto, ContentType } from "../types";

// ============================================================================
// Prefetch Manager
// ============================================================================

interface PrefetchTask {
  id: string;
  priority: "high" | "medium" | "low";
  operation: () => Promise<unknown>;
  cacheKey: string;
  estimatedSize: number;
  createdAt: Date;
  retries: number;
}

interface PrefetchStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  cacheHitRate: number;
  averageResponseTime: number;
  lastReset: Date;
}

export class PrefetchManager {
  private taskQueue: PrefetchTask[] = [];
  private activeTasks = new Set<string>();
  private stats: PrefetchStats;
  private isRunning = false;
  private maxConcurrentTasks = 3;
  private maxRetries = 2;
  private taskTimeout = 10000; // 10 seconds
  private idleThreshold = 1000; // 1 second of inactivity before prefetching
  private lastActivity = Date.now();
  private activityTimer: NodeJS.Timeout | undefined;
  private prefetchTimer: NodeJS.Timeout | undefined;

  constructor() {
    this.stats = this.initializeStats();
    this.setupActivityMonitoring();
  }

  /**
   * Adds a prefetch task to the queue
   */
  addTask(
    id: string,
    operation: () => Promise<unknown>,
    cacheKey: string,
    priority: "high" | "medium" | "low" = "medium",
    estimatedSize: number = 1024,
  ): void {
    // Don't add duplicate tasks
    if (
      this.taskQueue.some((task) => task.id === id) ||
      this.activeTasks.has(id)
    ) {
      return;
    }

    const task: PrefetchTask = {
      id,
      priority,
      operation,
      cacheKey,
      estimatedSize,
      createdAt: new Date(),
      retries: 0,
    };

    // Insert task based on priority
    const insertIndex = this.findInsertIndex(task);
    this.taskQueue.splice(insertIndex, 0, task);

    this.stats.totalTasks++;

    // Start processing if not already running
    if (!this.isRunning) {
      this.startProcessing();
    }
  }

  /**
   * Prefetches content items based on usage patterns
   */
  async prefetchContentItems(
    params?: QueryItemsDto,
    priority: "high" | "medium" | "low" = "medium",
  ): Promise<void> {
    const taskId = `content-items-${JSON.stringify(params)}`;
    const cacheKey = contentServiceCache.generateKey(
      "content-items",
      params as Record<string, unknown>,
    );

    this.addTask(
      taskId,
      () => contentServiceClient.getContentItems(params),
      cacheKey,
      priority,
      5120, // Estimated 5KB for content list
    );
  }

  /**
   * Prefetches a specific content item
   */
  async prefetchContentItem(
    id: string,
    priority: "high" | "medium" | "low" = "medium",
  ): Promise<void> {
    const taskId = `content-item-${id}`;
    const cacheKey = contentServiceCache.generateKey("content-item", { id });

    this.addTask(
      taskId,
      () => contentServiceClient.getContentItem(id),
      cacheKey,
      priority,
      2048, // Estimated 2KB for single content item
    );
  }

  /**
   * Prefetches related content based on current content
   */
  async prefetchRelatedContent(currentItem: ContentItem): Promise<void> {
    // Prefetch items with similar tags
    if (currentItem.tags.length > 0) {
      this.prefetchContentItems(
        {
          tags: currentItem.tags.slice(0, 3), // Use first 3 tags
          limit: 5,
          type: currentItem.type,
        },
        "low",
      );
    }

    // Prefetch items of the same type
    this.prefetchContentItems(
      {
        type: currentItem.type,
        limit: 10,
      },
      "low",
    );

    // Prefetch media assets if any
    if (currentItem.mediaAssets.length > 0) {
      currentItem.mediaAssets.forEach((asset) => {
        this.addTask(
          `media-asset-${asset.id}`,
          () => contentServiceClient.getMediaAsset(asset.id),
          contentServiceCache.generateKey("media-asset", { id: asset.id }),
          "low",
          asset.size || 1024,
        );
      });
    }
  }

  /**
   * Warms cache with frequently accessed content
   */
  async warmCache(contentIds: string[]): Promise<number> {
    let successCount = 0;

    for (const id of contentIds) {
      try {
        await this.prefetchContentItem(id, "high");
        successCount++;
      } catch (error) {
        console.warn(`Failed to warm cache for content ${id}:`, error);
      }
    }

    return successCount;
  }

  /**
   * Prefetches content based on user behavior patterns
   */
  async prefetchByUserBehavior(
    userId: string,
    recentlyViewed: string[],
  ): Promise<void> {
    // Prefetch recommendations
    this.addTask(
      `recommendations-${userId}`,
      () => contentServiceClient.getRecommendations(userId, "personalized"),
      contentServiceCache.generateKey("recommendations", { userId }),
      "medium",
      3072, // Estimated 3KB for recommendations
    );

    // Prefetch content similar to recently viewed
    for (const itemId of recentlyViewed.slice(0, 5)) {
      try {
        const item = await contentServiceClient.getContentItem(itemId);
        await this.prefetchRelatedContent(item);
      } catch (error) {
        console.warn(
          `Failed to prefetch related content for ${itemId}:`,
          error,
        );
      }
    }
  }

  /**
   * Prefetches content during idle time
   */
  async prefetchDuringIdle(): Promise<void> {
    // Only prefetch if user has been idle
    if (Date.now() - this.lastActivity < this.idleThreshold) {
      return;
    }

    // Prefetch popular content
    this.prefetchContentItems(
      {
        sortBy: "createdAt",
        limit: 20,
      },
      "low",
    );

    // Prefetch recent content
    this.prefetchContentItems(
      {
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 10,
      },
      "low",
    );
  }

  /**
   * Gets prefetch statistics
   */
  getStats(): PrefetchStats {
    return { ...this.stats };
  }

  /**
   * Resets statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Clears the prefetch queue
   */
  clearQueue(): void {
    this.taskQueue = [];
    this.activeTasks.clear();
  }

  /**
   * Stops prefetching
   */
  stop(): void {
    this.isRunning = false;
    this.clearQueue();

    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer);
    }
  }

  /**
   * Records user activity to delay prefetching
   */
  recordActivity(): void {
    this.lastActivity = Date.now();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeStats(): PrefetchStats {
    return {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      lastReset: new Date(),
    };
  }

  private findInsertIndex(task: PrefetchTask): number {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const taskPriority = priorityOrder[task.priority];

    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTask = this.taskQueue[i];
      if (queuedTask) {
        const queuedTaskPriority = priorityOrder[queuedTask.priority];
        if (taskPriority < queuedTaskPriority) {
          return i;
        }
      }
    }

    return this.taskQueue.length;
  }

  private async startProcessing(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    while (this.taskQueue.length > 0 && this.isRunning) {
      // Wait if we have too many concurrent tasks
      if (this.activeTasks.size >= this.maxConcurrentTasks) {
        await this.delay(100);
        continue;
      }

      const task = this.taskQueue.shift();
      if (!task) continue;

      // Skip if user is active (not idle)
      if (Date.now() - this.lastActivity < this.idleThreshold) {
        await this.delay(this.idleThreshold);
        continue;
      }

      this.processTask(task);
    }

    this.isRunning = false;
  }

  private async processTask(task: PrefetchTask): Promise<void> {
    this.activeTasks.add(task.id);

    try {
      const startTime = Date.now();

      // Set timeout for the task
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Task timeout")), this.taskTimeout);
      });

      // Execute the task with timeout
      const result = await Promise.race([task.operation(), timeoutPromise]);

      const responseTime = Date.now() - startTime;

      // Cache the result
      contentServiceCache.set(task.cacheKey, result, 300000); // 5 minutes TTL

      // Update stats
      this.stats.completedTasks++;
      this.updateAverageResponseTime(responseTime);

      console.log(`[Prefetch] Completed task ${task.id} in ${responseTime}ms`);
    } catch (error) {
      console.warn(`[Prefetch] Task ${task.id} failed:`, error);

      // Retry if under retry limit
      if (task.retries < this.maxRetries) {
        task.retries++;
        this.taskQueue.unshift(task); // Add back to front of queue
      } else {
        this.stats.failedTasks++;
      }
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalCompleted = this.stats.completedTasks;
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (totalCompleted - 1) + responseTime) /
      totalCompleted;
  }

  private setupActivityMonitoring(): void {
    // Monitor for user activity to pause prefetching
    if (typeof window !== "undefined") {
      const events = [
        "mousedown",
        "mousemove",
        "keypress",
        "scroll",
        "touchstart",
      ];

      const activityHandler = () => {
        this.recordActivity();
      };

      events.forEach((event) => {
        window.addEventListener(event, activityHandler, { passive: true });
      });

      // Start idle prefetching timer
      this.prefetchTimer = setInterval(() => {
        this.prefetchDuringIdle();
      }, 30000); // Check every 30 seconds
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const prefetchManager = new PrefetchManager();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Prefetches content based on current page context
 */
export async function prefetchForPage(
  pageType: string,
  pageData?: Record<string, unknown>,
): Promise<void> {
  switch (pageType) {
    case "content-list":
      await prefetchManager.prefetchContentItems(pageData as QueryItemsDto);
      break;

    case "content-detail":
      if (pageData?.id) {
        await prefetchManager.prefetchContentItem(pageData.id as string);

        // Prefetch related content
        try {
          const item = await contentServiceClient.getContentItem(
            pageData.id as string,
          );
          await prefetchManager.prefetchRelatedContent(item);
        } catch (error) {
          console.warn("Failed to prefetch related content:", error);
        }
      }
      break;

    case "search":
      // Prefetch popular searches or recent content
      await prefetchManager.prefetchContentItems({ limit: 20 });
      break;

    case "dashboard":
      // Prefetch user-specific content
      if (pageData?.userId) {
        await prefetchManager.prefetchByUserBehavior(
          pageData.userId as string,
          (pageData.recentlyViewed as string[]) || [],
        );
      }
      break;
  }
}

/**
 * Intelligent cache warming based on usage patterns
 */
export async function intelligentCacheWarming(usageData: {
  popularContent: string[];
  userPreferences: Record<string, unknown>;
  recentActivity: string[];
}): Promise<void> {
  // Warm cache with popular content
  await prefetchManager.warmCache(usageData.popularContent.slice(0, 10));

  // Prefetch based on user preferences
  if (usageData.userPreferences.favoriteTypes) {
    const types = usageData.userPreferences.favoriteTypes as string[];
    for (const type of types.slice(0, 3)) {
      await prefetchManager.prefetchContentItems({
        type: type as ContentType,
        limit: 5,
      });
    }
  }

  // Prefetch recent activity context
  for (const itemId of usageData.recentActivity.slice(0, 5)) {
    await prefetchManager.prefetchContentItem(itemId, "medium");
  }
}
