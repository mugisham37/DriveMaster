import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error'

export interface FormSubmissionOptions<T = unknown> {
  endpoint: string
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  redirectTo?: string
  showSuccessMessage?: boolean
  successMessage?: string
  optimisticUpdate?: () => void
  revertOptimisticUpdate?: () => void
}

export interface UseFormSubmissionReturn<T> {
  status: SubmissionStatus
  error: Error | null
  isSubmitting: boolean
  isSuccess: boolean
  isError: boolean
  submit: (formData: Record<string, unknown>) => Promise<T | null>
  reset: () => void
}

export function useFormSubmission<T = unknown>({
  endpoint,
  method = 'POST',
  onSuccess,
  onError,
  redirectTo,
  showSuccessMessage = true,
  successMessage,
  optimisticUpdate,
  revertOptimisticUpdate
}: FormSubmissionOptions<T>): UseFormSubmissionReturn<T> {
  const [status, setStatus] = useState<SubmissionStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()

  const submit = useCallback(async (formData: Record<string, unknown>): Promise<T | null> => {
    setStatus('submitting')
    setError(null)

    // Apply optimistic update if provided
    if (optimisticUpdate) {
      optimisticUpdate()
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = `Request failed with status ${response.status}`
        try {
          const errorData = await response.json()
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (errorData.error) {
            errorMessage = errorData.error
          } else if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.join(', ')
          }
        } catch {
          // Use default error message if parsing fails
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      setStatus('success')

      // Call success callback
      if (onSuccess) {
        onSuccess(result)
      }

      // Show success message if enabled
      if (showSuccessMessage && successMessage) {
        // This would integrate with a toast/notification system
        console.log('Success:', successMessage)
      }

      // Redirect if specified
      if (redirectTo) {
        router.push(redirectTo)
      }

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      
      // Revert optimistic update if provided
      if (revertOptimisticUpdate) {
        revertOptimisticUpdate()
      }

      setStatus('error')
      setError(error)

      // Call error callback
      if (onError) {
        onError(error)
      }

      return null
    }
  }, [endpoint, method, onSuccess, onError, redirectTo, showSuccessMessage, successMessage, optimisticUpdate, revertOptimisticUpdate, router])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  return {
    status,
    error,
    isSubmitting: status === 'submitting',
    isSuccess: status === 'success',
    isError: status === 'error',
    submit,
    reset
  }
}