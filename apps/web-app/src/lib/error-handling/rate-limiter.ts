/**
 * Rate Limiting Protection
 * Prevents notification overload and respects API limits
 */

export interface RateLimitConfig {
  maxPerHour: number;
  maxPerDay: number;
  criticalBypass: boolean;
}

export interface RateLimitStatus {
  hourlyUsed: number;
  hourlyRemaining: number;
  dailyUsed: number;
  dailyRemaining: number;
  isLimited: boolean;
  resetTime: Date;
}

export class RateLimiter {
  private hourlyCount: number = 0;
  private dailyCount: number = 0;
  private hourlyResetTime: Date;
  private dailyResetTime: Date;
  private queue: Array<{ notification: any; priority: string }> = [];

  constructor(private config: RateLimitConfig) {
    this.hourlyResetTime = this.getNextHourReset();
    this.dailyResetTime = this.getNextDayReset();
    this.startResetTimers();
  }

  /**
   * Check if notification can be sent
   */
  canSend(priority: string = 'normal'): boolean {
    // Critical notifications bypass limits
    if (priority === 'critical' && this.config.criticalBypass) {
      return true;
    }

    this.checkAndReset();

    return (
      this.hourlyCount < this.config.maxPerHour &&
      this.dailyCount < this.config.maxPerDay
    );
  }

  /**
   * Record notification sent
   */
  recordSent(priority: string = 'normal'): void {
    if (priority === 'critical' && this.config.criticalBypass) {
      return; // Don't count critical notifications
    }

    this.hourlyCount++;
    this.dailyCount++;
  }

  /**
   * Queue notification for later delivery
   */
  queueNotification(notification: any, priority: string = 'normal'): void {
    this.queue.push({ notification, priority });
    console.log(
      `[RateLimiter] Queued notification. Queue size: ${this.queue.length}`
    );
  }

  /**
   * Get queued notifications
   */
  getQueue(): Array<{ notification: any; priority: string }> {
    return [...this.queue];
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Process queued notifications
   */
  processQueue(): Array<{ notification: any; priority: string }> {
    const processed: Array<{ notification: any; priority: string }> = [];

    while (this.queue.length > 0 && this.canSend(this.queue[0].priority)) {
      const item = this.queue.shift()!;
      this.recordSent(item.priority);
      processed.push(item);
    }

    return processed;
  }

  /**
   * Get current status
   */
  getStatus(): RateLimitStatus {
    this.checkAndReset();

    return {
      hourlyUsed: this.hourlyCount,
      hourlyRemaining: Math.max(0, this.config.maxPerHour - this.hourlyCount),
      dailyUsed: this.dailyCount,
      dailyRemaining: Math.max(0, this.config.maxPerDay - this.dailyCount),
      isLimited:
        this.hourlyCount >= this.config.maxPerHour ||
        this.dailyCount >= this.config.maxPerDay,
      resetTime:
        this.hourlyCount >= this.config.maxPerHour
          ? this.hourlyResetTime
          : this.dailyResetTime,
    };
  }

  /**
   * Check if limits should be reset
   */
  private checkAndReset(): void {
    const now = new Date();

    if (now >= this.hourlyResetTime) {
      this.hourlyCount = 0;
      this.hourlyResetTime = this.getNextHourReset();
      console.log('[RateLimiter] Hourly limit reset');
    }

    if (now >= this.dailyResetTime) {
      this.dailyCount = 0;
      this.dailyResetTime = this.getNextDayReset();
      console.log('[RateLimiter] Daily limit reset');
    }
  }

  /**
   * Get next hour reset time
   */
  private getNextHourReset(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
  }

  /**
   * Get next day reset time
   */
  private getNextDayReset(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  }

  /**
   * Start automatic reset timers
   */
  private startResetTimers(): void {
    // Check every minute
    setInterval(() => {
      this.checkAndReset();
      // Process queue after reset
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, 60000);
  }

  /**
   * Get warning threshold (80% of limit)
   */
  isApproachingLimit(): boolean {
    const hourlyThreshold = this.config.maxPerHour * 0.8;
    const dailyThreshold = this.config.maxPerDay * 0.8;

    return this.hourlyCount >= hourlyThreshold || this.dailyCount >= dailyThreshold;
  }
}

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxPerHour: 20,
  maxPerDay: 100,
  criticalBypass: true,
};

/**
 * Create rate limiter instance
 */
export function createRateLimiter(
  config: Partial<RateLimitConfig> = {}
): RateLimiter {
  return new RateLimiter({
    ...DEFAULT_RATE_LIMIT_CONFIG,
    ...config,
  });
}
