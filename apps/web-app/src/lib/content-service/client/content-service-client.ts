/**
 * Content Service Client
 * 
 * Main client class for content service integration following UserServiceClient patterns
 * Implements HTTP client integration with authentication, request/response interceptors,
 * and basic error handling with retry logic.
 * 
 * Requirements: 1.1, 2.1, 2.2, 7.1, 7.3
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { integratedTokenManager } from '@/lib/auth/token-manager'
import { createCorrelationId } from '@/lib/config/content-service'
import { validateFile, optimizeImage } from '../utils/media-optimization'
import { CircuitBreaker, CircuitBreakerState, createCircuitBreaker, isCircuitBreakerError } from '../utils/circuit-breaker'
import { ErrorHandler } from '../utils/error-handler'
import { GracefulDegradationManager, createGracefulDegradationManager } from '../utils/graceful-degradation'
import { WebSocketManager, createWebSocketManager } from '../websocket/websocket-manager'
import { performanceMonitor } from '../utils/performance-monitor'
import { errorMonitor } from '../utils/error-monitor'
import type { ContentServiceClientConfig } from './types'
import type { 
  ContentItem,
  MediaAsset,
  SearchResult,
  SearchSuggestion,
  Recommendation,
  BulkOperation,
  BulkOperationType,
  BulkOperationStatus,
  ContentServiceError,
  ContentServiceErrorType,
  WorkflowStatus,
  WorkflowTransition,
  RecommendationType,
  ContentType
} from '../types'
import { ConflictError, AuthorizationError, TimeoutError } from '../types'
import type {
  CreateItemDto,
  UpdateItemDto,
  QueryItemsDto,
  PaginatedResult,
  UploadMediaDto,
  SignedUrlOptions,
  SearchRequestDto,
  FacetedSearchDto,
  SubmitForReviewDto,
  ReviewItemDto,
  PublishItemDto,
  BulkWorkflowDto,
  BulkImportRequestDto,
  BulkImportResultDto,
  BulkExportRequestDto,
  BulkExportResultDto
} from '../../../types/dtos'

// Extend Axios types to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      correlationId?: string
      requestStartTime?: number
      retryCount?: number
    }
  }
}

// ============================================================================
// Retry Configuration
// ============================================================================

interface RetryConfig {
  attempts: number
  delay: number
  backoffFactor: number
  maxDelay: number
  retryableStatusCodes: number[]
  retryableErrorTypes: string[]
}

// ============================================================================
// Client Metrics
// ============================================================================

interface ClientMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  errorsByType: Record<string, number>
  lastResetTime: Date
}

// ============================================================================
// API Response Wrapper
// ============================================================================

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    type: ContentServiceErrorType
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    timestamp: Date
    requestId: string
    version: string
  }
}

// ============================================================================
// Content Service Client Class
// ============================================================================

export class ContentServiceClient {
  private axiosInstance: AxiosInstance
  private config: ContentServiceClientConfig
  private retryConfig: RetryConfig
  private metrics: ClientMetrics
  private metricsTimer: NodeJS.Timeout | undefined
  private circuitBreaker: CircuitBreaker
  private degradationManager: GracefulDegradationManager
  private webSocketManager: WebSocketManager | null = null

  constructor(config?: ContentServiceClientConfig) {
    this.config = {
      baseURL: 'http://localhost:3004',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      enableRequestLogging: false,
      enableMetrics: true,
      enableCaching: true,
      enableWebSocket: true,
      ...config
    }

    this.retryConfig = {
      attempts: this.config.retryAttempts,
      delay: this.config.retryDelay,
      backoffFactor: 2,
      maxDelay: 30000,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      retryableErrorTypes: ['ECONNRESET', 'ENOTFOUND', 'ECONNABORTED', 'ETIMEDOUT']
    }

    this.metrics = this.initializeMetrics()
    this.axiosInstance = this.createAxiosInstance()
    
    // Initialize circuit breaker
    this.circuitBreaker = createCircuitBreaker({
      failureThreshold: this.config.circuitBreakerThreshold,
      successThreshold: 2,
      timeout: this.config.timeout,
      resetTimeout: this.config.circuitBreakerTimeout
    })

    // Initialize graceful degradation manager
    this.degradationManager = createGracefulDegradationManager({
      enableCache: true,
      enableOfflineMode: true,
      cacheRetentionTime: 3600000, // 1 hour
      healthCheckInterval: 30000, // 30 seconds
      degradationThreshold: 25,
      offlineThreshold: 50,
      fallbackStrategies: {
        contentRead: 'cache',
        contentWrite: 'queue',
        mediaUpload: 'queue',
        search: 'cache',
        bulkOperations: 'queue'
      }
    })

    this.setupInterceptors()

    // Start metrics collection if enabled
    if (this.config.enableMetrics) {
      this.startMetricsCollection()
    }

    // Initialize WebSocket manager if enabled
    if (this.config.enableWebSocket) {
      this.initializeWebSocket()
    }
  }

  // ============================================================================
  // Axios Instance Creation
  // ============================================================================

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': `exercism-web-app/${process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}`
      },
      // Enable automatic JSON parsing
      transformResponse: [
        (data) => {
          try {
            return typeof data === 'string' ? JSON.parse(data) : data
          } catch {
            return data
          }
        }
      ]
    })

    return instance
  }

  // ============================================================================
  // Request/Response Interceptors
  // ============================================================================

  private setupInterceptors(): void {
    // Request interceptor for authentication and correlation IDs
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Add correlation ID for request tracing
        const correlationId = createCorrelationId()
        config.headers['X-Correlation-ID'] = correlationId
        config.metadata = { ...config.metadata, correlationId }

        // Inject JWT token from auth service
        try {
          const accessToken = await integratedTokenManager.getValidAccessToken()
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
          }
        } catch (error) {
          console.warn('Failed to get access token for content service request:', error)
          // Continue without token - let the server handle authentication errors
        }

        // Add request timestamp for performance monitoring
        config.metadata = {
          ...config.metadata,
          requestStartTime: Date.now()
        }

        // Log request in development
        if (this.config.enableRequestLogging) {
          console.log(`[ContentService] ${config.method?.toUpperCase()} ${config.url}`, {
            correlationId: config.metadata?.correlationId,
            headers: this.sanitizeHeaders(config.headers)
          })
        }

        return config
      },
      (error) => {
        console.error('[ContentService] Request interceptor error:', error)
        return Promise.reject(this.transformError(error))
      }
    )

    // Response interceptor for error handling and logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.requestStartTime || 0)
        const operation = `${response.config.method?.toUpperCase()} ${response.config.url}`
        
        // Log successful response in development
        if (this.config.enableRequestLogging) {
          console.log(`[ContentService] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            correlationId: response.config.metadata?.correlationId,
            duration: `${duration}ms`,
            dataSize: JSON.stringify(response.data).length
          })
        }

        // Update metrics on success
        this.updateMetrics(duration, true)

        // Record performance metrics
        if (this.config.enableMetrics) {
          performanceMonitor.recordRequest(operation, duration, true, {
            correlationId: response.config.metadata?.correlationId,
            responseSize: JSON.stringify(response.data).length
          })
        }

        return response
      },
      async (error: AxiosError) => {
        const duration = Date.now() - (error.config?.metadata?.requestStartTime || 0)
        const operation = `${error.config?.method?.toUpperCase()} ${error.config?.url}`
        
        // Log error response
        if (this.config.enableRequestLogging) {
          console.error(`[ContentService] ${error.response?.status || 'ERROR'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            correlationId: error.config?.metadata?.correlationId,
            duration: `${duration}ms`,
            error: error.message
          })
        }

        // Update metrics on failure
        this.updateMetrics(duration, false, error)

        // Use comprehensive error handling
        const errorContext: { url?: string; method?: string; correlationId?: string } = {}
        if (error.config?.url) errorContext.url = error.config.url
        if (error.config?.method) errorContext.method = error.config.method
        if (error.config?.metadata?.correlationId) errorContext.correlationId = error.config.metadata.correlationId
        
        const errorReport = ErrorHandler.handleApiError(error, errorContext)

        // Record performance and error metrics
        if (this.config.enableMetrics) {
          performanceMonitor.recordRequest(operation, duration, false, {
            errorType: errorReport.error.type,
            correlationId: error.config?.metadata?.correlationId
          })

          errorMonitor.recordError(errorReport.error, operation, {
            correlationId: error.config?.metadata?.correlationId,
            url: error.config?.url,
            requestId: error.config?.metadata?.correlationId
          })
        }

        // Log error details if enabled
        if (this.config.enableRequestLogging) {
          console.error(`[ContentService] ${errorReport.technicalMessage}`)
          console.log(`[ContentService] User message: ${errorReport.userMessage}`)
          console.log(`[ContentService] Recovery strategy: ${errorReport.recoveryStrategy.type}`)
        }

        // Check if we should retry the request
        if (this.shouldRetry(error, error.config?.metadata?.retryCount || 0)) {
          return this.retryRequest(error)
        }

        return Promise.reject(errorReport.error)
      }
    )
  }

  // ============================================================================
  // Error Handling and Transformation
  // ============================================================================

  private createServiceError(
    message: string,
    options: {
      type?: ContentServiceErrorType
      code?: string
      correlationId?: string
      retryAfter?: number
      statusCode?: number
      field?: string
      constraints?: string[]
      resource?: string
      resourceId?: string
      cause?: string
    } = {}
  ): ContentServiceError {
    const error = new Error(message) as ContentServiceError
    error.name = 'ContentServiceError'
    error.type = options.type || 'unknown'
    if (options.code !== undefined) error.code = options.code
    if (options.statusCode !== undefined) error.statusCode = options.statusCode
    if (options.correlationId !== undefined) error.correlationId = options.correlationId
    if (options.retryAfter !== undefined) error.retryAfter = options.retryAfter
    if (options.field !== undefined) error.field = options.field
    if (options.constraints !== undefined) error.constraints = options.constraints
    if (options.resource !== undefined) error.resource = options.resource
    if (options.resourceId !== undefined) error.resourceId = options.resourceId
    if (options.cause !== undefined) error.cause = options.cause
    return error
  }

  private transformError(error: unknown): ContentServiceError {
    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiResponse>

      // Network errors (no response received)
      if (!axiosError.response) {
        const options: Record<string, unknown> = {
          type: 'network',
          code: axiosError.code || 'NETWORK_ERROR',
          retryAfter: this.calculateRetryDelay(0)
        }
        const correlationId = axiosError.config?.metadata?.correlationId
        if (correlationId) options.correlationId = correlationId

        return this.createServiceError(
          this.getNetworkErrorMessage(axiosError),
          options as Parameters<typeof this.createServiceError>[1]
        )
      }

      // HTTP error responses
      const response = axiosError.response
      const responseData = response.data

      // Extract error information from response
      if (responseData && typeof responseData === 'object' && 'error' in responseData) {
        const errorType = this.classifyHttpError(response.status)
        const correlationId = axiosError.config?.metadata?.correlationId
        const retryAfter = this.getRetryAfterFromHeaders(response.headers)
        return this.createServiceError(
          responseData.error?.message || (responseData as { message?: string }).message || axiosError.message,
          {
            type: errorType,
            code: responseData.error?.code || `HTTP_${response.status}`,
            ...(correlationId !== undefined && { correlationId }),
            ...(retryAfter !== undefined && { retryAfter }),
            statusCode: response.status
          }
        )
      }

      // Fallback for HTTP errors without structured error response
      const errorType = this.classifyHttpError(response.status)
      const correlationId = axiosError.config?.metadata?.correlationId
      const retryAfter = this.getRetryAfterFromHeaders(response.headers)
      return this.createServiceError(
        this.getHttpErrorMessage(response.status, axiosError.message),
        {
          type: errorType,
          code: `HTTP_${response.status}`,
          ...(correlationId !== undefined && { correlationId }),
          ...(retryAfter !== undefined && { retryAfter }),
          statusCode: response.status
        }
      )
    }

    // Handle other types of errors
    if (error instanceof Error) {
      return this.createServiceError(
        error.message,
        {
          type: 'server',
          code: 'UNKNOWN_ERROR'
        }
      )
    }

    // Fallback for unknown errors
    return this.createServiceError(
      'An unknown error occurred',
      {
        type: 'server',
        code: 'UNKNOWN_ERROR'
      }
    )
  }

  private classifyHttpError(statusCode: number): ContentServiceErrorType {
    if (statusCode >= 400 && statusCode < 500) {
      if (statusCode === 401) return 'authentication'
      if (statusCode === 403) return 'authorization'
      if (statusCode === 404) return 'not_found'
      if (statusCode === 408) return 'timeout'
      if (statusCode === 409) return 'conflict'
      if (statusCode === 422) return 'validation'
      if (statusCode === 429) return 'rate_limit'
      return 'validation'
    }

    if (statusCode >= 500) {
      if (statusCode === 503) return 'service_unavailable'
      return 'server'
    }

    return 'network'
  }

  private getNetworkErrorMessage(error: AxiosError): string {
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please check your connection and try again.'
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return 'Unable to connect to content service. Please try again later.'
    }
    
    if (error.code === 'ECONNRESET') {
      return 'Connection was reset. Please try again.'
    }

    return error.message || 'Network error occurred. Please check your connection.'
  }

  private getHttpErrorMessage(statusCode: number, fallbackMessage: string): string {
    const errorMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input and try again.',
      401: 'Authentication required. Please sign in and try again.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      408: 'Request timeout. Please try again.',
      409: 'Conflict occurred. The resource may have been modified.',
      422: 'Invalid data provided. Please check your input.',
      429: 'Too many requests. Please wait a moment and try again.',
      500: 'Internal server error. Please try again later.',
      502: 'Service temporarily unavailable. Please try again later.',
      503: 'Service temporarily unavailable. Please try again later.',
      504: 'Request timeout. Please try again later.'
    }

    return errorMessages[statusCode] || fallbackMessage || 'An error occurred. Please try again.'
  }

  private getRetryAfterFromHeaders(headers: Record<string, unknown>): number | undefined {
    const retryAfter = headers['retry-after'] || headers['Retry-After']
    
    if (typeof retryAfter === 'string') {
      const seconds = parseInt(retryAfter, 10)
      return isNaN(seconds) ? undefined : seconds
    }
    
    if (typeof retryAfter === 'number') {
      return retryAfter
    }

    return undefined
  }

  // ============================================================================
  // Retry Logic with Exponential Backoff
  // ============================================================================

  private shouldRetry(error: AxiosError, retryCount: number): boolean {
    // Don't retry if we've exceeded the maximum attempts
    if (retryCount >= this.retryConfig.attempts) {
      return false
    }

    // Don't retry if it's not an Axios error
    if (!axios.isAxiosError(error)) {
      return false
    }

    // Don't retry if circuit breaker is open
    if (this.circuitBreaker.getState() === CircuitBreakerState.OPEN) {
      return false
    }

    // Check if this error should trigger circuit breaker
    if (isCircuitBreakerError(error)) {
      // Let circuit breaker handle this error, but still allow retry if circuit is closed
      if (this.circuitBreaker.getState() === CircuitBreakerState.CLOSED) {
        // Check for retryable network errors
        if (!error.response && error.code) {
          return this.retryConfig.retryableErrorTypes.includes(error.code)
        }

        // Check for retryable HTTP status codes
        if (error.response) {
          return this.retryConfig.retryableStatusCodes.includes(error.response.status)
        }
      }
    }

    return false
  }

  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const config = error.config!
    const retryCount = (config.metadata?.retryCount || 0) + 1
    const delay = this.calculateRetryDelay(retryCount)

    // Update retry metadata
    config.metadata = {
      ...config.metadata,
      retryCount
    }

    // Log retry attempt
    if (this.config.enableRequestLogging) {
      console.log(`[ContentService] Retrying request (attempt ${retryCount}/${this.retryConfig.attempts}) after ${delay}ms`, {
        correlationId: config.metadata?.correlationId,
        url: config.url,
        error: error.message
      })
    }

    // Wait for the calculated delay
    await this.delay(delay)

    // Retry the request
    return this.axiosInstance.request(config)
  }

  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.retryConfig.delay
    const backoffDelay = baseDelay * Math.pow(this.retryConfig.backoffFactor, retryCount - 1)
    const jitteredDelay = backoffDelay + (Math.random() * 1000) // Add jitter
    
    return Math.min(jitteredDelay, this.retryConfig.maxDelay)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ============================================================================
  // Content Helper Methods
  // ============================================================================

  /**
   * Generates a URL-friendly slug from a title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  }

  /**
   * Increments a semantic version string
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.')
    if (parts.length !== 3) return '1.0.1'
    
    const major = parseInt(parts[0] || '1', 10)
    const minor = parseInt(parts[1] || '0', 10)
    const patchNum = parseInt(parts[2] || '0', 10)
    
    if (isNaN(major) || isNaN(minor) || isNaN(patchNum)) return '1.0.1'
    
    return `${major}.${minor}.${patchNum + 1}`
  }

  /**
   * Invalidates cache entries for a specific content item
   */
  private async invalidateContentCache(itemId: string): Promise<void> {
    try {
      // This would integrate with the caching layer to invalidate specific cache keys
      // For now, we'll just log the cache invalidation
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Invalidating cache for content item: ${itemId}`)
      }
      
      // TODO: Implement actual cache invalidation when cache integration is complete
      // This might involve calling cache.invalidate() or similar methods
    } catch (error) {
      // Cache invalidation failures should not break the main operation
      console.warn(`[ContentService] Failed to invalidate cache for item ${itemId}:`, error)
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...headers }
    
    // Remove sensitive headers from logs
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]'
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]'
      }
    })

    return sanitized
  }

  private extractResponseData<T>(response: AxiosResponse<ApiResponse<T>>): T {
    const responseData = response.data

    // Handle direct data responses (non-wrapped)
    if (!responseData || typeof responseData !== 'object' || !('success' in responseData)) {
      return responseData as T
    }

    // Handle wrapped API responses
    if (responseData.success && responseData.data !== undefined) {
      return responseData.data
    }

    // Handle error responses
    if (!responseData.success && responseData.error) {
      throw responseData.error
    }

    // Fallback to raw response data
    return responseData as T
  }

  // ============================================================================
  // Metrics and Monitoring
  // ============================================================================

  private initializeMetrics(): ClientMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorsByType: {},
      lastResetTime: new Date(),
    }
  }

  private updateMetrics(responseTime: number, success: boolean, error?: unknown): void {
    if (!this.config.enableMetrics) return

    this.metrics.totalRequests++

    // Update response time (rolling average)
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) /
      this.metrics.totalRequests

    if (success) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++

      if (error && typeof error === 'object' && 'type' in error) {
        const errorType = (error as ContentServiceError).type
        if (errorType) {
          this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1
        }
      }
    }
  }

  private startMetricsCollection(): void {
    // Reset metrics every hour
    this.metricsTimer = setInterval(() => {
      this.metrics = this.initializeMetrics()
    }, 3600000)
  }

  // ============================================================================
  // HTTP Methods with Circuit Breaker and Graceful Degradation
  // ============================================================================

  private async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const cacheKey = `get_${url}_${JSON.stringify(config?.params || {})}`
    
    const result = await this.degradationManager.executeWithDegradation(
      () => this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.get<ApiResponse<T>>(url, config)
        return this.extractResponseData(response)
      }),
      cacheKey,
      'contentRead'
    )

    if (result.data === null) {
      throw this.createServiceError('No data available', {
        type: 'service_unavailable',
        code: 'NO_DATA'
      })
    }

    return result.data
  }

  private async _post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const cacheKey = `post_${url}_${Date.now()}`
    
    const result = await this.degradationManager.executeWithDegradation(
      () => this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config)
        return this.extractResponseData(response)
      }),
      cacheKey,
      'contentWrite'
    )

    if (result.data === null) {
      throw this.createServiceError('No data available', {
        type: 'service_unavailable',
        code: 'NO_DATA'
      })
    }

    return result.data
  }

  private async _patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const cacheKey = `patch_${url}_${Date.now()}`
    
    const result = await this.degradationManager.executeWithDegradation(
      () => this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config)
        return this.extractResponseData(response)
      }),
      cacheKey,
      'contentWrite'
    )

    if (result.data === null) {
      throw this.createServiceError('No data available', {
        type: 'service_unavailable',
        code: 'NO_DATA'
      })
    }

    return result.data
  }

  private async _delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const cacheKey = `delete_${url}_${Date.now()}`
    
    const result = await this.degradationManager.executeWithDegradation(
      () => this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config)
        return this.extractResponseData(response)
      }),
      cacheKey,
      'contentWrite'
    )

    if (result.data === null) {
      throw this.createServiceError('No data available', {
        type: 'service_unavailable',
        code: 'NO_DATA'
      })
    }

    return result.data
  }

  // ============================================================================
  // Content CRUD Operations
  // ============================================================================

  /**
   * Creates a new content item with validation
   * Requirements: 1.1, 1.3, 6.3
   */
  async createContentItem(data: CreateItemDto): Promise<ContentItem> {
    // Validate required fields
    if (!data.title?.trim()) {
      throw this.createServiceError('Content title is required', {
        type: 'validation',
        code: 'MISSING_TITLE',
        field: 'title',
        constraints: ['required', 'non-empty']
      })
    }

    if (!data.content?.body?.trim()) {
      throw this.createServiceError('Content body is required', {
        type: 'validation',
        code: 'MISSING_CONTENT',
        field: 'content.body',
        constraints: ['required', 'non-empty']
      })
    }

    if (!data.type) {
      throw this.createServiceError('Content type is required', {
        type: 'validation',
        code: 'MISSING_TYPE',
        field: 'type',
        constraints: ['required']
      })
    }

    try {
      // Generate slug if not provided
      const requestData = {
        ...data,
        slug: data.slug || this.generateSlug(data.title),
        status: data.status || 'draft' as WorkflowStatus,
        metadata: {
          version: '1.0.0',
          ...data.metadata
        }
      }

      const result = await this._post<ContentItem>('/content/items', requestData)
      
      // Log successful creation
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Created content item: ${result.id} - ${result.title}`)
      }

      return result
    } catch (error) {
      // Handle validation errors specifically
      if (error instanceof Error && error.message.includes('validation')) {
        throw this.createServiceError(error.message, {
          type: 'validation',
          code: 'VALIDATION_FAILED',
          constraints: ['validation_failed']
        })
      }
      throw error
    }
  }

  /**
   * Updates an existing content item with optimistic updates
   * Requirements: 1.3, 6.3
   */
  async updateContentItem(id: string, data: UpdateItemDto): Promise<ContentItem> {
    if (!id?.trim()) {
      throw this.createServiceError('Content item ID is required', {
        type: 'validation',
        code: 'MISSING_ID',
        field: 'id',
        constraints: ['required', 'non-empty']
      })
    }

    // Validate that at least one field is being updated
    const hasUpdates = Object.keys(data).some(key => 
      data[key as keyof UpdateItemDto] !== undefined && 
      data[key as keyof UpdateItemDto] !== null
    )

    if (!hasUpdates) {
      throw this.createServiceError('At least one field must be provided for update', {
        type: 'validation',
        code: 'NO_UPDATES',
        constraints: ['at_least_one_field_required']
      })
    }

    try {
      // Prepare update data with version increment
      const updateData = {
        ...data,
        metadata: data.metadata ? {
          ...data.metadata,
          version: this.incrementVersion(data.metadata.version || '1.0.0')
        } : undefined
      }

      const result = await this._patch<ContentItem>(`/content/items/${id}`, updateData)
      
      // Log successful update
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Updated content item: ${result.id} - ${result.title}`)
      }

      return result
    } catch (error) {
      // Handle specific error cases
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw this.createServiceError(`Content item with ID ${id} not found`, {
          type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          resource: 'content_item',
          resourceId: id
        })
      }

      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const conflictError = new ConflictError(
          'Content item was modified by another user. Please refresh and try again.'
        )
        conflictError.cause = 'concurrent_modification'
        throw conflictError
      }

      throw error
    }
  }

  /**
   * Retrieves content items with pagination and filtering
   * Requirements: 1.2, 1.4
   */
  async getContentItems(params?: QueryItemsDto): Promise<PaginatedResult<ContentItem>> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams()
      
      if (params?.page) queryParams.set('page', params.page.toString())
      if (params?.limit) queryParams.set('limit', params.limit.toString())
      if (params?.type) {
        if (Array.isArray(params.type)) {
          params.type.forEach(type => queryParams.append('type', type))
        } else {
          queryParams.set('type', params.type)
        }
      }
      if (params?.status) {
        if (Array.isArray(params.status)) {
          params.status.forEach(status => queryParams.append('status', status))
        } else {
          queryParams.set('status', params.status)
        }
      }
      if (params?.tags?.length) {
        params.tags.forEach(tag => queryParams.append('tags', tag))
      }
      if (params?.search) queryParams.set('search', params.search)
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder)
      if (params?.createdBy) queryParams.set('createdBy', params.createdBy)
      if (params?.updatedAfter) queryParams.set('updatedAfter', params.updatedAfter.toISOString())
      if (params?.updatedBefore) queryParams.set('updatedBefore', params.updatedBefore.toISOString())
      if (params?.includeArchived) queryParams.set('includeArchived', params.includeArchived.toString())

      const queryString = queryParams.toString()
      const url = queryString ? `/content/items?${queryString}` : '/content/items'
      
      const result = await this.get<PaginatedResult<ContentItem>>(url)
      
      // Log successful retrieval
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Retrieved ${result.items.length} content items (page ${result.page}/${result.totalPages})`)
      }

      return result
    } catch (error) {
      // Handle specific error cases
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        throw this.createServiceError('Invalid query parameters provided', {
          type: 'validation',
          code: 'INVALID_QUERY_PARAMS',
          constraints: ['valid_query_parameters']
        })
      }

      throw error
    }
  }

  /**
   * Retrieves a single content item by ID
   * Requirements: 1.2, 1.4
   */
  async getContentItem(id: string): Promise<ContentItem> {
    if (!id?.trim()) {
      const error: ContentServiceError = {
        name: 'ContentServiceError',
        type: 'validation',
        code: 'MISSING_ID',
        message: 'Content item ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const result = await this.get<ContentItem>(`/content/items/${id}`)
      
      // Log successful retrieval
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Retrieved content item: ${result.id} - ${result.title}`)
      }

      return result
    } catch (error) {
      // Handle specific error cases
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
          type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with ID ${id} not found`,
          resource: 'content_item',
          resourceId: id
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Retrieves a content item by slug
   * Requirements: 1.2, 1.4
   */
  async getContentItemBySlug(slug: string): Promise<ContentItem> {
    if (!slug?.trim()) {
      const error: ContentServiceError = {
        name: 'ContentServiceError',
        type: 'validation',
        code: 'MISSING_SLUG',
        message: 'Content item slug is required',
        field: 'slug',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const result = await this.get<ContentItem>(`/content/items/by-slug/${slug}`)
      
      // Log successful retrieval
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Retrieved content item by slug: ${result.slug} - ${result.title}`)
      }

      return result
    } catch (error) {
      // Handle specific error cases
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
          type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with slug '${slug}' not found`,
          resource: 'content_item'
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Deletes a content item with soft deletion support
   * Requirements: 1.4
   */
  async deleteContentItem(id: string, options?: { permanent?: boolean; reason?: string }): Promise<void> {
    if (!id?.trim()) {
      const error: ContentServiceError = {
        name: 'ContentServiceError',
        type: 'validation',
        code: 'MISSING_ID',
        message: 'Content item ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      // Prepare deletion request
      const deleteData = {
        permanent: options?.permanent || false,
        reason: options?.reason
      }

      // Use appropriate endpoint based on deletion type
      if (options?.permanent) {
        await this._delete<void>(`/content/items/${id}?permanent=true`, {
          data: deleteData
        })
      } else {
        // Soft delete by updating status to archived
        await this._patch<void>(`/content/items/${id}`, {
          status: 'archived' as WorkflowStatus,
          archivedAt: new Date(),
          archiveReason: options?.reason
        })
      }
      
      // Log successful deletion
      if (this.config.enableRequestLogging) {
        const deletionType = options?.permanent ? 'permanently deleted' : 'archived'
        console.log(`[ContentService] Content item ${deletionType}: ${id}`)
      }

      // Invalidate cache for this item if caching is enabled
      if (this.config.enableCaching) {
        await this.invalidateContentCache(id)
      }

    } catch (error) {
      // Handle specific error cases
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
          type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with ID ${id} not found`,
          resource: 'content_item',
          resourceId: id
        }
        throw notFoundError
      }

      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const authError = new AuthorizationError('You do not have permission to delete this content item')
        authError.cause = 'operation_forbidden'
        throw authError
      }

      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const conflictError = new ConflictError('Content item cannot be deleted due to existing dependencies or workflow state')
        conflictError.cause = 'workflow_violation'
        throw conflictError
      }

      throw error
    }
  }

  // ============================================================================
  // Media Operations
  // ============================================================================

  /**
   * Uploads media with multipart form data support, client-side optimization, and chunked uploads for large files
   * Requirements: 3.1, 3.3, 3.4, 3.5
   */
  async uploadMedia(itemId: string, file: File, metadata?: Partial<UploadMediaDto>): Promise<MediaAsset> {
    if (!itemId?.trim()) {
      const error: ContentServiceError = {
        name: 'ContentServiceError',
        type: 'validation',
        code: 'MISSING_ITEM_ID',
        message: 'Content item ID is required for media upload',
        field: 'itemId',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    if (!file) {
      const error: ContentServiceError = {
        name: 'ContentServiceError',
        type: 'validation',
        code: 'MISSING_FILE',
        message: 'File is required for media upload',
        field: 'file',
        constraints: ['required']
      }
      throw error
    }

    // Validate file using utility function
    const validation = validateFile(file)
    if (!validation.isValid) {
      const error: ContentServiceError = {
        name: 'ContentServiceError',
        type: 'validation',
        code: 'FILE_VALIDATION_FAILED',
        message: validation.errors.join('; '),
        field: 'file',
        constraints: validation.errors
      }
      throw error
    }

    // Log validation warnings
    if (validation.warnings.length > 0 && this.config.enableRequestLogging) {
      console.warn('[ContentService] File validation warnings:', validation.warnings)
    }

    try {
      let processedFile = file

      // Apply client-side optimization for images if enabled
      if (metadata?.optimize !== false && file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
        try {
          const originalSize = file.size
          processedFile = await optimizeImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.8
          })

          if (this.config.enableRequestLogging) {
            const compressionRatio = ((originalSize - processedFile.size) / originalSize * 100).toFixed(1)
            console.log(`[ContentService] Image optimized: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(processedFile.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reduction)`)
          }
        } catch (optimizationError) {
          // If optimization fails, continue with original file
          console.warn('[ContentService] Image optimization failed, using original file:', optimizationError)
          processedFile = file
        }
      }

      // Prepare enhanced metadata
      const enhancedMetadata: Partial<UploadMediaDto> = {
        ...metadata,
        filename: processedFile.name,
        mimeType: processedFile.type,
        size: processedFile.size,
        metadata: {
          ...metadata?.metadata
        }
      }

      // Determine if we need chunked upload (files > 10MB)
      const chunkThreshold = 10 * 1024 * 1024 // 10MB
      
      if (processedFile.size > chunkThreshold) {
        return await this.uploadMediaChunked(itemId, processedFile, enhancedMetadata)
      } else {
        return await this.uploadMediaDirect(itemId, processedFile, enhancedMetadata)
      }
    } catch (error) {
      // Handle specific upload errors
      if (axios.isAxiosError(error) && error.response?.status === 413) {
        const payloadError: ContentServiceError = {
          name: 'ContentServiceError',
          type: 'validation',
          code: 'PAYLOAD_TOO_LARGE',
          message: 'File is too large for upload',
          constraints: ['max_file_size']
        }
        throw payloadError
      }

      if (axios.isAxiosError(error) && error.response?.status === 415) {
        const mediaTypeError: ContentServiceError = {
          name: 'ContentServiceError',
          type: 'validation',
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'File type is not supported',
          constraints: ['allowed_file_types']
        }
        throw mediaTypeError
      }

      throw error
    }
  }

  /**
   * Direct upload for smaller files
   */
  private async uploadMediaDirect(itemId: string, file: File, metadata?: Partial<UploadMediaDto>): Promise<MediaAsset> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('filename', file.name)
    formData.append('mimeType', file.type)
    formData.append('size', file.size.toString())

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }

    const result = await this._post<MediaAsset>(`/content/items/${itemId}/media`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000, // 5 minutes for upload
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          if (this.config.enableRequestLogging) {
            console.log(`[ContentService] Upload progress: ${progress}%`)
          }
        }
      }
    })

    if (this.config.enableRequestLogging) {
      console.log(`[ContentService] Uploaded media asset: ${result.id} - ${result.filename}`)
    }

    return result
  }

  /**
   * Chunked upload for larger files with progress tracking
   */
  private async uploadMediaChunked(itemId: string, file: File, metadata?: Partial<UploadMediaDto>): Promise<MediaAsset> {
    const chunkSize = 5 * 1024 * 1024 // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize)
    
    // Initialize chunked upload
    const initResponse = await this._post<{ uploadId: string }>(`/content/items/${itemId}/media/chunked/init`, {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      totalChunks,
      chunkSize,
      metadata
    })

    const uploadId = initResponse.uploadId

    try {
      // Upload chunks sequentially
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        const chunk = file.slice(start, end)

        const chunkFormData = new FormData()
        chunkFormData.append('chunk', chunk)
        chunkFormData.append('uploadId', uploadId)
        chunkFormData.append('chunkIndex', chunkIndex.toString())
        chunkFormData.append('totalChunks', totalChunks.toString())

        await this._post(`/content/items/${itemId}/media/chunked/upload`, chunkFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 120000, // 2 minutes per chunk
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const chunkProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              const overallProgress = Math.round(((chunkIndex + (chunkProgress / 100)) * 100) / totalChunks)
              
              if (this.config.enableRequestLogging) {
                console.log(`[ContentService] Chunk ${chunkIndex + 1}/${totalChunks} progress: ${chunkProgress}% (Overall: ${overallProgress}%)`)
              }
            }
          }
        })
      }

      // Complete the chunked upload
      const result = await this._post<MediaAsset>(`/content/items/${itemId}/media/chunked/complete`, {
        uploadId
      })

      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Completed chunked upload: ${result.id} - ${result.filename}`)
      }

      return result
    } catch (error) {
      // Cancel the upload on error
      try {
        await this._post(`/content/items/${itemId}/media/chunked/cancel`, { uploadId })
      } catch (cancelError) {
        console.warn('[ContentService] Failed to cancel chunked upload:', cancelError)
      }
      throw error
    }
  }

  /**
   * Retrieves media asset metadata
   * Requirements: 3.2
   */
  async getMediaAsset(id: string): Promise<MediaAsset> {
    if (!id?.trim()) {
      const error: ContentServiceError = {
        name: 'ContentServiceError',
        type: 'validation',
        code: 'MISSING_ID',
        message: 'Media asset ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const result = await this.get<MediaAsset>(`/content/media/${id}`)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Retrieved media asset: ${result.id} - ${result.filename}`)
      }

      return result
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'MEDIA_NOT_FOUND',
          message: `Media asset with ID ${id} not found`,
          resource: 'media_asset',
          resourceId: id
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Generates signed URL for secure media access
   * Requirements: 3.2
   */
  async getMediaSignedUrl(id: string, options?: SignedUrlOptions): Promise<string> {
    if (!id?.trim()) {
      const error: ContentServiceError = {
        name: 'ContentServiceError',
        type: 'validation',
        code: 'MISSING_ID',
        message: 'Media asset ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const queryParams = new URLSearchParams()
      
      if (options?.expiresIn) queryParams.set('expiresIn', options.expiresIn.toString())
      if (options?.download) queryParams.set('download', 'true')
      if (options?.filename) queryParams.set('filename', options.filename)

      const queryString = queryParams.toString()
      const url = queryString ? `/content/media/${id}/signed-url?${queryString}` : `/content/media/${id}/signed-url`
      
      const response = await this.get<{ url: string; expiresAt: string }>(url)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Generated signed URL for media asset: ${id}`)
      }

      return response.url
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'MEDIA_NOT_FOUND',
          message: `Media asset with ID ${id} not found`,
          resource: 'media_asset',
          resourceId: id
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Lists media assets for a content item
   * Requirements: 3.2
   */
  async getMediaAssets(itemId: string): Promise<MediaAsset[]> {
    if (!itemId?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ITEM_ID',
        message: 'Content item ID is required',
        field: 'itemId',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const result = await this.get<MediaAsset[]>(`/content/items/${itemId}/media`)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Retrieved ${result.length} media assets for item: ${itemId}`)
      }

      return result
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with ID ${itemId} not found`,
          resource: 'content_item',
          resourceId: itemId
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Deletes a media asset
   * Requirements: 3.1
   */
  async deleteMediaAsset(id: string): Promise<void> {
    if (!id?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ID',
        message: 'Media asset ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      await this._delete<void>(`/content/media/${id}`)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Deleted media asset: ${id}`)
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'MEDIA_NOT_FOUND',
          message: `Media asset with ID ${id} not found`,
          resource: 'media_asset',
          resourceId: id
        }
        throw notFoundError
      }

      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const authError: AuthorizationError = {

          name: 'AuthorizationError',

          statusCode: 403,

          type: 'authorization',
          code: 'DELETE_FORBIDDEN',
          message: 'You do not have permission to delete this media asset',
          cause: 'operation_forbidden'
        }
        throw authError
      }

      throw error
    }
  }

  // ============================================================================
  // Search Operations
  // ============================================================================

  /**
   * Performs full-text search with debounced queries, caching, and pagination
   * Requirements: 4.1, 4.4
   */
  async searchContent(request: SearchRequestDto): Promise<SearchResult[]> {
    if (!request.query?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_QUERY',
        message: 'Search query is required',
        field: 'query',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      // Build query parameters for GET request
      const queryParams = new URLSearchParams()
      queryParams.set('q', request.query)
      
      // Add pagination options
      if (request.options?.page) queryParams.set('page', request.options.page.toString())
      if (request.options?.limit) queryParams.set('limit', request.options.limit.toString())
      if (request.options?.sortBy) queryParams.set('sortBy', request.options.sortBy)
      if (request.options?.sortOrder) queryParams.set('sortOrder', request.options.sortOrder)
      
      // Add search options
      if (request.options?.includeHighlights) queryParams.set('includeHighlights', 'true')
      if (request.options?.includeFacets) queryParams.set('includeFacets', 'true')
      if (request.options?.facetFields?.length) {
        request.options.facetFields.forEach(field => queryParams.append('facetFields', field))
      }

      // Add filters
      if (request.filters?.types?.length) {
        request.filters.types.forEach(type => queryParams.append('types', type))
      }
      if (request.filters?.statuses?.length) {
        request.filters.statuses.forEach(status => queryParams.append('statuses', status))
      }
      if (request.filters?.tags?.length) {
        request.filters.tags.forEach(tag => queryParams.append('tags', tag))
      }
      if (request.filters?.authors?.length) {
        request.filters.authors.forEach(author => queryParams.append('authors', author))
      }
      if (request.filters?.difficulty?.length) {
        request.filters.difficulty.forEach(level => queryParams.append('difficulty', level))
      }
      if (request.filters?.topics?.length) {
        request.filters.topics.forEach(topic => queryParams.append('topics', topic))
      }
      if (request.filters?.language) {
        queryParams.set('language', request.filters.language)
      }
      if (request.filters?.dateRange) {
        queryParams.set('dateStart', request.filters.dateRange.start.toISOString())
        queryParams.set('dateEnd', request.filters.dateRange.end.toISOString())
      }

      const url = `/search?${queryParams.toString()}`
      const response = await this.get<{ results: SearchResult[]; total: number; queryTime: number }>(url)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Search completed: ${response.results.length} results in ${response.queryTime}ms for query: "${request.query}"`)
      }

      return response.results
    } catch (error) {
      // Handle specific search errors
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const validationError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'validation',
          code: 'INVALID_SEARCH_QUERY',
          message: 'Invalid search query or parameters',
          constraints: ['valid_search_syntax']
        }
        throw validationError
      }

      throw error
    }
  }

  /**
   * Provides autocomplete suggestions for real-time search
   * Requirements: 4.2
   */
  async getSearchSuggestions(query: string, options?: { limit?: number; types?: string[] }): Promise<SearchSuggestion[]> {
    if (!query?.trim()) {
      return [] // Return empty array for empty queries instead of error
    }

    // Don't make requests for very short queries
    if (query.trim().length < 2) {
      return []
    }

    try {
      const queryParams = new URLSearchParams()
      queryParams.set('q', query)
      
      if (options?.limit) queryParams.set('limit', options.limit.toString())
      if (options?.types?.length) {
        options.types.forEach(type => queryParams.append('types', type))
      }

      const url = `/search/suggestions?${queryParams.toString()}`
      const suggestions = await this.get<SearchSuggestion[]>(url)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Retrieved ${suggestions.length} suggestions for query: "${query}"`)
      }

      return suggestions
    } catch (error) {
      // Log error but don't throw - suggestions should fail gracefully
      if (this.config.enableRequestLogging) {
        console.warn(`[ContentService] Failed to get suggestions for query "${query}":`, error)
      }
      return []
    }
  }

  /**
   * Implements faceted search with multiple filter types
   * Requirements: 4.3
   */
  async searchFaceted(request: FacetedSearchDto): Promise<{ results: SearchResult[]; facets: Record<string, Array<{ value: string; count: number }>> }> {
    if (!request.facets || Object.keys(request.facets).length === 0) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_FACETS',
        message: 'At least one facet must be specified',
        field: 'facets',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      // Use POST for faceted search to handle complex filter combinations
      const requestData = {
        query: request.query || '',
        facets: request.facets,
        options: request.options || {}
      }

      const response = await this._post<{
        results: SearchResult[]
        facets: Record<string, Array<{ value: string; count: number }>>
        total: number
        queryTime: number
      }>('/search/faceted', requestData)
      
      if (this.config.enableRequestLogging) {
        const facetCount = Object.keys(request.facets).length
        console.log(`[ContentService] Faceted search completed: ${response.results.length} results with ${facetCount} facets in ${response.queryTime}ms`)
      }

      return {
        results: response.results,
        facets: response.facets
      }
    } catch (error) {
      // Handle specific faceted search errors
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const validationError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'validation',
          code: 'INVALID_FACET_QUERY',
          message: 'Invalid facet configuration or query',
          constraints: ['valid_facet_syntax']
        }
        throw validationError
      }

      throw error
    }
  }

  /**
   * Provides personalized recommendations based on user behavior and preferences
   * Requirements: 4.5
   */
  async getRecommendations(userId: string, type?: RecommendationType, options?: { limit?: number; excludeViewed?: boolean }): Promise<Recommendation[]> {
    if (!userId?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_USER_ID',
        message: 'User ID is required for recommendations',
        field: 'userId',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const queryParams = new URLSearchParams()
      queryParams.set('userId', userId)
      
      if (type) queryParams.set('type', type)
      if (options?.limit) queryParams.set('limit', options.limit.toString())
      if (options?.excludeViewed) queryParams.set('excludeViewed', 'true')

      const url = `/search/recommendations/personalized?${queryParams.toString()}`
      const recommendations = await this.get<Recommendation[]>(url)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Retrieved ${recommendations.length} ${type || 'mixed'} recommendations for user: ${userId}`)
      }

      return recommendations
    } catch (error) {
      // Handle specific recommendation errors
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'USER_NOT_FOUND',
          message: `User with ID ${userId} not found`,
          resource: 'user',
          resourceId: userId
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Gets similar content recommendations based on a specific content item
   * Requirements: 4.5
   */
  async getSimilarContent(itemId: string, options?: { limit?: number; includeMetadata?: boolean }): Promise<Recommendation[]> {
    if (!itemId?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ITEM_ID',
        message: 'Content item ID is required for similar content recommendations',
        field: 'itemId',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const queryParams = new URLSearchParams()
      if (options?.limit) queryParams.set('limit', options.limit.toString())
      if (options?.includeMetadata) queryParams.set('includeMetadata', 'true')

      const queryString = queryParams.toString()
      const url = queryString ? `/search/recommendations/similar/${itemId}?${queryString}` : `/search/recommendations/similar/${itemId}`
      
      const recommendations = await this.get<Recommendation[]>(url)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Retrieved ${recommendations.length} similar content recommendations for item: ${itemId}`)
      }

      return recommendations
    } catch (error) {
      // Handle specific similar content errors
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with ID ${itemId} not found`,
          resource: 'content_item',
          resourceId: itemId
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Gets trending content based on popularity and engagement metrics
   * Requirements: 4.5
   */
  async getTrendingContent(options?: { 
    timeframe?: 'day' | 'week' | 'month' | 'year'
    limit?: number
    types?: ContentType[]
    topics?: string[]
  }): Promise<Recommendation[]> {
    try {
      const queryParams = new URLSearchParams()
      
      if (options?.timeframe) queryParams.set('timeframe', options.timeframe)
      if (options?.limit) queryParams.set('limit', options.limit.toString())
      if (options?.types?.length) {
        options.types.forEach(type => queryParams.append('types', type))
      }
      if (options?.topics?.length) {
        options.topics.forEach(topic => queryParams.append('topics', topic))
      }

      const queryString = queryParams.toString()
      const url = queryString ? `/search/recommendations/trending?${queryString}` : '/search/recommendations/trending'
      
      const recommendations = await this.get<Recommendation[]>(url)
      
      if (this.config.enableRequestLogging) {
        const timeframe = options?.timeframe || 'all-time'
        console.log(`[ContentService] Retrieved ${recommendations.length} trending content recommendations for timeframe: ${timeframe}`)
      }

      return recommendations
    } catch (error) {
      // Trending content should fail gracefully
      if (this.config.enableRequestLogging) {
        console.warn('[ContentService] Failed to get trending content:', error)
      }
      return []
    }
  }

  // ============================================================================
  // Workflow Operations
  // ============================================================================

  /**
   * Submits content for review with validation
   * Requirements: 5.1
   */
  async submitForReview(id: string, data?: SubmitForReviewDto): Promise<ContentItem> {
    if (!id?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ID',
        message: 'Content item ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const requestData = {
        notes: data?.notes,
        reviewers: data?.reviewers || [],
        priority: data?.priority || 'normal',
        dueDate: data?.dueDate?.toISOString()
      }

      const result = await this._post<ContentItem>(`/content/items/${id}/submit-for-review`, requestData)
      
      // Log successful submission
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Submitted content for review: ${result.id} - ${result.title}`)
      }

      // Invalidate workflow-related caches
      if (this.config.enableCaching) {
        await this.invalidateContentCache(id)
      }

      return result
    } catch (error) {
      // Handle specific workflow errors
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with ID ${id} not found`,
          resource: 'content_item',
          resourceId: id
        }
        throw notFoundError
      }

      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const conflictError: ConflictError = {

          name: 'ConflictError',

          statusCode: 409,

          type: 'conflict',
          code: 'WORKFLOW_CONFLICT',
          message: 'Content item is not in a state that allows review submission',
          cause: 'workflow_violation'
        }
        throw conflictError
      }

      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const authError: AuthorizationError = {

          name: 'AuthorizationError',

          statusCode: 403,

          type: 'authorization',
          code: 'SUBMIT_REVIEW_FORBIDDEN',
          message: 'You do not have permission to submit this content for review',
          cause: 'operation_forbidden'
        }
        throw authError
      }

      throw error
    }
  }

  /**
   * Reviews content with approval or rejection
   * Requirements: 5.2
   */
  async reviewContent(id: string, data: ReviewItemDto): Promise<ContentItem> {
    if (!id?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ID',
        message: 'Content item ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    if (!data.decision) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_DECISION',
        message: 'Review decision is required',
        field: 'decision',
        constraints: ['required']
      }
      throw error
    }

    try {
      const requestData = {
        decision: data.decision,
        comments: data.comments,
        feedback: data.feedback || [],
        suggestedChanges: data.suggestedChanges || [],
        reviewerNotes: data.reviewerNotes
      }

      const result = await this._post<ContentItem>(`/content/items/${id}/review`, requestData)
      
      // Log successful review
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Reviewed content: ${result.id} - ${data.decision} - ${result.title}`)
      }

      // Invalidate workflow-related caches
      if (this.config.enableCaching) {
        await this.invalidateContentCache(id)
      }

      return result
    } catch (error) {
      // Handle specific review errors
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with ID ${id} not found`,
          resource: 'content_item',
          resourceId: id
        }
        throw notFoundError
      }

      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const conflictError: ConflictError = {

          name: 'ConflictError',

          statusCode: 409,

          type: 'conflict',
          code: 'REVIEW_CONFLICT',
          message: 'Content item is not in a reviewable state or has already been reviewed',
          cause: 'workflow_violation'
        }
        throw conflictError
      }

      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const authError: AuthorizationError = {

          name: 'AuthorizationError',

          statusCode: 403,

          type: 'authorization',
          code: 'REVIEW_FORBIDDEN',
          message: 'You do not have permission to review this content item',
          cause: 'operation_forbidden'
        }
        throw authError
      }

      throw error
    }
  }

  /**
   * Retrieves workflow history for audit trails
   * Requirements: 5.3
   */
  async getWorkflowHistory(id: string): Promise<WorkflowTransition[]> {
    if (!id?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ID',
        message: 'Content item ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const result = await this.get<WorkflowTransition[]>(`/content/items/${id}/workflow-history`)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Retrieved workflow history: ${result.length} transitions for item ${id}`)
      }

      return result
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with ID ${id} not found`,
          resource: 'content_item',
          resourceId: id
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Publishes content with final validation and optional scheduling
   * Requirements: 5.4
   */
  async publishContent(id: string, data?: PublishItemDto): Promise<ContentItem> {
    if (!id?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ID',
        message: 'Content item ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const requestData = {
        publishAt: data?.publishAt?.toISOString(),
        publishNotes: data?.publishNotes,
        notifySubscribers: data?.notifySubscribers !== false, // Default to true
        skipFinalValidation: data?.skipFinalValidation || false
      }

      const result = await this._post<ContentItem>(`/content/items/${id}/publish`, requestData)
      
      // Log successful publication
      if (this.config.enableRequestLogging) {
        const publishTime = data?.publishAt ? `scheduled for ${data.publishAt.toISOString()}` : 'immediately'
        console.log(`[ContentService] Published content ${publishTime}: ${result.id} - ${result.title}`)
      }

      // Invalidate workflow-related caches
      if (this.config.enableCaching) {
        await this.invalidateContentCache(id)
      }

      return result
    } catch (error) {
      // Handle specific publishing errors
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with ID ${id} not found`,
          resource: 'content_item',
          resourceId: id
        }
        throw notFoundError
      }

      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const conflictError: ConflictError = {

          name: 'ConflictError',

          statusCode: 409,

          type: 'conflict',
          code: 'PUBLISH_CONFLICT',
          message: 'Content item is not in a publishable state or validation failed',
          cause: 'workflow_violation'
        }
        throw conflictError
      }

      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const authError: AuthorizationError = {

          name: 'AuthorizationError',

          statusCode: 403,

          type: 'authorization',
          code: 'PUBLISH_FORBIDDEN',
          message: 'You do not have permission to publish this content item',
          cause: 'operation_forbidden'
        }
        throw authError
      }

      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const validationError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'validation',
          code: 'PUBLISH_VALIDATION_FAILED',
          message: 'Content validation failed. Please review and fix issues before publishing.',
          constraints: ['content_validation']
        }
        throw validationError
      }

      throw error
    }
  }

  /**
   * Archives content item
   * Requirements: 5.4
   */
  async archiveContent(id: string, data?: { reason?: string; archiveDate?: Date }): Promise<ContentItem> {
    if (!id?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ID',
        message: 'Content item ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const requestData = {
        reason: data?.reason,
        archiveDate: data?.archiveDate?.toISOString() || new Date().toISOString()
      }

      const result = await this._post<ContentItem>(`/content/items/${id}/archive`, requestData)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Archived content: ${result.id} - ${result.title}`)
      }

      // Invalidate workflow-related caches
      if (this.config.enableCaching) {
        await this.invalidateContentCache(id)
      }

      return result
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with ID ${id} not found`,
          resource: 'content_item',
          resourceId: id
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Restores archived content item
   * Requirements: 5.4
   */
  async restoreContent(id: string, data?: { restoreToStatus?: WorkflowStatus; notes?: string }): Promise<ContentItem> {
    if (!id?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ID',
        message: 'Content item ID is required',
        field: 'id',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const requestData = {
        restoreToStatus: data?.restoreToStatus || 'draft',
        notes: data?.notes
      }

      const result = await this._post<ContentItem>(`/content/items/${id}/restore`, requestData)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Restored content: ${result.id} - ${result.title}`)
      }

      // Invalidate workflow-related caches
      if (this.config.enableCaching) {
        await this.invalidateContentCache(id)
      }

      return result
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'CONTENT_NOT_FOUND',
          message: `Content item with ID ${id} not found`,
          resource: 'content_item',
          resourceId: id
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Performs bulk workflow operations
   * Requirements: 5.5
   */
  async bulkWorkflowOperation(data: BulkWorkflowDto): Promise<BulkOperation> {
    if (!data.itemIds?.length) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ITEM_IDS',
        message: 'At least one content item ID is required',
        field: 'itemIds',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    if (!data.action) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_ACTION',
        message: 'Workflow action is required',
        field: 'action',
        constraints: ['required']
      }
      throw error
    }

    try {
      const requestData = {
        itemIds: data.itemIds,
        action: data.action,
        reviewData: data.reviewData,
        publishData: data.publishData,
        notes: data.notes
      }

      const result = await this._post<BulkOperation>('/content/items/bulk-workflow', requestData)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Started bulk workflow operation: ${result.id} - ${data.action} on ${data.itemIds.length} items`)
      }

      return result
    } catch (error) {
      // Handle specific bulk workflow errors
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const validationError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'validation',
          code: 'INVALID_BULK_WORKFLOW',
          message: 'Invalid bulk workflow operation parameters',
          constraints: ['valid_bulk_parameters']
        }
        throw validationError
      }

      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const authError: AuthorizationError = {

          name: 'AuthorizationError',

          statusCode: 403,

          type: 'authorization',
          code: 'BULK_WORKFLOW_FORBIDDEN',
          message: 'You do not have permission to perform bulk workflow operations',
          cause: 'operation_forbidden'
        }
        throw authError
      }

      throw error
    }
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Initiates bulk import with CSV parsing, validation, and progress tracking
   * Requirements: 8.1, 8.2
   */
  async bulkImport(data: BulkImportRequestDto): Promise<BulkImportResultDto> {
    // Validate required fields
    if (!data.format) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_FORMAT',
        message: 'Import format is required',
        field: 'format',
        constraints: ['required']
      }
      throw error
    }

    if (!data.data) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_DATA',
        message: 'Import data is required',
        field: 'data',
        constraints: ['required']
      }
      throw error
    }

    // Validate format
    const supportedFormats = ['csv', 'json', 'xlsx']
    if (!supportedFormats.includes(data.format)) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'UNSUPPORTED_FORMAT',
        message: `Unsupported import format: ${data.format}. Supported formats: ${supportedFormats.join(', ')}`,
        field: 'format',
        constraints: ['supported_format']
      }
      throw error
    }

    try {
      // Prepare import request
      const importRequest = {
        format: data.format,
        data: data.data,
        options: {
          skipValidation: data.options?.skipValidation || false,
          updateExisting: data.options?.updateExisting || false,
          defaultStatus: data.options?.defaultStatus || 'draft',
          defaultType: data.options?.defaultType || 'lesson',
          batchSize: data.options?.batchSize || 100,
          ...data.options
        }
      }

      const result = await this._post<BulkImportResultDto>('/content/bulk/import', importRequest)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Started bulk import: ${result.operationId} - ${result.totalItems} items`)
      }

      return result
    } catch (error) {
      // Handle specific import errors
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const validationError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'validation',
          code: 'IMPORT_VALIDATION_FAILED',
          message: 'Import data validation failed',
          constraints: ['valid_import_data']
        }
        throw validationError
      }

      if (axios.isAxiosError(error) && error.response?.status === 413) {
        const payloadError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'validation',
          code: 'IMPORT_TOO_LARGE',
          message: 'Import data is too large',
          constraints: ['max_import_size']
        }
        throw payloadError
      }

      throw error
    }
  }

  /**
   * Previews CSV import data before actual import
   * Requirements: 8.2
   */
  async previewCsvImport(csvData: string, options?: { limit?: number }): Promise<{ 
    preview: ContentItem[]
    totalRows: number
    validRows: number
    errors: Array<{ row: number; field: string; error: string }>
  }> {
    if (!csvData?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_CSV_DATA',
        message: 'CSV data is required for preview',
        field: 'csvData',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const requestData = {
        csvData,
        options: {
          limit: options?.limit || 10,
          validateOnly: true
        }
      }

      const result = await this._post<{
        preview: ContentItem[]
        totalRows: number
        validRows: number
        errors: Array<{ row: number; field: string; error: string }>
      }>('/content/bulk/import/csv/preview', requestData)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] CSV preview: ${result.validRows}/${result.totalRows} valid rows, ${result.errors.length} errors`)
      }

      return result
    } catch (error) {
      // Handle CSV parsing errors
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const parseError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'validation',
          code: 'CSV_PARSE_ERROR',
          message: 'Failed to parse CSV data',
          constraints: ['valid_csv_format']
        }
        throw parseError
      }

      throw error
    }
  }

  /**
   * Initiates bulk export with format options and job tracking
   * Requirements: 8.3, 8.4
   */
  async bulkExport(data: BulkExportRequestDto): Promise<BulkExportResultDto> {
    // Validate required fields
    if (!data.format) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_FORMAT',
        message: 'Export format is required',
        field: 'format',
        constraints: ['required']
      }
      throw error
    }

    // Validate format
    const supportedFormats = ['csv', 'json', 'xlsx']
    if (!supportedFormats.includes(data.format)) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'UNSUPPORTED_FORMAT',
        message: `Unsupported export format: ${data.format}. Supported formats: ${supportedFormats.join(', ')}`,
        field: 'format',
        constraints: ['supported_format']
      }
      throw error
    }

    try {
      // Prepare export request
      const exportRequest = {
        filters: data.filters || {},
        format: data.format,
        fields: data.fields || [],
        includeMedia: data.includeMedia || false,
        compression: data.compression || 'none'
      }

      const result = await this._post<BulkExportResultDto>('/content/bulk/export', exportRequest)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Started bulk export: ${result.operationId} - ${data.format} format`)
      }

      return result
    } catch (error) {
      // Handle specific export errors
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const validationError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'validation',
          code: 'EXPORT_VALIDATION_FAILED',
          message: 'Export parameters validation failed',
          constraints: ['valid_export_parameters']
        }
        throw validationError
      }

      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const authError: AuthorizationError = {

          name: 'AuthorizationError',

          statusCode: 403,

          type: 'authorization',
          code: 'EXPORT_FORBIDDEN',
          message: 'You do not have permission to export content',
          cause: 'operation_forbidden'
        }
        throw authError
      }

      throw error
    }
  }

  /**
   * Polls bulk operation status with job tracking and progress monitoring
   * Requirements: 8.4, 8.5
   */
  async getBulkOperationStatus(jobId: string): Promise<BulkOperation> {
    if (!jobId?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_JOB_ID',
        message: 'Job ID is required',
        field: 'jobId',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      const result = await this.get<BulkOperation>(`/content/bulk/operations/${jobId}`)
      
      if (this.config.enableRequestLogging) {
        const progress = result.totalItems > 0 ? Math.round((result.processedItems / result.totalItems) * 100) : 0
        console.log(`[ContentService] Bulk operation ${jobId}: ${result.status} (${progress}% - ${result.processedItems}/${result.totalItems})`)
      }

      return result
    } catch (error) {
      // Handle specific status errors
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'JOB_NOT_FOUND',
          message: `Bulk operation with ID ${jobId} not found`,
          resource: 'bulk_operation',
          resourceId: jobId
        }
        throw notFoundError
      }

      throw error
    }
  }

  /**
   * Polls bulk operation status until completion with configurable intervals
   * Requirements: 8.4, 8.5
   */
  async pollBulkOperationUntilComplete(
    jobId: string, 
    options?: { 
      pollInterval?: number
      maxAttempts?: number
      onProgress?: (operation: BulkOperation) => void
    }
  ): Promise<BulkOperation> {
    const pollInterval = options?.pollInterval || 2000 // 2 seconds
    const maxAttempts = options?.maxAttempts || 150 // 5 minutes max
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const operation = await this.getBulkOperationStatus(jobId)
        
        // Call progress callback if provided
        if (options?.onProgress) {
          options.onProgress(operation)
        }

        // Check if operation is complete
        if (['completed', 'failed', 'cancelled'].includes(operation.status)) {
          return operation
        }

        // Wait before next poll
        await this.delay(pollInterval)
        attempts++
      } catch (error) {
        // If job not found, it might have been cleaned up after completion
        if (error && typeof error === 'object' && 'type' in error && (error as ContentServiceError).type === 'not_found') {
          throw error
        }

        // For other errors, retry a few times before giving up
        attempts++
        if (attempts >= 3) {
          throw error
        }
        
        await this.delay(pollInterval)
      }
    }

    // Timeout reached
    throw new TimeoutError(
      `Bulk operation polling timed out after ${maxAttempts} attempts`,
      {
        maxAttempts,
        pollInterval,
        jobId
      }
    )
  }

  /**
   * Cancels a running bulk operation
   * Requirements: 8.5
   */
  async cancelBulkOperation(jobId: string, reason?: string): Promise<void> {
    if (!jobId?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_JOB_ID',
        message: 'Job ID is required',
        field: 'jobId',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      await this._post<void>(`/content/bulk/operations/${jobId}/cancel`, {
        reason: reason || 'Cancelled by user'
      })
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Cancelled bulk operation: ${jobId}`)
      }
    } catch (error) {
      // Handle specific cancellation errors
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'JOB_NOT_FOUND',
          message: `Bulk operation with ID ${jobId} not found`,
          resource: 'bulk_operation',
          resourceId: jobId
        }
        throw notFoundError
      }

      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const conflictError: ConflictError = {

          name: 'ConflictError',

          statusCode: 409,

          type: 'conflict',
          code: 'CANCELLATION_CONFLICT',
          message: 'Bulk operation cannot be cancelled in its current state',
          cause: 'workflow_violation'
        }
        throw conflictError
      }

      throw error
    }
  }

  /**
   * Downloads the result file from a completed export operation
   * Requirements: 8.4
   */
  async downloadExportResult(jobId: string): Promise<{ blob: Blob; filename: string }> {
    if (!jobId?.trim()) {
      const error: ContentServiceError = {

        name: 'ContentServiceError',

        type: 'validation',
        code: 'MISSING_JOB_ID',
        message: 'Job ID is required',
        field: 'jobId',
        constraints: ['required', 'non-empty']
      }
      throw error
    }

    try {
      // First get the operation status to check if it's completed and get download URL
      const operation = await this.getBulkOperationStatus(jobId)
      
      if (operation.status !== 'completed') {
        const error: ContentServiceError = {

          name: 'ContentServiceError',

          type: 'validation',
          code: 'EXPORT_NOT_READY',
          message: 'Export operation is not completed yet',
          constraints: ['operation_completed']
        }
        throw error
      }

      // Get download URL
      const downloadResponse = await this.get<{ downloadUrl: string; filename: string }>(`/content/bulk/operations/${jobId}/download`)
      
      // Download the file
      const fileResponse = await this.axiosInstance.get(downloadResponse.downloadUrl, {
        responseType: 'blob'
      })

      const blob = new Blob([fileResponse.data])
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Downloaded export result: ${downloadResponse.filename} (${blob.size} bytes)`)
      }

      return {
        blob,
        filename: downloadResponse.filename
      }
    } catch (error) {
      // Handle specific download errors
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const notFoundError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'not_found',
          code: 'EXPORT_FILE_NOT_FOUND',
          message: 'Export file not found or has expired',
          resource: 'export_file',
          resourceId: jobId
        }
        throw notFoundError
      }

      if (axios.isAxiosError(error) && error.response?.status === 410) {
        const expiredError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'validation',
          code: 'EXPORT_FILE_EXPIRED',
          message: 'Export file has expired and is no longer available',
          constraints: ['file_not_expired']
        }
        throw expiredError
      }

      throw error
    }
  }

  /**
   * Lists all bulk operations for the current user with filtering and pagination
   * Requirements: 8.5
   */
  async listBulkOperations(options?: {
    type?: BulkOperationType
    status?: BulkOperationStatus
    page?: number
    limit?: number
    sortBy?: 'createdAt' | 'completedAt' | 'type'
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResult<BulkOperation>> {
    try {
      const queryParams = new URLSearchParams()
      
      if (options?.type) queryParams.set('type', options.type)
      if (options?.status) queryParams.set('status', options.status)
      if (options?.page) queryParams.set('page', options.page.toString())
      if (options?.limit) queryParams.set('limit', options.limit.toString())
      if (options?.sortBy) queryParams.set('sortBy', options.sortBy)
      if (options?.sortOrder) queryParams.set('sortOrder', options.sortOrder)

      const queryString = queryParams.toString()
      const url = queryString ? `/content/bulk/operations?${queryString}` : '/content/bulk/operations'
      
      const result = await this.get<PaginatedResult<BulkOperation>>(url)
      
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Listed ${result.items.length} bulk operations (page ${result.page}/${result.totalPages})`)
      }

      return result
    } catch (error) {
      // Handle specific listing errors
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const validationError: ContentServiceError = {
          name: 'ContentServiceError',
                     type: 'validation',
          code: 'INVALID_LIST_PARAMS',
          message: 'Invalid bulk operations list parameters',
          constraints: ['valid_list_parameters']
        }
        throw validationError
      }

      throw error
    }
  }

  // ============================================================================
  // Configuration and Utility Methods
  // ============================================================================

  getConfig(): ContentServiceClientConfig {
    return { ...this.config }
  }

  getMetrics(): ClientMetrics {
    return { ...this.metrics }
  }

  resetMetrics(): void {
    this.metrics = this.initializeMetrics()
  }

  updateBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL
    this.axiosInstance.defaults.baseURL = baseURL
  }

  updateTimeout(timeout: number): void {
    this.config.timeout = timeout
    this.axiosInstance.defaults.timeout = timeout
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.get('/health')
      return true
    } catch {
      return false
    }
  }

  // ============================================================================
  // Circuit Breaker and Resilience Methods
  // ============================================================================

  /**
   * Gets circuit breaker state
   */
  getCircuitBreakerState() {
    return this.circuitBreaker.getState()
  }

  /**
   * Gets circuit breaker metrics
   */
  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics()
  }

  /**
   * Gets service health status
   */
  getServiceHealth() {
    return this.degradationManager.getServiceHealth()
  }

  /**
   * Checks if a feature is available
   */
  isFeatureAvailable(feature: 'contentRead' | 'contentWrite' | 'mediaUpload' | 'search' | 'bulkOperations' | 'realTimeUpdates') {
    return this.degradationManager.isFeatureAvailable(feature)
  }

  /**
   * Gets offline queue status
   */
  getOfflineQueueStatus() {
    return this.degradationManager.getOfflineQueueStatus()
  }

  /**
   * Manually resets circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset()
  }

  /**
   * Clears degradation cache
   */
  clearDegradationCache(): void {
    this.degradationManager.clearCache()
  }

  /**
   * Processes offline queue manually
   */
  async processOfflineQueue(): Promise<void> {
    await this.degradationManager.processOfflineQueue()
  }

  /**
   * Adds health status listener
   */
  addHealthListener(listener: (health: ReturnType<GracefulDegradationManager['getServiceHealth']>) => void): () => void {
    return this.degradationManager.addHealthListener(listener)
  }

  /**
   * Gets error statistics
   */
  getErrorStats() {
    return ErrorHandler.getErrorStats()
  }

  /**
   * Resets error tracking
   */
  resetErrorTracking(errorType?: string): void {
    ErrorHandler.resetErrorTracking(errorType)
  }

  // ============================================================================
  // WebSocket Integration Methods
  // ============================================================================

  /**
   * Initializes WebSocket manager for real-time updates
   * Requirements: 9.1, 9.5
   */
  private initializeWebSocket(): void {
    if (!this.config.enableWebSocket) return

    try {
      this.webSocketManager = createWebSocketManager({
        url: this.config.baseURL?.replace(/^http/, 'ws') + '/ws',
        enableLogging: this.config.enableRequestLogging,
        enableCacheIntegration: this.config.enableCaching,
        enablePresence: true,
        enableCollaboration: true
      })

      // Set up WebSocket event handlers
      this.setupWebSocketEventHandlers()

      // Auto-connect if client is configured to do so
      if (this.config.enableWebSocket) {
        this.webSocketManager.connect().catch(error => {
          if (this.config.enableRequestLogging) {
            console.warn('[ContentService] WebSocket auto-connect failed:', error)
          }
        })
      }

    } catch (error) {
      if (this.config.enableRequestLogging) {
        console.warn('[ContentService] Failed to initialize WebSocket:', error)
      }
    }
  }

  /**
   * Sets up WebSocket event handlers for cache integration
   * Requirements: 9.2, 9.4
   */
  private setupWebSocketEventHandlers(): void {
    if (!this.webSocketManager) return

    // Handle cache invalidation events
    this.webSocketManager.on('cache_invalidated', (event) => {
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Cache invalidated via WebSocket: ${event.keys.length} keys`)
      }
    })

    // Handle conflict resolution
    this.webSocketManager.on('conflict_resolved', (resolution) => {
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] Conflict resolved: ${resolution.conflictType} for ${resolution.itemId}`)
      }
    })

    // Handle connection status changes
    this.webSocketManager.on('connection_status_changed', (connected) => {
      if (this.config.enableRequestLogging) {
        console.log(`[ContentService] WebSocket ${connected ? 'connected' : 'disconnected'}`)
      }
    })
  }

  /**
   * Subscribes to real-time updates for a content item
   * Requirements: 9.1, 9.2, 9.3
   */
  subscribeToContentUpdates(itemId: string, options?: {
    includePresence?: boolean
    includeCollaboration?: boolean
  }): string[] {
    if (!this.webSocketManager) {
      if (this.config.enableRequestLogging) {
        console.warn('[ContentService] WebSocket not initialized, cannot subscribe to updates')
      }
      return []
    }

    return this.webSocketManager.subscribeToItem(itemId, options)
  }

  /**
   * Unsubscribes from real-time updates for a content item
   */
  unsubscribeFromContentUpdates(itemId: string): void {
    if (!this.webSocketManager) return
    this.webSocketManager.unsubscribeFromItem(itemId)
  }

  /**
   * Updates user presence for an item
   * Requirements: 9.3
   */
  updateUserPresence(itemId: string, status: 'active' | 'idle' | 'away'): void {
    if (!this.webSocketManager) return
    this.webSocketManager.updatePresence(itemId, status)
  }

  /**
   * Sends cursor position for real-time collaboration
   * Requirements: 9.3
   */
  sendCursorPosition(itemId: string, position: { line: number; column: number }): void {
    if (!this.webSocketManager) return
    this.webSocketManager.sendCursorPosition(itemId, position)
  }

  /**
   * Sends text selection for real-time collaboration
   * Requirements: 9.3
   */
  sendTextSelection(itemId: string, selection: { start: number; end: number; text: string }): void {
    if (!this.webSocketManager) return
    this.webSocketManager.sendTextSelection(itemId, selection)
  }

  /**
   * Gets active users for an item
   * Requirements: 9.3
   */
  getActiveUsers(itemId: string) {
    if (!this.webSocketManager) return []
    return this.webSocketManager.getActiveUsers(itemId)
  }

  /**
   * Gets collaboration session for an item
   * Requirements: 9.3
   */
  getCollaborationSession(itemId: string) {
    if (!this.webSocketManager) return undefined
    return this.webSocketManager.getCollaborationSession(itemId)
  }

  /**
   * Checks if WebSocket is connected
   * Requirements: 9.5
   */
  isWebSocketConnected(): boolean {
    return this.webSocketManager?.isConnected() || false
  }

  /**
   * Gets WebSocket connection statistics
   */
  getWebSocketStats() {
    return this.webSocketManager?.getConnectionStats()
  }

  /**
   * Manually connects WebSocket
   * Requirements: 9.5
   */
  async connectWebSocket(): Promise<void> {
    if (!this.webSocketManager) {
      this.initializeWebSocket()
    }
    
    if (this.webSocketManager) {
      await this.webSocketManager.connect()
    }
  }

  /**
   * Manually disconnects WebSocket
   */
  disconnectWebSocket(): void {
    if (this.webSocketManager) {
      this.webSocketManager.disconnect()
    }
  }

  cleanup(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = undefined
    }
    
    // Cleanup WebSocket manager
    if (this.webSocketManager) {
      this.webSocketManager.destroy()
      this.webSocketManager = null
    }
    
    // Cleanup degradation manager
    this.degradationManager.destroy()
  }
}