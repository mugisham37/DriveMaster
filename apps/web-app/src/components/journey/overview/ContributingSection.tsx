import React from 'react'
import { TrackContribution } from '../../../types'
import { GraphicalIcon } from '../../common'

export interface Props {
  tracks: TrackContribution[]
  links: {
    contributing: string
  }
}

export const ContributingSection: React.FC<Props> = ({ tracks, links }) => {
  const allTrack = tracks.find((track) => track.slug === null)
  const totalContributions = allTrack?.totalReputation || 0

  if (totalContributions === 0) {
    return (
      <section className="empty-section">
        <GraphicalIcon icon="contribute" />
        <h3 className="journey-h3 mb-24">
          You haven't contributed yet
        </h3>
        <p>
          Contribute to Exercism by writing exercises, mentoring, or helping with the platform.
        </p>
        <a href="/contributing" className="btn-primary">
          Start Contributing
        </a>
      </section>
    )
  }

  return (
    <section className="contributing-section">
      <header className="section-header">
        <GraphicalIcon icon="contribute" />
        <h2 className="journey-h2">
          Your Contributions
        </h2>
        <div className="header-summary">
          <div className="stat">
            <span className="value">{totalContributions}</span>
            <span className="label">Total Reputation from Contributing</span>
          </div>
        </div>
      </header>
      
      <div className="contribution-tracks">
        {tracks.filter(track => track.slug !== null).slice(0, 5).map((track) => (
          <div key={track.slug} className="contribution-track">
            <div className="track-info">
              <img src={track.iconUrl} alt={track.title} className="track-icon" />
              <div className="track-details">
                <h4>{track.title}</h4>
                <p>Contributions to this track</p>
              </div>
            </div>
            <div className="contribution-stats">
              <span className="reputation">{track.totalReputation} reputation</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="section-footer">
        <a href={links.contributing} className="btn-secondary">
          View All Contributions
        </a>
      </div>
    </section>
  )
}