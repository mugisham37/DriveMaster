// i18n-key-prefix: formMessage
// i18n-namespace: components/settings/FormMessage.tsx
import React from 'react'
import { ErrorBoundary, useErrorHandler } from '@/components/ErrorBoundary'
import { FallbackProps } from 'react-error-boundary'
import { MutationStatus } from '@tanstack/react-query'
import { Icon } from '@/components/common'
import { useAppTranslation } from '@/i18n/useAppTranslation'

const ErrorMessage = ({ error, resetErrorBoundary }: FallbackProps): React.ReactElement => {
  const { t } = useAppTranslation('components/settings/FormMessage.tsx')
  return (
    <div className="status error">
      <Icon icon="failed-cross-circle" alt={t('formMessage.error')} />
      {error.message}
      {resetErrorBoundary && (
        <button onClick={resetErrorBoundary} className="btn-secondary btn-xs ml-2">
          Try again
        </button>
      )}
    </div>
  )
}

export interface FormMessageProps {
  status: MutationStatus
  error: unknown
  defaultError: Error
  SuccessMessage: React.ComponentType<Record<string, never>>
}

export const FormMessage = ({
  status,
  error,
  defaultError,
  SuccessMessage,
}: FormMessageProps): React.ReactElement => {
  return (
    <ErrorBoundary 
      FallbackComponent={({ error }) => <ErrorMessage error={error} resetErrorBoundary={() => {}} />} 
      resetKeys={[status]}
    >
      <Message
        status={status}
        error={error}
        SuccessMessage={SuccessMessage}
        defaultError={defaultError}
      />
    </ErrorBoundary>
  )
}

interface MessageProps {
  status: MutationStatus
  SuccessMessage: React.ComponentType<Record<string, never>>
  defaultError: Error
  error: unknown
}

const Message = ({
  status,
  SuccessMessage,
  defaultError,
  error,
}: MessageProps): React.ReactElement | null => {
  const handleError = useErrorHandler(error, { defaultError })
  
  React.useEffect(() => {
    if (error) {
      handleError(error)
    }
  }, [error, handleError])

  switch (status) {
    case 'success':
      return <SuccessMessage />
    default:
      return null
  }
}
