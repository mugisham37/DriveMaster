import React from 'react'
import type { DiscussionStatus } from '../../../types'

interface Props<T extends DiscussionStatus = DiscussionStatus> {
  status: T
  currentStatus: T
  setStatus: (status: T) => void
  children: React.ReactNode
}

export function StatusTab<T extends DiscussionStatus>({
  status,
  currentStatus,
  setStatus,
  children,
}: Props<T>): React.JSX.Element {
  const isActive = status === currentStatus

  return (
    <button
      onClick={() => setStatus(status)}
      className={`status-tab ${isActive ? 'active' : ''}`}
      aria-selected={isActive}
    >
      {children}
    </button>
  )
}

// Link-based version for navigation
interface LinkProps<T extends string = string> {
  status: T
  currentStatus: T
  href: string
  children: React.ReactNode
}

export function StatusTabLink<T extends string>({
  status,
  currentStatus,
  href,
  children,
}: LinkProps<T>): React.JSX.Element {
  const isActive = status === currentStatus

  return (
    <a
      href={href}
      className={`status-tab ${isActive ? 'active' : ''}`}
      aria-selected={isActive}
    >
      {children}
    </a>
  )
}