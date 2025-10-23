import React, { useState } from 'react'
import type { Track } from '../types'

interface TrackSelectorProps {
  tracks: Track[]
  selectedTracks: string[]
  onTrackToggle: (trackSlug: string) => void
  onContinue: () => void
}

export default function TrackSelector({
  tracks,
  selectedTracks,
  onTrackToggle,
  onContinue
}: TrackSelectorProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="track-selector">
      <div className="track-selector-header">
        <h2>Select Tracks to Mentor</h2>
        <p>Choose the programming tracks you&apos;d like to mentor students in.</p>
      </div>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search tracks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="tracks-list">
        {filteredTracks.map((track) => (
          <div key={track.slug} className="track-item">
            <label className="track-label">
              <input
                type="checkbox"
                checked={selectedTracks.includes(track.slug)}
                onChange={() => onTrackToggle(track.slug)}
                className="track-checkbox"
              />
              <div className="track-info">
                <img src={track.iconUrl} alt={`${track.title} track icon`} className="track-icon" />
                <div className="track-details">
                  <h3>{track.title}</h3>
                  {track.description && (
                    <p className="track-description">{track.description}</p>
                  )}
                </div>
              </div>
            </label>
          </div>
        ))}
      </div>
      
      {selectedTracks.length > 0 && (
        <div className="selected-tracks-message">
          <p>You&apos;ve selected {selectedTracks.length} track{selectedTracks.length !== 1 ? 's' : ''} to mentor.</p>
        </div>
      )}
      
      <div className="continue-button-container">
        <button
          onClick={onContinue}
          disabled={selectedTracks.length === 0}
          className="continue-button"
        >
          Continue
        </button>
      </div>
    </div>
  )
}