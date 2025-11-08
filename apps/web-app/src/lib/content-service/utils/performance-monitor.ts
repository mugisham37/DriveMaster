/**
 * Performance Monitoring Utilities
 *
 * Monitors and tracks performance metrics for content service operations
 */

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface PerformanceStats {
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  totalOperations: number;
  successRate: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  /**
   * Records a performance metric
   */
  record(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Gets statistics for a specific operation
   */
  getStats(operation?: string): PerformanceStats {
    const filtered = operation
      ? this.metrics.filter((m) => m.operation === operation)
      : this.metrics;

    if (filtered.length === 0) {
      return {
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalOperations: 0,
        successRate: 0,
      };
    }

    const durations = filtered.map((m) => m.duration);
    const successes = filtered.filter((m) => m.success).length;

    return {
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalOperations: filtered.length,
      successRate: successes / filtered.length,
    };
  }

  /**
   * Gets all metrics
   */
  getMetrics(operation?: string): PerformanceMetric[] {
    return operation
      ? this.metrics.filter((m) => m.operation === operation)
      : [...this.metrics];
  }

  /**
   * Clears all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Records a request operation with timing information
   */
  recordRequest(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>,
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
    };
    if (metadata) {
      metric.metadata = metadata;
    }
    this.record(metric);
  }
}

// Global instance
const monitor = new PerformanceMonitor();

/**
 * Tracks the performance of an async operation
 */
export async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const startTime = performance.now();
  let success = false;

  try {
    const result = await fn();
    success = true;
    return result;
  } finally {
    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
    };
    if (metadata) {
      metric.metadata = metadata;
    }
    monitor.record(metric);
  }
}

/**
 * Gets the global performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  return monitor;
}

/**
 * Export the monitor instance for direct use
 */
export const performanceMonitor = monitor;

/**
 * Gets performance statistics
 */
export function getPerformanceStats(operation?: string): PerformanceStats {
  return monitor.getStats(operation);
}

/**
 * Logs performance metrics to console
 */
export function logPerformanceStats(operation?: string): void {
  const stats = monitor.getStats(operation);
  const label = operation || "All Operations";

  console.log(`[Performance Stats] ${label}`, {
    average: `${stats.averageDuration.toFixed(2)}ms`,
    min: `${stats.minDuration.toFixed(2)}ms`,
    max: `${stats.maxDuration.toFixed(2)}ms`,
    total: stats.totalOperations,
    successRate: `${(stats.successRate * 100).toFixed(1)}%`,
  });
}
