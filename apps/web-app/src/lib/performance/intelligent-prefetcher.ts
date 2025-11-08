/**
 * Intelligent Prefetching and Preloading System
 * Implements Task 11.3:
 * - Predictive data loading based on user navigation patterns
 * - Dashboard data prefetching for improved perceived performance
 * - Critical path optimization for user onboarding flows
 * - Adaptive prefetching based on network conditions and device capabilities
 * Requirements: 10.4, 6.5, 11.1, 11.2
 */

import { UserServiceClient } from "../user-service/unified-client";
import { QueryClient } from "@tanstack/react-query";

// Network Information API types
interface NetworkInformation extends EventTarget {
  effectiveType: "2g" | "3g" | "4g" | "slow-2g";
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface NavigationPattern {
  from: string;
  to: string;
  frequency: number;
  averageTime: number;
  lastSeen: Date;
  prefetchTargets: string[];
}

export interface NetworkConditions {
  effectiveType: "2g" | "3g" | "4g" | "slow-2g";
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface DeviceCapabilities {
  memory: number;
  cores: number;
  isMobile: boolean;
  isLowEnd: boolean;
}

export interface PrefetchStrategy {
  id: string;
  name: string;
  priority: "critical" | "high" | "medium" | "low";
  trigger: "navigation" | "idle" | "interaction" | "time";
  condition: (context: PrefetchContext) => boolean;
  execute: (context: PrefetchContext) => Promise<void>;
  cooldown: number;
  lastExecuted?: Date;
}

export interface PrefetchContext {
  userId: string;
  currentRoute: string;
  navigationHistory: string[];
  networkConditions: NetworkConditions;
  deviceCapabilities: DeviceCapabilities;
  userPreferences: {
    dataSaver: boolean;
    prefetchEnabled: boolean;
  };
}

export interface PrefetchStats {
  totalPrefetches: number;
  successfulPrefetches: number;
  failedPrefetches: number;
  cacheHits: number;
  dataSaved: number;
  timesSaved: number;
}

export class IntelligentPrefetcher {
  private userServiceClient: UserServiceClient;
  private queryClient: QueryClient;
  private navigationPatterns: Map<string, NavigationPattern> = new Map();
  private prefetchStrategies: Map<string, PrefetchStrategy> = new Map();
  private stats: PrefetchStats;
  private isEnabled: boolean = true;
  private networkObserver: NetworkInformation | null = null;
  private idleCallback: number | null = null;

  constructor(userServiceClient: UserServiceClient, queryClient: QueryClient) {
    this.userServiceClient = userServiceClient;
    this.queryClient = queryClient;
    this.stats = {
      totalPrefetches: 0,
      successfulPrefetches: 0,
      failedPrefetches: 0,
      cacheHits: 0,
      dataSaved: 0,
      timesSaved: 0,
    };

    this.initializeStrategies();
    this.setupNetworkObserver();
    this.loadNavigationPatterns();
  }

  /**
   * Initialize prefetch strategies
   */
  private initializeStrategies(): void {
    // Critical path strategy - user onboarding
    this.addStrategy({
      id: "onboarding-critical",
      name: "Onboarding Critical Path",
      priority: "critical",
      trigger: "navigation",
      condition: (context) => context.currentRoute.includes("/onboarding"),
      execute: async (context) => {
        await this.prefetchOnboardingData(context.userId);
      },
      cooldown: 300000, // 5 minutes
    });

    // Dashboard prefetch strategy
    this.addStrategy({
      id: "dashboard-prefetch",
      name: "Dashboard Data Prefetch",
      priority: "high",
      trigger: "navigation",
      condition: (context) =>
        context.currentRoute === "/login" ||
        context.currentRoute === "/" ||
        context.navigationHistory.includes("/dashboard"),
      execute: async (context) => {
        await this.prefetchDashboardData(context.userId);
      },
      cooldown: 180000, // 3 minutes
    });

    // Navigation pattern strategy
    this.addStrategy({
      id: "navigation-pattern",
      name: "Navigation Pattern Prefetch",
      priority: "medium",
      trigger: "navigation",
      condition: (context) => this.hasNavigationPattern(context.currentRoute),
      execute: async (context) => {
        await this.prefetchByNavigationPattern(context);
      },
      cooldown: 120000, // 2 minutes
    });

    // Idle prefetch strategy
    this.addStrategy({
      id: "idle-prefetch",
      name: "Idle Time Prefetch",
      priority: "low",
      trigger: "idle",
      condition: (context) =>
        !context.networkConditions.saveData &&
        context.networkConditions.effectiveType !== "2g",
      execute: async (context) => {
        await this.prefetchIdleData(context.userId);
      },
      cooldown: 600000, // 10 minutes
    });

    // Interaction-based prefetch
    this.addStrategy({
      id: "interaction-prefetch",
      name: "Interaction-based Prefetch",
      priority: "medium",
      trigger: "interaction",
      condition: (context) => !context.deviceCapabilities.isLowEnd,
      execute: async (context) => {
        await this.prefetchInteractionData(context);
      },
      cooldown: 60000, // 1 minute
    });
  }

  /**
   * Add a prefetch strategy
   */
  addStrategy(strategy: PrefetchStrategy): void {
    this.prefetchStrategies.set(strategy.id, strategy);
  }

  /**
   * Execute prefetch based on trigger
   */
  async executePrefetch(
    trigger: "navigation" | "idle" | "interaction" | "time",
    context: PrefetchContext,
  ): Promise<void> {
    if (!this.isEnabled || context.userPreferences.dataSaver) {
      return;
    }

    const applicableStrategies = Array.from(this.prefetchStrategies.values())
      .filter(
        (strategy) =>
          strategy.trigger === trigger &&
          strategy.condition(context) &&
          this.canExecuteStrategy(strategy),
      )
      .sort(
        (a, b) =>
          this.getPriorityWeight(a.priority) -
          this.getPriorityWeight(b.priority),
      );

    for (const strategy of applicableStrategies) {
      try {
        this.stats.totalPrefetches++;
        await strategy.execute(context);
        strategy.lastExecuted = new Date();
        this.stats.successfulPrefetches++;
      } catch (error) {
        this.stats.failedPrefetches++;
        console.warn(`Prefetch strategy ${strategy.name} failed:`, error);
      }
    }
  }

  /**
   * Check if strategy can be executed (cooldown check)
   */
  private canExecuteStrategy(strategy: PrefetchStrategy): boolean {
    if (!strategy.lastExecuted) return true;

    const timeSinceLastExecution = Date.now() - strategy.lastExecuted.getTime();
    return timeSinceLastExecution >= strategy.cooldown;
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(
    priority: "critical" | "high" | "medium" | "low",
  ): number {
    const weights = { critical: 0, high: 1, medium: 2, low: 3 };
    return weights[priority];
  }

  /**
   * Prefetch onboarding critical path data
   */
  private async prefetchOnboardingData(userId: string): Promise<void> {
    const prefetchPromises = [
      // User profile for personalization
      this.queryClient.prefetchQuery({
        queryKey: ["user", userId],
        queryFn: () => this.userServiceClient.getUser(userId),
        staleTime: 5 * 60 * 1000, // 5 minutes
      }),

      // User preferences for UI customization
      this.queryClient.prefetchQuery({
        queryKey: ["userPreferences", userId],
        queryFn: () => this.userServiceClient.getUserPreferences(userId),
        staleTime: 10 * 60 * 1000, // 10 minutes
      }),

      // Initial progress summary
      this.queryClient.prefetchQuery({
        queryKey: ["progressSummary", userId],
        queryFn: () => this.userServiceClient.getProgressSummary(userId),
        staleTime: 2 * 60 * 1000, // 2 minutes
      }),
    ];

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Prefetch dashboard data
   */
  private async prefetchDashboardData(userId: string): Promise<void> {
    const prefetchPromises = [
      // Recent activity insights
      this.queryClient.prefetchQuery({
        queryKey: ["activityInsights", userId],
        queryFn: () => this.userServiceClient.getActivityInsights(userId),
        staleTime: 5 * 60 * 1000,
      }),

      // Learning streak
      this.queryClient.prefetchQuery({
        queryKey: ["learningStreak", userId],
        queryFn: () => this.userServiceClient.getLearningStreak(userId),
        staleTime: 10 * 60 * 1000,
      }),

      // Skill mastery overview
      this.queryClient.prefetchQuery({
        queryKey: ["skillMastery", userId],
        queryFn: () => this.userServiceClient.getSkillMastery(userId),
        staleTime: 15 * 60 * 1000,
      }),

      // Recent milestones
      this.queryClient.prefetchQuery({
        queryKey: ["milestones", userId],
        queryFn: () => this.userServiceClient.getMilestones(userId),
        staleTime: 30 * 60 * 1000,
      }),
    ];

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Prefetch based on navigation patterns
   */
  private async prefetchByNavigationPattern(
    context: PrefetchContext,
  ): Promise<void> {
    const pattern = this.getNavigationPattern(context.currentRoute);
    if (!pattern) return;

    const prefetchPromises: Promise<unknown>[] = [];

    for (const target of pattern.prefetchTargets) {
      switch (target) {
        case "progress":
          prefetchPromises.push(
            this.queryClient.prefetchQuery({
              queryKey: ["progressSummary", context.userId],
              queryFn: () =>
                this.userServiceClient.getProgressSummary(context.userId),
              staleTime: 5 * 60 * 1000,
            }),
          );
          break;

        case "activity":
          prefetchPromises.push(
            this.queryClient.prefetchQuery({
              queryKey: ["activitySummary", context.userId],
              queryFn: () =>
                this.userServiceClient.getActivitySummary(context.userId),
              staleTime: 2 * 60 * 1000,
            }),
          );
          break;

        case "recommendations":
          prefetchPromises.push(
            this.queryClient.prefetchQuery({
              queryKey: ["recommendations", context.userId],
              queryFn: () =>
                this.userServiceClient.getActivityRecommendations(
                  context.userId,
                ),
              staleTime: 10 * 60 * 1000,
            }),
          );
          break;
      }
    }

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Prefetch data during idle time
   */
  private async prefetchIdleData(userId: string): Promise<void> {
    // Lower priority data that can be prefetched when user is idle
    const prefetchPromises = [
      // Engagement metrics
      this.queryClient.prefetchQuery({
        queryKey: ["engagementMetrics", userId],
        queryFn: () => this.userServiceClient.getEngagementMetrics(userId),
        staleTime: 60 * 60 * 1000, // 1 hour
      }),

      // Privacy reports (if user has requested them)
      this.queryClient.prefetchQuery({
        queryKey: ["privacyReport", userId],
        queryFn: () => this.userServiceClient.generatePrivacyReport(userId),
        staleTime: 24 * 60 * 60 * 1000, // 24 hours
      }),
    ];

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Prefetch data based on user interactions
   */
  private async prefetchInteractionData(
    context: PrefetchContext,
  ): Promise<void> {
    // Prefetch data based on what user is likely to access next
    const prefetchPromises = [
      // Activity recommendations
      this.queryClient.prefetchQuery({
        queryKey: ["activityRecommendations", context.userId],
        queryFn: () =>
          this.userServiceClient.getActivityRecommendations(context.userId),
        staleTime: 5 * 60 * 1000,
      }),
    ];

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Record navigation pattern
   */
  recordNavigation(from: string, to: string, timeSpent: number): void {
    const patternKey = `${from}->${to}`;
    const existing = this.navigationPatterns.get(patternKey);

    if (existing) {
      existing.frequency++;
      existing.averageTime = (existing.averageTime + timeSpent) / 2;
      existing.lastSeen = new Date();
    } else {
      this.navigationPatterns.set(patternKey, {
        from,
        to,
        frequency: 1,
        averageTime: timeSpent,
        lastSeen: new Date(),
        prefetchTargets: this.determinePrefetchTargets(to),
      });
    }

    // Persist patterns
    this.saveNavigationPatterns();
  }

  /**
   * Determine what to prefetch for a route
   */
  private determinePrefetchTargets(route: string): string[] {
    const targets: string[] = [];

    if (route.includes("/dashboard")) {
      targets.push("progress", "activity", "recommendations");
    } else if (route.includes("/progress")) {
      targets.push("activity", "recommendations");
    } else if (route.includes("/profile")) {
      targets.push("progress", "activity");
    }

    return targets;
  }

  /**
   * Check if navigation pattern exists
   */
  private hasNavigationPattern(currentRoute: string): boolean {
    return Array.from(this.navigationPatterns.keys()).some((key) =>
      key.startsWith(currentRoute),
    );
  }

  /**
   * Get navigation pattern
   */
  private getNavigationPattern(currentRoute: string): NavigationPattern | null {
    const patterns = Array.from(this.navigationPatterns.entries())
      .filter(([key]) => key.startsWith(currentRoute))
      .sort(([, a], [, b]) => b.frequency - a.frequency);

    return patterns.length > 0 ? patterns[0]?.[1] || null : null;
  }

  /**
   * Setup network condition monitoring
   */
  private setupNetworkObserver(): void {
    if (
      typeof window !== "undefined" &&
      "navigator" in window &&
      "connection" in navigator
    ) {
      this.networkObserver =
        (navigator as Navigator & { connection?: NetworkInformation })
          .connection || null;

      if (this.networkObserver) {
        this.networkObserver.addEventListener("change", () => {
          // Adjust prefetch behavior based on network conditions
          this.adjustPrefetchBehavior();
        });
      }
    }
  }

  /**
   * Adjust prefetch behavior based on network conditions
   */
  private adjustPrefetchBehavior(): void {
    const conditions = this.getNetworkConditions();

    // Disable prefetching on slow networks or data saver mode
    if (conditions.effectiveType === "2g" || conditions.saveData) {
      this.isEnabled = false;
    } else {
      this.isEnabled = true;
    }
  }

  /**
   * Get current network conditions
   */
  getNetworkConditions(): NetworkConditions {
    if (
      typeof window !== "undefined" &&
      "navigator" in window &&
      "connection" in navigator
    ) {
      const connection = (
        navigator as Navigator & { connection?: NetworkInformation }
      ).connection;
      if (connection) {
        return {
          effectiveType:
            (connection.effectiveType as "2g" | "3g" | "4g" | "slow-2g") ||
            "4g",
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false,
        };
      }
    }

    return {
      effectiveType: "4g",
      downlink: 10,
      rtt: 100,
      saveData: false,
    };
  }

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities {
    const memory =
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    return {
      memory,
      cores,
      isMobile,
      isLowEnd: memory < 2 || cores < 2,
    };
  }

  /**
   * Load navigation patterns from storage
   */
  private loadNavigationPatterns(): void {
    try {
      const stored = localStorage.getItem("navigation-patterns");
      if (stored) {
        const patterns = JSON.parse(stored) as Record<
          string,
          NavigationPattern & { lastSeen: string }
        >;
        for (const [key, pattern] of Object.entries(patterns)) {
          this.navigationPatterns.set(key, {
            ...pattern,
            lastSeen: new Date(pattern.lastSeen),
          });
        }
      }
    } catch (error) {
      console.warn("Failed to load navigation patterns:", error);
    }
  }

  /**
   * Save navigation patterns to storage
   */
  private saveNavigationPatterns(): void {
    try {
      const patterns: Record<string, NavigationPattern> = {};
      for (const [key, pattern] of this.navigationPatterns.entries()) {
        patterns[key] = pattern;
      }
      localStorage.setItem("navigation-patterns", JSON.stringify(patterns));
    } catch (error) {
      console.warn("Failed to save navigation patterns:", error);
    }
  }

  /**
   * Get prefetch statistics
   */
  getStats(): PrefetchStats {
    return { ...this.stats };
  }

  /**
   * Enable/disable prefetching
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clear navigation patterns
   */
  clearNavigationPatterns(): void {
    this.navigationPatterns.clear();
    localStorage.removeItem("navigation-patterns");
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.networkObserver) {
      this.networkObserver.removeEventListener(
        "change",
        this.adjustPrefetchBehavior,
      );
    }

    if (this.idleCallback) {
      cancelIdleCallback(this.idleCallback);
    }

    this.saveNavigationPatterns();
  }
}

// Global intelligent prefetcher instance
let globalPrefetcher: IntelligentPrefetcher | null = null;

export function createIntelligentPrefetcher(
  userServiceClient: UserServiceClient,
  queryClient: QueryClient,
): IntelligentPrefetcher {
  if (!globalPrefetcher) {
    globalPrefetcher = new IntelligentPrefetcher(
      userServiceClient,
      queryClient,
    );
  }
  return globalPrefetcher;
}

export function getIntelligentPrefetcher(): IntelligentPrefetcher {
  if (!globalPrefetcher) {
    throw new Error(
      "Intelligent prefetcher not initialized. Call createIntelligentPrefetcher first.",
    );
  }
  return globalPrefetcher;
}
