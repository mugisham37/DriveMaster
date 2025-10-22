import React from 'react'

export function ConceptTooltipSkeleton(): React.JSX.Element {
  return (
    <div className="concept-tooltip-skeleton">
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-line skeleton-text"></div>
      <div className="skeleton-line skeleton-text short"></div>
    </div>
  )
}