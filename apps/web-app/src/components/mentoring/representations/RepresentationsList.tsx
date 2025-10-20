import React from 'react'
import { FetchingBoundary } from '../../common/FetchingBoundary'
import { Pagination } from '../../common/Pagination'
import { GraphicalIcon } from '../../common/GraphicalIcon'
import { TrackIcon } from '../../common/TrackIcon'
import { ExerciseIcon } from '../../common/ExerciseIcon'
import { scrollToTop } from '@/utils/scroll-to-top'
import type { ExerciseRepresentation } from '../../../types'

type APIResponse = {
  results: readonly ExerciseRepresentation[]
  meta: {
    currentPage: number
    totalPages: number
    totalCount: number
  }
}

type Props = {
  resolvedData: APIResponse | undefined
  status: 'loading' | 'error' | 'success'
  refetch: () => void
  setPage: (page: number) => void
  type: 'admin' | 'with-feedback' | 'without-feedback'
}

const DEFAULT_ERROR = new Error('Unable to load representations')

export function RepresentationsList({
  resolvedData,
  status,

  setPage,
  type
}: Props): React.JSX.Element {
  return (
    <>
      <FetchingBoundary
        status={status}
        error={null}
        defaultError={DEFAULT_ERROR}
      >
        {resolvedData ? (
          resolvedData.results.length === 0 ? (
            <div className="no-representations">
              <GraphicalIcon icon="automation" />
              <h2>No representations found</h2>
              <p>
                {type === 'without-feedback' 
                  ? "There are no representations without feedback for your selected criteria."
                  : type === 'with-feedback'
                  ? "There are no representations with feedback for your selected criteria."
                  : "There are no representations for your selected criteria."
                }
              </p>
            </div>
          ) : (
            <div className="representations">
              {resolvedData.results.map((representation) => (
                <RepresentationItem
                  key={representation.id}
                  representation={representation}
                  type={type}
                />
              ))}
            </div>
          )
        ) : null}
      </FetchingBoundary>

      {resolvedData && resolvedData.meta.totalPages > 1 && (
        <Pagination
          disabled={false}
          current={resolvedData.meta.currentPage}
          total={resolvedData.meta.totalPages}
          setPage={(p) => {
            setPage(p)
            scrollToTop()
          }}
        />
      )}
    </>
  )
}

function RepresentationItem({
  representation,
  type
}: {
  representation: ExerciseRepresentation
  type: string
}): React.JSX.Element {
  const getRepresentationUrl = () => {
    const baseUrl = `/mentoring/automation/representations/${representation.id}`
    return type === 'with-feedback' 
      ? `${baseUrl}?from=with-feedback`
      : type === 'admin'
      ? `${baseUrl}?from=admin`
      : baseUrl
  }

  return (
    <a 
      href={getRepresentationUrl()}
      className="representation-item"
    >
      <div className="representation-header">
        <div className="track-exercise">
          <TrackIcon 
            iconUrl={representation.track.iconUrl}
            title={representation.track.title}
          />
          <ExerciseIcon 
            iconUrl={representation.exercise.iconUrl}
            title={representation.exercise.title}
          />
          <div className="info">
            <div className="track-title">{representation.track.title}</div>
            <div className="exercise-title">{representation.exercise.title}</div>
          </div>
        </div>
        
        <div className="stats">
          <div className="stat">
            <GraphicalIcon icon="submissions" />
            <span>{representation.numSubmissions}</span>
          </div>
          {representation.feedbackType && (
            <div className="feedback-type">
              <GraphicalIcon icon="feedback" />
              <span>{representation.feedbackType}</span>
            </div>
          )}
        </div>
      </div>

      {representation.lastSubmittedAt && (
        <div className="last-submitted">
          Last submitted: {new Date(representation.lastSubmittedAt).toLocaleDateString()}
        </div>
      )}
    </a>
  )
}