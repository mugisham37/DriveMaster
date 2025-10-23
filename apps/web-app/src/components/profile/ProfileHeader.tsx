import Link from 'next/link'
import { User } from '@/types'
import { Profile } from '@/lib/api/profile'
import { Avatar } from '@/components/common/Avatar'
import { HandleWithFlair } from '@/components/common/HandleWithFlair'
import { Reputation } from '@/components/common/Reputation'
import { TrackIcon } from '@/components/common/TrackIcon'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface ProfileHeaderProps {
  user: User & { numPublishedSolutions: number }
  profile: Profile
  tab: 'summary' | 'solutions' | 'testimonials' | 'contributions' | 'badges'
}

interface Track {
  id: number
  slug: string
  title: string
  iconUrl: string
}

interface HeaderTag {
  class: string
  icon: string
  title: string
}

export function ProfileHeader({ user, profile, tab }: ProfileHeaderProps) {
  // Mock top three tracks - in real implementation, this would come from API based on reputation
  const topThreeTracks: Track[] = [
    { id: 1, slug: 'javascript', title: 'JavaScript', iconUrl: '/assets/tracks/javascript.svg' },
    { id: 2, slug: 'python', title: 'Python', iconUrl: '/assets/tracks/python.svg' },
    { id: 3, slug: 'ruby', title: 'Ruby', iconUrl: '/assets/tracks/ruby.svg' }
  ]

  const headerTags: HeaderTag[] = []
  
  // Add header tags based on user status (matching Ruby logic)
  const extendedUser = user as User & { 
    numPublishedSolutions: number;
    isStaff?: boolean;
    isMaintainer?: boolean;
    isInsider?: boolean;
  };
  
  if (extendedUser.isStaff) {
    headerTags.push({ class: "tag staff", icon: "logo", title: "Exercism Staff" })
  }
  if (extendedUser.isMaintainer) {
    headerTags.push({ class: "tag maintainer", icon: "maintaining", title: "Maintainer" })
  }
  if (extendedUser.isInsider) {
    headerTags.push({ class: "tag insider", icon: "insiders", title: "Insider" })
  }
  
  // Take only first 2 tags (matching Ruby logic)
  const displayTags = headerTags.slice(0, 2)

  return (
    <header className="c-profile-header">
      <div className="lg-container">
        <div className="info-section">
          <Avatar 
            user={{
              avatarUrl: user.avatarUrl,
              handle: user.handle,
              flair: user.flair || null
            }} 
            size="large" 
          />
          
          <div className="details">
            <div className="name-section">
              <HandleWithFlair 
                handle={user.handle} 
                flair={user.flair || null}
              />
              {user.name && (
                <h1 className="name">{user.name}</h1>
              )}
            </div>
            
            <div className="stats">
              <Reputation value={user.reputation || '0'} />
              <div className="solutions-count">
                {user.numPublishedSolutions} published solutions
              </div>
            </div>
            
            {/* Header tags for staff, maintainer, insider */}
            {displayTags.length > 0 && (
              <div className="header-tags">
                {displayTags.map((tag, index) => (
                  <div key={index} className={tag.class} title={tag.title}>
                    <GraphicalIcon icon={tag.icon} />
                    <span>{tag.title}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Top three tracks based on reputation */}
            {topThreeTracks.length > 0 && (
              <div className="top-tracks">
                <h3>Top Languages</h3>
                <div className="tracks-list">
                  {topThreeTracks.map((track) => (
                    <Link key={track.id} href={`/tracks/${track.slug}`} className="track-link">
                      <TrackIcon iconUrl={track.iconUrl} title={track.title} />
                      <span>{track.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {profile.bio && (
              <p className="bio">{profile.bio}</p>
            )}
            
            <div className="social-links">
              {profile.website && (
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  Website
                </a>
              )}
              {profile.githubUsername && (
                <a 
                  href={`https://github.com/${profile.githubUsername}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  GitHub
                </a>
              )}
              {profile.twitterUsername && (
                <a 
                  href={`https://twitter.com/${profile.twitterUsername}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  Twitter
                </a>
              )}
            </div>
          </div>
        </div>

        <nav className="profile-nav">
          <Link 
            href={`/profiles/${user.handle}`}
            className={`nav-item ${tab === 'summary' ? 'active' : ''}`}
          >
            Summary
          </Link>
          <Link 
            href={`/profiles/${user.handle}/solutions`}
            className={`nav-item ${tab === 'solutions' ? 'active' : ''}`}
          >
            Solutions ({user.numPublishedSolutions})
          </Link>
          <Link 
            href={`/profiles/${user.handle}/testimonials`}
            className={`nav-item ${tab === 'testimonials' ? 'active' : ''}`}
          >
            Testimonials
          </Link>
          <Link 
            href={`/profiles/${user.handle}/contributions`}
            className={`nav-item ${tab === 'contributions' ? 'active' : ''}`}
          >
            Contributions
          </Link>
          <Link 
            href={`/profiles/${user.handle}/badges`}
            className={`nav-item ${tab === 'badges' ? 'active' : ''}`}
          >
            Badges
          </Link>
        </nav>
      </div>
    </header>
  )
}