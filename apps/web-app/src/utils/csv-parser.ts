/**
 * CSV Parser Utility
 * 
 * Handles CSV parsing, validation, and transformation for bulk import operations
 * Requirements: 8.1, 8.2
 */

import type { ContentItem, ContentType, WorkflowStatus } from '@/types'

// ============================================================================
// CSV Parsing Types
// ============================================================================

export interface CsvParseOptions {
  delimiter?: string
  quote?: string
  escape?: string
  skipEmptyLines?: boolean
  skipLinesWithError?: boolean
  maxRows?: number
}

export interface CsvValidationRule {
  field: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'date' | 'enum'
  enumValues?: string[]
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  transform?: (value: string) => unknown
}

export interface CsvParseResult {
  data: Record<string, unknown>[]
  errors: Array<{
    row: number
    field: string
    error: string
    value?: string
  }>
  warnings: Array<{
    row: number
    field: string
    warning: string
    value?: string
  }>
  totalRows: number
  validRows: number
}

// ============================================================================
// Default Content Item Validation Rules
// ============================================================================

export const DEFAULT_CONTENT_VALIDATION_RULES: CsvValidationRule[] = [
  {
    field: 'title',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  {
    field: 'slug',
    required: false,
    type: 'string',
    pattern: /^[a-z0-9-]+$/,
    maxLength: 100
  },
  {
    field: 'type',
    required: true,
    type: 'enum',
    enumValues: ['lesson', 'exercise', 'quiz', 'article', 'video', 'document']
  },
  {
    field: 'status',
    required: false,
    type: 'enum',
    enumValues: ['draft', 'review', 'approved', 'published', 'archived']
  },
  {
    field: 'content',
    required: true,
    type: 'string',
    minLength: 1
  },
  {
    field: 'prerequisites',
    required: false,
    type: 'string',
    transform: (value: string) => value ? value.split(',').map(item => item.trim()) : []
  },
  {
    field: 'learningObjectives',
    required: false,
    type: 'string',
    transform: (value: string) => value ? value.split(',').map(item => item.trim()) : []
  },
  {
    field: 'topics',
    required: false,
    type: 'string',
    transform: (value: string) => value ? value.split(',').map(item => item.trim()) : []
  },
  {
    field: 'language',
    required: false,
    type: 'string',
    maxLength: 10
  },
  {
    field: 'tags',
    required: false,
    type: 'string',
    transform: (value: string) => value ? value.split(',').map(tag => tag.trim()) : []
  },
  {
    field: 'difficulty',
    required: false,
    type: 'enum',
    enumValues: ['beginner', 'intermediate', 'advanced']
  },
  {
    field: 'estimatedTimeMinutes',
    required: false,
    type: 'number'
  }
]

// ============================================================================
// CSV Parser Class
// ============================================================================

export class CsvParser {
  private options: Required<CsvParseOptions>
  private validationRules: CsvValidationRule[]

  constructor(options?: CsvParseOptions, validationRules?: CsvValidationRule[]) {
    this.options = {
      delimiter: ',',
      quote: '"',
      escape: '"',
      skipEmptyLines: true,
      skipLinesWithError: false,
      maxRows: 10000,
      ...options
    }
    this.validationRules = validationRules || DEFAULT_CONTENT_VALIDATION_RULES
  }

  /**
   * Parses CSV string into structured data with validation
   */
  parse(csvData: string): CsvParseResult {
    const result: CsvParseResult = {
      data: [],
      errors: [],
      warnings: [],
      totalRows: 0,
      validRows: 0
    }

    try {
      // Split into lines and handle different line endings
      const lines = csvData.split(/\r?\n/)
      
      if (lines.length === 0) {
        result.errors.push({
          row: 0,
          field: 'csv',
          error: 'CSV data is empty'
        })
        return result
      }

      // Parse header row
      const headerLine = lines[0]
      if (!headerLine?.trim()) {
        result.errors.push({
          row: 1,
          field: 'header',
          error: 'Header row is missing or empty'
        })
        return result
      }

      const headers = this.parseCsvLine(headerLine)
      if (headers.length === 0) {
        result.errors.push({
          row: 1,
          field: 'header',
          error: 'No columns found in header row'
        })
        return result
      }

      // Validate required headers
      const requiredFields = this.validationRules
        .filter(rule => rule.required)
        .map(rule => rule.field)
      
      const missingHeaders = requiredFields.filter(field => !headers.includes(field))
      if (missingHeaders.length > 0) {
        result.errors.push({
          row: 1,
          field: 'header',
          error: `Missing required columns: ${missingHeaders.join(', ')}`
        })
        return result
      }

      // Parse data rows
      const dataLines = lines.slice(1)
      result.totalRows = dataLines.length

      for (let i = 0; i < dataLines.length && i < this.options.maxRows; i++) {
        const line = dataLines[i]
        const rowNumber = i + 2 // +2 because we start from line 2 (after header)

        // Skip empty lines if configured
        if (this.options.skipEmptyLines && !line?.trim()) {
          result.totalRows--
          continue
        }

        // Ensure line is not undefined
        if (!line) {
          continue
        }

        try {
          const values = this.parseCsvLine(line)
          const rowData: Record<string, unknown> = {}
          let hasRowErrors = false

          // Map values to headers
          for (let j = 0; j < headers.length; j++) {
            const header = headers[j]
            if (!header) continue
            const value = values[j] || ''
            
            // Validate and transform the value
            const validationResult = this.validateField(header, value, rowNumber)
            
            if (validationResult.errors.length > 0) {
              result.errors.push(...validationResult.errors)
              hasRowErrors = true
            }
            
            if (validationResult.warnings.length > 0) {
              result.warnings.push(...validationResult.warnings)
            }

            rowData[header] = validationResult.value
          }

          // Add row to results if no errors or if we're not skipping error rows
          if (!hasRowErrors || !this.options.skipLinesWithError) {
            result.data.push(rowData)
            
            if (!hasRowErrors) {
              result.validRows++
            }
          }
        } catch (parseError) {
          result.errors.push({
            row: rowNumber,
            field: 'row',
            error: `Failed to parse row: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
          })
        }
      }

      // Check if we hit the max rows limit
      if (dataLines.length > this.options.maxRows) {
        result.warnings.push({
          row: 0,
          field: 'csv',
          warning: `Only processed first ${this.options.maxRows} rows. Total rows in file: ${dataLines.length}`
        })
      }

    } catch (error) {
      result.errors.push({
        row: 0,
        field: 'csv',
        error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    return result
  }

  /**
   * Parses a single CSV line into an array of values
   */
  private parseCsvLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === this.options.quote) {
        if (inQuotes && nextChar === this.options.quote) {
          // Escaped quote
          current += this.options.quote
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === this.options.delimiter && !inQuotes) {
        // End of field
        values.push(current.trim())
        current = ''
        i++
      } else {
        // Regular character
        current += char
        i++
      }
    }

    // Add the last field
    values.push(current.trim())

    return values
  }

  /**
   * Validates and transforms a field value according to validation rules
   */
  private validateField(fieldName: string, value: string, rowNumber: number): {
    value: unknown
    errors: Array<{ row: number; field: string; error: string; value?: string }>
    warnings: Array<{ row: number; field: string; warning: string; value?: string }>
  } {
    const result = {
      value: value as unknown,
      errors: [] as Array<{ row: number; field: string; error: string; value?: string }>,
      warnings: [] as Array<{ row: number; field: string; warning: string; value?: string }>
    }

    const rule = this.validationRules.find(r => r.field === fieldName)
    if (!rule) {
      // No validation rule found, return as-is
      return result
    }

    // Check required fields
    if (rule.required && (!value || value.trim() === '')) {
      result.errors.push({
        row: rowNumber,
        field: fieldName,
        error: `${fieldName} is required`,
        value
      })
      return result
    }

    // Skip validation for empty optional fields
    if (!rule.required && (!value || value.trim() === '')) {
      result.value = undefined
      return result
    }

    const trimmedValue = value.trim()

    // Type validation and transformation
    switch (rule.type) {
      case 'string':
        result.value = trimmedValue
        
        if (rule.minLength && trimmedValue.length < rule.minLength) {
          result.errors.push({
            row: rowNumber,
            field: fieldName,
            error: `${fieldName} must be at least ${rule.minLength} characters`,
            value
          })
        }
        
        if (rule.maxLength && trimmedValue.length > rule.maxLength) {
          result.errors.push({
            row: rowNumber,
            field: fieldName,
            error: `${fieldName} must not exceed ${rule.maxLength} characters`,
            value
          })
        }
        
        if (rule.pattern && !rule.pattern.test(trimmedValue)) {
          result.errors.push({
            row: rowNumber,
            field: fieldName,
            error: `${fieldName} format is invalid`,
            value
          })
        }
        break

      case 'number':
        const numValue = parseFloat(trimmedValue)
        if (isNaN(numValue)) {
          result.errors.push({
            row: rowNumber,
            field: fieldName,
            error: `${fieldName} must be a valid number`,
            value
          })
        } else {
          result.value = numValue
        }
        break

      case 'boolean':
        const lowerValue = trimmedValue.toLowerCase()
        if (['true', '1', 'yes', 'y'].includes(lowerValue)) {
          result.value = true
        } else if (['false', '0', 'no', 'n'].includes(lowerValue)) {
          result.value = false
        } else {
          result.errors.push({
            row: rowNumber,
            field: fieldName,
            error: `${fieldName} must be a valid boolean (true/false, 1/0, yes/no)`,
            value
          })
        }
        break

      case 'date':
        const dateValue = new Date(trimmedValue)
        if (isNaN(dateValue.getTime())) {
          result.errors.push({
            row: rowNumber,
            field: fieldName,
            error: `${fieldName} must be a valid date`,
            value
          })
        } else {
          result.value = dateValue
        }
        break

      case 'enum':
        if (rule.enumValues && !rule.enumValues.includes(trimmedValue)) {
          result.errors.push({
            row: rowNumber,
            field: fieldName,
            error: `${fieldName} must be one of: ${rule.enumValues.join(', ')}`,
            value
          })
        } else {
          result.value = trimmedValue
        }
        break

      default:
        result.value = trimmedValue
    }

    // Apply custom transformation if provided
    if (rule.transform && result.errors.length === 0) {
      try {
        result.value = rule.transform(trimmedValue)
      } catch (transformError) {
        result.errors.push({
          row: rowNumber,
          field: fieldName,
          error: `${fieldName} transformation failed: ${transformError instanceof Error ? transformError.message : 'Unknown error'}`,
          value
        })
      }
    }

    return result
  }

  /**
   * Converts parsed CSV data to ContentItem format
   */
  transformToContentItems(parsedData: Record<string, unknown>[]): Partial<ContentItem>[] {
    return parsedData.map(row => {
      const contentItem: Partial<ContentItem> & { slug?: string } = {
        title: row.title as string,
        slug: row.slug as string || this.generateSlug(row.title as string),
        type: (row.type as ContentType) || 'lesson',
        status: (row.status as WorkflowStatus) || 'draft',
        content: {
          body: row.content as string,
          format: 'markdown'
        },
        metadata: {
          difficulty: (row.difficulty as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
          estimatedTimeMinutes: (row.estimatedTimeMinutes as number) || 0,
          prerequisites: (row.prerequisites as string[]) || [],
          learningObjectives: (row.learningObjectives as string[]) || [],
          topics: (row.topics as string[]) || [],
          language: row.language as string,
          version: '1.0.0'
        },
        tags: row.tags as string[] || []
      }

      return contentItem
    })
  }

  /**
   * Generates a URL-friendly slug from a title
   */
  private generateSlug(title: string): string {
    if (!title) return ''
    
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  }

  /**
   * Validates CSV headers against expected content fields
   */
  validateHeaders(headers: string[]): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const result = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[]
    }

    // Check for required headers
    const requiredFields = this.validationRules
      .filter(rule => rule.required)
      .map(rule => rule.field)
    
    const missingRequired = requiredFields.filter(field => !headers.includes(field))
    if (missingRequired.length > 0) {
      result.valid = false
      result.errors.push(`Missing required columns: ${missingRequired.join(', ')}`)
    }

    // Check for unknown headers
    const knownFields = this.validationRules.map(rule => rule.field)
    const unknownHeaders = headers.filter(header => !knownFields.includes(header))
    if (unknownHeaders.length > 0) {
      result.warnings.push(`Unknown columns will be ignored: ${unknownHeaders.join(', ')}`)
    }

    // Check for duplicate headers
    const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index)
    if (duplicates.length > 0) {
      result.valid = false
      result.errors.push(`Duplicate columns found: ${[...new Set(duplicates)].join(', ')}`)
    }

    return result
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a CSV parser with default content validation rules
 */
export function createContentCsvParser(options?: CsvParseOptions): CsvParser {
  return new CsvParser(options, DEFAULT_CONTENT_VALIDATION_RULES)
}

/**
 * Quick function to parse and validate CSV content data
 */
export function parseContentCsv(csvData: string, options?: CsvParseOptions): CsvParseResult {
  const parser = createContentCsvParser(options)
  return parser.parse(csvData)
}

/**
 * Converts CSV data to content items with validation
 */
export function csvToContentItems(csvData: string, options?: CsvParseOptions): {
  items: Partial<ContentItem>[]
  errors: Array<{ row: number; field: string; error: string }>
  warnings: Array<{ row: number; field: string; warning: string }>
  totalRows: number
  validRows: number
} {
  const parser = createContentCsvParser(options)
  const parseResult = parser.parse(csvData)
  const items = parser.transformToContentItems(parseResult.data)

  return {
    items,
    errors: parseResult.errors,
    warnings: parseResult.warnings,
    totalRows: parseResult.totalRows,
    validRows: parseResult.validRows
  }
}