import Link from 'next/link'
import { User } from 'next-auth'
import { Exercise, Track } from '@/types'

interface ExerciseActionsProps {
  exercise: Exercise
  track: Track
  user: User | null
}

export function ExerciseActions({ exercise, track, user }: ExerciseActionsProps) {
  if (!user) {
    return (
      <div className="exercise-actions">
        <h3>Get Started</h3>
        <p>Sign in to start solving this exercise</p>
        <Link href="/auth/signin" className="btn-primary">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="exercise-actions">
      <h3>Actions</h3>
      
      <div className="action-buttons">
        <Link 
          href={`/tracks/${track.slug}/exercises/${exercise.slug}/editor`}
          className="btn-primary"
        >
          Start in Editor
        </Link>
        
        <Link 
          href={`/tracks/${track.slug}/exercises/${exercise.slug}/solutions`}
          className="btn-secondary"
        >
          View Solutions
        </Link>
        
        <Link 
          href={`/tracks/${track.slug}/exercises/${exercise.slug}/mentor-discussions`}
          className="btn-secondary"
        >
          Get Mentoring
        </Link>
      </div>

      <div className="exercise-stats">
        <h4>Community</h4>
        <div className="stat">
          <span className="label">Solutions:</span>
          <span className="value">1,234</span>
        </div>
        <div className="stat">
          <span className="label">Stars:</span>
          <span className="value">567</span>
        </div>
      </div>
    </div>
  )
}