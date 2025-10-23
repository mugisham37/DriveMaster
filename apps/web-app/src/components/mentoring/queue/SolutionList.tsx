import React from 'react'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { ErrorBoundary } from '../../ErrorBoundary'
import { Pagination } from '../../common/Pagination'

type Props = {
  status: string
  error: Error | null
  page: number
  resolvedData: any
  setPage: (page: number) => void
}

export function SolutionList({
  status,
  error,
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
              {resolvedData.solutions.map((solution: any) => (
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