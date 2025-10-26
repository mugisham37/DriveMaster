import React from 'react'
import type { 
  MentorSessionRequest, 
  Student, 
  MentorSessionTrack, 
  MentorSessionExercise,
  MentorDiscussion,
  Iteration
} from '../types'

interface SessionProps {
  userHandle: string
  request: MentorSessionRequest
  discussion?: MentorDiscussion | null
  track: MentorSessionTrack
  exercise: MentorSessionExercise
  iterations?: Iteration[]
  instructions?: string
  testFiles?: Array<{ filename: string; content: string }>
  student: Student
  studentSolutionUuid?: string
  mentorSolution?: unknown
  exemplarFiles?: Array<{ filename: string; content: string }>
  guidance?: {
    exercise?: string
    track?: string
    links?: Record<string, string>
  }
  outOfDate?: boolean
  downloadCommand?: string
  scratchpad?: {
    isIntroducerHidden?: boolean
    links?: {
      markdown?: string
      hideIntroducer?: string
      self?: string
    }
  }
  links?: {
    mentorDashboard?: string
    mentorQueue?: string
    exercise?: string
    mentoringDocs?: string
  }
}

export default function Session({
  userHandle,
  request,
  discussion,
  track,
  exercise,
  iterations = [],
  instructions = '',
  testFiles = [],
  student,
  studentSolutionUuid,
  mentorSolution,
  exemplarFiles = [],
  guidance,
  outOfDate = false,
  downloadCommand = '',
  scratchpad,
  links
}: SessionProps): React.JSX.Element {
  return (
    <div className="c-mentor-session">
      <div className="session-header">
        <h1>Mentoring Session</h1>
        <div className="session-info">
          <div className="student-info">
            <img src={student.avatarUrl} alt={`${student.handle} avatar`} className="student-avatar" />
            <span>{student.handle}</span>
          </div>
          <div className="exercise-info">
            <img src={exercise.iconUrl} alt={`${exercise.title} exercise icon`} className="exercise-icon" />
            <span>{exercise.title}</span>
            <span className="track-name">({track.title})</span>
          </div>
        </div>
      </div>
      
      <div className="session-content">
        <div className="placeholder-content">
          <p>Session content would be displayed here.</p>
          <p>This is a simplified version of the Session component.</p>
          <p>Mentor: {userHandle}</p>
          <p>Request ID: {request.uuid}</p>
          <p>Status: {request.status || 'pending'}</p>
          <p>Instructions: {instructions}</p>
          <p>Iterations: {iterations.length}</p>
          <p>Test Files: {testFiles.length}</p>
          <p>Student Solution UUID: {studentSolutionUuid}</p>
          <p>Out of Date: {outOfDate ? 'Yes' : 'No'}</p>
          <p>Download Command: {downloadCommand}</p>
          {discussion && <p>Discussion ID: {discussion.uuid}</p>}
          {guidance && <p>Guidance Available: Yes</p>}
          {scratchpad && <p>Scratchpad Available: Yes</p>}
          {links && <p>Links Available: Yes</p>}
        </div>
      </div>
    </div>
  )
}