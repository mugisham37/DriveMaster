/**
 * Monitoring Components
 *
 * Export all monitoring and dashboard components
 */

export { PerformanceDashboard } from "./performance-dashboard";
export { AlertSystem } from "./alert-system";

// Re-export monitoring utilities for convenience
export {
  performanceMonitor,
  type PerformanceMetrics,
  type OperationMetrics,
  type PerformanceEvent,
  type PerformanceConfig,
} from "@/utils/performance-monitor";

export {
  errorMonitor,
  type ErrorMetrics,
  type ErrorEvent,
  type ErrorAlert,
  type ErrorSeverity,
  type AlertSeverity,
  type ErrorMonitorConfig,
} from "@/utils/error-monitor";
