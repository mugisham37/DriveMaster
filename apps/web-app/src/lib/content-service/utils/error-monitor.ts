/**
 * Error Monitoring Utilities
 *
 * Monitors and reports errors across the content service
 */

import type { ContentServiceError } from "../types";

export interface ErrorReport {
  error: ContentServiceError;
  timestamp: number;
  context: Record<string, unknown>;
  userAgent?: string;
  url?: string;
}

class ErrorMonitor {
  private errors: ErrorReport[] = [];
  private maxErrors = 100;
  private listeners: Array<(report: ErrorReport) => void> = [];

  /**
   * Reports an error
   */
  report(
    error: ContentServiceError,
    context: Record<string, unknown> = {},
  ): void {
    const report: ErrorReport = {
      error,
      timestamp: Date.now(),
      context,
    };

    if (typeof navigator !== "undefined") {
      report.userAgent = navigator.userAgent;
    }
    if (typeof window !== "undefined") {
      report.url = window.location.href;
    }

    this.errors.push(report);

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(report);
      } catch (err) {
        console.error("[ErrorMonitor] Listener error:", err);
      }
    });
  }

  /**
   * Adds an error listener
   */
  addListener(listener: (report: ErrorReport) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Gets all error reports
   */
  getReports(): ErrorReport[] {
    return [...this.errors];
  }

  /**
   * Gets error statistics
   */
  getStats(): {
    total: number;
    byCode: Record<string, number>;
    byOperation: Record<string, number>;
  } {
    const byCode: Record<string, number> = {};
    const byOperation: Record<string, number> = {};

    this.errors.forEach((report) => {
      const code = report.error.code || "UNKNOWN";
      const operation = (report.context.operation as string) || "unknown";

      byCode[code] = (byCode[code] || 0) + 1;
      byOperation[operation] = (byOperation[operation] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byCode,
      byOperation,
    };
  }

  /**
   * Clears all error reports
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Records an error with operation and context
   */
  recordError(
    error: ContentServiceError,
    operation: string,
    context?: Record<string, unknown>,
  ): void {
    this.report(error, { ...context, operation });
  }
}

// Global instance
const monitor = new ErrorMonitor();

/**
 * Gets the global error monitor instance
 */
export function getErrorMonitor(): ErrorMonitor {
  return monitor;
}

/**
 * Export the monitor instance for direct use
 */
export const errorMonitor = monitor;

/**
 * Reports an error
 */
export function reportError(
  error: ContentServiceError,
  context: Record<string, unknown> = {},
): void {
  monitor.report(error, context);
}

/**
 * Adds an error listener
 */
export function addErrorListener(
  listener: (report: ErrorReport) => void,
): () => void {
  return monitor.addListener(listener);
}

/**
 * Gets error statistics
 */
export function getErrorStats(): ReturnType<ErrorMonitor["getStats"]> {
  return monitor.getStats();
}
