import React from 'react'

interface ResultsZoneProps {
  children: React.ReactNode
  className?: string
  isFetching?: boolean
}

export function ResultsZone({
  children,
  className = '',
  isFetching
}: ResultsZoneProps): React.JSX.Element {
  return (
    <div className={`results-zone ${className} ${isFetching ? 'fetching' : ''}`}>
      {children}
    </div>
  )
}