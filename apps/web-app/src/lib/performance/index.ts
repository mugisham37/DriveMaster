/**
 * Performance Module
 * Exports comprehensive performance monitoring and optimization functionality
 * Implements Task 11: Performance Optimization and Monitoring
 */

// Authentication performance monitoring
export {
  AuthPerformanceMonitor,
  authPerformanceMonitor,
} from "./auth-performance-monitor";
export type { AuthPerformanceMetrics } from "./auth-performance-monitor";

// Request optimization strategies (Task 11.1)
export {
  RequestOptimizer,
  createRequestOptimizer,
  getRequestOptimizer,
} from "./request-optimizer";
export type {
  BatchRequest,
  RequestOptimizerConfig,
  RequestOptimizerStats,
} from "./request-optimizer";

// Performance monitoring and metrics (Task 11.2)
export {
  UserServicePerformanceMonitor,
  createPerformanceMonitor,
  getPerformanceMonitor,
} from "./user-service-monitor";
export type {
  PerformanceMetrics,
  PerformanceAlert,
  PerformanceThresholds,
} from "./user-service-monitor";

// Intelligent prefetching and preloading (Task 11.3)
export {
  IntelligentPrefetcher,
  createIntelligentPrefetcher,
  getIntelligentPrefetcher,
} from "./intelligent-prefetcher";
export type {
  NavigationPattern,
  NetworkConditions,
  DeviceCapabilities,
  PrefetchStrategy,
  PrefetchContext,
  PrefetchStats,
} from "./intelligent-prefetcher";

// Web vitals monitoring
export {
  reportWebVitals,
  getWebVitalRating,
  formatWebVitalValue,
  getWebVitalDescription,
} from "./web-vitals";
export type { WebVitalsMetric, WebVitalsCallback } from "./web-vitals";

// Performance manager - orchestrates all performance components
export {
  PerformanceManager,
  createPerformanceManager,
  getPerformanceManager,
} from "./performance-manager";
export type {
  PerformanceManagerConfig,
  PerformanceManagerStats,
} from "./performance-manager";
