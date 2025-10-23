import { useState, useCallback } from 'react'
import { sendRequest } from '@/utils/send-request'

export type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error'

export interface UseFormSubmissionOptions {
  endpoint: string
  method?: string
  onSuccess?: () => void
  successMessage?: string
}

export interface UseFormSubmissionResult {
  status: SubmissionStatus
  error: Error | null
  isSubmitting: boolean
  submit: (data?: any) => Promise<void>
  reset: () => void
}

export function useFormSubmission(options: UseFormSubmissionOptions): UseFormSubmissionResult {
  const [status, setStatus] = useState<SubmissionStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const submit = useCallback(async (data?: any) => {
    try {
      setStatus('submitting')
      setError(null)
      
      const { fetch } = sendRequest({
        endpoint: options.endpoint,
        method: options.method || 'POST',
        body: data ? JSON.stringify(data) : undefined,
      })
      
      await fetch
      setStatus('success')
      options.onSuccess?.()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err : new Error('An error occurred'))
    }
  }, [options])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  return {
    status,
    error,
    isSubmitting: status === 'submitting',
    submit,
    reset
  }
}