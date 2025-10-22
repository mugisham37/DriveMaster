import React from 'react'
import { InputWithValidation, type InputWithValidationProps } from './InputWithValidation'

export interface FormFieldProps extends InputWithValidationProps {
  label: string
  info?: string
  required?: boolean
}

export function FormField({
  label,
  info,
  required,
  id,
  error,
  ...inputProps
}: FormFieldProps): React.JSX.Element {
  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-orange ml-1">*</span>}
      </label>
      <InputWithValidation
        id={id}
        error={error}
        {...inputProps}
      />
      {info && !error && (
        <p className="info text-textColor6 text-14 mt-1">
          {info}
        </p>
      )}
    </div>
  )
}