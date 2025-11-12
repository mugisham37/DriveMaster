"use client";

/**
 * Authentication Performance Testing Utilities
 * 
 * Provides tools to measure and verify performance optimizations:
 * - Request deduplication testing
 * - Cache hit rate measurement
 * - Optimistic update timing
 * - Virtual scrolling performance
 * 
 * Requirements: 13.2, 13.3, 13.4, 13.5
 */

import { optimizedAuthOps, authCache, authRequestDeduplicator } from "./performance-optimization";

// ============================================================================
// Performance Metrics Collection
// ============================================================================

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number | undefined;
  duration?: number | undefined;
  success: boolean;
  cached?: boolean | undefined;
  deduplicated?: boolean | undefined;
  metadata?: Record<string, unknown> | undefined;
}

class PerformanceMetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  /**
   * Start tracking a performance metric
   */
  startMetric(operation: string, metadata?: Record<string, unknown>): string {
    const metricId = `${operation}_${Date.now()}_${Math.random()}`;
    
    this.metrics.push({
      operation,
      startTime: performance.now(),
      success: false,
      metadata,
    });

    // Trim old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    return metricId;
  }

  /**
   * End tracking a performance metric
   */
  endMetric(
    operation: string,
    success: boolean,
    options: { cached?: boolean; deduplicated?: boolean } = {}
  ): void {
    const metric = this.metrics
      .slice()
      .reverse()
      .find((m) => m.operation === operation && !m.endTime);

    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      metric.cached = options.cached;
      metric.deduplicated = options.deduplicated;
    }
  }

  /**
   * Get metrics for a specific operation
   */
  getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter((m) => m.operation === operation);
    }
    return this.metrics;
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operation: string): number {
    const operationMetrics = this.metrics.filter(
      (m) => m.operation === operation && m.duration !== undefined
    );

    if (operationMetrics.length === 0) return 0;

    const totalDuration = operationMetrics.reduce(
      (sum, m) => sum + (m.duration || 0),
      0
    );

    return totalDuration / operationMetrics.length;
  }

  /**
   * Get cache hit rate for an operation
   */
  getCacheHitRate(operation: string): number {
    const operationMetrics = this.metrics.filter(
      (m) => m.operation === operation
    );

    if (operationMetrics.length === 0) return 0;

    const cachedCount = operationMetrics.filter((m) => m.cached).length;
    return (cachedCount / operationMetrics.length) * 100;
  }

  /**
   * Get deduplication rate for an operation
   */
  getDeduplicationRate(operation: string): number {
    const operationMetrics = this.metrics.filter(
      (m) => m.operation === operation
    );

    if (operationMetrics.length === 0) return 0;

    const deduplicatedCount = operationMetrics.filter(
      (m) => m.deduplicated
    ).length;
    return (deduplicatedCount / operationMetrics.length) * 100;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const operations = [...new Set(this.metrics.map((m) => m.operation))];

    return operations.map((operation) => ({
      operation,
      count: this.metrics.filter((m) => m.operation === operation).length,
      averageDuration: this.getAverageDuration(operation),
      cacheHitRate: this.getCacheHitRate(operation),
      deduplicationRate: this.getDeduplicationRate(operation),
      successRate:
        (this.metrics.filter((m) => m.operation === operation && m.success)
          .length /
          this.metrics.filter((m) => m.operation === operation).length) *
        100,
    }));
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        summary: this.getSummary(),
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

// Singleton instance
export const performanceMetrics = new PerformanceMetricsCollector();

// ============================================================================
// Request Deduplication Testing
// ============================================================================

/**
 * Test request deduplication by making concurrent requests
 */
export async function testRequestDeduplication() {
  console.log("[Performance Test] Testing request deduplication...");

  const testKey = "test_deduplication";
  let requestCount = 0;

  const testRequest = async () => {
    requestCount++;
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { data: "test", requestNumber: requestCount };
  };

  // Make 5 concurrent requests
  const promises = Array.from({ length: 5 }, () =>
    authRequestDeduplicator.execute(testKey, testRequest)
  );

  const results = await Promise.all(promises);

  // All results should be identical (same request number)
  const allSame = results.every(
    (r) => r.requestNumber === results[0].requestNumber
  );

  console.log("[Performance Test] Deduplication test results:", {
    totalRequests: 5,
    actualRequests: requestCount,
    deduplicated: allSame && requestCount === 1,
    results,
  });

  return {
    passed: allSame && requestCount === 1,
    totalRequests: 5,
    actualRequests: requestCount,
  };
}

// ============================================================================
// Cache Testing
// ============================================================================

/**
 * Test cache functionality
 */
export async function testCaching() {
  console.log("[Performance Test] Testing caching...");

  const testKey = "test_cache";
  const testData = { id: 1, name: "Test User" };

  // Set cache
  authCache.set(testKey, testData, 5000);

  // Get from cache
  const cached = authCache.get(testKey);

  // Test cache hit
  const cacheHit = cached !== null && JSON.stringify(cached) === JSON.stringify(testData);

  // Test cache expiration
  authCache.set("test_expire", testData, 1);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const expired = authCache.get("test_expire");

  console.log("[Performance Test] Cache test results:", {
    cacheHit,
    cacheExpired: expired === null,
    cacheStatus: authCache.getStatus(),
  });

  // Clean up
  authCache.invalidate(testKey);
  authCache.invalidate("test_expire");

  return {
    passed: cacheHit && expired === null,
    cacheHit,
    cacheExpired: expired === null,
  };
}

// ============================================================================
// Optimistic Update Testing
// ============================================================================

/**
 * Measure optimistic update performance
 */
export function measureOptimisticUpdate(
  updateFn: () => void,
  rollbackFn: () => void
): { updateTime: number; rollbackTime: number } {
  const updateStart = performance.now();
  updateFn();
  const updateTime = performance.now() - updateStart;

  const rollbackStart = performance.now();
  rollbackFn();
  const rollbackTime = performance.now() - rollbackStart;

  console.log("[Performance Test] Optimistic update timing:", {
    updateTime: `${updateTime.toFixed(2)}ms`,
    rollbackTime: `${rollbackTime.toFixed(2)}ms`,
  });

  return { updateTime, rollbackTime };
}

// ============================================================================
// Virtual Scrolling Performance Testing
// ============================================================================

/**
 * Generate mock sessions for virtual scrolling testing
 */
export function generateMockSessions(count: number) {
  const devices = ["Chrome on Windows", "Safari on macOS", "Firefox on Linux", "Edge on Windows"];
  const locations = ["New York, USA", "London, UK", "Tokyo, Japan", "Sydney, Australia"];

  return Array.from({ length: count }, (_, i) => ({
    id: `session_${i}`,
    userId: 1,
    deviceInfo: devices[i % devices.length],
    ipAddress: `192.168.${Math.floor(i / 256)}.${i % 256}`,
    userAgent: `Mozilla/5.0 (${devices[i % devices.length]})`,
    location: locations[i % locations.length],
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    lastActiveAt: new Date(Date.now() - i * 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    isCurrent: i === 0,
    isActive: true,
  }));
}

/**
 * Measure virtual scrolling render performance
 */
export function measureVirtualScrollPerformance(
  sessionCount: number,
  renderFn: () => void
): { renderTime: number; sessionCount: number } {
  const start = performance.now();
  renderFn();
  const renderTime = performance.now() - start;

  console.log("[Performance Test] Virtual scroll render time:", {
    sessionCount,
    renderTime: `${renderTime.toFixed(2)}ms`,
    averagePerSession: `${(renderTime / sessionCount).toFixed(4)}ms`,
  });

  return { renderTime, sessionCount };
}

// ============================================================================
// Comprehensive Performance Test Suite
// ============================================================================

/**
 * Run all performance tests
 */
export async function runPerformanceTestSuite() {
  console.log("[Performance Test] Starting comprehensive test suite...");

  const results = {
    deduplication: await testRequestDeduplication(),
    caching: await testCaching(),
    timestamp: new Date().toISOString(),
    performanceStatus: optimizedAuthOps.getPerformanceStatus(),
  };

  console.log("[Performance Test] Test suite completed:", results);

  return results;
}

/**
 * Get current performance status
 */
export function getPerformanceStatus() {
  return {
    metrics: performanceMetrics.getSummary(),
    cache: authCache.getStatus(),
    deduplicator: authRequestDeduplicator.getStatus(),
    timestamp: Date.now(),
  };
}

/**
 * Reset all performance tracking
 */
export function resetPerformanceTracking() {
  performanceMetrics.clear();
  authCache.clear();
  authRequestDeduplicator.clear();
  console.log("[Performance Test] All performance tracking reset");
}
