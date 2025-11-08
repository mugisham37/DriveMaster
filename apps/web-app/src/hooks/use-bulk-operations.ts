/**
 * Bulk Operations Hook
 *
 * React hook for managing bulk import/export operations with progress tracking
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { contentServiceClient } from "@/lib/content-service";
import { createJobPoller, createProgressTracker } from "@/utils/job-poller";
import type {
  BulkImportRequestDto,
  BulkImportResultDto,
  BulkExportRequestDto,
  BulkExportResultDto,
  BulkOperation,
  BulkOperationStatus,
  BulkOperationType,
} from "@/types";
import type { ContentItem } from "@/types/entities";
import type { ProgressUpdate } from "@/utils/job-poller";

// ============================================================================
// Hook Types
// ============================================================================

export interface BulkOperationState {
  isLoading: boolean;
  operation: BulkOperation | null;
  progress: ProgressUpdate | null;
  error: Error | null;
}

export interface BulkImportState extends BulkOperationState {
  result: BulkImportResultDto | null;
}

export interface BulkExportState extends BulkOperationState {
  result: BulkExportResultDto | null;
  downloadUrl: string | null;
}

// ============================================================================
// Bulk Import Hook
// ============================================================================

export function useBulkImport() {
  const [state, setState] = useState<BulkImportState>({
    isLoading: false,
    operation: null,
    progress: null,
    error: null,
    result: null,
  });

  const pollerRef = useRef<ReturnType<typeof createJobPoller> | null>(null);
  const progressTrackerRef = useRef<ReturnType<
    typeof createProgressTracker
  > | null>(null);

  // Initialize progress tracker
  useEffect(() => {
    if (!progressTrackerRef.current) {
      progressTrackerRef.current = createProgressTracker();
    }

    const unsubscribe = progressTrackerRef.current.addListener((progress) => {
      setState((prev) => ({ ...prev, progress }));
    });

    return unsubscribe;
  }, []);

  const startImport = useCallback(async (data: BulkImportRequestDto) => {
    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        operation: null,
        progress: null,
      }));

      // Start the import
      const result = await contentServiceClient.bulkImport(data);

      setState((prev) => ({ ...prev, result }));

      // If the operation is not immediately complete, start polling
      if (result.status !== "completed" && result.status !== "failed") {
        // Create poller
        pollerRef.current = createJobPoller(
          (jobId) => contentServiceClient.getBulkOperationStatus(jobId),
          {
            interval: 2000,
            maxAttempts: 150,
            onProgress: (operation) => {
              setState((prev) => ({ ...prev, operation }));
              progressTrackerRef.current?.updateProgress(operation);
            },
            onStatusChange: (operation, previousStatus) => {
              console.log(
                `Import status changed: ${previousStatus} -> ${operation.status}`,
              );
            },
            onError: (error) => {
              console.warn("Polling error:", error);
            },
          },
        );

        // Start polling
        const pollingResult = await pollerRef.current.poll(result.operationId);

        setState((prev) => ({
          ...prev,
          operation: pollingResult.operation,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error("Import failed"),
        isLoading: false,
      }));
    }
  }, []);

  const cancelImport = useCallback(() => {
    if (pollerRef.current) {
      pollerRef.current.stop();
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const reset = useCallback(() => {
    if (pollerRef.current) {
      pollerRef.current.stop();
    }
    progressTrackerRef.current?.reset();
    setState({
      isLoading: false,
      operation: null,
      progress: null,
      error: null,
      result: null,
    });
  }, []);

  return {
    ...state,
    startImport,
    cancelImport,
    reset,
  };
}

// ============================================================================
// Bulk Export Hook
// ============================================================================

export function useBulkExport() {
  const [state, setState] = useState<BulkExportState>({
    isLoading: false,
    operation: null,
    progress: null,
    error: null,
    result: null,
    downloadUrl: null,
  });

  const pollerRef = useRef<ReturnType<typeof createJobPoller> | null>(null);
  const progressTrackerRef = useRef<ReturnType<
    typeof createProgressTracker
  > | null>(null);

  // Initialize progress tracker
  useEffect(() => {
    if (!progressTrackerRef.current) {
      progressTrackerRef.current = createProgressTracker();
    }

    const unsubscribe = progressTrackerRef.current.addListener((progress) => {
      setState((prev) => ({ ...prev, progress }));
    });

    return unsubscribe;
  }, []);

  const startExport = useCallback(async (data: BulkExportRequestDto) => {
    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        operation: null,
        progress: null,
        downloadUrl: null,
      }));

      // Start the export
      const result = await contentServiceClient.bulkExport(data);

      setState((prev) => ({ ...prev, result }));

      // If the operation is not immediately complete, start polling
      if (result.status !== "completed" && result.status !== "failed") {
        // Create poller
        pollerRef.current = createJobPoller(
          (jobId) => contentServiceClient.getBulkOperationStatus(jobId),
          {
            interval: 2000,
            maxAttempts: 150,
            onProgress: (operation) => {
              setState((prev) => ({ ...prev, operation }));
              progressTrackerRef.current?.updateProgress(operation);
            },
            onStatusChange: (operation, previousStatus) => {
              console.log(
                `Export status changed: ${previousStatus} -> ${operation.status}`,
              );

              // If export completed, get download URL
              if (operation.status === "completed") {
                setState((prev) => ({
                  ...prev,
                  downloadUrl: result.downloadUrl || null,
                }));
              }
            },
            onError: (error) => {
              console.warn("Polling error:", error);
            },
          },
        );

        // Start polling
        const pollingResult = await pollerRef.current.poll(result.operationId);

        setState((prev) => ({
          ...prev,
          operation: pollingResult.operation,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          downloadUrl: result.downloadUrl || null,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error("Export failed"),
        isLoading: false,
      }));
    }
  }, []);

  const downloadFile = useCallback(async () => {
    if (!state.result?.operationId) {
      throw new Error("No export operation to download");
    }

    try {
      const { blob, filename } =
        await contentServiceClient.downloadExportResult(
          state.result.operationId,
        );

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error("Download failed"),
      }));
    }
  }, [state.result?.operationId]);

  const cancelExport = useCallback(() => {
    if (pollerRef.current) {
      pollerRef.current.stop();
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const reset = useCallback(() => {
    if (pollerRef.current) {
      pollerRef.current.stop();
    }
    progressTrackerRef.current?.reset();
    setState({
      isLoading: false,
      operation: null,
      progress: null,
      error: null,
      result: null,
      downloadUrl: null,
    });
  }, []);

  return {
    ...state,
    startExport,
    downloadFile,
    cancelExport,
    reset,
  };
}

// ============================================================================
// CSV Preview Hook
// ============================================================================

export function useCsvPreview() {
  const [state, setState] = useState<{
    isLoading: boolean;
    preview: ContentItem[] | null;
    totalRows: number;
    validRows: number;
    errors: Array<{ row: number; field: string; error: string }>;
    error: Error | null;
  }>({
    isLoading: false,
    preview: null,
    totalRows: 0,
    validRows: 0,
    errors: [],
    error: null,
  });

  const previewCsv = useCallback(
    async (csvData: string, options?: { limit?: number }) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const result = await contentServiceClient.previewCsvImport(
          csvData,
          options,
        );

        setState((prev) => ({
          ...prev,
          isLoading: false,
          preview: result.preview,
          totalRows: result.totalRows,
          validRows: result.validRows,
          errors: result.errors,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error : new Error("CSV preview failed"),
          isLoading: false,
        }));
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      preview: null,
      totalRows: 0,
      validRows: 0,
      errors: [],
      error: null,
    });
  }, []);

  return {
    ...state,
    previewCsv,
    reset,
  };
}

// ============================================================================
// Bulk Operations List Hook
// ============================================================================

export function useBulkOperationsList() {
  const [state, setState] = useState<{
    isLoading: boolean;
    operations: BulkOperation[];
    total: number;
    page: number;
    totalPages: number;
    error: Error | null;
  }>({
    isLoading: false,
    operations: [],
    total: 0,
    page: 1,
    totalPages: 0,
    error: null,
  });

  const loadOperations = useCallback(
    async (options?: {
      type?: BulkOperationType;
      status?: BulkOperationStatus;
      page?: number;
      limit?: number;
    }) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const result = await contentServiceClient.listBulkOperations(options);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          operations: result.items,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error
              : new Error("Failed to load operations"),
          isLoading: false,
        }));
      }
    },
    [],
  );

  const refresh = useCallback(() => {
    loadOperations();
  }, [loadOperations]);

  return {
    ...state,
    loadOperations,
    refresh,
  };
}
