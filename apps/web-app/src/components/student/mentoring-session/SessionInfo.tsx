import React from 'react'
import { MentorSessionTrack, MentorSessionExercise } from '../../../types'

interface Mentor {
  id: number
  avatarUrl: string
  name: string
  bio: string
  handle: string
  reputation: number
  numDiscussions: number
  pronouns?: string[]
}

interface SessionInfoProps {
  track: MentorSessionTrack
  exercise: MentorSessionExercise
  mentor?: Mentor | undefined
}

export function SessionInfo({ track, exercise, mentor }: SessionInfoProps): React.JSX.Element {
  return (
    <div className="session-info">
      <div className="track-exercise">
        <span className="track">{track.title}</span>
        <span className="exercise">{exercise.title}</span>
      </div>
      {mentor && (
        <div className="mentor">
          <span>Mentor: {mentor.name}</span>
        </div>
      )}
    </div>
  )
}

export default SessionInfo