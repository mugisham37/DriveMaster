import React from 'react'
import type { MentorSessionRequest, Student, MentorSessionTrack, MentorSessionExercise } from '../types'

interface SessionProps {
  request: MentorSessionRequest
  student: Student
  track: MentorSessionTrack
  exercise: MentorSessionExercise
}

export default function Session({
  request,
  student,
  track,
  exercise
}: SessionProps): React.JSX.Element {
  return (
    <div className="c-mentor-session">
      <div className="session-header">
        <h1>Mentoring Session</h1>
        <div className="session-info">
          <div className="student-info">
            <img src={student.avatarUrl} alt="" className="student-avatar" />
            <span>{student.handle}</span>
          </div>
          <div className="exercise-info">
            <img src={exercise.iconUrl} alt="" className="exercise-icon" />
            <span>{exercise.title}</span>
            <span className="track-name">({track.title})</span>
          </div>
        </div>
      </div>
      
      <div className="session-content">
        <div className="placeholder-content">
          <p>Session content would be displayed here.</p>
          <p>This is a simplified version of the Session component.</p>
          <p>Request ID: {request.uuid}</p>
          <p>Status: {request.status || 'pending'}</p>
        </div>
      </div>
    </div>
  )
}