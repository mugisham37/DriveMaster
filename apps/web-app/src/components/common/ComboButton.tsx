import React from 'react'

interface ComboButtonProps {
  enabled?: boolean
  children: React.ReactNode
  className?: string
}

export function ComboButton({ enabled = true, children, className = '' }: ComboButtonProps) {
  return (
    <div className={`combo-button ${enabled ? 'enabled' : 'disabled'} ${className}`}>
      {children}
    </div>
  )
}

interface PrimarySegmentProps {
  children: React.ReactNode
}

export function PrimarySegment({ children }: PrimarySegmentProps) {
  return (
    <div className="primary-segment">
      {children}
    </div>
  )
}

interface DropdownSegmentProps {
  children: React.ReactNode
}

export function DropdownSegment({ children }: DropdownSegmentProps) {
  return (
    <div className="dropdown-segment">
      {children}
    </div>
  )
}