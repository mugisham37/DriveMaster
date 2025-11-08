/**
 * Job Poller Utility
 *
 * Handles polling for bulk operation status with progress tracking and notifications
 * Requirements: 8.4, 8.5
 */

import type { BulkOperation, BulkOperationStatus } from "@/types";

// ============================================================================
// Polling Types
// ============================================================================

export interface PollingOptions {
  interval?: number;
  maxAttempts?: number;
  backoffFactor?: number;
  maxInterval?: number;
  timeout?: number;
  onProgress?: (operation: BulkOperation) => void;
  onStatusChange?: (
    operation: BulkOperation,
    previousStatus?: BulkOperationStatus,
  ) => void;
  onError?: (error: Error, attempt: number) => void;
}

export interface PollingResult {
  operation: BulkOperation;
  completed: boolean;
  attempts: number;
  duration: number;
  error?: Error;
}

export type PollingState =
  | "idle"
  | "polling"
  | "completed"
  | "error"
  | "cancelled";

// ============================================================================
// Job Poller Class
// ============================================================================

export class JobPoller {
  private options: Required<PollingOptions>;
  private state: PollingState = "idle";
  private currentJobId: string | null = null;
  private attempts = 0;
  private startTime = 0;
  private timeoutId: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private lastStatus: BulkOperationStatus | undefined;

  constructor(
    private statusChecker: (jobId: string) => Promise<BulkOperation>,
    options?: PollingOptions,
  ) {
    this.options = {
      interval: 2000, // 2 seconds
      maxAttempts: 150, // 5 minutes max at 2s intervals
      backoffFactor: 1.5,
      maxInterval: 30000, // 30 seconds max
      timeout: 300000, // 5 minutes total timeout
      onProgress: () => {},
      onStatusChange: () => {},
      onError: () => {},
      ...options,
    };
  }

  /**
   * Starts polling for a job's completion
   */
  async poll(jobId: string): Promise<PollingResult> {
    if (this.state === "polling") {
      throw new Error(
        "Poller is already running. Stop current polling before starting a new one.",
      );
    }

    this.currentJobId = jobId;
    this.state = "polling";
    this.attempts = 0;
    this.startTime = Date.now();
    this.lastStatus = undefined;
    this.abortController = new AbortController();

    try {
      const operation = await this.pollUntilComplete();

      this.state = "completed";
      return {
        operation,
        completed: true,
        attempts: this.attempts,
        duration: Date.now() - this.startTime,
      };
    } catch (error) {
      this.state = "error";
      return {
        operation: {} as BulkOperation, // Fallback empty operation
        completed: false,
        attempts: this.attempts,
        duration: Date.now() - this.startTime,
        error:
          error instanceof Error ? error : new Error("Unknown polling error"),
      };
    } finally {
      this.cleanup();
    }
  }

  /**
   * Stops the current polling operation
   */
  stop(): void {
    if (this.state === "polling") {
      this.state = "cancelled";
      if (this.abortController) {
        this.abortController.abort();
      }
      this.cleanup();
    }
  }

  /**
   * Gets the current polling state
   */
  getState(): PollingState {
    return this.state;
  }

  /**
   * Gets polling statistics
   */
  getStats(): {
    state: PollingState;
    jobId: string | null;
    attempts: number;
    duration: number;
    nextPollIn?: number;
  } {
    const stats = {
      state: this.state,
      jobId: this.currentJobId,
      attempts: this.attempts,
      duration: this.state === "idle" ? 0 : Date.now() - this.startTime,
    };

    // Calculate next poll time if actively polling
    if (this.state === "polling" && this.timeoutId) {
      const nextInterval = this.calculateInterval();
      return {
        ...stats,
        nextPollIn: nextInterval,
      };
    }

    return stats;
  }

  /**
   * Main polling loop
   */
  private async pollUntilComplete(): Promise<BulkOperation> {
    const totalTimeout = setTimeout(() => {
      this.abortController?.abort();
      throw new Error(`Polling timed out after ${this.options.timeout}ms`);
    }, this.options.timeout);

    try {
      while (
        this.attempts < this.options.maxAttempts &&
        this.state === "polling"
      ) {
        // Check if polling was cancelled
        if (this.abortController?.signal.aborted) {
          throw new Error("Polling was cancelled");
        }

        try {
          this.attempts++;
          const operation = await this.statusChecker(this.currentJobId!);

          // Check for status change
          if (this.lastStatus && this.lastStatus !== operation.status) {
            this.options.onStatusChange(operation, this.lastStatus);
          }
          this.lastStatus = operation.status;

          // Call progress callback
          this.options.onProgress(operation);

          // Check if operation is complete
          if (this.isOperationComplete(operation)) {
            return operation;
          }

          // Wait before next poll (unless this is the last attempt)
          if (this.attempts < this.options.maxAttempts) {
            await this.waitForNextPoll();
          }
        } catch (error) {
          const err =
            error instanceof Error
              ? error
              : new Error("Unknown error during polling");
          this.options.onError(err, this.attempts);

          // If this is a non-recoverable error, throw it
          if (this.isNonRecoverableError(err)) {
            throw err;
          }

          // For recoverable errors, wait and retry (unless max attempts reached)
          if (this.attempts < this.options.maxAttempts) {
            await this.waitForNextPoll();
          }
        }
      }

      // Max attempts reached
      throw new Error(`Polling failed after ${this.attempts} attempts`);
    } finally {
      clearTimeout(totalTimeout);
    }
  }

  /**
   * Checks if an operation is complete
   */
  private isOperationComplete(operation: BulkOperation): boolean {
    const completedStatuses: BulkOperationStatus[] = [
      "completed",
      "failed",
      "cancelled",
    ];
    return completedStatuses.includes(operation.status);
  }

  /**
   * Checks if an error is non-recoverable
   */
  private isNonRecoverableError(error: Error): boolean {
    // Check for specific error types that shouldn't be retried
    const nonRecoverableMessages = [
      "not found",
      "unauthorized",
      "forbidden",
      "cancelled",
    ];

    const message = error.message.toLowerCase();
    return nonRecoverableMessages.some((msg) => message.includes(msg));
  }

  /**
   * Waits for the next poll with exponential backoff
   */
  private async waitForNextPoll(): Promise<void> {
    const interval = this.calculateInterval();

    return new Promise((resolve, reject) => {
      this.timeoutId = setTimeout(() => {
        this.timeoutId = null;
        if (this.abortController?.signal.aborted) {
          reject(new Error("Polling was cancelled"));
        } else {
          resolve();
        }
      }, interval);
    });
  }

  /**
   * Calculates the next polling interval with exponential backoff
   */
  private calculateInterval(): number {
    const baseInterval = this.options.interval;
    const backoffInterval =
      baseInterval * Math.pow(this.options.backoffFactor, this.attempts - 1);
    return Math.min(backoffInterval, this.options.maxInterval);
  }

  /**
   * Cleans up polling resources
   */
  private cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.currentJobId = null;
  }
}

// ============================================================================
// Progress Tracker Class
// ============================================================================

export class ProgressTracker {
  private listeners: Array<(progress: ProgressUpdate) => void> = [];
  private currentProgress: ProgressUpdate | null = null;

  /**
   * Updates progress and notifies listeners
   */
  updateProgress(operation: BulkOperation): void {
    const progress: ProgressUpdate = {
      jobId: operation.id,
      status: operation.status,
      totalItems: operation.totalItems,
      processedItems: operation.processedItems,
      successfulItems: operation.successfulItems,
      failedItems: operation.failedItems,
      percentage:
        operation.totalItems > 0
          ? Math.round((operation.processedItems / operation.totalItems) * 100)
          : 0,
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(operation),
      errors: operation.errors,
      timestamp: new Date(),
    };

    this.currentProgress = progress;
    this.notifyListeners(progress);
  }

  /**
   * Adds a progress listener
   */
  addListener(listener: (progress: ProgressUpdate) => void): () => void {
    this.listeners.push(listener);

    // If we have current progress, immediately notify the new listener
    if (this.currentProgress) {
      listener(this.currentProgress);
    }

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Gets the current progress
   */
  getCurrentProgress(): ProgressUpdate | null {
    return this.currentProgress;
  }

  /**
   * Resets the progress tracker
   */
  reset(): void {
    this.currentProgress = null;
  }

  /**
   * Notifies all listeners of progress update
   */
  private notifyListeners(progress: ProgressUpdate): void {
    this.listeners.forEach((listener) => {
      try {
        listener(progress);
      } catch (error) {
        console.error("Error in progress listener:", error);
      }
    });
  }

  /**
   * Calculates estimated time remaining based on current progress
   */
  private calculateEstimatedTimeRemaining(
    operation: BulkOperation,
  ): number | null {
    if (!operation.startedAt || operation.processedItems === 0) {
      return null;
    }

    const elapsedMs = Date.now() - operation.startedAt.getTime();
    const itemsPerMs = operation.processedItems / elapsedMs;
    const remainingItems = operation.totalItems - operation.processedItems;

    if (itemsPerMs <= 0 || remainingItems <= 0) {
      return null;
    }

    return Math.round(remainingItems / itemsPerMs);
  }
}

// ============================================================================
// Progress Update Interface
// ============================================================================

export interface ProgressUpdate {
  jobId: string;
  status: BulkOperationStatus;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  percentage: number;
  estimatedTimeRemaining: number | null;
  errors: Array<{
    itemId?: string;
    error: string;
    details?: string;
    timestamp: Date;
  }>;
  timestamp: Date;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a job poller with default options
 */
export function createJobPoller(
  statusChecker: (jobId: string) => Promise<BulkOperation>,
  options?: PollingOptions,
): JobPoller {
  return new JobPoller(statusChecker, options);
}

/**
 * Creates a progress tracker
 */
export function createProgressTracker(): ProgressTracker {
  return new ProgressTracker();
}

/**
 * Formats progress information for display
 */
export function formatProgress(progress: ProgressUpdate): {
  statusText: string;
  progressText: string;
  timeRemainingText: string;
  errorSummary: string;
} {
  const statusText = formatStatus(progress.status);
  const progressText = `${progress.processedItems}/${progress.totalItems} (${progress.percentage}%)`;

  let timeRemainingText = "Unknown";
  if (progress.estimatedTimeRemaining !== null) {
    const minutes = Math.floor(progress.estimatedTimeRemaining / 60000);
    const seconds = Math.floor(
      (progress.estimatedTimeRemaining % 60000) / 1000,
    );

    if (minutes > 0) {
      timeRemainingText = `${minutes}m ${seconds}s`;
    } else {
      timeRemainingText = `${seconds}s`;
    }
  }

  const errorSummary =
    progress.failedItems > 0
      ? `${progress.failedItems} error${progress.failedItems === 1 ? "" : "s"}`
      : "No errors";

  return {
    statusText,
    progressText,
    timeRemainingText,
    errorSummary,
  };
}

/**
 * Formats operation status for display
 */
export function formatStatus(status: BulkOperationStatus): string {
  const statusMap: Record<BulkOperationStatus, string> = {
    pending: "Pending",
    running: "In Progress",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  return statusMap[status] || status;
}

/**
 * Checks if a status indicates the operation is still active
 */
export function isActiveStatus(status: BulkOperationStatus): boolean {
  return ["pending", "running"].includes(status);
}

/**
 * Checks if a status indicates the operation is complete (success or failure)
 */
export function isCompleteStatus(status: BulkOperationStatus): boolean {
  return ["completed", "failed", "cancelled"].includes(status);
}
