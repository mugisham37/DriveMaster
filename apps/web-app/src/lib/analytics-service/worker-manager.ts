// ============================================================================
// Web Worker Manager for Analytics Data Processing
// ============================================================================

import type {
  WorkerMessage,
  WorkerResponse,
  ProcessingTask,
  CSVExportOptions,
  ChartDataOptions,
  AggregationOptions,
  DataRecord,
} from "../../workers/analytics-data-processor";

export interface WorkerManagerConfig {
  maxWorkers: number;
  workerTimeout: number;
  enableFallback: boolean;
  chunkSize: number;
}

export interface ProcessingOptions {
  priority: "high" | "normal" | "low";
  timeout?: number;
  onProgress?: (progress: number) => void;
}

export class AnalyticsWorkerManager {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private taskQueue: Array<{
    task: ProcessingTask;
    options: ProcessingOptions;
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  private config: WorkerManagerConfig;
  private workerSupported: boolean;

  constructor(config: Partial<WorkerManagerConfig> = {}) {
    this.config = {
      maxWorkers: Math.min(4, navigator.hardwareConcurrency || 2),
      workerTimeout: 30000, // 30 seconds
      enableFallback: true,
      chunkSize: 1000,
      ...config,
    };

    this.workerSupported = this.checkWorkerSupport();

    if (this.workerSupported) {
      this.initializeWorkers();
    }
  }

  /**
   * Check if Web Workers are supported
   */
  private checkWorkerSupport(): boolean {
    return typeof Worker !== "undefined";
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.config.maxWorkers; i++) {
      try {
        const worker = new Worker(
          new URL("../../workers/analytics-data-processor.ts", import.meta.url),
          { type: "module" },
        );

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(worker, event.data);
        };

        worker.onerror = (error) => {
          this.handleWorkerError(worker, error);
        };

        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        console.warn("Failed to create worker:", error);
        // Fallback will be used if no workers are available
      }
    }
  }

  /**
   * Process CSV export
   */
  async exportToCSV(
    data: DataRecord[],
    options: CSVExportOptions,
    processingOptions: ProcessingOptions = { priority: "normal" },
  ): Promise<string> {
    const task: ProcessingTask = {
      id: this.generateTaskId(),
      type: "csv-export",
      data,
      options,
    };

    if (!this.workerSupported || this.workers.length === 0) {
      return this.fallbackCSVExport(
        data,
        options,
        processingOptions.onProgress,
      );
    }

    return this.processTask(task, processingOptions) as Promise<string>;
  }

  /**
   * Format data for charts
   */
  async formatChartData(
    data: DataRecord[],
    options: ChartDataOptions,
    processingOptions: ProcessingOptions = { priority: "normal" },
  ): Promise<unknown> {
    const task: ProcessingTask = {
      id: this.generateTaskId(),
      type: "chart-data",
      data,
      options,
    };

    if (!this.workerSupported || this.workers.length === 0) {
      return this.fallbackChartDataFormat(data, options);
    }

    return this.processTask(task, processingOptions);
  }

  /**
   * Aggregate data
   */
  async aggregateData(
    data: DataRecord[],
    options: AggregationOptions,
    processingOptions: ProcessingOptions = { priority: "normal" },
  ): Promise<DataRecord[]> {
    const task: ProcessingTask = {
      id: this.generateTaskId(),
      type: "data-aggregation",
      data,
      options,
    };

    if (!this.workerSupported || this.workers.length === 0) {
      return this.fallbackDataAggregation(data, options);
    }

    return this.processTask(task, processingOptions) as Promise<DataRecord[]>;
  }

  /**
   * Transform data
   */
  async transformData(
    data: DataRecord[],
    transformations: unknown[],
    processingOptions: ProcessingOptions = { priority: "normal" },
  ): Promise<DataRecord[]> {
    const task: ProcessingTask = {
      id: this.generateTaskId(),
      type: "data-transformation",
      data,
      options: { transformations },
    };

    if (!this.workerSupported || this.workers.length === 0) {
      return this.fallbackDataTransformation(data, transformations);
    }

    return this.processTask(task, processingOptions) as Promise<DataRecord[]>;
  }

  /**
   * Process a task using available worker
   */
  private async processTask(
    task: ProcessingTask,
    options: ProcessingOptions,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const taskWithCallbacks = {
        task,
        options,
        resolve,
        reject,
      };

      // Add to queue based on priority
      if (options.priority === "high") {
        this.taskQueue.unshift(taskWithCallbacks);
      } else {
        this.taskQueue.push(taskWithCallbacks);
      }

      this.processQueue();
    });
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const { task, options, resolve, reject } = this.taskQueue.shift()!;
      const worker = this.availableWorkers.pop()!;

      this.busyWorkers.add(worker);

      // Set up timeout
      const timeout = setTimeout(() => {
        this.handleWorkerTimeout(worker, task.id);
        reject(new Error("Worker task timeout"));
      }, options.timeout || this.config.workerTimeout);

      // Store task info on worker for cleanup
      interface WorkerWithTask extends Worker {
        currentTask?: {
          id: string;
          resolve: (result: unknown) => void;
          reject: (error: Error) => void;
          timeout: NodeJS.Timeout;
          onProgress?: ((progress: number) => void) | undefined;
        };
      }

      (worker as WorkerWithTask).currentTask = {
        id: task.id,
        resolve,
        reject,
        timeout,
        ...(options.onProgress && { onProgress: options.onProgress }),
      };

      // Send task to worker
      const message: WorkerMessage = {
        id: task.id,
        type: "process",
        payload: task,
      };

      worker.postMessage(message);
    }
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(worker: Worker, response: WorkerResponse): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentTask = (worker as any).currentTask;
    if (!currentTask || currentTask.id !== response.id) {
      return;
    }

    switch (response.type) {
      case "success":
        clearTimeout(currentTask.timeout);
        currentTask.resolve(response.payload);
        this.releaseWorker(worker);
        break;

      case "error":
        clearTimeout(currentTask.timeout);
        const errorMessage =
          "message" in response.payload
            ? response.payload.message
            : "Unknown error";
        currentTask.reject(new Error(errorMessage));
        this.releaseWorker(worker);
        break;

      case "progress":
        if (currentTask.onProgress && "progress" in response.payload) {
          currentTask.onProgress(response.payload.progress);
        }
        break;
    }
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    interface WorkerWithTask extends Worker {
      currentTask?: {
        id: string;
        resolve: (result: unknown) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
        onProgress?: ((progress: number) => void) | undefined;
      };
    }

    const currentTask = (worker as WorkerWithTask).currentTask;
    if (currentTask) {
      clearTimeout(currentTask.timeout);
      currentTask.reject(new Error(`Worker error: ${error.message}`));
    }

    this.releaseWorker(worker);
  }

  /**
   * Handle worker timeout
   */
  private handleWorkerTimeout(worker: Worker, taskId: string): void {
    console.warn(`Worker task timeout: ${taskId}`);

    // Terminate and recreate worker
    worker.terminate();
    this.releaseWorker(worker);

    // Create new worker to replace terminated one
    if (this.workers.length < this.config.maxWorkers) {
      try {
        const newWorker = new Worker(
          new URL("../../workers/analytics-data-processor.ts", import.meta.url),
          { type: "module" },
        );

        newWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(newWorker, event.data);
        };

        newWorker.onerror = (error) => {
          this.handleWorkerError(newWorker, error);
        };

        this.workers.push(newWorker);
        this.availableWorkers.push(newWorker);
      } catch (error) {
        console.warn("Failed to recreate worker:", error);
      }
    }
  }

  /**
   * Release worker back to available pool
   */
  private releaseWorker(worker: Worker): void {
    this.busyWorkers.delete(worker);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (worker as any).currentTask = null;

    if (this.workers.includes(worker)) {
      this.availableWorkers.push(worker);
      this.processQueue();
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Fallback implementations for when workers are not available

  /**
   * Fallback CSV export (main thread)
   */
  private async fallbackCSVExport(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[],
    options: CSVExportOptions,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    const { columns, includeHeaders, delimiter } = options;
    let csv = "";

    if (includeHeaders) {
      const headers = columns.map((col) => this.escapeCSVValue(col.header));
      csv += headers.join(delimiter) + "\n";
    }

    const chunkSize = this.config.chunkSize;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);

      for (const row of chunk) {
        const values = columns.map((col) => {
          const value = row[col.key];
          const formatted = col.formatter
            ? col.formatter(value)
            : String(value || "");
          return this.escapeCSVValue(formatted);
        });
        csv += values.join(delimiter) + "\n";
      }

      if (onProgress) {
        const progress = Math.min(100, ((i + chunkSize) / data.length) * 100);
        onProgress(progress);
      }

      // Yield control to prevent blocking
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return csv;
  }

  /**
   * Fallback chart data formatting (main thread)
   */
  private async fallbackChartDataFormat(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[],
    options: ChartDataOptions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    // Simplified fallback implementation
    const { xAxis, yAxis } = options;

    return data.map((item) => ({
      x: item[xAxis],
      y: Array.isArray(yAxis)
        ? yAxis.reduce((sum, field) => sum + (Number(item[field]) || 0), 0)
        : Number(item[yAxis]) || 0,
    }));
  }

  /**
   * Fallback data aggregation (main thread)
   */
  private async fallbackDataAggregation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[],
    options: AggregationOptions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    // Simplified fallback implementation
    const { groupBy, metrics } = options;

    if (groupBy.length === 0) {
      // No grouping, just calculate metrics for entire dataset
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = {};
      metrics.forEach((metric) => {
        const values = data
          .map((item) => item[metric.field])
          .filter((v) => v != null);
        const fieldName = metric.alias || metric.field;

        switch (metric.operation) {
          case "sum":
            result[fieldName] = values.reduce(
              (sum, val) => sum + Number(val),
              0,
            );
            break;
          case "avg":
            result[fieldName] =
              values.length > 0
                ? values.reduce((sum, val) => sum + Number(val), 0) /
                  values.length
                : 0;
            break;
          case "count":
            result[fieldName] = values.length;
            break;
        }
      });
      return [result];
    }

    // Simple grouping implementation
    const grouped = data.reduce(
      (groups, item) => {
        const key = groupBy.map((field) => item[field]).join("|");
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
        return groups;
      },
      {} as Record<string, unknown[]>,
    );

    return Object.entries(grouped).map(([groupKey, groupData]) => {
      const result: Record<string, unknown> = {};

      // Add group keys
      const groupKeys = groupKey.split("|");
      groupBy.forEach((field, index) => {
        result[field] = groupKeys[index];
      });

      // Calculate metrics
      metrics.forEach((metric) => {
        const values = (groupData as Record<string, unknown>[])
          .map((item: Record<string, unknown>) => item[metric.field])
          .filter((v: unknown) => v != null) as number[];
        const fieldName = metric.alias || metric.field;

        switch (metric.operation) {
          case "sum":
            result[fieldName] = values.reduce(
              (sum: number, val: number) => sum + Number(val),
              0,
            );
            break;
          case "avg":
            result[fieldName] =
              values.length > 0
                ? values.reduce(
                    (sum: number, val: number) => sum + Number(val),
                    0,
                  ) / values.length
                : 0;
            break;
          case "count":
            result[fieldName] = values.length;
            break;
        }
      });

      return result;
    });
  }

  /**
   * Fallback data transformation (main thread)
   */
  private async fallbackDataTransformation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformations: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    // Simplified fallback implementation
    let result = [...data];

    for (const transformation of transformations) {
      switch (transformation.type) {
        case "filter":
          result = result.filter((item) => {
            const { field, operator, value } = transformation.config;
            const itemValue = item[field];

            switch (operator) {
              case "equals":
                return itemValue === value;
              case "greater_than":
                return Number(itemValue) > Number(value);
              case "less_than":
                return Number(itemValue) < Number(value);
              default:
                return true;
            }
          });
          break;
        case "sort":
          const { field, direction } = transformation.config;
          result.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return direction === "desc" ? -comparison : comparison;
          });
          break;
      }
    }

    return result;
  }

  /**
   * Helper method to escape CSV values
   */
  private escapeCSVValue(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Get worker statistics
   */
  getStats(): {
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
    workerSupported: boolean;
  } {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      queuedTasks: this.taskQueue.length,
      workerSupported: this.workerSupported,
    };
  }

  /**
   * Terminate all workers and clear queue
   */
  destroy(): void {
    // Clear task queue
    this.taskQueue.forEach(({ reject }) => {
      reject(new Error("Worker manager destroyed"));
    });
    this.taskQueue = [];

    // Terminate all workers
    this.workers.forEach((worker) => {
      worker.terminate();
    });

    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers.clear();
  }
}

// Factory function
export const createAnalyticsWorkerManager = (
  config?: Partial<WorkerManagerConfig>,
): AnalyticsWorkerManager => {
  return new AnalyticsWorkerManager(config);
};

export default AnalyticsWorkerManager;
