/**
 * User Service Monitoring and Analytics
 * 
 * Implements Task 17: Monitoring and Analytics
 * Tracks technical, user, and business metrics for user service features
 * Requirements: 15.1-15.12
 */

// ============================================================================
// Types
// ============================================================================

export interface TechnicalMetrics {
  apiResponseTimes: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRates: Record<string, number>;
  cacheHitRates: Record<string, number>;
  webSocketStability: {
    connectionCount: number;
    disconnectionCount: number;
    averageConnectionDuration: number;
  };
  bundleSizes: Record<string, number>;
  pageLoadTimes: Record<string, number>;
  timeToInteractive: Record<string, number>;
}

export interface UserMetrics {
  profileCompletionRate: number;
  onboardingCompletionRate: number;
  preferenceChangeFrequency: number;
  featureAdoptionRates: Record<string, number>;
  userEngagementScores: number[];
  sessionDuration: number[];
  returnFrequency: number;
}

export interface BusinessMetrics {
  userRetentionImpact: number;
  featureUsagePatterns: Record<string, number>;
  dropOffPoints: Record<string, number>;
  supportTicketReduction: number;
  userSatisfactionScores: number[];
}

export interface MetricsSnapshot {
  timestamp: Date;
  technical: TechnicalMetrics;
  user: UserMetrics;
  business: BusinessMetrics;
}

export interface LogContext {
  userId?: string;
  correlationId: string;
  operation: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface MetricsCollectorConfig {
  enableTechnicalMetrics: boolean;
  enableUserMetrics: boolean;
  enableBusinessMetrics: boolean;
  enableLogging: boolean;
  aggregationInterval: number;
  maxStoredSnapshots: number;
}

// ============================================================================
// Metrics Collector
// ============================================================================

class UserServiceMetricsCollector {
  private config: MetricsCollectorConfig;
  private snapshots: MetricsSnapshot[] = [];
  private apiResponseTimes: number[] = [];
  private errorCounts: Map<string, number> = new Map();
  private cacheHits: Map<string, { hits: number; total: number }> = new Map();
  private webSocketEvents: Array<{ type: 'connect' | 'disconnect'; timestamp: Date }> = [];
  private profileCompletions: number = 0;
  private profileStarts: number = 0;
  private onboardingCompletions: number = 0;
  private onboardingStarts: number = 0;
  private preferenceChanges: number = 0;
  private featureUsage: Map<string, number> = new Map();
  private sessionDurations: number[] = [];
  private engagementScores: number[] = [];
  private aggregationTimer?: ReturnType<typeof setInterval>;

  constructor(config?: Partial<MetricsCollectorConfig>) {
    this.config = {
      enableTechnicalMetrics: true,
      enableUserMetrics: true,
      enableBusinessMetrics: true,
      enableLogging: true,
      aggregationInterval: 60000, // 1 minute
      maxStoredSnapshots: 100,
      ...config,
    };

    if (typeof window !== 'undefined') {
      this.startAggregation();
    }
  }

  // ========================================================================
  // Technical Metrics (Task 17.1)
  // ========================================================================

  trackApiResponse(endpoint: string, duration: number, success: boolean): void {
    if (!this.config.enableTechnicalMetrics) return;

    this.apiResponseTimes.push(duration);
    
    if (!success) {
      this.errorCounts.set(endpoint, (this.errorCounts.get(endpoint) || 0) + 1);
    }
  }

  trackCacheAccess(cacheKey: string, hit: boolean): void {
    if (!this.config.enableTechnicalMetrics) return;

    const stats = this.cacheHits.get(cacheKey) || { hits: 0, total: 0 };
    stats.total++;
    if (hit) stats.hits++;
    this.cacheHits.set(cacheKey, stats);
  }

  trackWebSocketEvent(type: 'connect' | 'disconnect'): void {
    if (!this.config.enableTechnicalMetrics) return;

    this.webSocketEvents.push({ type, timestamp: new Date() });
  }

  trackPageLoad(page: string, loadTime: number, tti: number): void {
    if (!this.config.enableTechnicalMetrics) return;

    this.log('info', 'Page loaded', {
      operation: 'page_load',
      metadata: { page, loadTime, tti },
    });
  }

  trackBundleSize(chunk: string, size: number): void {
    if (!this.config.enableTechnicalMetrics) return;

    this.log('info', 'Bundle loaded', {
      operation: 'bundle_load',
      metadata: { chunk, size },
    });
  }

  // ========================================================================
  // User Metrics (Task 17.2)
  // ========================================================================

  trackProfileStart(): void {
    if (!this.config.enableUserMetrics) return;
    this.profileStarts++;
  }

  trackProfileCompletion(): void {
    if (!this.config.enableUserMetrics) return;
    this.profileCompletions++;
    this.log('info', 'Profile completed', {
      operation: 'profile_completion',
    });
  }

  trackOnboardingStart(): void {
    if (!this.config.enableUserMetrics) return;
    this.onboardingStarts++;
  }

  trackOnboardingCompletion(): void {
    if (!this.config.enableUserMetrics) return;
    this.onboardingCompletions++;
    this.log('info', 'Onboarding completed', {
      operation: 'onboarding_completion',
    });
  }

  trackPreferenceChange(category: string): void {
    if (!this.config.enableUserMetrics) return;
    this.preferenceChanges++;
    this.log('info', 'Preference changed', {
      operation: 'preference_change',
      metadata: { category },
    });
  }

  trackFeatureUsage(feature: string): void {
    if (!this.config.enableUserMetrics) return;
    this.featureUsage.set(feature, (this.featureUsage.get(feature) || 0) + 1);
  }

  trackSessionDuration(duration: number): void {
    if (!this.config.enableUserMetrics) return;
    this.sessionDurations.push(duration);
  }

  trackEngagementScore(score: number): void {
    if (!this.config.enableUserMetrics) return;
    this.engagementScores.push(score);
  }

  // ========================================================================
  // Business Metrics (Task 17.3)
  // ========================================================================

  trackUserRetention(retained: boolean): void {
    if (!this.config.enableBusinessMetrics) return;
    this.log('info', 'User retention tracked', {
      operation: 'user_retention',
      metadata: { retained },
    });
  }

  trackDropOff(flow: string, step: string): void {
    if (!this.config.enableBusinessMetrics) return;
    this.log('info', 'Drop-off detected', {
      operation: 'drop_off',
      metadata: { flow, step },
    });
  }

  trackUserSatisfaction(score: number): void {
    if (!this.config.enableBusinessMetrics) return;
    this.log('info', 'User satisfaction recorded', {
      operation: 'user_satisfaction',
      metadata: { score },
    });
  }

  // ========================================================================
  // Structured Logging (Task 17.4)
  // ========================================================================

  log(
    level: 'info' | 'warn' | 'error',
    message: string,
    context: Partial<LogContext>,
  ): void {
    if (!this.config.enableLogging) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: context.correlationId || this.generateCorrelationId(),
      userId: context.userId,
      operation: context.operation,
      duration: context.duration,
      metadata: this.sanitizeMetadata(context.metadata),
    };

    // In production, send to monitoring service
    if (level === 'error') {
      console.error('[UserService]', logEntry);
    } else if (level === 'warn') {
      console.warn('[UserService]', logEntry);
    } else {
      console.log('[UserService]', logEntry);
    }
  }

  logError(error: Error, context: Partial<LogContext>): void {
    this.log('error', error.message, {
      ...context,
      metadata: {
        ...context.metadata,
        stack: error.stack,
        name: error.name,
      },
    });
  }

  // ========================================================================
  // Metrics Aggregation and Reporting
  // ========================================================================

  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationInterval);
  }

  private aggregateMetrics(): void {
    const snapshot: MetricsSnapshot = {
      timestamp: new Date(),
      technical: this.aggregateTechnicalMetrics(),
      user: this.aggregateUserMetrics(),
      business: this.aggregateBusinessMetrics(),
    };

    this.snapshots.push(snapshot);
    
    if (this.snapshots.length > this.config.maxStoredSnapshots) {
      this.snapshots.shift();
    }

    // Reset counters
    this.resetCounters();
  }

  private aggregateTechnicalMetrics(): TechnicalMetrics {
    return {
      apiResponseTimes: this.calculatePercentiles(this.apiResponseTimes),
      errorRates: Object.fromEntries(this.errorCounts),
      cacheHitRates: Object.fromEntries(
        Array.from(this.cacheHits.entries()).map(([key, stats]) => [
          key,
          stats.total > 0 ? stats.hits / stats.total : 0,
        ])
      ),
      webSocketStability: this.calculateWebSocketStability(),
      bundleSizes: {},
      pageLoadTimes: {},
      timeToInteractive: {},
    };
  }

  private aggregateUserMetrics(): UserMetrics {
    return {
      profileCompletionRate: this.profileStarts > 0 
        ? this.profileCompletions / this.profileStarts 
        : 0,
      onboardingCompletionRate: this.onboardingStarts > 0
        ? this.onboardingCompletions / this.onboardingStarts
        : 0,
      preferenceChangeFrequency: this.preferenceChanges,
      featureAdoptionRates: Object.fromEntries(this.featureUsage),
      userEngagementScores: [...this.engagementScores],
      sessionDuration: [...this.sessionDurations],
      returnFrequency: 0,
    };
  }

  private aggregateBusinessMetrics(): BusinessMetrics {
    return {
      userRetentionImpact: 0,
      featureUsagePatterns: Object.fromEntries(this.featureUsage),
      dropOffPoints: {},
      supportTicketReduction: 0,
      userSatisfactionScores: [],
    };
  }

  private calculatePercentiles(values: number[]): { p50: number; p95: number; p99: number } {
    if (values.length === 0) return { p50: 0, p95: 0, p99: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
    };
  }

  private calculateWebSocketStability() {
    const connections = this.webSocketEvents.filter(e => e.type === 'connect').length;
    const disconnections = this.webSocketEvents.filter(e => e.type === 'disconnect').length;
    
    let totalDuration = 0;
    let connectionStart: Date | null = null;
    
    for (const event of this.webSocketEvents) {
      if (event.type === 'connect') {
        connectionStart = event.timestamp;
      } else if (event.type === 'disconnect' && connectionStart) {
        totalDuration += event.timestamp.getTime() - connectionStart.getTime();
        connectionStart = null;
      }
    }

    return {
      connectionCount: connections,
      disconnectionCount: disconnections,
      averageConnectionDuration: connections > 0 ? totalDuration / connections : 0,
    };
  }

  private resetCounters(): void {
    this.apiResponseTimes = [];
    this.errorCounts.clear();
    this.cacheHits.clear();
    this.webSocketEvents = [];
    this.profileCompletions = 0;
    this.profileStarts = 0;
    this.onboardingCompletions = 0;
    this.onboardingStarts = 0;
    this.preferenceChanges = 0;
    this.sessionDurations = [];
    this.engagementScores = [];
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata) return undefined;

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      // Remove sensitive fields
      if (['password', 'token', 'secret', 'apiKey'].some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // ========================================================================
  // Public API
  // ========================================================================

  getMetrics(): MetricsSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null;
  }

  getAllSnapshots(): MetricsSnapshot[] {
    return [...this.snapshots];
  }

  exportMetrics(): string {
    return JSON.stringify(this.snapshots, null, 2);
  }

  destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const userServiceMetrics = new UserServiceMetricsCollector();

export default userServiceMetrics;
