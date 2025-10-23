import React from 'react'

type Props = {
  track: {
    title: string
    iconUrl: string
  }
  exercise: {
    title: string
    iconUrl: string
  }
}

export function SessionInfo({ track, exercise }: Props) {
  return (
    <div className="session-info">
      <div className="track-info">
        <img src={track.iconUrl} alt={`${track.title} track icon`} className="track-icon" />
        <span className="track-title">{track.title}</span>
      </div>
      <div className="exercise-info">
        <img src={exercise.iconUrl} alt={`${exercise.title} exercise icon`} className="exercise-icon" />
        <span className="exercise-title">{exercise.title}</span>
      </div>
    </div>
  )
}