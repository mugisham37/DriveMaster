import React from 'react'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { ErrorBoundary } from '../../ErrorBoundary'
import { Pagination } from '../../common/Pagination'

interface SolutionData {
  id: string
  // Add other solution properties as needed
}

interface ResolvedData {
  solutions: SolutionData[]
  meta: {
    totalPages: number
    currentPage: number
  }
}

type Props = {
  status: string
  error: Error | null
  page: number
  resolvedData: ResolvedData
  setPage: (page: number) => void
}

export function SolutionList({
  status,
  page,
  resolvedData,
  setPage,
}: Props) {
  return (
    <div className="solution-list">
      <ErrorBoundary>
        {status === 'loading' ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="solutions">
              {resolvedData.solutions.map((solution: SolutionData) => (
                <div key={solution.id} className="solution-card">
                  {/* Render solution card content */}
                </div>
              ))}
            </div>
            <Pagination
              current={page}
              total={resolvedData.meta.totalPages}
              setPage={setPage}
            />
          </>
        )}
      </ErrorBoundary>
    </div>
  )
}