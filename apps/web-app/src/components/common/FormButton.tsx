import React from 'react'
import { MutationStatus } from '@tanstack/react-query'

export interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  status?: MutationStatus
  children: React.ReactNode
  loadingText?: string
  isLoading?: boolean
}

export const FormButton = ({
  status,
  children,
  disabled: propDisabled,
  isLoading,
  loadingText = 'Loading...',
  ...props
}: FormButtonProps): React.ReactElement => {
  const requestDisabled = status === 'pending' || isLoading

  return (
    <button {...props} disabled={requestDisabled || propDisabled}>
      {requestDisabled && loadingText ? loadingText : children}
    </button>
  )
}
