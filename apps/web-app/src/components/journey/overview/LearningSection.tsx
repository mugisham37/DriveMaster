import React from 'react'
import { TrackProgressList } from '../types'
import { GraphicalIcon } from '../../common'

export interface Props {
  tracks: TrackProgressList
  links: {
    tracks: string
  }
}

export const LearningSection: React.FC<Props> = ({ tracks, links }) => {
  if (tracks.length === 0) {
    return (
      <section className="empty-section">
        <GraphicalIcon icon="exercises" />
        <h3 className="journey-h3 mb-24">
          You haven't joined any tracks yet
        </h3>
        <p>
          Join a track to start your learning journey and track your progress.
        </p>
        <a href="/tracks" className="btn-primary">
          Browse Tracks
        </a>
      </section>
    )
  }

  return (
    <section className="learning-section">
      <header className="section-header">
        <GraphicalIcon icon="exercises" />
        <h2 className="journey-h2">Your Learning</h2>
        <div className="header-summary">
          <div className="stat">
            <span className="value">{tracks.numCompletedExercises}</span>
            <span className="label">Exercises Completed</span>
          </div>
          <div className="stat">
            <span className="value">{tracks.numConceptsLearnt}</span>
            <span className="label">Concepts Learnt</span>
          </div>
          <div className="stat">
            <span className="value">{tracks.completion.toFixed(1)}%</span>
            <span className="label">Overall Progress</span>
          </div>
        </div>
      </header>
      
      <div className="tracks-progress">
        {tracks.sort().items.slice(0, 5).map((track) => (
          <div key={track.slug} className="track-progress">
            <div className="track-info">
              <img src={track.iconUrl} alt={track.title} className="track-icon" />
              <div className="track-details">
                <h4>{track.title}</h4>
                <p>{track.numCompletedExercises} / {track.numExercises} exercises</p>
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${track.completion}%` }}
              />
            </div>
            <span className="completion-percentage">
              {track.completion.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      
      <div className="section-footer">
        <a href={links.tracks} className="btn-secondary">
          View All Tracks
        </a>
      </div>
    </section>
  )
}