'use client'

import React, { FormEvent, useCallback } from 'react'
import { useFormValidation } from '@/hooks/useFormValidation'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormMessage } from './FormMessage'
import { type FormValidationSchema } from '@/lib/validation'

export interface FormProps {
  children: React.ReactNode
  onSubmit: (formData: Record<string, unknown>) => void
  validationSchema?: FormValidationSchema
  className?: string
  validateOnChange?: boolean

  showFormMessage?: boolean
  successMessage?: string
  SuccessComponent?: React.ComponentType | undefined
  ErrorComponent?: React.ComponentType<{ error: Error }> | undefined
}

export interface FormContextValue {
  validateField: (fieldName: string, value: unknown) => void
  getFieldError: (fieldName: string) => string | undefined
  isFieldValid: (fieldName: string) => boolean
  clearFieldError: (fieldName: string) => void
  isFormValid: boolean
  isSubmitting: boolean
  status: 'idle' | 'submitting' | 'success' | 'error'
}

export const FormContext = React.createContext<FormContextValue | null>(null)

export function Form({
  children,
  onSubmit,
  validationSchema,
  className = '',
  validateOnChange = true,
  showFormMessage = true,
  successMessage,
  SuccessComponent,
  ErrorComponent
}: FormProps): React.ReactElement {
  // Always call hooks in the same order
  const validation = useFormValidation({
    schema: validationSchema || {},
    validateOnChange
  })

  const submission = useFormSubmission({
    endpoint: '', // This will be overridden by the actual form implementation
    onSuccess: () => {
      validation.clearAllErrors()
    }
  })

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {}
    
    // Convert FormData to plain object
    formData.forEach((value, key) => {
      data[key] = value
    })

    // Validate form if validation schema provided
    if (validationSchema) {
      const isValid = validation.validateForm(data)
      if (!isValid) {
        return // Don't submit if validation fails
      }
    }

    onSubmit(data)
  }, [onSubmit, validation, validationSchema])

  const contextValue: FormContextValue = {
    validateField: validation.validateField,
    getFieldError: validation.getFieldError,
    isFieldValid: validation.isFieldValid,
    clearFieldError: validation.clearFieldError,
    isFormValid: validation.isValid,
    isSubmitting: submission.isSubmitting,
    status: submission.status
  }

  return (
    <FormContext.Provider value={contextValue}>
      <form 
        onSubmit={handleSubmit} 
        className={className}
        data-turbo="false"
        noValidate
      >
        {children}
        
        {showFormMessage && (
          <FormMessage
            status={submission.status}
            error={submission.error}
            {...(successMessage !== undefined && { successMessage })}
            {...(SuccessComponent !== undefined && { SuccessComponent })}
            {...(ErrorComponent !== undefined && { ErrorComponent })}
          />
        )}
      </form>
    </FormContext.Provider>
  )
}

// Hook to use form context
export function useFormContext(): FormContextValue {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a Form component')
  }
  return context
}