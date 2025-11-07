/**
 * User Service Error Boundary Components
 * 
 * Provides specialized error handling for user-service integration failures
 * with graceful degradation and recovery suggestions.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React from 'react'
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary'
// Using simple icons instead of lucide-react to avoid dependency issues
const AlertTriangle = () => '⚠️'
const RefreshCw = () => '🔄'
const Wifi = () => '📶'
const WifiOff = () => '📵'
const Clock = () => '⏰'
const Shield = () => '🛡️'

import { ErrorClassifier } from '../../lib/user-service/circuit-breaker'
import type { UserServiceError } from '@/types/user-service'

// ============================================================================
// Error Boundary Props and Types
// ============================================================================

interface UserServiceErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<UserServiceErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  context?: string
  enableRetry?: boolean
  enableOfflineMode?: boolean
}

interface UserServiceErrorFallbackProps extends FallbackProps {
  context?: string
  enableRetry?: boolean
  enableOfflineMode?: boolean
}

interface ErrorRecoveryAction {
  label: string
  action: () => void
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'destructive'
}

// ============================================================================
// Error Message Generation
// ============================================================================

export class UserServiceErrorMessageGenerator {
  private static readonly ERROR_MESSAGES: Record<string, {
    title: string
    description: string
    recoveryActions: string[]
    severity: 'low' | 'medium' | 'high'
  }> = {
    NETWORK_ERROR: {
      title: 'Connection Problem',
      description: 'Unable to connect to our servers. Please check your internet connection.',
      recoveryActions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again'
      ],
      severity: 'medium'
    },
    TIMEOUT_ERROR: {
      title: 'Request Timeout',
      description: 'The request is taking longer than expected.',
      recoveryActions: [
        'Wait a moment and try again',
        'Check your connection speed',
        'Try refreshing the page'
      ],
      severity: 'medium'
    },
    SERVICE_UNAVAILABLE: {
      title: 'Service Temporarily Unavailable',
      description: 'Our user service is temporarily unavailable. We\'re working to restore it.',
      recoveryActions: [
        'Try again in a few minutes',
        'Check our status page for updates',
        'Use cached data if available'
      ],
      severity: 'high'
    },
    AUTHORIZATION_ERROR: {
      title: 'Authentication Required',
      description: 'Your session has expired or you don\'t have permission for this action.',
      recoveryActions: [
        'Sign in again',
        'Refresh your session',
        'Contact support if the problem persists'
      ],
      severity: 'high'
    },
    VALIDATION_ERROR: {
      title: 'Invalid Data',
      description: 'The information provided doesn\'t meet our requirements.',
      recoveryActions: [
        'Check your input for errors',
        'Ensure all required fields are filled',
        'Try again with valid data'
      ],
      severity: 'low'
    },
    CIRCUIT_BREAKER_OPEN: {
      title: 'Service Protection Active',
      description: 'We\'ve temporarily limited requests to protect the service from high error rates.',
      recoveryActions: [
        'Wait a few minutes before trying again',
        'Use offline features if available',
        'Check back later'
      ],
      severity: 'high'
    },
    RATE_LIMITED: {
      title: 'Too Many Requests',
      description: 'You\'ve made too many requests. Please slow down.',
      recoveryActions: [
        'Wait a moment before trying again',
        'Reduce the frequency of your actions',
        'Try again in a few minutes'
      ],
      severity: 'medium'
    },
    UNKNOWN_ERROR: {
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. Our team has been notified.',
      recoveryActions: [
        'Try refreshing the page',
        'Wait a moment and try again',
        'Contact support if the problem persists'
      ],
      severity: 'medium'
    }
  }

  static generateErrorMessage(error: UserServiceError, context?: string) {
    const errorCode = error.code || 'UNKNOWN_ERROR'
    const template = this.ERROR_MESSAGES[errorCode] || this.ERROR_MESSAGES.UNKNOWN_ERROR

    return {
      ...template,
      context,
      originalError: error,
      correlationId: error.correlationId,
      retryAfter: error.retryAfter,
      timestamp: new Date().toISOString()
    }
  }

  static getRecoveryActions(error: UserServiceError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = []

    // Add retry action if error is recoverable
    if (error.recoverable) {
      actions.push({
        label: error.retryAfter ? `Retry in ${error.retryAfter}s` : 'Try Again',
        action: () => window.location.reload(),
        icon: RefreshCw(),
        variant: 'primary'
      })
    }

    // Add specific actions based on error type
    switch (error.type) {
      case 'network':
        actions.push({
          label: 'Check Connection',
          action: () => {
            // Open network diagnostics or connection check
            if (navigator.onLine) {
              alert('Your device appears to be online. The issue may be with our servers.')
            } else {
              alert('Your device appears to be offline. Please check your internet connection.')
            }
          },
          icon: navigator.onLine ? Wifi() : WifiOff(),
          variant: 'secondary'
        })
        break

      case 'authorization':
        actions.push({
          label: 'Sign In Again',
          action: () => {
            // Redirect to login
            window.location.href = '/auth/login'
          },
          icon: Shield(),
          variant: 'primary'
        })
        break

      case 'timeout':
        actions.push({
          label: 'Wait and Retry',
          action: () => {
            setTimeout(() => window.location.reload(), 3000)
          },
          icon: Clock(),
          variant: 'secondary'
        })
        break
    }

    return actions
  }
}

// ============================================================================
// Default Error Fallback Component
// ============================================================================

function UserServiceErrorFallback({ 
  error, 
  resetErrorBoundary, 
  context,
  enableRetry = true,
  enableOfflineMode = false 
}: UserServiceErrorFallbackProps) {
  const userServiceError = ErrorClassifier.classifyError(error)
  const errorMessage = UserServiceErrorMessageGenerator.generateErrorMessage(userServiceError, context)
  const recoveryActions = UserServiceErrorMessageGenerator.getRecoveryActions(userServiceError)

  const getSeverityColor = (_severity: string) => {
    switch (_severity) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getSeverityIcon = (_severity: string) => {
    return AlertTriangle()
  }

  return (
    <div className={`rounded-lg border-2 p-6 ${getSeverityColor(errorMessage.severity || 'low')}`}>
      <div className="flex items-start space-x-3">
        {getSeverityIcon(errorMessage.severity || 'low')}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {errorMessage.title}
          </h3>
          <p className="text-gray-700 mb-4">
            {errorMessage.description}
          </p>

          {context && (
            <div className="text-sm text-gray-600 mb-4">
              <strong>Context:</strong> {context}
            </div>
          )}

          {errorMessage.correlationId && (
            <div className="text-xs text-gray-500 mb-4 font-mono">
              ID: {errorMessage.correlationId}
            </div>
          )}

          {/* Recovery Actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">What you can do:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              {(errorMessage.recoveryActions || []).map((action, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          {(enableRetry || recoveryActions.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-6">
              {enableRetry && (
                <button
                  onClick={resetErrorBoundary}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="mr-2">{RefreshCw()}</span>
                  Try Again
                </button>
              )}
              
              {recoveryActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    action.variant === 'primary' 
                      ? 'border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                      : action.variant === 'destructive'
                      ? 'border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500'
                  }`}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Offline Mode Indicator */}
          {enableOfflineMode && !navigator.onLine && (
            <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-md">
              <div className="flex items-center">
                <span className="text-orange-500 mr-2">{WifiOff()}</span>
                <span className="text-sm text-orange-800">
                  You&apos;re currently offline. Some features may be limited.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Specialized Error Boundary Components
// ============================================================================

export function UserServiceErrorBoundary({ 
  children, 
  fallback: FallbackComponent = UserServiceErrorFallback,
  onError,
  context = 'User Service',
  enableRetry = true,
  enableOfflineMode = false
}: UserServiceErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error with sanitization
    const userServiceError = ErrorClassifier.classifyError(error)
    
    console.error('[UserServiceErrorBoundary] Error caught:', {
      context,
      error: {
        type: userServiceError.type,
        message: userServiceError.message,
        code: userServiceError.code,
        recoverable: userServiceError.recoverable
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString()
    })

    // Call custom error handler if provided
    onError?.(error, errorInfo)
  }

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => (
        <FallbackComponent 
          {...props} 
          context={context}
          enableRetry={enableRetry}
          enableOfflineMode={enableOfflineMode}
        />
      )}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  )
}

// Profile-specific error boundary
export function UserProfileErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <UserServiceErrorBoundary
      context="User Profile"
      enableRetry={true}
      enableOfflineMode={true}
    >
      {children}
    </UserServiceErrorBoundary>
  )
}

// Progress-specific error boundary
export function ProgressTrackingErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <UserServiceErrorBoundary
      context="Progress Tracking"
      enableRetry={true}
      enableOfflineMode={false}
    >
      {children}
    </UserServiceErrorBoundary>
  )
}

// Activity-specific error boundary
export function ActivityMonitoringErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <UserServiceErrorBoundary
      context="Activity Monitoring"
      enableRetry={true}
      enableOfflineMode={true}
    >
      {children}
    </UserServiceErrorBoundary>
  )
}

// GDPR-specific error boundary
export function GDPRComplianceErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <UserServiceErrorBoundary
      context="GDPR Compliance"
      enableRetry={false}
      enableOfflineMode={false}
    >
      {children}
    </UserServiceErrorBoundary>
  )
}

// ============================================================================
// Error Logging with Sanitization
// ============================================================================

export class UserServiceErrorLogger {
  private static readonly SENSITIVE_FIELDS = [
    'password', 'token', 'secret', 'key', 'auth', 'session',
    'email', 'phone', 'ssn', 'credit', 'payment'
  ]

  static sanitizeError(error: unknown): Record<string, unknown> {
    if (!error || typeof error !== 'object') {
      return { message: String(error) }
    }

    const sanitized: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(error)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeError(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  private static isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase()
    return this.SENSITIVE_FIELDS.some(sensitive => lowerField.includes(sensitive))
  }

  static logError(
    error: UserServiceError, 
    context?: string, 
    additionalData?: Record<string, unknown>
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      context,
      error: this.sanitizeError(error),
      additionalData: additionalData ? this.sanitizeError(additionalData) : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href,
      correlationId: error.correlationId || crypto.randomUUID()
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[UserServiceErrorLogger]', logEntry)
    }

    // Send to logging service in production
    if (process.env.NODE_ENV === 'production') {
      // This would integrate with your logging service
      // e.g., Sentry, LogRocket, DataDog, etc.
      try {
        // Example: Send to logging endpoint
        fetch('/api/logs/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        }).catch(() => {
          // Silently fail if logging fails
        })
      } catch {
        // Silently fail if logging fails
      }
    }
  }
}

// ============================================================================
// Hooks for Error Handling
// ============================================================================

export function useUserServiceErrorHandler() {
  const handleError = React.useCallback((
    error: unknown, 
    context?: string,
    additionalData?: Record<string, unknown>
  ) => {
    const userServiceError = ErrorClassifier.classifyError(error)
    UserServiceErrorLogger.logError(userServiceError, context, additionalData)
    return userServiceError
  }, [])

  const getErrorMessage = React.useCallback((error: UserServiceError, context?: string) => {
    return UserServiceErrorMessageGenerator.generateErrorMessage(error, context)
  }, [])

  const getRecoveryActions = React.useCallback((error: UserServiceError) => {
    return UserServiceErrorMessageGenerator.getRecoveryActions(error)
  }, [])

  return {
    handleError,
    getErrorMessage,
    getRecoveryActions
  }
}