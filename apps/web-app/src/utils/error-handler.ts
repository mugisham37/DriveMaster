/**
 * Content Service Error Handler
 * 
 * Comprehensive error classification, recovery strategies, and user-friendly messaging
 * Requirements: 7.2, 7.5
 */

import type { 
  ContentServiceError, 
  ContentServiceErrorType,
  NetworkError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError
} from '@/types'

// ============================================================================
// Error Classification
// ============================================================================

export interface ErrorClassification {
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'user' | 'system' | 'network' | 'service'
  recoverable: boolean
  retryable: boolean
  userActionRequired: boolean
  escalationRequired: boolean
}

export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'redirect' | 'manual' | 'ignore'
  maxAttempts?: number
  delay?: number
  backoffFactor?: number
  fallbackAction?: () => Promise<unknown>
  redirectUrl?: string
  userMessage?: string
}

export interface ErrorReport {
  error: ContentServiceError
  classification: ErrorClassification
  recoveryStrategy: RecoveryStrategy
  userMessage: string
  technicalMessage: string
  actionItems: string[]
  correlationId?: string
  context?: Record<string, unknown>
}

// ============================================================================
// Error Handler Class
// ============================================================================

export class ErrorHandler {
  private static errorCounts = new Map<string, number>()
  private static lastErrorTimes = new Map<string, Date>()
  private static recoveryAttempts = new Map<string, number>()

  /**
   * Handles and classifies API errors with comprehensive recovery strategies
   */
  static handleApiError(error: unknown, context?: Record<string, unknown>): ErrorReport {
    const contentError = this.normalizeError(error)
    const classification = this.classifyError(contentError)
    const recoveryStrategy = this.determineRecoveryStrategy(contentError, classification)
    const userMessage = this.generateUserMessage(contentError, classification)
    const technicalMessage = this.generateTechnicalMessage(contentError)
    const actionItems = this.generateActionItems(contentError, classification)

    // Track error for patterns and escalation
    this.trackError(contentError)

    const report: ErrorReport = {
      error: contentError,
      classification,
      recoveryStrategy,
      userMessage,
      technicalMessage,
      actionItems
    }

    if (contentError.correlationId) {
      report.correlationId = contentError.correlationId
    }

    if (context) {
      report.context = context
    }

    return report
  }

  /**
   * Normalizes various error types into ContentServiceError
   */
  private static normalizeError(error: unknown): ContentServiceError {
    // Already a ContentServiceError
    if (error && typeof error === 'object' && 'type' in error && 'timestamp' in error) {
      return error as ContentServiceError
    }

    // Axios error
    if (error && typeof error === 'object' && 'isAxiosError' in error) {
      return this.transformAxiosError(error as unknown)
    }

    // Standard Error
    if (error instanceof Error) {
      return {
        type: 'server',
        message: error.message,
        code: 'UNKNOWN_ERROR',
        recoverable: false,
        timestamp: new Date()
      }
    }

    // Unknown error
    return {
      type: 'server',
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
      recoverable: false,
      timestamp: new Date()
    }
  }

  /**
   * Transforms Axios errors to ContentServiceError
   */
  private static transformAxiosError(_axiosError: Record<string, unknown>): ContentServiceError {
    // Simple fallback transformation
    const message = (_axiosError.message as string) || 'Request failed'
    const code = (_axiosError.code as string) || 'REQUEST_ERROR'
    
    return {
      type: 'network',
      message,
      code,
      recoverable: true,
      timestamp: new Date()
    }
  }

  /**
   * Classifies errors by severity and category
   */
  private static classifyError(error: ContentServiceError): ErrorClassification {
    const errorType = error.type

    switch (errorType) {
      case 'network':
        return {
          severity: 'medium',
          category: 'network',
          recoverable: true,
          retryable: true,
          userActionRequired: false,
          escalationRequired: false
        }

      case 'authentication':
        return {
          severity: 'medium',
          category: 'user',
          recoverable: true,
          retryable: false,
          userActionRequired: true,
          escalationRequired: false
        }

      case 'authorization':
        return {
          severity: 'medium',
          category: 'user',
          recoverable: false,
          retryable: false,
          userActionRequired: true,
          escalationRequired: false
        }

      case 'validation':
        return {
          severity: 'low',
          category: 'user',
          recoverable: true,
          retryable: false,
          userActionRequired: true,
          escalationRequired: false
        }

      case 'not_found':
        return {
          severity: 'low',
          category: 'user',
          recoverable: false,
          retryable: false,
          userActionRequired: true,
          escalationRequired: false
        }

      case 'conflict':
        return {
          severity: 'medium',
          category: 'user',
          recoverable: true,
          retryable: true,
          userActionRequired: true,
          escalationRequired: false
        }

      case 'timeout':
        return {
          severity: 'medium',
          category: 'network',
          recoverable: true,
          retryable: true,
          userActionRequired: false,
          escalationRequired: false
        }

      case 'rate_limit':
        return {
          severity: 'medium',
          category: 'system',
          recoverable: true,
          retryable: true,
          userActionRequired: false,
          escalationRequired: false
        }

      case 'service_unavailable':
        return {
          severity: 'high',
          category: 'service',
          recoverable: true,
          retryable: true,
          userActionRequired: false,
          escalationRequired: true
        }

      case 'server':
      default:
        return {
          severity: 'high',
          category: 'system',
          recoverable: false,
          retryable: false,
          userActionRequired: false,
          escalationRequired: true
        }
    }
  }

  /**
   * Determines appropriate recovery strategy
   */
  private static determineRecoveryStrategy(error: ContentServiceError, _classification: ErrorClassification): RecoveryStrategy {
    const errorKey = `${error.type}_${error.code}`
    const attemptCount = this.recoveryAttempts.get(errorKey) || 0

    switch (error.type) {
      case 'network':
      case 'timeout':
        return {
          type: 'retry',
          maxAttempts: 3,
          delay: this.calculateRetryDelay(attemptCount),
          backoffFactor: 2,
          userMessage: 'Retrying connection...'
        }

      case 'authentication':
        return {
          type: 'redirect',
          redirectUrl: '/login',
          userMessage: 'Please sign in to continue'
        }

      case 'authorization':
        return {
          type: 'manual',
          userMessage: 'Contact your administrator for access'
        }

      case 'validation':
        return {
          type: 'manual',
          userMessage: 'Please correct the highlighted fields and try again'
        }

      case 'not_found':
        return {
          type: 'manual',
          userMessage: 'The requested resource was not found'
        }

      case 'conflict':
        return {
          type: 'retry',
          maxAttempts: 2,
          delay: 1000,
          userMessage: 'Refreshing data and retrying...'
        }

      case 'rate_limit':
        const rateLimitError = error as RateLimitError
        return {
          type: 'retry',
          maxAttempts: 1,
          delay: Math.max(1000, (rateLimitError.resetTime.getTime() - Date.now())),
          userMessage: 'Rate limit exceeded. Waiting to retry...'
        }

      case 'service_unavailable':
        const serviceError = error as ServiceUnavailableError
        const estimatedDelay = serviceError.estimatedRecoveryTime 
          ? Math.max(5000, serviceError.estimatedRecoveryTime.getTime() - Date.now())
          : 30000

        return {
          type: 'retry',
          maxAttempts: 2,
          delay: estimatedDelay,
          userMessage: 'Service temporarily unavailable. Retrying...'
        }

      case 'server':
      default:
        return {
          type: 'manual',
          userMessage: 'An unexpected error occurred. Please try again later.'
        }
    }
  }

  /**
   * Generates user-friendly error messages
   */
  private static generateUserMessage(error: ContentServiceError, _classification: ErrorClassification): string {
    const baseMessages: Record<ContentServiceErrorType, string> = {
      network: 'Connection problem. Please check your internet connection and try again.',
      authentication: 'Your session has expired. Please sign in again.',
      authorization: 'You don\'t have permission to perform this action.',
      validation: 'Please check your input and try again.',
      not_found: 'The requested item could not be found.',
      conflict: 'This item was modified by someone else. Please refresh and try again.',
      timeout: 'The request took too long. Please try again.',
      rate_limit: 'Too many requests. Please wait a moment and try again.',
      service_unavailable: 'The service is temporarily unavailable. Please try again later.',
      server: 'An unexpected error occurred. Please try again later.'
    }

    let message = baseMessages[error.type] || baseMessages.server

    // Add specific context for certain errors
    if (error.type === 'validation' && 'field' in error && error.field) {
      message = `Please check the ${error.field} field and try again.`
    }

    if (error.type === 'not_found' && 'resource' in error) {
      const resourceName = ((error as NotFoundError).resource || 'resource').replace('_', ' ')
      message = `The requested ${resourceName} could not be found.`
    }

    if (error.type === 'rate_limit' && 'resetTime' in error) {
      const resetTime = (error as RateLimitError).resetTime
      const waitTime = Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      if (waitTime > 0) {
        message = `Rate limit exceeded. Please wait ${waitTime} seconds and try again.`
      }
    }

    return message
  }

  /**
   * Generates technical error messages for debugging
   */
  private static generateTechnicalMessage(error: ContentServiceError): string {
    const parts = [
      `Type: ${error.type}`,
      `Code: ${error.code || 'N/A'}`,
      `Message: ${error.message}`,
      `Timestamp: ${error.timestamp.toISOString()}`
    ]

    if (error.correlationId) {
      parts.push(`Correlation ID: ${error.correlationId}`)
    }

    if ('cause' in error && error.cause) {
      parts.push(`Cause: ${error.cause}`)
    }

    return parts.join(' | ')
  }

  /**
   * Generates actionable items for error resolution
   */
  private static generateActionItems(error: ContentServiceError, _classification: ErrorClassification): string[] {
    const actions: string[] = []

    switch (error.type) {
      case 'network':
        actions.push('Check your internet connection')
        actions.push('Try refreshing the page')
        actions.push('Contact support if the problem persists')
        break

      case 'authentication':
        actions.push('Sign in again')
        actions.push('Clear browser cache and cookies')
        actions.push('Contact support if you continue having trouble')
        break

      case 'authorization':
        actions.push('Contact your administrator for access')
        actions.push('Verify you have the correct permissions')
        break

      case 'validation':
        if ('field' in error && error.field) {
          actions.push(`Check the ${error.field} field`)
        }
        if ('constraints' in error && error.constraints) {
          actions.push(...(error.constraints as string[]).map((c: string) => `Ensure ${c}`))
        }
        actions.push('Review all required fields')
        break

      case 'not_found':
        actions.push('Verify the item exists')
        actions.push('Check the URL or search again')
        actions.push('Contact support if you believe this is an error')
        break

      case 'conflict':
        actions.push('Refresh the page to get the latest data')
        actions.push('Try your action again')
        actions.push('Contact the other user if needed')
        break

      case 'timeout':
        actions.push('Try again with a smaller request')
        actions.push('Check your internet connection')
        actions.push('Contact support if timeouts persist')
        break

      case 'rate_limit':
        actions.push('Wait a moment before trying again')
        actions.push('Reduce the frequency of your requests')
        break

      case 'service_unavailable':
        actions.push('Wait a few minutes and try again')
        actions.push('Check the service status page')
        actions.push('Contact support if the issue persists')
        break

      case 'server':
      default:
        actions.push('Try again in a few minutes')
        actions.push('Contact support with the error details')
        break
    }

    return actions
  }

  /**
   * Tracks error patterns for escalation
   */
  private static trackError(error: ContentServiceError): void {
    const errorKey = `${error.type}_${error.code}`
    const now = new Date()

    // Update error count
    const currentCount = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, currentCount + 1)
    this.lastErrorTimes.set(errorKey, now)

    // Update recovery attempt count
    const attemptCount = this.recoveryAttempts.get(errorKey) || 0
    this.recoveryAttempts.set(errorKey, attemptCount + 1)

    // Log error patterns for monitoring
    if (currentCount > 5) {
      console.warn(`[ErrorHandler] High error frequency detected: ${errorKey} (${currentCount} occurrences)`)
    }
  }

  /**
   * Checks if an error is retryable
   */
  static isRetryableError(error: ContentServiceError): boolean {
    const retryableTypes: ContentServiceErrorType[] = [
      'network',
      'timeout', 
      'rate_limit',
      'service_unavailable',
      'conflict'
    ]

    return retryableTypes.includes(error.type) && error.recoverable
  }

  /**
   * Calculates retry delay with exponential backoff
   */
  static getRetryDelay(error: ContentServiceError, attempt: number): number {
    const baseDelay = error.retryAfter ? error.retryAfter * 1000 : 1000
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
    const jitteredDelay = exponentialDelay + (Math.random() * 1000)
    
    return Math.min(jitteredDelay, 30000) // Max 30 seconds
  }

  /**
   * Calculates retry delay for recovery attempts
   */
  private static calculateRetryDelay(attempt: number): number {
    const baseDelay = 1000 // 1 second
    const exponentialDelay = baseDelay * Math.pow(2, attempt)
    const jitteredDelay = exponentialDelay + (Math.random() * 500)
    
    return Math.min(jitteredDelay, 30000) // Max 30 seconds
  }

  /**
   * Resets error tracking for a specific error type
   */
  static resetErrorTracking(errorType?: string): void {
    if (errorType) {
      // Reset specific error type
      const keysToDelete: string[] = []
      for (const [key] of this.errorCounts) {
        if (key.startsWith(errorType)) {
          keysToDelete.push(key)
        }
      }
      
      keysToDelete.forEach(key => {
        this.errorCounts.delete(key)
        this.lastErrorTimes.delete(key)
        this.recoveryAttempts.delete(key)
      })
    } else {
      // Reset all
      this.errorCounts.clear()
      this.lastErrorTimes.clear()
      this.recoveryAttempts.clear()
    }
  }

  /**
   * Gets error statistics for monitoring
   */
  static getErrorStats(): {
    totalErrors: number
    errorsByType: Record<string, number>
    recentErrors: Array<{ type: string; count: number; lastSeen: Date }>
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0)
    
    const errorsByType: Record<string, number> = {}
    const recentErrors: Array<{ type: string; count: number; lastSeen: Date }> = []

    for (const [key, count] of this.errorCounts) {
      const type = key.split('_')[0]
      if (type) {
        errorsByType[type] = (errorsByType[type] || 0) + count
        
        const lastSeen = this.lastErrorTimes.get(key)
        if (lastSeen) {
          recentErrors.push({ type: key, count, lastSeen })
        }
      }
    }

    // Sort recent errors by last seen time
    recentErrors.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())

    return {
      totalErrors,
      errorsByType,
      recentErrors: recentErrors.slice(0, 10) // Top 10 recent errors
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static classifyHttpError(statusCode: number): ContentServiceErrorType {
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

  private static isRecoverableHttpError(statusCode: number): boolean {
    const nonRecoverableClientErrors = [400, 401, 403, 404, 410, 422]
    return !nonRecoverableClientErrors.includes(statusCode)
  }

  private static getNetworkErrorMessage(code?: string): string {
    const messages: Record<string, string> = {
      'ECONNABORTED': 'Request timeout. Please check your connection and try again.',
      'ENOTFOUND': 'Unable to connect to content service. Please try again later.',
      'ECONNREFUSED': 'Connection refused. The service may be temporarily unavailable.',
      'ECONNRESET': 'Connection was reset. Please try again.',
      'ETIMEDOUT': 'Request timed out. Please try again.'
    }

    return messages[code || ''] || 'Network error occurred. Please check your connection.'
  }

  private static getNetworkErrorCause(code?: string): NetworkError['cause'] {
    const causes: Record<string, NetworkError['cause']> = {
      'ECONNABORTED': 'connection_failed',
      'ENOTFOUND': 'dns_resolution',
      'ECONNREFUSED': 'connection_failed',
      'ECONNRESET': 'connection_failed',
      'ETIMEDOUT': 'connection_failed'
    }

    return causes[code || ''] || 'connection_failed'
  }

  private static getHttpErrorMessage(statusCode: number, fallbackMessage?: string): string {
    const messages: Record<number, string> = {
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

    return messages[statusCode] || fallbackMessage || 'An error occurred. Please try again.'
  }

  private static getAuthErrorCause(responseData?: Record<string, unknown>): AuthenticationError['cause'] {
    if (!responseData) return 'invalid_token'
    
    const message = responseData.message as string
    if (message?.includes('expired')) return 'expired_token'
    if (message?.includes('invalid')) return 'invalid_token'
    if (message?.includes('missing')) return 'missing_token'
    return 'invalid_token'
  }
}