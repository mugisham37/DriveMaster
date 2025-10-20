'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { GraphicalIcon } from './GraphicalIcon'
import { TrackIcon } from './TrackIcon'

interface Track {
  slug: string
  title: string
  iconUrl: string
}

interface TrackSlugsMultiselectorProps {
  trackSlugs: Track[]
  selectedTrackSlugs: string[]
  onChange?: (selectedSlugs: string[]) => void
  placeholder?: string
  className?: string
}

export function TrackSlugsMultiselector({
  trackSlugs,
  selectedTrackSlugs,
  onChange,
  placeholder = 'Select tracks...',
  className = ''
}: TrackSlugsMultiselectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredTracks = trackSlugs.filter(track =>
    track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedTracks = trackSlugs.filter(track => 
    selectedTrackSlugs.includes(track.slug)
  )

  const handleToggleTrack = useCallback((trackSlug: string) => {
    const newSelection = selectedTrackSlugs.includes(trackSlug)
      ? selectedTrackSlugs.filter(slug => slug !== trackSlug)
      : [...selectedTrackSlugs, trackSlug]
    
    onChange?.(newSelection)
  }, [selectedTrackSlugs, onChange])

  const handleSelectAll = useCallback(() => {
    onChange?.(trackSlugs.map(track => track.slug))
  }, [trackSlugs, onChange])

  const handleClearAll = useCallback(() => {
    onChange?.([])
  }, [onChange])

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  return (
    <div className={`track-slugs-multiselector ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="multiselector-trigger"
      >
        <div className="selected-tracks">
          {selectedTracks.length === 0 ? (
            <span className="placeholder">{placeholder}</span>
          ) : selectedTracks.length <= 3 ? (
            <div className="selected-tracks-list">
              {selectedTracks.map(track => (
                <div key={track.slug} className="selected-track-item">
                  <TrackIcon iconUrl={track.iconUrl} title={track.title} />
                  <span>{track.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="selected-count">
              {selectedTracks.length} tracks selected
            </span>
          )}
        </div>
        <GraphicalIcon icon={isOpen ? 'chevron-up' : 'chevron-down'} />
      </button>

      {isOpen && (
        <div className="multiselector-dropdown">
          <div className="dropdown-header">
            <input
              type="text"
              placeholder="Search tracks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="dropdown-actions">
              <button
                type="button"
                onClick={handleSelectAll}
                className="action-button"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="action-button"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="dropdown-content">
            {filteredTracks.length === 0 ? (
              <div className="no-results">No tracks found</div>
            ) : (
              filteredTracks.map(track => (
                <label
                  key={track.slug}
                  className="track-option"
                >
                  <input
                    type="checkbox"
                    checked={selectedTrackSlugs.includes(track.slug)}
                    onChange={() => handleToggleTrack(track.slug)}
                    className="track-checkbox"
                  />
                  <TrackIcon iconUrl={track.iconUrl} title={track.title} />
                  <span className="track-title">{track.title}</span>
                  <span className="track-slug">({track.slug})</span>
                </label>
              ))
            )}
          </div>

          <div className="dropdown-footer">
            <span className="selection-summary">
              {selectedTrackSlugs.length} of {trackSlugs.length} tracks selected
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrackSlugsMultiselector
