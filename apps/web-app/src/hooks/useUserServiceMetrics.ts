/**
 * User Service Metrics Hook
 * 
 * React hook for tracking and accessing user service metrics
 * Implements Task 17: Monitoring and Analytics
 */

import { useEffect, useCallback, useState } from 'react';
import { userServiceMetrics, type MetricsSnapshot, type LogContext } from '../lib/user-service/monitoring';

export interface UseUserServiceMetricsResult {
  // Current metrics
  currentMetrics: MetricsSnapshot | null;
  
  // Technical metrics tracking (17.1)
  trackApiResponse: (endpoint: string, duration: number, success: boolean) => void;
  trackCacheAccess: (cacheKey: string, hit: boolean) => void;
  trackWebSocketEvent: (type: 'connect' | 'disconnect') => void;
  trackPageLoad: (page: string, loadTime: number, tti: number) => void;
  trackBundleSize: (chunk: string, size: number) => void;
  
  // User metrics tracking (17.2)
  trackProfileStart: () => void;
  trackProfileCompletion: () => void;
  trackOnboardingStart: () => void;
  trackOnboardingCompletion: () => void;
  trackPreferenceChange: (category: string) => void;
  trackFeatureUsage: (feature: string) => void;
  trackSessionDuration: (duration: number) => void;
  trackEngagementScore: (score: number) => void;
  
  // Business metrics tracking (17.3)
  trackUserRetention: (retained: boolean) => void;
  trackDropOff: (flow: string, step: string) => void;
  trackUserSatisfaction: (score: number) => void;
  
  // Structured logging (17.4)
  log: (level: 'info' | 'warn' | 'error', message: string, context: Partial<LogContext>) => void;
  logError: (error: Error, context: Partial<LogContext>) => void;
  
  // Metrics access
  exportMetrics: () => string;
}

export function useUserServiceMetrics(): UseUserServiceMetricsResult {
  const [currentMetrics, setCurrentMetrics] = useState<MetricsSnapshot | null>(null);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMetrics(userServiceMetrics.getMetrics());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Technical metrics (17.1)
  const trackApiResponse = useCallback((endpoint: string, duration: number, success: boolean) => {
    userServiceMetrics.trackApiResponse(endpoint, duration, success);
  }, []);

  const trackCacheAccess = useCallback((cacheKey: string, hit: boolean) => {
    userServiceMetrics.trackCacheAccess(cacheKey, hit);
  }, []);

  const trackWebSocketEvent = useCallback((type: 'connect' | 'disconnect') => {
    userServiceMetrics.trackWebSocketEvent(type);
  }, []);

  const trackPageLoad = useCallback((page: string, loadTime: number, tti: number) => {
    userServiceMetrics.trackPageLoad(page, loadTime, tti);
  }, []);

  const trackBundleSize = useCallback((chunk: string, size: number) => {
    userServiceMetrics.trackBundleSize(chunk, size);
  }, []);

  // User metrics (17.2)
  const trackProfileStart = useCallback(() => {
    userServiceMetrics.trackProfileStart();
  }, []);

  const trackProfileCompletion = useCallback(() => {
    userServiceMetrics.trackProfileCompletion();
  }, []);

  const trackOnboardingStart = useCallback(() => {
    userServiceMetrics.trackOnboardingStart();
  }, []);

  const trackOnboardingCompletion = useCallback(() => {
    userServiceMetrics.trackOnboardingCompletion();
  }, []);

  const trackPreferenceChange = useCallback((category: string) => {
    userServiceMetrics.trackPreferenceChange(category);
  }, []);

  const trackFeatureUsage = useCallback((feature: string) => {
    userServiceMetrics.trackFeatureUsage(feature);
  }, []);

  const trackSessionDuration = useCallback((duration: number) => {
    userServiceMetrics.trackSessionDuration(duration);
  }, []);

  const trackEngagementScore = useCallback((score: number) => {
    userServiceMetrics.trackEngagementScore(score);
  }, []);

  // Business metrics (17.3)
  const trackUserRetention = useCallback((retained: boolean) => {
    userServiceMetrics.trackUserRetention(retained);
  }, []);

  const trackDropOff = useCallback((flow: string, step: string) => {
    userServiceMetrics.trackDropOff(flow, step);
  }, []);

  const trackUserSatisfaction = useCallback((score: number) => {
    userServiceMetrics.trackUserSatisfaction(score);
  }, []);

  // Structured logging (17.4)
  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, context: Partial<LogContext>) => {
    userServiceMetrics.log(level, message, context);
  }, []);

  const logError = useCallback((error: Error, context: Partial<LogContext>) => {
    userServiceMetrics.logError(error, context);
  }, []);

  const exportMetrics = useCallback(() => {
    return userServiceMetrics.exportMetrics();
  }, []);

  return {
    currentMetrics,
    trackApiResponse,
    trackCacheAccess,
    trackWebSocketEvent,
    trackPageLoad,
    trackBundleSize,
    trackProfileStart,
    trackProfileCompletion,
    trackOnboardingStart,
    trackOnboardingCompletion,
    trackPreferenceChange,
    trackFeatureUsage,
    trackSessionDuration,
    trackEngagementScore,
    trackUserRetention,
    trackDropOff,
    trackUserSatisfaction,
    log,
    logError,
    exportMetrics,
  };
}
