import React from 'react'

export interface SingleSelectOption {
  value: string
  label: string
}

export interface SingleSelectProps<T = string> {
  value: T
  setValue: (value: T) => void
  options: T[]
  placeholder?: string
  className?: string
  disabled?: boolean
  SelectedComponent?: React.ComponentType<{ option: T }>
  OptionComponent?: React.ComponentType<{ option: T }>
}

export function SingleSelect<T = string>({ 
  value, 
  setValue, 
  options, 
  placeholder = "Select an option...",
  className = "",
  disabled = false,
  SelectedComponent,
  OptionComponent
}: SingleSelectProps<T>): React.JSX.Element {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(e.target.value, 10)
    if (!isNaN(selectedIndex) && options[selectedIndex]) {
      setValue(options[selectedIndex])
    }
  }

  const selectedIndex = options.findIndex(option => option === value)

  return (
    <div className={`single-select ${className}`}>
      {SelectedComponent && <SelectedComponent option={value} />}
      <select 
        value={selectedIndex >= 0 ? selectedIndex : ""} 
        onChange={handleChange}
        disabled={disabled}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option key={index} value={index}>
            {OptionComponent ? (
              <OptionComponent option={option} />
            ) : (
              String(option)
            )}
          </option>
        ))}
      </select>
    </div>
  )
}

export default SingleSelect