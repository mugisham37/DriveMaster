import React from 'react'
import { assembleClassNames } from '@/utils/assemble-classnames'

interface ToggleButtonProps {
  checked: boolean
  onToggle: () => void
  disabled?: boolean
  className?: string
}

export function ToggleButton({ 
  checked, 
  onToggle, 
  disabled = false, 
  className 
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={assembleClassNames(
        'toggle-button',
        checked ? 'checked' : 'unchecked',
        disabled && 'disabled',
        className
      )}
      aria-pressed={checked}
    >
      <span className="toggle-slider" />
    </button>
  )
}