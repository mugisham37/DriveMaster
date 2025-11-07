/**
 * Export Formatter Utility
 * 
 * Handles formatting content data for various export formats (CSV, JSON, XLSX)
 * Requirements: 8.3, 8.4
 */

import type { ContentItem } from '../types'

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'csv' | 'json' | 'xlsx'

export interface ExportOptions {
  format: ExportFormat
  fields?: string[]
  includeMetadata?: boolean
  includeMedia?: boolean
  flattenObjects?: boolean
  dateFormat?: 'iso' | 'locale' | 'timestamp'
  compression?: 'none' | 'zip' | 'gzip'
}

export interface ExportResult {
  data: string | object[]
  filename: string
  mimeType: string
  size: number
}

// ============================================================================
// Field Mapping Configuration
// ============================================================================

export const DEFAULT_EXPORT_FIELDS = [
  'id',
  'title',
  'slug',
  'type',
  'status',
  'content.body',
  'metadata.description',
  'metadata.difficulty',
  'metadata.estimatedDuration',
  'tags',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy'
]

export const FIELD_LABELS: Record<string, string> = {
  'id': 'ID',
  'title': 'Title',
  'slug': 'Slug',
  'type': 'Type',
  'status': 'Status',
  'content.body': 'Content',
  'content.format': 'Content Format',
  'metadata.description': 'Description',
  'metadata.difficulty': 'Difficulty',
  'metadata.estimatedDuration': 'Estimated Duration (minutes)',
  'metadata.version': 'Version',
  'tags': 'Tags',
  'createdAt': 'Created At',
  'updatedAt': 'Updated At',
  'publishedAt': 'Published At',
  'archivedAt': 'Archived At',
  'createdBy': 'Created By',
  'updatedBy': 'Updated By'
}

// ============================================================================
// Export Formatter Class
// ============================================================================

export class ExportFormatter {
  private options: Required<ExportOptions>

  constructor(options: ExportOptions) {
    this.options = {
      fields: DEFAULT_EXPORT_FIELDS,
      includeMetadata: true,
      includeMedia: false,
      flattenObjects: true,
      dateFormat: 'iso',
      compression: 'none',
      ...options
    }
  }

  /**
   * Formats content items for export in the specified format
   */
  format(items: ContentItem[]): ExportResult {
    // Transform items to flat structure
    const transformedData = this.transformItems(items)

    switch (this.options.format) {
      case 'csv':
        return this.formatAsCsv(transformedData)
      case 'json':
        return this.formatAsJson(transformedData)
      case 'xlsx':
        return this.formatAsXlsx(transformedData)
      default:
        throw new Error(`Unsupported export format: ${this.options.format}`)
    }
  }

  /**
   * Transforms content items to flat structure for export
   */
  private transformItems(items: ContentItem[]): Record<string, unknown>[] {
    return items.map(item => {
      const transformed: Record<string, unknown> = {}

      for (const field of this.options.fields) {
        const value = this.getNestedValue(item, field)
        const label = FIELD_LABELS[field] || field
        transformed[label] = this.formatValue(value, field)
      }

      return transformed
    })
  }

  /**
   * Gets nested value from object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key]
      }
      return undefined
    }, obj)
  }

  /**
   * Formats a value based on its type and field context
   */
  private formatValue(value: unknown, field: string): string | number | boolean | null {
    if (value === null || value === undefined) {
      return null
    }

    // Handle dates
    if (value instanceof Date || (typeof value === 'string' && field.includes('At'))) {
      const date = value instanceof Date ? value : new Date(value)
      
      switch (this.options.dateFormat) {
        case 'iso':
          return date.toISOString()
        case 'locale':
          return date.toLocaleString()
        case 'timestamp':
          return date.getTime()
        default:
          return date.toISOString()
      }
    }

    // Handle arrays (like tags)
    if (Array.isArray(value)) {
      return value.join(', ')
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      if (this.options.flattenObjects) {
        return JSON.stringify(value)
      }
      return '[Object]'
    }

    // Handle primitives
    return value as string | number | boolean
  }

  /**
   * Formats data as CSV
   */
  private formatAsCsv(data: Record<string, unknown>[]): ExportResult {
    if (data.length === 0) {
      return {
        data: '',
        filename: this.generateFilename('csv'),
        mimeType: 'text/csv',
        size: 0
      }
    }

    const firstRow = data[0]
    if (!firstRow) {
      return {
        data: '',
        filename: this.generateFilename('csv'),
        mimeType: 'text/csv',
        size: 0
      }
    }

    const headers = Object.keys(firstRow)
    const csvLines: string[] = []

    // Add header row
    csvLines.push(this.escapeCsvRow(headers))

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header]
        return value !== null && value !== undefined ? String(value) : ''
      })
      csvLines.push(this.escapeCsvRow(values))
    }

    const csvContent = csvLines.join('\n')
    
    return {
      data: csvContent,
      filename: this.generateFilename('csv'),
      mimeType: 'text/csv',
      size: new Blob([csvContent]).size
    }
  }

  /**
   * Escapes and formats a CSV row
   */
  private escapeCsvRow(values: string[]): string {
    return values.map(value => {
      // Escape quotes and wrap in quotes if necessary
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  }

  /**
   * Formats data as JSON
   */
  private formatAsJson(data: Record<string, unknown>[]): ExportResult {
    const jsonContent = JSON.stringify(data, null, 2)
    
    return {
      data: jsonContent,
      filename: this.generateFilename('json'),
      mimeType: 'application/json',
      size: new Blob([jsonContent]).size
    }
  }

  /**
   * Formats data as XLSX (returns structured data for server-side processing)
   */
  private formatAsXlsx(data: Record<string, unknown>[]): ExportResult {
    // For XLSX, we return the structured data and let the server handle the Excel generation
    // This is because generating actual XLSX files requires libraries like xlsx or exceljs
    // which are better handled server-side
    
    return {
      data: data,
      filename: this.generateFilename('xlsx'),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 0 // Size will be determined server-side
    }
  }

  /**
   * Generates a filename with timestamp
   */
  private generateFilename(extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    return `content-export-${timestamp}.${extension}`
  }

  /**
   * Gets the appropriate MIME type for the format
   */
  getMimeType(): string {
    switch (this.options.format) {
      case 'csv':
        return 'text/csv'
      case 'json':
        return 'application/json'
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      default:
        return 'application/octet-stream'
    }
  }

  /**
   * Validates export options
   */
  static validateOptions(options: ExportOptions): {
    valid: boolean
    errors: string[]
  } {
    const result = {
      valid: true,
      errors: [] as string[]
    }

    // Validate format
    const supportedFormats: ExportFormat[] = ['csv', 'json', 'xlsx']
    if (!supportedFormats.includes(options.format)) {
      result.valid = false
      result.errors.push(`Unsupported format: ${options.format}. Supported formats: ${supportedFormats.join(', ')}`)
    }

    // Validate fields
    if (options.fields && options.fields.length === 0) {
      result.valid = false
      result.errors.push('At least one field must be specified for export')
    }

    // Validate date format
    if (options.dateFormat && !['iso', 'locale', 'timestamp'].includes(options.dateFormat)) {
      result.valid = false
      result.errors.push('Invalid date format. Supported formats: iso, locale, timestamp')
    }

    // Validate compression
    if (options.compression && !['none', 'zip', 'gzip'].includes(options.compression)) {
      result.valid = false
      result.errors.push('Invalid compression format. Supported formats: none, zip, gzip')
    }

    return result
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates an export formatter with default options
 */
export function createExportFormatter(format: ExportFormat, options?: Partial<ExportOptions>): ExportFormatter {
  return new ExportFormatter({
    format,
    ...options
  })
}

/**
 * Quick function to format content items for export
 */
export function formatContentForExport(
  items: ContentItem[], 
  format: ExportFormat, 
  options?: Partial<ExportOptions>
): ExportResult {
  const formatter = createExportFormatter(format, options)
  return formatter.format(items)
}

/**
 * Gets available export fields with their labels
 */
export function getAvailableExportFields(): Array<{ field: string; label: string; description?: string }> {
  return Object.entries(FIELD_LABELS).map(([field, label]) => ({
    field,
    label,
    description: getFieldDescription(field)
  }))
}

/**
 * Gets description for a field
 */
function getFieldDescription(field: string): string {
  const descriptions: Record<string, string> = {
    'id': 'Unique identifier for the content item',
    'title': 'Title of the content item',
    'slug': 'URL-friendly identifier',
    'type': 'Type of content (lesson, exercise, quiz, etc.)',
    'status': 'Current workflow status',
    'content.body': 'Main content body',
    'content.format': 'Content format (markdown, html, etc.)',
    'metadata.description': 'Brief description of the content',
    'metadata.difficulty': 'Difficulty level (beginner, intermediate, advanced)',
    'metadata.estimatedDuration': 'Estimated time to complete in minutes',
    'metadata.version': 'Content version number',
    'tags': 'Comma-separated list of tags',
    'createdAt': 'Date and time when content was created',
    'updatedAt': 'Date and time when content was last updated',
    'publishedAt': 'Date and time when content was published',
    'archivedAt': 'Date and time when content was archived',
    'createdBy': 'User who created the content',
    'updatedBy': 'User who last updated the content'
  }

  return descriptions[field] || ''
}

/**
 * Estimates export file size based on content items and format
 */
export function estimateExportSize(items: ContentItem[], format: ExportFormat): {
  estimatedSize: number
  unit: string
  warning?: string
} {
  const avgItemSize = 2048 // Average 2KB per item (rough estimate)
  let multiplier = 1

  switch (format) {
    case 'csv':
      multiplier = 0.5 // CSV is more compact
      break
    case 'json':
      multiplier = 1.2 // JSON has more overhead
      break
    case 'xlsx':
      multiplier = 0.8 // XLSX is compressed but has overhead
      break
  }

  const estimatedBytes = items.length * avgItemSize * multiplier
  
  let size: number
  let unit: string
  let warning: string | undefined

  if (estimatedBytes < 1024) {
    size = estimatedBytes
    unit = 'B'
  } else if (estimatedBytes < 1024 * 1024) {
    size = Math.round(estimatedBytes / 1024)
    unit = 'KB'
  } else if (estimatedBytes < 1024 * 1024 * 1024) {
    size = Math.round(estimatedBytes / (1024 * 1024))
    unit = 'MB'
    
    if (size > 100) {
      warning = 'Large export file. Consider filtering or splitting the export.'
    }
  } else {
    size = Math.round(estimatedBytes / (1024 * 1024 * 1024))
    unit = 'GB'
    warning = 'Very large export file. Consider filtering or splitting the export.'
  }

  const result: { estimatedSize: number; unit: string; warning?: string } = {
    estimatedSize: size,
    unit
  }

  if (warning) {
    result.warning = warning
  }

  return result
}