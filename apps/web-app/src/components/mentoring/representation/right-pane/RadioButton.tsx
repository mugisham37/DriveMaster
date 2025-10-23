import React from 'react'

interface RadioButtonProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  value: string
  checked?: boolean
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function RadioButton({ 
  label, 
  value, 
  checked, 
  onChange, 
  ...props 
}: RadioButtonProps): React.ReactElement {
  return (
    <label className="radio-button flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
        className="radio-input"
        {...props}
      />
      <span className="radio-label">{label}</span>
    </label>
  )
}