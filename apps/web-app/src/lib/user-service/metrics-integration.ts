/**
 * User Service Metrics Integration
 * 
 * Integrates monitoring and analytics with user service operations
 * Automatically tracks API calls, errors, and user actions
 * Implements Task 17: Monitoring and Analytics
 */

import { userServiceMetrics } from './monitoring';

// ============================================================================
// API Call Tracking Wrapper
// ============================================================================

export function withMetricsTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  operation: string,
  fn: T,
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now();
    const correlationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      // Track successful API call
      userServiceMetrics.trackApiResponse(operation, duration, true);
      userServiceMetrics.log('info', `${operation} completed`, {
        operation,
        duration,
        correlationId,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track failed API call
      userServiceMetrics.trackApiResponse(operation, duration, false);
      userServiceMetrics.logError(error as Error, {
        operation,
        duration,
        correlationId,
      });

      throw error;
    }
  }) as T;
}

// ============================================================================
// Feature Usage Tracking
// ============================================================================

export function trackFeatureUsage(feature: string): void {
  userServiceMetrics.trackFeatureUsage(feature);
  userServiceMetrics.log('info', 'Feature used', {
    operation: 'feature_usage',
    metadata: { feature },
  });
}

// ============================================================================
// Page Performance Tracking
// ============================================================================

export function trackPagePerformance(page: string): void {
  if (typeof window === 'undefined') return;

  // Track page load time
  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const loadTime = perfData.loadEventEnd - perfData.navigationStart;
    
    // Estimate TTI (simplified)
    const tti = perfData.domInteractive - perfData.navigationStart;

    userServiceMetrics.trackPageLoad(page, loadTime, tti);
  });
}

// ============================================================================
// Session Tracking
// ============================================================================

let sessionStartTime: number | null = null;

export function startSessionTracking(): void {
  if (typeof window === 'undefined') return;

  sessionStartTime = Date.now();

  // Track session duration on page unload
  window.addEventListener('beforeunload', () => {
    if (sessionStartTime) {
      const duration = Date.now() - sessionStartTime;
      userServiceMetrics.trackSessionDuration(duration);
    }
  });
}

export function endSessionTracking(): void {
  if (sessionStartTime) {
    const duration = Date.now() - sessionStartTime;
    userServiceMetrics.trackSessionDuration(duration);
    sessionStartTime = null;
  }
}

// ============================================================================
// Export for use in components
// ============================================================================

export { userServiceMetrics };
