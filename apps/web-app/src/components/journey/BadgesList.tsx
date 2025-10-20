import React from 'react'
import { usePaginatedRequestQuery, Request } from '../../hooks/request-query'
import { ResultsZone } from '../common/ResultsZone'
import { FetchingBoundary } from '../common/FetchingBoundary'

interface Badge {
  id: number
  uuid: string
  name: string
  description: string
  iconUrl: string
  rarity: string
  unlockedAt: string
  track?: {
    title: string
    slug: string
    iconUrl: string
  }
  percentageAwardedTo: number
}

interface BadgesListProps {
  request: Request
  isEnabled: boolean
}

const DEFAULT_ERROR = new Error('Unable to load badges')

export const BadgesList: React.FC<BadgesListProps> = ({
  request,
  isEnabled,
}) => {
  const {
    status,
    data,
    isFetching,
    error,
  } = usePaginatedRequestQuery<{
    results: Badge[]
    meta: {
      currentPage: number
      totalCount: number
      totalPages: number
    }
  }>(['journey-badges'], {
    ...request,
    options: { ...request.options, enabled: isEnabled },
  })

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#6B7280'
      case 'rare': return '#3B82F6'
      case 'ultimate': return '#8B5CF6'
      case 'legendary': return '#F59E0B'
      default: return '#6B7280'
    }
  }

  return (
    <article className="badges-tab theme-dark">
      <ResultsZone isFetching={isFetching}>
        <FetchingBoundary
          status={status}
          error={error}
          defaultError={DEFAULT_ERROR}
        >
          {data ? (
            <div className="badges-list">
              <div className="badges-header">
                <h2>Your Badges ({data.meta.totalCount})</h2>
              </div>
              <div className="badges-grid">
                {data.results.map((badge) => (
                  <div key={badge.uuid} className="badge-card">
                    <div className="badge-icon-container">
                      <img 
                        src={badge.iconUrl} 
                        alt={badge.name}
                        className="badge-icon"
                      />
                      <div 
                        className="rarity-indicator"
                        style={{ backgroundColor: getRarityColor(badge.rarity) }}
                      >
                        {badge.rarity}
                      </div>
                    </div>
                    <div className="badge-info">
                      <h3>{badge.name}</h3>
                      <p className="badge-description">{badge.description}</p>
                      {badge.track && (
                        <div className="badge-track">
                          <img 
                            src={badge.track.iconUrl} 
                            alt={badge.track.title}
                            className="track-icon"
                          />
                          <span>{badge.track.title}</span>
                        </div>
                      )}
                      <div className="badge-stats">
                        <span className="unlock-date">
                          Unlocked: {new Date(badge.unlockedAt).toLocaleDateString()}
                        </span>
                        <span className="percentage">
                          {badge.percentageAwardedTo.toFixed(1)}% of users have this
                        </span>
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