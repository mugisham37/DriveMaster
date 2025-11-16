/**
 * Performance Monitoring Utilities
 * 
 * Utilities for tracking and monitoring performance metrics
 */

// ============================================================================
// Performance Metrics Types
// ============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PageLoadMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  tti: number; // Time to Interactive
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  ttfb: number; // Time to First Byte
}

// ============================================================================
// Performance Measurement
// ============================================================================

/**
 * Measure the execution time of a function
 */
export async function measureExecutionTime<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await Promise.resolve(fn());
  const endTime = performance.now();
  const duration = endTime - startTime;

  logPerformanceMetric({
    name,
    value: duration,
    unit: 'ms',
    timestamp: Date.now(),
  });

  return { result, duration };
}

/**
 * Create a performance mark
 */
export function mark(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure time between two marks
 */
export function measure(name: string, startMark: string, endMark: string): number | null {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      if (entries.length > 0) {
        return entries[0].duration;
      }
    } catch (error) {
      console.warn('Performance measurement failed:', error);
    }
  }
  return null;
}

// ============================================================================
// Web Vitals Monitoring
// ============================================================================

/**
 * Observe and report Core Web Vitals
 */
export function observeWebVitals(callback: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined') return;

  // First Contentful Paint (FCP)
  observeFCP((value) => {
    callback({
      name: 'FCP',
      value,
      unit: 'ms',
      timestamp: Date.now(),
    });
  });

  // Largest Contentful Paint (LCP)
  observeLCP((value) => {
    callback({
      name: 'LCP',
      value,
      unit: 'ms',
      timestamp: Date.now(),
    });
  });

  // Cumulative Layout Shift (CLS)
  observeCLS((value) => {
    callback({
      name: 'CLS',
      value,
      unit: 'count',
      timestamp: Date.now(),
    });
  });

  // First Input Delay (FID)
  observeFID((value) => {
    callback({
      name: 'FID',
      value,
      unit: 'ms',
      timestamp: Date.now(),
    });
  });
}

function observeFCP(callback: (value: number) => void): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        callback(entry.startTime);
        observer.disconnect();
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['paint'] });
  } catch (error) {
    console.warn('FCP observation failed:', error);
  }
}

function observeLCP(callback: (value: number) => void): void {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      callback(lastEntry.startTime);
    }
  });

  try {
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (error) {
    console.warn('LCP observation failed:', error);
  }
}

function observeCLS(callback: (value: number) => void): void {
  let clsValue = 0;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
      if (!layoutShift.hadRecentInput && layoutShift.value) {
        clsValue += layoutShift.value;
        callback(clsValue);
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['layout-shift'] });
  } catch (error) {
    console.warn('CLS observation failed:', error);
  }
}

function observeFID(callback: (value: number) => void): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const firstInput = entry as PerformanceEntry & { processingStart?: number };
      if (firstInput.processingStart) {
        callback(firstInput.processingStart - entry.startTime);
        observer.disconnect();
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['first-input'] });
  } catch (error) {
    console.warn('FID observation failed:', error);
  }
}

// ============================================================================
// Resource Timing
// ============================================================================

/**
 * Get resource timing information
 */
export function getResourceTiming(): PerformanceResourceTiming[] {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return [];
  }

  return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
}

/**
 * Calculate total resource size
 */
export function getTotalResourceSize(): number {
  const resources = getResourceTiming();
  return resources.reduce((total, resource) => {
    const size = resource.transferSize ?? 0;
    return total + size;
  }, 0);
}

/**
 * Get slow resources (loading time > threshold)
 */
export function getSlowResources(thresholdMs: number = 1000): PerformanceResourceTiming[] {
  const resources = getResourceTiming();
  return resources.filter((resource) => {
    return resource.duration > thresholdMs;
  });
}

// ============================================================================
// Component Performance Tracking
// ============================================================================

const componentMetrics = new Map<string, number[]>();

/**
 * Track component render time
 */
export function trackComponentRender(componentName: string, renderTime: number): void {
  if (!componentMetrics.has(componentName)) {
    componentMetrics.set(componentName, []);
  }

  const metrics = componentMetrics.get(componentName)!;
  metrics.push(renderTime);

  // Keep only last 100 renders
  if (metrics.length > 100) {
    metrics.shift();
  }
}

/**
 * Get component performance statistics
 */
export function getComponentStats(componentName: string): {
  count: number;
  average: number;
  min: number;
  max: number;
  p95: number;
} | null {
  const metrics = componentMetrics.get(componentName);
  if (!metrics || metrics.length === 0) {
    return null;
  }

  const sorted = [...metrics].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const average = sum / count;
  const min = sorted[0] ?? 0;
  const max = sorted[count - 1] ?? 0;
  const p95Index = Math.floor(count * 0.95);
  const p95 = sorted[p95Index] ?? 0;

  return { count, average, min, max, p95 };
}

// ============================================================================
// Performance Logging
// ============================================================================

const performanceLog: PerformanceMetric[] = [];
const MAX_LOG_SIZE = 1000;

/**
 * Log a performance metric
 */
export function logPerformanceMetric(metric: PerformanceMetric): void {
  performanceLog.push(metric);

  // Keep log size under control
  if (performanceLog.length > MAX_LOG_SIZE) {
    performanceLog.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${metric.name}: ${metric.value}${metric.unit}`);
  }

  // Send to analytics service
  const windowWithAnalytics = window as Window & {
    analytics?: {
      track: (event: string, properties: Record<string, unknown>) => void;
    };
  };

  if (typeof window !== 'undefined' && windowWithAnalytics.analytics) {
    windowWithAnalytics.analytics.track('performance_metric', {
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
      ...metric.metadata,
    });
  }
}

/**
 * Get all logged performance metrics
 */
export function getPerformanceLog(): PerformanceMetric[] {
  return [...performanceLog];
}

/**
 * Clear performance log
 */
export function clearPerformanceLog(): void {
  performanceLog.length = 0;
}

/**
 * Get performance summary
 */
export function getPerformanceSummary(): Record<string, {
  count: number;
  average: number;
  min: number;
  max: number;
}> {
  const summary: Record<string, { values: number[] }> = {};

  performanceLog.forEach((metric) => {
    if (!summary[metric.name]) {
      summary[metric.name] = { values: [] };
    }
    summary[metric.name].values.push(metric.value);
  });

  const result: Record<string, { count: number; average: number; min: number; max: number }> = {};

  Object.entries(summary).forEach(([name, data]) => {
    const values = data.values;
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    result[name] = { count, average, min, max };
  });

  return result;
}

// ============================================================================
// Memory Monitoring
// ============================================================================

/**
 * Get memory usage information (if available)
 */
export function getMemoryUsage(): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null {
  const perfWithMemory = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };

  if (typeof performance === 'undefined' || !perfWithMemory.memory) {
    return null;
  }

  const memory = perfWithMemory.memory;
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  };
}

/**
 * Check if memory usage is high
 */
export function isMemoryUsageHigh(threshold: number = 0.9): boolean {
  const memory = getMemoryUsage();
  if (!memory) return false;

  return memory.usedJSHeapSize / memory.jsHeapSizeLimit > threshold;
}

// ============================================================================
// Performance Budget
// ============================================================================

interface PerformanceBudget {
  fcp: number; // ms
  lcp: number; // ms
  tti: number; // ms
  cls: number;
  fid: number; // ms
  bundleSize: number; // bytes
}

const DEFAULT_BUDGET: PerformanceBudget = {
  fcp: 1500,
  lcp: 2500,
  tti: 3500,
  cls: 0.1,
  fid: 100,
  bundleSize: 200 * 1024, // 200KB
};

/**
 * Check if metrics meet performance budget
 */
export function checkPerformanceBudget(
  metrics: Partial<PageLoadMetrics>,
  budget: PerformanceBudget = DEFAULT_BUDGET
): {
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (metrics.fcp && metrics.fcp > budget.fcp) {
    violations.push(`FCP: ${metrics.fcp}ms exceeds budget of ${budget.fcp}ms`);
  }

  if (metrics.lcp && metrics.lcp > budget.lcp) {
    violations.push(`LCP: ${metrics.lcp}ms exceeds budget of ${budget.lcp}ms`);
  }

  if (metrics.tti && metrics.tti > budget.tti) {
    violations.push(`TTI: ${metrics.tti}ms exceeds budget of ${budget.tti}ms`);
  }

  if (metrics.cls && metrics.cls > budget.cls) {
    violations.push(`CLS: ${metrics.cls} exceeds budget of ${budget.cls}`);
  }

  if (metrics.fid && metrics.fid > budget.fid) {
    violations.push(`FID: ${metrics.fid}ms exceeds budget of ${budget.fid}ms`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
