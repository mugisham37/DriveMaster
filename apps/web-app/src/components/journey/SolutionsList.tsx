import React from 'react'
import { usePaginatedRequestQuery, Request } from '../../hooks/request-query'
import { ResultsZone } from '../common/ResultsZone'
import { FetchingBoundary } from '../common/FetchingBoundary'
import { Loading } from '../common/Loading'

interface Solution {
  id: number
  uuid: string
  exercise: {
    title: string
    slug: string
    iconUrl: string
  }
  track: {
    title: string
    slug: string
    iconUrl: string
  }
  status: string
  mentoringStatus: string
  testsStatus: string
  numStars: number
  numComments: number
  publishedAt?: string
  completedAt?: string
  privateUrl: string
  publicUrl?: string
}

interface SolutionsListProps {
  request: Request
  isEnabled: boolean
}

const DEFAULT_ERROR = new Error('Unable to load solutions')

export const SolutionsList: React.FC<SolutionsListProps> = ({
  request,
  isEnabled,
}) => {
  const {
    status,
    data,
    isFetching,
    error,
  } = usePaginatedRequestQuery<{
    results: Solution[]
    meta: {
      currentPage: number
      totalCount: number
      totalPages: number
    }
  }>(['journey-solutions'], {
    ...request,
    options: { ...request.options, enabled: isEnabled },
  })

  return (
    <article className="solutions-tab theme-dark">
      <ResultsZone isFetching={isFetching}>
        <FetchingBoundary
          status={status}
          error={error}
          defaultError={DEFAULT_ERROR}
        >
          {data ? (
            <div className="solutions-list">
              <div className="solutions-header">
                <h2>Your Solutions ({data.meta.totalCount})</h2>
              </div>
              <div className="solutions-grid">
                {data.results.map((solution) => (
                  <div key={solution.uuid} className="solution-card">
                    <div className="solution-header">
                      <img 
                        src={solution.exercise.iconUrl} 
                        alt={solution.exercise.title}
                        className="exercise-icon"
                      />
                      <div className="solution-info">
                        <h3>{solution.exercise.title}</h3>
                        <p className="track-name">{solution.track.title}</p>
                      </div>
                    </div>
                    <div className="solution-stats">
                      <span className="status">{solution.status}</span>
                      <span className="stars">⭐ {solution.numStars}</span>
                      <span className="comments">💬 {solution.numComments}</span>
                    </div>
                    <div className="solution-actions">
                      <a href={solution.privateUrl} className="btn-primary">
                        View Solution
                      </a>
                      {solution.publicUrl && (
                        <a href={solution.publicUrl} className="btn-secondary">
                          Public View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </FetchingBoundary>
      </ResultsZone>
    </article>
  )
}