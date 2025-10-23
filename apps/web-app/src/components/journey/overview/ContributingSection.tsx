import React from 'react'
import Image from 'next/image'
import { TrackContribution } from '../../../types'
import { GraphicalIcon } from '../../common'

export interface Props {
  tracks: TrackContribution[]
  links: {
    contributing: string
  }
}

export const ContributingSection: React.FC<Props> = ({ tracks, links }) => {
  const allTrack = tracks.find((track) => (track as any).slug === null)
  const totalContributions = (allTrack as any)?.totalReputation || 0

  if (totalContributions === 0) {
    return (
      <section className="empty-section">
        <GraphicalIcon icon="contribute" />
        <h3 className="journey-h3 mb-24">
          You haven&apos;t contributed yet
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
        {tracks.filter(track => (track as any).slug !== null).slice(0, 5).map((track) => (
          <div key={(track as any).slug} className="contribution-track">
            <div className="track-info">
              <Image src={(track as any).iconUrl} alt={(track as any).title} className="track-icon" width={32} height={32} />
              <div className="track-details">
                <h4>{(track as any).title}</h4>
                <p>Contributions to this track</p>
              </div>
            </div>
            <div className="contribution-stats">
              <span className="reputation">{(track as any).totalReputation} reputation</span>
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