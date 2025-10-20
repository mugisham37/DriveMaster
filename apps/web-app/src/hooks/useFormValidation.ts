import { useState, useCallback, useEffect } from 'react'
import { 
  validateField, 
  validateForm, 
  isFormValid,
  type FormValidationSchema 
} from '@/lib/validation'

export interface UseFormValidationOptions {
  schema: FormValidationSchema
  validateOnChange?: boolean
  validateOnBlur?: boolean
  debounceMs?: number
}

export interface UseFormValidationReturn {
  errors: Record<string, string[]>
  isValid: boolean
  isFieldValid: (fieldName: string) => boolean
  getFieldError: (fieldName: string) => string | undefined
  validateField: (fieldName: string, value: unknown) => void
  validateForm: (formData: Record<string, unknown>) => boolean
  clearFieldError: (fieldName: string) => void
  clearAllErrors: () => void
  hasErrors: boolean
}

export function useFormValidation({
  schema,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300
}: UseFormValidationOptions): UseFormValidationReturn {
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [debounceTimeouts, setDebounceTimeouts] = useState<Record<string, NodeJS.Timeout>>({})

  // Clear debounce timeout on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimeouts).forEach(timeout => clearTimeout(timeout))
    }
  }, [debounceTimeouts])

  const validateFieldInternal = useCallback((fieldName: string, value: unknown) => {
    const validation = schema[fieldName]
    if (!validation) return

    const result = validateField(fieldName, value, validation)
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.errors
    }))
  }, [schema])

  const validateFieldWithDebounce = useCallback((fieldName: string, value: unknown) => {
    // Clear existing timeout for this field
    if (debounceTimeouts[fieldName]) {
      clearTimeout(debounceTimeouts[fieldName])
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      validateFieldInternal(fieldName, value)
      setDebounceTimeouts(prev => {
        const newTimeouts = { ...prev }
        delete newTimeouts[fieldName]
        return newTimeouts
      })
    }, debounceMs)

    setDebounceTimeouts(prev => ({
      ...prev,
      [fieldName]: timeout
    }))
  }, [validateFieldInternal, debounceMs, debounceTimeouts])

  const validateFormInternal = useCallback((formData: Record<string, unknown>): boolean => {
    const results = validateForm(formData, schema)
    
    const newErrors: Record<string, string[]> = {}
    Object.keys(results).forEach(fieldName => {
      newErrors[fieldName] = results[fieldName].errors
    })
    
    setErrors(newErrors)
    return isFormValid(results)
  }, [schema])

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: []
    }))
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  const isFieldValid = useCallback((fieldName: string): boolean => {
    const fieldErrors = errors[fieldName]
    return !fieldErrors || fieldErrors.length === 0
  }, [errors])

  const getFieldError = useCallback((fieldName: string): string | undefined => {
    const fieldErrors = errors[fieldName]
    return fieldErrors && fieldErrors.length > 0 ? fieldErrors[0] : undefined
  }, [errors])

  const hasErrors = Object.values(errors).some(fieldErrors => fieldErrors.length > 0)
  const isValid = !hasErrors

  return {
    errors,
    isValid,
    isFieldValid,
    getFieldError,
    validateField: validateOnChange ? validateFieldWithDebounce : validateFieldInternal,
    validateForm: validateFormInternal,
    clearFieldError,
    clearAllErrors,
    hasErrors
  }
}