import React from 'react'

interface Track {
  id: number
  slug: string
  title: string
  iconUrl: string
}

interface ListProps {
  tracks: Track[]
}

export function List({ tracks }: ListProps) {
  return (
    <div className="tracks-list">
      {tracks.map(track => (
        <div key={track.id} className="track-item">
          <img src={track.iconUrl} alt={track.title} />
          <h3>{track.title}</h3>
        </div>
      ))}
    </div>
  )
}