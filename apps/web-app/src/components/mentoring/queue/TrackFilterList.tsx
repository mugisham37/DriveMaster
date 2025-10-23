import React from 'react'
import { MentoredTrack } from '../../../types'
import { Links } from '../Queue'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { ErrorBoundary } from '../../ErrorBoundary'

type Props = {
  status: string
  error: Error | null
  tracks: MentoredTrack[]
  isFetching: boolean
  value: MentoredTrack
  setValue: (track: MentoredTrack) => void
  cacheKey: string[]
  links: Links
}

export function TrackFilterList({
  status,
  tracks,
  value,
  setValue,
}: Props) {
  return (
    <div className="track-filter-list">
      <h3>Filter by Track</h3>
      <ErrorBoundary>
        {status === 'loading' ? (
          <LoadingSpinner />
        ) : (
          <div className="tracks-list">
            {tracks.map((track) => (
              <button
                key={track.slug}
                className={`track-button ${track.slug === value.slug ? 'selected' : ''}`}
                onClick={() => setValue(track)}
              >
                <img src={track.iconUrl} alt={`${track.title} track icon`} />
                <span>{track.title}</span>
              </button>
            ))}
          </div>
        )}
      </ErrorBoundary>
    </div>
  )
}