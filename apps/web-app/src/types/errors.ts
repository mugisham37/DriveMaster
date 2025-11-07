/**
 * Content Service Error Types
 * 
 * Error classification and response wrappers for content service operations
 */

// ============================================================================
// Base Error Types
// ============================================================================

export type ContentServiceErrorType = 
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'server'
  | 'timeout'
  | 'rate_limit'
  | 'service_unavailable'

export interface BaseContentServiceError {
  type: ContentServiceErrorType
  message: string
  code?: string
  recoverable: boolean
  retryAfter?: number
  timestamp: Date
  correlationId?: string
}

// ============================================================================
// Specific Error Types
// ============================================================================

export interface NetworkError extends BaseContentServiceError {
  type: 'network'
  cause?: 'connection_failed' | 'dns_resolution' | 'ssl_error' | 'proxy_error'
}

export interface AuthenticationError extends BaseContentServiceError {
  type: 'authentication'
  cause?: 'invalid_token' | 'expired_token' | 'missing_token' | 'malformed_token'
}

export interface AuthorizationError extends BaseContentServiceError {
  type: 'authorization'
  cause?: 'insufficient_permissions' | 'resource_forbidden' | 'operation_forbidden'
  requiredPermissions?: string[]
}

export interface ValidationError extends BaseContentServiceError {
  type: 'validation'
  field?: string
  constraints: string[]
  value?: unknown
}

export interface NotFoundError extends BaseContentServiceError {
  type: 'not_found'
  resource: string
  resourceId?: string
}

export interface ConflictError extends BaseContentServiceError {
  type: 'conflict'
  cause?: 'duplicate_slug' | 'version_mismatch' | 'concurrent_modification' | 'workflow_violation'
  conflictingResource?: string
}

export interface ServerError extends BaseContentServiceError {
  type: 'server'
  statusCode?: number
  cause?: 'internal_error' | 'database_error' | 'external_service_error'
}

export interface TimeoutError extends BaseContentServiceError {
  type: 'timeout'
  operation: string
  timeoutMs: number
}

export interface RateLimitError extends BaseContentServiceError {
  type: 'rate_limit'
  limit: number
  remaining: number
  resetTime: Date
}

export interface ServiceUnavailableError extends BaseContentServiceError {
  type: 'service_unavailable'
  cause?: 'maintenance' | 'overload' | 'circuit_breaker_open'
  estimatedRecoveryTime?: Date
}

// ============================================================================
// Union Type
// ============================================================================

export type ContentServiceError = 
  | NetworkError
  | AuthenticationError
  | AuthorizationError
  | ValidationError
  | NotFoundError
  | ConflictError
  | ServerError
  | TimeoutError
  | RateLimitError
  | ServiceUnavailableError

// ============================================================================
// Error Context
// ============================================================================

export interface ErrorContext {
  operation: string
  itemId?: string
  userId?: string
  correlationId: string
  timestamp: Date
  userAgent?: string
  ipAddress?: string
  additionalData?: Record<string, unknown>
}

// ============================================================================
// Error Response Wrapper
// ============================================================================

export interface ErrorResponse {
  error: {
    type: ContentServiceErrorType
    code: string
    message: string
    details?: unknown
    context?: ErrorContext
    stack?: string
  }
  meta: {
    timestamp: Date
    requestId: string
    version: string
  }
}

// ============================================================================
// Bulk Operation Errors
// ============================================================================

export interface BulkOperationItemError {
  itemId?: string
  itemIndex?: number
  error: ContentServiceError
  context?: Record<string, unknown>
}

export interface BulkOperationErrors {
  operationId: string
  totalErrors: number
  errors: BulkOperationItemError[]
  summary: Record<ContentServiceErrorType, number>
}

// ============================================================================
// Circuit Breaker Errors
// ============================================================================

export interface CircuitBreakerError extends BaseContentServiceError {
  type: 'service_unavailable'
  cause: 'circuit_breaker_open'
  failureCount: number
  lastFailureTime: Date
  nextRetryTime: Date
}

// ============================================================================
// Upload Errors
// ============================================================================

export interface UploadError extends BaseContentServiceError {
  type: 'validation' | 'server' | 'timeout'
  cause?: 'file_too_large' | 'invalid_format' | 'upload_failed' | 'processing_failed'
  filename?: string
  fileSize?: number
  maxFileSize?: number
  allowedFormats?: string[]
}

// ============================================================================
// Search Errors
// ============================================================================

export interface SearchError extends BaseContentServiceError {
  type: 'validation' | 'server' | 'timeout'
  cause?: 'invalid_query' | 'search_service_error' | 'index_unavailable'
  query?: string
  suggestions?: string[]
}