import React from 'react'

interface ResultsZoneProps {
  isFetching: boolean
  children: React.ReactNode
}

export const ResultsZone: React.FC<ResultsZoneProps> = ({ isFetching, children }) => {
  return (
    <div className={`results-zone ${isFetching ? 'fetching' : ''}`}>
      {children}
    </div>
  )
}