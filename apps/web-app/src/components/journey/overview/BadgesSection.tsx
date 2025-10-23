import React from 'react'
import Image from 'next/image'
import { BadgeList } from '../../../types'

export interface Props {
  badges: BadgeList
  links: {
    badges: string
  }
}

const MAX_BADGES = 6

export const BadgesSection: React.FC<Props> = ({ badges, links }) => {
  const badgesToShow = badges.sort().items.slice(0, MAX_BADGES)

  return (
    <section className="badges-section">
      <div className="info">
        <div className="journey-h3">A Glimpse of Your Badges</div>
        <div className="badge-summary">
          <span className="total-count">{badges.length} badges earned</span>
        </div>
        <a href={links.badges} className="btn-secondary">
          View All Badges
        </a>
      </div>
      
      <div className="badges-grid">
        {badgesToShow.map((badge) => (
          <div key={badge.uuid} className="badge-medallion">
            <Image 
              src={(badge as any).iconUrl ?? (badge as any).iconName ?? '/default-badge.png'} 
              alt={badge.name}
              className="badge-icon"
              width={48}
              height={48}
            />
            <div className="badge-info">
              <h4>{badge.name}</h4>
              <p className="badge-description">{badge.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {badges.length > MAX_BADGES && (
        <div className="more-badges">
          <span>And {badges.length - MAX_BADGES} more...</span>
        </div>
      )}
    </section>
  )
}