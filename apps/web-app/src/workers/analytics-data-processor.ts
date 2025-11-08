// ============================================================================
// Analytics Data Processor Web Worker
// ============================================================================

// ============================================================================
// Type Definitions
// ============================================================================

export interface WorkerMessage {
  id: string;
  type: "process" | "export" | "transform" | "aggregate";
  payload: ProcessingPayload;
}

export interface WorkerResponse {
  id: string;
  type: "success" | "error" | "progress";
  payload: ResponsePayload;
}

export interface ProcessingTask {
  id: string;
  type:
    | "csv-export"
    | "chart-data"
    | "data-aggregation"
    | "data-transformation";
  data: DataRecord[];
  options?: ProcessingOptions;
}

export interface DataRecord {
  [key: string]: string | number | boolean | Date | null | undefined;
}

export type ProcessingOptions =
  | CSVExportOptions
  | ChartDataOptions
  | AggregationOptions
  | TransformationOptions;

export type ResponsePayload =
  | { content: string }
  | { data: DataRecord[] | ChartDataResult[] }
  | { blob: Blob; filename: string }
  | { message: string; stack?: string }
  | { progress: number };

export type ProcessingPayload =
  | ProcessingTask
  | ExportPayload
  | TransformPayload
  | AggregatePayload;

export interface CSVExportOptions {
  filename: string;
  columns: Array<{
    key: string;
    header: string;
    formatter?: (
      value: string | number | boolean | Date | null | undefined,
    ) => string;
  }>;
  includeHeaders: boolean;
  delimiter: string;
}

export interface ChartDataOptions {
  chartType: "line" | "bar" | "pie" | "area" | "scatter";
  xAxis: string;
  yAxis: string | string[];
  groupBy?: string;
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
  timeGranularity?: "hour" | "day" | "week" | "month";
}

export interface AggregationOptions {
  groupBy: string[];
  metrics: Array<{
    field: string;
    operation: "sum" | "avg" | "count" | "min" | "max" | "median";
    alias?: string;
  }>;
  filters?: Record<string, FilterValue>;
  sort?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
}

export interface TransformationOptions {
  normalize?: boolean;
  deduplicate?: boolean;
  fillMissing?: Record<string, string | number>;
  [key: string]: unknown;
}

export interface FilterValue {
  [key: string]: unknown;
}

export interface FilterConfig {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
  value: string | number | boolean;
}

export interface MappingConfig {
  [key: string]:
    | string
    | ((
        value: string | number | boolean | Date | null | undefined,
      ) => string | number | boolean | Date | null | undefined);
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

export interface GroupConfig {
  field: string;
}

export interface PivotConfig {
  rows: string[];
  columns: string[];
  values: string[];
}

export interface ExportPayload {
  data: DataRecord[];
  format: "csv" | "json" | "xlsx";
  options?: CSVExportOptions;
}

export interface TransformPayload {
  data: DataRecord[];
  transformations: Array<{
    type: "filter" | "map" | "sort" | "group" | "pivot";
    config:
      | FilterConfig
      | MappingConfig
      | SortConfig
      | GroupConfig
      | PivotConfig;
  }>;
}

export interface AggregatePayload {
  data: DataRecord[];
  options: AggregationOptions;
}

export interface ChartDataResult {
  x: string | number;
  y: string | number;
  label?: string;
  name?: string;
  value?: string | number;
}

export interface GroupedData {
  [key: string]: DataRecord[];
}

export interface TimeGroupedData {
  [key: string]: DataRecord[];
}

// ============================================================================
// Main worker message handler
// ============================================================================

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    let result: ResponsePayload;

    switch (type) {
      case "process":
        result = await processData(payload as ProcessingTask);
        break;
      case "export":
        result = await exportData(payload as ExportPayload);
        break;
      case "transform":
        result = { data: await transformData(payload as TransformPayload) };
        break;
      case "aggregate":
        result = { data: await aggregateData(payload as AggregatePayload) };
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    const response: WorkerResponse = {
      id,
      type: "success",
      payload: result,
    };

    self.postMessage(response);
  } catch (error) {
    const errorPayload: { message: string; stack?: string } = {
      message: error instanceof Error ? error.message : "Unknown error",
    };

    if (error instanceof Error && error.stack) {
      errorPayload.stack = error.stack;
    }

    const response: WorkerResponse = {
      id,
      type: "error",
      payload: errorPayload,
    };

    self.postMessage(response);
  }
};

/**
 * Process analytics data based on task type
 */
async function processData(task: ProcessingTask): Promise<ResponsePayload> {
  if (!task.options) {
    throw new Error("Processing options are required");
  }

  switch (task.type) {
    case "csv-export":
      return {
        content: await generateCSV(task.data, task.options as CSVExportOptions),
      };
    case "chart-data":
      return {
        data: await formatChartData(
          task.data,
          task.options as ChartDataOptions,
        ),
      };
    case "data-aggregation":
      return {
        data: await performAggregation(
          task.data,
          task.options as AggregationOptions,
        ),
      };
    case "data-transformation":
      return {
        data: await performTransformation(
          task.data,
          task.options as TransformationOptions,
        ),
      };
    default:
      throw new Error(`Unknown processing task type: ${task.type}`);
  }
}

/**
 * Export data to various formats
 */
async function exportData(
  payload: ExportPayload,
): Promise<{ blob: Blob; filename: string }> {
  const { data, format, options = {} } = payload;

  switch (format) {
    case "csv":
      const csvContent = await generateCSV(data, options as CSVExportOptions);
      return {
        blob: new Blob([csvContent], { type: "text/csv" }),
        filename:
          (options as CSVExportOptions).filename || "analytics-export.csv",
      };
    case "json":
      const jsonContent = JSON.stringify(data, null, 2);
      return {
        blob: new Blob([jsonContent], { type: "application/json" }),
        filename: "analytics-export.json",
      };
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Transform data structures
 */
async function transformData(payload: TransformPayload): Promise<DataRecord[]> {
  let result = [...payload.data];

  for (const transformation of payload.transformations) {
    switch (transformation.type) {
      case "filter":
        result = result.filter((item) =>
          evaluateFilter(item, transformation.config as FilterConfig),
        );
        break;
      case "map":
        result = result.map((item) =>
          applyMapping(item, transformation.config as MappingConfig),
        );
        break;
      case "sort":
        result = sortData(result, transformation.config as SortConfig);
        break;
      case "group":
        result = groupData(result, transformation.config as GroupConfig);
        break;
      case "pivot":
        result = pivotData(result, transformation.config as PivotConfig);
        break;
    }
  }

  return result;
}

/**
 * Aggregate data
 */
async function aggregateData(payload: AggregatePayload): Promise<DataRecord[]> {
  return performAggregation(payload.data, payload.options);
}

/**
 * Perform data transformation operations
 */
async function performTransformation(
  data: DataRecord[],
  options: TransformationOptions,
): Promise<DataRecord[]> {
  // Apply transformations based on options
  let result = [...data];

  // Example transformation logic - can be extended based on specific needs
  if (options.normalize && typeof options.normalize === "boolean") {
    result = result.map((item) => normalizeRecord(item));
  }

  if (options.deduplicate && typeof options.deduplicate === "boolean") {
    result = deduplicateRecords(result);
  }

  if (options.fillMissing && typeof options.fillMissing === "object") {
    result = result.map((item) =>
      fillMissingValues(
        item,
        options.fillMissing as Record<string, string | number>,
      ),
    );
  }

  return result;
}

/**
 * Generate CSV content from data
 */
async function generateCSV(
  data: DataRecord[],
  options: CSVExportOptions,
): Promise<string> {
  const { columns, includeHeaders, delimiter } = options;
  let csv = "";

  // Add headers if requested
  if (includeHeaders) {
    const headers = columns.map((col) => escapeCSVValue(col.header));
    csv += headers.join(delimiter) + "\n";
  }

  // Process data in chunks to avoid blocking
  const chunkSize = 1000;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);

    for (const row of chunk) {
      const values = columns.map((col) => {
        const value = row[col.key];
        const formatted = col.formatter
          ? col.formatter(value)
          : String(value || "");
        return escapeCSVValue(formatted);
      });
      csv += values.join(delimiter) + "\n";
    }

    // Report progress for large datasets
    if (data.length > 5000) {
      const progress = Math.min(100, ((i + chunkSize) / data.length) * 100);
      const progressResponse: WorkerResponse = {
        id: "progress",
        type: "progress",
        payload: { progress },
      };
      self.postMessage(progressResponse);
    }

    // Yield control to prevent blocking
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return csv;
}

/**
 * Format data for chart visualization
 */
async function formatChartData(
  data: DataRecord[],
  options: ChartDataOptions,
): Promise<ChartDataResult[]> {
  const { chartType, xAxis, yAxis, groupBy, timeGranularity } = options;

  let processedData = [...data];

  // Apply time granularity if specified
  if (timeGranularity && isDateField(xAxis)) {
    processedData = aggregateByTime(processedData, xAxis, timeGranularity);
  }

  // Group data if specified
  if (groupBy) {
    processedData = groupData(processedData, { field: groupBy });
  }

  // Format based on chart type
  switch (chartType) {
    case "line":
    case "area":
      return formatTimeSeriesData(processedData, xAxis, yAxis);
    case "bar":
      return formatBarChartData(processedData, xAxis, yAxis);
    case "pie":
      return formatPieChartData(processedData, xAxis, yAxis);
    case "scatter":
      return formatScatterData(processedData, xAxis, yAxis);
    default:
      throw new Error(`Unsupported chart type: ${chartType}`);
  }
}

/**
 * Perform data aggregation
 */
async function performAggregation(
  data: DataRecord[],
  options: AggregationOptions,
): Promise<DataRecord[]> {
  const { groupBy, metrics, filters, sort } = options;

  let processedData = [...data];

  // Apply filters
  if (filters) {
    processedData = processedData.filter((item) =>
      Object.entries(filters).every(([key, value]) => {
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          return evaluateFilter(item, {
            field: key,
            operator: "equals",
            value,
          });
        }
        return true;
      }),
    );
  }

  // Group data
  const grouped =
    groupBy.length > 0
      ? groupDataByFields(processedData, groupBy)
      : { all: processedData };

  // Calculate metrics for each group
  const results = Object.entries(grouped).map(([groupKey, groupData]) => {
    const result: DataRecord = {};

    // Add group keys
    if (groupBy.length > 0) {
      const groupKeys = groupKey.split("|");
      groupBy.forEach((field, index) => {
        result[field] = groupKeys[index] || "";
      });
    }

    // Calculate metrics
    metrics.forEach((metric) => {
      const values = groupData
        .map((item) => item[metric.field])
        .filter((v): v is number => v != null && typeof v === "number");
      const fieldName = metric.alias || metric.field;

      switch (metric.operation) {
        case "sum":
          result[fieldName] = values.reduce((sum, val) => sum + val, 0);
          break;
        case "avg":
          result[fieldName] =
            values.length > 0
              ? values.reduce((sum, val) => sum + val, 0) / values.length
              : 0;
          break;
        case "count":
          result[fieldName] = values.length;
          break;
        case "min":
          result[fieldName] = values.length > 0 ? Math.min(...values) : 0;
          break;
        case "max":
          result[fieldName] = values.length > 0 ? Math.max(...values) : 0;
          break;
        case "median":
          result[fieldName] = calculateMedian(values);
          break;
      }
    });

    return result;
  });

  // Apply sorting
  if (sort && sort.length > 0) {
    const sortConfig = sort[0];
    if (sortConfig) {
      return sortData(results, sortConfig);
    }
  }

  return results;
}

// ============================================================================
// Helper functions
// ============================================================================

function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function evaluateFilter(item: DataRecord, filter: FilterConfig): boolean {
  const { field, operator, value } = filter;
  const itemValue = item[field];

  switch (operator) {
    case "equals":
      return itemValue === value;
    case "not_equals":
      return itemValue !== value;
    case "greater_than":
      return Number(itemValue) > Number(value);
    case "less_than":
      return Number(itemValue) < Number(value);
    case "contains":
      return String(itemValue)
        .toLowerCase()
        .includes(String(value).toLowerCase());
    default:
      return true;
  }
}

function applyMapping(item: DataRecord, mapping: MappingConfig): DataRecord {
  const result = { ...item };

  Object.entries(mapping).forEach(([key, transform]) => {
    if (typeof transform === "function") {
      result[key] = transform(item[key]);
    } else if (typeof transform === "string") {
      // Simple field mapping
      const sourceValue = item[transform];
      if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    }
  });

  return result;
}

function sortData(data: DataRecord[], sortConfig: SortConfig): DataRecord[] {
  return data.sort((a, b) => {
    const { field, direction } = sortConfig;
    const aVal = a[field];
    const bVal = b[field];

    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (aVal === bVal) return 0;

    const comparison = aVal < bVal ? -1 : 1;
    return direction === "desc" ? -comparison : comparison;
  });
}

function groupData(data: DataRecord[], config: GroupConfig): DataRecord[] {
  const { field } = config;
  const grouped = data.reduce((groups: GroupedData, item) => {
    const key = String(item[field] || "undefined");
    if (!groups[key]) groups[key] = [];
    const groupArray = groups[key];
    if (groupArray) {
      groupArray.push(item);
    }
    return groups;
  }, {});

  return Object.entries(grouped).map(([key, groupItems]) => {
    const result: DataRecord = {};
    result[field] = key;
    result["count"] = groupItems.length;
    // Store items as a serializable representation
    result["itemCount"] = groupItems.length;
    return result;
  });
}

function groupDataByFields(data: DataRecord[], fields: string[]): GroupedData {
  return data.reduce((groups: GroupedData, item) => {
    const key = fields
      .map((field) => String(item[field] || "undefined"))
      .join("|");
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
}

function pivotData(data: DataRecord[], config: PivotConfig): DataRecord[] {
  // Simplified pivot implementation
  const { rows, columns, values } = config;

  // For now, return the original data
  // A full pivot implementation would be more complex and depends on specific requirements
  console.log("Pivot operation requested with config:", {
    rows,
    columns,
    values,
  });
  return data;
}

function isDateField(field: string): boolean {
  return (
    field.toLowerCase().includes("date") ||
    field.toLowerCase().includes("time") ||
    field.toLowerCase().includes("timestamp")
  );
}

function aggregateByTime(
  data: DataRecord[],
  timeField: string,
  granularity: string,
): DataRecord[] {
  // Group data by time granularity
  const grouped = data.reduce((groups: TimeGroupedData, item) => {
    const dateValue = item[timeField];
    const date = new Date(dateValue as string | number | Date);
    let key: string;

    switch (granularity) {
      case "hour":
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        break;
      case "day":
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        break;
      case "week":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
        break;
      case "month":
        key = `${date.getFullYear()}-${date.getMonth()}`;
        break;
      default:
        key = String(item[timeField] || "undefined");
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    const groupArray = groups[key];
    if (groupArray) {
      groupArray.push(item);
    }
    return groups;
  }, {});

  return Object.entries(grouped).map(([key, groupItems]) => {
    const result: DataRecord = {};
    result[timeField] = key;
    result["count"] = groupItems.length;
    result["itemCount"] = groupItems.length;
    return result;
  });
}

function formatTimeSeriesData(
  data: DataRecord[],
  xAxis: string,
  yAxis: string | string[],
): ChartDataResult[] {
  // Format data for time series charts
  return data.map((item) => ({
    x: item[xAxis] as string | number,
    y: Array.isArray(yAxis)
      ? yAxis.reduce((sum, field) => sum + (Number(item[field]) || 0), 0)
      : Number(item[yAxis]) || 0,
  }));
}

function formatBarChartData(
  data: DataRecord[],
  xAxis: string,
  yAxis: string | string[],
): ChartDataResult[] {
  // Format data for bar charts
  return data.map((item) => ({
    x: item[xAxis] as string | number,
    y: Array.isArray(yAxis)
      ? yAxis.reduce((sum, field) => sum + (Number(item[field]) || 0), 0)
      : Number(item[yAxis]) || 0,
    label: String(item[xAxis] || ""),
  }));
}

function formatPieChartData(
  data: DataRecord[],
  xAxis: string,
  yAxis: string | string[],
): ChartDataResult[] {
  // Format data for pie charts
  return data.map((item) => ({
    x: item[xAxis] as string | number,
    y: Array.isArray(yAxis)
      ? yAxis.reduce((sum, field) => sum + (Number(item[field]) || 0), 0)
      : Number(item[yAxis]) || 0,
    name: String(item[xAxis] || ""),
    value: Array.isArray(yAxis)
      ? yAxis.reduce((sum, field) => sum + (Number(item[field]) || 0), 0)
      : Number(item[yAxis]) || 0,
  }));
}

function formatScatterData(
  data: DataRecord[],
  xAxis: string,
  yAxis: string | string[],
): ChartDataResult[] {
  // Format data for scatter plots
  return data.map((item) => {
    let yValue: number;

    if (Array.isArray(yAxis)) {
      const firstYAxis = yAxis[0];
      yValue = firstYAxis ? Number(item[firstYAxis]) || 0 : 0;
    } else {
      yValue = Number(item[yAxis]) || 0;
    }

    return {
      x: Number(item[xAxis]) || 0,
      y: yValue,
    };
  });
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    const midLeft = sorted[mid - 1];
    const midRight = sorted[mid];
    if (midLeft !== undefined && midRight !== undefined) {
      return (midLeft + midRight) / 2;
    }
    return 0;
  } else {
    const midValue = sorted[mid];
    return midValue !== undefined ? midValue : 0;
  }
}

// ============================================================================
// Additional helper functions for data transformation
// ============================================================================

function normalizeRecord(record: DataRecord): DataRecord {
  const normalized: DataRecord = {};

  Object.entries(record).forEach(([key, value]) => {
    // Normalize string values
    if (typeof value === "string") {
      normalized[key] = value.trim().toLowerCase();
    } else {
      normalized[key] = value;
    }
  });

  return normalized;
}

function deduplicateRecords(records: DataRecord[]): DataRecord[] {
  const seen = new Set<string>();
  const result: DataRecord[] = [];

  for (const record of records) {
    const key = JSON.stringify(record);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(record);
    }
  }

  return result;
}

function fillMissingValues(
  record: DataRecord,
  fillValues: Record<string, string | number>,
): DataRecord {
  const filled = { ...record };

  Object.entries(fillValues).forEach(([field, defaultValue]) => {
    if (filled[field] == null) {
      filled[field] = defaultValue;
    }
  });

  return filled;
}

export {};
