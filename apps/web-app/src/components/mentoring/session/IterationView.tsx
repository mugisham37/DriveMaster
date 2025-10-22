import React from 'react'
import { Iteration } from '../../../types'

type Props = {
  iteration: Iteration
  isActive: boolean
  onClick: () => void
}

export function IterationView({ iteration, isActive, onClick }: Props) {
  return (
    <div
      className={`iteration-view ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="iteration-header">
        <h4>Iteration {iteration.number}</h4>
        <span className="timestamp">{iteration.submittedAt}</span>
      </div>
      <div className="iteration-content">
        {/* Add code viewer component here */}
      </div>
    </div>
  )
}