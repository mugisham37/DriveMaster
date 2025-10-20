import React from 'react'
import { usePaginatedRequestQuery, Request } from '../../hooks/request-query'
import { ResultsZone } from '../common/ResultsZone'
import { FetchingBoundary } from '../common/FetchingBoundary'

interface ReputationToken {
  id: number
  uuid: string
  type: string
  value: number
  reason: string
  earnedOn: string
  track: {
    title: string
    slug: string
    iconUrl: string
  }
  exercise?: {
    title: string
    slug: string
    iconUrl: string
  }
}

interface ContributionsListProps {
  request: Request
  isEnabled: boolean
}

const DEFAULT_ERROR = new Error('Unable to load reputation')

export const ContributionsList: React.FC<ContributionsListProps> = ({
  request,
  isEnabled,
}) => {
  const {
    status,
    data,
    isFetching,
    error,
  } = usePaginatedRequestQuery<{
    results: ReputationToken[]
    meta: {
      currentPage: number
      totalCount: number
      totalPages: number
      totalReputation: number
    }
  }>(['journey-reputation'], {
    ...request,
    options: { ...request.options, enabled: isEnabled },
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'exercise_contribution': return '📝'
      case 'mentoring_session': return '👨‍🏫'
      case 'solution_star': return '⭐'
      case 'code_review': return '🔍'
      case 'publishing_solution': return '📤'
      default: return '🏆'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exercise_contribution': return '#10B981'
      case 'mentoring_session': return '#3B82F6'
      case 'solution_star': return '#F59E0B'
      case 'code_review': return '#8B5CF6'
      case 'publishing_solution': return '#6B7280'
      default: return '#EF4444'
    }
  }

  return (
    <article className="reputation-tab theme-dark">
      <ResultsZone isFetching={isFetching}>
        <FetchingBoundary
          status={status}
          error={error}
          defaultError={DEFAULT_ERROR}
        >
          {data ? (
            <div className="reputation-list">
              <div className="reputation-header">
                <h2>Your Reputation</h2>
                <div className="total-reputation">
                  Total: {data.meta.totalReputation} points
                </div>
              </div>
              <div className="reputation-tokens">
                {data.results.map((token) => (
                  <div key={token.uuid} className="reputation-token">
                    <div className="token-icon">
                      <span className="type-emoji">{getTypeIcon(token.type)}</span>
                      <div 
                        className="value-badge"
                        style={{ backgroundColor: getTypeColor(token.type) }}
                      >
                        +{token.value}
                      </div>
                    </div>
                    <div className="token-info">
                      <h3>{token.reason}</h3>
                      <div className="token-details">
                        <div className="track-info">
                          <img 
                            src={token.track.iconUrl} 
                            alt={token.track.title}
                            className="track-icon"
                          />
                          <span>{token.track.title}</span>
                        </div>
                        {token.exercise && (
                          <div className="exercise-info">
                            <img 
                              src={token.exercise.iconUrl} 
                              alt={token.exercise.title}
                              className="exercise-icon"
                            />
                            <span>{token.exercise.title}</span>
                          </div>
                        )}
                      </div>
                      <div className="earned-date">
                        {new Date(token.earnedOn).toLocaleDateString()}
                      </div>
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