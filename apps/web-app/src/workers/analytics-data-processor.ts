// ============================================================================
// Analytics Data Processor Web Worker
// ============================================================================

export interface WorkerMessage {
  id: string
  type: 'process' | 'export' | 'transform' | 'aggregate'
  payload: any
}

export interface WorkerResponse {
  id: string
  type: 'success' | 'error' | 'progress'
  payload: any
}

export interface ProcessingTask {
  id: string
  type: 'csv-export' | 'chart-data' | 'data-aggregation' | 'data-transformation'
  data: any
  options?: any
}

export interface CSVExportOptions {
  filename: string
  columns: Array<{
    key: string
    header: string
    formatter?: (value: any) => string
  }>
  includeHeaders: boolean
  delimiter: string
}

export interface ChartDataOptions {
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter'
  xAxis: string
  yAxis: string | string[]
  groupBy?: string
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  timeGranularity?: 'hour' | 'day' | 'week' | 'month'
}

export interface AggregationOptions {
  groupBy: string[]
  metrics: Array<{
    field: string
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median'
    alias?: string
  }>
  filters?: Record<string, any>
  sort?: Array<{
    field: string
    direction: 'asc' | 'desc'
  }>
}

// Main worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data

  try {
    let result: any

    switch (type) {
      case 'process':
        result = await processData(payload)
        break
      case 'export':
        result = await exportData(payload)
        break
      case 'transform':
        result = await transformData(payload)
        break
      case 'aggregate':
        result = await aggregateData(payload)
        break
      default:
        throw new Error(`Unknown task type: ${type}`)
    }

    const response: WorkerResponse = {
      id,
      type: 'success',
      payload: result
    }

    self.postMessage(response)
  } catch (error) {
    const response: WorkerResponse = {
      id,
      type: 'error',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    self.postMessage(response)
  }
}

/**
 * Process analytics data based on task type
 */
async function processData(task: ProcessingTask): Promise<any> {
  switch (task.type) {
    case 'csv-export':
      return await generateCSV(task.data, task.options as CSVExportOptions)
    case 'chart-data':
      return await formatChartData(task.data, task.options as ChartDataOptions)
    case 'data-aggregation':
      return await performAggregation(task.data, task.options as AggregationOptions)
    case 'data-transformation':
      return await performTransformation(task.data, task.options)
    default:
      throw new Error(`Unknown processing task type: ${task.type}`)
  }
}

/**
 * Export data to various formats
 */
async function exportData(payload: {
  data: any[]
  format: 'csv' | 'json' | 'xlsx'
  options?: any
}): Promise<{ blob: Blob; filename: string }> {
  const { data, format, options = {} } = payload

  switch (format) {
    case 'csv':
      const csvContent = await generateCSV(data, options)
      return {
        blob: new Blob([csvContent], { type: 'text/csv' }),
        filename: options.filename || 'analytics-export.csv'
      }
    case 'json':
      const jsonContent = JSON.stringify(data, null, 2)
      return {
        blob: new Blob([jsonContent], { type: 'application/json' }),
        filename: options.filename || 'analytics-export.json'
      }
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

/**
 * Transform data structures
 */
async function transformData(payload: {
  data: any[]
  transformations: Array<{
    type: 'filter' | 'map' | 'sort' | 'group' | 'pivot'
    config: any
  }>
}): Promise<any[]> {
  let result = [...payload.data]

  for (const transformation of payload.transformations) {
    switch (transformation.type) {
      case 'filter':
        result = result.filter(item => evaluateFilter(item, transformation.config))
        break
      case 'map':
        result = result.map(item => applyMapping(item, transformation.config))
        break
      case 'sort':
        result = sortData(result, transformation.config)
        break
      case 'group':
        result = groupData(result, transformation.config)
        break
      case 'pivot':
        result = pivotData(result, transformation.config)
        break
    }
  }

  return result
}

/**
 * Aggregate data
 */
async function aggregateData(payload: {
  data: any[]
  options: AggregationOptions
}): Promise<any[]> {
  return performAggregation(payload.data, payload.options)
}

/**
 * Generate CSV content from data
 */
async function generateCSV(data: any[], options: CSVExportOptions): Promise<string> {
  const { columns, includeHeaders, delimiter } = options
  let csv = ''

  // Add headers if requested
  if (includeHeaders) {
    const headers = columns.map(col => escapeCSVValue(col.header))
    csv += headers.join(delimiter) + '\n'
  }

  // Process data in chunks to avoid blocking
  const chunkSize = 1000
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    
    for (const row of chunk) {
      const values = columns.map(col => {
        const value = row[col.key]
        const formatted = col.formatter ? col.formatter(value) : String(value || '')
        return escapeCSVValue(formatted)
      })
      csv += values.join(delimiter) + '\n'
    }

    // Report progress for large datasets
    if (data.length > 5000) {
      const progress = Math.min(100, ((i + chunkSize) / data.length) * 100)
      self.postMessage({
        id: 'progress',
        type: 'progress',
        payload: { progress }
      } as WorkerResponse)
    }

    // Yield control to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  return csv
}

/**
 * Format data for chart visualization
 */
async function formatChartData(data: any[], options: ChartDataOptions): Promise<any> {
  const { chartType, xAxis, yAxis, groupBy, aggregation, timeGranularity } = options

  let processedData = [...data]

  // Apply time granularity if specified
  if (timeGranularity && isDateField(xAxis)) {
    processedData = aggregateByTime(processedData, xAxis, timeGranularity)
  }

  // Group data if specified
  if (groupBy) {
    processedData = groupData(processedData, { field: groupBy })
  }

  // Format based on chart type
  switch (chartType) {
    case 'line':
    case 'area':
      return formatTimeSeriesData(processedData, xAxis, yAxis, aggregation)
    case 'bar':
      return formatBarChartData(processedData, xAxis, yAxis, aggregation)
    case 'pie':
      return formatPieChartData(processedData, xAxis, yAxis, aggregation)
    case 'scatter':
      return formatScatterData(processedData, xAxis, yAxis)
    default:
      throw new Error(`Unsupported chart type: ${chartType}`)
  }
}

/**
 * Perform data aggregation
 */
async function performAggregation(data: any[], options: AggregationOptions): Promise<any[]> {
  const { groupBy, metrics, filters, sort } = options

  let processedData = [...data]

  // Apply filters
  if (filters) {
    processedData = processedData.filter(item => 
      Object.entries(filters).every(([key, value]) => 
        evaluateFilter(item, { field: key, operator: 'equals', value })
      )
    )
  }

  // Group data
  const grouped = groupBy.length > 0 
    ? groupDataByFields(processedData, groupBy)
    : { all: processedData }

  // Calculate metrics for each group
  const results = Object.entries(grouped).map(([groupKey, groupData]) => {
    const result: any = {}

    // Add group keys
    if (groupBy.length > 0) {
      const groupKeys = groupKey.split('|')
      groupBy.forEach((field, index) => {
        result[field] = groupKeys[index]
      })
    }

    // Calculate metrics
    metrics.forEach(metric => {
      const values = groupData.map(item => item[metric.field]).filter(v => v != null)
      const fieldName = metric.alias || metric.field

      switch (metric.operation) {
        case 'sum':
          result[fieldName] = values.reduce((sum, val) => sum + Number(val), 0)
          break
        case 'avg':
          result[fieldName] = values.length > 0 
            ? values.reduce((sum, val) => sum + Number(val), 0) / values.length 
            : 0
          break
        case 'count':
          result[fieldName] = values.length
          break
        case 'min':
          result[fieldName] = values.length > 0 ? Math.min(...values.map(Number)) : 0
          break
        case 'max':
          result[fieldName] = values.length > 0 ? Math.max(...values.map(Number)) : 0
          break
        case 'median':
          result[fieldName] = calculateMedian(values.map(Number))
          break
      }
    })

    return result
  })

  // Apply sorting
  if (sort && sort.length > 0) {
    return sortData(results, sort)
  }

  return results
}

// Helper functions

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function evaluateFilter(item: any, filter: any): boolean {
  const { field, operator, value } = filter
  const itemValue = item[field]

  switch (operator) {
    case 'equals':
      return itemValue === value
    case 'not_equals':
      return itemValue !== value
    case 'greater_than':
      return Number(itemValue) > Number(value)
    case 'less_than':
      return Number(itemValue) < Number(value)
    case 'contains':
      return String(itemValue).toLowerCase().includes(String(value).toLowerCase())
    default:
      return true
  }
}

function applyMapping(item: any, mapping: any): any {
  const result = { ...item }
  
  Object.entries(mapping).forEach(([key, transform]: [string, any]) => {
    if (typeof transform === 'function') {
      result[key] = transform(item[key])
    } else if (typeof transform === 'string') {
      // Simple field mapping
      result[key] = item[transform]
    }
  })

  return result
}

function sortData(data: any[], sortConfig: any): any[] {
  return data.sort((a, b) => {
    for (const sort of Array.isArray(sortConfig) ? sortConfig : [sortConfig]) {
      const { field, direction } = sort
      const aVal = a[field]
      const bVal = b[field]
      
      if (aVal === bVal) continue
      
      const comparison = aVal < bVal ? -1 : 1
      return direction === 'desc' ? -comparison : comparison
    }
    return 0
  })
}

function groupData(data: any[], config: any): any[] {
  const { field } = config
  const grouped = data.reduce((groups, item) => {
    const key = item[field]
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
    return groups
  }, {} as Record<string, any[]>)

  return Object.entries(grouped).map(([key, items]) => ({
    [field]: key,
    items,
    count: items.length
  }))
}

function groupDataByFields(data: any[], fields: string[]): Record<string, any[]> {
  return data.reduce((groups, item) => {
    const key = fields.map(field => item[field]).join('|')
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
    return groups
  }, {} as Record<string, any[]>)
}

function pivotData(data: any[], config: any): any[] {
  // Simplified pivot implementation
  const { rows, columns, values } = config
  // Implementation would depend on specific pivot requirements
  return data
}

function isDateField(field: string): boolean {
  return field.toLowerCase().includes('date') || 
         field.toLowerCase().includes('time') || 
         field.toLowerCase().includes('timestamp')
}

function aggregateByTime(data: any[], timeField: string, granularity: string): any[] {
  // Group data by time granularity
  const grouped = data.reduce((groups, item) => {
    const date = new Date(item[timeField])
    let key: string

    switch (granularity) {
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
        break
      case 'day':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`
        break
      case 'month':
        key = `${date.getFullYear()}-${date.getMonth()}`
        break
      default:
        key = item[timeField]
    }

    if (!groups[key]) groups[key] = []
    groups[key].push(item)
    return groups
  }, {} as Record<string, any[]>)

  return Object.entries(grouped).map(([key, items]) => ({
    [timeField]: key,
    items,
    count: items.length
  }))
}

function formatTimeSeriesData(data: any[], xAxis: string, yAxis: string | string[], aggregation?: string): any {
  // Format data for time series charts
  return data.map(item => ({
    x: item[xAxis],
    y: Array.isArray(yAxis) 
      ? yAxis.reduce((sum, field) => sum + (Number(item[field]) || 0), 0)
      : Number(item[yAxis]) || 0
  }))
}

function formatBarChartData(data: any[], xAxis: string, yAxis: string | string[], aggregation?: string): any {
  // Format data for bar charts
  return data.map(item => ({
    label: item[xAxis],
    value: Array.isArray(yAxis)
      ? yAxis.reduce((sum, field) => sum + (Number(item[field]) || 0), 0)
      : Number(item[yAxis]) || 0
  }))
}

function formatPieChartData(data: any[], xAxis: string, yAxis: string | string[], aggregation?: string): any {
  // Format data for pie charts
  return data.map(item => ({
    name: item[xAxis],
    value: Array.isArray(yAxis)
      ? yAxis.reduce((sum, field) => sum + (Number(item[field]) || 0), 0)
      : Number(item[yAxis]) || 0
  }))
}

function formatScatterData(data: any[], xAxis: string, yAxis: string | string[]): any {
  // Format data for scatter plots
  return data.map(item => ({
    x: Number(item[xAxis]) || 0,
    y: Array.isArray(yAxis) ? Number(item[yAxis[0]]) || 0 : Number(item[yAxis]) || 0
  }))
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export {}