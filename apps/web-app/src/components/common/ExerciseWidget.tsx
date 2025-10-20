'use client'

import React from 'react'
import Link from 'next/link'
import { ExerciseIcon } from './ExerciseIcon'
import { TrackIcon } from './TrackIcon'
import { GraphicalIcon } from './GraphicalIcon'
import ExerciseStatusDot from '../student/ExerciseStatusDot'
import { GenericTooltip } from '../misc/ExercismTippy'

interface Exercise {
  id: number
  slug: string
  title: string
  iconUrl: string
  difficulty: number
  blurb: string
  isUnlocked: boolean
  isRecommended: boolean
  status: 'available' | 'started' | 'completed' | 'published' | 'locked'
  links: {
    self: string
    tooltip?: string
  }
}

interface UserTrack {
  id: number
  slug: string
  title: string
  iconUrl: string
  isJoined: boolean
}

interface Solution {
  uuid: string
  status: string
  mentoringStatus: string
  publishedIterationHeadTestsStatus: string
  hasNotifications: boolean
  numStars: number
  numComments: number
  numViews: number
  isOutOfDate: boolean
}

interface ExerciseWidgetProps {
  exercise: Exercise
  userTrack?: UserTrack
  solution?: Solution
  withTooltip?: boolean
  renderBlurb?: boolean
  renderTrack?: boolean
  recommended?: boolean
  skinny?: boolean
  className?: string
}

export function ExerciseWidget({
  exercise,
  userTrack,
  solution,
  withTooltip = false,
  renderBlurb = true,
  renderTrack = true,
  recommended = false,
  skinny = false,
  className = ''
}: ExerciseWidgetProps): React.React.JSX.Element {
  const isLocked = exercise.status === 'locked'
  const isRecommended = recommended || exercise.isRecommended

  const difficultyStars = Array.from({ length: 10 }, (_, i) => (
    <span
      key={i}
      className={`difficulty-star ${i < exercise.difficulty ? 'filled' : 'empty'}`}
    >
      ★
    </span>
  ))

  const widgetContent = (
    <div className={`exercise-widget ${skinny ? 'skinny' : ''} ${isLocked ? 'locked' : ''} ${className}`}>
      {isRecommended && (
        <div className="recommended-badge">
          <GraphicalIcon icon="recommended" />
          <span>Recommended</span>
        </div>
      )}

      <div className="exercise-widget-header">
        <ExerciseIcon iconUrl={exercise.iconUrl} title={exercise.title} />
        
        <div className="exercise-info">
          <div className="exercise-title-row">
            <h3 className="exercise-title">{exercise.title}</h3>
            {!skinny && (
              <div className="exercise-difficulty">
                {difficultyStars}
              </div>
            )}
          </div>

          {renderTrack && userTrack && (
            <div className="exercise-track">
              <TrackIcon iconUrl={userTrack.iconUrl} title={userTrack.title} />
              <span>{userTrack.title}</span>
            </div>
          )}

          {renderBlurb && !skinny && exercise.blurb && (
            <p className="exercise-blurb">{exercise.blurb}</p>
          )}
        </div>

        <div className="exercise-status">
          <ExerciseStatusDot
            exerciseStatus={exercise.status as any}
            type="exercise"
            links={{
              tooltip: exercise.links.tooltip || '',
              exercise: exercise.links.self
            }}
          />
        </div>
      </div>

      {solution && !skinny && (
        <div className="exercise-widget-footer">
          <div className="solution-stats">
            {solution.numStars > 0 && (
              <div className="stat">
                <GraphicalIcon icon="star" />
                <span>{solution.numStars}</span>
              </div>
            )}
            {solution.numComments > 0 && (
              <div className="stat">
                <GraphicalIcon icon="comment" />
                <span>{solution.numComments}</span>
              </div>
            )}
            {solution.numViews > 0 && (
              <div className="stat">
                <GraphicalIcon icon="eye" />
                <span>{solution.numViews}</span>
              </div>
            )}
          </div>

          {solution.hasNotifications && (
            <div className="notification-indicator">
              <GraphicalIcon icon="notification" />
            </div>
          )}

          {solution.isOutOfDate && (
            <div className="out-of-date-indicator">
              <GraphicalIcon icon="warning" />
              <span>Out of date</span>
            </div>
          )}
        </div>
      )}

      {isLocked && (
        <div className="locked-overlay">
          <GraphicalIcon icon="lock" />
          <span>Locked</span>
        </div>
      )}
    </div>
  )

  if (withTooltip && exercise.links.tooltip) {
    return (
      <GenericTooltip content="Loading exercise details...">
        {isLocked ? (
          <div className="exercise-widget-wrapper">
            {widgetContent}
          </div>
        ) : (
          <Link href={exercise.links.self} className="exercise-widget-link">
            {widgetContent}
          </Link>
        )}
      </GenericTooltip>
    )
  }

  return isLocked ? (
    <div className="exercise-widget-wrapper">
      {widgetContent}
    </div>
  ) : (
    <Link href={exercise.links.self} className="exercise-widget-link">
      {widgetContent}
    </Link>
  )
}

export default ExerciseWidget
