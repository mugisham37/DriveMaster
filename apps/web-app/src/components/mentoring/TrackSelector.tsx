import React, { useState, useEffect } from 'react'
import { sendRequest } from '@/utils/send-request'

interface Track {
  slug: string
  title: string
  description?: string
  iconUrl: string
}

interface TrackSelectorProps {
  selected: string[]
  setSelected: (selected: string[]) => void
  tracksEndpoint: string
  onContinue: () => void
}

export default function TrackSelector({
  selected,
  setSelected,
  tracksEndpoint,
  onContinue
}: TrackSelectorProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const { fetch } = sendRequest({
          endpoint: tracksEndpoint,
          method: 'GET',
        })
        const response = await fetch
        setTracks(response.tracks || [])
      } catch (error) {
        console.error('Failed to fetch tracks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTracks()
  }, [tracksEndpoint])

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleTrackToggle = (trackSlug: string) => {
    if (selected.includes(trackSlug)) {
      setSelected(selected.filter(slug => slug !== trackSlug))
    } else {
      setSelected([...selected, trackSlug])
    }
  }

  if (loading) {
    return <div className="track-selector-loading">Loading tracks...</div>
  }

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
                checked={selected.includes(track.slug)}
                onChange={() => handleTrackToggle(track.slug)}
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
      
      {selected.length > 0 && (
        <div className="selected-tracks-message">
          <p>You&apos;ve selected {selected.length} track{selected.length !== 1 ? 's' : ''} to mentor.</p>
        </div>
      )}
      
      <div className="continue-button-container">
        <button
          onClick={onContinue}
          disabled={selected.length === 0}
          className="continue-button"
        >
          Continue
        </button>
      </div>
    </div>
  )
}