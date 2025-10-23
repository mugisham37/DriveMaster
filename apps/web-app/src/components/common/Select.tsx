import React, { useState } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  disabled = false
}: SelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  const selectedOption = options.find(option => option.value === value)

  return (
    <div className={`select-container relative ${className}`}>
      <button
        type="button"
        className="select-trigger w-full p-2 border border-gray-300 rounded bg-white text-left flex items-center justify-between"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={selectedOption ? '' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="ml-2">▼</span>
      </button>
      
      {isOpen && (
        <div className="select-dropdown absolute top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 z-10 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="select-option w-full p-2 text-left hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}