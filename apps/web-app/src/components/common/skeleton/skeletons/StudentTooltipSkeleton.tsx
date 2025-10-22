import React from 'react'

export function StudentTooltipSkeleton(): React.JSX.Element {
  return (
    <div className="student-tooltip-skeleton">
      <div className="header">
        <div className="skeleton-avatar"></div>
        <div className="info">
          <div className="skeleton-line skeleton-handle"></div>
          <div className="skeleton-line skeleton-name"></div>
        </div>
        <div className="skeleton-reputation"></div>
      </div>
      <div className="skeleton-line skeleton-text"></div>
      <div className="skeleton-line skeleton-text short"></div>
    </div>
  )
}