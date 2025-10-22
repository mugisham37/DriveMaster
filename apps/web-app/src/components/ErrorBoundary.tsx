import React, { Component, ReactNode } from 'react'
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary'

interface Props {
  children: ReactNode
  resetKeys?: Array<string | number | boolean | null | undefined>
  FallbackComponent?: React.ComponentType<{ error: Error }>
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  override componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props
    const { hasError } = this.state

    if (hasError && resetKeys && prevProps.resetKeys !== resetKeys) {
      this.setState({ hasError: false, error: null })
    }
  }

  override render() {
    const { hasError, error } = this.state
    const { children, FallbackComponent } = this.props

    if (hasError && error) {
      if (FallbackComponent) {
        return <FallbackComponent error={error} />
      }
      
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {error.toString()}
          </details>
        </div>
      )
    }

    return children
  }
}

export interface ErrorMessageProps {
  error: Error | null
  defaultError: Error
}

export function ErrorMessage({ error, defaultError }: ErrorMessageProps): React.ReactElement | null {
  const displayError = error || defaultError
  
  if (!displayError) return null

  return (
    <div className="error-message text-alert">
      {displayError.message}
    </div>
  )
}

export function useErrorHandler(error?: unknown, options?: { defaultError?: Error }) {
  return React.useCallback((handledError: unknown) => {
    const errorToLog = handledError || error || options?.defaultError
    console.error('Error handled:', errorToLog)
  }, [error, options?.defaultError])
}

// Re-export from react-error-boundary for convenience
export { ReactErrorBoundary, type FallbackProps }

export default ErrorBoundary