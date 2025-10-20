import React from 'react'
import { Exercise } from '@/types'

interface UserTrack {
  id: number
  slug: string
  exerciseStatus: (exercise: Exercise) => 'available' | 'started' | 'completed' | 'published' | 'locked'
}

interface ExerciseStatusTagProps {
  exercise: Exercise
  userTrack: UserTrack
  className?: string
}

export function ExerciseStatusTag({ exercise, userTrack, className = '' }: ExerciseStatusTagProps): React.JSX.Element | null {
  try {
    // Handle WIP exercises first
    if (exercise.isWip) {
      return (
        <div className={`c-exercise-status-tag --wip ${className}`}>
          Work In Progress
        </div>
      )
    }

    const status = userTrack.exerciseStatus(exercise)
    
    switch (status) {
      case 'available':
        return (
          <div className={`c-exercise-status-tag --available ${className}`}>
            Available
          </div>
        )
      case 'locked':
        return (
          <div className={`c-exercise-status-tag --locked ${className}`}>
            Locked
          </div>
        )
      case 'started':
        return (
          <div className={`c-exercise-status-tag --in-progress ${className}`}>
            In-progress
          </div>
        )
      case 'completed':
        return (
          <div className={`c-exercise-status-tag --completed ${className}`}>
            Completed
          </div>
        )
      case 'published':
        return (
          <div className={`c-exercise-status-tag --published ${className}`}>
            Published
          </div>
        )
      default:
        // Handle external or unknown statuses
        return null
    }
  } catch (error) {
    // Error handling as in original Ruby code
    console.error('ExerciseStatusTag error:', error)
    return null
  }
}

export default ExerciseStatusTag