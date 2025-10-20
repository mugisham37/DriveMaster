import Link from 'next/link'
import { User } from 'next-auth'
import { Track } from '@/types'
import { TrackIcon } from '@/components/common/TrackIcon'
import { TrackMenu } from './TrackMenu'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

type TrackTabType = 'overview' | 'concepts' | 'exercises' | 'about' | 'build'

interface UserTrack {
  id: number
  slug: string
  isJoined: boolean
  isExternal: boolean
  isCourse: boolean
  isPracticeMode: boolean
}

interface TrackHeaderProps {
  track: Track
  isJoined: boolean
  user: User | null
  userTrack?: UserTrack
  selectedTab: TrackTabType
}

export function TrackHeader({ track, isJoined, user, userTrack, selectedTab }: TrackHeaderProps) {
  const practiceMode = userTrack?.isPracticeMode || false
  const external = userTrack?.isExternal || false
  const course = userTrack?.isCourse || false

  const getTabClass = (tab: TrackTabType) => {
    return `c-tab-2 ${tab === selectedTab ? 'selected' : ''}`
  }

  const getScrollIntoView = (tab: TrackTabType) => {
    return tab === selectedTab ? { 'data-scroll-into-view': 'x' } : {}
  }

  const renderTags = () => {
    if (!practiceMode) return null
    
    return (
      <div className="tags">
        <div className="c-tag --practice-mode --compact">
          <GraphicalIcon icon="practice-mode" />
          <span>Practice Mode</span>
        </div>
      </div>
    )
  }

  const renderTabs = () => {
    const tabs = []

    // Overview/About tab for external tracks
    if (userTrack?.isExternal) {
      tabs.push(
        <Link
          key="about"
          href={`/tracks/${track.slug}`}
          className={getTabClass('about')}
          {...getScrollIntoView('about')}
        >
          <GraphicalIcon icon="info-circle" />
          <span>About {track.title}</span>
        </Link>
      )
    } else {
      tabs.push(
        <Link
          key="overview"
          href={`/tracks/${track.slug}`}
          className={getTabClass('overview')}
          {...getScrollIntoView('overview')}
        >
          <GraphicalIcon icon="overview" />
          <span>Overview</span>
        </Link>
      )
    }

    // Concepts tab (only for course tracks not in practice mode)
    if (course && !practiceMode) {
      tabs.push(
        <Link
          key="concepts"
          href={`/tracks/${track.slug}/concepts`}
          className={getTabClass('concepts')}
          {...getScrollIntoView('concepts')}
        >
          <GraphicalIcon icon="concepts" />
          <span>Learn</span>
        </Link>
      )
    }

    // Exercises tab
    tabs.push(
      <Link
        key="exercises"
        href={`/tracks/${track.slug}/exercises`}
        className={getTabClass('exercises')}
        {...getScrollIntoView('exercises')}
      >
        <GraphicalIcon icon="exercises" />
        <span>Practice</span>
      </Link>
    )

    // About tab for non-external tracks
    if (!external) {
      tabs.push(
        <Link
          key="about"
          href={`/tracks/${track.slug}/about`}
          className={getTabClass('about')}
          {...getScrollIntoView('about')}
        >
          <GraphicalIcon icon="info-circle" />
          <span>About {track.title}</span>
        </Link>
      )
    }

    // Build tab (for maintainers - commented out as per original Ruby code)
    // if (user?.isMaintainer) {
    //   tabs.push(
    //     <Link
    //       key="build"
    //       href={`/tracks/${track.slug}/build`}
    //       className={getTabClass('build')}
    //       {...getScrollIntoView('build')}
    //     >
    //       <GraphicalIcon icon="building" />
    //       <span>Build Status</span>
    //     </Link>
    //   )
    // }

    return tabs
  }

  return (
    <header className="c-track-header">
      <div className="lg-container container">
        <div className="track-header-top">
          <nav className="breadcrumb">
            <Link href="/tracks" className="breadcrumb-item">
              Tracks
            </Link>
            <span className="separator">/</span>
            <span className="breadcrumb-item current">
              <TrackIcon iconUrl={track.iconUrl} title={track.title} />
              {track.title}
            </span>
          </nav>
          
          {user && isJoined && (
            <TrackMenu track={track} userTrack={userTrack} />
          )}
        </div>

        <div className="track-info">
          <div className="track-details">
            <h1 className="track-title">{track.title}</h1>
            
            {renderTags()}
            
            <div className="track-stats">
              <div className="stat">
                <span className="value">{track.numExercises}</span>
                <span className="label">Exercises</span>
              </div>
              {track.course && (
                <div className="stat">
                  <span className="value">{track.numConcepts}</span>
                  <span className="label">Concepts</span>
                </div>
              )}
              <div className="stat">
                <span className="value">{track.numSolutions.toLocaleString()}</span>
                <span className="label">Solutions</span>
              </div>
            </div>
          </div>

          <div className="track-actions">
            {user ? (
              isJoined ? (
                <Link 
                  href={`${track.links.self}/exercises`}
                  className="btn-primary"
                >
                  Continue Learning
                </Link>
              ) : (
                <Link 
                  href={`${track.links.self}/join`}
                  className="btn-primary"
                >
                  Join Track
                </Link>
              )
            ) : (
              <Link 
                href="/auth/signin"
                className="btn-primary"
              >
                Sign in to Join
              </Link>
            )}
          </div>
        </div>

        <div className="navbar">
          <div className="tabs" data-scrollable-container="true">
            {renderTabs()}
          </div>
        </div>
      </div>
    </header>
  )
}