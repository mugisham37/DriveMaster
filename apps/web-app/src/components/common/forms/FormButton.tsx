import React from 'react'
import { assembleClassNames } from '@/utils/assemble-classnames'
import { SubmissionStatus } from '@/hooks/useFormSubmission'

export interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  status?: SubmissionStatus
  children: React.ReactNode
  loadingText?: string
  isLoading?: boolean
}

export function FormButton({
  status = 'idle',
  children,
  loadingText = 'Submitting...',
  className = '',
  disabled,
  isLoading,
  ...buttonProps
}: FormButtonProps): JSX.Element {
  const isSubmitting = status === 'submitting' || isLoading || false
  const isDisabled = disabled || isSubmitting

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={assembleClassNames(
        'btn',
        isSubmitting ? 'opacity-75 cursor-not-allowed' : '',
        className
      )}
      {...buttonProps}
    >
      {isSubmitting ? (
        <span className="flex items-center">
          <svg 
            className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  )
}