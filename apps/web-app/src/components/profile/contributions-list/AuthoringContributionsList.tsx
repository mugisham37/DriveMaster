import React from 'react'
import { usePaginatedRequestQuery, type Request } from '@/hooks/request-query'
import { useList } from '@/hooks/use-list'
import { Pagination } from '@/components/common'
import ExerciseWidget from '@/components/common/ExerciseWidget'
import { FetchingBoundary } from '@/components/FetchingBoundary'
import { ResultsZone } from '@/components/ResultsZone'
import type { ExerciseAuthorship, PaginatedResult } from '@/components/types'
import { scrollToTop } from '@/utils/scroll-to-top'

const DEFAULT_ERROR = new Error('Unable to load authoring contributions')

export const AuthoringContributionsList = ({
  request: initialRequest,
}: {
  request: Request
}): React.JSX.Element => {
  const { request, setPage } = useList(initialRequest)
  const {
    status,
    data: resolvedData,
    isFetching,
    error,
  } = usePaginatedRequestQuery<PaginatedResult<ExerciseAuthorship[]>>(
    [request.endpoint, request.query || {}], 
    request
  )

  return (
    <ResultsZone isFetching={isFetching}>
      <FetchingBoundary
        error={error}
        status={status}
        defaultError={DEFAULT_ERROR}
      >
        {resolvedData ? (
          <React.Fragment>
            <div className="authoring">
              <div className="exercises">
                {resolvedData.results.map((authorship: ExerciseAuthorship) => {
                  return (
                    /*large*/
                    <ExerciseWidget
                      key={authorship.exercise.slug}
                      exercise={{
                        ...authorship.exercise,
                        isRecommended: false,
                        links: { self: '' }
                      }}
                    />
                  )
                })}
              </div>
            </div>
            <Pagination
              disabled={resolvedData === undefined}
              current={(request.query?.page as number) || 1}
              total={resolvedData.meta.totalPages}
              setPage={(p) => {
                setPage(p)
                scrollToTop('profile-contributions', 32)
              }}
            />
          </React.Fragment>
        ) : null}
      </FetchingBoundary>
    </ResultsZone>
  )
}
