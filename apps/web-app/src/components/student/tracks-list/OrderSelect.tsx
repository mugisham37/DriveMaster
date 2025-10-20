import React from 'react'

interface OrderSelectProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}

export function OrderSelect({ value, onChange, options }: OrderSelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}