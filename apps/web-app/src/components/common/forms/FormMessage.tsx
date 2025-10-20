import React from 'react'
import { Icon } from '../Icon'
import { SubmissionStatus } from '@/hooks/useFormSubmission'
import { JSX } from 'react/jsx-runtime'

export interface FormMessageProps {
  status: SubmissionStatus
  error?: Error | null
  successMessage?: string | undefined
  SuccessComponent?: React.ComponentType
  ErrorComponent?: React.ComponentType<{ error: Error }>
}

const DefaultSuccessMessage: React.FC<{ message?: string }> = ({ message = 'Success!' }) => (
  <div className="status success flex items-center text-green-600 mt-2">
    <Icon icon="completed-check-circle" alt="Success" className="mr-2" />
    <span>{message}</span>
  </div>
)

const DefaultErrorMessage: React.FC<{ error: Error }> = ({ error }) => (
  <div className="status error flex items-center text-red-600 mt-2">
    <Icon icon="failed-cross-circle" alt="Error" className="mr-2" />
    <span>{error.message}</span>
  </div>
)

export function FormMessage({
  status,
  error,
  successMessage,
  SuccessComponent,
  ErrorComponent
}: FormMessageProps): JSX.Element | null {
  switch (status) {
    case 'success':
      if (SuccessComponent) {
        return <SuccessComponent />
      }
      return <DefaultSuccessMessage message={successMessage} />
      
    case 'error':
      if (error) {
        if (ErrorComponent) {
          return <ErrorComponent error={error} />
        }
        return <DefaultErrorMessage error={error} />
      }
      return null
      
    default:
      return null
  }
}