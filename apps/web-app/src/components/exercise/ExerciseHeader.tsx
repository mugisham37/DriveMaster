import Link from 'next/link'
import { Exercise, Track, Solution } from '@/types'
import { ExerciseIcon } from '@/components/common/ExerciseIcon'
import { TrackIcon } from '@/components/common/TrackIcon'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

type TabType = 'overview' | 'iterations' | 'dig_deeper' | 'community_solutions' | 'mentoring'

interface UserTrack {
  id: number
  slug: string
  isExternal: boolean
}

interface ExerciseHeaderProps {
  exercise: Exercise
  track: Track
  solution?: Solution | null
  userTrack?: UserTrack
  selectedTab: TabType
}

export function ExerciseHeader({ exercise, track, solution, userTrack, selectedTab }: ExerciseHeaderProps) {
  const showIterationsTab = !userTrack?.isExternal
  const showDigDeeperTab = !exercise.isTutorial && exercise.hasApproaches
  const showCommunitySolutionsTab = !exercise.isTutorial
  const showMentoringTab = !userTrack?.isExternal && !exercise.isTutorial

  const digDeeperTabLocked = !userTrack?.isExternal && !solution?.unlockedHelp && !solution?.iterated
  const solutionsTabLocked = !userTrack?.isExternal && !solution?.unlockedHelp && !solution?.iterated
  const mentoringTabLocked = !userTrack?.isExternal && !solution?.iterated

  const getTabClass = (tab: TabType, locked = false) => {
    return `c-tab ${tab === selectedTab ? 'selected' : ''} ${locked ? 'locked' : ''}`
  }

  const getScrollIntoView = (tab: TabType) => {
    return tab === selectedTab ? { 'data-scroll-into-view': 'x' } : {}
  }

  const renderLockableTab = (
    content: React.ReactNode,
    href: string,
    tabName: TabType,
    locked: boolean,
    tooltipEndpoint?: string
  ) => {
    const cssClass = getTabClass(tabName, locked)
    const scrollProps = getScrollIntoView(tabName)

    if (locked) {
      return (
        <div
          className={cssClass}
          aria-label="This tab is locked"
          data-tooltip-type="automation-locked"
          data-endpoint={tooltipEndpoint}
          data-placement="bottom"
          data-interactive="true"
          {...scrollProps}
        >
          {content}
        </div>
      )
    }

    return (
      <Link href={href} className={cssClass} {...scrollProps}>
        {content}
      </Link>
    )
  }

  return (
    <header className="c-exercise-header">
      <div className="lg-container container">
        <nav className="breadcrumb">
          <Link href="/tracks" className="breadcrumb-item">
            Tracks
          </Link>
          <span className="separator">/</span>
          <Link href={track.links.self} className="breadcrumb-item">
            <TrackIcon iconUrl={track.iconUrl} title={track.title} />
            {track.title}
          </Link>
          <span className="separator">/</span>
          <span className="breadcrumb-item current">
            <ExerciseIcon iconUrl={exercise.iconUrl} title={exercise.title} />
            {exercise.title}
          </span>
        </nav>

        <div className="navbar">
          <div className="tabs" data-scrollable-container="true">
            {/* Overview Tab */}
            <Link
              href={`/tracks/${track.slug}/exercises/${exercise.slug}`}
              className={getTabClass('overview')}
              {...getScrollIntoView('overview')}
            >
              <GraphicalIcon icon="overview" />
              <span data-text="Overview">Overview</span>
            </Link>

            {/* Iterations Tab */}
            {showIterationsTab && (
              <Link
                href={`/tracks/${track.slug}/exercises/${exercise.slug}/iterations`}
                className={getTabClass('iterations')}
                {...getScrollIntoView('iterations')}
              >
                <GraphicalIcon icon="iteration" />
                <span data-text="Your iterations">Your iterations</span>
                {solution?.iterations && solution.iterations.length > 0 && (
                  <span className="count">{solution.iterations.length}</span>
                )}
              </Link>
            )}

            {/* Dig Deeper Tab */}
            {showDigDeeperTab && renderLockableTab(
              <>
                <GraphicalIcon icon="dig-deeper" />
                <span data-text="Dig Deeper">Dig Deeper</span>
              </>,
              `/tracks/${track.slug}/exercises/${exercise.slug}/dig-deeper`,
              'dig_deeper',
              digDeeperTabLocked,
              `/tracks/${track.slug}/exercises/${exercise.slug}/tooltip/locked-dig-deeper`
            )}

            {/* Community Solutions Tab */}
            {showCommunitySolutionsTab && renderLockableTab(
              <>
                <GraphicalIcon icon="community-solutions" />
                <span data-text="Community Solutions">Community Solutions</span>
              </>,
              `/tracks/${track.slug}/exercises/${exercise.slug}/solutions`,
              'community_solutions',
              solutionsTabLocked,
              `/tracks/${track.slug}/exercises/${exercise.slug}/tooltip/locked-solutions`
            )}

            {/* Mentoring Tab */}
            {showMentoringTab && renderLockableTab(
              <>
                <GraphicalIcon icon="mentoring" />
                <span data-text="Mentoring">Code Review</span>
                {solution && (
                  (() => {
                    const count = (solution.mentorDiscussions?.length || 0) + (solution.mentorRequests?.pending?.length || 0)
                    return count > 0 ? <span className="count">{count}</span> : null
                  })()
                )}
              </>,
              `/tracks/${track.slug}/exercises/${exercise.slug}/mentor-discussions`,
              'mentoring',
              mentoringTabLocked,
              `/tracks/${track.slug}/exercises/${exercise.slug}/tooltip/locked-mentoring`
            )}
          </div>

          {/* Editor Button */}
          {!userTrack?.isExternal && (
            <div className="editor-btn">
              <Link
                href={`/tracks/${track.slug}/exercises/${exercise.slug}/editor`}
                className="btn-primary btn-s"
              >
                <GraphicalIcon icon="editor" />
                Open in Editor
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}