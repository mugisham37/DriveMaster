import React from 'react'
import Link from 'next/link'
import { Avatar } from './Avatar'
import { TrackIcon } from './TrackIcon'
import { ExerciseIcon } from './ExerciseIcon'
import { Reputation } from './Reputation'

interface CommunitySolutionProps {
  solution: {
    uuid: string
    url: string
    user: {
      handle: string
      flair?: string
      reputation?: string
      avatarUrl: string
    }
    exercise: {
      title: string
      iconUrl: string
    }
    track: {
      title: string
      iconUrl: string
    }
    publishedAt: string
    numStars: number
    numComments: number
    numLoc: number
    isStarred: boolean
    language: {
      name: string
      indent: number
    }
    snippet: string
  }
  context: 'exercise' | 'profile' | 'track'
}

export function CommunitySolution({ solution, context }: CommunitySolutionProps) {
  return (
    <div className="community-solution">
      <div className="solution-header">
        <div className="user-info">
          <Avatar 
            src={solution.user.avatarUrl} 
            handle={solution.user.handle}
            size="small"
          />
          <div className="user-details">
            <Link href={`/profiles/${solution.user.handle}`} className="user-handle">
              {solution.user.handle}
            </Link>
            {solution.user.reputation && (
              <Reputation value={solution.user.reputation} />
            )}
          </div>
        </div>
        
        <div className="exercise-info">
          <ExerciseIcon iconUrl={solution.exercise.iconUrl} />
          <span className="exercise-title">{solution.exercise.title}</span>
          <TrackIcon iconUrl={solution.track.iconUrl} title={solution.track.title} />
        </div>
      </div>

      <div className="solution-content">
        <pre className="code-snippet">
          <code>{solution.snippet}</code>
        </pre>
      </div>

      <div className="solution-footer">
        <div className="stats">
          <span className="stars">
            ⭐ {solution.numStars}
          </span>
          <span className="comments">
            💬 {solution.numComments}
          </span>
          <span className="loc">
            📝 {solution.numLoc} lines
          </span>
        </div>
        
        <div className="actions">
          <Link href={solution.url} className="btn-secondary btn-xs">
            View Solution
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CommunitySolution