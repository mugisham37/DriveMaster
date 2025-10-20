import React, { ChangeEvent, InputHTMLAttributes, useCallback, useState } from 'react'
import { assembleClassNames } from '@/utils/assemble-classnames'

export interface InputWithValidationProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  id: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onValidate?: (value: string) => void
  error?: string
  showError?: boolean
}

const INVALID_INPUT_STYLES = '!border-1 !border-orange mb-8'

export function InputWithValidation({
  id,
  value,
  onChange,
  onValidate,
  error,
  showError = true,
  className,
  onBlur,
  ...inputProps
}: InputWithValidationProps): JSX.Element {
  const [hasBeenBlurred, setHasBeenBlurred] = useState(false)
  
  const hasError = error && error.length > 0
  const shouldShowError = hasError && showError && hasBeenBlurred

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onChange(e)
    
    // Validate on change if validation function provided
    if (onValidate) {
      onValidate(e.target.value)
    }
  }, [onChange, onValidate])

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setHasBeenBlurred(true)
    
    // Validate on blur if validation function provided
    if (onValidate) {
      onValidate(e.target.value)
    }
    
    // Call original onBlur if provided
    if (onBlur) {
      onBlur(e)
    }
  }, [onValidate, onBlur])

  return (
    <>
      <input
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={assembleClassNames(
          shouldShowError ? INVALID_INPUT_STYLES : '',
          className
        )}
        {...inputProps}
      />
      {shouldShowError && (
        <span className="text-orange font-semibold block mt-1">
          {error}
        </span>
      )}
    </>
  )
}