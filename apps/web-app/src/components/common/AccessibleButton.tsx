import React, { forwardRef } from 'react'
import { assembleClassNames } from '@/utils/assemble-classnames'
import { getAriaAttributes } from '@/hooks/useAccessibility'

export interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  ariaExpanded?: boolean
  ariaPressed?: boolean
  children: React.ReactNode
}

const buttonVariants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary', 
  danger: 'btn-danger',
  ghost: 'btn-ghost'
}

const buttonSizes = {
  sm: 'btn-s',
  md: 'btn-m',
  lg: 'btn-l'
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText = 'Loading...',
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaPressed,
  className = '',
  disabled,
  children,
  ...buttonProps
}, ref) => {
  const isDisabled = disabled || loading

  const ariaAttributes = getAriaAttributes({
    ...(ariaLabel && { label: ariaLabel }),
    ...(ariaDescribedBy && { describedBy: ariaDescribedBy }),
    ...(ariaExpanded !== undefined && { expanded: ariaExpanded }),
    disabled: isDisabled,
    busy: loading
  })

  // Add aria-pressed for toggle buttons
  if (ariaPressed !== undefined) {
    ariaAttributes['aria-pressed'] = ariaPressed
  }

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      className={assembleClassNames(
        'btn',
        buttonVariants[variant],
        buttonSizes[size],
        loading ? 'opacity-75 cursor-not-allowed' : '',
        className
      )}
      {...ariaAttributes}
      {...buttonProps}
    >
      {loading ? (
        <span className="flex items-center">
          <svg 
            className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span aria-live="polite">{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
})

AccessibleButton.displayName = 'AccessibleButton'
