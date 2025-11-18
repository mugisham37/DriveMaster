/**
 * Performance Monitoring System
 * Tracks and reports performance metrics
 */

import { useEffect, useRef } from 'react';

export interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  lastUpdate: Date;
}

export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetrics> = new Map();

  /**
   * Record component render time
   */
  static recordRender(componentName: string, renderTime: number): void {
    const existing = this.metrics.get(componentName);

    if (existing) {
      this.metrics.set(componentName, {
        ...existing,
        renderTime,
        updateCount: existing.updateCount + 1,
        lastUpdate: new Date(),
      });
    } else {
      this.metrics.set(componentName, {
        componentName,
        renderTime,
        mountTime: renderTime,
        updateCount: 1,
        lastUpdate: new Date(),
      });
    }

    // Warn if render time is slow
    if (renderTime > 16) {
      // 16ms = 60fps threshold
      console.warn(
        `[Performance] Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * Get metrics for component
   */
  static getMetrics(componentName: string): PerformanceMetrics | undefined {
    return this.metrics.get(componentName);
  }

  /**
   * Get all metrics
   */
  static getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear metrics
   */
  static clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get slow components (>16ms render time)
   */
  static getSlowComponents(): PerformanceMetrics[] {
    return this.getAllMetrics().filter((m) => m.renderTime > 16);
  }

  /**
   * Generate performance report
   */
  static generateReport(): string {
    const metrics = this.getAllMetrics();
    const slowComponents = this.getSlowComponents();

    let report = '=== Performance Report ===\n\n';
    report += `Total Components: ${metrics.length}\n`;
    report += `Slow Components: ${slowComponents.length}\n\n`;

    if (slowComponents.length > 0) {
      report += 'Slow Components:\n';
      slowComponents.forEach((m) => {
        report += `  - ${m.componentName}: ${m.renderTime.toFixed(2)}ms (${m.updateCount} updates)\n`;
      });
    }

    return report;
  }
}

/**
 * Hook to measure component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current++;

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      PerformanceMonitor.recordRender(componentName, renderTime);
    };
  });

  return renderCount.current;
}

/**
 * Measure async operation performance
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    console.log(`[Performance] ${name} completed in ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(
      `[Performance] ${name} failed after ${duration.toFixed(2)}ms`,
      error
    );
    throw error;
  }
}

/**
 * Web Vitals monitoring
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    onCLS((metric) => {
      console.log('[Web Vitals] CLS:', metric.value);
    });

    onFID((metric) => {
      console.log('[Web Vitals] FID:', metric.value);
    });

    onFCP((metric) => {
      console.log('[Web Vitals] FCP:', metric.value);
    });

    onLCP((metric) => {
      console.log('[Web Vitals] LCP:', metric.value);
    });

    onTTFB((metric) => {
      console.log('[Web Vitals] TTFB:', metric.value);
    });
  });
}

/**
 * Bundle size analyzer
 */
export function analyzeBundleSize() {
  if (typeof window === 'undefined') return;

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  const scripts = resources.filter((r) => r.initiatorType === 'script');
  const totalSize = scripts.reduce((sum, r) => sum + (r.transferSize || 0), 0);

  console.log('[Bundle Analysis]');
  console.log(`Total Scripts: ${scripts.length}`);
  console.log(`Total Size: ${(totalSize / 1024).toFixed(2)} KB`);

  const largeScripts = scripts
    .filter((r) => (r.transferSize || 0) > 100000) // >100KB
    .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0));

  if (largeScripts.length > 0) {
    console.log('\nLarge Scripts (>100KB):');
    largeScripts.forEach((r) => {
      console.log(
        `  - ${r.name}: ${((r.transferSize || 0) / 1024).toFixed(2)} KB`
      );
    });
  }
}
