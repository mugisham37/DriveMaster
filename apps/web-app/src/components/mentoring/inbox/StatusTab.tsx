import React from 'react'
import type { DiscussionStatus } from '../../../types/mentoring'

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
}: Props<T>): JSX.Element {
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