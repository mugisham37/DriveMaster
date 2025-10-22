import { useState } from 'react'

export type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error'

interface UseFormSubmissionOptions {
  endpoint: string
  method?: string
  onSuccess?: (data?: any) => void
  onError?: (error: Error) => void
  successMessage?: string
}

export function useFormSubmission({
  endpoint,
  method = 'POST',
  onSuccess,
  onError,
}: UseFormSubmissionOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [status, setStatus] = useState<SubmissionStatus>('idle')

  const submit = async (data?: Record<string, unknown> | FormData) => {
    setIsSubmitting(true)
    setStatus('submitting')
    setError(null)
    setIsSuccess(false)
    
    try {
      const isFormData = data instanceof FormData
      const response = await fetch(endpoint, {
        method,
        headers: isFormData ? {
          'X-Requested-With': 'XMLHttpRequest',
        } : {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setIsSuccess(true)
      setStatus('success')
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      setStatus('error')
      onError?.(error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return { 
    submit, 
    isSubmitting, 
    isSuccess, 
    error, 
    status 
  }
}