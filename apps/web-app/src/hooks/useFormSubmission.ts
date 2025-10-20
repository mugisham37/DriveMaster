import { useState } from 'react'

interface UseFormSubmissionOptions {
  endpoint: string
  method?: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useFormSubmission({
  endpoint,
  method = 'POST',
  onSuccess,
  onError,
}: UseFormSubmissionOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (data?: Record<string, unknown>) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: data ? JSON.stringify(data) : undefined,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      onSuccess?.()
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      onError?.(err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  return { submit, isSubmitting }
}