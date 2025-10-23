import React from 'react'
import Image from 'next/image'
import { MentoredTrackProgressList } from '../types'
import { GraphicalIcon } from '../../common'

export interface Props {
  tracks: MentoredTrackProgressList
  links: {
    mentoring: string
  }
}

export const MentoringSection: React.FC<Props> = ({ tracks, links }) => {
  if (tracks.length === 0) {
    return (
      <section className="empty-section">
        <GraphicalIcon icon="mentoring" />
        <h3 className="journey-h3 mb-24">
          You haven&apos;t mentored anyone yet
        </h3>
        <p>
          Start mentoring students to help them learn and earn reputation.
        </p>
        <a href="/mentoring" className="btn-primary">
          Start Mentoring
        </a>
      </section>
    )
  }

  return (
    <section className="mentoring-section">
      <header className="section-header">
        <GraphicalIcon icon="mentoring" />
        <h2 className="journey-h2">Your Mentoring</h2>
        <div className="header-summary">
          <div className="stat">
            <span className="value">{tracks.totals.discussions}</span>
            <span className="label">Discussions</span>
          </div>
          <div className="stat">
            <span className="value">{tracks.totals.students}</span>
            <span className="label">Students Helped</span>
          </div>
          <div className="stat">
            <span className="value">{tracks.sessionRatio.toFixed(1)}</span>
            <span className="label">Sessions per Student</span>
          </div>
        </div>
      </header>
      
      <div className="mentoring-tracks">
        {tracks.sort().items.slice(0, 5).map((track) => (
          <div key={track.slug} className="mentoring-track">
            <div className="track-info">
              <Image src={track.iconUrl} alt={track.title} className="track-icon" width={32} height={32} />
              <div className="track-details">
                <h4>{track.title}</h4>
                <p>{track.numStudents} students mentored</p>
              </div>
            </div>
            <div className="mentoring-stats">
              <span className="discussions">{track.numDiscussions} discussions</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="section-footer">
        <a href={links.mentoring} className="btn-secondary">
          View Mentoring Dashboard
        </a>
      </div>
    </section>
  )
}