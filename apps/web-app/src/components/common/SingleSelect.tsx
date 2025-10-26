'use client'

import React, { useState } from 'react'

export interface SingleSelectProps<T> {
  options: T[]
  value: T
  setValue: (value: T) => void
  SelectedComponent: React.ComponentType<{ option: T }>
  OptionComponent: React.ComponentType<{ option: T }>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SingleSelect<T>({
  options,
  value,
  setValue,
  SelectedComponent,
  OptionComponent,
  placeholder = 'Select an option',
  disabled = false,
  className = ''
}: SingleSelectProps<T>): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (option: T) => {
    setValue(option)
    setIsOpen(false)
  }

  return (
    <div className={`single-select relative ${className}`}>
      <button
        type="button"
        className="single-select-trigger w-full p-2 border border-gray-300 rounded bg-white text-left flex items-center justify-between"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {value ? (
          <SelectedComponent option={value} />
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <span className="ml-2">▼</span>
      </button>
      
      {isOpen && (
        <div className="single-select-dropdown absolute top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 z-10 max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <button
              key={index}
              type="button"
              className="single-select-option w-full p-2 text-left hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
              onClick={() => handleSelect(option)}
            >
              <OptionComponent option={option} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SingleSelect