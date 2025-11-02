/**
 * Analytics Error Boundary Component
 * 
 * Provides error containment for analytics features with fallback UI components
 * for different error scenarios, error classification, and recovery actions.
 * 
 * Requirements: 6.1, 6.2, 6.5
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import styles from './AnalyticsErrorBoundary.module.css'
import { 
  BaseAnalyticsError, 
  AnalyticsErrorFactory, 
  AnalyticsErrorHandler,
  isAnalyticsError,
  createErrorResponse
} from '@/lib/analytics-service/errors'


// ============================================================================
// Types
// ============================================================================

interface AnalyticsErrorBoundaryState {
  hasError: boolean
  error: BaseAnalyticsError | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRetrying: boolean
  lastErrorTime: Date | null
}

interface AnalyticsErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: BaseAnalyticsError, retry: () => void) => ReactNode
  onError?: (error: BaseAnalyticsError, errorInfo: ErrorInfo) => void
  maxRetries?: number
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

// ============================================================================
// Error Boundary Component
// ============================================================================

export class AnalyticsErrorBoundary extends Component<
  AnalyticsErrorBoundaryProps,
  AnalyticsErrorBoundaryState
> {
  private resetTimeoutId: NodeJS.Timeout | null = null

  constructor(props: AnalyticsErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      lastErrorTime: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AnalyticsErrorBoundaryState> {
    // Convert error to analytics error if needed
    const analyticsError = isAnalyticsError(error) 
      ? error 
      : AnalyticsErrorFactory.fromError(error)

    return {
      hasError: true,
      error: analyticsError,
      lastErrorTime: new Date()
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const analyticsError = isAnalyticsError(error) 
      ? error 
      : AnalyticsErrorFactory.fromError(error)

    this.setState({
      errorInfo
    })

    // Call error handler
    if (this.props.onError) {
      this.props.onError(analyticsError, errorInfo)
    }

    // Log error for monitoring
    this.logError(analyticsError, errorInfo)
  }

  override componentDidUpdate(prevProps: AnalyticsErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props
    const { hasError } = this.state

    // Reset error boundary when specified props change
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        prevProps.resetKeys?.[index] !== key
      )

      if (hasResetKeyChanged) {
        this.resetErrorBoundary()
      }
    }
  }

  override componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  private logError = (error: BaseAnalyticsError, errorInfo: ErrorInfo) => {
    const logData = {
      error: error.toAnalyticsServiceError(),
      errorInfo: {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'AnalyticsErrorBoundary'
      },
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString()
    }

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.error('[AnalyticsErrorBoundary] Error caught:', logData)
    }

    // Production error reporting would go here
    // Example: sendToErrorReporting(logData)
  }

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      lastErrorTime: null
    })
  }

  private handleRetry = async () => {
    const { error, retryCount } = this.state
    const maxRetries = this.props.maxRetries || 3

    if (!error || retryCount >= maxRetries) {
      return
    }

    this.setState({ isRetrying: true })

    try {
      // Use error handler to determine retry strategy
      const { shouldRetry, retryDelay } = await AnalyticsErrorHandler.handleError(error, {
        operation: 'error_boundary_retry',
        attempt: retryCount + 1,
        maxAttempts: maxRetries
      })

      if (shouldRetry) {
        // Wait for retry delay
        await new Promise(resolve => setTimeout(resolve, retryDelay))

        // Reset error boundary after delay
        this.resetTimeoutId = setTimeout(() => {
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: retryCount + 1,
            isRetrying: false
          })
        }, 100)
      } else {
        this.setState({ isRetrying: false })
      }
    } catch (retryError) {
      console.error('[AnalyticsErrorBoundary] Retry failed:', retryError)
      this.setState({ isRetrying: false })
    }
  }

  override render() {
    const { hasError, error, isRetrying } = this.state
    const { children, fallback } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.handleRetry)
      }

      // Default fallback UI
      return (
        <AnalyticsErrorFallback
          error={error}
          isRetrying={isRetrying}
          onRetry={this.handleRetry}
          onReset={this.resetErrorBoundary}
        />
      )
    }

    return children
  }
}

// ============================================================================
// Default Fallback Component
// ============================================================================

interface AnalyticsErrorFallbackProps {
  error: BaseAnalyticsError
  isRetrying: boolean
  onRetry: () => void
  onReset: () => void
}

function AnalyticsErrorFallback({ 
  error, 
  isRetrying, 
  onRetry, 
  onReset 
}: AnalyticsErrorFallbackProps) {
  const { error: errorData, userMessage } = createErrorResponse(error)

  return (
    <div className={styles['analytics-error-boundary']}>
      <div className={styles['analytics-error-container']}>
        <div className={styles['analytics-error-icon']}>
          <ErrorIcon />
        </div>
        
        <div className={styles['analytics-error-content']}>
          <h3 className={styles['analytics-error-title']}>
            Analytics Temporarily Unavailable
          </h3>
          
          <p className={styles['analytics-error-message']}>
            {userMessage}
          </p>
          
          {error.recoverable && (
            <div className={styles['analytics-error-actions']}>
              <button
                onClick={onRetry}
                disabled={isRetrying}
                className={styles['analytics-retry-button']}
              >
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
              
              <button
                onClick={onReset}
                className={styles['analytics-reset-button']}
              >
                Reset
              </button>
            </div>
          )}
          
          {!error.recoverable && (
            <div className={styles['analytics-error-info']}>
              <p className={styles['analytics-error-help']}>
                This issue requires attention from your administrator.
              </p>
              
              <button
                onClick={onReset}
                className={styles['analytics-reset-button']}
              >
                Dismiss
              </button>
            </div>
          )}
          
          {process.env.NODE_ENV === 'development' && (
            <details className={styles['analytics-error-details']}>
              <summary>Error Details (Development)</summary>
              <pre className={styles['analytics-error-stack']}>
                {JSON.stringify(errorData, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Error Icon Component
// ============================================================================

function ErrorIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles['analytics-error-icon-svg']}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

// ============================================================================
// Specialized Error Boundaries
// ============================================================================

/**
 * Error boundary specifically for analytics dashboard components
 */
export function AnalyticsDashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <AnalyticsErrorBoundary
      fallback={(error, retry) => (
        <div className={styles['analytics-dashboard-error']}>
          <div className={styles['analytics-dashboard-error-content']}>
            <h2>Dashboard Unavailable</h2>
            <p>The analytics dashboard is temporarily unavailable.</p>
            {error.recoverable && (
              <button onClick={retry} className={styles['analytics-retry-button']}>
                Reload Dashboard
              </button>
            )}
          </div>
        </div>
      )}
      maxRetries={3}
      resetOnPropsChange={true}
    >
      {children}
    </AnalyticsErrorBoundary>
  )
}

/**
 * Error boundary for analytics charts and visualizations
 */
export function AnalyticsChartErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <AnalyticsErrorBoundary
      fallback={(error, retry) => (
        <div className={styles['analytics-chart-error']}>
          <div className={styles['analytics-chart-error-content']}>
            <ErrorIcon />
            <p>Chart data unavailable</p>
            {error.recoverable && (
              <button onClick={retry} className={styles['analytics-retry-button-small']}>
                Retry
              </button>
            )}
          </div>
        </div>
      )}
      maxRetries={2}
    >
      {children}
    </AnalyticsErrorBoundary>
  )
}

/**
 * Error boundary for real-time analytics features
 */
export function AnalyticsRealtimeErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <AnalyticsErrorBoundary
      fallback={(error, retry) => (
        <div className={styles['analytics-realtime-error']}>
          <div className={styles['analytics-realtime-error-content']}>
            <div className={styles['analytics-realtime-error-icon']}>⚠️</div>
            <p>Real-time updates unavailable</p>
            <small>Showing cached data</small>
            {error.recoverable && (
              <button onClick={retry} className={styles['analytics-retry-button-small']}>
                Reconnect
              </button>
            )}
          </div>
        </div>
      )}
      maxRetries={5}
    >
      {children}
    </AnalyticsErrorBoundary>
  )
}

// ============================================================================
// Hook for Error Boundary Integration
// ============================================================================

/**
 * Hook to trigger error boundary from within components
 */
export function useAnalyticsErrorBoundary() {
  return {
    captureError: (error: Error | BaseAnalyticsError) => {
      // This will trigger the nearest error boundary
      throw isAnalyticsError(error) ? error : AnalyticsErrorFactory.fromError(error)
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export default AnalyticsErrorBoundary