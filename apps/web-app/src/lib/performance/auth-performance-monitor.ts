/**
 * Authentication Performance Monitor
 * Tracks and reports performance metrics for authentication operations
 */

import { authCache } from "../cache";
import { requestOptimizer } from "../http/request-optimizer";

/**
 * Performance metrics
 */
export interface AuthPerformanceMetrics {
  requestOptimization: {
    totalRequests: number;
    batchedRequests: number;
    deduplicatedRequests: number;
    compressionSavings: number;
    averageResponseTime: number;
  };
  caching: {
    hitRate: number;
    missRate: number;
    totalHits: number;
    totalMisses: number;
    memoryUsage: number;
  };
  authentication: {
    loginTime: number;
    tokenRefreshTime: number;
    profileFetchTime: number;
  };
}

/**
 * Performance Monitor Class
 */
export class AuthPerformanceMonitor {
  private metrics: AuthPerformanceMetrics = {
    requestOptimization: {
      totalRequests: 0,
      batchedRequests: 0,
      deduplicatedRequests: 0,
      compressionSavings: 0,
      averageResponseTime: 0,
    },
    caching: {
      hitRate: 0,
      missRate: 0,
      totalHits: 0,
      totalMisses: 0,
      memoryUsage: 0,
    },
    authentication: {
      loginTime: 0,
      tokenRefreshTime: 0,
      profileFetchTime: 0,
    },
  };

  /**
   * Get current performance metrics
   */
  getMetrics(): AuthPerformanceMetrics {
    // Update cache metrics
    const cacheStats = authCache.getStats();
    this.metrics.caching = {
      hitRate: cacheStats.hitRate,
      missRate: cacheStats.missRate,
      totalHits: cacheStats.totalHits,
      totalMisses: cacheStats.totalMisses,
      memoryUsage: cacheStats.memoryUsage,
    };

    // Update request optimization metrics
    const optimizerStats = requestOptimizer.getStats();
    this.metrics.requestOptimization.batchedRequests =
      optimizerStats.batchQueueSize;

    return { ...this.metrics };
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const metrics = this.getMetrics();

    console.group("🚀 Authentication Performance Summary");
    console.log("Cache Hit Rate:", `${metrics.caching.hitRate.toFixed(1)}%`);
    console.log(
      "Memory Usage:",
      `${(metrics.caching.memoryUsage / 1024).toFixed(1)} KB`,
    );
    console.log(
      "Batched Requests:",
      metrics.requestOptimization.batchedRequests,
    );
    console.groupEnd();
  }
}

export const authPerformanceMonitor = new AuthPerformanceMonitor();
