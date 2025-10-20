import React, { forwardRef } from 'react'
import { GraphicalIcon } from './GraphicalIcon'
import { assembleClassNames } from '@/utils/assemble-classnames'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
  onFocus?: () => void
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

const WRAPPER_CLASSNAMES =
  'bg-backgroundColorD text-textColor6 flex flex-row flex-grow rounded-[5px] border-1 border-transparent py-[11px] px-[21px] text-16 max-w-[420px] focus-within:focused-input hover:cursor-text'

const INPUT_CLASSNAMES = 'border-none bg-inherit !w-[100%] portable-input'
const ICON_CLASSNAMES = 'w-[24px] h-[24px] my-auto mr-[16px] filter-textColor6'

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  disabled = false,
  autoFocus = false,
  onFocus,
  onBlur,
  onKeyDown,
}, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={assembleClassNames(WRAPPER_CLASSNAMES, className)}>
      <GraphicalIcon className={ICON_CLASSNAMES} icon="search" />
      <input
        ref={ref}
        type="text"
        className={INPUT_CLASSNAMES}
        style={{ all: 'unset' }}
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </div>
  )
})

SearchInput.displayName = 'SearchInput'
